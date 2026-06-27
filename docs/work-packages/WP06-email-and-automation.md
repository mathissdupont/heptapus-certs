# WP06 — Email, Templates & Automation

**Phase:** 2 — Engagement & growth · **Status:** ✅ Delivered · **Related ADRs:** [0013](../adr/0013-background-jobs-and-workers.md)

## Objective
Give organizers a complete lifecycle-marketing engine: branded transactional and
bulk email, trigger-based drip sequences, and delivery/open/click analytics — all
plan-gated and queue-driven.

## Scope
**In:** SMTP configuration; branded email templates and rendering; bulk email jobs;
scheduled and recurring sends; drip/automation sequences; open & click tracking;
system digest emails.
**Out:** CRM data model (WP07), notification webhooks (WP12).

## Key deliverables
- Per-organization SMTP credentials and sender identity.
- Template variable engine (event, attendee, certificate, survey, unsubscribe).
- Bulk email job runner with scheduling and cron expressions.
- Automation/drip sequences: trigger → delay → action (send, tag, webhook).
- Open-rate and click tracking with per-link rewriting.
- System/platform digest emails.

## Key components
- `heptacert/backend/src/email_rendering.py` — `build_email_template_vars`, `render_template_string`.
- `heptacert/backend/src/email_api.py` — SMTP test, superadmin bulk/digest.
- `heptacert/backend/src/automation_api.py` — `process_automation_dispatches_once`, rules & actions.
- `heptacert/backend/src/crm_sequences_api.py` — `process_due_sequence_steps`, drip enrollment.
- `heptacert/backend/src/main.py` — bulk email job processing loop, `require_email_system_access` gate.
- Migrations: `008_email_system`, `009_email_system_complete`, `010_smtp_credentials`, `017_bulk_email_recipient_type`, `044_email_scheduling_fields`, `043_system_digest_emails`, `069_crm_drip_sequences`, `071_email_click_tracking`.

## Acceptance criteria
- Bulk and scheduled emails send reliably via the job queue.
- Drip sequences fire on the configured triggers with correct delays.
- Opens and clicks are tracked and attributed.
- Email features are restricted to Growth/Enterprise plans.

## Dependencies & related ADRs
Upstream: WP03, WP02, WP11 (gating). Downstream: WP07, WP13. See ADR-0013, ADR-0007.
