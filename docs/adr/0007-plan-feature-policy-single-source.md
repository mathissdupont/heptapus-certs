# ADR-0007 — Plan/Feature Policy as a Single Source of Truth

**Status:** Accepted · **Date:** 2026-06-27

## Context
Feature availability, pricing, HeptaCoin quotas, and marketing copy were at risk of
drifting because they lived in multiple places (backend pricing literal, a separate
feature-policy map, and frontend metadata). Drift caused inconsistent gating and
mislabeled pricing pages.

## Decision
Make `plan_policy.py` (`PLAN_CATALOG` + `FEATURE_POLICIES`) the **single source of
truth**. Commercial data (price, quota, marketing bullets) and feature inclusion are
defined there once; `DEFAULT_PRICING` and HeptaCoin quotas are **derived** from it.
All gates flow through `plan_allows` / `subscription_is_active_plan`; the frontend
mirrors the same policy via `featureMetadata.ts`.

## Consequences
- Changing a plan in one place updates pricing UI, quotas, and every gate.
- Feature→plan mapping is auditable and testable (unit tests over the policy).
- No raw `plan_id in (...)` checks scattered across endpoints.
- Trade-off: the policy module becomes a critical file; changes require care and tests.
