# Customizable CRM Demo

## Overview

**Customizable CRM Demo** is a lightweight, feature‑rich Customer Relationship Management (CRM) web application. It provides a modern, responsive UI with dark‑mode glassmorphism design, built with **React**, **TypeScript**, and **Vite**. The app showcases a modular architecture that can be easily extended or customized for real‑world projects.

## Features

- Dashboard with pipeline visualization and reports
- Manage Companies, Contacts, Leads, Employees, and Tasks
- Global search modal for quick navigation
- Export/Import data via JSON
- Responsive UI with modern design (dark mode ready)
- API client abstraction (`src/api/crmClient.ts`) ready for backend integration

## Tech Stack

- **React 18** with **TypeScript**
- **Vite** for fast bundling and HMR
- **tsx** runtime for running the development server (`npm run dev`)
- **Git** for version control

## Screenshots

![Project Screenshot](images/1st%20UI.png)

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
Visit `http://localhost:5173` (or the port shown in the console) to view the app.

### Build for Production

```bash
npm run build
# Preview the production build
npm run preview
```

## Project Structure

```text
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

## License

This project is licensed under the MIT License. See the `LICENSE` file for details.
