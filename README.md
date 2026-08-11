# Customizable CRM Demo

## Overview

**Customizable CRM Demo** is a lightweight, feature‑rich Customer Relationship Management (CRM) web application. It provides a modern, responsive UI with dark‑mode glassmorphism design, built with **React 18**, **JavaScript (JSX)**, **Node.js**, **Express**, and **Vite**. The app showcases a modular full‑stack architecture with clean Separation of Concerns between frontend and backend layers.

---

## Key Features

- **Stage Gate Qualification System**: Mandatory stage-specific 4-question Yes/No qualification checklists (`New Lead → Contacted`, `Contacted → Sample Sent`, `Sample Sent → Proposal Sent`, `Proposal Sent → Negotiation`, `Negotiation → Closed Won`) before moving deals forward.
- **Closed Lost Routing & Lost Reason Analytics**: Automated routing to Closed Lost when qualification criteria fail, requiring mandatory **Lost Reason** selection (`Budget mismatch`, `No decision-maker access`, `Losing to competitor`, `Slow internal process`, `Technical fit issue`, `Went silent`) and rep observations.
- **Backward Stage Demotion Tracking**: Mandatory demotion reason tracking (`Requirements changed`, `Sample re-testing needed`, `Decision-maker changed`, `Budget delay`, etc.) when demoting deals to previous pipeline stages.
- **Manager / Admin Review Workflow**: Rep submissions place stage moves into `Pending Review` state with amber card badges for Manager/Admin review and one-click execution.
- **3-Dots Quick Action Menu per Lead**: Instant modal access on every lead row for **Add Activity** (log calls/meetings), **Change Stage** (qualification check), and **Send Email** (mailto & CRM log).
- **Role-Based Access Control (RBAC)**: Restricted Kanban drag-and-drop to Admin users, with **Direct Stage Updates (No Questions)** for Admin users.
- **Reports & Governance Audit Log**: Visual Lost Deals by Pipeline Stage chart, Lost Deals by Reason monetary breakdown, and permanent Stage Gate Governance Audit Log table.
- **Dashboard Vertical Bar Stepper**: Financial vertical bar chart comparing monetary values across consecutive pipeline stages.
- **Lead & Entity Management**: Comprehensive management tools for Companies, Contacts, Leads, Employees, and Tasks with multi-select bulk operations.
- **CSV Data Export Center**: Download formatted CSV file exports for Contacts, Leads, and Deals.
- **Global Search**: Modal search across all CRM entities with keyboard shortcuts.

---

## Screenshots

### Main Dashboard Interface
![Final UI](images/WebSite/Final%20Ui.png)

---

## Tech Stack

- **Frontend**: React 18, JavaScript (JSX), Vanilla CSS / Tailwind CSS, Lucide Icons, Vite
- **Backend**: Node.js, Express.js
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
Starts the Node.js Express backend server (`backend/server.js`) and Vite development environment.

### Build for Production

```bash
npm run build
# Start production server
npm run start
```

---

## Project Structure

```text
├─ backend/               # Node.js & Express REST API Server
│  ├─ controllers/        # CRM business logic, stage gate controllers
│  ├─ data/               # Mock seed data & governance logs
│  ├─ routes/             # REST API endpoint definitions
│  ├─ store/              # In-memory CRM state store & transition logic
│  └─ server.js           # Express server entry point
├─ frontend/              # React JSX Single Page Application
│  ├─ api/                # Frontend API client layer (`crmClient.js`)
│  ├─ components/         # Modular UI components
│  │  ├─ DashboardView.jsx        # Vertical bar chart & key metrics
│  │  ├─ PipelineView.jsx         # Kanban board, RBAC drag & drop, card badges
│  │  ├─ LeadsView.jsx            # Leads table, 3-dots action menus, roomier modals
│  │  ├─ ReportsView.jsx          # Governance audit log table, lost deal analytics
│  │  └─ StageGateCheckModal.jsx  # Qualification checklist, lost reason & demotion form
│  ├─ utils/              # Helper utilities (`crmHelpers.js`)
│  ├─ index.css           # Global styles & scrollbars
│  ├─ main.jsx            # React root mount point
│  └─ App.jsx             # Main layout, routing & state
├─ images/                # Application UI screenshots & assets
├─ index.html             # HTML entry template
├─ package.json           # Project scripts & dependencies
└─ vite.config.ts         # Vite bundler configuration
```

---

## Scripts

| Script | Description |
|--------|-------------|
| `npm install` | Install all backend and frontend dependencies |
| `npm run dev` | Start the development server (`node backend/server.js`) |
| `npm run build` | Create an optimized production build via Vite & Esbuild |
| `npm run start` | Run the production build server (`node dist/server.cjs`) |

---

## Contributing

Contributions are welcome! Feel free to open issues or submit pull requests. Please follow these steps:
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes
4. Push to your fork and open a PR

---

## License

This project is licensed under the MIT License. See the `LICENSE` file for details.
