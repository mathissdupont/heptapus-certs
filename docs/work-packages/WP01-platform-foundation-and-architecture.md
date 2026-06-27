# WP01 — Platform Foundation & Architecture

**Phase:** 0 — Foundations · **Status:** ✅ Delivered · **Related ADRs:** [0001](../adr/0001-monorepo-and-workspace-separation.md), [0002](../adr/0002-fastapi-async-sqlalchemy-backend.md), [0003](../adr/0003-nextjs-frontend.md), [0004](../adr/0004-postgresql-alembic-jsonb.md), [0016](../adr/0016-modular-monolith-api.md)

## Objective
Establish the technical foundation on which every other work package is built: a
single monorepo, a FastAPI application skeleton, an async database layer with
migrations, a Next.js frontend shell, containerized local and production runtimes,
and the conventions that keep ~690 routes and 150+ models maintainable.

## Scope
**In:** repository structure; backend app bootstrap; database engine & session
management; migration framework; configuration/secrets; shared utilities; frontend
shell; containerization; CI; the AI context map.
**Out:** domain features (covered by WP03+).

## Key deliverables
- Monorepo with four workspaces: `backend`, `frontend`, `cli`, `loadtest`, plus an
  in-product `docs` site.
- FastAPI application with domain-split routers mounted into one app.
- Async SQLAlchemy engine + session dependency; declarative `Base`.
- Alembic migration pipeline (baseline → 100+ incremental migrations).
- Typed settings loaded from environment with validation.
- Docker Compose for local (`docker-compose.local.yml`) and production
  (`docker-compose.yml`) including API workers, background workers, and Redis.
- `.codesight/` AI context map (routes, schema, components, wiki) regenerated as the
  codebase evolves.

## Key components
- `heptacert/backend/src/main.py` — application assembly, router inclusion, lifecycle.
- `heptacert/backend/src/db.py` — async engine, `get_db` dependency, `Base`.
- `heptacert/backend/src/config.py` — `Settings` (env-driven, validated).
- `heptacert/backend/src/services.py`, `utils.py`, `enums.py` — cross-cutting helpers.
- `heptacert/backend/alembic/` — `env.py` + `versions/001_baseline.py` … onward.
- `heptacert/frontend/` — Next.js app shell, `globals.css`, providers.
- `docker-compose.yml`, `heptacert/LOCAL_DOCKER.md`.

## Acceptance criteria
- `docker compose up` brings the full stack online locally.
- Migrations apply cleanly from an empty database to head.
- New domain routers can be added without touching unrelated modules.
- Settings fail fast when required secrets are missing.

## Dependencies & related ADRs
Upstream: none (foundational). Downstream: all WPs. See ADR-0001/0002/0003/0004/0016.
