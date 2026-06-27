# Subscription Model and Test Gaps

Generated from CodeSight files and source review on 2026-06-23.

## CodeSight Snapshot

- CodeSight reports 715 routes, 157 models, 247 frontend components, and 14% route/model test coverage.
- There are 26 backend test files. The route inventory test protects route disappearance, but most domains still lack behavior-level assertions.
- Subscription logic was split across `DEFAULT_PRICING`, `plan_policy.py`, frontend `featureMetadata.ts`, `FeatureGate`, and ad hoc checks such as `require_paid_plan`, `require_email_system_access`, and Enterprise-only organization guards.

## Highest Priority Test Gaps

1. Subscription and billing lifecycle
   - Payment webhook idempotency for repeated paid events.
   - Plan upgrade/downgrade behavior when an active subscription already exists on another plan.
   - Expired subscriptions across `require_paid_plan`, email-system gates, and organization Enterprise checks.
   - Superadmin grant/revoke side effects, especially HeptaCoin crediting and active subscription deactivation.
   - `GET /api/feature-policies` and `GET /api/plan-catalog` contract tests.

2. Authorization and organization access
   - Owner versus collaborator access on event-scoped routes.
   - Enterprise owner requirement for team members, CRM, lead forms, integrations, LMS, training, SSO, reports, and kiosk mode.
   - Negative tests for non-owner users on paid event operations.
   - Superadmin bypass behavior on gated features.

3. Event operations
   - Sessions, attendees, imports, attendance export, check-in nonce/kiosk flows, ticket status transitions, and raffle lifecycle need more matrix coverage.
   - Event feature flags should be tested with disabled check-in, disabled ticketing, disabled certificates, disabled raffles, and public registration off.
   - Bulk certificate jobs need quota exhaustion, duplicate names, missing template files, cancelled jobs, and partial-failure cases.

4. Email, automation, and audience
   - Bulk email scheduling/cancel/delivery logs.
   - Template preview rendering and saved-account selection.
   - Automation dry-run, dispatch-now, execution logs, and CRM handoff paths.
   - Segment exports, saved segments, download authorization, and export job failure states.

5. CRM, lead capture, LMS, training
   - CRM account/deal/contact/sequence CRUD behavior is only lightly covered relative to its route surface.
   - Lead form public submission and admin routing should cover inactive forms, malformed fields, duplicate slugs, and CRM destination behavior.
   - LMS/course marketplace/course enrollment/quizzes/rubrics/outcomes/attendance routes need behavior-level tests.
   - Training assignments, department filters, renewal notifications, and compliance exports need negative cases.

6. Integrations and platform surfaces
   - Webhook create/update/test/log verification, including invalid URLs and signing.
   - OAuth/OIDC/LTI/SSO flows need contract tests for redirect URI, scopes, inactive clients, and token reuse.
   - Google/Microsoft integration connection states and callback failure modes.
   - Platform health and observability routes should test superadmin-only access.

7. Frontend gates
   - `FeatureGate`, `PlanGateCard`, and `useSubscription.planAllows` need component/unit coverage.
   - Admin navigation should hide or gate Enterprise-only modules consistently for owners and staff.
   - Pricing page should render free, paid, waitlist, and enterprise/contact-sales states from API data.

## Subscription Model

### Starter

Position: free verification and lightweight issuing.

Included:
- Public certificate verification.
- Basic certificate editor.
- Public profiles and public community read surfaces.
- Starter HC/welcome balance as configured by pricing.

Not included:
- Event operations such as check-in, ticketing, bulk certificates, custom registration fields.
- Growth operations such as email, automation, segmentation, API, webhooks, advanced analytics, branding, domains, presentations, raffles.
- Enterprise operations such as organization team/staff, CRM, lead forms, LMS, training, accreditation, SSO, integrations, scheduled reports, kiosk, platform health.

### Pro

Position: paid event operations for organizers.

Included:
- Check-in.
- Ticketing.
- Bulk certificate generation.
- Custom registration forms.

Not included:
- Automation, bulk email, segmentation, advanced analytics, webhooks, domains, branding, API access, certificate template library, presentations, raffles.
- All Enterprise organization/compliance modules.

### Growth

Position: scaling event/business operations.

Included:
- Everything in Pro.
- Automation.
- Bulk email.
- Audience segmentation.
- Advanced analytics.
- Webhooks.
- Custom domains.
- Branding.
- API access.
- Certificate template library.
- Presentations.
- Raffles.

Not included:
- CRM, lead forms, enterprise integrations, LMS, training compliance, organization team/staff expansion, scheduled reports, SSO, accreditation, kiosk mode, platform health.

### Enterprise

Position: organization-grade operations and compliance.

Included:
- Everything in Growth.
- CRM.
- Lead forms.
- Enterprise integrations.
- LMS.
- Training compliance.
- Organization team/staff collaboration.
- Scheduled reports.
- SSO.
- Accreditation.
- Kiosk mode.
- Platform health.

Not included:
- None by product policy; commercial limits may still be set by contract.

## Implementation Notes

- `heptacert/backend/src/plan_policy.py` is now the central source for feature policy and plan catalog payloads.
- `heptacert/frontend/src/lib/featureMetadata.ts` mirrors the expanded feature set so UI gates can use the same naming.
- `useSubscription` now applies rank-based plan checks, so higher plans satisfy lower-tier requirements.
- `subscription_is_active_plan` now rejects inactive subscription records even if the plan and expiry match.

## Next Tests To Add First

1. `test_subscription_gates.py`: Pro/Growth/Enterprise matrix for `require_paid_plan`, `require_email_system_access`, and Enterprise org access.
2. `test_billing_lifecycle.py`: webhook idempotency, mismatched amount/currency/ref, active subscription replacement, expiry extension.
3. `test_feature_policy_contract.py`: backend `/api/feature-policies` and frontend metadata key parity.
4. `test_frontend_subscription_gates`: `planAllows`, `FeatureGate`, and pricing card states.
