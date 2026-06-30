# WP20 — Agenda, Sessions & Personal Schedule

**Phase:** 5 — Competitive expansion · **Status:** 📐 Planned · **Related ADRs:** [0017](../adr/0017-per-event-feature-toggles-two-layer-gate.md)

## Objective
Turn the existing session primitive into a full conference agenda: tracks/rooms,
session capacity with reservation, and a per-attendee personal schedule
("my schedule") — matching Whova/Sched/Cvent.

## Scope
**In:** session tracks and rooms; session capacity + reservation/waitlist; attendee
bookmarking and personal agenda; public agenda view (filter by track/day); ICS export.
**Out:** speaker portal/CFP (WP21); live Q&A/polls (WP23); seating maps (WP27).

## Key deliverables
- Extend session model with track, room, capacity; `SessionReservation` (per-attendee).
- `Event.agenda_enabled` flag + helper + `FeaturePolicy` (all plans).
- Personal schedule: bookmark/reserve, conflict detection, ICS/calendar export.
- Public agenda UI with track/day filtering.

## Key components
- `heptacert/backend/src/models.py` — session track/room/capacity, `SessionReservation`.
- `heptacert/backend/src/main.py` — session reservation endpoints (atomic capacity under lock).
- `heptacert/backend/src/event_features.py`, `plan_policy.py` — gating.
- `heptacert/frontend/` — agenda builder (admin) + personal schedule (public).
- Migration: session columns + `session_reservations` + `events.agenda_enabled`.

## Acceptance criteria
- Sessions can be organized by track/room and capped; reservations never exceed capacity.
- An attendee can build, view, and export a personal schedule; conflicts are flagged.
- Agenda surfaces only when the event toggle is on.

## Dependencies & related ADRs
Upstream: WP03, WP04, WP17. Downstream: WP21, WP23. See ADR-0017.
