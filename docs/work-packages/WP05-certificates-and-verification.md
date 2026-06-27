# WP05 — Certificate Issuance & Verification

**Phase:** 1 — Core event lifecycle · **Status:** ✅ Delivered · **Related ADRs:** [0010](../adr/0010-certificate-generation-and-verification.md), [0008](../adr/0008-heptacoin-usage-credits.md)

## Objective
Produce branded, tamper-evident, publicly verifiable digital certificates that are
issued automatically from real-world triggers (attendance, quiz pass, learning-path
completion) and can be confirmed by anyone without logging in.

## Scope
**In:** certificate templates and editor; server-side PDF/PNG rendering; QR-based
public verification; steganographic watermark; CPD stamping; bulk issuance;
Apple Wallet passes; hosting lifecycle and auto-renewal; HeptaCoin metering.
**Out:** the credit economy itself (WP11), delivery email (WP06).

## Key deliverables
- Template presets and a visual editor; enterprise-locked org presets.
- Deterministic certificate rendering (PDF + watermarked PNG) with brand assets.
- Unique public ID + UUID; public verification page and QR (no login).
- Invisible watermark embedding/extraction for authenticity forensics.
- Bulk generation jobs with per-certificate HeptaCoin metering and resumability.
- CPD/credit-hour stamping; Apple Wallet pass generation.
- Hosting term with expiry and optional auto-renew.

## Key components
- `heptacert/backend/src/generator.py` — `render_certificate_pdf`, `render_certificate_png_watermarked`, `TemplateConfig`.
- `heptacert/backend/src/watermark.py` — `embed_watermark`, `extract_watermark`.
- `heptacert/backend/src/signing.py` — `sign_pdf`.
- `heptacert/backend/src/certificate_templates_api.py` + `certificate_template_seeds.py` — presets, versions, enterprise locking.
- `heptacert/backend/src/main.py` — issue/bulk-issue endpoints, hosting units, `_user_has_unlimited_hc` metering.
- `heptacert/frontend/src/app/verify/` — public verification UI.
- Migrations: `048_certificate_auto_renew`, `063_checkin_wallet_template_phase14_15`, `082_lms_staff_cert_pdf`.

## Acceptance criteria
- Certificates render consistently with branding and a working verification QR.
- Public verification confirms authenticity without authentication.
- Bulk issuance meters HeptaCoin correctly and is Enterprise-exempt.
- Watermark survives normal image handling and can be extracted for disputes.

## Dependencies & related ADRs
Upstream: WP03, WP04. Downstream: WP06 (delivery), WP08/WP09 (triggers), WP10 (marketplace). See ADR-0010, ADR-0008.
