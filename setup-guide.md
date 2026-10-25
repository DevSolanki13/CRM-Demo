<p align="center">
  <a href="README.md">📖 Overview</a> &nbsp;|&nbsp;
  <a href="features.md">✨ Features</a> &nbsp;|&nbsp;
  <a href="flow.md">🔄 Flow</a> &nbsp;|&nbsp;
  <a href="architecture.md">🏗️ Architecture</a> &nbsp;|&nbsp;
  <a href="db.md">🗄️ Database</a> &nbsp;|&nbsp;
  <a href="api.md">🔌 API</a> &nbsp;|&nbsp;
  <b>🚀 Setup Guide</b>
</p>

---

# Sales CRM — Setup & Deployment Guide

This guide walks you through installing, configuring, running, testing, and deploying the Sales CRM platform.

---

## 1. Prerequisites

Ensure your local development environment has:
- **Node.js**: `v24.x` (the tested cloud runtime)
- **npm**: `v9.0.0` or higher
- **PostgreSQL Database**: Free cloud instance from [Supabase](https://supabase.com) or [Neon](https://neon.tech), or a local PostgreSQL instance.

---

## 2. Installation & Quickstart

### Step 1: Clone Repository & Install Dependencies
```bash
git clone https://github.com/DevSolanki13/CRM-Demo.git
cd CRM-Demo

# Install frontend, backend, and development dependencies
npm ci
```

### Step 2: Configure Environment Variables
Copy the template to `.env`:
```bash
cp .env.example .env
```

Open `.env` and fill in your PostgreSQL connection strings:
```env
PORT=3000
NODE_ENV=development

# 1. Connection Pool URL (Transaction mode on port 6543 for runtime API traffic)
DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true"

# 2. Direct TCP Connection URL (Direct session on port 5432 for migrations and seeding)
DIRECT_URL="postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres"
```

> [!TIP]
> **Supabase**: Navigate to **Project Settings** ➔ **Database** ➔ **Connection parameters**. Copy the **Transaction Mode** URI for `DATABASE_URL` and the **Direct Connection (Session Mode)** URI for `DIRECT_URL`.

---

## 3. Database Synchronization & Seeding

### Step 3: Apply Prisma migrations
Apply the versioned migrations, including the public-table RLS and grant lockdown:
```bash
npm run db:migrate
npx prisma generate --config prisma7.config.ts
```

### Existing databases created with `prisma db push`

Back up the database first. The baseline migration represents the original demo schema. Before adopting it, compare the existing database against that schema and reconcile differences; do not mark a mismatched database as migrated. For a database confirmed to match the original schema, mark only the baseline applied, then run the new migrations:

```bash
npx prisma migrate resolve --applied 202610230001_baseline --config prisma7.config.ts
npm run db:migrate
npx prisma generate --config prisma7.config.ts
```

Fresh databases need only `npm run db:migrate`; they should not use `migrate resolve`. Do not use `db push` as a substitute for versioned production migrations.

### Supabase Data API access

CRM users authenticate with Express sessions, and the backend accesses customer records through a server-side Prisma connection. CRM tables in `public` have RLS enabled but intentionally have no policies for Supabase's `anon` or `authenticated` roles. Those roles, and `service_role`, also have no table privileges on CRM tables. The Prisma connection uses the `postgres` role; protect its connection string as a server secret. The Storage integration uses a server-side service-role key for the separate private Storage bucket.

Supabase Security Advisor may list `rls_enabled_no_policy` as informational for these tables. It is intentional: this app does not use Supabase Auth identities to query CRM tables, so a permissive policy would expose data rather than fix a problem. The CRM trigger functions use an empty, fixed `search_path` and schema-qualified table names.

If no other application uses Supabase REST or GraphQL data endpoints, turn off **Enable Data API** in the project's Data API integration settings. The database migration protects the tables even while that dashboard setting is still being changed. Before deploying to another database, verify that its runtime connection uses the intended Postgres role, then run the full test suite and inspect Supabase's Security Advisor after migration. Do not add broad `anon` or `authenticated` RLS policies merely to silence a warning.

### Step 4: Seed Demo Dataset
For a new disposable development database, populate sample records. Do not run demo seeding against business data: it updates existing demo records. The CRM needs an active administrator record to supply its temporary shared identity.
```bash
npm run seed
```

---

## 4. Running Locally

### Administrator setup and sign-in

Before starting a production deployment, create an administrator login with `npm run admin:create`. The command prompts for an email and hidden password in a terminal, or accepts `ADMIN_EMAIL` and `ADMIN_PASSWORD` from a secure environment. Until an active administrator has a password, production CRM routes return a setup error. Development keeps the shared administrator workspace available during the transition.

After setup, every CRM request requires an individual session. Administrators can create team members without a password and generate one-time account links from the Team screen. Links expire after 48 hours, can be used once, and must be shared privately. An administrator can generate a new link for password recovery; doing so invalidates the earlier link. An external email provider is not yet connected, so links are delivered manually.

Set `APP_ORIGIN` to the exact external HTTPS origin (for example `https://crm.example.com`) behind a reverse proxy. Keep the frontend and API on one origin for API write protection, and verify Secure cookies through the deployed proxy.

### Scheduled automation

Run `npm run worker` as a separate long-running process, schedule `npm run automation:once`, or call `POST /api/internal/automation/run` from an external scheduler with `Authorization: Bearer <CRON_SECRET>`. Set a random `CRON_SECRET` of at least 32 characters in the deployment environment. The database lease prevents multiple workers from executing the same renewal run concurrently. The scheduler must be configured on the actual hosting platform; the API server alone does not schedule background work.

### Step 5: Start Unified Development Server
```bash
npm run dev
```

The Express API server starts and serves the React frontend via Vite development middleware. Open your browser to:
```text
http://localhost:3000
```

---

## 5. Running Automated Tests

### Unit & Integration Tests (Vitest)
Executes unit and database-backed API/integration tests covering Zod schemas, stage transitions, timeline aggregation, follow-up automations, and open workspace access:
```bash
# Run tests once
npm test

# Run tests in watch mode
npm run test:watch
```

### End-to-End Tests (Playwright)
Executes browser automation tests covering direct workspace access, core workflows, Lead Journey milestones, and mobile responsive viewports:
```bash
# Run headless E2E test suite (use a disposable test database)
npm run test:e2e

# Use the Chromium installed in the cloud image
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e

# Run with interactive Playwright UI
npm run test:e2e:ui
```

---

## 6. Visual Database Inspection (Prisma Studio)

Launch Prisma Studio to visually browse, filter, query, and edit records in real time:
```bash
npx prisma studio
```
Prisma Studio opens at `http://localhost:5555`.

---

## 7. Production Build & Deployment

### Step 6: Compile Production Bundle
```bash
npm run build
```
This script runs:
1. `prisma generate`: Generates type-safe Prisma Client binaries.
2. `vite build`: Compiles frontend React assets into minified production files in `dist/`.
3. `esbuild`: Bundles `backend/server.js` into an optimized single-file Node.js server at `dist/server.cjs`.

### Step 7: Launch Production Server
```bash
npm run start
```

### Deployment Platforms:
- **Vercel (Serverless)**: Pre-configured `vercel.json` included. Configure `DATABASE_URL` and `DIRECT_URL` in project settings. Set build command to `npm run build`.
- **Render / Railway / DigitalOcean (Node.js Service)**:
  - Build Command: `npm install && npm run build`
  - Start Command: `npm run start`

### Private attachment storage

Create a **private** Supabase Storage bucket called `crm-attachments`. Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` only on the server; set `CRM_ATTACHMENTS_BUCKET` if you use another bucket name. Do not expose the service-role key in a `VITE_` variable or the browser. Uploads are limited to 5 MB and supported document/image formats. The API checks the current CRM user's access to the linked record before listing, uploading, downloading, or deleting files. Files are retained until a user removes them; deletion keeps an audit tombstone and the worker retries Storage cleanup if an immediate purge fails. Storage credentials and bucket creation are required before uploads work.

---

## 8. Troubleshooting Common Issues

### Issue 1: Database Connection Timeout
- **Cause**: Supabase project paused or incorrect pooler password/region.
- **Solution**: Confirm your database project is active. Verify you can connect directly using `DIRECT_URL` on port 5432.

### Issue 2: Prisma Client Out of Sync
- **Cause**: Schema changes made without regenerating the client.
- **Solution**: Run `npm run db:migrate` and `npx prisma generate --config prisma7.config.ts`. Do not replace versioned migrations with `db push` on a business database.

### Issue 3: Corrupted or Stale Demo Data
- **Solution**: Inspect and back up the database first. Demo reset is restricted to an empty workspace; never run `npm run seed` against customer data to restore a "pristine" state.
