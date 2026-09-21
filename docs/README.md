# Architecture Review — Velora Route Optimization

Review of the backend (`backend/`), frontend (`frontend/`), the READMEs, and `Vellora_Report.pdf`.
Snapshot reviewed: commit `e695d9b` (branch `main`).

| Document | Contents |
|---|---|
| [architecture.md](architecture.md) | System overview, request lifecycle, component map, strengths |
| [backend-findings.md](backend-findings.md) | Correctness, performance and security findings in the API, worker and solvers |
| [frontend-findings.md](frontend-findings.md) | Findings in the Next.js / Capacitor client and the frontend–backend contract |
| [doc-discrepancies.md](doc-discrepancies.md) | Places where the READMEs / report disagree with the code |
| [recommendations.md](recommendations.md) | Prioritized fix list |

Severity levels used: **High** (wrong results, silent data loss, unbounded runtime), **Medium** (fragility, security exposure, inconsistency), **Low** (hygiene, maintainability).

File references use `path:line` relative to the repo root.
