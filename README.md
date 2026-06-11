# Tender Frontend

Tender Frontend is a React + Vite single‑page application that provides a dashboard UI for the TenderApp backend. It is focused on managing companies, clients, products, tenders, and orders through a clean, admin-style interface.

## Features

- **Dashboard-style SPA**
  - Modern React app with client-side routing via `react-router-dom`.
- **Entity management**
  - Pages for listing and editing entities such as clients, products, categories, manufacturers, tenders, and orders (mirrors the backend domain).
- **Reusable UI components**
  - Shared layout, table, and modal patterns for CRUD screens.
  - Iconography via `lucide-react`.
- **API integration**
  - Communicates with the Spring Boot backend over REST.
  - Centralized API helper module for HTTP calls.
- **Styling**
  - Tailwind CSS v4 via `@tailwindcss/vite` integration.
- **Developer experience**
  - Vite dev server with fast HMR.
  - ESLint configuration for React and hooks.

## Tech Stack

- React 19
- React DOM 19
- React Router DOM 7 for routing
- Vite 8 as build/dev tooling
- Tailwind CSS 4 + `@tailwindcss/vite` plugin
- Lucide React icons
- ESLint 10 with React + hooks plugins

## Project Structure

```text
tender-frontend/
├── index.html
├── package.json
├── vite.config.js
├── eslint.config.js
├── public/
└── src/
    ├── main.jsx
    ├── App.jsx
    ├── components/   # shared UI components (layout, tables, modals, forms, buttons)
    ├── pages/        # route pages (Clients, Products, Tenders, Orders, Auth, etc.)
    ├── api/          # API client / fetch helpers
    ├── hooks/        # custom hooks
    ├── context/      # auth/app context
    └── styles/       # Tailwind / global styles
```

*(Folder names under `src/` reflect the intended organization; adjust if your structure differs.)*

## Getting Started

### Prerequisites

- Node.js ≥ 18
- npm (comes with Node)

### Install dependencies

```bash
cd tender-frontend
npm install
```

### Run the dev server

```bash
npm run dev
```

By default, Vite starts on:

```text
http://localhost:5173
```

(See the terminal output for the exact URL.)

### Build for production

```bash
npm run build
```

To preview the production build locally:

```bash
npm run preview
```

## Connecting to the Backend

By default, the frontend should point to the TenderApp backend running on:

```text
http://localhost:8080
```

A typical API helper might look like:

```js
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api';

async function apiGet(path) {
  const response = await fetch(`${API_BASE_URL}${path}`, { credentials: 'include' });
  if (!response.ok) throw new Error('Request failed');
  return response.json();
}
```

You can configure the base URL via `VITE_API_BASE_URL` in a `.env` file:

```env
VITE_API_BASE_URL=http://localhost:8080/api
```

## Scripts

From `package.json`:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "lint": "eslint .",
    "preview": "vite preview"
  }
}
```

- `npm run dev` – start dev server with HMR.
- `npm run build` – create optimized production build.
- `npm run preview` – preview the production build locally.
- `npm run lint` – run ESLint.

## Development Notes

- Make sure Node.js and npm are installed and available in your PATH before configuring run configurations in WebStorm/IntelliJ.
- When creating new pages, follow the existing pattern:
  - add a route entry in `App.jsx` / router config,
  - create a page in `src/pages`,
  - call backend REST endpoints through the shared API client.
- Prefer reusable components (inputs, modals, tables) over duplicating layout code.
- When authentication is wired in:
  - store the JWT in memory or secure storage,
  - protect routes via an `AuthRoute`/`PrivateRoute` wrapper,
  - hide or disable actions in the UI based on user roles/permissions.

## Roadmap / Ideas

- Authentication UI:
  - login page and registration/invite flow.
  - handling token expiration and logout.
- Role/permission aware UI:
  - conditionally show or hide buttons (create, delete, export) based on the current user’s permissions.
- Table improvements:
  - pagination, sorting, and column filters.
- Better error and loading states:
  - skeleton loaders, inline API error messages, and retry actions.

---
