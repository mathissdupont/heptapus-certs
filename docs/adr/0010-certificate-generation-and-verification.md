# ADR-0010 — Certificate Generation, Watermark & Public Verification

**Status:** Accepted · **Date:** 2026-06-27

## Context
Certificates must be trustworthy: branded, consistent, verifiable by third parties
without an account, and resistant to forgery — while being cheap enough to issue in
bulk.

## Decision
Render certificates **server-side** to PDF and a watermarked PNG from a
`TemplateConfig` (`generator.py`). Embed an **invisible steganographic watermark**
(`watermark.py`) for authenticity forensics and optionally **sign** the PDF
(`signing.py`). Every certificate gets a unique public ID + UUID and a **public QR
verification** page that requires no login. Issuance can be triggered automatically
(attendance, quiz pass, learning-path completion) and metered via HeptaCoin.

## Consequences
- Anyone can verify a certificate instantly; disputes can be checked via the watermark.
- Deterministic rendering keeps output consistent across single and bulk issuance.
- Trade-off: PDF/PNG rendering is CPU-bound, so it runs off the event loop (threads)
  and is metered; bulk jobs are resumable to survive interruptions.
