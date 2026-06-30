# WP30 — International SEO Mechanics (i18n)

**Phase:** 5 — Competitive expansion · **Status:** 📐 Planned · **Related ADRs:** [0021](../adr/0021-international-seo-locale-routed-ssr.md), [0015](../adr/0015-seo-geo-strategy.md) · **Plan:** [I18N_INTERNATIONALIZATION_PLAN](../reference/I18N_INTERNATIONALIZATION_PLAN.md) §2 (Faz C)

## Objective
Make each locale independently and correctly indexable: per-locale URLs in the sitemap with
`hreflang` alternates, server-rendered `<html lang>`, canonical URLs, and a consistent
old-URL redirect policy. This is what turns the locale routing into actual organic reach.

## Scope
**In:** extend `sitemap.ts` to emit every public URL × every enabled locale with `hreflang`
+ `x-default`; SSR `<html lang>` per locale (replace the interim client-side HtmlLangSetter);
canonical per locale; `robots.ts` review; a standard 301 helper for old→localized URLs.
**Out:** page content/migration (WP29); organizer content (WP31).

## Key deliverables
- `sitemap.ts` producing locale-expanded entries with `alternates.languages` hreflang.
- SSR `<html lang={locale}>` — e.g. middleware forwards the resolved locale via a request
  header that the root layout reads, replacing the client-side setter.
- Per-page localized canonical + hreflang (standardize the pattern proven on the pilot).
- Search Console / Lighthouse verification checklist.

## Key components
- `heptacert/frontend/src/app/sitemap.ts`, `robots.ts`.
- `heptacert/frontend/src/middleware.ts` — forward resolved locale header.
- `heptacert/frontend/src/app/layout.tsx` — read locale header for `<html lang>`.
- `heptacert/frontend/src/app/[locale]/**` — `generateMetadata` alternates.

## Acceptance criteria
- Sitemap lists each public page for each enabled locale with correct hreflang + x-default.
- `<html lang>` is correct in the SSR HTML (not only after hydration).
- Each localized page has a self-referential canonical and full hreflang set.
- No untranslated locale is advertised (only complete catalogs in `routing.locales`).

## Dependencies & related ADRs
Upstream: WP18, WP28, WP29. See ADR-0021, ADR-0015.
