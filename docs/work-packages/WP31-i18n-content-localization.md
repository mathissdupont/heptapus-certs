# WP31 — Content Localization (i18n)

**Phase:** 5 — Competitive expansion · **Status:** 📐 Planned · **Related ADRs:** [0019](../adr/0019-internationalization-architecture.md), [0004](../adr/0004-postgresql-alembic-jsonb.md) · **Plan:** [I18N_INTERNATIONALIZATION_PLAN](../reference/I18N_INTERNATIONALIZATION_PLAN.md) §6 (Faz E)

## Objective
Let organizers provide their own content (event name/description, email templates,
certificate text) in multiple languages, and serve the right variant per locale on public
surfaces. UI i18n (WP18/28/29) localizes the product chrome; this localizes the data.

## Scope
**In:** translatable JSONB language maps under the existing `Event.config` →
`config.i18n.<field> = {"tr":…,"en":…,"de":…}` (no migration); a single resolver
`resolve_i18n(map, locale, fallback)` (backend + frontend); locale-aware public read paths;
admin UI to enter translations; language-keyed email template variants.
**Out:** UI string localization (other WPs); automatic machine translation of content.

## Key deliverables
- `resolve_i18n` helper (backend + frontend) with base-value fallback.
- `get_public_event_detail`, `public_event_info`, `list_public_events` resolve name/description by locale.
- **`_pe_cache_key` includes the resolved locale** so the cached list never serves the wrong language.
- Admin UI: per-locale fields for event name/description (and email/cert text).
- Language-keyed email template selection in `email_rendering.py`.

## Key components
- `heptacert/backend/src/main.py` — public event read paths (keep edits minimal — god-file).
- `heptacert/backend/src/email_rendering.py` — language-keyed templates.
- `Event.config` JSONB — content language maps (no migration).
- `heptacert/frontend/src/app/[locale]/events/**` + admin event settings UI.

## Acceptance criteria
- A public event page renders the requested language and falls back to the base value when missing.
- The cached public-events list never serves the wrong language (locale in cache key).
- Organizers can enter and save per-locale content; untranslated fields fall back gracefully.

## Dependencies & related ADRs
Upstream: WP18, WP29 (events under [locale]). See ADR-0019, ADR-0004.
