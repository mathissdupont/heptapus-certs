# ADR-0021 — International SEO via Locale-Routed SSR (Hybrid i18n)

**Status:** Accepted · **Date:** 2026-06-30 · **Refines:** [0019](0019-internationalization-architecture.md) · **Related:** [0003](0003-nextjs-frontend.md), [0015](0015-seo-geo-strategy.md)

## Context
The business goal moved from "support a few languages" to **true international presence
with per-language organic SEO** (many European + American languages, later Chinese, and
possibly Arabic). ADR-0019 chose to keep the existing custom client-side i18n
(`localStorage`, single URL). That decision is correct for the **authenticated app** but
**cannot deliver SEO**: search engines need server-rendered, localized HTML at distinct,
crawlable URLs (e.g. `/de/events/...`) with `hreflang` alternates. A client-side toggle
serves one URL with one default-language HTML payload — invisible to per-locale indexing.

A full migration of all ~130 i18n call sites to an SSR framework is high-risk and largely
wasted on screens behind authentication (no SEO value).

## Decision
Adopt a **hybrid i18n architecture**, split by surface:

- **Public / marketing / event surfaces (SEO-bearing):** migrate to **next-intl** with
  App Router **locale-prefixed routing** (`/{locale}/...`). These render server-side per
  locale with localized `generateMetadata` (title/description), `hreflang` alternates,
  `<html lang>`, canonical URLs, and per-locale `sitemap` entries. This is what makes the
  product discoverable in each market. Scope: home, `events`, `marketplace`, `discover`,
  `community`, `pricing`, `developers`, `learning-paths`, public member/profile pages, and
  the legal pages.
- **Authenticated app (admin/portal/checkout/auth, no SEO value):** **keep the existing
  custom i18n** (ADR-0019). No locale prefix, no migration of its ~130 call sites.

The two systems coexist: a `[locale]` segment wraps only the public route groups; the
authenticated routes keep the custom `I18nProvider`. Translations share one base catalog
and a machine-translation pipeline (see the migration plan) so strings don't fork.

## Consequences
- Real per-locale SEO (indexable URLs + hreflang + localized metadata) on the surfaces
  that drive acquisition — the actual business goal.
- Migration cost is bounded to public surfaces, not the whole app; the admin keeps working
  unchanged on day one.
- Two i18n mechanisms exist simultaneously — a deliberate, documented seam (public=next-intl,
  app=custom), not accidental drift. A shared base catalog + pipeline prevents divergence.
- New languages scale via catalogs + machine translation with human review; RTL languages
  (Arabic/Hebrew) are a separate layout workstream and are explicitly phased later.
- Trade-off: contributors must know which side a screen lives on. The locale-prefix
  boundary (route group) makes this unambiguous.
