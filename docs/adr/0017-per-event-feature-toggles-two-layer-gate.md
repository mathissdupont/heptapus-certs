# ADR-0017 — Per-Event Feature Toggles as a Two-Layer Gate

**Status:** Accepted · **Date:** 2026-06-30 · **Related:** [0007](0007-plan-feature-policy-single-source.md)

## Context
The platform is large and still growing. New event capabilities (promo codes,
agenda, speakers, networking, exhibitors, …) risk two failure modes: (1) every
organizer is forced to see and reason about every module even when irrelevant to
their event, and (2) gating logic scatters as ad-hoc `if event.x and plan in (...)`
checks across endpoints. ADR-0007 already established `plan_policy.py` as the single
source for *commercial* (plan-level) gating, and migration 038 introduced per-event
boolean flags (`certificate_enabled`, `checkin_enabled`, …) resolved through
`event_features.py`. We need to make this the **mandatory, uniform convention** for
all future event features so the system stays clean as it scales.

## Decision
Every event-scoped feature is added through **one fixed convention** and gated by
**two independent layers**:

- **Plan layer (commercial, org-wide):** one `FeaturePolicy` entry in `plan_policy.py`
  declaring which subscription plans include it (+ TR/EN marketing label).
- **Event layer (operational, per-event):** one `Event.<x>_enabled` boolean column
  (with Alembic migration), one `FEATURE_DEFAULTS` entry, and one `is_<x>_enabled(event)`
  helper in `event_features.py`. New *advanced* features default to **off**.

A capability is exposed to attendees/public surfaces **only when both layers pass**:
`plan_allows(org, feature)` AND `is_<x>_enabled(event)`. No raw plan/flag checks are
written inline; all gating flows through these two modules.

## Consequences
- Adding a feature is a checklist, not an architecture exercise — the blast radius is
  one column + one helper + one policy entry + one UI toggle.
- Gating is auditable and unit-testable in two known files, not scattered.
- Old events are never silently changed: advanced features default off.
- Trade-off: `event_features.py` and `plan_policy.py` become critical files; every new
  feature must touch them, and migrations accumulate one column per feature (acceptable —
  booleans are cheap and explicit beats a free-form JSON blob for queryable gating).
