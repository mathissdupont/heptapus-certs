# WP21 — Speaker Portal & Call-for-Papers

**Phase:** 5 — Competitive expansion · **Status:** ✅ Shipped · **Related ADRs:** [0017](../adr/0017-per-event-feature-toggles-two-layer-gate.md), [0006](../adr/0006-rbac-and-dual-identity.md)

## Delivery status (2026-07-08)

Shipped end-to-end (member-authed submission + multi-reviewer rubric review). No hard
blocker: speakers reuse the existing **PublicMember** portal identity (`get_current_public_member`),
so no new auth was needed.

- Two-layer gate: `Event.cfp_enabled` + `event_features.is_cfp_enabled` + `conference` preset +
  `plan_policy` FeaturePolicy `cfp` (growth+) + Settings toggle.
- Models `CfpSubmission` + `CfpReview` (migration `107_cfp_submissions`, + `local_bootstrap`).
  Rubric criteria + window + per-member cap live on `Event.config.cfp` (JSONB); per-reviewer
  per-criterion scores on `CfpReview.scores` (JSONB); `overall_score` normalised to 0-100.
- `cfp_api.py` (own router, keeps main.py lean): speaker endpoints (public info, submit,
  my-submissions, edit-while-submitted, withdraw) + organizer endpoints (config get/set,
  reviewers list = owner + org team, queue, assign, rubric review upsert, accept/reject).
  **Accepted → WP20 `EventSession`** materialised with track/speaker/abstract + generated
  `checkin_token`, linked via `CfpSubmission.session_id`.
- Frontend (catalog-first `t()`): speaker portal `app/events/[id]/cfp` (member-gated) +
  admin console `app/admin/events/[id]/cfp` (rubric settings editor, review queue, per-criterion
  scoring, reviewer assignment, decide + one-click add-to-agenda) + EventAdminNav "Proposals" tab +
  public event "Become a speaker" CTA. Also fixed the session attendance-count display bug
  (`attendaonce_count` → `attendance_count` alias).

**Deferred (Phase B, future):** peer-review anonymisation, plagiarism checks, submission
attachments/files, email notifications on decision.

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
