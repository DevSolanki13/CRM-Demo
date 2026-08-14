# NexusCRM — Customizable B2B Sales & Recurring Order CRM

## Overview

**NexusCRM** is a production-grade, highly customizable B2B Sales & Recurring Order Management CRM web application built with **React 19**, **JavaScript (JSX)**, **Node.js**, **Express**, and **Vite**. 

It features an **elevation-based design system** (60-30-10 color distribution, WCAG AA-compliant contrast ratios, 3-level elevation tokens), full **Indian Rupee (INR ₹)** financial localization, **Stage-Gate Governance Qualification**, automated **Recurring Order Renewals**, **Role-Based Access Control (RBAC)**, and a **System Architecture Hardware Manifest Strip**.

---

## Key Features

### 🎨 Design System & Color Theory
- **60-30-10 Distribution**: 60% neutral surfaces (`#F6F7F8` canvas, `#FFFFFF` cards, `#E3E6EA` borders), 30% primary teal scale (`#1D4E63` / `#EFF6F9`), 10% semantic status accents.
- **3-Level Elevation System**: Level 0 flat canvas, Level 1 card/table containers (`0 1px 2px rgba(...)`), Level 2 elevated modals, dropdowns & manifest strip (`#FAFCFD` surface tint + `0 8px 24px rgba(...)`).
- **WCAG AA Compliance**: High-contrast text pairings for Amber (`#965700`), Green (`#255B40`), Red (`#922D27`), and Primary Neutral (`#1D4E63`).
- **Indian Rupee (INR ₹) Localization**: Currency formatting (`₹` / `en-IN`) across metrics, deal values, reports, export CSVs, and initial datasets.

### 📈 8-Stage Sequential & Semantic Pipeline
- **Sequential Stepping (In Progress)**: `New Lead` (`#B9D4DE`) &rarr; `Contacted` (`#93BECC`) &rarr; `Sample Sent` (`#3E7C93`) &rarr; `Proposal Sent` (`#2A6580`) &rarr; `Negotiation` (`#1D4E63`).
- **Semantic Outcome Fill**: `Closed Won` (`#3F7A5C`), `Buy Again (Renewal)` (`#C6790A`), `Closed Lost` (`#B5423A`).
- **Empty-Value (₹0) Handling**: Stages with ₹0 total value render pale neutral tracks (`#E3E6EA`) to prevent empty columns from reading as error states.

### 🛡️ Stage-Gate Governance & Qualification
- **Mandatory 4-Question Checklists**: Reps must answer 4 Yes/No qualification criteria to advance deals through pipeline stages.
- **Manager & Admin Approval Ledger**: Submissions requiring review automatically generate approval tasks for Managers and Admins in the **Follow-ups & Tasks Ledger** (`TasksView.jsx`).
- **Form Responses & Rep Observations**: Approval cards display explicit **YES / NO** qualification criteria badges, free-text **Rep Observations (Note)**, submitter info, and stage transition path.
- **One-Click Task Approvals**: Managers and Admins can click **`[ Approve & Move Stage ]`** or **`[ Reject ]`** directly on task cards to execute stage transitions.
- **Automated Closed Lost Routing**: Failing any qualification check automatically routes deals to Closed Lost with mandatory **Lost Reason** selection (`Budget mismatch`, `Losing to competitor`, `Went silent`, etc.).
- **Backward Move Demotion Tracking**: Mandatory demotion reason tracking when moving deals backward in the pipeline.

### 🔄 Recurring Order & Renewal Automation
- **Repeat Cycle Tracking**: Configurable renewal cycles (e.g. 60 days) that flag accounts as "Buy Again Due".
- **One-Click Re-Order**: Instant renewal deal creation directly from the Renewal Tracking table.

### ⚡ System Architecture & Hardware Manifest Strip
- **Manifest Strip (`ManifestStrip.jsx`)**: Real-time diagnostic bar rendering hardware specs, active port bindings, memory utilization, API latencies, and RBAC status.

### 👥 Team Workload & Entity Management
- **Entity Directories**: Comprehensive views for Companies, Contacts, Leads, Employees, Tasks, and Settings.
- **Lead Activity Follow-up Assignment**: Logging a lead activity allows assigning scheduled follow-up tasks to specific team members, automatically populating their **"My Follow-ups"** and the **"Team Agenda"** with full descriptions.
- **Lead Quality Validation**: Enforces non-numeric lead titles (must contain text or letters like `AeroTech` or `Lead 101`, blocking numeric-only titles like `12345`).
- **3-Dots Quick Action Lead Menu**: Instant modal triggers on every lead row (`Add Activity`, `Change Stage`).
- **Tasks Ledger**: Follow-up activity tracking, Stage Approval cards, due-today amber warnings, overdue red alerts, and Team Agenda scope switching.
- **CSV Export Center**: One-click formatted CSV file exports for Contacts, Leads, and Deals.
- **Global Search**: Modal search across all entities with keyboard shortcuts (`Esc`).

---

## Screenshots

### Main Sales Console Interface
![Final UI](images/WebSite/Final%20Ui.png)

---

## Tech Stack

- **Frontend**: React 19, JavaScript (JSX), Vanilla CSS / Tailwind CSS, Lucide Icons, Vite
- **Backend**: Node.js, Express.js (REST API Server)
- **Tooling**: Esbuild, Git, Vite Bundler

---

## Getting Started

### Prerequisites

- Node.js (>= 18)
- npm (comes with Node) or Yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/DevSolanki13/CRM-Demo.git
cd CRM-Demo

# Install dependencies
npm install
```

### Development Server

```bash
npm run dev
```
Starts the Node.js Express backend server (`backend/server.js`) and Vite development server concurrently.

### Build for Production

```bash
npm run build
# Start production server
npm run start
```

---

## Project Structure

```text
customizable-crm-demo/
├── backend/
│   ├── controllers/        # CRM business logic, stage gate & deal controllers
│   ├── data/               # Seed datasets for companies, contacts, leads, deals, tasks
│   ├── routes/             # Express REST API endpoint definitions (/api/crm/*)
│   ├── store/              # In-memory CRM store & state normalization
│   └── server.js           # Express API server entry point
├── frontend/
│   ├── api/
│   │   └── crmClient.js    # REST API client layer
│   ├── components/
│   │   ├── CompaniesView.jsx       # Corporate accounts table & detail drawer
│   │   ├── ContactsView.jsx        # Client directory, call logs & detail drawer
│   │   ├── DashboardView.jsx       # Key metrics, 8-stage pipeline chart, activity feed
│   │   ├── EmployeesView.jsx       # Team workload cards & role management modal
│   │   ├── GlobalSearchModal.jsx   # Keyboard-navigable global search modal
│   │   ├── Header.jsx              # Top header, notification drawer, search trigger
│   │   ├── ImportExportModal.jsx   # CSV data export modal
│   │   ├── LeadsView.jsx           # Leads table, 3-dots action menu, filter bar
│   │   ├── ManifestStrip.jsx       # System architecture & hardware status strip
│   │   ├── PipelineView.jsx        # Kanban board, deal cards, stage gate check triggers
│   │   ├── ReportsView.jsx         # Governance audit log, lost deal charts, renewal tracker
│   │   ├── SettingsView.jsx        # Customization hub, white-label branding, stage customizer
│   │   ├── Sidebar.jsx             # Collapsible navigation sidebar & user info
│   │   ├── StageGateCheckModal.jsx # Qualification checklist, lost reason & demotion modal
│   │   └── TasksView.jsx           # Follow-up ledger, Stage Approval cards, Team Agenda & task controls
│   ├── utils/
│   │   └── crmHelpers.js   # INR currency formatters, date utilities, RBAC filters
│   ├── App.jsx             # Single-page application root, routing & state normalization
│   ├── index.css           # 60-30-10 design system, elevation tokens & CSS variables
│   └── main.jsx            # React DOM entry point
├── images/
│   └── WebSite/
│       ├── 1st UI.png
│       ├── 2nd UI.png
│       └── Final Ui.png    # Sales console screenshot
├── index.html              # HTML entry template
├── package.json            # Project scripts & dependencies
└── vite.config.ts          # Vite bundler configuration
```

---

## Scripts

| Script | Description |
|--------|-------------|
| `npm install` | Install all backend and frontend dependencies |
| `npm run dev` | Start development environment (`node backend/server.js`) |
| `npm run build` | Build optimized production bundle via Vite & Esbuild |
| `npm run start` | Run production build server (`node dist/server.cjs`) |

---

## License

This project is licensed under the MIT License. See the `LICENSE` file for details.
