# WP27 — Seating & Floor Plans

**Phase:** 5 — Competitive expansion · **Status:** 📐 Planned · **Related ADRs:** [0017](../adr/0017-per-event-feature-toggles-two-layer-gate.md)

## Objective
Add reserved seating and floor-plan management for events that need assigned seats
(galas, concerts, theatre-style sessions) — matching Cvent/Eventbrite reserved seating.
Lowest priority in Phase 5; build only if demand is confirmed.

## Scope
**In:** floor-plan layout (zones/rows/seats); seat inventory tied to ticket types;
seat selection/assignment at registration; capacity sync with seating.
**Out:** 3D venue rendering; dynamic pricing per seat (future).

## Key deliverables
- Floor-plan + seat model (event/venue-scoped); seat ↔ ticket-type linkage.
- `Event.seating_enabled` flag + helper + `FeaturePolicy` (growth+).
- Seat selection UI at registration; assignment view for organizers.
- Atomic seat reservation (no double-booking, row-lock pattern).

## Key components
- `heptacert/backend/src/models.py` — floor plan, seat, reservation models.
- `heptacert/backend/src/main.py` / `event_extras_api.py` — seat selection endpoints.
- `heptacert/backend/src/event_features.py`, `plan_policy.py` — gating.
- `heptacert/frontend/` — seat-map designer + selection UI.
- Migration: seating tables + `events.seating_enabled`.

## Acceptance criteria
- Seats can be laid out, linked to ticket types, and selected at registration.
- Concurrent selection never double-books a seat.
- Seating is hidden when the event toggle or plan gate is off.

## Dependencies & related ADRs
Upstream: WP03, WP17. Optional — gated on confirmed demand. See ADR-0017.
