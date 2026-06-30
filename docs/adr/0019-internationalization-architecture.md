# ADR-0019 — Internationalization (i18n) Architecture

**Status:** Accepted · **Date:** 2026-06-30 · **Related:** [0004](0004-postgresql-alembic-jsonb.md), [0003](0003-nextjs-frontend.md)

## Context
The product must work in multiple languages — both the product UI and
organizer-authored content. There are two distinct concerns that are often conflated
and must be solved separately:

1. **Product UI strings** — buttons, labels, validation messages baked into the app.
2. **Customer content** — organizer-authored data (event name/description, email
   templates, certificate text) that itself needs to exist in multiple languages.

A **custom client-side i18n already exists** and is in production: `src/lib/i18n.tsx`
(an `I18nProvider` + `useI18n`/`useT` + `LanguageToggle`) backed by typed locale objects
in `src/locales/{tr,en}.ts` (~490 keys each, tr/en balanced), with `{var}` interpolation
and a tr→key fallback, and the choice persisted in `localStorage`. Introducing a second
framework (next-intl/next-i18next) would duplicate and conflict with ~130 call sites.

## Decision
**Build on the existing custom i18n; do not introduce a second framework.** Solve the
two concerns with two mechanisms.

- **UI strings (static):** keep `src/lib/i18n.tsx` + `src/locales/*`. New user-facing
  strings are added as typed keys (kept in sync across `tr` and `en`) and read via
  `useT()`/`t(key, vars)`. Adding a language = adding a `src/locales/<lang>.ts` object
  and extending the `Lang` union. First-visit locale is detected from the browser
  (`navigator.language`) when no stored preference exists, then defaults to `tr`.
- **Customer content (dynamic):** translatable fields are stored as JSONB language maps,
  `{"tr": "...", "en": "..."}`. For events this lives under the **existing `Event.config`
  JSONB** (`config.i18n.<field>`), so it needs **no migration** and reuses the
  established config pattern (ADR-0004). A single resolver picks the variant by requested
  locale and falls back to the event's stored base value when a translation is missing.
  Email templates (already JSONB, sandboxed Jinja2) gain language-keyed variants the same
  way. Backend end-user messages are localized via the same locale keys where the client
  cannot localize them itself.

## Consequences
- One i18n system, not two: no migration off ~130 existing call sites, no bundle/API
  duplication.
- Clear separation: translating the UI never touches the database; translating content
  never touches code.
- Content i18n needs no schema migration (rides on `Event.config` JSONB); untranslated
  values fall back to the base field, so rollout is incremental and never crashes.
- Adding a locale is cheap (UI: one locale object; content: organizers fill variants).
- Trade-offs: (1) the custom UI i18n is client-side/`localStorage`, so SSR'd content is
  not pre-localized at the HTML level — acceptable for the current SPA-style surfaces.
  (2) JSONB content maps make sorting/searching on translated fields locale-dependent;
  display-locale is resolved at read time rather than denormalizing per-language columns.
  (3) The cached public-events list (`_pe_cache_key`) must include the resolved locale in
  its cache key once listing content is localized, to avoid serving the wrong language.
