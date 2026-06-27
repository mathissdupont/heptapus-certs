# WP07 — CRM & Lead Management

**Phase:** 2 — Engagement & growth · **Status:** ✅ Delivered

## Objective
Turn event participation into a managed relationship: per-participant CRM snapshots,
corporate accounts, a deal pipeline, activity timelines, audience segmentation, and
embeddable lead-capture forms.

## Scope
**In:** participant CRM profiles and snapshots; corporate accounts and contacts;
deal pipeline with stages and activities; saved views and segments; lead-capture
forms with public iframe submission; CRM email aliases and auto-tagging.
**Out:** outbound CRM connectors like HubSpot/Salesforce (WP12).

## Key deliverables
- Participant CRM snapshot with full event/certificate history and auto-tags.
- Corporate accounts, account contacts, deals, and deal activities.
- Saved CRM views and reusable audience segments with composition logic.
- Segment export jobs (async) for large audiences.
- Lead-capture form builder; public submission endpoint; iframe embed.

## Key components
- `heptacert/backend/src/event_crm_api.py` — participant CRM, snapshots, audit, aliases.
- `heptacert/backend/src/crm_accounts_api.py` + `crm_accounts_models.py` — accounts, contacts, deals, activities.
- `heptacert/backend/src/crm_snapshot_hooks.py` — `refresh_crm_snapshot_for_attendee`, certified auto-tagging.
- `heptacert/backend/src/audience_segments_api.py` — `get_segment_attendees`, export jobs.
- `heptacert/backend/src/lead_forms_api.py` + `lead_forms_models.py` — forms and submissions.
- Migrations: `056_crm_enterprise_upgrade`, `057_crm_saved_views`, `058_crm_email_aliases`, `060_saved_audience_segments`, `061_segment_export_jobs`, `076_crm_accounts`, `077_lead_capture_forms`.

## Acceptance criteria
- Each participant has an up-to-date CRM snapshot reflecting their history.
- Deals move through pipeline stages with logged activities.
- Segments produce correct audiences and export asynchronously at scale.
- Public lead forms submit via iframe and create CRM records.

## Dependencies & related ADRs
Upstream: WP03, WP05, WP02. Downstream: WP06, WP12, WP13.
