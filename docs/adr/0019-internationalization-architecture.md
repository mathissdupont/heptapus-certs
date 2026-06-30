# ADR-0019 — Internationalization (i18n) Architecture

**Status:** Accepted · **Date:** 2026-06-30 · **Related:** [0004](0004-postgresql-alembic-jsonb.md), [0003](0003-nextjs-frontend.md)

## Context
The product is single-language today, which is a hard blocker for international sales
and for organizers running events for multilingual audiences. i18n is not a per-event
feature toggle — it is cross-cutting infrastructure. There are two distinct concerns
that are often conflated and must be solved separately:

1. **Product UI strings** — buttons, labels, validation messages baked into the app.
2. **Customer content** — organizer-authored data (event name/description, email
   templates, certificate text) that itself needs to exist in multiple languages.

## Decision
Treat the two concerns with two different mechanisms.

- **UI strings (static):** message catalogs via `next-intl`/`next-i18next`. All
  hardcoded user-facing strings move behind `t("key")`; catalogs live under `locales/`
  (`tr`, `en` first). Locale resolves from the user's preference, falling back to the
  `Accept-Language` header, then the platform default. Adding a language = adding a
  catalog file, nothing else.
- **Customer content (dynamic):** translatable fields are stored as JSONB language maps,
  `{"tr": "...", "en": "..."}`, consistent with the existing `Event.config` / email
  template JSONB pattern (ADR-0004). The public surface picks the variant by requested
  locale and falls back to the event's default language when a translation is missing.
  Jinja2 email templates (already sandboxed) gain language-keyed variants.

Backend response *messages* intended for end users are localized via the same catalog
keys where the client cannot localize them itself.

## Consequences
- Clear separation: translating the UI never touches the database; translating content
  never touches code.
- Incremental rollout: fields and screens can be migrated to i18n one at a time without
  a big-bang cutover; untranslated values gracefully fall back.
- Adding a new locale is cheap (UI: one catalog; content: organizers fill variants).
- Trade-off: JSONB language maps make some queries/sorting on content fields
  locale-dependent; we accept this and resolve display-locale at read time rather than
  denormalizing per-language columns.
