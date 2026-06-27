# ADR-0001 — Monorepo with Workspace Separation

**Status:** Accepted · **Date:** 2026-06-27

## Context
HeptaCert is one product with several deployable artifacts: a backend API, a
web frontend, a CLI, load tests, and an in-product docs site. These share types,
URLs, and domain concepts and evolve together.

## Decision
Keep everything in a single Git monorepo with clearly separated workspaces under
`heptacert/`: `backend`, `frontend`, `cli`, `loadtest`, and `docs`. Cross-cutting
engineering documentation lives at the repo root in `docs/` and `.codesight/`.

## Consequences
- One source of truth; atomic changes across backend + frontend in a single commit.
- Easy to keep API contracts and frontend clients in sync.
- Shared tooling and a single CI surface.
- Trade-off: the repo is large; tooling must scope to the relevant workspace, and
  the backend `main.py` is sizeable (mitigated by domain-split routers — ADR-0016).
