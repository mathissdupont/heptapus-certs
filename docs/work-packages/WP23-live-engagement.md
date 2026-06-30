# WP23 — Live Engagement (Q&A & Live Polls)

**Phase:** 5 — Competitive expansion · **Status:** 📐 Planned · **Related ADRs:** [0017](../adr/0017-per-event-feature-toggles-two-layer-gate.md), [0012](../adr/0012-mcp-streamable-http-mount.md)

## Objective
Add real-time session engagement — live audience Q&A and live polls — complementing the
existing async quiz/survey/raffle tooling. Slido/Whova-style in-session interaction.

## Scope
**In:** live Q&A (submit, upvote, moderate, mark answered) per session; live polls with
real-time result display; presenter moderation view; reuse of existing SSE/live-ops infra.
**Out:** word clouds and advanced visualizations (future); async surveys (already exist).

## Key deliverables
- `LiveQuestion`, `LivePoll` + responses (session-scoped, real-time via SSE).
- `Event.live_engagement_enabled` flag + helper + `FeaturePolicy` (pro+).
- Attendee live view (ask/upvote/vote) + presenter/moderator console.
- Rate-limiting on submissions (reuse slowapi limiter on the new endpoints).

## Key components
- `heptacert/backend/src/presentation_api.py` / new `live_engagement_api.py` — endpoints + SSE.
- `heptacert/backend/src/models.py` — live question/poll models.
- `heptacert/backend/src/event_features.py`, `plan_policy.py` — gating.
- `heptacert/frontend/` — attendee live panel + presenter console.
- Migration: live engagement tables + `events.live_engagement_enabled`.

## Acceptance criteria
- Questions/votes appear in near real time; moderators can hide/answer; submissions are rate-limited.
- Poll results update live and are tenant-scoped to the session/event.
- Live features are hidden when the event toggle or plan gate is off.

## Dependencies & related ADRs
Upstream: WP04, WP17, WP20. See ADR-0017.
