# Route Optimization Engine — Backend

A Vehicle Routing Problem (VRP) backend built with **FastAPI**. It accepts employee/vehicle data, fetches road distances from an **OSRM** server, runs three competing solvers (LNS, ALNS, VROOM), scores them with one feasibility checker, and returns the best plan with encoded road geometries for the map.

Everything runs in one container: the API, an in-process job queue, and the solver processes. Postgres stores run logs and users. For the solver algorithms, see [`algo/algo_README.md`](algo/algo_README.md). For how it is deployed, see [`docs/deployment.md`](../docs/deployment.md).

---

## Architecture

```
Vercel API route ──▶ Cloudflare Worker ──▶ velora-backend container (:8080)
                                             ├── FastAPI (main.py)
                                             ├── job worker thread (jobs.py → pipeline.py)
                                             │     └── solver processes: LNS | ALNS | VROOM
                                             ├──▶ OSRM   (/table, /route)
                                             └──▶ Postgres (run logs, users)
```

### Request lifecycle

1. `POST /process-routes/start` receives `json_data` (employees + vehicles) and the `.xlsx` file. The API validates the payload and checks that the workbook has the `employees`, `vehicles` and `metadata` sheets. It then queues a job and returns its `task_id` (a UUID).
2. One worker thread runs jobs one at a time (`pipeline.run_optimization`):
   1. Fetch the distance/duration matrix from OSRM in retried blocks (`router.MatrixService`).
   2. Turn it into an edge list with explicit `from`/`to` endpoints (`logic.generate_routes`).
   3. Run LNS, ALNS and VROOM, each in its own process with a hard time limit. Score each result and keep the best (`algo/solver.py`).
   4. Fetch road geometry for every route segment (`geometry_processor.py`).
   5. Write a row to `optimization_run_logs`.
3. The client polls `GET /process-routes/status/{task_id}` until the job is `completed` or `failed`.

Job state lives in memory. Results stay pollable for `JOB_RESULT_TTL_S`. After a restart, earlier task IDs return 404, and the frontend then shows the job as failed.

---

## Project structure

```
backend/
├── main.py                  # FastAPI app and endpoints
├── config.py                # Environment configuration (fails fast on missing required values)
├── jobs.py                  # In-process job queue (one worker thread, TTL'd results)
├── pipeline.py              # The optimization job: matrix → edges → solvers → geometry → log
├── models.py                # Pydantic request models and validation
├── router.py                # OSRM client: MatrixService (blocked /table) and RouteService (/route)
├── logic.py                 # Edge list generation from the matrix
├── geometry_processor.py    # Route geometry enrichment (polyline encoding)
├── database.py              # SQLAlchemy engine, session, init_db()
├── db_models.py             # User and OptimizationRunLog models
├── optimization_logger.py   # Run logger with a 1,000-row cap
├── auth.py                  # /auth routes: register, login, me (bcrypt + JWT, login lockout)
├── algo/                    # Solvers — see algo/algo_README.md
├── scripts/
│   ├── run_solver.py        # Run the solver tournament on a workbook, no API/OSRM needed
│   ├── fixtures.py          # Workbook → API payload + haversine edge list (used by tests too)
│   └── data_converter.py    # Dump a workbook to JSON
├── tests/                   # pytest suite
├── requirements.txt         # Runtime dependencies (pyvroom pins numpy<2)
├── requirements-dev.txt     # + pytest
├── Dockerfile
└── docker-compose.yml       # Local db + api
```

---

## Configuration

Copy `.env.example` to `.env`. The service refuses to start without the required values.

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | yes | — | Postgres URL, e.g. `postgresql+psycopg2://user:pass@host:5432/velora` |
| `OSRM_URL` | yes | — | Base URL of `osrm-routed`, e.g. `http://osrm:5000` |
| `SECRET_KEY` | yes | — | JWT signing key |
| `SUPERADMIN_USERNAME` | yes | — | The account that manages users; created on startup |
| `SUPERADMIN_PASSWORD` | yes | — | Its password. Changing this rotates it on the next restart |
| `JWT_EXPIRE_MINUTES` | no | `1440` (24 h) | How long a login stays valid |
| `SOLVER_MAX_WORKERS` | no | `1` | Solver processes running at once (1 on the 2-OCPU VM, so OSRM keeps a core) |
| `SOLVER_TIME_LIMIT_S` | no | `40` | Each solver's search budget |
| `SOLVER_GRACE_S` | no | `30` | Extra time before a solver that is still running is killed |
| `MAX_PENDING_JOBS` | no | `5` | Queued + running jobs before `/process-routes/start` returns 429 |
| `JOB_RESULT_TTL_S` | no | `3600` | How long a finished job stays pollable |
| `MAX_UPLOAD_BYTES` | no | `4194304` | Largest accepted workbook (413 above this) |
| `OSRM_TABLE_BLOCK` | no | `100` | Sources/destinations per OSRM `/table` request |

A job takes at most about `ceil(3 / SOLVER_MAX_WORKERS) × (SOLVER_TIME_LIMIT_S + SOLVER_GRACE_S)` in the solver step, plus the OSRM calls. With the defaults that's about 3.5 minutes in the worst case. Small inputs finish in seconds.

If Postgres is unreachable at startup, the API still starts and optimization still works. Run logging and auth fail until the database is back. Tables are created on startup by `database.init_db()`.

---

## Running locally

**With Docker (recommended).** The image uses Python 3.10, where pyvroom 1.14 and numpy < 2 install cleanly:

```bash
cp .env.example .env         # set OSRM_URL and SECRET_KEY
docker compose up --build    # db + api on http://localhost:8080
```

**Without Docker** (Python 3.10):

```bash
pip install -r requirements.txt
export DATABASE_URL=... OSRM_URL=... SECRET_KEY=...
uvicorn main:app --reload --port 8080
```

Interactive API docs: `http://localhost:8080/docs`.

---

## API

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/process-routes/start` | JWT | Queue an optimization job |
| GET | `/process-routes/status/{task_id}` | JWT | Poll your own job |
| GET | `/optimization-logs` | JWT | Your run history, newest first (`limit` ≤ 1000, `offset`) |
| POST | `/auth/login` | — | OAuth2 password form, returns a token |
| GET | `/auth/me` | JWT | The signed-in username and whether they're an admin |
| GET | `/admin/users` | admin | Every account with status and last sign-in |
| POST | `/admin/users` | admin | Create an account; returns its generated password once |
| POST | `/admin/users/{username}/password` | admin | Generate a new password |
| POST | `/admin/users/{username}/revoke` | admin | Withdraw access |
| POST | `/admin/users/{username}/restore` | admin | Give it back |
| DELETE | `/admin/users/{username}` | admin | Remove the account |
| GET | `/health` | — | `{"status": "ok", "queue_depth": n}` |

The Cloudflare Worker must forward both `/process-routes` and `/auth` for the deployed app to work.

### Authentication

- **Accounts.** There is no signup. The superadmin (`SUPERADMIN_USERNAME`) creates accounts
  through `/admin/users`, and the server generates the password: it is returned once, stored only
  as a bcrypt hash, and can be regenerated but never read back. Usernames are trimmed, lowercased
  and limited to 3–32 characters from `[a-z0-9._-]`; a taken name returns 409.
- **The superadmin** is created on startup from the environment. Later restarts restore its admin
  rights and access, and rotate its password if `SUPERADMIN_PASSWORD` changed.
- **Tokens.** `/auth/register` and `/auth/login` return `{access_token, token_type, expires_in,
  username}`. Tokens are HS256 JWTs carrying `sub`, `iat` and `exp`, valid for
  `JWT_EXPIRE_MINUTES`. Send them as `Authorization: Bearer <token>`. There is no refresh or
  revocation: to end a session, the client drops the token.
- **Login protection.** Five failed logins for one username within 15 minutes lock it for the rest
  of the window (429 with `Retry-After`), even with the right password; a success resets the
  count. Unknown usernames are checked against a dummy hash, so timing doesn't reveal which
  accounts exist, and both cases return the same message.
- **Revoking.** Every request loads the account, so revoking cuts a user off immediately: their
  existing token is refused and their login gets the same message as a wrong password. Tokens also
  carry a version, bumped when a password is regenerated or access is revoked, so old sessions stay
  dead even if the account is restored later.
- **Per-user data.** A job belongs to the user who started it: polling someone else's task ID
  returns the same 404 as an unknown one, and `/optimization-logs` only lists your own runs. The
  pending-job limit stays global, since it protects the shared VM.
- **Admins** can't revoke or delete their own account, so the last way in can't be closed by
  accident.

**`POST /process-routes/start`** takes a multipart form:

- `json_data`: a JSON object matching `OptimizationRequest` (employees, vehicles, optional metadata/baseline). Employee and vehicle IDs must be non-empty and unique across both lists, and must not be `office`. Numeric IDs are accepted. All employees must share one drop-off (office) location, within about 11 m. Times accept `HH:MM` or `HH:MM:SS`.
- `file`: the source `.xlsx` with `employees`, `vehicles` and `metadata` sheets, up to 4 MB.

| Response | When |
|---|---|
| `200 {"status": "queued", "task_id": "<uuid4>", ...}` | Job queued |
| `400` | `json_data` isn't valid JSON |
| `413` | File larger than `MAX_UPLOAD_BYTES` |
| `422` | Payload fails validation (`detail` is a list of `{loc, msg}`), or the file isn't a workbook with the required sheets |
| `429` | `MAX_PENDING_JOBS` already queued or running |

**`GET /process-routes/status/{task_id}`**:

| Response | Meaning |
|---|---|
| `{"status": "processing"}` | Queued or running |
| `{"status": "completed", "result": {...}}` | Per-vehicle routes, timings, costs and `route_geometry` polylines. `summary.solvers` gives each solver's status (`ok`, `failed` or `timed out`) |
| `{"status": "failed", "error": "..."}` | A user-facing message. Internal errors are only logged |
| `404` | Unknown or expired task |

---

## Solvers and time limits

`algo/solver.py` starts each solver in a separate `spawn` process:

- At most `SOLVER_MAX_WORKERS` run at once.
- Each solver gets `SOLVER_TIME_LIMIT_S` as its search budget. LNS stops iterating at the deadline, and ALNS uses it as its time limit.
- A solver still running at limit + grace is terminated, and the job continues with whatever the other solvers produced.
- If every solver fails, the job fails with "No route plan could be produced for this input."

Ranking: zero hard violations first, then most employees served, then lowest `objective + 50 × soft_violations`.

VROOM runs in-process through pyvroom. `requirements.txt` pins `numpy<2`, which pyvroom 1.14's wheels need. `vroom_matrix_patch.py` works around a buffer-format quirk in the Windows wheel and does nothing on Linux.

---

## OSRM

- **Matrix:** requested in `OSRM_TABLE_BLOCK × OSRM_TABLE_BLOCK` source/destination blocks. That stays within OSRM's default `--max-table-size` of 100 and keeps URLs bounded, and a failure only retries one block. Each block is tried 3 times with backoff on 5xx, 429 and connection errors. Pairs OSRM can't route are dropped, and the solvers fall back to haversine for them.
- **Geometry:** one `/route` call per unique segment, at most 50 at a time, 3 attempts each. A failed segment gets an empty geometry instead of failing the job.

---

## Tests

The suite needs pyvroom, so run it in the image:

```bash
docker build -t velora-backend .
docker run --rm -v "$PWD:/app" -w /app velora-backend \
  sh -c "pip install -q -r requirements-dev.txt && python -m pytest -q -p no:cacheprovider"
```

It covers config validation, table creation and the run-log cap, the API (lifecycle, validation, limits, auth, no CORS), the job queue, OSRM blocking and retries against a fake OSRM, underscore IDs through every solver, the process runner (hangs, crashes, the concurrency limit), and all three real solvers on every workbook in `algo/templts`. The real-solver tests take a couple of minutes. Add `-k "not every_template"` for a quick run.

To try the solvers on a workbook without the API or OSRM:

```bash
python scripts/run_solver.py --excel algo/templts/TestCase_TC03.xlsx --time-limit 10 --workers 3
```
