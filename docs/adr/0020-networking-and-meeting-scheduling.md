# ADR-0020 — Networking & Meeting Scheduling on the Connection Graph

**Status:** Accepted · **Date:** 2026-06-30 · **Related:** [0006](0006-rbac-and-dual-identity.md), [0017](0017-per-event-feature-toggles-two-layer-gate.md)

## Context
Structured attendee networking (1:1 meeting requests, scheduled slots, AI/interest-based
matchmaking) is a core differentiator of Brella, Swapcard, Grip and Bizzabo and a
confirmed gap in HeptaCert. We already have `connections_api.py`, a public-member social
graph (follow / followers / block / privacy) built on the dual-identity model (ADR-0006).
The question is whether to build networking as a new subsystem or extend the existing graph.

## Decision
Build meeting scheduling **on top of the existing connection graph**, not as a parallel
identity system.

- The follow/connection edge in `connections_api.py` remains the relationship primitive;
  meetings are a new layer referencing the same `PublicMember` identities and respecting
  the existing privacy/block rules (a blocked member cannot request a meeting).
- A meeting request is modeled as `MeetingRequest` (requester, target, event, proposed
  slot[s], status: pending/accepted/declined/cancelled) plus per-event availability slots.
  Scheduling is event-scoped and gated by ADR-0017 (`networking_meetings_enabled` + plan).
- **Matchmaking is staged:** v1 ships manual + tag/interest-based discovery (reuse member
  profile attributes); algorithmic/AI matching is deferred to a later iteration so we ship
  value without a recommender system up front.

## Consequences
- No second social graph to keep consistent; block/privacy enforcement is inherited, not
  reimplemented (avoids a class of authorization bugs).
- Meetings degrade cleanly when the feature is off (event toggle) — the connection graph
  still works for community use.
- Trade-off: coupling meetings to the connection model means networking is only available
  to public members (not raw email-only attendees); acceptable, and consistent with the
  dual-identity decision. AI matchmaking arrives later, by design.
