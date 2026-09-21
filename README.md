# Velora

Corporate fleet routing: assigns employees to vehicles and plans pickup routes to a shared office,
respecting time windows, vehicle capacity, priority-based lateness limits and rider preferences.
Results are shown on an interactive map with route simulation.

## Layout

| Path | What it is |
|---|---|
| `backend/` | FastAPI API and the VRP solvers (LNS, ALNS, VROOM) scored by a shared feasibility checker. See `backend/README.md` and `backend/algo/algo_README.md`. |
| `frontend/` | Next.js web app, also packaged for Android with Capacitor. See `frontend/README.md`. |
| `docs/` | Architecture review, findings and prioritized recommendations. |

## Deployment

- **Frontend** → Vercel, with the project root directory set to `frontend/`.
- **Backend** → built into a `linux/arm64` image by `.github/workflows/backend-image.yml` and published to
  `ghcr.io/manan-vala/velora-backend`. The image runs on the Oracle A1 VM together with OSRM and Postgres;
  that VM's container setup lives in the separate `velora-vm-hub` repo.
