# ADR-0011 — Integration Storage in JSONB with Encrypted Secrets

**Status:** Accepted · **Date:** 2026-06-27

## Context
Organizations configure many integrations (Slack, Teams, Discord, Google Chat,
HubSpot, Salesforce, SSO, webinar, generic providers). Each has a different shape and
sensitive credentials, and the set grows over time. A table per integration would be
unwieldy and migration-heavy.

## Decision
Store integration configuration as **JSONB** on the organization (e.g.
`notification_integrations`, `crm_integrations`, `enterprise_integrations`), with a
consistent connector pattern: typed Pydantic models per channel, **encrypted secret
fields** at rest, **masking** on read, and **merge-on-update** so blank/masked fields
preserve existing secrets. A dynamic **catalog** endpoint drives the admin UI.

## Consequences
- Adding a connector is a code change (model + handlers + catalog entry), not a migration.
- Secrets are never returned in plaintext; updates don't clobber unspecified secrets.
- A uniform shape powers the integration catalog and per-channel triggers.
- Trade-off: JSONB needs careful per-field validation and encryption discipline.
