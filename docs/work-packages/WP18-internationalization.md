# WP18 — Internationalization (i18n)

**Phase:** 5 — Competitive expansion · **Status:** 📐 Planned · **Related ADRs:** [0019](../adr/0019-internationalization-architecture.md), [0004](../adr/0004-postgresql-alembic-jsonb.md)

## Objective
Make HeptaCert usable in multiple languages — both the product UI and organizer-authored
content — removing the single-language blocker for international sales and multilingual events.

## Scope
**In (18a — UI):** message-catalog framework (`next-intl`/`next-i18next`); extract
hardcoded user-facing strings behind `t()`; `tr` + `en` catalogs; locale resolution
(user preference → `Accept-Language` → default); locale switcher.
**In (18b — content):** translatable JSONB language maps for event name/description,
email templates, certificate text; locale-aware public rendering with default-language
fallback; language-keyed email template variants.
**Out:** machine translation; RTL layout (future); per-feature behavior.

## Key deliverables
- i18n framework wired into both `next-app` and `next-pages` surfaces.
- `locales/tr`, `locales/en` catalogs; string extraction across public + admin UIs.
- JSONB `{"tr":..,"en":..}` storage for designated content fields + read-time resolution.
- Localized backend end-user messages where the client cannot localize them.
- "Add a language = add a catalog" verified by adding a third stub locale in tests.

## Key components
- `heptacert/frontend/` — i18n provider, `locales/`, `t()` migration, language switcher.
- `heptacert/backend/src/email_rendering.py` — language-keyed template selection.
- `heptacert/backend/src/models.py` / `event_features.py` — translatable field handling.
- Migrations: convert designated text columns to JSONB language maps (with backfill into default locale).

## Acceptance criteria
- Switching locale changes all migrated UI strings; untranslated keys fall back, never crash.
- A public event page renders the requested language and falls back to the event default.
- Adding a locale requires no code change beyond a catalog file.
- Existing single-language data is preserved as the default-locale value after migration.

## Dependencies & related ADRs
Upstream: WP14, WP03, WP06. Cross-cutting (touches most UIs). See ADR-0019.
