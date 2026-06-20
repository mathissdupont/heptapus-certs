# heptapus-certs — Wiki

_Generated 2026-06-20 — re-run `npx codesight --wiki` if the codebase has changed._

Structural map compiled from source code via AST. No LLM — deterministic, 200ms.

> **How to use safely:** These articles tell you WHERE things live and WHAT exists. They do not show full implementation logic. Always read the actual source files before implementing new features or making changes. Never infer how a function works from the wiki alone.

## Articles

- [Overview](./overview.md)
- [Database](./database.md)
- [Auth](./auth.md)
- [Payments](./payments.md)
- [Admin](./admin.md)
- [Attend](./attend.md)
- [Auth_2fa_api](./auth_2fa_api.md)
- [Branding](./branding.md)
- [Community_api](./community_api.md)
- [Connections_api](./connections_api.md)
- [Document_export_jobs](./document_export_jobs.md)
- [Document_outputs_api](./document_outputs_api.md)
- [Domains_api](./domains_api.md)
- [Email_api](./email_api.md)
- [Event-team](./event-team.md)
- [Event_sponsors_api](./event_sponsors_api.md)
- [Events](./events.md)
- [Feature-policies](./feature-policies.md)
- [Files](./files.md)
- [Health](./health.md)
- [I18n](./i18n.md)
- [Lead_forms_api](./lead_forms_api.md)
- [Learning_path_api](./learning_path_api.md)
- [Legal](./legal.md)
- [Lms_api](./lms_api.md)
- [Lms_extended_api](./lms_extended_api.md)
- [Lti_api](./lti_api.md)
- [Marketplace_api](./marketplace_api.md)
- [Me](./me.md)
- [Member_certificates_api](./member_certificates_api.md)
- [Openapi-actions.json](./openapi-actions.json.md)
- [Openapi.json](./openapi.json.md)
- [Org_staff_api](./org_staff_api.md)
- [Platform_health_api](./platform_health_api.md)
- [Product_telemetry_api](./product_telemetry_api.md)
- [Public](./public.md)
- [Qa_seed_api](./qa_seed_api.md)
- [Quiz_api](./quiz_api.md)
- [Social_api](./social_api.md)
- [Stats](./stats.md)
- [Superadmin](./superadmin.md)
- [Surveys](./surveys.md)
- [System](./system.md)
- [Tickets_api](./tickets_api.md)
- [Verify-watermark](./verify-watermark.md)
- [Waitlist](./waitlist.md)
- [Infra](./infra.md)
- [Ui](./ui.md)
- [Libraries](./libraries.md)

## Quick Stats

- Routes: **690**
- Models: **155**
- Components: **238**
- Env vars: **33** required, **37** with defaults

## How to Use

- **New session:** read `index.md` (this file) for orientation — WHERE things are
- **Architecture question:** read `overview.md` (~500 tokens)
- **Domain question:** read the relevant article, then **read those source files**
- **Database question:** read `database.md`, then read the actual schema files
- **Library question:** read `libraries.md`, then read the listed source files
- **Before implementing anything:** read the source files listed in the article
- **Full source context:** read `.codesight/CODESIGHT.md`

## What the Wiki Does Not Cover

These exist in your codebase but are **not** reflected in wiki articles:
- Routes registered dynamically at runtime (loops, plugin factories, `app.use(dynamicRouter)`)
- Internal routes from npm packages (e.g. Better Auth's built-in `/api/auth/*` endpoints)
- WebSocket and SSE handlers
- Raw SQL tables not declared through an ORM
- Computed or virtual fields absent from schema declarations
- TypeScript types that are not actual database columns
- Routes marked `[inferred]` were detected via regex and may have lower precision
- gRPC, tRPC, and GraphQL resolvers may be partially captured

When in doubt, search the source. The wiki is a starting point, not a complete inventory.

---
_Last compiled: 2026-06-20 · 50 articles · [codesight](https://github.com/Houseofmvps/codesight)_