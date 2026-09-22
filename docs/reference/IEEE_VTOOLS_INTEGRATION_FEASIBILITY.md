# IEEE vTools Events ↔ HeptaCert: integration feasibility

Status: read-only pilot preview (2026-09-22). No IEEE credentials, registration data, HeptaCert database writes, or production sync have been used. This is not an approval to process IEEE attendee data.

**Product direction clarified by the user:** create an event in HeptaCert, then create/transfer it into IEEE vTools. The current public API and this preview **do not do that**. IEEE's [official creation guide](https://kb.ieee.org/vtools/blog/kb/creating-an-event/) describes signing in with an IEEE Account, choosing an eligible primary-host OU, completing the form and selecting “Save & Publish.” A supported create/update API, authentication flow and permission model were **not found in the public API documentation**. We must obtain IEEE confirmation before implementing automatic outbound writes or promising they will work. Do not reverse-engineer private endpoints or automate a personal IEEE login.

## Verified read-only preview

`heptacert/backend/src/vtools_events.py` now provides a deliberately narrow CLI:

```bash
cd heptacert/backend
python -m src.vtools_events 579175
```

It calls only the fixed official v8 Events List host with `id`, `published=true` and `limit=1`; it rejects an ID mismatch, unpublished or cancelled record, and unsafe/malformed response. It strips markup from the public description, resolves the event's local calendar date from its IANA time zone, and shows candidate HeptaCert title/date/description/location plus source OU and link. It never imports the event, selects a tenant, reads registrants, or creates a certificate. Unit tests use a mock transport, and a read-only live call for one public event ID returned a preview on 2026-09-22. A public event belonging to another IEEE unit was used solely to validate parsing, **not** as an event to import into HeptaCert.

## What is documented

| Capability | Evidence | Feasibility |
|---|---|---|
| Read published event metadata | [IEEE Events API](https://events.vtools.ieee.org/api/doc) documents public REST v8; [Events List](https://events.vtools.ieee.org/api/doc/events) documents `id`, `published`, `page`, `limit`, `delta`, `span`, and custom OU feeds. | Good candidate for a **one-way** vTools → HeptaCert pilot. |
| Scope to the correct IEEE organizational unit | [Events List](https://events.vtools.ieee.org/api/doc/events) says a named custom feed can be requested from IEEE staff; v8 `spoid` applies only within certain custom feeds, not the global feed. | Obtain an IEEE-approved feed/OU scope, or start with explicit event IDs selected by an organizer. Do not import arbitrary global events into a tenant. |
| Read registrations and attendance | [API version history](https://events.vtools.ieee.org/api/doc/history) mentions an “Event Registrations List” added in v6. [IEEE @Event help](https://kb.ieee.org/vtools/blog/kb/event-on-site-registration/) describes check-in and attendee CSV/TSV export. Public documentation reviewed here does **not** establish endpoint access, authentication, allowed fields, or a live attendance API. | Unknown until IEEE confirms access, data terms and a sample response. A staff-approved CSV import is a possible manual fallback. |
| Create/update events or registrations in vTools | The [public API documentation](https://events.vtools.ieee.org/api/doc) and [Events List documentation](https://events.vtools.ieee.org/api/doc/events) reviewed here describe reads; no supported write contract was verified. | Do not promise or implement browser scraping, credential sharing, or unofficial write automation. Ask IEEE for an approved API/integration route. |

## Read-only fallback / reconciliation pilot

1. Organizer supplies their IEEE OU identity and one vTools event URL/ID, and confirms they are authorized to reuse its metadata. Keep the chosen HeptaCert organization/event context explicit; the previous cross-tenant event-ID issue makes implicit mapping unacceptable. This can also reconcile an event that an organizer manually created in vTools after creating it in HeptaCert.
2. Server-side importer fetches only selected published vTools events. Keep a unique `(source='ieee_vtools', external_event_id, organization_id)` mapping, last-seen fingerprint and sync cursor; do not infer local ownership from numeric IDs.
3. Show a preview/diff before the initial creation. Map title, description, start/end, timezone, venue/virtual status, vTools URL, hosts and optional banner only where the HeptaCert model has an unambiguous target. Preserve the vTools URL and provenance. Keep registration and payment links with IEEE unless an organizer deliberately configures another workflow.
4. Subsequent pulls use `delta` plus pagination with a safety overlap and periodic full reconciliation; upsert idempotently. Treat unpublishing/deletions as review-needed, not an automatic destructive delete. Never overwrite organizer-edited HeptaCert fields without an explicit field-ownership rule.
5. Add tenant-scoped authorization, outbound timeouts/retries/rate limits, audit logs and dry-run tests before scheduling. Test with an IEEE-authorized sample event and a non-owner HeptaCert account.

**Not in the first pilot:** attendee PII, check-in, certificates, vTools writes, or IEEE login automation. For attendee/attendance sync, separately confirm IEEE API entitlement or approved export procedure, lawful basis/consent, retention/deletion rules, identity matching, and whether “registered” vs “attended” is sufficient evidence for certificate issuance. HeptaCert already has event-scoped attendee import and attendance/certificate flows, but that does not authorize importing IEEE records.

## Open decisions / prerequisites

- The business priority is **HeptaCert event → vTools event**. Ask IEEE whether an approved event-create/update API or partner integration exists, including credentials, OU scope, draft/publish permissions, sandbox and idempotency. An [unsent request checklist](IEEE_VTOOLS_WRITE_ACCESS_REQUEST.md) is ready for an authorized IEEE officer.
- Which IEEE OU(s) and event(s) are in scope? Can the organizer obtain a named custom feed or authenticated registrations API access from IEEE?
- Which system owns registration/payment and what is the source of truth after an event is edited?
- Obtain an IEEE-approved sample payload and test access before committing to implementation milestones.

This document is a feasibility assessment, not a statement that IEEE has approved a HeptaCert integration. The public example API URL was inaccessible to the browser tool but did respond to a direct, read-only HTTPS request on 2026-09-22. That verifies the public metadata shape only; organization-scoped import, registration/attendance access and write permissions still require IEEE/organizer confirmation.
