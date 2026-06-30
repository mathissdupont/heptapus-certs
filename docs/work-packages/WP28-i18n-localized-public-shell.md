# WP28 — Localized Public Shell (i18n)

**Phase:** 5 — Competitive expansion · **Status:** 📐 Planned · **Related ADRs:** [0021](../adr/0021-international-seo-locale-routed-ssr.md), [0019](../adr/0019-internationalization-architecture.md) · **Plan:** [I18N_INTERNATIONALIZATION_PLAN](../reference/I18N_INTERNATIONALIZATION_PLAN.md)

## Objective
Provide a locale-aware navigation/footer shell for the locale-routed public surfaces, so
migrated pages render their chrome (menu, footer, language switcher) in the active locale.
This is the prerequisite for every page migration (WP29): without it, a `/de` page would
still show a Turkish/English menu from the shared `ClientShell`.

## Scope
**In:** a next-intl public shell (header/nav, footer, `LanguageSwitcher`) used by
`app/[locale]/layout.tsx`; nav/footer strings sourced from the shared `src/locales/*`
catalog via `useTranslations`; locale-aware internal links via `@/i18n/navigation`.
**Out:** the authenticated `ClientShell` (stays on custom i18n, tr/en); individual page
content (WP29); SEO mechanics (WP30).

## Key deliverables
- `PublicShell` (nav + footer) under `src/components/i18n/` or `app/[locale]/`, next-intl based.
- New catalog keys for any nav/footer strings not already present (translated ×9).
- `LanguageSwitcher` (already built) placed in the public header.
- `app/[locale]/layout.tsx` renders the public shell around `{children}`.

## Key components
- `heptacert/frontend/src/app/[locale]/layout.tsx` — wraps children with the public shell.
- `heptacert/frontend/src/components/i18n/` — `PublicShell`, `LanguageSwitcher` (built).
- `heptacert/frontend/src/locales/*.ts` — nav/footer keys (9 locales).

## Acceptance criteria
- A locale-routed page shows nav/footer/language switcher fully in the active locale.
- Switching language keeps the user on the same path with the chrome updating.
- The authenticated app shell is untouched.
- tsc + `next build` pass.

## Dependencies & related ADRs
Upstream: WP18 (catalogs + infra). Downstream: WP29. See ADR-0021.
