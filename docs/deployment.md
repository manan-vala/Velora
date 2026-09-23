# Deployment Plan

The deployment architecture for Velora: what runs where, why it was chosen, how requests flow, how
code ships, and what's still left to do.

The rest of `docs/` reviews the code as it was at commit `e695d9b`, when it still used Celery and
Redis. The backend has since been refactored for this setup (see the status table at the end and
[recommendations.md](recommendations.md)).

**Status: live.** Every component below is deployed and confirmed working end to end (login,
optimization jobs, and the superadmin dashboard) as of 2026-09-23. Section 10 has the full
checklist; the only open items are the ones listed as deferred or known gaps.

**Priority:** the web app comes first. The Android build is set up but not tested on a device yet.

---

## 1. Goals and constraints

- **Zero cost.** Everything runs on free tiers, for about 10 users a month.
- **One Oracle Cloud VM.** It's an A1 instance with 2 OCPU and 12 GB RAM, running Ubuntu 24.04 on
  ARM (aarch64), in the Mumbai region. It uses the whole Always Free A1 allowance, so there's no
  room for a second VM. The account is on Pay-As-You-Go, so Oracle won't reclaim the VM when it's idle.
- **No open inbound ports.** Public traffic reaches the VM through a Cloudflare Tunnel.
- **The VM is a shared hub.** OSRM and the containers are meant to host future projects too, not just Velora.

## 2. Topology

```
Browser ───────────────┐
                       ├──▶ Vercel (Next.js web build + API routes, region bom1)
Android app (APK) ─────┘        │  server-side: adds x-auth-token (WORKER_TOKEN)
                                ▼
                     Cloudflare Worker (*.workers.dev)
                       per-caller token check, path limits, sets x-caller
                                │  Workers VPC Service
                                ▼
                     Cloudflare Tunnel (cloudflared on the VM, host networking)
                                │
                                ▼
                     Oracle A1 VM, private IP 10.0.0.53
                       ├── velora-backend   (published on 10.0.0.53:8010)
                       ├── osrm             (internal only, http://osrm:5000)
                       └── velora-postgres  (internal only)
```

| Component | Where | Notes |
|---|---|---|
| Frontend (web) | Vercel Hobby, root directory `frontend/` | Includes the API routes that proxy to the Worker |
| Frontend (Android) | Capacitor APK built from the same code | Calls the Vercel API routes; contains no secrets |
| API gateway | Cloudflare Worker + Workers VPC | Its code lives outside this repo, with the VM notes |
| Backend | Container on the VM | Image `ghcr.io/manan-vala/velora-backend` |
| Routing | OSRM container on the VM | Bangalore + ~100 km radius, MLD algorithm |
| Database | Postgres container on the VM | Run logs and users |

## 3. Decisions and why

### Backend on the VM, not GCP Cloud Run
Earlier drafts used Cloud Run, Cloud Tasks and Redis reached over the tunnel. We dropped that because:
- **Background work doesn't run on Cloud Run.** With default billing it throttles CPU once a
  response is sent. A "return 202, then solve in `BackgroundTasks`" design would stall.
- **The file has nowhere to go.** Separate Cloud Run containers don't share a disk, so the uploaded
  Excel file would need GCS as a go-between.
- **Latency on the hottest path.** Every OSRM `/table` and `/route` call would cross clouds through the tunnel.
- **Far less compute.** Cloud Run's free tier gives about 25 hours a month at 4 GB. The VM gives 720 hours with 12 GB.

### Everything in containers on one VM
There's no free quota for a second VM. Containers still keep services separate:
- Each service has its own restart policy and memory limit, so a backend crash doesn't take OSRM down.
- New projects can be added as extra services.

### Published image, not building on the VM
- Building pandas, numpy and pyvroom on 2 OCPUs would slow down production while it runs.
- The VM would need Git credentials.
- A published image makes rollback a tag change.
- Tags are git SHAs, so it's always clear what's deployed.

### Monorepo for Velora, separate repo for the VM
- **Velora stays one repo.** The frontend and backend share an API contract. Keeping them together
  lets one commit change both sides.
- **No git submodules.** They would bring back the cross-repo coordination the monorepo avoids.
- **`velora-vm-hub` is its own private repo.** It describes everything on the VM, including future
  projects, so it doesn't belong inside Velora.

### Worker token held server-side by Vercel
- The frontend is a static export, so a token sent from the browser would be a `NEXT_PUBLIC_`
  variable, which is readable in the bundle.
- Browser calls straight to the Worker also fail. The CORS preflight carries no custom header, so
  the Worker rejects it with 401.
- So the browser and the app call Vercel API routes instead, and those routes attach the token server-side.
- The Worker needs no CORS handling, and no client contains the token.

### One branch, two build targets
- A separate app branch would drift from `main`.
- The only real difference is that the web build has API routes and the app build is a static export.
- `next.config.ts` switches between the two with the `BUILD_TARGET` environment variable.

### OSRM from the official image
- `ghcr.io/project-osrm/osrm-backend` includes `linux/arm64`, so nothing needs building from source.
- The old Docker Hub image `osrm/osrm-backend` is amd64-only; don't use it.

## 4. Repositories

| Repo | Visibility | Contents |
|---|---|---|
| `manan-vala/Velora` | Public | `backend/`, `frontend/`, `docs/`, `.github/workflows/` |
| `velora-vm-hub` | Private | `docker-compose.yml`, `osrm/prepare.sh`, `.env.example`, README |

## 5. VM stack (`velora-vm-hub`)

| Service | Image | Exposure | mem_limit |
|---|---|---|---|
| `osrm` | `ghcr.io/project-osrm/osrm-backend:v26.9.0-debian` | internal only | 1g |
| `velora-postgres` | `postgres:16-alpine` | internal only | 1g |
| `velora-backend` | `ghcr.io/manan-vala/velora-backend:${VELORA_BACKEND_TAG}` | `${VM_PRIVATE_IP}:${VELORA_BACKEND_PORT}` (8010) | 5g |

Total ~7 GB, leaving ~4 GB for the OS, Docker and future services (plus a 4 GB swapfile as a backstop).

- **cloudflared is not part of this stack.** It runs as its own compose project with host networking
  and reaches the backend on the private IP.
- **Port 8010.** The pm2 placeholder test app is on port 8001, so the backend uses 8010.
- **OSRM settings:**
  - `--max-table-size 2000`. The default of 100 is too small for employees + vehicles + office.
  - `osrm/prepare.sh` downloads the Geofabrik southern-zone extract (~531 MB), then clips it with
    `osmium extract` to a bbox around Bangalore + ~100 km before building the MLD graph. The full
    southern-zone graph (five states) runs to ~6 GB on disk and doesn't fit the VM's memory budget;
    the clipped graph is far smaller. Stop `velora-backend` while this runs, to free RAM.
- **`SOLVER_MAX_WORKERS=1`.** OSRM shares the same 2 OCPUs and has to keep answering during a solve.
  The backend runs one job at a time and at most this many solver processes. Each solver gets
  `SOLVER_TIME_LIMIT_S` (40 s) and is killed after a further `SOLVER_GRACE_S` (30 s), so a job's solver
  step takes at most ~3.5 minutes. The other backend variables are listed in `backend/README.md`; the
  hub sets the required ones: `DATABASE_URL`, `OSRM_URL`, `SECRET_KEY`, `SUPERADMIN_USERNAME` and
  `SUPERADMIN_PASSWORD`. Compose passes each through to the container explicitly; a value that is
  only in `.env` never reaches the backend, which then refuses to start. Changing the superadmin
  password in `.env` rotates it on the next restart.
- **First-time setup:** clone → `cp .env.example .env` and fill it in (pin `VELORA_BACKEND_TAG` to a
  `sha-...` tag) → `bash osrm/prepare.sh` → `docker compose up -d velora-postgres`, wait for healthy
  → `docker compose up -d`. Start Postgres first: if the database isn't reachable when the backend
  starts, it serves anyway but skips creating the superadmin, and nobody can log in until it's
  restarted.

## 6. Backend image pipeline

- **Workflow:** `.github/workflows/backend-image.yml` runs on pushes to `main` that touch `backend/**`,
  or when started by hand.
- **Build:** runs on `ubuntu-24.04-arm` runners (free for public repos) and produces a `linux/arm64`
  image with no emulation.
- **Tags:** `sha-<short-sha>`, plus `latest` on `main`.
- **Deploy on the VM:** set `VELORA_BACKEND_TAG` in `.env` (pin it to a `sha-...` tag, not `latest`,
  so a later push to `main` doesn't change what's running until you choose to pull it), then run
  `docker compose pull velora-backend && docker compose up -d velora-backend`.
- **Roll back:** set the previous tag and run the same two commands.
- **GHCR package visibility:** must be Public, so the VM can pull without `docker login`. Set once
  under the package's settings on GitHub.

## 7. Cloudflare Worker

Per-caller design. Its code lives with the VM notes, outside this repo.

- **Callers:** they are listed in the `CALLERS` var, and each caller's token is the secret `TOKEN_<NAME>`.
  The web proxy's caller is `VERCEL_PROD`.
- **Token check:** constant-time comparison of SHA-256 hashes.
- **Rotation:** `TOKEN_<NAME>_NEXT` lets the old and new token both work during a change.
- **Path limits:** each caller can only reach its own path prefixes; anything else gets 403.
  `VERCEL_PROD` is set to `["/process-routes", "/auth", "/admin"]`: the optimization routes,
  `/auth/login` and `/auth/me`, and the superadmin's `/admin/users*` API. `/admin` is its own
  top-level path on the backend, so it needs its own prefix; without it the Worker answers 403 and
  the dashboard shows "gateway misconfigured".

  ```jsonc
  // wrangler.jsonc
  "CALLERS": [
    { "name": "VERCEL_PROD", "prefixes": ["/process-routes", "/auth", "/admin"] }
  ]
  ```

  Any new top-level backend path the web app calls needs a prefix here too.
- **Authorization passes through.** The Worker forwards the user's `Authorization: Bearer` header
  untouched; only `x-auth-token` is stripped. No Worker code change is needed for login.
- **Headers to the backend:** the Worker removes `x-auth-token` before forwarding, and sets `x-caller: <NAME>`.
- **No CORS handling, on purpose.** Only server-side callers talk to it.
- **Routing:** the target host and port come from the VPC Service config, not from the Worker code.

## 8. Frontend: build targets and API routes

| | Web (`npm run build`) | App (`npm run build:app`) |
|---|---|---|
| Output | Normal Next.js app (Vercel) | Static export in `out/` for Capacitor |
| API routes | Included (`*.web.ts` files) | Excluded by `pageExtensions` |
| Calls backend via | Relative `/api/...` | `NEXT_PUBLIC_API_BASE_URL` = `https://<vercel-domain>/api` |

**API routes** (`frontend/app/api/`, shared code in `frontend/lib/worker.ts` and `frontend/lib/session.ts`):

- **`POST /api/optimize/start`:**
  - rejects bodies over 4 MB with 413 (Vercel's hard limit is about 4.5 MB)
  - requires a string `json_data` and a `file`, otherwise 400
  - requires a session, and adds the user's token as `Authorization: Bearer`
  - forwards only those two fields to `/process-routes/start`
- **`GET /api/optimize/status/{taskId}`:**
  - requires `taskId` to be a UUID, otherwise 400. This stops input like `../` from reaching other backend paths.
  - forwards to `/process-routes/status/{taskId}`
- **`POST /api/auth/login`, `/api/auth/logout`, `GET /api/auth/me`:** exchange credentials with
  the backend and keep the JWT in an httpOnly, SameSite=Lax cookie scoped to `/api`, expiring with
  the token (24 h).
- **`/api/admin/[...path]`:** the superadmin's user management, restricted to the handful of
  backend paths it needs. The browser never sees the token. State-changing routes reject
  a foreign `Origin` (CSRF guard). The Capacitor app, which can't use cross-site cookies, gets the
  token in the response body and sends it back as a header.
- **When the Worker rejects a request (401/403):** the Worker answers in plain text, so the route
  returns 502 "gateway misconfigured". The backend's own JSON 401 passes through unchanged, so an
  expired session reaches the client as a session error rather than a gateway fault.
- **CORS:** only `https://localhost`, the Capacitor Android origin, is allowed. Browsers on the web
  deployment use the same origin, so they don't need it.
- **Region:** `frontend/vercel.json` sets `bom1` (Mumbai), close to the VM. Check the region on the
  deployed function.

**Environment variables:**

| Variable | Scope | Where |
|---|---|---|
| `NEXT_PUBLIC_MAPS_API_KEY` | client | Vercel + local |
| `WORKER_URL` | server only | Vercel + local |
| `WORKER_TOKEN` | server only; must equal the Worker's `TOKEN_VERCEL_PROD` | Vercel + local `.env` (gitignored) |
| `NEXT_PUBLIC_API_BASE_URL` | client, app build only | Set when running `build:app`. Now the API **root** (`https://<domain>/api`), not `/api/optimize` |

**Verified in production:** superadmin login through Vercel → Worker → VPC Service → tunnel →
backend → Postgres, the `/admin` dashboard, and optimization jobs. No token or Worker URL appears in
any client bundle.

## 9. Deploying changes

The first rollout is done. For later changes:

- **Backend:** push to `main` → the workflow publishes `sha-<short-sha>` → on the VM set
  `VELORA_BACKEND_TAG` to it in the hub's `.env` → `docker compose pull velora-backend &&
  docker compose up -d velora-backend` → `curl http://10.0.0.53:8010/health`. Jobs live in memory,
  so deploy when nothing is running.
- **Frontend:** redeploy on Vercel. If the change adds a new top-level backend path, add it to the
  Worker's `VERCEL_PROD` prefixes and `wrangler deploy` first.
- **Worker token rotation:** set `TOKEN_VERCEL_PROD_NEXT`, update `WORKER_TOKEN` in Vercel and
  redeploy, then move the value into `TOKEN_VERCEL_PROD` and delete `_NEXT`. Both work in between.
- **Backend port change:** only the VPC Service changes (`wrangler vpc service update`, then check
  with `wrangler vpc service get`); the Worker needs no redeploy.

## 10. Status

| Item | Status |
|---|---|
| Velora repo baseline, APKs removed, ignore/attribute rules | Done |
| `velora-vm-hub` repo (compose, OSRM prep script) | Done, pushed to `manan-vala/velora-vm-hub` |
| Backend image workflow (arm64, `sha-` tags, public GHCR package) | Live |
| Backend refactor: no Celery/Redis, in-process pyvroom, bounded solver runtime, all DB tables, hardened API | Live |
| Backend test suite (`backend/tests`, run in the image) | Done |
| OSRM graph (Bangalore + ~100 km) on the VM | Live |
| Backend container on the VM, port 8010, tag pinned | Live |
| Per-caller Worker, `TOKEN_VERCEL_PROD` set, old `AUTH_TOKEN` deleted | Live |
| Worker prefixes `["/process-routes", "/auth", "/admin"]` | Live |
| VPC Service switched 8001 → 8010 | Live |
| Frontend on Vercel (API routes, session cookie) | Live |
| Login, per-user jobs and logs, superadmin-managed accounts, `/admin` dashboard | Live, verified in production |
| Android app build tested on a device (confirm origin `https://localhost`) | Deferred; web first |
| Caddy on the VM routing path prefixes to several backends | Only needed once a second backend exists |

## 11. Known gaps

- **One superadmin, defined by the environment.** There is no way to promote a second admin from
  the dashboard, and the superadmin's password lives in the hub's `.env`. Losing it means editing
  that file and restarting.
- **Tokens last 24 hours and can't be cancelled individually.** Revoking a user does cut them off
  immediately (every request checks the account), but "log out everywhere" for a user who keeps
  their access would need a password regeneration.
- **Jobs live in memory.** Restarting or redeploying the backend drops queued and running jobs;
  polling them returns 404, which the frontend shows as a failed job. Deploy when no job is running.
- **Single VM means single point of failure.** Back up the Postgres volume and `osrm/data/`.
  Regenerating the OSRM graph takes time.
