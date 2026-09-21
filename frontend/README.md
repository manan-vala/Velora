# Route Optimization Frontend

A high-performance web application for visualizing and optimizing fleet routes and employee pickups/drop-offs. Built with Next.js, the application provides an interactive map interface, real-time job polling, a comprehensive vehicle simulation engine, and full support for both desktop and mobile experiences.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Architecture Overview](#architecture-overview)
- [Key Features](#key-features)
- [Folder Structure](#folder-structure)
- [Local Setup](#local-setup)
- [Environment Variables](#environment-variables)
- [Available Scripts](#available-scripts)

---

## Tech Stack

| Layer                | Technology                                           |
| -------------------- | ---------------------------------------------------- |
| Framework            | Next.js (App Router) with React                      |
| Language             | TypeScript                                           |
| Styling              | Tailwind CSS                                         |
| State Management     | Zustand                                              |
| Async / Server State | TanStack React Query                                 |
| Maps                 | Google Maps JavaScript API, `@react-google-maps/api` |
| Excel Parsing        | ExcelJS                                              |
| Font                 | Geist Sans / Geist Mono (via `next/font`)            |

---

## Architecture Overview

The application is organized around three architectural pillars that separate concerns cleanly across state, data flow, and rendering.

### Global State Management (Zustand)

A centralized `useAppStore` (desktop) and `useMobileStore` (mobile) manage the full application state without prop-drilling. State is divided into three domains:

- **Data state** — parsed Excel data (`ParsedData`), the uploaded file reference, and the final `OptimizationResult` returned by the backend.
- **UI state** — sidebar toggles, active vehicle/employee selection, dark/light map theme, and the visibility of map layers (offices, employees, vehicles, routes).
- **Map command pattern** — rather than passing map instance references between components, the store exposes command-style state variables such as `mapFocus` and `simulationTargetId`. When these values update, the map component reacts by performing imperative operations like panning or starting a simulation.

### Asynchronous Data Flow (TanStack React Query)

Backend processing follows a job-based polling architecture, implemented in the `useOptimization` and `useMobileOptimization` hooks:

1. **Job initiation** — a `useMutation` call sends the parsed JSON data and the original Excel file to the backend `/start` endpoint via `FormData`. On success, it stores the returned `taskId` in the Zustand store.
2. **Smart polling** — a `useQuery` hook polls the `/status/{taskId}` endpoint every 15 seconds. Polling automatically halts when the response status is `"completed"` or `"failed"`.
3. **Auto-sync** — a `useEffect` watches the polling result. On completion, the optimization result is written to the Zustand store, the route layer is automatically enabled, and the task ID is cleared.

### Hybrid Map Rendering Engine

The mapping interface (`MapInterface.tsx` for desktop, `MobileGoogleMap` for mobile) optimizes performance by combining declarative React rendering with imperative vanilla JavaScript:

- **Declarative UI** — stationary markers (vehicles, employees, offices) and `InfoWindow` popups are rendered using `@react-google-maps/api` React components.
- **Imperative routes** — optimized route polylines are drawn using raw `google.maps.Polyline` objects inside a `useEffect` hook. This ensures reliable creation and teardown, avoiding the memory leaks that can occur with purely declarative polyline components.
- **Simulation engine** — when triggered, the map decodes precomputed route geometries (encoded polylines from the backend), then runs a `setInterval` loop to animate a taxi marker along the decoded path. A live `TaxiMeter` widget updates dynamically to reflect elapsed time and distance.

---

## Key Features

- **Excel data upload** — drag-and-drop or file-picker upload of `.xlsx`/`.xls` files. The parser automatically identifies Employee, Vehicle, Baseline, and Metadata sheets.
- **Interactive map** — click any marker to view detailed information. Vehicles display capacity and speed; employees display priority and ride-sharing preferences.
- **Route optimization** — one-click trigger that sends data to the backend engine, with live status polling and automatic result display.
- **Route simulation** — animated taxi overlay with a real-time taximeter showing time and distance traveled.
- **Layer controls** — toggle visibility of employee markers, vehicle markers, office drop-offs, and route paths independently.
- **Statistics dashboard** — post-optimization analytics including total distance, time, active stops, estimated costs, and baseline comparison percentages.
- **Excel export** — download optimization results as a formatted `.xlsx` file containing Vehicle Summary and Route Sequence sheets.
- **Light and dark map themes** — switchable via the settings menu.
- **Responsive design** — dedicated mobile layout with its own store, navigation, and touch-optimized controls. Device routing is handled automatically by `DeviceRoutingProvider`.

---

## Folder Structure

```
/app                         Next.js App Router pages and global layouts
  /providers                 React context providers (QueryClient, DeviceRouting)
  /visualiser                Main map visualizer page
  /visualiser/help           Help and documentation page
  /dataset                   Dataset inspection view

/components
  /map                       Desktop map rendering, overlays, and simulation widgets
    /MapWidgets              Sidebar, bottom bar, zoom controls, vehicle list, stats
  /mobile                    Mobile-specific map, navigation, and widget components
    /MapWidgets              Mobile sidebar, bottom nav, search, stats, results
    /HelpWidgets             Mobile help page sub-components
  /home                      Landing page components (hero, buttons, map visual)
  /help                      Desktop help page components (feature cards, FAQ)

/store
  useAppStore.ts             Zustand store for desktop
  useMobileStore.ts          Zustand store for mobile

/hooks
  useOptimization.ts         TanStack Query polling logic (desktop)
  useMobileOptimization.ts   TanStack Query polling logic (mobile)

/lib
  api.ts                     Backend API client (start job, check status)
  excel-parser.ts            Excel file parsing with ExcelJS
  export-excel.ts            Optimization result export to .xlsx
  map-utils.ts               Polyline decoding and map coordinate utilities

/types                       Shared TypeScript type definitions
```

---

## Local Setup

### Prerequisites

- Node.js v18 or higher
- npm, yarn, or pnpm
- A Google Maps API key with the following APIs enabled: Maps JavaScript API, Places API, and Geometry Library

### 1. Clone the repository

```bash
git clone <repository-url>
cd route-opti-frontend
```

### 2. Install dependencies

```bash
npm install
# or
yarn install
```

### 3. Configure environment variables

Create a `.env` file in the project root:

```env
NEXT_PUBLIC_MAPS_API_KEY=your_google_maps_api_key_here
NEXT_PUBLIC_MAIN_API_URL=https://api.domain.com/process-routes
```

Refer to the [Environment Variables](#environment-variables) section below for details on each variable.

### 4. Start the development server

```bash
npm run dev
# or
yarn dev
```

The application will be available at `http://localhost:3000`.

---

## Environment Variables

| Variable                   | Required | Description                                                                                                |
| -------------------------- | -------- | ---------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_MAPS_API_KEY` | Yes      | Google Maps API key used to load the Maps JavaScript API and render the map.                               |
| `NEXT_PUBLIC_MAIN_API_URL` | Yes      | Base URL for the backend optimization engine. The app appends `/start` and `/status/{taskId}` to this URL. |

---

## Available Scripts

| Command         | Description                        |
| --------------- | ---------------------------------- |
| `npm run dev`   | Start the development server       |
| `npm run build` | Create a production build          |
| `npm run start` | Serve the production build locally |
| `npm run lint`  | Run ESLint across the codebase     |
