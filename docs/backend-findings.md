# Backend Findings

## High severity

### B1. `optimization_run_logs` table is never created
- `backend/auth.py:26` calls `Base.metadata.create_all()` at import time.
- `backend/main.py:5` imports `auth` before `db_models` is imported (`main.py:9`, and via `worker` → `optimization_logger` → `db_models`). At that moment only the `User` model is registered.
- The Celery worker never imports `auth` and never calls `create_all`.
- **Effect:** unless the table was created manually, every insert fails; `backend/optimization_logger.py:70` swallows the exception, so `/optimization-logs` silently returns nothing.
- **Fix:** import `db_models` before calling `create_all` in a single startup path (or adopt Alembic migrations).

### B2. The 150 s ALNS hard timeout has no effect
- `backend/algo/solver.py:47-58` wraps the ALNS future in `with ThreadPoolExecutor(max_workers=1) as pool:`.
- Returning from inside the `with` block (including on `TimeoutError`) calls `shutdown(wait=True)`, which blocks until ALNS finishes.
- In practice ALNS's own 38 s budget (`Config.ALNS_TIME_LIMIT`) is the real cap; if ALNS ever hangs, the task hangs.

### B3. Unbounded runtime; threads are not parallel
- LNS and ALNS are pure-Python CPU-bound code running in threads — the GIL makes them alternate, not run in parallel. ALNS's 38 s wall-clock budget is shared with LNS.
- `run_lns` (`solver.py:37-40`) runs 100 iterations with **no time limit**. Each iteration performs a greedy or regret repair — regret repair (`lns_algo.py:212-268`) simulates roughly `U² × positions` routes for `U` removed employees (10–60 % of all employees) — followed by up to 100 local-search steps. The initial repair starts from an empty solution with every employee unassigned.
- `concurrent.futures.as_completed` (`solver.py:71`) has no timeout, so request latency is unbounded and grows super-linearly with problem size.
- **Fix:** run solvers in a `ProcessPoolExecutor` (or subprocesses like VROOM) with a shared wall-clock budget; give LNS a time limit; add Celery `soft_time_limit` / `time_limit`.

### B4. Solvers optimize different objectives and travel-time models than the judge

| Component | Cost/time weights | Travel time model |
|---|---|---|
| Scorer `algo/feasibilityfinal.py:28` | metadata `Wc/Wt` (default 0.6/0.4) | raw OSRM duration |
| ALNS `algo/16-02.py` | metadata `Wc/Wt` | raw OSRM, but `build_matrix` stores `(a,b)` and `(b,a)` from the same edge, so the later of `a_b` / `b_a` overwrites the other — directionality lost |
| LNS `algo/lns_algo.py:11-16` | `W1 = W2 = 1` (metadata ignored) | raw OSRM duration |
| VROOM `algo/vroom_solver.py:228`, `algo/vroom_bridge.py:175-223` | hardcoded 0.7 / 0.3 | OSRM × (30 km/h ÷ vehicle speed) |

- VROOM plans with different travel times than the scorer checks against, so a route VROOM considers feasible can be scored with hard violations. VROOM also does not model sharing preferences.
- Soft-penalty magnitudes also differ (LNS 2000 per soft violation, ALNS 200/300/500, ranking 50).
- **Effect:** the tournament is not an apples-to-apples comparison; winners are partly determined by model mismatch.
- **Fix:** a single shared cost/time/penalty module used by all solvers and the scorer.

### B5. Two sources of truth for the input
- Matrix and geometry come from the browser-parsed JSON (`MatrixService`, `enrich_with_geometries`).
- All solvers and the scorer re-parse the raw Excel with pandas.
- Known divergences:
  - Sheet names: frontend matches any sheet whose name *contains* "employee"/"vehicle"/"metadata"; pandas requires exactly `employees`, `vehicles`, `metadata`. A workbook with `Employees` passes the API and then fails in the worker after the OSRM call.
  - Numeric time parsing: `algo/lns_utils.py:82` treats numbers `< 10` as day-fractions; `16-02.py time_to_fraction` treats numbers `> 1` as minutes; VROOM has its own parser.
  - IDs: ExcelJS returns numbers for numeric ID cells; Pydantic v2 rejects `int` for `str` fields → 422. pandas `str(row[...])` accepts them.
- Mismatched IDs silently fall back to haversine or to the hard default of 10 km / 30 min (`algo/lns_utils.py:66`).
- **Fix:** parse the workbook once on the server, produce one normalized model, and pass it to matrix building, solvers and scorer.

## Medium severity

### B6. ID format is an implicit contract
- Edge keys are `"{from}_{to}"`. Any ID containing `_` breaks `geometry_processor.py:43` (`parse_tag`), ALNS `build_matrix` (`len(parts) == 2`), and the VROOM tag parser.
- Single office assumed: `router.py:26` and `geometry_processor.py:16` use `employees[0].drop_*`; the scorer (`feasibilityfinal.py:18`) registers each employee's drop, so the last one wins. Differing drop coordinates are silently collapsed.
- **Fix:** tuple keys `(from, to)` or an index-based matrix; validate that all drops are identical (or model multiple offices).

### B7. OSRM usage limits
- The entire matrix is one GET `/table` request (`router.py:37-56`). OSRM's default `--max-table-size` is 100; ~96 employees + vehicles + office exceeds it unless the server is reconfigured. Very large coordinate lists also approach URL-length limits.
- No retry on the matrix call (unlike geometry).
- Fallback URL is a hardcoded plain-HTTP public IP (`router.py:10`), also documented in the README.
- **Fix:** chunk the table request (sources/destinations parameters), add retries, require `OSRM_URL` from configuration.

### B8. Unknown task IDs poll forever
- Celery reports unknown or expired IDs as `PENDING`; `main.py:149` maps that to `"processing"`.
- Combined with the frontend's unlimited polling, a mistyped/expired task spins indefinitely.
- **Fix:** enable `task_track_started`, store task IDs at submission (Redis/Postgres) and return 404 for unknown ones.

### B9. Capacity gate blocks the event loop and fails open
- `get_active_job_count()` (`main.py:46-53`) performs two blocking `inspect` calls (up to 2 s each) inside the `async` handler `start_processing`, stalling every other request.
- If no worker answers, both return `None` → count 0 → the gate admits the request, contrary to the comment at `main.py:82`.
- With `--pool=solo` (Procfile, compose) the worker runs one job at a time while `MAX_CONCURRENT_JOBS = 4`.
- **Fix:** make the handler sync or use `run_in_threadpool`; treat "no workers responded" as unavailable (503); derive the limit from configuration.

### B10. Security exposure
- Auth dependencies commented out on `/process-routes/*` (`main.py:74-76`, `142-144`); `/optimization-logs` is also public.
- `/test/run-solver` (`test_routes.py:13`) is mounted unconditionally (`main.py:34`), unauthenticated, and runs the full solver synchronously inside the API process — a trivial DoS vector.
- No upload size limit; `file.filename` is used unsanitized in the temp path (`main.py:107`).
- CORS `allow_origins=["*"]` with `allow_credentials=True` (`main.py:36-42`).
- `SECRET_KEY` may be `None` (`auth.py:14`) → `/register` and `/login` raise at runtime; no login rate limiting.
- Raw exception strings returned to clients (`main.py:102`, `113`, `131`, `161`).
- Hardcoded default DB credentials in `database.py:8`.

### B11. VROOM isolation contradicted by the deployment
- `backend/requirements.txt` already pins `numpy<2.0.0` and `pyvroom==1.14.0` in the main environment; the Dockerfile additionally installs `numpy<2`.
- The Dockerfile never creates `vroom_env`, and `_resolve_python_exe()` deliberately never falls back to `sys.executable` → **VROOM always fails in Docker**, and the tournament silently degrades to LNS vs ALNS (the failure is only printed).
- The probe inserts `os.getcwd()/algo` into `sys.path` (`vroom_solver.py:152`) — cwd-dependent.
- Error messages reference `setup_vroom_env.py`, which does not exist (only `setup_vroom_env.bat`).
- **Fix:** either import pyvroom directly (main env already satisfies numpy<2) or build `vroom_env` in the Dockerfile; surface solver failures in the result/log.

### B12. Scorer accuracy issues (`algo/feasibilityfinal.py`)
- Sharing violations are counted after every step for every passenger (`:122-129`), so a single over-full trip is counted multiple times; LNS counts once per group.
- Missing metadata delay defaults to 0 (`:34`), while `lns_utils` defaults to 30.
- A route that ends without an office stop would count its riders as served without any deadline check. No current solver emits such routes, but the scorer is meant to be the independent judge.
- Vehicle preference only checks `premium` mismatch, while LNS penalizes any mismatch.
- The scorer mutates the solution dict (adds `*_violation_details`) — acceptable but side-effecting.

### B13. Global mutable state in ALNS
- `_MATRIX_DATA` is a module-level dict cleared and refilled per call (`16-02.py:61-75`). Safe under prefork/solo pools; concurrent jobs under a thread pool would corrupt each other.

## Low severity

- `run_async` creates a new event loop per step — fine, but the geometry step's `RouteService` client is not closed on exception (`geometry_processor.py:64-65`).
- File is written to disk **and** base64-sent through Redis (`main.py:104-124`); the disk copy is only used for cleanup. Pick one.
- `logging.basicConfig` with a shared `worker_debug.log` in both API and worker; `print` used in solvers/geometry instead of logging.
- Leftover diagnostic scripts in the backend root (`debug_alns.py`, `vroom_test.py`, `test_vroom_matrix.py`) and `algo/check_lns.py` referencing paths that don't exist in the repo.
- `backend/.gitignore` ignores `*.json`, so the fixtures required by `run_solver.py` and `/test/run-solver` (`matrix_edge_list.json`, `payload_dict.json`) are absent.
- `16-02.py` is not a valid module name, requiring the `importlib` workaround and lock in `solver.py`; renaming to `alns.py` removes that complexity.
- No automated tests (pytest) for the scorer, parsers or API.
- Celery result payloads (full solution + geometry) stay in Redis for the default 24 h; no explicit `result_expires`.
