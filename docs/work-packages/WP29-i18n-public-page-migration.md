# WP29 — Public Page Migration to Locale Routing (i18n)

**Phase:** 5 — Competitive expansion · **Status:** 📐 Planned · **Related ADRs:** [0021](../adr/0021-international-seo-locale-routed-ssr.md) · **Plan:** [I18N_INTERNATIONALIZATION_PLAN](../reference/I18N_INTERNATIONALIZATION_PLAN.md) §4–§5

## Objective
Migrate the public marketing/event pages under `app/[locale]/` so they render server-side
per locale in all enabled languages. This is the bulk of the work and is done **one page at
a time** using the repeatable recipe, because the pages were written with inline
`lang === "tr" ? … : …` bilingual conditionals rather than catalog `t()` — each page needs
real string extraction, not just a hook swap.

## Scope
**In:** per-page migration of `/` , `/events` (+ detail/quiz/register/survey), `/discover`,
`/marketplace` (+ detail/courses), `/organizations` (+ detail), `/learning-paths`, `/members`,
`/community`, `/post`, `/verify`, `/pricing`. For each: extract inline strings → catalog keys
(translated ×9), swap to next-intl `useTranslations`/`useLocale`, move under `[locale]`, add
localized `generateMetadata` + hreflang, 301 the old URL, make inbound links locale-aware.
**Out:** the shared shell (WP28); sitemap/global SEO (WP30); organizer content (WP31);
Turkish-market legal pages (out of scope per plan §8).

## Key deliverables
- Each listed route served under `/{locale}/…` for all enabled locales, content localized.
- New catalog keys for every extracted inline string (9 locales), `tsc`-complete.
- 301 redirects from old non-prefixed public URLs to the locale-prefixed equivalents.
- Locale-aware inbound links (`@/i18n/navigation`).

## Recommended order (light → heavy)
`/verify` → `/discover` → `/marketplace` → `/organizations` → `/learning-paths` →
`/members`/`/community`/`/post` → `/events` (+ subroutes) → `/` (home, heaviest).

## Key components
- `heptacert/frontend/src/app/[locale]/**` — migrated pages.
- `heptacert/frontend/src/app/**` — old routes become thin redirects.
- `heptacert/frontend/src/locales/*.ts` — extracted keys (9 locales).
- `heptacert/frontend/src/middleware.ts` — already delegates locale paths to next-intl.

## Acceptance criteria
- Each migrated page renders fully localized at `/{locale}/…`; no inline tr/en conditionals remain on it.
- Old URL 301s to the default-locale equivalent; subroutes keep the locale.
- tsc + `next build` pass after each page; existing routes unaffected.

## Dependencies & related ADRs
Upstream: WP18, WP28. Downstream/parallel: WP30, WP31. See ADR-0021.
