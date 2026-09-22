# Recommendations (prioritized)

Status notes after each item reflect the backend refactor that followed this review.

## Do first — correctness and stability

1. **Create all tables.** Import `db_models` before `Base.metadata.create_all()` in one startup path, or adopt Alembic. *(B1)* — **Done.** `database.init_db()` imports every model before `create_all()`.
2. **Bound solver runtime.** Run LNS/ALNS/VROOM in separate processes with one shared wall-clock budget; give LNS a time limit; add Celery `soft_time_limit`/`time_limit`; replace the ineffective ALNS `with ThreadPoolExecutor` timeout. *(B2, B3)* — **Done.** Each solver runs in its own process with a budget and a hard kill; Celery is gone.
3. **Single input source.** Parse the workbook once on the server into a normalized model (string IDs, minutes-since-midnight times, one validated office) and feed it to the matrix builder, all solvers, and the scorer. The frontend parser becomes preview-only. *(B5, F5)* — Open (out of scope for the refactor). Request validation now rejects duplicate/reserved IDs and multiple offices, and the API checks the workbook's sheets up front.
4. **Shared cost model.** One module for travel time (directed OSRM, consistent speed handling), cost, weights and soft/hard penalties, used by every solver and the scorer. *(B4, B12)* — Open.

## Next — robustness

5. **Edge keys.** Replace `"A_B"` strings with tuple keys or an index-based matrix; reject IDs that can't be represented. *(B6)* — **Done.** Edges carry `from`/`to`; lookups use tuples; route tags are resolved against known IDs.
6. **OSRM.** Chunk `/table` requests, retry the matrix call, require `OSRM_URL` via config, use HTTPS or a private network. *(B7)* — **Done.** Blocked `/table` requests with retries; `OSRM_URL` is required. HTTPS is moot on the VM's private Docker network.
7. **Task lifecycle.** Record task IDs at submission, return 404 for unknown IDs, enable `task_track_started`, set `result_expires`. Frontend: polling timeout, error surfacing, persisted task ID. *(B8, F3)* — **Done** on the backend (in-process job store, 404 for unknown IDs, result TTL). Frontend: a 404 ends polling as a failed job, and a 401 clears the session; there is still no polling timeout or persisted task ID.
8. **Capacity gate.** Move inspect calls off the event loop; fail closed (503) when no worker responds; derive the job limit from config and match the pool type. *(B9)* — **Done.** The queue's pending limit replaces the Celery inspect gate.
9. **VROOM deployment.** Either call pyvroom directly (main env already has numpy<2) or build `vroom_env` in the Dockerfile; record solver failures in the result and run log. *(B11)* — **Done.** pyvroom runs in-process; solver failures appear in `summary.solvers` and the logs.

## Security

10. Re-enable auth on `/process-routes/*` and `/optimization-logs`; wire the mobile login/signup to the backend. — **Done.** `/process-routes/*` and `/optimization-logs` require a JWT; jobs and logs are per user. The mobile screens now talk to the backend, and the desktop app has login too. Signup was then removed entirely: the superadmin creates accounts in `/admin`, and revoking one ends the user's session at once.
11. Remove or env-gate `/test/run-solver`. — **Done.** Removed.
12. Limit upload size, sanitize filenames (or drop the disk copy), restrict CORS origins, require `SECRET_KEY` at startup, stop returning raw exception text, remove default DB credentials. *(B10)* — **Done.** 4 MB upload limit, no disk copy of uploads, no CORS middleware, required `SECRET_KEY`/`DATABASE_URL`, no raw exception text in responses.
13. Restrict the Google Maps key by referrer / package name.

## Maintainability

14. Merge desktop/mobile stores and hooks; keep only layout components platform-specific. *(F1)*
15. Generate frontend types from the FastAPI OpenAPI schema; remove `as any` and index signatures. *(F4)*
16. Render children immediately in `DeviceRoutingProvider`. *(F2)* — **Done.** It was blanking every page's server-rendered HTML, including the login screen.
17. Map performance: single office marker, isolate the animated taxi marker, meter values from `route_sequence`. *(F6)*
18. Rename `16-02.py` → `alns.py`; move diagnostic scripts to `scripts/`; replace `print` with logging. — **Done.**
19. Add tests: scorer unit tests with hand-built routes, parser round-trip tests (frontend vs backend), an API smoke test, and regression runs on `algo/templts/*.xlsx`. — Partly: `backend/tests` covers the API, job queue, OSRM client, process runner, ID handling and all solvers on every template. Hand-built scorer tests and frontend/backend parser round-trips are still open.
20. Repo hygiene: remove committed APKs, fix Capacitor `appId` and page metadata, commit needed JSON fixtures (narrow the `*.json` ignore rule).
21. Bring READMEs and the report in line with the code (see [doc-discrepancies.md](doc-discrepancies.md)). — Partly: backend READMEs updated; the report is not.
