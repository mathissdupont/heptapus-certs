# WP23 — Live Engagement (Q&A & Live Polls)

**Phase:** 5 — Competitive expansion · **Status:** ✅ Phase A shipped · **Related ADRs:** [0017](../adr/0017-per-event-feature-toggles-two-layer-gate.md), [0012](../adr/0012-mcp-streamable-http-mount.md)

## Delivery status (2026-07-09)

Phase A shipped: member-authenticated live Q&A (ask/upvote/moderate) + live polls
(vote/live results) with a presenter moderation console.

- Two-layer gate: `Event.live_engagement_enabled` + `is_live_engagement_enabled` +
  `conference` preset + `plan_policy` FeaturePolicy `live_engagement` (pro+) + Settings toggle.
- Models: `LiveQuestion` + `LiveQuestionVote` (upvote-once) + `LivePoll` (options JSONB) +
  `LivePollVote` (one per member). Migration `109_live_engagement` (+ `local_bootstrap`).
- `live_engagement_api.py` (own router): attendee ask/upvote/list + poll list/vote (all
  rate-limited via the slowapi `limiter`); moderator list-incl-hidden / moderate
  (answered|hidden|visible) / poll create-status-delete.
- **Real-time = short-polling (~4-5s), not SSE** — a deliberate call for the shared
  single-server deploy (persistent SSE per attendee is riskier). Satisfies the "near
  real time" acceptance criterion; the client refetches on an interval while the tab is
  visible. An SSE moderator stream (reusing the checkin_ops queue pattern) is a Phase B option.
- Frontend (catalog-first `t()`, `live_*` keys): member-gated attendee panel
  `app/events/[id]/live` (polls with live result bars + Q&A with upvote) + moderator console
  `app/admin/events/[id]/live` (poll builder + open/close/delete + question moderate) +
  EventAdminNav "Live" tab + public "Join live Q&A" CTA.

**Deferred (Phase B):** SSE push, word clouds / advanced visualizations, per-session
scoping UI (session_id is stored but the Phase A UI is event-wide).

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
