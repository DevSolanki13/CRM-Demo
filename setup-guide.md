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

### Step 3: Push Prisma Schema
Push the 12 Prisma data models directly to your PostgreSQL database:
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

### Step 4: Seed Demo Dataset
For a new disposable development database, populate sample records. Do not run demo seeding against business data: it updates existing demo records. Sample users have no passwords and cannot sign in until provisioned by an administrator.
```bash
npm run seed
```

---

## 4. Running Locally

### Create the first administrator

From the repository root, run:

```bash
npm run admin:create
```

The command asks for an email, name, and a password of 12–128 characters without echoing the password. It can provision an existing seed user by email or create a new administrator. It refuses to bootstrap once an active administrator already has a password. For noninteractive provisioning, inject `ADMIN_EMAIL`, `ADMIN_NAME`, and `ADMIN_PASSWORD` securely into the process environment; never commit passwords or place them in command arguments.

Sign in through the application. Administrators can create users and set/reset their passwords in Team & Workload. There is no public sign-up, default password, or client-side role switching.

Sessions expire after eight hours. Logout, account deactivation, password changes, and role changes invalidate sessions. Production requires HTTPS; cookies are Secure when `NODE_ENV=production`. Set `APP_ORIGIN` to the exact external origin (for example `https://crm.example.com`) behind a reverse proxy. Keep the application on one origin for frontend and API requests. A shared gateway rate limiter is required before running multiple application replicas.

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
Executes unit and database-backed API/integration tests covering Zod schemas, stage transitions, timeline aggregation, follow-up automations, and RBAC rules:
```bash
# Run tests once
npm test

# Run tests in watch mode
npm run test:watch
```

### End-to-End Tests (Playwright)
Executes browser automation tests, including real sign-in/session checks covering core workflows, Lead Journey milestones, and mobile responsive viewports:
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

---

## 8. Troubleshooting Common Issues

### Issue 1: Database Connection Timeout
- **Cause**: Supabase project paused or incorrect pooler password/region.
- **Solution**: Confirm your database project is active. Verify you can connect directly using `DIRECT_URL` on port 5432.

### Issue 2: Prisma Client Out of Sync
- **Cause**: Schema changes made without regenerating the client.
- **Solution**: Run `npx prisma generate` followed by `npx prisma db push`.

### Issue 3: Corrupted or Stale Demo Data
- **Solution**: Click the **"Reset Demo State"** button in **Settings** or run `npm run seed` to restore pristine data.
