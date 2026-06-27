# WP09 — Accreditation & CPD

**Phase:** 2 — Engagement & growth · **Status:** ✅ Delivered

## Objective
Let professional bodies and accredited training providers track Continuing
Professional Development (CPD): configure accreditation bodies, attach CPD hours to
events, and generate auditable member transcripts.

## Scope
**In:** accreditation body registry; organization accreditation records with
validity; event-level CPD hour configuration; member CPD logs and transcripts;
training assignments and renewal notifications.
**Out:** the certificate rendering itself (WP05).

## Key deliverables
- Accreditation bodies (e.g. MYK, TMMOB, SMMM, TÜRMOB, YÖKAK, EMO, TOBB).
- Organization accreditation records with validity windows.
- Per-event CPD hour configuration; automatic CPD logging on certification.
- Member CPD transcript: total hours, by-body breakdown, exportable.
- Training assignments with renewal recommendations and reminders.

## Key components
- `heptacert/backend/src/accreditation_api.py` + `accreditation_models.py` — bodies, org accreditation, event CPD config, member CPD logs.
- `heptacert/backend/src/training_api.py` — assignments, `process_training_renewal_notifications_once`, renewal recommendations.
- Migrations: `080_accreditation`, `052_training_assignments`, `062_departments_training_phase13`.

## Acceptance criteria
- CPD hours accrue automatically when a qualifying certificate is issued.
- Transcripts total correctly and break down by accreditation body.
- Expiring assignments trigger renewal notifications.

## Dependencies & related ADRs
Upstream: WP05, WP08. Downstream: WP13.
