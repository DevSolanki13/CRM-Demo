# Customizable CRM Demo

## Overview

**Customizable CRM Demo** is a lightweight, feature‑rich Customer Relationship Management (CRM) web application. It provides a modern, responsive UI with dark‑mode glassmorphism design, built with **React 18**, **JavaScript (JSX)**, **Node.js**, **Express**, and **Vite**. The app showcases a modular full‑stack architecture with clean Separation of Concerns between frontend and backend layers.

## Features

- **Dashboard & Pipeline Sync**: Real-time sales pipeline Kanban board with 1-to-1 live synchronization with Leads.
- **Lead Management**: Responsive table & mobile card views with multi-select checkboxes, bulk deletion (`Delete Selected`), and Pipeline Stage filtering.
- **Entity Management**: Comprehensive tools for Companies, Contacts, Leads, Employees, and Tasks.
- **CSV Data Export Center**: Download formatted CSV file exports for Contacts, Leads, and Deals.
- **Global Search**: Instant modal search across all CRM entities for fast navigation.
- **Modern Typography & UI**: Designed with **Inter** & **Poppins** Google Fonts for a sleek, tech-focused, professional aesthetic.
- **Full-Stack API Architecture**: Clean Express REST API backend coupled with an abstracted frontend API client (`frontend/api/crmClient.js`).

## Tech Stack

- **Frontend**: React 18, JavaScript (JSX), Tailwind CSS, Lucide Icons, Vite
- **Backend**: Node.js, Express.js
- **Tooling**: Esbuild, Git

## Screenshots

![Project Screenshot](images/1st%20UI%20(Updated%20).png)

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

## Project Structure

```text
├─ backend/               # Node.js & Express REST API Server
│  ├─ controllers/        # CRM business logic and route handlers
│  ├─ data/               # Seed mock data
│  ├─ routes/             # REST API endpoint definitions
│  ├─ store/              # In-memory CRM state store
│  └─ server.js           # Express server entry point
├─ frontend/              # React JSX Single Page Application
│  ├─ api/                # Frontend API client layer (`crmClient.js`)
│  ├─ components/         # Modular UI components (Views & Modals)
│  ├─ utils/              # Helper utilities (`crmHelpers.js`)
│  ├─ index.css           # Global Tailwind & typography styles
│  ├─ main.jsx            # React root mount point
│  └─ App.jsx             # Main layout, state routing & modals
├─ images/                # Application UI screenshots & assets
├─ index.html             # HTML entry template
├─ package.json           # Project scripts & dependencies
└─ vite.config.ts         # Vite bundler configuration
```

## Scripts

| Script | Description |
|--------|-------------|
| `npm install` | Install all backend and frontend dependencies |
| `npm run dev` | Start the development server (`node backend/server.js`) |
| `npm run build` | Create an optimized production build via Vite & Esbuild |
| `npm run start` | Run the production build server (`node dist/server.cjs`) |

## Contributing

Contributions are welcome! Feel free to open issues or submit pull requests. Please follow these steps:
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes
4. Push to your fork and open a PR

## License

This project is licensed under the MIT License. See the `LICENSE` file for details.
