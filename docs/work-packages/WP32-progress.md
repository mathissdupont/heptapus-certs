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
- **Active phase:** Phase 0 — Guardrails.
- **Next step:** implement `heptacert/frontend/scripts/check-ui-contracts.mjs` with a
  baseline file, unit tests, `npm run check:ui`, and CI wiring (see Phase 0 in the plan).

## Phase status

| Phase | Title | Status | Commits |
|---|---|---|---|
| 0 | Guardrails (`check:ui` ratchet) | 🔄 In progress | — |
| 1 | Revive the multi-language branch | ⏳ Not started | — |
| 2 | Unlock more than two languages | ⏳ Not started | — |
| 3 | Semantic token layer + theme restore | ⏳ Not started | — |
| 4 | Date & time pickers | ⏳ Not started | — |
| 5 | Landing as the first locale-routed page | ⏳ Not started | — |
| 6 | First-run onboarding | ⏳ Not started | — |
| 7 | Surface-by-surface single pass | ⏳ Not started | — |
| 8 | Widen `Lang` in the authenticated app | ⏳ Not started | — |

## Invariants — do not break

1. **Catalog-first strings.** New user-facing text goes into `src/locales/*.ts` and is read
   with `t()` / `useT()`. Never add `lang === "tr" ? … : …`, never add a
   `{ tr: …, en: … }[lang]` map. `check:ui` enforces this once Phase 0 lands.
2. **Every catalog, every key.** A phase that adds keys translates them into every catalog
   in the same commit, preserving `{placeholders}` exactly.
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

## How to verify (commands)

Frontend (`heptacert/frontend`):

```bash
npm ci
npm test                 # vitest + jsdom
npx tsc --noEmit
npm run build
npm run check:ui         # from Phase 0 onward
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

### 2026-09-19 — Plan approved, work started

- **Plan written and approved.** WP32 (nine phases) and ADR-0022 (semantic color tokens and
  dark theme, now Accepted). Both were measured against `main` at `6d162ed`.
- **Key measurements** (re-measure before each phase):
  - 14 `{ tr, en }[lang]` maps (crash on a third language); 583 binary `lang` checks in
    134 files; 43 `tr-TR`/`en-US` switches.
  - ≈3088 token-based vs ≈3350 hardcoded light-only color utilities; 158 dead `dark:`
    utilities; dark mode force-disabled in `_theme-initializer.tsx`.
  - 14 native date/time inputs in 7 files; the design-system pickers
    (`components/Admin/{DateField,TimeField,DateTimeField}.tsx`) are used in only 4 files.
  - Catalog: 677 keys, ≈15.7k characters (`en.ts`). The branch's seven extra catalogs have
    490 keys, so each is ~187 keys short after the merge.
- **Branch measured correctly:** `feat/i18n-public-ssr` is 7 commits ahead / 25 behind,
  26 files, +5120/−112. A trial `git merge-tree` into `main` gives three mechanical
  conflicts: frontend `package.json`, `package-lock.json`, `docs/work-packages/README.md`.
  The branch's WP28–WP31 docs collide with `main`'s WP28 (data retention) and must be
  renumbered on merge.
- **Correction recorded:** an earlier draft (as "WP29") claimed the branch would revert
  test files and implied a ~199-file migration. That came from a two-dot diff; see
  invariant 7.
- **Handoff wiring:** `AGENTS.md`, `CLAUDE.md` and `.cursorrules` (all generated once by
  codesight, no config) now carry a hand-maintained "Active work" pointer to this file.
  Restore it if codesight regenerates them.
- **Next:** Phase 0 — `check:ui` guardrail.
