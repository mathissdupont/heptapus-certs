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
end to end after two rounds of fixes. The exposed LMS portal and MCP routing
defects have been remediated on the current branch. Certificate-tier assignment
now evaluates validated conditions instead of assigning the first tier to every
certificate, and dependency-aware readiness now detects missing infrastructure
and workers. The highest remaining risks are corrupted user-facing strings,
backend image reproducibility and broken public documentation links. The
dependency findings discovered during the audit have also been remediated.

### Verified working

- Backend: 550 tests passed; syntax and critical flake8 checks passed.
- Frontend: type check, production build, and 7 Vitest tests passed in the
  presentation-fix work; production `npm audit` currently reports 0 findings.
- Documentation site: its patched Next.js Docker image built successfully,
  served the home/MCP/CLI pages, and production `npm audit` reports 0 findings.
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

#### 4. Certificate tier rules were not evaluated — resolved on current branch

`assign_certificate_tiers` previously assigned the first configured tier to
every active certificate. It now evaluates ordered AND/OR conditions for
attendance rate, attended sessions, registration rank, survey completion,
email verification, certificate eligibility, approval status and registration
source. The first matching tier wins; one final conditionless tier can be used
as an explicit fallback. Invalid fields/operators, duplicate names, shadowing
fallbacks and nonexistent template IDs are rejected when rules are saved.
Assignments also persist the tier template ID and report unmatched counts.
Malformed legacy JSON fails closed rather than silently issuing a tier. API and
pure evaluator regression tests cover Gold/Silver/fallback selection and input
validation.

### P1 — high priority

#### 5. Health endpoints could be green while workers were down — resolved on current branch

`GET /api/health` remains an intentionally shallow process-liveness check. The
new `GET /api/ready` performs bounded, parallel PostgreSQL, Redis and ClamAV
probes and verifies expiring Redis heartbeats from the presentation worker and
scheduler when those components are required by deployment configuration. It
returns HTTP 503 when a required dependency or heartbeat is unavailable.

Both Compose definitions now use readiness for backend health, start workers
without a circular backend-health dependency, and provide Redis to the
presentation worker. The superadmin platform-health and job-status responses
now expose the actual component heartbeats instead of inferring worker state
from queue size or hard-coding the scheduler as enabled. A local Docker smoke
returned 200 with database, Redis and worker healthy; after stopping the worker
and expiring its heartbeat it returned 503, then recovered to 200 after restart.
Queue age thresholds remain a worthwhile monitoring enhancement, but a missing
worker can no longer produce a false-green deployment readiness result.

#### 6. Production payments are disabled

`/api/billing/status` returned `enabled=false` and `provider=null`. The checkout
therefore renders “Coming soon” and only offers the free plan. This is a valid
configuration if monetization is intentionally paused; otherwise paid plan
purchase is not operational and provider/webhook reconciliation needs a sandbox
then production acceptance test.

#### 7. User-visible backend text was corrupted — resolved on current branch

Corrupted UTF-8 text in active backend API errors, transactional email HTML,
comments and labels was repaired in the seven affected source files. The legacy
default-email-template repair now detects the common Windows-1252 mojibake
markers without embedding a corrupted literal. A regression test scans every
active backend Python source and fails when known mojibake markers or the Unicode
replacement character is introduced. Archived LMS sources remain untouched.

#### 8. Docker frontend build was slow and non-deterministic — resolved

The frontend now has a strict `.dockerignore`, installs the committed lockfile
with `npm ci`, and produces a multi-stage Next.js standalone runtime image that
runs as the unprivileged `nextjs` user. The verified Docker build transferred
76.45 KB instead of the previously observed roughly 649 MB, reported zero npm
vulnerabilities. Its temporary container served the home page and OAuth resource
discovery with HTTP 200 while the unauthenticated MCP endpoint correctly returned
401. The documentation Dockerfile also uses its committed lockfile.

#### 9. Backend image font step was broken — resolved

The unreliable GitHub font download and silent fallback were removed. The
backend image now installs `fontconfig` and `fonts-dejavu-core` explicitly in a
single apt layer and clears package indexes. A clean image build succeeded and
`fc-match` inside the resulting container resolved DejaVu Sans correctly.

#### 10. CLI default host did not resolve — resolved

The CLI now defaults to `https://heptacert.com`, and its login help text uses the
same canonical origin. The documentation contract check fails if the retired
`app.heptacert.com` default is reintroduced.

#### 11. Public documentation contained broken routes — resolved

Certificate examples now use `/verify/{uuid}`; the disabled Swagger and ReDoc
pages are no longer advertised, while `/api/openapi.json` remains the documented
machine-readable contract. MCP OAuth metadata now points to the real documentation
site instead of the nonexistent frontend `/docs/mcp-agent` route. The feature and
product roadmaps were reconciled with implemented presets, gamification, CFP,
meetings and live-engagement modules, and localization is correctly marked partial.

A dependency-free CI check validates all internal links across 36 documentation
pages and scans 426 active public-contract files for retired URLs. The corrected
documentation image built under Linux and served the changed pages with HTTP 200.

### P2 — quality and maintainability

#### 12. Test breadth is high, but risk coverage remains shallow

There are 514 explicit test functions and 550 collected cases for roughly 650
API operations. The last coverage run reported 44.47% total coverage, only just
above the 40% CI floor. Previously observed low-coverage high-risk modules
include agenda, meetings, OIDC SSO, analytics, email, CFP, tickets, learning
paths, quiz, MCP transport, presentation WebSocket, document outputs and the
large `main.py` surface.

Raise coverage by risk rather than by line count: PostgreSQL integration tests,
background worker tests, payment webhook tests, browser journeys and API
contract tests should come before a global percentage increase.

#### 13. No browser-level critical journey suite

The frontend currently has seven focused Vitest tests. There is no active
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
5. **Completed on current branch:** upgrade vulnerable documentation
   dependencies, use lockfile-deterministic Docker installs, and enforce docs
   build/audit checks in CI.
6. **Completed on current branch:** implement and test actual certificate-tier
   condition evaluation, template assignment and fail-closed validation.
7. **Completed on current branch:** replace false-green health reporting with
   dependency probes, worker/scheduler heartbeats and Docker readiness checks.
8. **Completed on current branch:** repair user-facing mojibake and add an
   automated source guard.
9. **Completed on current branch:** make frontend installs/context deterministic,
   produce a standalone runtime, and replace the backend's broken font fallback.
10. **Completed on current branch:** correct CLI defaults and broken public URLs,
    reconcile roadmap status, and enforce link/contract checks in CI.
11. Confirm whether paid checkout should be live; if yes, complete provider and
   webhook acceptance testing.
12. Add PostgreSQL integration and browser critical-journey tests, then raise CI
   coverage thresholds module by module.
13. Address lifecycle/Pydantic/datetime deprecations and remaining UI shells.

## Commands/evidence snapshot

- Backend suite: `python -m pytest tests -q` → 550 passed, 36 warnings.
- Focused presentation suite: 11 passed.
- Python critical lint: 0 syntax/undefined-name errors.
- Frontend production dependency audit: 0 vulnerabilities.
- Initial backend dependency audit: 56 records in 7 packages; repeated audit
  after remediation: no known vulnerabilities.
- Production OpenAPI: 512 path templates and about 650 HTTP operations.
- Production health: HTTP 200 with `{"status":"ok"}`.
- Alembic: one head, `112_public_member_purged_at`.
