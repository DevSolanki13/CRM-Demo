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
- **Node.js**: `v18.0.0` or higher (`v20.x` recommended)
- **npm**: `v9.0.0` or higher
- **PostgreSQL Database**: Free cloud instance from [Supabase](https://supabase.com) or [Neon](https://neon.tech), or a local PostgreSQL instance.

---

## 2. Installation & Quickstart

### Step 1: Clone Repository & Install Dependencies
```bash
git clone https://github.com/DevSolanki13/CRM-Demo.git
cd CRM-Demo

# Install frontend, backend, and development dependencies
npm install
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
npx prisma db push
```

### Step 4: Seed Demo Dataset
Populate the database with sample users, stages, accounts, contacts, leads, deals, tasks, activities, and audit logs:
```bash
npm run seed
```

---

## 4. Running Locally

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
Executes 32 unit and integration tests covering Zod schemas, stage transitions, timeline aggregation, follow-up automations, and RBAC rules:
```bash
# Run tests once
npm test

# Run tests in watch mode
npm run test:watch
```

### End-to-End Tests (Playwright)
Executes 14 browser automation tests covering core workflows, Lead Journey milestones, and mobile responsive viewports:
```bash
# Run headless E2E test suite
npm run test:e2e

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
