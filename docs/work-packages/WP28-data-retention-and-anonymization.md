# WP28 — Data Retention & Anonymization (KVKK)

**Phase:** 5 — Planned (compliance & data governance) · **Status:** 📐 Planned · **Related ADRs:** [0017](../adr/0017-per-event-feature-toggles-two-layer-gate.md), [0013](../adr/0013-background-jobs-and-workers.md) · **Proposes:** ADR-0022 (irreversible anonymization & retention policy)

## Objective
Let each organization declare which registration fields are personal data, set a
retention period after which that data must be disposed of, and have the platform
**irreversibly anonymize** the marked data automatically once the period expires.
This turns the current free-text-only `data_retention_note` into an enforced,
auditable retention regime aligned with KVKK (Law 6698) and the Board's guide on
deletion / destruction / anonymization, while keeping the platform's own liability
minimal (org = data controller decides; platform = processor executes and audits).

## Design decisions (locked)

These decisions are settled and drive the implementation. The rationale belongs in
the proposed **ADR-0022**.

- **Irreversibility.** The "anonymize" action is irreversible by design — no key,
  mapping, or backup of the original value is retained. Reversible masking would be
  *pseudonymization*, which under KVKK is still personal data and does **not**
  discharge the controller's obligations; it is therefore out of scope for this action.
- **Controller / processor split.** The organization (data controller) decides *which*
  fields are PII and *how long* to keep them; the platform (processor) only executes
  and records. Keeping the substantive decision with the org is the primary
  liability-minimization lever for the platform.
- **Certificate integrity.** `name` / `email` are **excluded from anonymization by
  default** because certificates are evidentiary records that must stay verifiable.
  The certificate's display name is frozen independently of the attendee record. An org
  may opt `name`/`email` in explicitly, in which case the frozen certificate name is
  what preserves certificate validity.
- **TCKN is never hashed.** A Turkish national ID lives in a finite, checksum-validated
  space (~10^10) — any hash is brute-forceable, so hashing is not anonymization. Marked
  identifier fields are **removed**, not hashed.
- **Disposal method = key removal + tombstone.** For each marked field the value key is
  deleted from `Attendee.registration_answers`. A reserved `__anonymized` key (same
  pattern as the existing `__kvkk` / `__documents` reserved keys) records
  `{at, fields:[field_id...]}`. This avoids injecting a sentinel string into typed
  fields (number/date/tel) that would break downstream consumers, while still recording
  that anonymization happened.
- **Reference date = per attendee.** In relative mode the retention period is counted
  from **each attendee's registration date** (`Attendee.created_at`), not the event
  date. The resolved disposal date is materialized per attendee (see data model), so
  fixed-date mode uses the same column and the daily sweep stays a single indexed query.
- **Hybrid storage.** Indexed columns `attendees.anonymize_after` + `attendees.anonymized_at`
  drive the sweep; human-facing retention settings live in `Event.config` /
  `Organization.settings`; the field-level `pii` flag lives inside the existing
  `registration_fields` JSON.
- **Trigger is per-event.** Each event chooses **auto** (sweep disposes silently when
  due) or **approve-then-run** (sweep marks the event "ready", an admin confirms). Both
  modes send a pre-warning email before disposal and a confirmation email after.
- **Audit.** A PII-free `anonymization_log` table records every disposal
  (attendee_id, event_id, org_id, field ids, method, timestamp, trigger) as the
  accountability artifact — it never stores the original values.
- **Closes an existing gap.** The member account-deletion flow
  (`main.py:delete_public_member_account`) promises "permanent cleanup within 30 days"
  but no job implements it and it never touches the member's `Attendee` rows. The same
  engine fulfills that promise (Phase C).

## Scope
**In:** per-field PII marking on the registration form; per-event + org-default
retention policy (relative period from registration date, or fixed date); a scheduled
anonymization engine (irreversible key removal + tombstone); per-attendee
`anonymize_after`/`anonymized_at` materialization; PII-free audit log; pre-warning and
post-disposal emails; auto vs approve-then-run trigger; admin UI for marking fields,
setting policy, and approving pending disposals; fulfilment of the member-deletion
purge promise.

**Out:** anonymizing certificate evidence itself (frozen name preserves validity);
anonymizing `name`/`email` by default (opt-in only); k-anonymity / statistical
generalization of values (future); anonymization of the parallel `LeadCaptureSubmission`
and `ParticipantCrmProfile` stores (tracked as follow-ups, not this WP); legal validity
of the org's retention-and-destruction policy text and VERBİS registration (org's own
legal responsibility, not a platform deliverable).

## Key deliverables
- `registration_fields` schema gains a per-field `pii: bool` flag (validated + normalized).
- Event + org retention policy: mode (`relative` | `fixed`), retention days, fixed date,
  trigger (`auto` | `approve`), email prefs — stored in `Event.config.retention` /
  `Organization.settings.retention_default`.
- Migration **111**: `attendees.anonymize_after`, `attendees.anonymized_at`
  (both nullable, indexed on `anonymize_after`) + `anonymization_log` table.
- `anonymization_service.py`: idempotent per-attendee disposal (remove marked keys,
  write `__anonymized` tombstone, set `anonymized_at`, append audit row).
- APScheduler job `_anonymize_expired_attendee_data` (daily) registered in the
  `ENABLE_SCHEDULER` block; `approve` events are flagged ready instead of disposed.
- `anonymize_after` (re)materialization: on registration, and on policy change (backfill
  the event's attendees).
- Pre-warning + post-disposal emails via the existing email pipeline.
- Admin UI: per-field PII checkbox in the form builder; retention policy in event
  settings; org-default in org settings; a "ready for anonymization" approval screen.
- Two-layer gate wiring per ADR-0017 (event toggle + plan policy + settings surface).

## Key components
- `heptacert/backend/src/main.py` — `_validate_registration_fields_for_write` /
  `_normalize_registration_fields` (`pii` flag); scheduler registration
  (`main.py:3187-3198`); registration path sets `anonymize_after`; wire member-deletion
  (`delete_public_member_account`, `main.py:7870`) to the engine.
- `heptacert/backend/src/anonymization_service.py` — **new**; disposal engine + sweep.
- `heptacert/backend/src/models.py` — `Attendee` columns; `AnonymizationLog` model.
- `heptacert/backend/src/event_extras_api.py` / event settings API — retention policy CRUD +
  approval endpoint.
- `heptacert/backend/src/services.py` — retention getters alongside
  `_get_event_data_retention_note`.
- `heptacert/backend/src/event_features.py`, `plan_policy.py` — gating.
- `heptacert/backend/alembic/versions/111_data_retention_anonymization.py` — **new** (down_revision 110).
- `heptacert/frontend/` — form-builder PII checkbox
  (`admin/events/[id]/settings/page.tsx`), retention policy UI, approval screen,
  org-default settings; `lib/api.ts` types (`RegistrationField.pii`, retention types).

## Data model & migration (111)
- `attendees.anonymize_after TIMESTAMP NULL` — resolved disposal date (indexed).
- `attendees.anonymized_at TIMESTAMP NULL` — set when disposed (idempotency guard).
- `anonymization_log` — `id`, `attendee_id`, `event_id`, `organization_id`,
  `field_ids JSONB`, `method`, `trigger`, `created_at`. **No original values.**
- Reserved answer key `registration_answers["__anonymized"] = {at, fields:[...]}`.

## Anonymization engine
1. Daily sweep selects `attendees WHERE anonymize_after <= now() AND anonymized_at IS NULL`
   for events with retention enabled.
2. `auto` events → dispose immediately: remove each `pii`-marked field's value from
   `registration_answers`, write `__anonymized` tombstone, set `anonymized_at`, append
   `anonymization_log`, queue post-disposal email.
3. `approve` events → mark the event "ready" + queue an approval-request email; disposal
   runs only after an admin confirms via the approval endpoint (same disposal path).
4. A separate earlier pass queues pre-warning emails N days before `anonymize_after`.
5. Policy changes recompute `anonymize_after` for the affected event's attendees.

## Acceptance criteria
- A field marked `pii` with an expired retention period has its value removed from
  `registration_answers` and is unrecoverable; `anonymized_at` and an `anonymization_log`
  row are set; the `__anonymized` tombstone lists the field ids.
- `name`/`email` and issued certificates remain intact and verifiable after disposal
  (unless the org explicitly opted `name`/`email` in).
- `auto` events dispose without intervention; `approve` events dispose only after admin
  confirmation; both send pre-warning and post-disposal emails.
- Relative mode counts from each attendee's registration date; fixed-date mode disposes
  all attendees on the configured date; both resolve through `anonymize_after`.
- The sweep is idempotent (re-running disposes nothing already disposed) and the
  retention feature is hidden when the event toggle / plan gate is off.
- Member account deletion results in the member's `Attendee` PII being disposed within
  the promised window (Phase C).

## Dependencies & related ADRs
Upstream: WP03 (registration fields), WP05 (certificate integrity constraint),
WP11 (plan gating), WP16 (KVKK/compliance baseline). Infra: ADR-0013 (APScheduler jobs),
ADR-0017 (two-layer gate). Proposes ADR-0022 (irreversible anonymization & retention).

## Phasing
- **Phase A — Core engine (name/email excluded):** migration 111, `pii` flag +
  validation, retention policy storage + `anonymize_after` materialization,
  `anonymization_service.py` + daily sweep, audit log, emails. Independently shippable.
- **Phase B — Admin UI:** form-builder PII checkbox, event retention settings,
  org-default, approval screen; two-layer gate surface.
- **Phase C — Scope extension (higher risk, isolated):** fulfil the member-deletion
  30-day purge via the engine; verify the certificate frozen-name path so an opt-in
  `name`/`email` disposal cannot break certificate rendering/verification.
