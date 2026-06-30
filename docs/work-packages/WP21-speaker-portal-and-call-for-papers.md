# WP21 — Speaker Portal & Call-for-Papers

**Phase:** 5 — Competitive expansion · **Status:** 📐 Planned · **Related ADRs:** [0017](../adr/0017-per-event-feature-toggles-two-layer-gate.md), [0006](../adr/0006-rbac-and-dual-identity.md)

## Objective
Provide speaker management and an abstract/Call-for-Papers (CFP) submission + review
workflow — high value for conferences and academic/CPD events, and tightly aligned with
HeptaCert's certification identity. Differentiator versus most mid-market competitors.

## Scope
**In:** CFP form (open/close window); abstract submission by speakers; reviewer
assignment + scoring/rubric; accept/reject decisions; accepted talks linked to agenda
sessions (WP20); speaker profiles/bios.
**Out:** payment for submissions; plagiarism detection; full peer-review anonymization (future).

## Key deliverables
- `Speaker`, `Submission`, `Review` models (event-scoped); submission status workflow.
- `Event.cfp_enabled` flag + helper + `FeaturePolicy` (growth+).
- Speaker-facing submission portal; reviewer console with scoring.
- Accepted submission → agenda session linkage (WP20).

## Key components
- `heptacert/backend/src/presentation_api.py` / new `cfp_api.py` — submission + review endpoints.
- `heptacert/backend/src/models.py` — speaker/submission/review models.
- `heptacert/backend/src/event_features.py`, `plan_policy.py` — gating.
- `heptacert/frontend/` — speaker portal + reviewer console.
- Migration: cfp tables + `events.cfp_enabled`.

## Acceptance criteria
- Submissions accepted only within the CFP window; reviewers see only assigned items (tenant-scoped).
- Accepted talks appear as agenda sessions.
- Portal is hidden when the event toggle or plan gate is off.

## Dependencies & related ADRs
Upstream: WP03, WP17, WP20. See ADR-0017, ADR-0006.
