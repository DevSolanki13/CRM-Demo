# Basic CRM Demo

## Project Summary

**Customizable CRM Demo** is a lightweight, feature‑rich Customer Relationship Management (CRM) web application. It provides a modern, responsive UI with dark‑mode glassmorphism design, built with **React**, **TypeScript**, and **Vite**. The app includes a dashboard, entity management (companies, contacts, leads, employees, tasks), global search, and data import/export.

## Overview

**Customizable CRM Demo** is a lightweight, feature‑rich Customer Relationship Management (CRM) web application built with **React**, **TypeScript**, and **Vite**. It showcases a modular architecture that can be easily extended or customized for real‑world projects.

### What It Does

The application enables teams to manage their customer relationships efficiently. Users can create and organize companies, contacts, leads, employees, and tasks, view a visual sales pipeline, perform global search, and export or import data.

### Key Features
- Dashboard with pipeline visualization and reports
- Manage Companies, Contacts, Leads, Employees, and Tasks
- Global search modal for quick navigation
- Export/Import data via JSON
- Responsive UI with modern design (dark mode ready)
- API client abstraction (`src/api/crmClient.ts`) for future backend integration

### How It Was Built

Built with **React 18**, **TypeScript**, and **Vite** for fast development. State management uses React hooks, while UI components follow a modular design. The data layer is abstracted via an API client (`src/api/crmClient.ts`) ready for real backend integration.

## Tech Stack
- **React 18** with **TypeScript**
- **Vite** for fast bundling and HMR
- **tsx** runtime for running the development server (`npm run dev`)
- **Git** for version control

### How It Looks

The UI follows a modern dark‑mode glassmorphism aesthetic, with a sidebar navigation and responsive dashboard cards. Below is a mockup of the main dashboard view:

![How it looked](images/1st%20UI.png)

## Getting Started

### Prerequisites
- Node.js (>= 18)
- npm (comes with Node) or Yarn

### Installation
```bash
# Clone the repository (if you haven't already)
git clone https://github.com/DevSolanki13/CRM-Demo.git
cd CRM-Demo

# Install dependencies
npm install
```

### Development Server
```bash
npm run dev
```
Visit `http://localhost:5173` (or the port shown in the console) to view the app.

### Build for Production
```bash
npm run build
# Preview the production build
npm run preview
```

## Project Structure
```
├─ src/
│  ├─ api/                # API client layer
│  ├─ components/         # Reusable UI components (Views, Modals, etc.)
│  ├─ data/               # Initial mock data
│  ├─ types/              # TypeScript type definitions
│  ├─ utils/              # Helper functions
│  ├─ index.css           # Global styles
│  ├─ main.tsx            # Application entry point
│  └─ App.tsx             # Root component with routing
├─ public/                # Static assets (favicon, images)
├─ .env.example           # Example environment variables
├─ package.json           # Scripts and dependencies
└─ vite.config.ts         # Vite configuration
```

## Scripts
| Script | Description |
|--------|-------------|
| `npm install` | Install all dependencies |
| `npm run dev` | Start the development server using `tsx` |
| `npm run build` | Create an optimized production build |
| `npm run preview` | Preview the production build locally |

## Contributing
Contributions are welcome! Feel free to open issues or submit pull requests. Please follow these steps:
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes
4. Push to your fork and open a PR

