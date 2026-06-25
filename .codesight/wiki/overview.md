# heptapus-certs — Overview

> **Navigation aid.** This article shows WHERE things live (routes, models, files). Read actual source files before implementing new features or making changes.

**heptapus-certs** is a typescript project built with fastapi, next-pages, next-app, using sqlalchemy for data persistence, organized as a microservices repo.

**Services:** `backend` (`heptacert\backend`), `heptacert-docs` (`heptacert\docs`), `heptacert-frontend` (`heptacert\frontend`)

## Scale

715 API routes · 157 database models · 247 UI components · 213 library files · 7 middleware layers · 75 environment variables

## Subsystems

- **[Auth](./auth.md)** — 43 routes — touches: auth, db, cache, queue, email
- **[Payments](./payments.md)** — 14 routes — touches: auth, db, cache, queue, email
- **[Admin](./admin.md)** — 441 routes — touches: auth, db, ai, upload, queue
- **[Attend](./attend.md)** — 2 routes — touches: auth, db, cache, queue, email
- **[Auth_2fa_api](./auth_2fa_api.md)** — 6 routes — touches: auth, db
- **[Branding](./branding.md)** — 1 routes — touches: auth, db, cache, queue, email
- **[Community_api](./community_api.md)** — 4 routes — touches: auth, db
- **[Connections_api](./connections_api.md)** — 9 routes — touches: auth, db
- **[Document_export_jobs](./document_export_jobs.md)** — 4 routes — touches: auth, db, queue
- **[Document_outputs_api](./document_outputs_api.md)** — 2 routes — touches: auth
- **[Domains_api](./domains_api.md)** — 6 routes — touches: auth, db
- **[Email_api](./email_api.md)** — 21 routes — touches: auth, db, cache, queue, payment
- **[Event-team](./event-team.md)** — 1 routes — touches: auth, db, cache, queue, email
- **[Event_sponsors_api](./event_sponsors_api.md)** — 1 routes — touches: auth, db, upload
- **[Events](./events.md)** — 9 routes — touches: auth, db, cache, queue, email
- **[Feature-policies](./feature-policies.md)** — 1 routes — touches: auth, db, cache, queue, email
- **[Files](./files.md)** — 1 routes — touches: auth, db, cache, queue, email
- **[Health](./health.md)** — 1 routes — touches: auth, db, cache, queue, email
- **[I18n](./i18n.md)** — 1 routes — touches: auth
- **[Lead_forms_api](./lead_forms_api.md)** — 2 routes — touches: auth, db
- **[Learning_path_api](./learning_path_api.md)** — 4 routes — touches: auth, db
- **[Legal](./legal.md)** — 1 routes — touches: auth, db, cache, queue, email
- **[Lms_api](./lms_api.md)** — 16 routes — touches: auth, db
- **[Lms_extended_api](./lms_extended_api.md)** — 6 routes — touches: auth, db
- **[Lti_api](./lti_api.md)** — 1 routes — touches: auth, db
- **[Marketplace_api](./marketplace_api.md)** — 5 routes — touches: auth, db
- **[Me](./me.md)** — 4 routes — touches: auth, db, cache, queue, email
- **[Member_certificates_api](./member_certificates_api.md)** — 6 routes — touches: auth, db, cache
- **[Openapi-actions.json](./openapi-actions.json.md)** — 1 routes — touches: auth, db, cache, queue, email
- **[Openapi.json](./openapi.json.md)** — 1 routes — touches: auth, db, cache, queue, email
- **[Org_staff_api](./org_staff_api.md)** — 1 routes — touches: auth, db
- **[Platform_health_api](./platform_health_api.md)** — 1 routes — touches: auth, db, payment
- **[Presentation_api](./presentation_api.md)** — 25 routes — touches: auth, db, cache, queue, upload
- **[Product_telemetry_api](./product_telemetry_api.md)** — 1 routes — touches: auth, db
- **[Public](./public.md)** — 17 routes — touches: auth, db, cache, queue, email
- **[Qa_seed_api](./qa_seed_api.md)** — 1 routes — touches: auth, db
- **[Quiz_api](./quiz_api.md)** — 4 routes — touches: auth, db
- **[Social_api](./social_api.md)** — 11 routes — touches: auth, db
- **[Stats](./stats.md)** — 1 routes — touches: auth, db, cache, queue, email
- **[Superadmin](./superadmin.md)** — 28 routes — touches: auth, db, cache, queue, email
- **[Surveys](./surveys.md)** — 1 routes — touches: auth, db, cache, queue, email
- **[System](./system.md)** — 1 routes — touches: auth, db, cache, queue, email
- **[Tickets_api](./tickets_api.md)** — 5 routes — touches: auth, db, cache
- **[Verify-watermark](./verify-watermark.md)** — 1 routes — touches: auth, db, cache, queue, email
- **[Waitlist](./waitlist.md)** — 1 routes — touches: auth, db, cache, queue, email
- **[Infra](./infra.md)** — 1 routes — touches: auth, db

**Database:** sqlalchemy, 157 models — see [database.md](./database.md)

**UI:** 247 components (react) — see [ui.md](./ui.md)

**Libraries:** 213 files — see [libraries.md](./libraries.md)

## High-Impact Files

Changes to these files have the widest blast radius across the codebase:

- `/main.py` — imported by **66** files
- `/organization_access_api.py` — imported by **15** files
- `//output.py` — imported by **11** files
- `/config.py` — imported by **10** files
- `//client.py` — imported by **10** files
- `/db_types.py` — imported by **8** files

## Required Environment Variables

- `ALLOW_QA_SEED` — `heptacert\backend\src\qa_seed_api.py`
- `APPLE_WALLET_CERT_PATH` — `heptacert\backend\.env.example`
- `APPLE_WALLET_KEY_PASSWORD` — `heptacert\backend\.env.example`
- `APPLE_WALLET_KEY_PATH` — `heptacert\backend\.env.example`
- `APPLE_WALLET_PASS_TYPE_ID` — `heptacert\backend\.env.example`
- `APPLE_WALLET_TEAM_ID` — `heptacert\backend\.env.example`
- `APPLE_WALLET_WWDR_CERT_PATH` — `heptacert\backend\.env.example`
- `GOOGLE_OAUTH_CLIENT_ID` — `heptacert\backend\.env.example`
- `GOOGLE_OAUTH_CLIENT_SECRET` — `heptacert\backend\.env.example`
- `HEPTACERT_API_BASE` — `heptacert\backend\src\mcp_server.py`
- `HEPTACERT_API_KEY` — `heptacert\backend\src\mcp_server.py`
- `HEPTACERT_UNIT_ONLY` — `heptacert\backend\tests\conftest.py`
- _...21 more_

---
_Back to [index.md](./index.md) · Generated 2026-06-23_