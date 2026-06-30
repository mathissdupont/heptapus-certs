# WP24 — Gamification Engine

**Phase:** 5 — Competitive expansion · **Status:** 📐 Planned · **Related ADRs:** [0017](../adr/0017-per-event-feature-toggles-two-layer-gate.md)

## Objective
Fill the existing `gamification_enabled` flag — currently a shell with no implementation —
with a real points/leaderboard/achievement engine to drive attendee engagement
(Whova/Bizzabo-style). No new flag or migration for the toggle itself is required.

## Scope
**In:** point rules for attendee actions (check-in, session attendance, survey completion,
networking); leaderboard (per event, privacy-aware); achievement badges tied to rules;
reuse of existing badge infrastructure where possible.
**Out:** prizes/fulfillment (use raffles, WP-existing); cross-event global ranking (future).

## Key deliverables
- `PointRule`, `PointAward`, leaderboard aggregation (event-scoped).
- Wire the existing `Event.gamification_enabled` flag end to end (it is currently inert).
- `FeaturePolicy` for gamification (growth+); helper already exists (`is_gamification_enabled`).
- Leaderboard UI + achievement display; integration with existing badge engine.

## Key components
- `heptacert/backend/src/main.py` / new `gamification_api.py` — point rules + awards + leaderboard.
- `heptacert/backend/src/models.py` — point rule/award models.
- `heptacert/backend/src/plan_policy.py` — gamification `FeaturePolicy`.
- `heptacert/frontend/` — leaderboard + achievements.
- Migration: gamification tables (flag already exists from migration 038).

## Acceptance criteria
- Configured rules award points correctly and idempotently (no double-award on retry).
- Leaderboard respects member privacy settings.
- Gamification surfaces only when the (existing) event toggle and plan gate pass.

## Dependencies & related ADRs
Upstream: WP04, WP05, WP17. See ADR-0017.
