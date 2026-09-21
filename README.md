# NexusCRM — B2B Sales Pipeline & Recurring Order Management

NexusCRM is a full-stack, customizable B2B Sales Customer Relationship Management (CRM) application engineered for pipeline governance, stage-gate qualification workflows, manager approval ledgers, and repeat purchase management.

![Sales Console](images/WebSite/Screenshot%202026-09-22%20004657.png)

---

## Key Features

### 1. Stage-Gate Qualification Engine
- **Structured Qualification Gates**: Advancing opportunities requires completing stage-specific Yes/No qualification checklists (e.g. decision-maker confirmed, use-case validated, commercial alignment).
- **Automated Routing on Failure**: Failing qualification criteria automatically routes deals to **Closed Lost** with mandatory lost-reason selection and rep observation notes.
- **Backward Stage Demotion**: Backward pipeline movements enforce mandatory demotion reasons and activity logging to prevent unexplained pipeline slippage.

### 2. Manager Approval & Task Ledger
- **Role-Gated Transitions**: When a Sales Rep advances a deal or qualifies a lead, the record moves to `Pending Review` status.
- **Reviewer Tasks**: Automatically creates `[Stage Approval Required]` tasks in the agenda for Managers and Admins with submitted criteria answers, rep observations, and stage paths.
- **One-Click Execution**: Managers can click **`[ Approve & Move Stage ]`** or **`[ Reject ]`** directly from the Follow-ups & Tasks Ledger to execute transitions and log permanent audit events.

### 3. Rebuy & Recurring Order Architecture
- **Historical Integrity**: Closing a deal as `Closed Won` preserves the original transaction history permanently.
- **Automated Rebuy Generation**: Recurring accounts trigger scheduled repeat-order cycles (e.g., 60-day renewal cycle) and generate new child opportunities without overwriting previous closed sales.

### 4. Interactive Pipeline Board & Governance
- **Kanban Board**: Drag-and-drop pipeline interface with stage aging badges, stale warnings, and close-date indicators.
- **Admin Overrides**: Administrators can bypass gates with mandatory audit reasons logged to the permanent audit trail.
- **Governance Audit Ledger**: Auditable log tracking actor ID, reviewer name, timestamp, action type, from/to stages, and override/rejection reasons.

### 5. Multi-Entity Management
- **Leads Ledger**: Cold outbound vs. inbound tracking, lead status tracking (`New`, `Working`, `Qualified`, `Unqualified`, `Converted`), non-numeric title validation, and one-click conversion to deals.
- **Accounts & Contacts**: Corporate account hierarchies, linked contacts, communication logs, and custom fields.
- **Agenda & Follow-ups**: Follow-up scheduling for phone calls and meetings with scope switching between personal tasks and team-wide agenda.

### 6. Modern CRM User Experience (UX)
- **360° Slide-Over Detail Drawer**: Clicking any Deal or Lead opens an interactive side drawer (Sheet UI) featuring 4 dedicated tabs: Overview & Property Editor, Stage Gate Verification, Interaction & Note Logger, and Connected Tasks—without losing board or table context.
- **Inline Anchored Command Search (`Ctrl+K` / `⌘K`)**: Instant search dropdown anchored directly beneath the header search bar (zero center modals or background blur), supporting categorized search across Deals, Leads, Contacts, and Companies with arrow-key navigation.
- **Ergonomic Quick-Filter Pills**: Real-time count badges and one-click filtering for deals (`All Deals`, `My Deals`, `Stale >10d`, `Aging in Stage`, `Closing Overdue`, `Renewals Due`) and leads (`All`, `My Leads`, `Outbound`, `Inbound`, `New`).
- **Non-Blocking Toast System**: Replaced native browser `alert()` popups with rich [`Sonner`](https://sonner.emilkowal.ski) toasts featuring contextual action buttons and status colors.
- **Crash Resilience & Custom Error Screens**: Built-in `ErrorBoundary` (500 recovery with diagnostics and demo-state reset), `NotFoundView` (404 missing routes/tabs), and backend API 404 fallbacks.

---

## Pipeline Stage Matrix

```text
New Lead ──► Contacted ──► Sample Sent ──► Proposal Sent ──► Negotiation ──► Closed Won
    │            │              │               │                 │             │
    ▼            ▼              ▼               ▼                 ▼             ▼
Closed Lost  Closed Lost   Closed Lost     Closed Lost       Closed Lost   Rebuy Deal
```

| Stage | Code | Category | Progression Requirements |
|:---|:---|:---|:---|
| **New Lead** | `stg-1` | New | Inbound inquiry or outbound lead captured |
| **Contacted** | `stg-2` | Contacted | Meaningful conversation logged; decision-maker identified |
| **Sample Sent** | `stg-3` | Evaluation | Product/sample dispatched; testing criteria agreed |
| **Proposal Sent** | `stg-4` | Proposal | Formal quote submitted with commercial terms and validity date |
| **Negotiation** | `stg-5` | Negotiation | Commercial terms, pricing, and volume tiers in active discussion |
| **Closed Won** | `stg-6` | Won | Signed contract / Purchase Order received; triggers rebuy schedule |
| **Closed Lost** | `stg-8` | Lost | Terminal lost state with mandatory reason and explanation |

---

## Role-Based Access Control (RBAC)

| Capability | Admin | Manager | Sales Rep |
|:---|:---:|:---:|:---:|
| Create & Edit Leads / Deals / Contacts | Yes | Yes | Yes |
| Log Activities & Qualification Gate Checks | Yes | Yes | Yes |
| Direct Stage Movement (Auto-approved) | Yes | No | No |
| Approve / Reject Pending Stage Gates | Yes | Yes | No |
| Admin Kanban Drag-and-Drop Override | Yes | No | No |
| View Team-Wide Tasks & Governance Audit Logs | Yes | Yes | Assigned Only |
| Modify System Settings & Team Roles | Yes | No | No |

---

## Tech Stack

| Layer | Technologies |
|:---|:---|
| **Frontend** | React 19, JavaScript (JSX), Vite, Lucide Icons, Sonner (Toasts), Vanilla CSS |
| **Backend** | Node.js, Express.js (REST API Server) |
| **Tooling & Build** | Vite, Esbuild |
| **Styling** | 60-30-10 surface elevation system with WCAG AA-compliant contrast |

---

## Getting Started

### Prerequisites
- **Node.js**: `v18.0.0` or higher
- **npm**: `v9.0.0` or higher

### Installation

```bash
# Clone the repository
git clone https://github.com/DevSolanki13/CRM-Demo.git
cd CRM-Demo

# Install project dependencies
npm install
```

### Running Locally

```bash
# Start backend Express server and Vite development server
npm run dev
```

The application will be accessible at `http://localhost:3000`.

### Production Build

```bash
# Build frontend bundle and server distribution
npm run build

# Start production server
npm run start
```

---

## REST API Overview

| Method | Endpoint | Description |
|:---|:---|:---|
| `GET` | `/api/health` | Service health status check |
| `GET` / `POST` | `/api/leads` | List all leads / create a new lead |
| `PUT` / `DELETE` | `/api/leads/:id` | Update lead details / delete lead |
| `GET` / `POST` | `/api/deals` | List all deals / create a new deal |
| `POST` | `/api/deals/:id/stage-transition` | Transition deal stage with gate validation |
| `POST` | `/api/deals/:id/close-lost` | Mark opportunity as Closed Lost with reason |
| `POST` | `/api/deals/:id/create-rebuy` | Generate new repeat order opportunity |
| `GET` / `POST` | `/api/stage-gate-checks` | Fetch all stage gate checks / submit new check |
| `POST` | `/api/stage-gate-checks/:id/approve` | Approve stage gate check and execute transition |
| `POST` | `/api/stage-gate-checks/:id/reject` | Reject stage gate check with feedback note |
| `GET` / `POST` | `/api/tasks` | Fetch tasks / create a follow-up task |
| `PUT` / `DELETE` | `/api/tasks/:id` | Update task status / delete task |
| `GET` | `/api/audit-logs` | Retrieve chronological governance audit trail |

---

## Project Structure

```text
customizable-crm-demo/
├── backend/
│   ├── controllers/
│   │   └── crmController.js        # Request handlers & response formatting
│   ├── data/
│   │   └── initialData.js          # Seed records (companies, leads, deals, stages)
│   ├── routes/
│   │   └── crmRoutes.js            # Express REST route endpoints
│   ├── store/
│   │   └── crmStore.js             # State management, stage transitions & audit logs
│   └── server.js                   # Express server entry point & Vite middleware
├── frontend/
│   ├── api/
│   │   └── crmClient.js            # Frontend HTTP API client
│   ├── components/
│   │   ├── DashboardView.jsx       # Financial metrics, stage charts & activity stream
│   │   ├── LeadsView.jsx           # Leads list, quick-filter chips & actionable empty states
│   │   ├── PipelineView.jsx        # Kanban pipeline board with quick-filter pills & card controls
│   │   ├── DetailDrawer.jsx        # 360° slide-over inspector sheet (Overview, Gate, Notes, Tasks)
│   │   ├── ErrorBoundary.jsx       # React crash recovery with diagnostics & reset actions
│   │   ├── NotFoundView.jsx        # Custom 404 page for missing tabs or records
│   │   ├── TasksView.jsx           # Follow-up ledger & stage approval action cards
│   │   ├── StageGateCheckModal.jsx # Yes/No qualification checklist & demotion form
│   │   ├── AddActivityModal.jsx    # Log calls/meetings with integrated gate checks
│   │   ├── ReportsView.jsx         # Governance audit log & lost deal analytics
│   │   ├── CompaniesView.jsx       # Corporate accounts ledger
│   │   ├── ContactsView.jsx        # Client directory & contact information
│   │   ├── EmployeesView.jsx       # Team directory & role management
│   │   ├── SettingsView.jsx        # Branding customization & pipeline stage manager
│   │   ├── Header.jsx              # Navigation bar, user switcher & inline anchored search
│   │   └── Sidebar.jsx             # Module navigation sidebar
│   ├── utils/
│   │   └── crmHelpers.js           # Currency formatting (INR ₹), date & RBAC utilities
│   ├── App.jsx                     # Top-level application component & routing
│   ├── index.css                   # Global stylesheet & design token system
│   └── main.jsx                    # React application entry point
├── package.json                    # Project configuration & npm scripts
└── vite.config.ts                  # Vite build & plugin configuration
```

---

## License

This project is licensed under the MIT License.
