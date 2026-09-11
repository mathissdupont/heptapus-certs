# HeptaCert System Audit — 2026-09-11

## Scope and method

This audit combined source review, the full automated test suite, dependency
scans, Docker Compose startup, a real PowerPoint upload/conversion smoke test,
and read-only HTTP checks against `https://heptacert.com`.

The production checks were deliberately non-mutating. The end-to-end upload
test used only the isolated local Docker database and storage.

## Executive summary

The certificate/event core is broad and the automated suite is green, but the
product is not yet uniformly production-ready. Presentation upload now works
end to end after two rounds of fixes. The highest remaining risks are an exposed
but disconnected LMS portal, a production MCP route that is not reaching the
backend, misleading health reporting, and a certificate-tier evaluator that
ignores its configured conditions. The backend dependency findings discovered
during the audit have been remediated on the current branch.

### Verified working

- Backend: 542 tests passed; syntax and critical flake8 checks passed.
- Frontend: type check, production build, and 3 Vitest tests passed in the
  presentation-fix work; production `npm audit` currently reports 0 findings.
- Backend dependency upgrades: compatibility tests passed and the repeated
  `pip-audit` reports no known vulnerabilities.
- Database: a clean local PostgreSQL instance migrated to
  `112_public_member_purged_at`, the single Alembic head.
- Local infrastructure: PostgreSQL and Redis became healthy; ClamAV accepted a
  real scan; LibreOffice 25.2.3.2 was available in the presentation worker.
- Production public smoke: home, login, verification search and API health
  returned HTTP 200; HTTPS/HSTS, frame denial, MIME sniffing protection,
  referrer policy and permissions policy were present.

## Presentation upload result

### Root causes found and fixed

1. Upload scanning used a timeout shorter than realistic PowerPoint/ClamAV
   processing and did not handle ClamAV's stream-size error clearly.
2. Upload content was trusted too heavily by filename/content type, temporary
   files were not consistently cleaned up, and failed conversions had no robust
   retry/stale-job recovery path.
3. The standalone conversion worker imported only `PresentationDeck`. Its
   SQLAlchemy metadata therefore did not contain `users`, `events`, or
   `organizations`. The first ORM flush crashed every queued job with
   `NoReferencedTableError`.
4. Both Compose files used `clamdscan --ping` without the required retry
   argument. With ClamAV 1.5.4 the healthcheck always failed even while scanning
   worked.
5. The production environment example disabled ClamAV and therefore overrode
   the production Compose default. It also did not fail closed when the scanner
   was unavailable.

### End-to-end proof after the fixes

- A real `.pptx` was generated inside Docker.
- Upload returned HTTP 201 and `conversion_status=queued`.
- ClamAV was enabled and its stream limit was confirmed as 100 MB.
- The worker claimed the job once and converted it to PDF.
- Final state was `ready`, `conversion_attempts=1`, with no conversion error.
- The converted file returned HTTP 200, `application/pdf`, 17,476 bytes.
- The corrected ClamAV healthcheck returned `PONG` and the container became
  healthy.

## Prioritized findings

### P0 — release blockers

#### 1. Backend dependency vulnerabilities — remediated on current branch

`pip-audit` found 56 known vulnerability records across 7 direct/resolved
packages. Duplicate advisories appear because of dependency extras, but every
package below needs review and upgrade:

| Package | Current | Minimum fix shown by audit |
| --- | ---: | ---: |
| `starlette` | 1.0.1 | up to 1.3.1 depending on advisory |
| `python-multipart` | 0.0.27 | 0.0.31 |
| `Pillow` | 12.2.0 | 12.3.0 |
| `aiosmtplib` | 3.0.2 | 5.1.2 |
| `cryptography` | 46.0.7 | up to 50.0.0 |
| `dnspython` | 2.4.2 | 2.6.1 |
| `mcp` | 1.12.4 resolved from an open range | 1.28.1 |

The affected packages and the required compatibility pins for Pydantic and
Uvicorn were upgraded. The 134 focused security/auth/payment/MCP/presentation
tests passed, the full backend suite passed, `pip check` found no broken
requirements, and the repeated audit found no known vulnerabilities.
`pip-audit` is now a blocking step in both root CI workflows.

#### 2. LMS/member portal is publicly reachable but disconnected — remediated

The active portal dashboard and calendar request these endpoints:

- `/api/public/my-courses`
- `/api/public/courses/{course_id}/calendar`
- `/api/public/orgs/{org}/lms-branding`

All three are absent from the backend OpenAPI schema and returned HTTP 404 in
production. The active portal dashboard catches the errors and renders an empty
state, masking the failure. It also links to `/courses/{id}` routes that do not
exist in the active Next app. `/portal/courses` explicitly says the feature is
temporarily disabled. The original LMS pages are under `_archive_lms`, while
some current redirects still target absent `/admin/lms/...` routes.

Product decision: LMS remains retired and archived. The live portal, calendar,
disabled-course placeholder and broken event LMS bridge redirect were moved
under `frontend/_archive_lms`, outside the Next.js route tree. The six MCP tools
and the `hc lms` CLI command group that called archived APIs were also removed
from active registration while their source remains recoverable in the archive
or Git history. User-facing MCP documentation now lists the 38 active tools.

#### 3. Production hosted MCP endpoint is misrouted — remediated on current branch

The code mounts the MCP ASGI app at `/mcp`, and product documentation tells
agents to connect there. In production:

- `GET /mcp` returned a Next.js 404 page.
- A valid MCP initialize `POST /mcp` returned HTTP 405 with
  `Allow: GET, HEAD, OPTIONS`.

The direct Caddy route remains the preferred production path, but the frontend
now has a safe fallback proxy for `/mcp` and the OAuth discovery routes. The
frontend Docker image now receives its internal backend address at build time;
previously the runtime-only value was too late for compiled Next.js rewrites.
The frontend method guard now permits MCP POST requests while continuing to
reject POST requests to ordinary UI routes. A Docker-backed smoke test through
the frontend returned 401 discovery challenges without credentials, 200 for
both discovery documents, and a successful MCP `initialize` SSE response with
protocol version `2025-06-18` when an Authorization header was supplied.

Production will continue returning the old 404/405 behavior until the updated
frontend image or the documented Caddy route is deployed.

#### 4. Certificate tier rules are not evaluated

`assign_certificate_tiers` currently loops over configured tier definitions and
assigns the first tier to every active certificate without a tier. The source
itself notes that complex condition evaluation is still to be implemented.
This can silently issue incorrect credential tiers and must not be exposed as a
finished feature.

### P1 — high priority

#### 5. Health endpoints can be green while workers are down

`GET /api/health` always returns `{"status":"ok"}` and checks no dependency.
During this audit it stayed green while the presentation worker was in a crash
loop. The superadmin platform-health endpoint infers worker health only from
queue sizes, and job status hard-codes `scheduler_enabled: true` even if the
jobs container is absent.

Add explicit DB/Redis/ClamAV probes, worker heartbeats, queue-age thresholds and
scheduler heartbeat ownership. Keep a shallow liveness endpoint, but use a
dependency-aware readiness endpoint for Compose and monitoring.

#### 6. Production payments are disabled

`/api/billing/status` returned `enabled=false` and `provider=null`. The checkout
therefore renders “Coming soon” and only offers the free plan. This is a valid
configuration if monetization is intentionally paused; otherwise paid plan
purchase is not operational and provider/webhook reconciliation needs a sandbox
then production acceptance test.

#### 7. User-visible backend text is corrupted

At least 50 `HTTPException(detail=...)` lines contain mojibake. Confirmed areas
include badge calculation, certificate tiers, sponsors, raffle, account/profile
updates, domain-scoped login and bulk generation. These strings are returned to
the UI and can produce text such as corrupted versions of “Etkinlik bulunamadı”
and “Yetkisiz erişim”.

Repair UTF-8 strings with a scripted, reviewable mapping; do not blindly recode
the entire 15k-line `main.py`. Add a source scan that rejects common mojibake
sequences in user-facing literals.

#### 8. Docker frontend build is slow and non-deterministic

The frontend directory is about 1.08 GB locally: `.next` is about 555 MB and
`node_modules` about 524 MB. There is no frontend `.dockerignore`; the observed
build transferred roughly 649 MB of context. Its Dockerfile copies only
`package.json`, runs `npm install` without `package-lock.json`, and therefore
does not use the committed dependency graph. The build stalled at that step
during the combined Compose build.

Add a strict `.dockerignore`, copy `package.json` plus `package-lock.json`, run
`npm ci`, and use a multi-stage standalone Next.js image. Apply the same lockfile
correction to the docs Dockerfile.

#### 9. Backend image font step is broken and non-reproducible

The backend Dockerfile calls `curl` and `fc-cache`, but the base image does not
install either command first. The build logs show `curl: not found`, then every
build falls back to `apt-get install fonts-dejavu-core`; `fc-cache` is silently
ignored through `|| true`. Install the intended packages explicitly in one
layer and remove the network download/fallback branch.

#### 10. CLI default host does not resolve

The CLI defaults to `https://app.heptacert.com`, while the product and docs use
`https://heptacert.com`. DNS resolution for `app.heptacert.com` failed during
the audit, so a newly installed CLI cannot connect without manual configuration.

#### 11. Public documentation contains broken routes

- Documentation and developer examples still publish
  `heptacert.com/c/{public_id}`; that page returns 404. The active route is
  `/verify/{uuid}`.
- Documentation advertises Swagger at `/docs` and ReDoc at `/redoc`; both return
  404 because FastAPI initializes with docs and ReDoc disabled. Only
  `/api/openapi.json` is live.
- The feature roadmap is stale: it marks several already-implemented event
  modules missing, while the product roadmap marks localization complete despite
  active hard-coded/single-language and corrupted strings.

Update docs from the generated OpenAPI schema and add link checking in CI.

### P2 — quality and maintainability

#### 12. Test breadth is high, but risk coverage remains shallow

There are 506 explicit test functions and 542 collected cases for roughly 650
API operations. The last coverage run reported 44.47% total coverage, only just
above the 40% CI floor. Previously observed low-coverage high-risk modules
include agenda, meetings, OIDC SSO, analytics, email, CFP, tickets, learning
paths, quiz, MCP transport, presentation WebSocket, document outputs and the
large `main.py` surface.

Raise coverage by risk rather than by line count: PostgreSQL integration tests,
background worker tests, payment webhook tests, browser journeys and API
contract tests should come before a global percentage increase.

#### 13. No browser-level critical journey suite

The frontend currently has three focused Vitest tests. There is no active
Playwright/Cypress suite proving login, event creation, registration, check-in,
certificate issuance/verification, payment, presentation or portal journeys.
Add a small Docker-backed browser suite and run it before deployment.

#### 14. Framework deprecations are accumulating

The full backend run passed with 36 warnings. These include FastAPI
`on_event` lifecycle hooks, Pydantic class-based config and naive
`datetime.utcnow()` use. Migrate to lifespan handlers, `ConfigDict`, and
timezone-aware datetimes before the next major framework upgrades.

#### 15. Security headers can be tightened

Production has several good baseline headers, but no Content-Security-Policy
was observed and `X-Powered-By: Next.js` is exposed. Define a tested CSP that
accounts for the checkout iframe and required assets, and disable the framework
signature.

#### 16. Presentation global hub is a placeholder

The global `/admin/presentations` page only sends users to events and says a
cross-event list may be added later. Per-event presentation management is the
working implementation. Either implement search/listing or remove the global
navigation entry so the shell is not presented as a complete hub.

## Ordered remediation plan

1. Deploy the presentation worker/ClamAV fixes and repeat the real PPTX smoke on
   the server; add a worker heartbeat alarm.
2. **Completed on current branch:** upgrade and re-audit the seven vulnerable
   backend packages and add a blocking CI dependency audit.
3. **Completed:** keep LMS archived and remove its live portal, redirect, MCP
   tool and CLI surfaces.
4. **Completed on current branch; deploy pending:** add a resilient `/mcp`
   routing fallback and verify a protocol-level initialize smoke through Docker.
5. Implement and test actual certificate-tier condition evaluation.
6. Replace false-green health reporting with dependency and worker readiness.
7. Repair user-facing mojibake and add an automated source guard.
8. Make frontend/docs/backend Docker builds deterministic and small.
9. Correct CLI defaults and all broken documentation URLs; add link/contract
   checks.
10. Confirm whether paid checkout should be live; if yes, complete provider and
    webhook acceptance testing.
11. Add PostgreSQL integration and browser critical-journey tests, then raise CI
    coverage thresholds module by module.
12. Address lifecycle/Pydantic/datetime deprecations and remaining UI shells.

## Commands/evidence snapshot

- Backend suite: `python -m pytest tests -q` → 542 passed, 36 warnings.
- Focused presentation suite: 11 passed.
- Python critical lint: 0 syntax/undefined-name errors.
- Frontend production dependency audit: 0 vulnerabilities.
- Initial backend dependency audit: 56 records in 7 packages; repeated audit
  after remediation: no known vulnerabilities.
- Production OpenAPI: 512 path templates and about 650 HTTP operations.
- Production health: HTTP 200 with `{"status":"ok"}`.
- Alembic: one head, `112_public_member_purged_at`.
