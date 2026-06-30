# WP22 — Networking & Meeting Scheduling

**Phase:** 5 — Competitive expansion · **Status:** 📐 Planned · **Related ADRs:** [0020](../adr/0020-networking-and-meeting-scheduling.md), [0017](../adr/0017-per-event-feature-toggles-two-layer-gate.md)

## Objective
Add structured attendee networking — 1:1 meeting requests and scheduled slots, with
interest/tag-based discovery — built on the existing connection graph. Closes the gap
versus Brella/Swapcard/Grip/Bizzabo.

## Scope
**In:** per-attendee availability slots; meeting request → accept/decline/cancel; agenda
of confirmed meetings; tag/interest-based attendee discovery; reuse of existing
follow/block/privacy rules.
**Out:** algorithmic/AI matchmaking (deferred — see ADR-0020); in-app video calls (links only).

## Key deliverables
- `MeetingRequest` model + per-event availability slots (referencing `PublicMember`).
- `Event.networking_meetings_enabled` flag + helper + `FeaturePolicy` (growth+).
- Discovery by profile tags/interests; respects block/privacy from `connections_api`.
- Meeting management UI; confirmed meetings surface in personal schedule (WP20).

## Key components
- `heptacert/backend/src/connections_api.py` / new `meetings_api.py` — meeting endpoints.
- `heptacert/backend/src/models.py` — `MeetingRequest`, availability slots.
- `heptacert/backend/src/event_features.py`, `plan_policy.py` — gating.
- `heptacert/frontend/` — attendee directory, request flow, meeting agenda.
- Migration: meeting tables + `events.networking_meetings_enabled`.

## Acceptance criteria
- A meeting can be requested, accepted/declined, and appears on both parties' schedules.
- Blocked/private members are excluded; no meeting bypasses connection-graph rules.
- Networking is hidden when the event toggle or plan gate is off.

## Dependencies & related ADRs
Upstream: WP02, WP10, WP17, WP20. See ADR-0020.
