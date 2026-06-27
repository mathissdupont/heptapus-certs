# ADR-0008 — HeptaCoin Usage-Credit Model

**Status:** Accepted · **Date:** 2026-06-27

## Context
Certificate issuance and hosting have real, variable costs (rendering, storage,
delivery). Flat plan pricing alone does not align cost with usage, and unlimited
issuance on cheap tiers is unsustainable.

## Decision
Introduce **HeptaCoin**, an internal usage credit. Paid plans receive a recurring
monthly quota; certificate issuance and hosting **meter** against the balance.
Enterprise is **unlimited** (`hc_quota = None`) and is explicitly exempt at every
spend site via `_user_has_unlimited_hc`. Crediting is idempotent per period.

## Consequences
- Cost aligns with usage; tiers differentiate by quota.
- A clear, auditable transaction ledger (credit/spend) per user.
- Enterprise's "unlimited" promise is enforced (no balance blocking).
- Trade-off: every spend path must consult the exemption helper; missing it would
  wrongly block Enterprise — so spend sites are centralized and reviewed (see WP05/WP11).
