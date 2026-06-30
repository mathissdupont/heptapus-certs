# WP17 — Event-Type Presets & Feature-Toggle Framework

**Phase:** 5 — Competitive expansion · **Status:** 📐 Planned · **Related ADRs:** [0017](../adr/0017-per-event-feature-toggles-two-layer-gate.md), [0018](../adr/0018-event-type-feature-presets.md), [0007](../adr/0007-plan-feature-policy-single-source.md)

## Objective
Make every future event capability addable through one uniform convention, and keep the
organizer experience simple by driving sensible default toggles from `event_type`. This
WP is the foundation all other Phase-5 WPs build on.

## Scope
**In:** formalize the two-layer gate (plan + event) as the standard; add
`PRESET_BY_EVENT_TYPE` and apply it on create/type-change; surface a clean Event Settings
toggle UI grouped into "Core" and "Advanced"; helper + policy scaffolding for new flags.
**Out:** the individual features themselves (WP18–WP27).

## Key deliverables
- `PRESET_BY_EVENT_TYPE` map + application logic on event create and type change.
- Documented "add a feature" checklist enforced in code review (column + helper + policy + UI toggle).
- Event Settings UI: grouped toggles, plan-gated states ("upgrade" when plan disallows).
- Backfill/migration leaving existing events unchanged (advanced features default off).

## Key components
- `heptacert/backend/src/event_features.py` — `PRESET_BY_EVENT_TYPE`, preset application.
- `heptacert/backend/src/plan_policy.py` — `FeaturePolicy` entries for new features.
- `heptacert/backend/src/models.py` — new `Event.<x>_enabled` columns (per feature WP).
- `heptacert/frontend/src/app/admin/events/` — settings toggle UI.
- Migrations: one per new feature flag (added by the consuming WP).

## Acceptance criteria
- Selecting an event type applies the documented default set; toggles remain overridable.
- A capability renders publicly only when plan AND event toggle both pass.
- Existing events keep their current behavior after migration.
- Gating logic exists only in `event_features.py` / `plan_policy.py` (no inline checks).

## Dependencies & related ADRs
Upstream: WP03, WP11. Downstream: WP18–WP27. See ADR-0017, ADR-0018.
