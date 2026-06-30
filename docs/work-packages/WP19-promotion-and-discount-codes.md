# WP19 — Promotion & Discount Codes

**Phase:** 5 — Competitive expansion · **Status:** 📐 Planned · **Related ADRs:** [0017](../adr/0017-per-event-feature-toggles-two-layer-gate.md), [0009](../adr/0009-payment-provider-abstraction.md)

## Objective
Let organizers issue promotional/discount codes against ticket types to drive
conversion — a core Eventbrite/Cvent capability currently absent.

## Scope
**In:** code creation (percentage / fixed amount); validity window; usage limits (total
and per-attendee); restriction to specific ticket types; redemption at checkout with
atomic usage counting; reporting on redemptions.
**Out:** affiliate/referral tracking; multi-currency discount math beyond existing payment provider scope.

## Key deliverables
- `PromoCode` model (event-scoped, code, type, value, limits, window, ticket-type scope).
- `Event.promo_codes_enabled` flag + `is_promo_codes_enabled()` helper + `FeaturePolicy` (pro+).
- Checkout integration: validate + apply + atomically increment usage under row lock
  (mirrors the registration-quota concurrency pattern).
- Admin UI for code CRUD; redemption report.

## Key components
- `heptacert/backend/src/models.py` — `PromoCode`, redemption tracking.
- `heptacert/backend/src/payments.py` / `main.py` — apply discount in the payment path.
- `heptacert/backend/src/event_features.py`, `plan_policy.py` — gating.
- `heptacert/frontend/src/app/admin/events/` + public checkout — code entry + management.
- Migration: `promo_codes` table + `events.promo_codes_enabled`.

## Acceptance criteria
- A code applies the correct discount only within its window, limits, and ticket scope.
- Concurrent redemptions never exceed the usage limit (no oversell).
- Codes are inert when the event toggle or plan gate is off.
- Redemption counts and revenue impact are reportable.

## Dependencies & related ADRs
Upstream: WP03, WP11, WP17. See ADR-0017, ADR-0009.
