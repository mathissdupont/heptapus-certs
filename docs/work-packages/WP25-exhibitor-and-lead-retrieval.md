# WP25 — Exhibitor & Booth Management + Lead Retrieval

**Phase:** 5 — Competitive expansion · **Status:** 📐 Planned · **Related ADRs:** [0017](../adr/0017-per-event-feature-toggles-two-layer-gate.md), [0006](../adr/0006-rbac-and-dual-identity.md)

## Objective
Add exhibitor/booth management with lead retrieval (badge scanning) so sponsors and
exhibitors can capture and qualify leads on-site — a core Cvent/Swapcard/Bizzabo
revenue feature. Builds on existing sponsor and lead-form primitives.

## Scope
**In:** exhibitor profiles/booths (extends sponsors); exhibitor staff access (scoped
role); lead capture by scanning attendee QR/badge; lead notes/qualification; lead export
per exhibitor.
**Out:** physical scanner hardware integration beyond camera/QR; exhibitor billing (future).

## Key deliverables
- `Exhibitor`/booth model (extending sponsor data) + exhibitor staff role (scoped, ADR-0006).
- `Event.exhibitors_enabled` flag + helper + `FeaturePolicy` (growth+).
- Lead retrieval: scan attendee QR → capture lead → notes/qualification → export.
- Exhibitor portal scoped strictly to their own leads (tenant + ownership isolation).

## Key components
- `heptacert/backend/src/main.py` / new `exhibitors_api.py` — booths, leads, scoped access.
- `heptacert/backend/src/models.py` — exhibitor/booth/lead models.
- `heptacert/backend/src/event_features.py`, `plan_policy.py` — gating.
- `heptacert/frontend/` — exhibitor portal + lead scan UI.
- Migration: exhibitor/lead tables + `events.exhibitors_enabled`.

## Acceptance criteria
- An exhibitor sees and exports only their own captured leads (no cross-exhibitor leakage).
- Lead capture works from an attendee QR/badge and records qualification notes.
- Exhibitor surfaces are hidden when the event toggle or plan gate is off.

## Dependencies & related ADRs
Upstream: WP02, WP03, WP04, WP07, WP17. See ADR-0017, ADR-0006.
