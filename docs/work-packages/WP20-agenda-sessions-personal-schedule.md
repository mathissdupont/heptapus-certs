# WP20 — Agenda, Sessions & Personal Schedule

**Phase:** 5 — Competitive expansion · **Status:** 🔄 Phase A shipped · Phase B deferred · **Related ADRs:** [0017](../adr/0017-per-event-feature-toggles-two-layer-gate.md)

## Delivery status (2026-07-08)

Split into two phases because per-attendee reservation/personal-schedule needs an
attendee-identity/portal-auth design (public attendees are keyed only by email +
email-verification; there is no unguessable per-attendee handle), which the security
posture ("kanıtlanabilir güvenli") does not allow to be rushed.

**Phase A — SHIPPED (structured agenda + public view + calendar export).** No payment
or attendee-auth dependency:
- `Event.agenda_enabled` two-layer gate (`event_features.is_agenda_enabled`, FEATURE_DEFAULTS,
  `PRESET_BY_EVENT_TYPE` opts in `conference` + `online_event`, `plan_policy` FeaturePolicy = all plans).
- `EventSession` extended: `session_end`, `track`, `speaker_name`, `description` (nullable);
  `capacity` column already existed and is now surfaced. Migration `106_agenda_sessions`
  (+ `local_bootstrap.py`).
- Session CRUD gate relaxed from check-in-only to `_ensure_sessions_feature_enabled`
  (check-in **or** agenda), so agenda-only/online events can build a schedule.
- Public agenda: `_build_public_event_detail` carries the new fields + `agenda_enabled`;
  `agenda_api.py` exposes `GET /api/public/events/{id}/agenda.ics` (RFC 5545, no auth,
  respects visibility + host scoping + the agenda gate). Kept in its own router to keep
  main.py lean.
- Frontend (catalog-first `t()`, keys in `locales/tr.ts`+`en.ts`): admin session form gains
  end-time/track/speaker/capacity/description; public detail becomes a track-filterable
  agenda with an "Add to Calendar" (.ics) button; Settings gains an agenda toggle.

**Phase B — DEFERRED (reservation + personal schedule + waitlist).** Needs: a per-attendee
capability handle (not email), `SessionReservation` model, atomic capacity via the
per-option `_reserve_option_capacity` CAS pattern (services.py), conflict detection, and a
per-attendee ICS. The `capacity` column is already in place to build on.

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
