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

This guide walks you through setting up, configuring, running, testing, and deploying the Sales CRM platform.

---

## 1. Prerequisites

Before installing, ensure your development environment satisfies:
- **Node.js**: `v18.0.0` or higher (`v20.x` recommended)
- **npm**: `v9.0.0` or higher
- **PostgreSQL Database**: Free cloud database instance from [Supabase](https://supabase.com) or [Neon](https://neon.tech), or a local PostgreSQL instance.

---

## 2. Installation & Quickstart

### Step 1: Clone Repository & Install Dependencies
```bash
git clone https://github.com/DevSolanki13/CRM-Demo.git
cd CRM-Demo

# Install frontend, backend, and development dependencies
npm install
```

### Step 2: Environment Configuration
Copy the provided environment template to `.env`:
```bash
cp .env.example .env
```

Open `.env` and configure your PostgreSQL database connection strings:

```env
# Server Port (default: 3000)
PORT=3000

# Application Environment (development | production)
NODE_ENV=development

# 1. Connection Pool URL (Transaction mode on port 6543 for API traffic)
DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true"

# 2. Direct TCP Connection URL (Direct session on port 5432 for migrations and seeding)
DIRECT_URL="postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres"

# Optional: Google Gemini API Key for AI assistance features
GEMINI_API_KEY=""
```

> [!TIP]
> **Supabase Users**: Navigate to your Supabase Project Settings ➔ **Database** ➔ **Connection parameters**. Copy the **Transaction Mode** URI for `DATABASE_URL` and the **Direct Connection (Session Mode)** URI for `DIRECT_URL`.

---

## 3. Database Synchronization & Seeding

### Step 3: Synchronize Prisma Schema
Push the 12 Prisma data models directly to your PostgreSQL database:
```bash
npx prisma db push
```

### Step 4: Seed Initial Demo Data
Populate the database with demo users (Alex Vance, Marcus Vance), pipeline stages, accounts, contacts, leads, deals, tasks, activities, notes, and audit logs:
```bash
npm run seed
```

Output should confirm:
```text
🌱 Starting CRM database seeding into Supabase...
✔ Branding seeded
✔ 3 Users seeded
✔ 8 Stages seeded
✔ 8 Companies seeded
✔ 8 Contacts seeded
✔ 10 Leads seeded
✔ 16 Deals seeded
✔ 10 Tasks seeded
✔ Database seeding completed successfully!
```

---

## 4. Running Locally

### Step 5: Start Unified Development Server
```bash
npm run dev
```

The Express API backend starts and hooks directly into the Vite development middleware. Open your browser and navigate to:
```text
http://localhost:3000
```

---

## 5. Visual Database Management (Prisma Studio)

Launch Prisma Studio to visually inspect, filter, query, and edit records in real time:
```bash
npx prisma studio
```
Prisma Studio opens locally at `http://localhost:5555`.

---

## 6. Running Automated Tests

Sales CRM uses **Vitest** for unit and integration testing of validation schemas and pipeline transition rules:

```bash
# Run all automated tests
npm run test
```

### Test Coverage Highlights:
- **`tests/validation.test.js`**: Zod schema validation for Deals, Leads, Companies, Contacts, and Tasks (verifying defaults, string sanitization, and bad-input rejection).
- **`tests/stageTransition.test.js`**: Forward stage matrix governance, terminal stage immobility, and stage color normalization.

---

## 7. Production Build & Deployment

### Step 6: Compile Production Bundle
```bash
npm run build
```
This script executes:
1. `prisma generate`: Generates type-safe Prisma client binaries.
2. `vite build`: Compiles frontend React assets into minified production files in `dist/`.
3. `esbuild`: Bundles `backend/server.js` into an optimized Node.js server at `dist/server.cjs`.

### Step 7: Launch Production Server
```bash
npm run start
```

---

## 8. Cloud Deployment Options

### Option A: Vercel (Serverless)
The repository includes a pre-configured `vercel.json`:
1. Connect your GitHub repository to [Vercel](https://vercel.com).
2. Configure **Environment Variables** in the Vercel dashboard (`DATABASE_URL`, `DIRECT_URL`).
3. Set the **Build Command** to: `npm run build`.
4. Deploy. Vercel automatically routes `/api/*` to the serverless function handler and static assets to edge storage.

### Option B: Render / Railway / DigitalOcean (Persistent Node Server)
1. Select a Node.js Web Service.
2. Build Command: `npm install && npm run build`
3. Start Command: `npm run start`
4. Set environment variables (`DATABASE_URL`, `DIRECT_URL`, `NODE_ENV=production`).

---

## 9. Troubleshooting Common Issues

### Issue 1: `DATABASE_URL` Connection Refused or Timeout
- **Cause**: Supabase project paused or incorrect password/pooler region.
- **Solution**: Check that your Supabase project is active. Verify you can connect directly using `DIRECT_URL` on port 5432.

### Issue 2: Prisma Client Out of Sync
- **Cause**: Schema changes were made without regenerating the client.
- **Solution**: Run `npx prisma generate` followed by `npx prisma db push`.

### Issue 3: Corrupted or Stale Demo Data
- **Solution**: Click the **"Reset Demo State"** button in **Settings** or execute `npm run seed` to restore clean data.
