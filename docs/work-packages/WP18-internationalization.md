# WP18 — Internationalization (i18n)

**Phase:** 5 — Competitive expansion · **Status:** 🔄 Iterating · **Related ADRs:** [0019](../adr/0019-internationalization-architecture.md), [0004](../adr/0004-postgresql-alembic-jsonb.md)

## Objective
Make HeptaCert usable in multiple languages — both the product UI and organizer-authored
content — removing the single-language blocker for international sales and multilingual events.

## Scope
**In (18a — UI strings):** the existing custom i18n (`src/lib/i18n.tsx` + `src/locales/*`,
~490 keys, tr/en); browser-language detection on first visit; ongoing string extraction;
adding locales by adding a locale object. **No second framework** (no next-intl) — ADR-0019.
**In (18b — content):** translatable JSONB language maps for event name/description (under
the existing `Event.config` JSONB → `config.i18n.<field>`, no migration), email templates,
certificate text; locale-aware public rendering with base-value fallback.
**Out:** machine translation; RTL layout (future).

## Status
- ✅ **Framework (18a):** custom `I18nProvider`/`useT`/`LanguageToggle`, typed keys, `{var}`
  interpolation, tr→key fallback, `localStorage` persistence — in production.
- ✅ **Locale coverage:** ~490 keys, `tr` and `en` balanced.
- ✅ **Browser-language detection:** first visit honors `navigator.language` (else `tr`).
- 📐 **Content i18n (18b):** not started — the substantive remaining work (see below).
- 📐 **Backend end-user messages:** localized where the client cannot.

## Remaining deliverables (18b — content i18n)
- A resolver helper `resolve_i18n(map, lang, fallback)` (single source) on backend + frontend.
- create/update accept `config.i18n.{name,description}` maps; admin UI to enter translations.
- Public read paths (`get_public_event_detail`, `public_event_info`, `list_public_events`)
  resolve by `?lang=`/Accept-Language with fallback. **The cached list (`_pe_cache_key`)
  must include the resolved locale in its key.**
- Language-keyed email template variants.

## Key components
- `heptacert/frontend/src/lib/i18n.tsx`, `src/locales/{tr,en}.ts` — UI i18n (built).
- `heptacert/backend/src/main.py` — public event read paths (18b; keep edits minimal).
- `heptacert/backend/src/email_rendering.py` — language-keyed templates (18b).
- `Event.config` JSONB — content language maps (no migration).

## Acceptance criteria
- Switching locale changes all migrated UI strings; untranslated keys fall back, never crash.
- First-time international visitors see their browser language; choice persists.
- (18b) A public event page renders the requested language and falls back to base; the
  cached list never serves the wrong language.
- Adding a locale requires no code change beyond a locale object (UI) / organizer input (content).

## Dependencies & related ADRs
Upstream: WP14, WP03, WP06. Cross-cutting. See ADR-0019.
