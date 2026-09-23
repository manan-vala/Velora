# System Architecture

## Purpose

A fleet-routing application: assign employees to vehicles and produce pickup routes to a single shared office, respecting time windows, vehicle capacity and availability, priority-based lateness allowances, and soft rider preferences (ride sharing, vehicle category). Results are shown on an interactive map with route simulation.

## High-level diagram

```
Next.js static export (web on Vercel + Capacitor Android)
   │  user uploads .xlsx → parsed in browser with ExcelJS → JSON
   │  POST multipart {json_data, file} → /process-routes/start
   │  polls /process-routes/status/{task_id} every 15 s
   ▼
FastAPI (backend/main.py)
   │  Pydantic validation, 429 capacity gate via Celery inspect
   │  saves file to temp_uploads/, base64-encodes it into the task payload
   ▼
Redis (Celery broker + result backend)
   ▼
Celery worker (backend/worker.py) — 5-step pipeline
   1. Rebuild OptimizationRequest from dict
   2. OSRM /table → N×N distance + duration matrix         (router.py MatrixService)
   3. Flatten matrix to edge list keyed "FROM_TO"           (logic.py)
   4. solve_vrp: LNS ║ ALNS ║ VROOM in a ThreadPoolExecutor (algo/solver.py)
        VROOM runs as a subprocess in an isolated vroom_env (algo/vroom_solver.py)
        every solution scored by algo/feasibilityfinal.py → winner selected
   5. OSRM /route per segment → encoded polylines          (geometry_processor.py)
   ▼
PostgreSQL — optimization_run_logs (capped at 1000 rows), users (JWT auth)
```

## Components

### Backend (Python, FastAPI + Celery)

| File | Role |
|---|---|
| `backend/main.py` | API: `/process-routes/start`, `/process-routes/status/{id}`, `/optimization-logs`, `/health`; mounts auth and test routers |
| `backend/worker.py` | Celery app, optimization task, Beat task that removes temp files older than 24 h |
| `backend/models.py` | Pydantic request models; trims `HH:MM:SS` → `HH:MM` |
| `backend/router.py` | OSRM clients: `MatrixService` (single `/table` call), `RouteService` (throttled `/route` calls with retries) |
| `backend/logic.py` | Builds the directed edge list (emp↔emp, veh→emp, emp↔office, veh↔office) |
| `backend/geometry_processor.py` | Fetches per-segment geometry, injects exact endpoints, encodes polylines, replaces `routes` with `route_geometry` |
| `backend/database.py`, `db_models.py`, `optimization_logger.py` | SQLAlchemy setup, run-log model, safe logger with row cap |
| `backend/auth.py` | JWT register/login with bcrypt (currently not enforced on optimization endpoints) |
| `backend/test_routes.py` | `/test/run-solver` endpoint that runs the solver synchronously |

### Solvers (`backend/algo/`)

| Solver | Files | Notes |
|---|---|---|
| Orchestrator | `solver.py` | Runs 3 solvers concurrently; ranks by (0 hard violations) → max served → min `objective + 50·soft` |
| LNS | `lns_algo.py`, `lns_local_search.py`, `lns_simulator.py`, `lns_utils.py` | 4 ruin operators, greedy/regret-2 repair, 6-operator steepest-descent local search, simulated annealing; 100 iterations, no time limit |
| ALNS | `16-02.py` | 7 destroy operators with adaptive (bandit-style) weights, noisy regret repair, K-nearest-vehicle pruning, 38 s time limit, publishes best-so-far to `result_ref` |
| VROOM | `vroom_solver.py`, `vroom_bridge.py`, `vroom_matrix_patch.py` | pyvroom in an isolated venv (numpy<2) via JSON over stdin/stdout; shipments with time windows; 120 s timeout |
| Scorer | `feasibilityfinal.py` | Replays any solution against the Excel constraints; returns served count, hard/soft violations, objective |

### Frontend (Next.js 16, React 19, TypeScript)

| Area | Files | Role |
|---|---|---|
| State | `store/useAppStore.ts`, `store/useMobileStore.ts` | Zustand stores (data, UI, map "command" state, layers) — one per platform |
| Server state | `hooks/useOptimization.ts`, `hooks/useMobileOptimization.ts` | React Query mutation to start a job + polling query |
| API | `lib/api.ts` | `startOptimizationJob`, `checkOptimizationStatus` |
| Parsing / export | `lib/excel-parser.ts`, `lib/export-excel.ts` | ExcelJS parse (fuzzy sheet-name matching, time normalization) and result export |
| Map | `components/map/MapInterface.tsx`, `components/mobile/MobileMap.tsx`, `components/map/base/` | MapLibre + OpenFreeMap tiles in our own style (`lib/map/style.ts`); markers and routes as GeoJSON layers; route playback via `requestAnimationFrame` (`hooks/useRoutePlayback.ts`, `lib/map/playback.ts`) |
| Routing | `app/providers/DeviceRoutingProvider.tsx` | UA / width based redirect between `/` and `/mobile` |
| Mobile packaging | `capacitor.config.ts`, `android/` | Capacitor Android wrapper around the static export (`output: "export"`) |

## Data contract

- Input: Excel workbook with sheets `employees`, `vehicles`, `metadata` (key/value), optional `baseline`.
- The **browser-parsed JSON** drives the OSRM matrix and geometry; the **raw Excel bytes** are re-parsed by pandas inside every solver and the scorer. (See backend finding B5.)
- Output per vehicle: `vehicle_id`, `vehicle_type`, `capacity`, `avg_speed_kmph`, `total_cost`, `total_time_minutes`, `route_sequence[]` (`step`, `location`, `arrival_time`, `departure_time?`), `route_geometry[]` (`segment_id`, encoded `geometry`), plus `summary` and `soft/hard_violation_details`.

## Strengths

- The CPU-heavy solve is kept out of the web process (task queue + polling).
- A three-solver tournament judged by one solver-independent scorer is a sound hedge against any single heuristic's weaknesses.
- O(1) edge lookup with a haversine × 1.3 fallback.
- Geometry computed server-side with endpoint injection to close the marker–polyline gap.
- Throttled, retrying, connection-pooled OSRM geometry fetching.
- Careful diagnosis and documentation of the pyvroom / numpy ABI problem.
- ALNS publishes its best-so-far solution so partial progress is recoverable.
- Run-log table is capped and logging failures are non-fatal.
- Solver internals are well commented.
