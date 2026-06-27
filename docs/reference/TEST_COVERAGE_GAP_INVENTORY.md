# Test Coverage Gap Inventory

Generated from `.codesight/coverage.md`, `.codesight/routes.md`, `.codesight/schema.md`, and current `heptacert/backend/tests` on 2026-06-23.

CodeSight reports 14% coverage across routes and models. The local route comparison found 92 covered route entries and 443 visible uncovered route entries. CodeSight's full route count is higher because some routes are dynamic/inferred or represented differently in the generated route map, so this document should be treated as the actionable minimum backlog.

## Current Covered Areas

The current suite already has useful coverage for:

- Basic auth/register/login/password reset.
- Basic event CRUD and a few attendee/attendance flows.
- Domain setup and Caddy authorization.
- Email config smoke tests.
- A small CRM summary/views/integration slice.
- Public profile/me/community feed basics.
- Pricing config, billing status, superadmin subscription grant/list.
- Survey config and badge rule basics.
- Ticket check-in/status basics.
- Venue and reservation basics.
- Generator, payments provider signatures, security utilities, route inventory, watermark, and plan policy unit tests.

## Coverage Gaps By Domain

### P0: Billing, Subscription, Plan Gates

Missing route/behavior coverage:

- `POST /api/billing/create-payment`
- `POST /api/billing/webhook/{provider_name}`
- `GET /api/billing/orders`
- `GET /api/billing/subscription`
- `GET /api/superadmin/pricing`
- `PATCH /api/superadmin/pricing`
- `GET /api/superadmin/payment-config`
- `PATCH /api/superadmin/payment-config`
- `DELETE /api/superadmin/subscriptions/{sub_id}`
- `GET /api/feature-policies`
- `GET /api/plan-catalog`

Required tests:

- Payment disabled returns 503 on payment creation.
- Unknown plan, custom-price plan, invalid billing period.
- Provider success creates pending order and returns checkout payload.
- Provider failure marks order failed.
- Webhook rejects unknown provider, bad signature, mismatched amount, mismatched currency, mismatched provider ref.
- Paid webhook creates subscription, extends same-plan subscription, and is idempotent on duplicate webhook.
- Upgrade/downgrade semantics: new higher/lower plan should deactivate or supersede existing active plan if that is the desired product rule.
- `GET /billing/subscription` returns inactive for expired plans.
- Superadmin grant deactivates old active subscriptions and credits HC once.
- Revoke deactivates subscription and prevents gated access.
- Plan gate matrix: Starter, Pro, Growth, Enterprise, expired, inactive, superadmin bypass.

Suggested files:

- `test_billing_lifecycle.py`
- `test_subscription_gates.py`
- `test_feature_policy_contract.py`

### P0: Auth, Identity, Account Security

Missing route/behavior coverage:

- 2FA endpoints: `/status`, `/setup`, `/confirm`, `/enable`, `/disable`, `/backup-codes`, regenerate/status, `/api/auth/2fa/validate`.
- Email verification routes for admin and public members.
- Magic link routes.
- Google OAuth start/callback and OAuth bridge exchange.
- OAuth server routes: validate, authorize, token, userinfo, disconnect, token revocation.
- OIDC and SSO authorize/callback routes.

Required tests:

- 2FA setup creates secret, confirm validates TOTP, enable/disable state transitions, backup code single-use, regeneration invalidates old codes.
- Email verification token success, invalid token, expired/reused token, resend throttling expectations.
- Magic link token creation, verification, expired/reused token, deleted user blocked.
- OAuth authorize rejects invalid redirect URI/scope/client, supports PKCE, code is single-use, refresh tokens can be revoked.
- OIDC/SSO callback rejects invalid state and inactive provider.
- Soft-deleted users cannot login or receive privileged tokens.

Suggested files:

- `test_auth_2fa_api.py`
- `test_email_verification_flows.py`
- `test_oauth_server.py`
- `test_oidc_sso.py`

### P0: Authorization And Organization Access

Missing behavior coverage:

- Owner versus collaborator access for event-scoped admin routes.
- Enterprise owner requirement for org staff/team access.
- Organization context switching via `X-Organization-Id`.
- Organization module settings and onboarding routes.
- Staff invite/accept routes.

Required tests:

- Owner can manage own org/event.
- Collaborator can access only when owner is Enterprise and permission matches.
- Collaborator is denied when owner is Pro/Growth/expired/inactive.
- Permission-specific denial for team, CRM, reports, training, LMS, integrations.
- Superadmin bypass is explicit and audited where relevant.
- Organization contexts include owned org and eligible Enterprise memberships only.

Suggested files:

- `test_organization_access_gates.py`
- `test_org_staff_invites.py`
- `test_org_modules_api.py`

### P0: Event Operations And Certificates

Missing route clusters:

- Analytics details/export: badges, tiers, timeline, CSV/XLSX.
- Bulk certificate jobs: create/list/get/cancel/download.
- Certificate template presets: list/apply/versions/rollback/snapshots/delete.
- Certificate tiers.
- Check-in nonce/kiosk sessions/lookup/activity/stream.
- Sessions CRUD beyond smoke.
- Attendee update/import/export/bulk flows.
- Raffles draw/redraw/reset/export/audit edge cases.
- Quiz admin/public attempt and certificate issue routes.
- Sponsors, CPD, accreditation, public participant status.

Required tests:

- Event feature flags deny disabled certificate/check-in/ticketing/raffle/quiz flows.
- Non-owner and wrong-event access returns 403/404 consistently.
- Bulk cert job handles insufficient HC, duplicate names, missing template, cancelled job, generated ZIP, partial failures.
- Template preset rollback restores config and records version/snapshot.
- Check-in nonce is single-use and expires; kiosk revoked/expired token denied.
- Attendance duplicate scan is idempotent and logged.
- Analytics exports return correct content type and filtered data.
- Raffle draw respects attendance eligibility, winner count, reserve count, no duplicate winners, reset clears state.
- Quiz attempt scoring, max attempts, inactive quiz, required-for-cert certificate issue rules.

Suggested files:

- `test_event_feature_gates.py`
- `test_bulk_certificate_jobs.py`
- `test_certificate_templates_api.py`
- `test_checkin_ops_api.py`
- `test_event_sessions_attendees.py`
- `test_quiz_api.py`

### P0: Email, Automation, Segments, Webhooks

Missing route clusters:

- Bulk email create/list/detail/cancel/delivery stats/logs.
- Scheduled email create/list.
- Template preview and system templates.
- Email analytics summary and tracking open/click/unsubscribe.
- Superadmin bulk email/system digest flows.
- Automation CRUD, dry-run, dispatch-now, execution logs.
- Audience segment list/save/delete/export jobs/download/handoff.
- Webhook test route and delivery behavior.

Required tests:

- Growth/Enterprise gate for every email, automation, segment, and webhook endpoint.
- Bulk email validates recipient type, counts recipients, queues job, logs failures.
- Cancel changes pending/processing jobs only.
- Delivery log endpoint rejects wrong event/job owner.
- Tracking pixel/click routes increment counts idempotently enough for expected product behavior.
- Unsubscribe verify and submit update attendee state.
- Automation dry-run does not send, dispatch-now creates execution logs.
- Segment export creates job, downloads only complete owned job, invalid segment key rejected.
- Webhook test signs payload and records delivery.

Suggested files:

- `test_email_jobs_api.py`
- `test_email_tracking_unsubscribe.py`
- `test_automation_api.py`
- `test_audience_segments_api.py`
- `test_webhooks_api.py`

### P1: CRM And Lead Capture

Missing route clusters:

- CRM accounts, contacts, deals, activities, pipeline.
- CRM sequences enroll/unenroll/enrollments.
- Participant CRM profile/snapshot/audit/bulk update/export/import/tag-no-shows/filter-by-score.
- Lead score recalculation.
- Lead forms CRUD and public submission/submissions.
- CRM handoff from audience segments.

Required tests:

- Enterprise-only access for CRM and lead forms.
- Account/contact/deal CRUD scoped to organization.
- Deal stage/pipeline summaries update from underlying data.
- Sequence enrollment prevents duplicates and respects active/inactive state.
- CSV import validates bad rows and creates CRM profiles.
- Merge duplicates preserves activity/snapshot history.
- Public lead form rejects inactive form, validates required fields, increments submission count, routes destination.

Suggested files:

- `test_crm_accounts_deals.py`
- `test_crm_sequences.py`
- `test_crm_participants.py`
- `test_lead_forms_api.py`

### P1: LMS, Learning Paths, Training

Missing route clusters:

- Learning path steps/enrollments/public progress.
- Course marketplace and public course enrollment.
- Course modules completion/submission.
- LMS enrollments import/invite.
- Announcements, assignments, gradebook, rubrics, discussions, groups.
- LMS quizzes/questions/choices/attempts/results.
- Course attendance records.
- LMS analytics and compliance/outcomes.
- LTI launch/tools.
- Training templates, bulk assign, recurring rules, reports/export, renewal recommendations, notification logs.

Required tests:

- Enterprise-only gate for admin LMS/training.
- Published/unpublished public visibility.
- Enrollment idempotency and access to enrolled-only content.
- Module completion updates progress and journey progress.
- Assignment submission and grading update gradebook summary.
- Quiz scoring handles multiple choice, text answer, max attempts, show-correct setting.
- Rubric scores validate criteria belong to rubric/submission.
- Attendance records only for enrolled members.
- Training recurring rules create assignments and avoid duplicates.
- Training report export filters department/status/due date.

Suggested files:

- `test_learning_paths_api.py`
- `test_lms_courses_public.py`
- `test_lms_admin_coursework.py`
- `test_lms_quizzes.py`
- `test_lms_analytics.py`
- `test_training_extended.py`

### P1: Public, Community, Member Wallet

Missing route clusters:

- Follow/unfollow/block/privacy/followers/following/connection stats.
- Organization public profiles/feed.
- Public post like/unlike/edit/delete/history/comments.
- Public forms meta/submit.
- Marketplace categories/detail/course listing.
- Wallet analytics and certificate privacy audit/share cache.

Required tests:

- Follow/unfollow idempotency.
- Block prevents follow, comments, visibility as expected.
- Privacy settings hide followers/following according to mode.
- Comment tree and vote behavior.
- Post edit/delete authorization.
- Public forms validate active status and required fields.
- Wallet analytics logs certificate views/shares and respects privacy settings.

Suggested files:

- `test_connections_api.py`
- `test_community_posts_comments.py`
- `test_public_forms_api.py`
- `test_marketplace_api.py`
- `test_member_wallet_privacy.py`

### P1: Integrations

Missing route clusters:

- Google Sheets status/start/callback.
- Microsoft Excel status/start/callback/event sync/connect/delete.
- Integration catalog and enterprise provider config/test.
- Webinar/Zoom listing/import.
- Notification integration config/test.

Required tests:

- Enterprise-only gate for provider configuration.
- OAuth callback state mismatch and token exchange failures.
- Status returns connected/expired/disconnected states.
- Event sync rejects wrong owner/event and handles provider error.
- Provider config test masks secrets and does not persist failed credentials.

Suggested files:

- `test_google_sheets_integration.py`
- `test_microsoft_excel_integration.py`
- `test_notification_integrations_api.py`

### P1: Presentations

Missing route clusters:

- Deck list/upload/generate.
- Security/session/notes/file/remote QR/export/presenter-token.
- Audience and control token routes.

Required tests:

- Deck owner/org scoping.
- Upload validates file type/size/security policy.
- Audience token expiration and disabled audience access.
- Control token can update session, audience token cannot.
- Speaker notes are per user/deck/slide.
- Export status and file download paths are authorization-safe.

Suggested files:

- `test_presentation_api.py`
- `test_presentation_tokens.py`

### P2: Superadmin And Platform

Missing route clusters:

- Admin role patch.
- Coin credit.
- Waitlist.
- Stats get/patch.
- Dashboard/system health/platform health.
- Audit logs/export/security events.
- Job status/admin jobs.
- Product telemetry summary.
- QA seed.

Required tests:

- Superadmin-only enforcement.
- Audit export filters date/user/action and content type.
- Coin credit writes transaction and rejects invalid amount.
- Stats patch preserves required shape.
- QA seed requires explicit env flag and superadmin.

Suggested files:

- `test_superadmin_platform.py`
- `test_audit_logs_api.py`
- `test_product_telemetry_api.py`

### P2: API Keys, MCP, Files, Docs, Legal

Missing route clusters:

- API key scopes/v2/scopes patch.
- MCP me/agent-log/agent-logs.
- File serving path security.
- OpenAPI JSON/actions route contract.
- Official log document/PDF.
- Legal consent export.
- Waitlist public join duplicate behavior.

Required tests:

- API key hash never returned; scopes enforce route access; rate limit config persists.
- MCP agent logs are scoped and sanitize payload.
- Files reject traversal and missing files safely.
- OpenAPI endpoints include expected security schemes.
- Official log PDF rejects invalid document input.
- Waitlist duplicate email is idempotent.

Suggested files:

- `test_api_keys_ext_api.py`
- `test_mcp_api.py`
- `test_files_api.py`
- `test_openapi_contract.py`
- `test_waitlist_api.py`

## Model Coverage Gaps

Covered models include only 28 of 157. The uncovered/high-risk models that need direct behavior tests are:

- Billing/platform: `SystemConfig`, `WaitlistEntry`, `VerificationHit`, `ProductTelemetryEvent`.
- Subscription-adjacent access: `OrganizationAllowlist`, `EventTeamMember`, `OrgStaff`, `OrgSsoConfig`, `OAuthClient`, `OAuthCode`, `OAuthRefreshToken`.
- Event operations: `BulkCertificateJob`, `EventTemplateSnapshot`, `CertificateTierRule`, `BadgeRule`, `ParticipantBadge`, `EventRaffle`, `EventRaffleWinner`, `SponsorSlot`, `CheckinActivityLog`, `CheckinKioskSession`, `CheckinNonce`.
- Email/automation: `EmailTemplate`, `BulkEmailJob`, `EmailDeliveryLog`, `SuperadminBulkEmailJob`, `SystemEmailDigestConfig`, `WebhookSubscription`, `WebhookLog`, automation execution/log models.
- CRM/lead: `CrmAccount`, `CrmAccountContact`, `CrmDeal`, `CrmDealActivity`, `CrmEmailSequence`, `CrmSequenceStep`, `CrmSequenceEnrollment`, `LeadCaptureForm`, `LeadCaptureSubmission`.
- LMS/training: all `TrainingCourse`, `CourseModule`, `CourseEnrollment`, `ModuleProgress`, `CourseAssignment`, `AssignmentSubmission`, `CourseGradeItem`, `CourseGradeSummary`, `CourseDiscussion`, `DiscussionReply`, `Rubric`, `RubricCriterion`, `RubricRating`, `SubmissionRubricScore`, `LearningOutcome`, `CourseOutcomeAlignment`, `OutcomeMastery`, `CourseGroup`, `CourseGroupMember`, `CourseAnnouncement`, `OrgLmsStaff`, `LMSQuiz`, `LMSQuizQuestion`, `LMSQuizChoice`, `LMSQuizAttempt`, `LMSQuizAnswer`, `LtiTool`, `LearningPath*`, `LmsJourney*`.
- Integrations/presentations: `UserGoogleIntegration`, `UserMicrosoftIntegration`, `PresentationSpeakerNote`.

## Frontend Test Gaps

There is no visible frontend test runner or test suite in `heptacert/frontend`.

Required frontend test coverage:

- `useSubscription`, `planAllows`, `FeatureGate`, `PlanGateCard`.
- Admin navigation gating for Starter/Pro/Growth/Enterprise/staff.
- Pricing cards: free, checkout-enabled, waitlist, enterprise/contact sales.
- Critical forms: event create/edit, attendee import/add, email settings, CRM forms, lead forms, training assignment, LMS course/module forms.
- Public flows: registration, email verification, ticket page, certificate verification, survey/quiz, marketplace detail.
- Presentation remote/audience token pages.

Suggested setup:

- Unit/component: Vitest + React Testing Library.
- E2E smoke: Playwright for login, create event, register attendee, check-in, issue cert, verify cert, plan gate checks.

## Recommended Test Milestones

1. Raise backend route/model coverage from 14% to about 30%.
   - Add P0 suites only: subscription gates, billing lifecycle, auth 2FA/email verify, organization access, event feature gates, check-in, bulk certificate jobs, email jobs.

2. Raise coverage to about 50%.
   - Add P1 suites: CRM/lead, LMS core, training, public/community, integrations, presentations.

3. Stabilize release confidence.
   - Add frontend component tests and Playwright smoke flows.
   - Add contract tests for OpenAPI, feature policy, plan catalog, route inventory, and permission matrix.

## First 10 Test Files To Create

1. `heptacert/backend/tests/test_subscription_gates.py`
2. `heptacert/backend/tests/test_billing_lifecycle.py`
3. `heptacert/backend/tests/test_feature_policy_contract.py`
4. `heptacert/backend/tests/test_organization_access_gates.py`
5. `heptacert/backend/tests/test_event_feature_gates.py`
6. `heptacert/backend/tests/test_checkin_ops_api.py`
7. `heptacert/backend/tests/test_bulk_certificate_jobs.py`
8. `heptacert/backend/tests/test_email_jobs_api.py`
9. `heptacert/backend/tests/test_audience_segments_api.py`
10. `heptacert/backend/tests/test_auth_2fa_api.py`
