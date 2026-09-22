# Draft request to IEEE vTools Events support — not sent

Purpose: determine whether an approved HeptaCert → vTools event-creation integration is available. An authorized IEEE officer/OU representative should send this through the official vTools support/contact channel; do **not** send personal IEEE credentials or access tokens. [IEEE's public Events API](https://events.vtools.ieee.org/api/doc) documents reads, while its [creation guide](https://kb.ieee.org/vtools/blog/kb/creating-an-event/) describes the signed-in browser form and OU authorization. No supported public write contract was verified as of 2026-09-22.

> Subject: Approved API/integration for creating IEEE vTools Events from HeptaCert
>
> Hello IEEE vTools Events team,
>
> Our IEEE organizational unit, **[OU name and SPOID]**, uses HeptaCert to plan events. We would like an authorized officer to create a vTools Events draft from event details already entered in HeptaCert, then review and publish it in vTools. Is there a supported create/update API, partner integration, or approved import workflow for this purpose?
>
> If yes, could you provide documentation for the authentication/authorization model; how the primary host OU is scoped; required and optional fields; draft vs publish permissions; idempotency/duplicate handling; update/cancel behavior; sandbox/test environment; rate limits; and integration terms? Please also clarify whether registration/attendance APIs are separately available and what privacy/consent conditions apply. We would initially transfer **event metadata only**, not member or attendee records.
>
> If no write API exists, is there an IEEE-approved way to prefill or import the Create Event form, or should our officers continue copying the details into the form manually? We will not automate an IEEE login or use undocumented endpoints.
>
> Thank you, **[officer name/role/contact]**

Until IEEE answers, the feasible product behavior is an **assisted handoff**: HeptaCert shows a copyable event summary and a link to the official vTools Create Event screen; an authorized officer selects the OU, completes required fields and publishes it there, then attaches the resulting vTools event ID/URL back to the HeptaCert event. That is not automatic creation. Any UI for this workflow still needs tenant-scoped authorization, nine-language catalog strings, semantic theme tokens and tests.
