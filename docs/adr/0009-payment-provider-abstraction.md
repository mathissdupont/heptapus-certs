# ADR-0009 — Payment Provider Abstraction

**Status:** Accepted · **Date:** 2026-06-27

## Context
The platform targets the Turkish and global markets, which require different payment
providers (iyzico, PayTR locally; Stripe internationally). Provider availability and
the active provider can change, and payments may be disabled entirely before launch.

## Decision
Define a **`PaymentProvider` abstraction** with concrete `IyzicoProvider`,
`PayTRProvider`, and Stripe implementations selected via `get_provider(settings)`.
Orders are created provider-agnostically; provider-specific checkout and webhook
verification live behind the interface. Payments can be globally toggled off.

## Consequences
- Switching or adding a provider does not touch billing business logic.
- A single webhook handler verifies signatures per provider and applies idempotent
  order/subscription updates.
- Trade-off: the abstraction must capture provider quirks (checkout HTML vs redirect
  URL, signature schemes); each provider needs its own credentials and testing.
