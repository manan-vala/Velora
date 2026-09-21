# Documentation vs Code Discrepancies

Sources compared: `README.md`, `backend/README.md`, `backend/algo/algo_README.md`, `frontend/README.md`, `Vellora_Report.pdf`.

| Topic | Documentation says | Code actually does |
|---|---|---|
| Solvers in the tournament | Report §2.2, §3.3: LNS + ALNS | LNS + ALNS + VROOM (`backend/algo/solver.py:65-70`) |
| Soft-violation penalty used in ranking | `algo_README.md`: 100 | 50 (`solver.py:94`); the report correctly says 50 |
| Late drop-off | Report §1.1: any late drop-off is infeasible | Lateness up to the priority's `max_delay` is a *soft* violation; only beyond it is hard (`feasibilityfinal.py:77-84`) |
| Time format | Report §3.2: FastAPI ensures `HH:MM:SS` | Pydantic trims to `HH:MM` (`backend/models.py:27-31`) |
| Baseline savings | Report §3.2: PostgreSQL records cost savings vs baseline | Backend never uses baseline; only the frontend compares against it |
| Objective | Report §1.3.2: `J = wc·C + wt·T` with metadata weights | Used by ALNS and the scorer only; LNS uses 1/1, VROOM 0.7/0.3 |
| Solution selection | Report §3.3 step 5: lowest objective wins | Hierarchical: 0 hard violations → max served → min objective + 50·soft |
| ALNS timeout | Report §2.5.8, README: 150 s hard cap with partial-result rescue | Cap is ineffective (see backend finding B2); ALNS's own 38 s limit governs |
| ALNS stagnation | `algo_README.md`: widen after >500 iterations without improvement, early stop at 300 | Early termination at 300 fires before the 500-iteration widening can occur |
| Step 4 duration | `backend/README.md`: up to ~15 minutes | No global limit exists; LNS is unbounded (backend finding B3) |
| Docker Compose | `backend/README.md`: starts redis, api, worker; Postgres external | Compose also runs `db` (postgres:15) and `celery-beat`; sets no `OSRM_URL` or `SECRET_KEY` |
| Postgres version | README: 16 | Compose: 15-alpine |
| Env file | `_env.example` | `.env.example` |
| Project folder | `h3-backend/`, `route-opti-frontend` | `backend/`, `frontend/` |
| Tables auto-created | README: `users` and `optimization_run_logs` created on startup | Only `users` is created (backend finding B1) |
| VROOM setup | `vroom_solver.py` messages: run `python setup_vroom_env.py` | Only `setup_vroom_env.bat` exists |
| VROOM isolation | Main venv keeps numpy 2.x | `requirements.txt` pins `numpy<2` and `pyvroom` in the main env |
| Concurrency | README: `--concurrency=4` with solo pool | Solo pool ignores concurrency (one job at a time) |
| `check_lns.py` | Validates against `Utils/solution_check.py`, `Output/`, `Test_Data/` | Those paths are not in the repo |
| Frontend polling | README: halts on completed/failed | Correct, but there is no timeout for stuck/unknown tasks |
| Auth | Report implies login flow on mobile | Mobile auth screens are simulated; backend auth is disabled on optimization endpoints |
