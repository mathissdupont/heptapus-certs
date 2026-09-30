# WP32 — Plan gate audit

Audited on 2026-09-30 against `heptacert/backend/src/plan_policy.py`, which is the
commercial entitlement source of truth. “API” below means the server rejects direct
requests as well as the UI hiding or replacing the feature.

## Contract

| Feature | Required plan | Frontend | API enforcement |
|---|---|---|---|
| Agenda | Starter+ | No paywall by design | Public/basic agenda remains available |
| Check-in | Pro+ | Event gate uses `checkin` | Event operations use the paid-plan owner guard |
| Ticketing | Pro+ | Server-driven event gate | Ticket routes use the paid-plan owner guard |
| Live engagement | Pro+ | Event gate uses `live_engagement` | Admin and public live routes validate the event owner |
| Bulk certificates | Pro+ | Server-driven event gate | Bulk issuing uses the paid-plan owner guard |
| Custom registration | Pro+ | Settings/API errors use the shared gate | Dedicated field routes and event config writes validate the owner |
| Branding | Pro+ | Organization branding tab uses `branding` | Logo/branding writes and hologram removal validate the owner |
| Certificate templates | Pro+ | Server-driven/shared gate | Preset routes use `certificate_templates`; Enterprise-locked presets keep their extra lock |
| CFP | Growth+ | Event gate uses `cfp` | Admin and public CFP routes validate the event owner |
| Networking | Growth+ | Public feature availability follows the event | Public meeting routes validate the event owner |
| Automation | Growth+ | `FeatureGate` uses `automation` | Automation routes use the central automation policy |
| Email | Growth+ | Email screens use `email` | Email routes use the central email policy |
| Segmentation | Growth+ | Segment screen uses `segmentation` | Segment routes use the central segmentation policy |
| Advanced analytics | Growth+ | Analytics screens use `advanced_analytics` | All advanced analytics and exports validate the event owner |
| Webhooks | Growth+ | Webhook screens use `webhooks` | CRUD and test-delivery routes validate the caller plan |
| Domains | Growth+ | Domain settings use `domains` | Domain CRUD/check routes validate the selected organization owner |
| API access | Growth+ | API-key route layout uses `api` | Legacy and v2 API-key routes validate the caller plan |
| Presentations | Growth+ | Organization and event layouts use `presentations` | Deck reads/writes validate the selected organization owner |
| Raffles | Growth+ | Event gate uses `raffles` | All raffle routes use the central raffle policy |
| Lead forms | Growth+ | Route layout uses `lead_forms` | Lead-form CRUD validates the selected organization owner |
| Accreditation | Enterprise | Route layout uses `accreditation` | Organization and event CPD routes validate plan and event access |
| CRM | Enterprise | Route layout uses `crm` | CRM organization helpers enforce Enterprise |
| Integrations | Enterprise | Route layout uses `integrations` | Enterprise integration helpers enforce Enterprise |
| LMS | Enterprise | Archived; not offered in active navigation | Archived module is not mounted as a live product surface |
| Training | Enterprise | Training screen uses `training` | Training organization helper enforces Enterprise |
| Team | Enterprise | Organization team settings use `team` | Team and collaborator access validate the organization owner |
| Reports | Enterprise | Route layout uses `reports` | Scheduled report helper enforces Enterprise |
| SSO | Enterprise | Managed from the Enterprise integrations surface | Configuration is Enterprise-gated; authorize/callback routes stay public for sign-in |
| Kiosk | Enterprise | Server-driven check-in surface | Kiosk organization/station management enforces Enterprise |
| Health | Enterprise | Superadmin-only surface | Platform-health API is superadmin-only, which supersedes a customer subscription gate |

## Rules locked in by this pass

- The backend registry defines plan IDs. Frontend metadata must contain the same feature
  keys, plan lists and staff-only flags; `featurePolicyParity.test.ts` fails on drift.
- Event dependencies authorize event access before checking the owner's plan. A foreign
  event therefore remains a 404 instead of leaking its existence through a plan error.
- Team members use the event/organization owner's subscription. `/billing/subscription`
  resolves the selected `X-Organization-Id`, so client gates and API gates agree.
- Subscription transport failures render a retry/error state. They never masquerade as an
  upgrade requirement and never trigger a paywall redirect.
- Superadmins bypass commercial gates. Public SSO callbacks and existing public
  presentation URLs are not blocked by an interactive admin paywall.

## Regression coverage

- Frontend policy parity test compares `FEATURE_METADATA` with the Python registry.
- Lead-form integration tests cover Pro rejection plus Growth and Enterprise access.
- Raffle integration tests cover Pro rejection and Growth operation.
- Existing analytics isolation tests confirm authorization still precedes plan checks.
- The complete backend suite and complete frontend suite are required before this audit is
  considered current.
