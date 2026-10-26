# Sales CRM — B2B Sales Pipeline & Recurring Order Management

Sales CRM is a modern, full-stack B2B Customer Relationship Management platform engineered for pipeline governance, Salesforce-style lead journey milestone tracking, stage-gate qualification, repeat purchase management, and responsive mobile sales workflows.

The current temporary workspace opens directly without a login. The server assigns the first active administrator as the shared actor for all visitors, including production visitors. Keep this version on a private or disposable deployment until account login is restored.

**[Setup & Deployment](setup-guide.md)** | Installation, Supabase/Neon PostgreSQL setup, seeding, Vitest, and Playwright |

---

## 🚀 Key Features

### 1. Lead Journey & Milestone Pipeline
- **Interlocking Chevron Stage Path**: Salesforce-style visual milestone header showing current position, completed stages, and upcoming milestones.
- **Historical Stage Inspection**: Click any past stage to view a read-only snapshot of stage-specific activities, gate checks, and audit notes without mutating live deal state.
- **Closed Lost / Won Diagnostic Banners**: Dynamic banners displaying lost root-cause breakdown or renewal replenishment timelines.
- **Inline Activity Composer**: Reps can log calls, meetings, emails, and internal notes directly inside the journey view with automatic timestamping and user attribution.

### 2. Stage-Gate Qualification Engine
- **Objective Criteria Checklists**: Stage promotions require completing mandatory Yes/No qualification checks (decision-maker engaged, budget confirmed, specs agreed).
- **Automated Lost Routing**: Disqualified opportunities automatically route to **Closed Lost** with required reason categorization and field observation notes.
- **Backward Demotion Auditing**: Demoting a deal backward enforces a mandatory demotion reason and logs an immutable audit event to prevent unexplained slippage.

### 3. Role-Gated Manager Approvals
- **Pending Review Status**: Sales Rep stage promotions generate a `[Stage Approval Required]` task for Managers/Admins rather than updating immediately.
- **One-Click Ledger Decisions**: Managers approve or reject promotions directly from the Tasks & Follow-ups Agenda with complete context.
- **Admin Direct Override**: Admins can bypass review via drag-and-drop on the Kanban board with mandatory audit logging.

### 4. Rebuy & Recurring Order Architecture
- **Non-Destructive Win History**: Closing a deal as `Closed Won` permanently preserves historical revenue and performance records.
- **Automated Renewal Generation**: Recurring accounts automatically trigger repeat-order opportunities (`dl-rebuy-...`) in the **Buy Again** stage and schedule outreach tasks.

### 5. Responsive Mobile Experience
- **1-Thumb Bottom Navigation**: Sleek bottom action bar on mobile viewports (<768px) with instant access to Dashboard, Pipeline, Leads, and Tasks.
- **Off-Canvas Navigation Drawer**: Accessible slide-out menu with backdrop blur for secondary views (Accounts, Contacts, Reports, Settings).
- **Executive Bar Graph Switcher**: Dashboard features dual view modes (`[Bars] | [Columns]`) providing high-density comparative horizontal bar charts optimized for mobile screens.
- **Mobile-Adaptive Kanban**: Horizontal touch scrolling with stage pills and compact deal cards.

### 6. Automated Testing Suite
- **14 Playwright E2E Tests**: Comprehensive end-to-end tests verifying the full CRM workflow, Lead Journey milestone transitions, and mobile viewport interactions.
- **32 Vitest Unit Tests**: Validating Zod request schemas, stage transitions, timeline aggregation, follow-up automations, and RBAC rules.

---

## 📊 Pipeline Stage Matrix

```text
New Lead ──► Contacted ──► Sample Sent ──► Proposal Sent ──► Negotiation ──► Closed Won
    │            │              │               │                 │             │
    ▼            ▼              ▼               ▼                 ▼             ▼
Closed Lost  Closed Lost   Closed Lost     Closed Lost       Closed Lost   Buy Again (Renewal)
```

| Stage | Code | Progression Requirements |
|:---|:---|:---|
| **New Lead** | `stg-1` | Inbound inquiry or outbound prospect captured |
| **Contacted** | `stg-2` | Decision-maker identified; initial qualification dialogue |
| **Sample Sent** | `stg-3` | Product sample dispatched; testing parameters agreed |
| **Proposal Sent** | `stg-4` | Formal commercial quote submitted with validity date |
| **Negotiation** | `stg-5` | Contract terms, pricing tiers, and volume commitments |
| **Buy Again (Renewal)** | `stg-7` | Scheduled repeat order pipeline for active accounts |
| **Closed Won** | `stg-6` | Signed agreement / Purchase Order received |
| **Closed Lost** | `stg-8` | Disqualified or lost opportunity with root-cause reason |

---

## 👥 Role-Based Access Control (RBAC)

| Capability | Admin | Manager | Sales Rep |
|:---|:---:|:---:|:---:|
| Create / Edit Leads, Deals, Accounts, Contacts | Yes | Yes | Yes |
| Log Activities, Notes & Gate Checklists | Yes | Yes | Yes |
| Direct Stage Movement (Auto-approved) | Yes (Override) | No | No |
| Approve / Reject Pending Stage Gates | Yes | Yes | No |
| View Team Agenda & Governance Audit Log | Yes | Yes | Assigned Only |
| Modify Branding, Stages & System Settings | Yes | No | No |
| Reset System Demo State | Yes | No | No |

---

## 🛠️ Tech Stack

| Layer | Technologies |
|:---|:---|
| **Frontend** | React 19, Vite, Lucide React, Sonner (Toasts), Vanilla CSS |
| **Backend** | Node.js, Express.js (REST API Server) |
| **Database** | PostgreSQL (Supabase / Neon), Connection Pooling |
| **ORM** | Prisma ORM 7 (`@prisma/client`, `@prisma/adapter-pg`, `pg`) |
| **Validation** | Zod runtime schema validation |
| **Testing** | Vitest (Unit/Integration), Playwright (End-to-End) |

---

## ⚡ Quickstart

### 1. Prerequisites
- **Node.js**: `v24.x` (tested runtime)
- **PostgreSQL**: Cloud database from [Supabase](https://supabase.com) or [Neon](https://neon.tech)

### 2. Setup & Installation
```bash
# Clone the repository
git clone https://github.com/DevSolanki13/CRM-Demo.git
cd CRM-Demo

# Install dependencies
npm ci

# Configure environment
cp .env.example .env
```

Add your PostgreSQL connection strings to `.env`:
```env
PORT=3000
NODE_ENV=development
DATABASE_URL="postgresql://postgres.[REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres"
```

### 3. Database Push & Seed
```bash
# Push Prisma schema to PostgreSQL
npm run db:migrate
npx prisma generate --config prisma7.config.ts

# Seed demo dataset
npm run seed
```

Create your first administrator before signing in:

```bash
npm run admin:create
```

There are no default passwords or demo role switching. For an existing database, read the baselining instructions in [setup-guide.md](setup-guide.md) before applying migrations. See [implementation progress](IMPLEMENTATION_PROGRESS.md) for completed work and [remaining changes](REMAINING_CHANGES.md) for the prioritized backlog.

### 4. Running the Application
```bash
# Start backend server with Vite dev middleware
npm run dev
```
Open **`http://localhost:3000`** in your browser.

### 5. Running Tests
```bash
# Run Vitest unit & integration tests
npm test

# Run Playwright E2E test suite
npm run test:e2e
```

---

## 🔌 Core REST API Endpoints

| Method | Endpoint | Description |
|:---|:---|:---|
| `GET` | `/api/health` | Health status and database check |
| `GET` | `/api/state` | Hydrate complete CRM state on startup |
| `POST` | `/api/state/reset` | Restore pristine seed dataset |
| `GET` / `POST` | `/api/leads` | List leads / Create a new lead |
| `PUT` / `DELETE` | `/api/leads/:id` | Update / Delete lead |
| `GET` / `POST` | `/api/deals` | List deals / Create opportunity |
| `PUT` / `DELETE` | `/api/deals/:id` | Update deal / Delete deal |
| `POST` | `/api/deals/:id/stage-transition` | Transition stage with gate validation |
| `POST` | `/api/deals/:id/close-lost` | Mark opportunity Closed Lost with reason |
| `POST` | `/api/deals/:id/create-rebuy` | Generate renewal repeat-order deal |
| `POST` | `/api/deals/check-renewals` | Trigger background renewal evaluation |
| `GET` | `/api/timeline` | Unified customer activity & audit timeline |
| `GET` / `POST` | `/api/tasks` | List tasks / Create follow-up task |
| `PUT` / `DELETE` | `/api/tasks/:id` | Update status / Delete task |
| `GET` / `POST` | `/api/activities` | List activities / Log call or meeting |
| `DELETE` | `/api/activities/:id` | Remove activity entry |
| `GET` / `POST` | `/api/stage-gate-checks` | Fetch checks / Submit qualification gate |
| `POST` | `/api/stage-gate-checks/:id/approve` | Approve stage promotion & execute move |
| `POST` | `/api/stage-gate-checks/:id/reject` | Reject stage promotion with feedback |
| `GET` | `/api/audit-logs` | Retrieve immutable governance audit trail |

---

## 📁 Project Directory Structure

```text
crm-demo/
├── backend/
│   ├── constants/             # Pipeline transition matrices & stage constants
│   ├── controllers/           # HTTP handlers & response formatting
│   ├── data/                  # Initial demo seed records
│   ├── middleware/            # Zod validation middleware (validation.js)
│   ├── routes/                # Express API routes (crmRoutes.js)
│   ├── services/              # Domain services (deal, lead, task, timeline, etc.)
│   ├── prisma.js              # Prisma 7 client with PostgreSQL driver adapter
│   └── server.js              # Express server & Vite development middleware
├── frontend/
│   ├── api/                   # crmClient.js API abstraction
│   ├── components/            # React UI components
│   │   ├── LeadJourneyView.jsx      # Salesforce-style chevron pipeline & milestone tracker
│   │   ├── PipelineView.jsx         # Kanban board with quick filters & card controls
│   │   ├── DashboardView.jsx        # KPI cards & responsive horizontal bar graph
│   │   ├── DetailDrawer.jsx         # 360° slide-over inspector sheet (4 tabs)
│   │   ├── LeadsView.jsx            # Lead management & conversion workflows
│   │   ├── TasksView.jsx            # Follow-ups & manager approval agenda
│   │   ├── UnifiedTimeline.jsx      # Chronological customer interaction feed
│   │   ├── StageGateCheckModal.jsx  # Qualification gate checklist modal
│   │   ├── Header.jsx               # Navigation bar, mobile toggles, user switcher
│   │   ├── Sidebar.jsx              # Primary desktop & off-canvas mobile navigation
│   │   ├── ErrorBoundary.jsx        # Crash recovery & diagnostics
│   │   └── ...                      # Accounts, Contacts, Reports, Settings views
│   ├── utils/                 # Currency (INR ₹), date, and badge formatting helpers
│   ├── App.jsx                # Root container, tab router & mobile bottom nav bar
│   └── index.css              # Design tokens, chevron paths, mobile styles
├── prisma/
│   ├── schema.prisma          # 12 Prisma models & PostgreSQL datasource
│   └── seed.js                # Database seed script
├── e2e/                       # Playwright E2E test suite (14 tests)
│   ├── crm-features.spec.js   # Pipeline, drawer, modal, and filter tests
│   ├── lead-journey.spec.js   # Lead Journey milestone and composer tests
│   └── mobile-responsive.spec.js # Mobile navigation, drawer, and chart tests
├── tests/                     # Vitest unit & integration test suite (32 tests)
├── playwright.config.js       # Playwright browser automation config
├── vitest.config.js           # Vitest unit testing config
├── package.json               # Dependencies & npm scripts
└── vite.config.ts             # Vite build configuration
```

---

## 📄 License
This project is licensed under the MIT License.
