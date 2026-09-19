# WP32 — Progress Log & Handoff

> **Living document.** Any assistant (Claude, Codex, …) or human continuing WP32 starts
> here. The user switches between AI assistants mid-work, so this file — not any
> assistant's private memory — is the source of truth. **Update it in the same commit as
> the work it describes.**
>
> Plan: [WP32-ui-overhaul-landing-onboarding-theming.md](WP32-ui-overhaul-landing-onboarding-theming.md)
> · Theming decision: [ADR-0022](../adr/0022-semantic-color-tokens-and-dark-theme.md)

## Current state

- **Decisions (approved by the user 2026-09-19):**
  - **D1 = (a)** — revive `feat/i18n-public-ssr`; the new landing is the first real
    `[locale]` page (nine languages, per-language search visibility).
  - **D2 = (a)** — real dark theme, token-first and phased; toggle hidden until every
    surface is migrated. ADR-0022 is Accepted.
  - **Translation supply** — no paid service. Default: the assistant doing a phase
    translates the keys that phase adds, into every catalog. Optional automation: DeepL
    API Free (`scripts/i18n-translate.mjs` on the branch already routes `:fx` keys to
    `api-free.deepl.com`).
- **Active phase:** Phase 2 — Unlock more than two languages.
- **Next step** (Phase 2, in order):
  1. `npm run check:ui -- --report lang-indexed-lookup` lists the 37 bare `[lang]`
     lookups; `--report locale-tag-ternary` and `--report locale-tag-literal` list the
     locale-tag sites.
  2. Create `src/lib/localeTag.ts` exporting `localeTag(lang)` → BCP-47 tag (`tr-TR`,
     `en-US`, `de-DE`, `fr-FR`, `es-ES`, `it-IT`, `pt-PT`, `nl-NL`, `ru-RU`). `check:ui`
     already exempts this path from `locale-tag-literal`.
  3. Replace the 55 `? "tr-TR" : "en-US"` switches and the other hardcoded tags with
     `localeTag(lang)`.
  4. Replace the 37 bare `[lang]` lookups with catalog keys (translate every new key into
     all nine catalogs). Where a full migration is too large for this phase, use
     `value[lang] ?? value.en` — the checker does not count that form.
  5. Add a regression test that renders each fixed component with a non-tr/en language
     and asserts it does not crash.
  6. Lock the lower counts: `npm run check:ui -- --update-baseline`, commit the JSON.
- **Also outstanding:** run the Docker-based MCP smoke (see "How to verify") before the
  next production deploy — it could not run during Phase 1 because Docker Desktop was
  stopped.

## Phase status

| Phase | Title | Status | Commits |
|---|---|---|---|
| 0 | Guardrails (`check:ui` ratchet) | ✅ Done | `d7c3cbc` |
| 1 | Revive the multi-language branch | ✅ Done | merge commit "revive nine-language public routing from feat/i18n-public-ssr" |
| 2 | Unlock more than two languages | 🔄 Next | — |
| 3 | Semantic token layer + theme restore | ⏳ Not started | — |
| 4 | Date & time pickers | ⏳ Not started | — |
| 5 | Landing as the first locale-routed page | ⏳ Not started | — |
| 6 | First-run onboarding | ⏳ Not started | — |
| 7 | Surface-by-surface single pass | ⏳ Not started | — |
| 8 | Widen `Lang` in the authenticated app | ⏳ Not started | — |

## Invariants — do not break

1. **Catalog-first strings.** New user-facing text goes into `src/locales/*.ts` and is read
   with `t()` / `useT()`. Never add `lang === "tr" ? … : …`, never add a bare `x[lang]`
   lookup. `npm run check:ui` enforces this in CI.
2. **Every catalog, every key.** A phase that adds keys translates them into every catalog
   in the same commit, preserving `{placeholders}` exactly. `check:ui` verifies parity.
3. **Transactional URLs never move** under a locale prefix: `/verify`, `/verify-email`,
   `/register`, `/login`, `/admin/*`, `/post`, `/member`, tickets, wallet, `/present`,
   OAuth/auth callbacks. Certificate QR codes, sent emails and OAuth redirect URIs are
   pinned to them. Only marketing pages (home, `/events` list, `/marketplace`, `/discover`,
   `/pricing`, `/organizations`) move.
4. **White-label hosts** keep serving the organization page at `/`; never redirect them
   into a locale prefix.
5. **No half-themed surfaces.** The theme toggle stays hidden until Phase 7 completes; a
   surface is migrated to semantic tokens completely or not at all.
6. **Picker value contracts are fixed:** `YYYY-MM-DD`, `HH:mm`, `YYYY-MM-DDTHH:mm` (naive
   local). Replacing a native input must not change what is sent to the backend.
7. **Compare branches with three dots:** `git diff main...feat/i18n-public-ssr`. The
   two-dot form shows `main`'s newer work as deletions and overstates the branch ~40×.
8. **Never hand-merge `package-lock.json`** — regenerate with `npm install`, then run
   `npm audit --omit=dev --audit-level=high` (CI blocks on high).
9. **`next.config.mjs` must keep** `output: "standalone"`, the `/mcp` + OAuth
   `.well-known` rewrites, and the security headers. `src/test/nextConfig.test.ts` guards
   this.
10. **Commit directly to `main` and push** — the user does not want PRs for this work.
    `test-and-deploy.yml` has no deploy job, so pushing only runs CI; production deploys
    are manual.
11. **The `check:ui` baseline only goes down.** When a count drops, lock it in with
    `npm run check:ui -- --update-baseline` and commit
    `heptacert/frontend/scripts/ui-contracts-baseline.json`. Never edit the numbers upward
    by hand; when a path is fully migrated, add it to `cleanPaths` in that JSON.

## How to verify (commands)

Frontend (`heptacert/frontend`):

```bash
npm ci
npm run check:ui                          # ratchet + catalog checks
npm run check:ui -- --report <rule-id>    # per-file counts for one rule
npm test                                  # vitest + jsdom
npx tsc --noEmit
npm run build
```

Backend (`heptacert/backend`, Python 3.12) — same env as CI (`.github/workflows/test.yml`):

```bash
DATABASE_URL="sqlite+aiosqlite:///" JWT_SECRET="ci-test-jwt-secret-32chars-minimum!!" \
EMAIL_TOKEN_SECRET="ci-test-email-token-secret-padded" \
BOOTSTRAP_SUPERADMIN_EMAIL="super@test.com" BOOTSTRAP_SUPERADMIN_PASSWORD="SuperPass123!" \
PUBLIC_BASE_URL="http://localhost:8000" FRONTEND_BASE_URL="http://localhost:3000" \
CORS_ORIGINS="*" STORAGE_MODE="local" LOCAL_STORAGE_DIR="<a temp dir>" \
python -m pytest tests -q        # on Windows: py -3.12 -m pytest tests -q
```

Docs (`heptacert/docs`): `npm run check:links`. On **Windows the local `npm run build`
fails** because Nextra treats the `c:` drive letter as a URI scheme — that is not a code
error. Verify the production docs build with `docker build heptacert/docs` and curl the
pages from the running image (use `curl --retry-all-errors`; Docker's port proxy accepts
connections before the app listens).

MCP smoke (after any `next.config.mjs` / `middleware.ts` change): run the standalone
frontend image on the compose network and confirm `/` → 200, OAuth discovery → 200, and an
unauthenticated `/mcp` request → 401.

## Log

Newest first. Each entry: what changed, why, evidence, gotchas, next step.

### 2026-09-19 — Phase 1 done: multi-language branch merged into `main`

- **Merged** `feat/i18n-public-ssr` with `git merge --no-ff` (a merge commit, so the
  branch's seven commits keep their history). The three predicted conflicts were resolved
  as planned:
  - `heptacert/frontend/package.json` — `main`'s side plus `next-intl ^4.14.5` (resolved
    4.14.5; peers `next ^15`, `react ^18`) and the `i18n:translate` /
    `i18n:translate:dry` scripts.
  - `heptacert/frontend/package-lock.json` — `main`'s side regenerated with
    `npm install` (+27 packages); `npm audit --omit=dev --audit-level=high` → 0
    vulnerabilities.
  - `docs/work-packages/README.md` — kept WP28 (data retention); the branch's i18n
    packages are now **WP33–WP36** (files renamed; every cross-reference inside them and
    in `docs/reference/I18N_INTERNATIONALIZATION_PLAN.md` updated).
- **Regression caught in the merge and fixed.** The branch added
  `export const config = { matcher: [...] }` to `middleware.ts`, skipping every path that
  contains a dot. `main` has no matcher, and `LEGACY_TOKEN_ROUTES` redirects URLs whose
  itsdangerous tokens (`payload.timestamp.signature`) contain dots — the matcher would
  have silently disabled those redirects in production. The matcher is removed (next-intl
  only needs the locale-prefixed paths, which the middleware already delegates) and
  `src/test/middleware.test.ts` now pins both the redirect and the absence of a matcher.
- **Branch files brought up to the Phase 0 contract.** The pilot page and
  `LanguageSwitcher` added 10 light-only color utilities → moved to `surface-*`. The
  switcher's hardcoded English label → new catalog key `language_switcher_label`.
- **Catalogs.** 188 keys translated into `de`, `fr`, `es`, `it`, `pt`, `nl`, `ru` (187
  added to `main` since July plus the new label). All nine catalogs now hold 678 keys with
  matching placeholders. Each target file gained 200 lines and lost 0 — no existing
  translation changed. Conventions to keep: `de`/`fr`/`nl` formal (Sie/vous/u), `es`/`it`
  informal (tú/tu), `pt` is European Portuguese ("Iniciar sessão", "A carregar…"). Counted
  strings use a "Label: {count}" form, because there is no plural support yet and
  "{count} votes" reads wrongly for 1.
- **Test infrastructure.** `vitest.config.mts` inlines `next-intl` (its ESM build imports
  `next/server` without an extension, which Node's resolver rejects).
  `src/test/nextConfig.test.ts` handles the plugin-wrapped `NextConfig` type and now also
  asserts the security headers survive the wrap.
- `src/lib/i18n.tsx`: the branch's comment said `Lang` stays tr/en "by design"; it now
  says it stays tr/en until WP32 Phase 8.
- **Verification:** `npm run check:ui` ✓ (every baseline unchanged; nine catalogs
  consistent) · `npm test` 27/27 · `npx tsc --noEmit` ✓ · production build ✓ ·
  end-to-end smoke **23/23** on the real standalone server: `/` 200; `/pricing` keeps its
  own 307 → `/pricing/business` (200) — that redirect is in `src/app/pricing/page.tsx`,
  not new; `/{tr,en,de,fr,es,it,pt,nl,ru}/i18n-pilot` 200 with localized titles (de and
  ru asserted), `hreflang` alternates and a `/de` canonical; `/xx/i18n-pilot` 404; a
  dotted legacy token URL 307 → `/verify-email?token=…` with the token intact;
  `POST /mcp` proxied to the backend (401); OAuth discovery proxied (200); `POST` to a
  page still 405; `X-Frame-Options` present.
- **Gotcha (local only):** building on this machine nests the standalone entry at
  `.next/standalone/OneDrive/Masaüstü/heptapus-certs/heptacert/frontend/server.js`,
  because Next picks a higher output-tracing root from another lockfile in the home
  directory. The Docker build context is the frontend folder, so there it stays at
  `.next/standalone/server.js`.
- **Not run: the Docker-based MCP smoke** — Docker Desktop was stopped. It was replaced by
  a smoke of the real standalone server (`node .next/standalone/server.js`) built with
  `NEXT_SERVER_API_BASE` pointing at a local mock backend, which exercises the same
  rewrites. Run the Docker smoke before the next production deploy.
- **Next:** Phase 2 — see "Next step" above.

### 2026-09-19 — Phase 0 done: `check:ui` guardrail

- **Added** `heptacert/frontend/scripts/check-ui-contracts.mjs`, its baseline
  `scripts/ui-contracts-baseline.json`, and `src/test/uiContracts.test.ts`. Exposed as
  `npm run check:ui` and wired into both workflows right after the TypeScript check
  (`test.yml` → frontend-lint, `test-and-deploy.yml` → frontend-build).
- **Rules and baselines.** From now on the checker is the authoritative measure; its
  numbers differ slightly from the plan's first hand count.

  | Rule | Baseline | What it counts |
  |---|---|---|
  | `lang-binary-check` | 587 | `lang`/`locale` compared with `"tr"`/`"en"`, incl. `.startsWith("tr")` |
  | `lang-indexed-lookup` | 37 | bare `x[lang]` — crashes on a third language (deps arrays and `?? fallback` excluded) |
  | `locale-tag-ternary` | 55 | `? "tr-TR" : "en-US"` |
  | `locale-tag-literal` | 165 | any hardcoded `"tr-TR"`/`"en-US"` (future `src/lib/localeTag.ts` exempt) |
  | `native-date-input` | 14 | `type="date"`, `"datetime-local"`, `"time"`, `"month"`, `"week"` in `.tsx` |
  | `raw-hex-color` | 80 | `[#abc]` arbitrary values and quoted hex strings in `.tsx` |
  | `light-only-color` | 3524 | `bg-white`, `*-gray-*`, `*-slate-*` utilities |

- **Semantics.** A rise fails CI and prints the rule's fix. A drop also fails until it is
  locked in with `--update-baseline`, which refuses to raise any count. `cleanPaths` in the
  baseline JSON lists paths that must have zero matches for every rule — add each fully
  migrated path (for example `src/app/[locale]` in Phase 5).
- **Catalog checks.** `tr`/`en` key parity (677 each), no empty or duplicate keys,
  identical `{placeholders}`, unparseable lines reported. Locales listed in
  `src/i18n/routing.ts` (exists from Phase 1) must be complete; other extra locales only
  warn. Currently clean.
- **Scan scope.** `src/**/*.{ts,tsx}` excluding `src/test`, `src/locales`, `_archive_lms`
  and `*.test.*` / `*.spec.*`.
- **Measurement correction.** Crash-prone `[lang]` lookups are **37**, not 14 — named
  lookups such as `label[lang]` (13) and `item[lang]` (5) were missed. Plan updated.
- **Verification.** `npm test` 22/22 (15 new ratchet tests) · `npx tsc --noEmit` clean ·
  `npm run build` exit 0 · a deliberate-violation probe (`lang === "tr"` plus
  `type="date"`) failed on both rules, `--update-baseline` refused to raise, and the check
  passed again once the probe was removed.
- **Gotcha.** In Git Bash on Windows, `node -e` strings and heredocs mangle regex
  backslashes. Put Node snippets in a file.
- **Phase 1 prep (read-only).** The branch's `package.json` only adds `next-intl ^4.13.0`
  and two `i18n:translate*` scripts. `main` has since moved `next` to 15.5.25 and added
  test tooling, `sharp` and a top-level `postcss` override. next-intl 4.14.5 (latest 4.x)
  declares `next ^15` and `react ^18` as peers, so it is compatible.
- **Next:** Phase 1 — see "Next step" above.

### 2026-09-19 — Plan approved, work started

- **Plan written and approved.** WP32 (nine phases) and ADR-0022 (semantic color tokens and
  dark theme, now Accepted). Commit "plan WP32 UI overhaul and wire AI handoff notes"
  (`400f78d`), measured against `main` at `6d162ed`.
- **Key measurements:** see the Phase 0 table above for the authoritative numbers. Also:
  ≈3088 token-based color utilities; 158 dead `dark:` utilities; dark mode force-disabled
  in `_theme-initializer.tsx`; the design-system pickers
  (`components/Admin/{DateField,TimeField,DateTimeField}.tsx`) are used in only 4 files;
  catalog 677 keys, ≈15.7k characters in `en.ts`; the branch's seven extra catalogs have
  490 keys, so each is ~187 keys short after the merge.
- **Branch measured correctly:** `feat/i18n-public-ssr` is 7 commits ahead / 25 behind,
  26 files, +5120/−112. A trial `git merge-tree` into `main` gives three mechanical
  conflicts: frontend `package.json`, `package-lock.json`, `docs/work-packages/README.md`.
- **Correction recorded:** an earlier draft (as "WP29") claimed the branch would revert
  test files and implied a ~199-file migration. That came from a two-dot diff; see
  invariant 7.
- **Handoff wiring:** `AGENTS.md`, `CLAUDE.md` and `.cursorrules` (all generated once by
  codesight, no config) carry a hand-maintained "Active work" pointer to this file.
  Restore it if codesight regenerates them.
