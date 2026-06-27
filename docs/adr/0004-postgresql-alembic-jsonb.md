# ADR-0004 — PostgreSQL + Alembic, JSONB for Flexible Config

**Status:** Accepted · **Date:** 2026-06-27

## Context
The domain has both highly relational data (events, attendees, certificates, deals)
and highly variable, fast-moving configuration (event feature flags, integration
settings, pricing, registration form definitions).

## Decision
Use **PostgreSQL** as the system of record with **Alembic** migrations (a strict,
ordered, reviewable history — 100+ migrations). Model stable entities relationally;
store variable configuration as **JSONB** columns (e.g. organization settings,
integration configs, event config, pricing override).

## Consequences
- Relational integrity for core entities; flexible evolution for config without a
  migration per tweak.
- JSONB enables features like per-org integration catalogs and pricing overrides.
- Migrations are explicit and auditable; every schema change is traceable.
- Trade-off: JSONB fields need application-level validation and careful indexing;
  ad-hoc JSONB querying is less ergonomic than columns.
