# WP11 — Billing, Subscriptions & HeptaCoin

**Phase:** 3 — Platform & ecosystem · **Status:** ✅ Delivered · **Related ADRs:** [0007](../adr/0007-plan-feature-policy-single-source.md), [0008](../adr/0008-heptacoin-usage-credits.md), [0009](../adr/0009-payment-provider-abstraction.md)

## Objective
Monetize the platform with a clear plan ladder, a usage-credit economy for
certificate operations, and pluggable payment providers — while keeping the
feature→plan mapping a single source of truth that both backend and frontend trust.

## Scope
**In:** plan catalog (Starter/Professional/Growth/Enterprise); feature→plan policy;
subscription lifecycle (grant, renew, upgrade/downgrade, expire); HeptaCoin credit
quotas and metering; payment providers (iyzico/PayTR/Stripe) and webhooks.
**Out:** the gated features themselves (their own WPs).

## Key deliverables
- `PLAN_CATALOG` as the single source of truth: pricing, HeptaCoin quota, marketing
  copy, and feature inclusion all derived from one place.
- Feature-policy helpers (`plan_allows`, `subscription_is_active_plan`) used by every gate.
- Subscription model with active-plan resolution, expiry, and superadmin grant.
- HeptaCoin: monthly quota crediting, per-operation metering, Enterprise = unlimited.
- Payment provider abstraction with order + webhook handling and idempotency.

## Key components
- `heptacert/backend/src/plan_policy.py` — `PLAN_CATALOG`, `FEATURE_POLICIES`, `pricing_catalog_payload`, `plan_hc_quota`, `plan_is_unlimited_hc`.
- `heptacert/backend/src/main.py` — `DEFAULT_PRICING` (derived), `_get_hc_quota`, `_user_has_unlimited_hc`, subscription/grant/webhook endpoints, gate dependencies.
- `heptacert/backend/src/payments.py` — `PaymentProvider`, `IyzicoProvider`, `PayTRProvider`, Stripe, `get_provider`.
- `heptacert/frontend/src/lib/featureMetadata.ts`, `useSubscription.tsx` — client-side gating mirror.
- Migrations: `005_hc_renewal`, `007_transaction_description`, `066_fix_heptacoin_balance_column`, `030_mem_subs`/`049_drop_public_member_subscriptions`.

## Acceptance criteria
- Pricing/quota/feature data never drift: changing `PLAN_CATALOG` updates UI + gates.
- Paid features are denied below their plan and granted at/above it, honoring expiry.
- HeptaCoin meters correctly on issuance; Enterprise is exempt and never blocked.
- Plan changes never leave a user with two active subscriptions (webhook + grant).

## Dependencies & related ADRs
Upstream: WP02. Downstream: gates WP03–WP12. See ADR-0007, ADR-0008, ADR-0009.
