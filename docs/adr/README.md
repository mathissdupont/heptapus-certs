# Architecture Decision Records (ADRs)

This log records the significant technical decisions behind HeptaCert: the context
that forced a choice, the decision taken, and its consequences. ADRs are immutable —
when a decision changes, a new ADR supersedes the old one rather than editing history.

## Format

Each ADR uses:

- **Status** — Accepted / Superseded / Deprecated.
- **Context** — the forces and constraints at play.
- **Decision** — what was chosen.
- **Consequences** — the trade-offs accepted, good and bad.

## Index

| # | Decision | Status |
|---|----------|--------|
| [0001](0001-monorepo-and-workspace-separation.md) | Monorepo with workspace separation | Accepted |
| [0002](0002-fastapi-async-sqlalchemy-backend.md) | FastAPI + async SQLAlchemy backend | Accepted |
| [0003](0003-nextjs-frontend.md) | Next.js (App + Pages) frontend | Accepted |
| [0004](0004-postgresql-alembic-jsonb.md) | PostgreSQL + Alembic, JSONB for flexible config | Accepted |
| [0005](0005-multi-tenancy-organization-scoping.md) | Multi-tenancy via organization scoping | Accepted |
| [0006](0006-rbac-and-dual-identity.md) | RBAC and dual identity (admins vs public members) | Accepted |
| [0007](0007-plan-feature-policy-single-source.md) | Plan/feature policy as single source of truth | Accepted |
| [0008](0008-heptacoin-usage-credits.md) | HeptaCoin usage-credit model | Accepted |
| [0009](0009-payment-provider-abstraction.md) | Payment provider abstraction | Accepted |
| [0010](0010-certificate-generation-and-verification.md) | Certificate generation, watermark & public verification | Accepted |
| [0011](0011-integration-storage-and-secrets.md) | Integration storage in JSONB with encrypted secrets | Accepted |
| [0012](0012-mcp-streamable-http-mount.md) | MCP server mounted as a Streamable HTTP sub-app | Accepted |
| [0013](0013-background-jobs-and-workers.md) | Background jobs via scheduler loops + Redis workers | Accepted |
| [0014](0014-design-system-tailwind-tokens.md) | Token-based design system | Accepted |
| [0015](0015-seo-geo-strategy.md) | SEO + GEO (AI discoverability) strategy | Accepted |
| [0016](0016-modular-monolith-api.md) | Modular monolith API (domain-split routers) | Accepted |
| [0017](0017-per-event-feature-toggles-two-layer-gate.md) | Per-event feature toggles as a two-layer gate | Accepted |
| [0018](0018-event-type-feature-presets.md) | Event-type feature presets | Accepted |
| [0019](0019-internationalization-architecture.md) | Internationalization (i18n) architecture | Accepted |
| [0020](0020-networking-and-meeting-scheduling.md) | Networking & meeting scheduling on the connection graph | Accepted |

---

_Last updated: 2026-06-30 · Documentation version 1.1_
