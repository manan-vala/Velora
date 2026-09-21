# Recommendations (prioritized)

## Do first — correctness and stability

1. **Create all tables.** Import `db_models` before `Base.metadata.create_all()` in one startup path, or adopt Alembic. *(B1)*
2. **Bound solver runtime.** Run LNS/ALNS/VROOM in separate processes with one shared wall-clock budget; give LNS a time limit; add Celery `soft_time_limit`/`time_limit`; replace the ineffective ALNS `with ThreadPoolExecutor` timeout. *(B2, B3)*
3. **Single input source.** Parse the workbook once on the server into a normalized model (string IDs, minutes-since-midnight times, one validated office) and feed it to the matrix builder, all solvers, and the scorer. The frontend parser becomes preview-only. *(B5, F5)*
4. **Shared cost model.** One module for travel time (directed OSRM, consistent speed handling), cost, weights and soft/hard penalties, used by every solver and the scorer. *(B4, B12)*

## Next — robustness

5. **Edge keys.** Replace `"A_B"` strings with tuple keys or an index-based matrix; reject IDs that can't be represented. *(B6)*
6. **OSRM.** Chunk `/table` requests, retry the matrix call, require `OSRM_URL` via config, use HTTPS or a private network. *(B7)*
7. **Task lifecycle.** Record task IDs at submission, return 404 for unknown IDs, enable `task_track_started`, set `result_expires`. Frontend: polling timeout, error surfacing, persisted task ID. *(B8, F3)*
8. **Capacity gate.** Move inspect calls off the event loop; fail closed (503) when no worker responds; derive the job limit from config and match the pool type. *(B9)*
9. **VROOM deployment.** Either call pyvroom directly (main env already has numpy<2) or build `vroom_env` in the Dockerfile; record solver failures in the result and run log. *(B11)*

## Security

10. Re-enable auth on `/process-routes/*` and `/optimization-logs`; wire the mobile login/signup to the backend.
11. Remove or env-gate `/test/run-solver`.
12. Limit upload size, sanitize filenames (or drop the disk copy), restrict CORS origins, require `SECRET_KEY` at startup, stop returning raw exception text, remove default DB credentials. *(B10)*
13. Restrict the Google Maps key by referrer / package name.

## Maintainability

14. Merge desktop/mobile stores and hooks; keep only layout components platform-specific. *(F1)*
15. Generate frontend types from the FastAPI OpenAPI schema; remove `as any` and index signatures. *(F4)*
16. Render children immediately in `DeviceRoutingProvider`. *(F2)*
17. Map performance: single office marker, isolate the animated taxi marker, meter values from `route_sequence`. *(F6)*
18. Rename `16-02.py` → `alns.py`; move diagnostic scripts to `scripts/`; replace `print` with logging.
19. Add tests: scorer unit tests with hand-built routes, parser round-trip tests (frontend vs backend), an API smoke test, and regression runs on `algo/templts/*.xlsx`.
20. Repo hygiene: remove committed APKs, fix Capacitor `appId` and page metadata, commit needed JSON fixtures (narrow the `*.json` ignore rule).
21. Bring READMEs and the report in line with the code (see [doc-discrepancies.md](doc-discrepancies.md)).
