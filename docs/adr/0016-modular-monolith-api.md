# ADR-0016 — Modular Monolith API (Domain-Split Routers)

**Status:** Accepted · **Date:** 2026-06-27

## Context
The API covers many domains (events, certificates, CRM, LMS, billing, integrations,
analytics, …) totaling ~690 routes. A single giant module is unmaintainable; full
microservices would add operational overhead disproportionate to the team and stage.

## Decision
Build a **modular monolith**: one FastAPI application composed of **domain-split
router modules** (`event_crm_api.py`, `quiz_api.py`, `marketplace_api.py`,
`notification_integrations_api.py`, `mcp_server.py`, …) included into `main.py`.
Shared concerns (auth, plan gating, audit, DB session) are cross-cutting helpers.
Domain models live in focused modules (`*_models.py`) under one declarative `Base`.

## Consequences
- Clear domain boundaries and ownership without distributed-systems overhead.
- One deployable unit; in-process calls between domains stay simple and fast.
- New domains are added as a router module + models + migration.
- Trade-off: shared process and database mean discipline is needed to avoid coupling;
  if a domain later needs independent scaling, its router can be extracted.
