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
- **Active phase:** Phase 7 — surface-by-surface theme and translation migration.
- **Urgent security interruption (2026-09-22):** The event-ID tenant isolation fix is
  implemented and locally verified. On 2026-09-23 the product owner reported completing
  the live owned-event and foreign-event security check successfully. This is an owner
  attestation; no credentials or raw production trace were retained in the repository.
- **Next step** (Phase 7, in order):
  1. Hold legal/contract UI changes until their Turkish source and translations can be
     reviewed. The user requested unpublished drafts because no legal reviewer is
     available. Draft the remaining routes under `docs/drafts/legal/` if useful, but
     do not wire unapproved terms into the app. The six routes are:
     `/kullanim-kosullari`, `/gizlilik`, `/kvkk`, `/mesafeli-satis`, `/iade` and
     `/acik-riza`. They currently serve English to the seven non-TR/EN locales and must
     not be called complete merely because machine-readable catalog parity passes.
  2. Continue through auth, admin shell + dashboard, then high-traffic event,
     attendee/certificate and email surfaces, lowering both UI debt ratchets after each
     independently verifiable wave.
  3. Define the non-hook translator contract needed by `lib/assistant/eventDraft.ts` and
     `lib/assistant/wizard.ts` before migrating either plain module.
  4. Keep transactional routes unprefixed, the theme toggle hidden, and LMS archived.
- **Translation coverage audit (added at the user's request):** catalog parity alone was
  hiding the real gap. The current ratchet records **496 legacy TR/EN binary branches**;
  those branches send the other seven languages to English. The latest precise per-file
  inventory should be read from `npm run i18n:audit` before choosing each wave.
  Phase 7/8 must drive that queue to zero and review remaining user-facing literals before
  nine-language coverage can be called complete. The largest starting files are event
  settings (56), `lib/assistant/eventDraft.ts` (48), and `AIAssistant.tsx` (45).

## Phase status

| Phase | Title | Status | Commits |
|---|---|---|---|
| 0 | Guardrails (`check:ui` ratchet) | ✅ Done | `d7c3cbc` |
| 1 | Revive the multi-language branch | ✅ Done | `df28bad` |
| 2 | Unlock more than two languages | ✅ Done | `980ca3a` + "unlock nine-language application selector" |
| 3 | Semantic token layer + theme restore | ✅ Done | "restore semantic theming behind rollout flag" |
| 4 | Date & time pickers | ✅ Done | "replace native date/time inputs with localized pickers" |
| 5 | Landing as the first locale-routed page | ✅ Done | "rebuild landing for all nine locales" |
| 6 | First-run onboarding | ✅ Done | "build server-derived organizer onboarding" |
| 7 | Surface-by-surface single pass | 🚧 In progress | "localize the public shell in all nine languages"; public directories wave |
| 8 | Widen `Lang` in the authenticated app | 🟡 Type/selector delivered early; catalog migration remains | "unlock nine-language application selector" |

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

### 2026-09-24 — mobile landing hierarchy and navigation repair

- Reworked the locale landing's phone layout instead of scaling down the desktop
  composition. The hero now has compact mobile spacing, full-width primary actions,
  a three-metric live-operations preview, a horizontal snap carousel for capabilities,
  denser proof stats and touch-friendly step/CTA cards. A real 390px browser viewport
  reports `scrollWidth === innerWidth` (390px), so the page has no horizontal overflow.
- Replaced the public shell's narrow-screen horizontal link strip with an accessible
  menu button (`aria-expanded` / `aria-controls`) and a two-column menu containing all
  discovery, pricing and verification destinations plus login and registration actions.
  The language control collapses to its locale code on phones and keeps the full native
  language name from the `sm` breakpoint upward.
- Rebalanced the landing message away from certificates: the hero now positions
  HeptaCert as an end-to-end event operation covering registration, e-mail, QR check-in,
  CRM, analytics, reporting and verifiable outputs. Added three product-preview labels
  to every catalog; all nine catalogs remain aligned at **819 keys**.
- Verification: `npm run check:ui` ✓ · focused landing tests **3/3** ✓ · TypeScript ✓ ·
  production build (132 static pages) ✓ · manual 390×844 viewport and open-menu captures
  reviewed. Transactional links remain unprefixed; no routing, backend or theme-toggle
  contract changed.
- **Next:** continue Phase 7 through the authenticated admin/event surfaces. Legal drafts
  remain unpublished pending review; LMS remains archived.

### 2026-09-23 — plain-language essential-storage notice

- Replaced the cookie banner's implementation detail (`localStorage`) and misleading
  accept/decline choice with a plain-language notice: HeptaCert uses only technology
  needed to secure the session and remember preferences, and does not currently use
  advertising or visitor tracking. One acknowledgement action now dismisses it.
- Added five catalog-first strings in all nine languages (**816 keys per locale**). The
  authenticated/unprefixed shell uses the existing app translator; locale-prefixed
  public pages use the existing next-intl translator, so the notice follows the selected
  language in both routing systems. The privacy link remains unprefixed.
- No third-party analytics was added during the current legal/UI cleanup. A future
  analytics project should define its measurement need and privacy posture first; it is
  not implied by this notice.
- Focused notice/layout tests **4/4**, full frontend tests **90/90**, TypeScript,
  `check:ui` and the production build (132 static pages) passed.

### 2026-09-23 — admin floating-overlay collision fix

- Fixed the post-login collision between the cookie notice, mobile bottom navigation,
  AI assistant and in-app tour. The cookie notice now publishes its measured live height
  as a shared CSS safe-area variable; the navigation, launchers and open panels all move
  above it and react to resize/content changes.
- The assistant and tour launchers now have separate horizontal positions. Opening one
  broadcasts a small client-only event that closes the other, so their panels cannot
  compete for the same screen area. The tour card is width-safe and height-bounded on
  narrow viewports.
- Migrated the cookie notice's existing colors to semantic tokens. No user-facing copy,
  route or API contract changed. The `light-only-color` ratchet improved **3348 → 3333**;
  all nine catalogs remain aligned at **811 keys**.
- Regression coverage verifies the measured cookie offset, offset cleanup after consent,
  widget-open event lifecycle and the shared CSS/component class contract. Verification:
  focused tests **3/3**, full frontend tests **89/89**, TypeScript, `check:ui` and local
  production build (132 static pages) passed.
- **Next:** continue Phase 7 through the remaining authenticated admin/event surfaces.
  Legal drafts remain unpublished pending review; LMS remains archived.

### 2026-09-22 — MCP OAuth resource-binding interruption

- The unprefixed `/oauth/authorize` consent client now carries the incoming OAuth
  `resource` parameter through server-side validation and approval. No new UI text or
  locale keys were added; transactional URL routing remains unchanged.
- This is part of WP37's MCP security completion, not Phase 7 translation progress.
  Continue Phase 7 at the legal-draft review gate and authenticated surfaces listed
  above after the MCP integration has been deployed and checked in ChatGPT.

### 2026-09-22 — general event information export in Reports

- Added a one-off **Event information report** to `/admin/reports`, separate from scheduled reports. It loads only events available to the signed-in organizer, re-reads the selected event through the authorized detail endpoint, previews a plain-text report and supports copy or UTF-8 `.txt` download. The report includes known title, date, type, location, plain-text description and eligible public/registration URLs; it never invents start/end times, host OU or destination-specific category. Private events, disabled/closed registration and mismatched event IDs cannot produce misleading handoff links. Changing organization context clears the previous preview.
- This is deliberately **platform-neutral**: it can help a user enter event details into IEEE vTools or another service, but it is not vTools SSO, a write integration or an automatic event transfer. The authorized user still reviews and publishes in the destination system. No backend, database, attendee PII or IEEE credentials are involved.
- All 18 new UI/report labels are present in all nine catalogs (**811 keys per locale**). Focused report/UI tests **7/7**, full frontend tests **78/78**, TypeScript, `check:ui` and local production build passed. The report page's older scheduled-report copy/theme debt remains in the Phase 7 queue; this card itself uses catalog strings and semantic tokens.
- **Next:** after the user's manual deploy, verify the event-ID isolation fix with owned and foreign accounts. Continue the Phase 7 auth/admin migration; legal drafts remain unpublished and LMS archived.

### 2026-09-22 — held legal draft and read-only IEEE vTools preview

- The product owner confirmed there is no legal reviewer yet and asked for drafts to
  remain unpublished. Added a held seven-language [`/iade` draft](../drafts/legal/iade-nine-language-draft.md)
  outside `src/app` and `src/locales`; live legal pages are unchanged. It preserves the
  current Turkish source while flagging the Turkish/English payment-method mismatch and
  unverified refund/cancellation terms. The other five legal routes remain undrafted.
- The [vTools assessment](../reference/IEEE_VTOOLS_INTEGRATION_FEASIBILITY.md) now has a
  working read-only `python -m src.vtools_events <event-id>` preview. The official public
  v8 list endpoint returned a published sample event by exact ID; the adapter maps title,
  local date (IANA time zone), plain-text description, venue, source OU and official URL.
  It rejects unpublished/cancelled/wrong IDs, never accepts an arbitrary fetch URL, and
  performs no tenant mapping, attendee import or database write. Focused tests **10/10**
  and the full backend suite **565/565** passed; one live public-event preview succeeded.
  No IEEE-owned event was imported. Docs link check passed.
- The user clarified the desired direction is **HeptaCert → vTools event creation**.
  The read-only preview does not meet that goal. IEEE's public documentation reviewed
  here describes event creation via its authenticated UI, not a verified write API.
  Prepared an [unsent IEEE access request](../reference/IEEE_VTOOLS_WRITE_ACCESS_REQUEST.md)
  for an authorized officer. Automatic outbound creation remains contingent on IEEE's
  supported API/permission response; a manual copy-and-link handoff is the safe fallback.
- **Next:** after the user's production deploy, verify tenant isolation with authorized
  accounts. For vTools automation, obtain IEEE OU details and an answer to the official
  write-access request. For legal text, obtain approved source and reviewer before
  publication. LMS untouched.

### 2026-09-22 — legal translation source audit; publication gate

- The user took ownership of the manual production deploy for the earlier event-ID
  isolation fix. GitHub CI is green for `54ef645`, but the live `/de/events` route still
  returned **404** at the time of this check, so the latest frontend was not yet visible.
  The local Docker context is Docker Desktop, not the production host. No production
  mutation or authenticated IDOR retest was performed in this step.
- Audited the six queued legal/contract routes without changing their served text.
  All six still use a Turkish/English branch and fixed light colors. The
  [source-review checklist](../reference/LEGAL_TRANSLATION_REVIEW_2026-09-22.md) records
  the refund/withdrawal, retention, Hetzner DPA/location and cross-language citation
  claims that need owner/legal validation **before** generating seven more versions.
  Catalog parity is not legal sign-off. The product owner was asked who can review them.
- **Next:** wait for the approved source/reviewer, then migrate each legal page in one
  catalog-and-theme pass and obtain human review. Separately, after the user's deploy,
  verify a foreign event ID is rejected and an owned event still opens. LMS untouched.

### 2026-09-22 — Phase 7 public directories + IEEE vTools feasibility

- `/events`, `/organizations` and `/discover` now live at all nine locale-prefixed URLs,
  with localized titles/descriptions, canonical + `hreflang` metadata and sitemap entries.
  Their previous unprefixed list routes return permanent **308** redirects; event detail,
  registration, member and other transactional URLs stay unprefixed. Both the locale shell
  and authenticated/public navbar link to the localized directories. The three client
  surfaces are catalog-first and semantic-token-only, locked as zero-tolerance paths.
- Added 39 public-directory keys to each catalog (**793 keys** per language); relative
  time, API error/permission and event-type labels no longer silently choose English for
  seven locales. `lang-binary-check` fell **505 → 496** and `light-only-color` fell
  **3357 → 3348**. The larger nine-language backlog is not complete.
- Verification: `npm run check:ui` ✓, `npx tsc --noEmit` ✓, frontend tests **71/71** ✓,
  local + Docker production builds ✓. Isolated Docker frontend smoke, without restarting
  the existing stack: `/de/events`, `/de/organizations`, `/de/discover` **200**;
  `/events` **308 → /tr/events**; OAuth discovery **200**; unauthenticated `/mcp` **401**.
  The temporary smoke container was stopped and auto-removed. Docker was available again
  for this wave, but no production deploy was performed.
- [IEEE vTools feasibility](../reference/IEEE_VTOOLS_INTEGRATION_FEASIBILITY.md): official
  public Events API v8 supports reading event metadata and incremental queries. A scoped,
  one-way vTools → HeptaCert event-import pilot is plausible. Registration/attendance
  access and write APIs remain unverified and require IEEE authorization and privacy
  review; no importer or PII sync was implemented. The user was asked which direction to
  prioritize.
- **Next:** deploy the earlier tenant-isolation backend/frontend fix to production and
  verify a foreign event ID with a non-owner account; then migrate the six legal/contract
  routes with human legal review. LMS remains archived and untouched.

### 2026-09-22 — urgent event-ID tenant isolation fix

- **Cause and scope.** `/admin/events/{id}` initially rendered its navigation before
  access was checked. At the API layer, several `/api/admin/events/{event_id}` and
  related analytics/presentation helpers treated `superadmin` as an implicit owner of
  every tenant's event. A platform account could therefore open another organization's
  event by changing the numeric ID even though that event was not in its normal list.
  Ordinary admins already received a denial from the core event helper; the frontend
  shell still made denied pages appear reachable while redirecting.
- **Fail-closed ownership.** The shared event helper, event access response, owner-only
  deletion, badges, analytics/export, registration/ticket extras, quiz, AI anomaly
  context, presentation event lookup and explicit organization-context lookup no longer
  grant cross-tenant access solely because the caller is a superadmin. Explicit event
  ownership or a valid active team/organization membership remains required. Unknown or
  foreign event IDs return 404 from the shared event path; `/api/superadmin/*` platform
  functions are not being redefined as tenant-admin event functions.
- **No pre-authorization UI.** The event-admin layout now renders neither its navigation
  nor its children until `/access` succeeds. Approval is tied to the event ID and route,
  so changing `43` to `44` cannot reuse the previous page's allowed state for a frame.
  Its loading surface is semantic-token-only and added to the zero-tolerance UI paths;
  `light-only-color` fell **3358 → 3357**.
- **Regression evidence.** A superadmin's foreign event detail, access, analytics/CSV,
  registration fields, quiz, presentations, settings PATCH and DELETE are tested as 404;
  the same account can still read its own event. A frontend test covers denied and
  mid-navigation states. Full backend suite **555/555**, frontend suite **69/69**,
  `npx tsc --noEmit`, `npm run check:ui`, the frontend production build and docs link
  check pass. Docker engine was unavailable locally, so compose smoke could not run;
  perform it at deploy time.
- **Next:** deploy both backend and frontend images manually, then retest a foreign event
  ID with a non-owner account (expect 404 and no event UI) and an owned event (expect
  normal access). Resume Phase 7 public-content translation afterward. LMS remains
  archived and untouched.

### 2026-09-21 — Phase 7 wave 1: nine-language public shell

- **The screenshot regression is fixed at its source.** The authenticated/public global
  shell no longer hardcodes Turkish/English labels for Events, Organizations or Hub.
  Navigation, member/profile actions, the install prompt and the compact admin navigation
  now read 27 new keys from all nine catalogs. With German selected, the header renders
  `Veranstaltungen`, `Organisationen` and `Entdecken` instead of English labels.
- **Long translations remain reachable.** The full desktop navigation now starts at the
  `xl` breakpoint, its links do not wrap, and narrower layouts use the mobile menu rather
  than clipping items such as the German organization label. The shell's remaining five
  fixed light surfaces were also migrated to semantic theme roles, so
  `src/app/_client-shell.tsx` is now a zero-tolerance `cleanPath`.
- **The visible shell is fixed, but public page content is not yet complete.** `/events`
  and `/organizations` each still have one TR/EN copy branch and `/discover` has seven;
  these are the next public-content wave. The six legal/contract routes are likewise
  TR/EN-only and silently fall back to English for seven locales. They are explicitly
  queued as a separate high-priority translation plus human legal-review wave.
- **Ratchet and regression evidence.** All nine catalogs now contain **754 keys**.
  `lang-binary-check` fell **517 → 505** across **129 → 128 files** and
  `light-only-color` fell **3363 → 3358**. `npm run check:ui` ✓ · `npx tsc --noEmit` ✓ ·
  focused German shell regression test **1/1** ✓.
- **Next:** migrate `/events`, `/organizations` and `/discover` completely in one public
  content wave, then the six legal/contract routes. Transactional URLs remain unprefixed;
  LMS remains archived and untouched.

### 2026-09-21 — Phase 6 done: server-derived organizer onboarding

- **One self-healing first run.** `/admin/onboarding` now derives its required profile,
  event or launch step from organization settings, the organization's event list and
  first-event health. It is resumable and skippable, and the former layout-level
  `onboarding_completed` modal/flag no longer controls the UI. The legacy backend endpoint
  remains available for compatibility but has no role in the new flow.
- **Profile to first event.** Owners can set organization name, logo and brand color,
  then create their first event from all nine WP17 event types. Preset flags remain
  backend-owned through `/admin/event-feature-presets`; the optional date uses the shared
  Phase 4 picker. Docker testing caught and fixed the backend PATCH contract requiring the
  event name alongside `event_date`.
- **Consistent entry and continuation.** Password/2FA login, Google OAuth and magic-link
  login send only a sole owner with incomplete real state into onboarding; invited staff,
  multi-context users, explicit deep links and superadmins keep their role-aware routes.
  The shared `EventSetupChecklist` supplies the single next action on onboarding and the
  continuing checklist on dashboard/event detail, avoiding duplicate gating logic.
- **Nine-language and theme contract.** Sixty-two onboarding/checklist keys were translated
  in every catalog; all nine catalogs now contain **727 keys**. The onboarding route and
  shared checklist are semantic-token/catalog-first zero-tolerance paths. Removing the old
  binary modal lowered `lang-binary-check` **526 → 517** and light-only colors
  **3371 → 3363**; the broader translation queue is now **517 occurrences in 129 files**.
- **Tests and verification.** Added server-state resume/gating, auth-routing, shared
  checklist and event-date PATCH regression coverage. `npm run check:ui` ✓ · frontend
  tests **66/66** · `npx tsc --noEmit` ✓ · local production build ✓ ·
  `npm audit --omit=dev --audit-level=high` **0 vulnerabilities** · docs links ✓.
  Fresh Docker organizer smoke covered register → verify → login → empty profile
  → profile save → workshop preset event → date → launch/resume; all 13 preset
  flags matched, onboarding/dashboard returned **200**, root **308 → /tr**, German
  landing and OAuth discovery **200**, unauthenticated MCP initialize **401**.
- **Next:** Phase 7's first catalog/theme migration wave. LMS remains archived and
  untouched.

### 2026-09-20 — Phase 5 done: localized landing, SEO and host-safe routing

- **One real landing in nine languages.** The primary product landing now lives at
  `app/[locale]/page.tsx`, renders from all nine complete catalogs, and uses a locale-aware
  public shell and language switcher. The obsolete pilot and the former 728-line binary
  TR/EN landing were removed; 40 superseded `home_*` / `feat_*` / `step*` keys were
  deleted and seven new feature/stat keys were translated in every catalog. All nine
  catalogs now contain **665 keys**.
- **White-label and live-data contracts preserved.** `/` has a dedicated organization
  home that keeps `/branding` and `/public/organizations/:id`; the locale landing keeps
  `/stats`. Registration, pricing and every transactional URL remain unprefixed.
- **Search and host routing.** Each locale has localized metadata, canonical and all nine
  `hreflang` alternates plus `x-default`; `<html lang>` follows the request locale and the
  sitemap advertises each localized landing. Primary-host `/` returns permanent **308**
  to `/tr`, while a white-label host still serves `/` with **200**.
- **Theme, motion and guardrails.** The new landing/shell use only semantic color roles,
  are responsive from 400px, and all Framer Motion effects honor reduced-motion. The
  locale and landing directories are now zero-tolerance `cleanPaths`. Removing the old
  landing lowered `lang-binary-check` **537 → 526**, raw hex colors **80 → 76**, and
  light-only colors **3488 → 3371**.
- **Tests and verification.** Added all-nine-locale rendering, transactional-link,
  sitemap alternate and host-routing coverage. `npm run check:ui` ✓ · frontend tests
  **62/62** · `npx tsc --noEmit` ✓ · `npm audit --omit=dev --audit-level=high`
  **0 vulnerabilities** · local and Docker production builds ✓. Docker smoke: primary
  `/` **308 → /tr**, white-label `/` **200**, German HTML lang/canonical + 10 alternates,
  OAuth discovery **200**, unauthenticated MCP initialize **401**.
- **Next:** Phase 6 — server-state-derived first-run organizer onboarding. LMS remains
  archived and untouched.

### 2026-09-20 — Phase 4 done: one localized date/time picker family

- **Shared picker family.** `DateField` now wraps `react-day-picker` v9 with the locale for
  each of the nine application languages. `TimeField` supports typed 24-hour and AM/PM
  entry, locale-sensitive display, a configurable five-minute default step, and valid
  `min`/`max` ranges. `DateTimeField` preserves the naive local wire format and no longer
  derives its default date through UTC.
- **Accessibility and theme.** Both popovers expose dialog relationships and expanded
  state, associate labels with their triggers, flip above when needed, close on Escape and
  restore focus. Day/time targets are at least 40px and all picker styling uses semantic
  theme roles. Calendar arrows/Home/End/PageUp/PageDown/Enter come from DayPicker's WAI-ARIA
  grid implementation.
- **Every fixed native field migrated.** Networking (1), CFP (5), reservations (2),
  training (2), accreditation (2), CRM (1), and `RetentionPolicyFields` (1) now use the
  shared components. Paired start/end and due/renewal controls enforce their relationships.
  The `native-date-input` ratchet dropped **14 → 0** and `light-only-color` dropped
  **3507 → 3488**.
- **Catalogs and translation inventory.** Sixteen picker/CFP labels were translated in
  every catalog; all nine now contain **698 keys** with placeholder parity. Removing picker
  binary fallbacks lowered `lang-binary-check` **541 → 537**. The new `npm run i18n:audit`
  command records the remaining **537 occurrences in 131 files** as the Phase 7/8 queue;
  complete catalogs do not by themselves mean every legacy screen is translated.
- **Tests.** Added value-contract tests for `YYYY-MM-DD`, `HH:mm`, and
  `YYYY-MM-DDTHH:mm`; a Turkey-midnight regression test for the local date; German month
  rendering; arrow + Enter selection; typed AM/PM input; and Escape/focus return.
- **Verification:** `npm run check:ui` ✓ · frontend tests **57/57** ·
  `npx tsc --noEmit` ✓ · `npm audit --omit=dev --audit-level=high` **0 vulnerabilities** ·
  local production build ✓ · Docker image build ✓ · compose smoke `/` **200**, OAuth
  discovery **200**, unauthenticated MCP initialize **401**. The live production endpoint
  also returns OAuth discovery **200** and MCP **401**, confirming `/mcp` is present; it is
  a bearer-authenticated protocol endpoint, not a browser page.
- **Next:** Phase 5 — rebuild the landing as the first locale-routed page. LMS remains
  archived and untouched.

### 2026-09-20 — Phase 3 done: semantic theme foundation restored safely

- **Semantic roles.** `globals.css` now defines light and dark channel-valued roles for
  canvas/raised/sunken/active backgrounds, primary-to-faint content, borders, accent,
  focus, shadows and success/warning/danger/info states. The `.dark` block only
  redefines those roles. Body, selection, scrollbars, brand gradients and shadows now
  consume them.
- **Tailwind bridge.** `surface-*` and `sidebar-*` map to the roles with
  `rgb(var(--…) / <alpha-value>)`, preserving opacity modifiers. New explicit utilities
  (`bg-raised`, `text-content-*`, `border-outline-*`, `status-*`, `accent-*`) support
  unambiguous migrations. The global component layer — buttons, inputs, cards, tabs,
  badges, banners, tables, navigation, empty/loading states — no longer hardcodes light
  surfaces or fixed status palettes.
- **White-label invariant.** `--site-brand-color` remains the source for the accent and
  its soft/border variants use `color-mix`, so the existing runtime inline override stays
  authoritative without needing RGB parsing or a second JavaScript setter.
- **Theme runtime.** `lib/theme.ts` now validates/persists `light | dark | system`,
  resolves `matchMedia`, applies `.dark` plus `color-scheme`, and watches system changes.
  The pre-paint script honors stored/system preference when enabled without rewriting
  storage. `ThemeToggle` cycles system/light/dark and is wired into both shells.
- **Safe rollout.** `NEXT_PUBLIC_THEME_TOGGLE_ENABLED` defaults to `false`; it gates both
  the control and pre-paint dark activation. A stored preference is preserved while the
  flag is off, but production stays light until Phase 7 finishes — no half-themed
  surface can become user-visible accidentally.
- **Catalogs and reference screen.** Four theme-control strings were added to every
  catalog (all nine now **682 keys**). `/admin/events` was converted to raised/status
  roles and has no fixed white/gray/slate/status-palette colors left, providing the first
  token-pure admin reference surface.
- **Tests and ratchet.** New tests cover role parity/differences, opacity-aware Tailwind
  mappings, white-label accent ownership, stored and system pre-paint behavior, rollout
  gating, theme persistence/listeners and the hidden/working control. `light-only-color`
  dropped **3508 → 3507** after its intermediate **3524 → 3508** drop; all other
  baselines stayed flat.
- **Verification:** `npm run check:ui` ✓ · frontend tests **51/51** ·
  `npx tsc --noEmit` ✓ · production build ✓. Run tsc after, not concurrently with,
  `next build`: both write `.next/types`, and parallel execution creates transient
  missing-generated-file errors on Windows.
- **Next:** Phase 4 — accessible date/time picker family and zero native date inputs.

### 2026-09-20 — Phase 2 follow-up: nine-language authenticated selector unlocked

- **Claude handoff audited.** `980ca3a` was clean and already pushed. Its Phase 2
  crash-prevention work was intact; the unfinished part was exposing the seven additional
  languages in the authenticated application and removing the remaining reverse
  fallbacks that sent every non-English locale to Turkish.
- **One locale model.** `src/lib/i18n.tsx` now uses the nine-locale `AppLocale` union and
  loads all nine complete catalogs. `LanguageToggle` consequently renders the existing
  dropdown with Turkish, English, German, French, Spanish, Italian, Portuguese, Dutch
  and Russian; its accessible label and the mobile shell label use
  `language_switcher_label` from the catalogs.
- **Safe legacy fallback.** Existing TR/EN-only inline maps continue to use English for
  the seven additional languages through `pickLang()`. Admin onboarding and the in-app
  tour no longer use reverse binary fallbacks. Helper/component language parameter types
  now accept the shared locale union without weakening the selected-language state.
  This brings forward the Phase 8 type/selector portion at the user's request; moving the
  remaining legacy inline copy into all catalogs still belongs to Phase 7/8.
- **Backend language normalization.** Explicit Turkish locales use Turkish; every
  explicit non-Turkish application locale uses the existing English message fallback.
  This is applied consistently to request messages, built-in badge templates,
  deterministic AI email fallback and email-preview subjects, instead of accidentally
  returning Turkish for German/French/etc. An absent language keeps the historic Turkish
  default.
- **Tests and ratchet.** Added authenticated selector persistence/render tests (German
  and Russian) and backend language/fallback tests. `lang-binary-check` dropped
  **544 → 541**; indexed locale lookups and locale ternaries remain **0**; all nine
  catalogs remain equal at **678 keys**.
- **Verification:** `npm run check:ui` ✓ · frontend tests **43/43** ·
  `npx tsc --noEmit` ✓ · production build ✓ · backend tests **554/554**.
- **Docker smoke:** not rerun; Docker Desktop's Linux engine was stopped on this machine.
  This change does not touch `next.config.mjs` or `middleware.ts`; the pre-deploy MCP
  smoke remains listed under "Also outstanding" above.
- **Next:** Phase 3 — semantic token layer + hidden theme restore, in the order above.

### 2026-09-19 — Phase 2 done: no admin screen crashes on a third language

- **New helpers.**
  - `src/lib/localeTag.ts` — `localeTag(lang)` maps a language code to the formatting
    tag (`tr-TR`, `en-US`, `de-DE`, `fr-FR`, `es-ES`, `it-IT`, `pt-PT`, `nl-NL`, `ru-RU`).
    Unknown codes and region tags pass through to `Intl`; a missing language falls back
    to `tr-TR`. A test fails if a locale in `src/i18n/routing.ts` has no tag.
  - `src/lib/pickLang.ts` — `pickLang(map, lang)` returns `map[lang] ?? map.en` (and
    `undefined` for a missing map). A plain module, not `"use client"`, so server code
    such as `lib/orgRoles.ts` can import it. It is the sanctioned stopgap; the maps
    themselves move into the catalog in Phase 7, when each file is opened once for colors
    and strings together.
- **Locale tags.** 59 binary ternaries rewritten to `localeTag(lang)` (the 55 counted
  plus four `en-GB` variants); 8 copy objects lost their `locale: "tr-TR" | "en-US"`
  fields (`copy.locale` → `localeTag(lang)`); 10 module-level date helpers gained a
  trailing `lang` parameter with every call site updated (including `formatRaffleDate`'s
  caller in `raffles/[raffleId]/present`); 17 inline `toLocale*String("tr-TR")` calls;
  `DateField`/`DateTimeField` now default to the active language instead of Turkish;
  `gamification`'s two module-level formatters became one built per render. Nine
  components that never read the language (`StatCard`, three `settings` tabs, `webhooks`,
  `settings/api`, `raffles` card, public `marketplace` card, public ticket page, the
  certificate editor) now call `useI18n()`.
- **Two deliberate behaviour changes.** English dates are `en-US` everywhere — four places
  used `en-GB` (learning paths, marketplace detail, API keys, gamification badges).
  English number and price formatting now uses English grouping (`1,234,567`) where it was
  hardcoded Turkish (`1.234.567`).
- **Left on purpose:** the two `toLocaleLowerCase("tr-TR")` calls in
  `lib/useSubscription.tsx`. They fold Turkish server messages with Turkish casing rules
  (İ/ı) for matching — not display formatting.
- **`[lang]` lookups:** 14 inline `const copy = { tr, en }[lang]` maps wrapped in
  `pickLang(…, lang)`; 23 named lookups (`label[lang]`, `item[lang]`,
  `EVENT_TYPE_LABELS[key]?.[lang]`, …) moved to `pickLang`; `faq.ts` switched its
  existing `||` fallback to `??`.
- **Ratchet locked lower:** `lang-indexed-lookup` 37 → **0**, `locale-tag-ternary` 55 →
  **0**, `locale-tag-literal` 165 → **2**, `lang-binary-check` 587 → 544 (the rewritten
  ternaries were also binary checks). Other rules unchanged.
- **Tests.** `src/test/localeTag.test.ts` and `src/test/thirdLanguage.test.tsx` — the
  latter renders `AddAttendeeModal`, `ImportAttendeeModal`, `IssueCertificateModal`,
  `EventAdminNav` (with event and permissions loaded) and `StatCard` as a German user:
  each shows English copy instead of crashing, and `StatCard` prints `1.234.567`.
  Deviation from the plan: representative shared components are rendered, not all 20
  touched files; the ratchet at 0 is what guarantees no bare lookup remains anywhere.
- **Test infrastructure.** This was the first `.tsx` test, so `vitest.config.mts` now sets
  `oxc.jsx.runtime = "automatic"` — Vitest 4 runs Vite 8, whose oxc transformer honours
  the tsconfig's Next-oriented `jsx: "preserve"` otherwise.
- **Verification:** `npm run check:ui` ✓ at the new baseline · `npm test` 41/41 ·
  `npx tsc --noEmit` ✓ · production build ✓ (exit 0) · 87 files changed,
  +310/−215, no BOM changes.
- **Next:** Phase 3 — see "Next step" above.

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
