# WP32 — UI Overhaul: Landing, Onboarding, Theming & Multi-Language

**Phase:** 6 — Experience · **Status:** 🔄 In progress — D1 (a) and D2 (a) approved 2026-09-19
· **Progress log & handoff:** [WP32-progress.md](WP32-progress.md)
· **Related ADRs:** [0014](../adr/0014-design-system-tailwind-tokens.md),
[0019](../adr/0019-internationalization-architecture.md),
[0021](../adr/0021-international-seo-locale-routed-ssr.md),
[0022](../adr/0022-semantic-color-tokens-and-dark-theme.md) (proposed)

## Objective

Rebuild the public entry experience (landing + first-run onboarding) on the design
system, introduce dark mode as a real maintained theme, replace the browser-native date
and time inputs with one accessible picker family, and make **adding a language a catalog
change rather than a code change**. Today it is the opposite: the codebase is structurally
two-language, and a third language either crashes or silently shows English.

## Measured current state (2026-09-19)

Re-measure before starting a phase.

| Fact | Measurement |
|---|---|
| Landing bypasses the design system | `_home-client.tsx` (726 lines) uses `slate-*` and `bg-[#fafafa]` instead of `surface-*`/`brand-*` |
| Landing copy is not in the catalog | Inline `lang === "tr" ? {...} : {...}`, while `src/locales/{tr,en}.ts` holds `home_hero_*`, `feat_*`, `step*` keys describing an **older** landing — catalog and screen have diverged |
| **`[lang]` lookups — crash on a third language** | 37: 14 inline `{ tr, en }[lang]` maps (all admin: `IssueCertificateModal`, `ImportAttendeeModal`, `EventAdminNav`, `CreateEventDrawer`, `CommandPalette`, `AddAttendeeModal`, `admin/venues`, `admin/reservations`, `admin/dashboard`, …) plus 23 named lookups such as `label[lang]` (13) and `item[lang]` (5). They return `undefined` for any other language. This is why `Lang` is still locked to `"tr" \| "en"` |
| Binary language checks — third language silently falls to English | 587 `lang`/`locale` comparisons against `tr`/`en` (incl. `.startsWith("tr")`), across 134 files |
| Binary locale formatting | 55 `? "tr-TR" : "en-US"` switches; 165 hardcoded `"tr-TR"`/`"en-US"` tags in total |
| Heaviest offenders | `lib/assistant/eventDraft.ts` (48), `admin/events/[id]/settings/page.tsx` (48), `components/Admin/AIAssistant.tsx` (44), `post/[postId]/page.tsx` (25), `admin/superadmin/system-digest/page.tsx` (23) |
| **Native date/time inputs** | 14 browser-native `date` / `datetime-local` / `time` inputs in 7 files: `admin/events/[id]/cfp` (5), `admin/reservations` (2), `admin/training` (2), `admin/accreditation` (2), `admin/crm` (1), `components/Admin/RetentionPolicyFields` (1), and the attendee-facing `events/[id]/networking` (1). They render in the **browser's** locale rather than the app's language and ignore the theme |
| **Design-system pickers exist but are thin** | `components/Admin/{DateField,TimeField,DateTimeField}.tsx`, used in only 4 files (`CreateEventDrawer`, event `settings`, `sessions`, `schedule-email`). No keyboard navigation, no ARIA roles, no Escape-to-close or focus return; hardcoded Turkish strings (`Saat`, `Dakika`, `Temizle`, `Tamam`); minutes limited to 00/15/30/45; hardcoded light colors; 32px day cells; `DateTimeField` computes today's date with `toISOString()` (UTC), which yields yesterday between 00:00 and 03:00 in Turkey |
| Dark mode is force-disabled | `_theme-initializer.tsx` writes `light` and strips `.dark` on every load; `ThemeToggle.tsx` returns `null`; `lib/theme.ts` unused; 158 dead `dark:` utilities in 8 files |
| Colour utilities on tokens | `text-surface-*` 2342 · `bg-surface-*` 746 → ≈3088 |
| Colour utilities hardcoded light-only | `bg-white` 983 · `text-gray-*` 1063 · `border-gray-*` 476 · `bg-gray-*` 306 · `text-slate-*` 311 · `bg-slate-*` 183 · `border-slate-*` 148 → **≈3350** |
| Catalog volume | 677 keys, ≈15.7k characters in `en.ts` (the translation source) |
| Onboarding | Does not exist; a verified organizer meets an empty dashboard |
| Frontend tests | vitest + jsdom; `middleware.test.ts`, `nextConfig.test.ts` only |
| Animation stack | `framer-motion` ^11 only; no `gsap`/`ogl`/`three` |

### The shelved multi-language branch, measured correctly

`feat/i18n-public-ssr` is **7 commits ahead / 25 behind** `main` (merge-base `cf3f62b`,
2026-06-30). Its real change since the merge-base is **26 files, +5120/−112**:

- next-intl v4 infrastructure: `src/i18n/{routing,request,navigation}.ts`,
  `app/[locale]/layout.tsx`, a pilot page, `LanguageSwitcher`, `HtmlLangSetter`;
  `middleware.ts` (+20) delegates **only locale-prefixed paths** to next-intl, so every
  existing un-prefixed route keeps working untouched.
- `request.ts` loads the **same flat catalogs** the authenticated app uses
  (`src/locales/<locale>.ts`) — one source of truth, no forked strings.
- Seven additional catalogs — `de`, `fr`, `es`, `it`, `pt`, `nl`, `ru` — produced without
  a translation API. They hold 490 keys each; `main` has since grown to 677, so each is
  about 187 keys short after the merge.
- A DeepL pipeline (`scripts/i18n-translate.mjs`) that already supports the free API tier.
- Routing: `localePrefix: "always"`, `localeDetection: false`.

A trial merge into `main` (`git merge-tree`) produces **three conflicts, all mechanical**:
`heptacert/frontend/package.json`, `heptacert/frontend/package-lock.json`,
`docs/work-packages/README.md`. `middleware.ts` and `next.config.mjs` auto-merge. The
branch does **not** touch the test infrastructure.

> **Measurement caveat.** Use the three-dot form, `git diff main...feat/i18n-public-ssr`.
> The two-dot form compares the two tips directly, so everything `main` gained since the
> merge-base appears as a deletion — it overstates the branch roughly fortyfold and makes
> it look as if it would revert test files. An earlier draft of this plan made exactly
> that mistake.

## Decisions

### D1 — Multi-language foundation for the new landing

The stated intent is to add languages beyond Turkish and English. That changes the
calculus: the foundation is small and already built, while every page built on the
two-language custom path becomes a page that must be rebuilt at the routing layer later.

| Option | Consequence |
|---|---|
| **(a) — recommended** Revive the branch; the new landing is the first real `[locale]` page | Nine languages with per-language search visibility (`/de`, `/fr`, … with `hreflang`) from the landing's first day. Cost: three mechanical merge conflicts plus the routing rules in Phase 5 |
| **(b)** Build the landing on the custom i18n now, move it later | Unblocks slightly faster, but the landing is built twice at the routing layer, and no language beyond tr/en is visible to search engines until the move |
| **(c)** Abandon ADR-0021 | Rejected — incompatible with adding languages |

### D2 — Dark mode depth

Unchanged: **(a) real dark theme, token-first and phased** (ADR-0022), with the hard rule
that no surface ships half-themed; the toggle stays hidden until the last surface lands.
The alternative worth considering is (b) light-only with the dead machinery deleted; the
current middle state is rejected.

## Translation supply — no paid service required

Translating the entire catalog into the seven other languages is about 110k characters;
the ~187 keys each branch catalog is missing come to about 30k characters across all
seven. The volumes are small enough that no paid service is needed at any point.

| Option | Cost | Fit |
|---|---|---|
| **Claude translates within each phase — recommended default** | No additional cost | Context-aware: product vocabulary, `{placeholders}`, and UI length constraints. The phase that adds keys also delivers their translations |
| DeepL API Free | Free up to 500,000 characters/month (signup may require card verification) | Already supported: `scripts/i18n-translate.mjs` routes keys ending in `:fx` to `api-free.deepl.com`. One month's allowance covers the full catalog in all seven languages about four times over. Use it for automation that does not depend on a Claude session |
| Azure AI Translator, free tier (F0) | Free up to 2M characters/month | Needs a small adapter in the script |
| LibreTranslate (open source, self-hosted) | Free, no account | Lower quality. Run locally only — never on the shared production host |

Free-tier terms are as known at the time of writing; confirm them at signup.

Whatever produces the text, the same safeguards apply: Phase 0's catalog-completeness and
placeholder-parity checks, and **human review** in two places — legal pages (KVKK, terms;
the script itself excludes them from machine translation) and the landing's headline copy
in the markets that matter most.

## Hard routing constraint

Only **marketing** pages move under `[locale]`. Transactional pages whose URLs are pinned
in the outside world must **never** move, or certificate QR codes, emails already sent,
and OAuth redirect URIs break.

| Moves under `[locale]` | Never moves |
|---|---|
| home, `/events` list, `/marketplace`, `/discover`, `/pricing`, `/organizations` | `/verify`, `/verify-email`, `/register`, `/login`, `/admin/*`, `/post`, `/member`, tickets, wallet, `/present`, OAuth/auth callbacks |

White-label hosts serve the organization page at `/` and must not be redirected into a
locale prefix.

## Scope

**In:** reviving `feat/i18n-public-ssr`; removing the crash and binary patterns that lock
the app to two languages; semantic color tokens and a `.dark` theme; an accessible,
themed, language-aware date/time picker family replacing every native input; the landing
rebuilt as the first locale-routed page; a first-run organizer onboarding flow; a
surface-by-surface single pass that migrates colors and strings together; widening `Lang`
for the authenticated app; CI guards that stop all of these debts from regrowing.

**Out:** content i18n (organizer-authored text, WP18 / 18b); RTL layout; an admin
information-architecture redesign; any paid translation service.

## Phases

Each phase is independently shippable and revertable.

### Phase 0 — Guardrails (no visible change)

1. Add `heptacert/frontend/scripts/check-ui-contracts.mjs`, modeled on the existing
   `heptacert/docs/scripts/check-links.mjs`, as `npm run check:ui`, wired into both
   workflows. It fails on:
   - binary language checks above a recorded baseline (ratchet: count can only fall);
   - any **new** `{ tr: …, en: … }[lang]` map;
   - binary `tr-TR`/`en-US` locale switches above baseline;
   - native `type="date" | "datetime-local" | "time"` inputs above baseline (locked to
     zero after Phase 4);
   - off-token color utilities in paths on the migrated allowlist;
   - raw hex colors in `.tsx` (already disallowed by ADR-0014);
   - **catalog completeness**: a locale may only be listed in `routing.ts`, the sitemap,
     and `hreflang` if it contains every key the locale-routed pages use;
   - **placeholder parity**: every translation keeps exactly the `{var}` placeholders of
     its English source.
2. Record today's baselines in the script.

**Verify:** passes on `main` at baseline; fails on a deliberate violation of each rule.

### Phase 1 — Revive the multi-language branch

1. Bring `feat/i18n-public-ssr` up to date with `main` (rebase its 7 commits, or merge
   `main` into it).
2. Resolve the three conflicts:
   - `package.json`: keep `main`'s `next` (15.5.25), add `next-intl` ^4; confirm the
     next-intl version supports that Next release.
   - `package-lock.json`: **regenerate with `npm install`**, never hand-merge; then
     `npm audit --omit=dev --audit-level=high` (CI blocks on it).
   - `docs/work-packages/README.md`: combine entries and **renumber the branch's
     WP28–WP31** — `WP28` is already data retention on `main`.
3. Translate the ~187 keys each of the seven branch catalogs is missing, so every locale
   passes the completeness check from day one.
4. Re-verify the auto-merged `next.config.mjs`: the next-intl plugin wraps the config and
   must preserve `output: "standalone"`, the MCP/OAuth rewrites and the security headers.
5. Re-verify the auto-merged `middleware.ts`: white-label redirects, method gating and
   legacy token routes still run for un-prefixed paths.

**Verify:** `npm test` (`nextConfig.test.ts` guards the rewrites; `middleware.test.ts`
the redirects) · `npx tsc --noEmit` · production build · `/{tr,en,de,…}/i18n-pilot`
render in all nine languages · every un-prefixed route unchanged · the Docker MCP smoke
still returns 401 unauthenticated.

### Phase 2 — Unlock more than two languages

1. Replace the 37 `[lang]` lookups (14 inline `{ tr, en }[lang]` maps and 23 named ones
   such as `label[lang]`) with catalog keys. Where a full migration is not yet done, the
   interim guard is `value[lang] ?? value.en` — never a bare index. `check:ui` counts bare
   indexes only, so the guarded form lowers the count.
2. Replace the 55 `tr-TR`/`en-US` switches, and the other hardcoded tags, with one helper
   at `src/lib/localeTag.ts` that derives the BCP-47 tag from the active language; `Intl`
   already handles all nine. (`check:ui` already exempts that path.)
3. Add a regression test that renders each fixed component with a language other than
   `tr`/`en` and asserts it does not crash.

**Verify:** that test · `check:ui` shows zero `[lang]` maps and a lower locale-switch count
· tsc · build.

### Phase 3 — Semantic token layer + theme restore

1. Role variables on bare `:root` (canvas/raised/sunken, primary/muted content,
   subtle/strong borders, accent, success/warning/danger); redefine only those under
   `.dark`.
2. Re-express the `globals.css` component layer (`.card`, `.btn-*`, `.input`, `.badge-*`,
   banners, `.table-*`, `.sidebar-item`, `.empty-state`, `.skeleton`) in roles; map the
   `surface-*` scale onto them, so the ≈3088 token-based utilities follow the theme.
3. Replace `_theme-initializer.tsx`'s hard-coded `light` with a pre-paint script that reads
   the stored preference and `prefers-color-scheme`; restore a real `ThemeToggle` on the
   existing `lib/theme.ts`, **hidden behind a flag** until Phase 7 completes.
4. Runtime white-label `--site-brand-color` must still override the accent in both themes.

**Verify:** component tests asserting the role variables flip under `.dark`; one
token-pure admin screen reviewed in both themes; tsc; build.

### Phase 4 — Date & time pickers

One accessible, themed, language-aware picker family, and zero native date/time inputs.

1. **Calendar grid:** adopt `react-day-picker` (v9) inside the existing `DateField`
   trigger/popover, so call sites keep their API. It provides the WAI-ARIA grid pattern
   (arrow, Home/End, PageUp/PageDown navigation, `aria-selected`) and, through `date-fns`
   locales, month/day names and week start for all nine languages. If a new dependency is
   unwanted, the alternative is hardening the existing grid by hand — it then has to
   implement exactly that list.
2. **`TimeField`:** configurable `minuteStep` (default 5, today fixed at 15); typed entry
   as well as list selection; 24h/12h from the active language's `Intl` hour cycle.
3. **Popover shell:** Escape closes and returns focus to the trigger; `aria-expanded` and
   `aria-haspopup` on the trigger; the label is associated with the control; the panel
   flips above the trigger when there is no room below; day cells reach a 40px touch
   target on small screens (today 32px).
4. **Ranges:** `min`/`max` props so paired fields — reservation start/end, CFP opens/closes,
   training due/renewal, session start/end — cannot produce an end before its start.
5. **Fix `DateTimeField`'s default date** to use local time instead of `toISOString()`.
6. **Keep the native value contracts** — `YYYY-MM-DD`, `HH:mm`, `YYYY-MM-DDTHH:mm` (naive
   local) — so replacing native inputs needs no backend or API change.
7. Replace all 14 native inputs, starting with the attendee-facing
   `events/[id]/networking`, then `cfp` (5), `reservations` (2), `training` (2),
   `accreditation` (2), `crm` (1), `RetentionPolicyFields` (1).
8. Catalog strings only (removes `Saat`, `Dakika`, `Temizle`, `Tamam`, `Tarih seçin` and the
   `locale.startsWith("tr")` switches); semantic tokens; both themes.

**Verify:** keyboard tests (arrows move focus, Enter selects, Escape closes and restores
focus) · value-contract round-trip tests for all three formats · a non-tr/en language
renders localized month names and week start · `check:ui` reports zero native date/time
inputs · manual check on a touch device and at 400px.

### Phase 5 — Landing as the first locale-routed page

1. Build the landing at `app/[locale]/page.tsx`, split into section components; the
   white-label organization page stays a separate component at `/`.
2. Author copy once as flat keys, reconciling and deleting the stale `home_*` / `feat_*` /
   `step*` keys, and translate it into all nine catalogs in the same phase. Missing keys
   fall back to English at runtime, but an incomplete locale is never advertised to search
   engines (Phase 0 completeness check).
3. Per-locale `generateMetadata`, `hreflang` alternates, canonical URLs, `<html lang>`, and
   sitemap entries.
4. Root routing: on the primary host, `/` redirects to `/tr` (permanent, so existing links
   and search results carry over); on white-label hosts `/` is **not** redirected.
5. The `[locale]` layout reuses the public shell (navigation, footer), with the
   branch's `LanguageSwitcher` replacing the two-way `LanguageToggle` on public pages.
6. Semantic tokens only; no inline language checks; no `slate-*`.
7. Motion — premium light kept, animation added with restraint: effects buildable on
   `framer-motion` alone (staggered and mask reveals, magnetic buttons, spotlight
   borders, count-up stats, tilt). Adding `gsap`/`ogl`/`three` is a separate, explicit
   decision. Every effect guards `prefers-reduced-motion`; the hero must not delay LCP.
8. Keep the real data wiring (`/branding`, `/public/organizations/:id`, `/stats`).

**Verify:** section tests · all nine locales render · `hreflang`/canonical present ·
`/` redirects on the primary host and does not on a white-label host · both themes ·
400px with no sideways scroll · `check:ui` · build.

### Phase 6 — First-run onboarding

1. After verification/OAuth, a new organizer enters a guided run: organization profile
   (name, logo, brand color) → first event using the WP17 type presets → the single next
   action.
2. Resumable and skippable; progress derived from **real server state** (has organization,
   has event, has certificate) rather than a stored flag — self-healing, no migration.
3. Reconcile with `components/Admin/EventSetupChecklist.tsx` rather than duplicating it.
   Dedicated route for the first run, dashboard checklist thereafter.
4. Authenticated surface → custom i18n, catalog-first; date inputs use the Phase 4 pickers.

**Verify:** step-gating and resume tests; a manual run on a fresh organizer; backend tests
if any endpoint changes.

### Phase 7 — Surface-by-surface single pass

Each file is opened **once** and leaves both token-pure and catalog-first — migrating
colors and strings in separate passes would touch the same hundreds of files twice.

Order: public shell → auth → admin shell + dashboard → high-traffic admin (events,
attendees/certificates, email) → remaining admin + superadmin → public secondary. As each
marketing page is touched it moves under `[locale]` with a permanent redirect from its old
path; transactional pages stay put (see the routing constraint).

Plain modules cannot use hooks: `lib/assistant/eventDraft.ts` (48) and `wizard.ts` (15)
need a non-hook translator taking an explicit language, or their strings lifted into
callers. Decide once at the start of this phase and apply it uniformly.

Orphan `dark:` utilities are deleted as their files migrate. The theme toggle is unhidden
only when every surface is done.

**Verify per wave:** `check:ui` baselines fall · both themes reviewed · language switch
exercised · tests · tsc · build.

### Phase 8 — Widen `Lang` in the authenticated app

Once the binary-check ratchet reaches zero for authenticated surfaces, extend the `Lang`
union in `src/lib/i18n.tsx` to all catalogs. The admin then works in every language the
catalogs cover, with no further code change — the goal stated in the objective.

**Verify:** the admin renders in a non-tr/en language without crashing or falling back
silently; tests; build.

## Acceptance criteria

- Adding a new language requires only a catalog file and a `routing.ts` entry — no
  component edits. Demonstrated by the nine existing catalogs working end to end.
- The landing is served at locale-prefixed URLs with correct `hreflang`, canonical and
  metadata, and only complete locales are advertised.
- No transactional URL has moved; certificate QR codes, emailed links and OAuth callbacks
  keep resolving.
- White-label hosts still serve their organization page at `/`.
- No native date/time input remains; every picker is keyboard-operable, speaks the app's
  language, follows the theme, and keeps the original value format.
- Dark mode can be toggled and every shipped surface is fully themed; no surface is
  half-dark at any point.
- A new organizer reaches a guided first run that resumes from real server state.
- `check:ui` passes with every baseline strictly below the Phase 0 values, and zero
  bare `[lang]` lookups.
- `npm test`, `npx tsc --noEmit`, `npm run build`, the backend suite, and the Docker MCP
  smoke all pass.

## Risks

- **Translation quality where it matters most.** Volume is not the problem (see
  Translation supply); review is. Legal pages and the landing headline need a human pass.
- **URL changes.** Moving marketing pages under `[locale]` changes their URLs; permanent
  redirects and `hreflang` preserve search standing, and the routing constraint protects
  transactional URLs.
- **Custom pickers on touch devices.** Native pickers are good on phones; a custom one must
  match them. The 40px target and touch verification in Phase 4 exist for this reason.
- **Scope drift into an admin redesign.** Phase 7 touches hundreds of files; it migrates
  colors and strings, not layout.
- **Half-themed shipping.** Prevented by the Phase 3 flag and the Phase 7 complete-surface
  rule.
- **Motion cost on the landing.** New animation dependencies are a decision, not an
  incidental import.
- **Debt regrowth.** Phase 0's ratchet is what prevents this plan from being written again.

## Key components

- `heptacert/frontend/src/i18n/*`, `src/app/[locale]/*`, `src/middleware.ts`,
  `next.config.mjs` — locale routing (from the branch)
- `heptacert/frontend/src/lib/i18n.tsx`, `src/locales/*.ts`,
  `scripts/i18n-translate.mjs` — shared catalogs and translation pipeline
- `heptacert/frontend/src/app/globals.css`, `tailwind.config.ts` — token layer
- `heptacert/frontend/src/app/_theme-initializer.tsx`, `src/lib/theme.ts`,
  `src/components/ThemeToggle.tsx` — theming
- `heptacert/frontend/src/components/Admin/{DateField,TimeField,DateTimeField}.tsx` —
  picker family
- `heptacert/frontend/src/app/_home-client.tsx`, `src/app/page.tsx` — current landing
- `heptacert/frontend/src/app/_client-shell.tsx`, `src/app/admin/_admin-layout-shell.tsx`
  — shells
- `heptacert/frontend/src/app/register/_register-hub.tsx`,
  `src/app/admin/dashboard/page.tsx`, `src/components/Admin/EventSetupChecklist.tsx` —
  onboarding surface
- `heptacert/frontend/scripts/check-ui-contracts.mjs` (new) — guardrail

## Dependencies & related ADRs

Upstream: WP14 (design system), WP17 (event type presets, reused by onboarding), WP18
(i18n framework). Executes ADR-0021 for the landing and marketing pages; depends on
ADR-0022 for theming.
