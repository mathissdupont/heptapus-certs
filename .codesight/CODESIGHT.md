# heptapus-certs — AI Context Map

> **Stack:** fastapi, next-pages, next-app | sqlalchemy | react | typescript
> **Microservices:** backend, heptacert-docs, heptacert-frontend

> 690 routes | 155 models | 238 components | 199 lib files | 70 env vars | 7 middleware | 14% test coverage
> **Token savings:** this file is ~51,600 tokens. Without it, AI exploration would cost ~568,400 tokens. **Saves ~516,800 tokens per conversation.**
> **Last scanned:** 2026-06-20 09:44 — re-run after significant changes

---

# Routes

## CRUD Resources

- **`/api/admin/accreditation`** GET | POST | GET/:id | PATCH/:id | DELETE/:id → Accreditation
- **`/api/admin/events/{event_id}/cpd`** GET | PUT/:id | DELETE/:id → Cpd
- **`/api/admin/events/{event_id}/automations`** GET | POST | GET/:id | PATCH/:id | DELETE/:id → Automation
- **`/api/admin/crm/accounts`** GET | POST | GET/:id | PATCH/:id | DELETE/:id → Account
- **`/api/admin/crm/accounts/{account_id}/contacts`** GET | POST | GET/:id | DELETE/:id → Contact
- **`/api/admin/crm/deals/{deal_id}/activities`** GET | POST | GET/:id | DELETE/:id → Activitie
- **`/api/admin/crm/sequences`** GET | POST | GET/:id | PATCH/:id | DELETE/:id → Sequence
- **``** GET | POST | GET/:id
- **`/api/domains`** GET | POST | GET/:id | DELETE/:id → Domain
- **`/api/admin/events/{event_id}/email-templates`** GET | POST | GET/:id | PATCH/:id | DELETE/:id → Email-template
- **`/api/admin/crm/views`** GET | POST | GET/:id | PATCH/:id | DELETE/:id → View
- **`/api/admin/crm/integrations/hubspot`** GET | PATCH/:id | DELETE/:id → Hubspot
- **`/api/admin/crm/integrations/salesforce`** GET | PATCH/:id | DELETE/:id → Salesforce
- **`/api/admin/crm/integrations/mailchimp`** GET | PATCH/:id | DELETE/:id → Mailchimp
- **`/api/admin/events/{event_id}/registration-fields`** GET | POST | PUT/:id → Registration-field
- **`/api/admin/events/{event_id}/ticket-types`** GET | POST | GET/:id | PATCH/:id | DELETE/:id → Ticket-type
- **`/api/admin/events/{event_id}/sponsors`** GET | POST | GET/:id | PUT/:id | DELETE/:id → Sponsor
- **`/api/admin/lead-forms`** GET | POST | GET/:id | PATCH/:id | DELETE/:id → Lead-form
- **`/api/admin/learning-paths`** GET | POST | GET/:id | PATCH/:id | DELETE/:id → Learning-path
- **`/api/admin/lms/lti-tools`** GET | POST | GET/:id | PATCH/:id | DELETE/:id → Lti-tool
- **`/api/admin/webhooks`** GET | POST | GET/:id | PATCH/:id | DELETE/:id → Webhook
- **`/api/superadmin/admins`** GET | POST | GET/:id | DELETE/:id → Admin
- **`/api/public/me`** GET | PATCH/:id | DELETE/:id → Me
- **`/api/admin/events`** GET | POST | GET/:id | PATCH/:id | DELETE/:id → Event
- **`/api/admin/events/{event_id}/attendees`** GET | POST | GET/:id | PATCH/:id | DELETE/:id → Attendee
- **`/api/admin/events/{event_id}/team`** GET | POST | GET/:id | PATCH/:id | DELETE/:id → Team
- **`/api/admin/api-keys`** GET | POST | GET/:id | DELETE/:id → Api-key
- **`/api/superadmin/support-tickets`** GET | GET/:id | PATCH/:id → Support-ticket
- **`/api/admin/events/{event_id}/sessions`** GET | POST | GET/:id | PATCH/:id | DELETE/:id → Session
- **`/api/superadmin/organizations`** GET | POST | GET/:id | PATCH/:id | DELETE/:id → Organization
- **`/api/admin/integrations/notifications`** GET | GET/:id | PATCH/:id | DELETE/:id → Notification
- **`/api/admin/superadmin/oauth-clients`** GET | POST | GET/:id | PATCH/:id → Oauth-client
- **`/api/admin/organization/team`** GET | POST | GET/:id | PATCH/:id | DELETE/:id → Team
- **`/api/admin/org/staff`** GET | GET/:id | PATCH/:id | DELETE/:id → Staff
- **`/api/admin/events/{event_id}/quiz`** GET | POST | PATCH/:id | DELETE/:id → Quiz
- **`/api/admin/events/{event_id}/raffles`** GET | POST | GET/:id | PATCH/:id | DELETE/:id → Raffle
- **`/api/admin/reports`** GET | POST | GET/:id | PATCH/:id | DELETE/:id → Report
- **`/api/admin/community/posts`** GET | POST | GET/:id | DELETE/:id → Post
- **`/api/admin/sso`** GET | POST | GET/:id | PATCH/:id | DELETE/:id → Sso
- **`/api/admin/training/departments`** GET | POST | GET/:id | PATCH/:id → Department
- **`/api/admin/training/assignments`** GET | POST | GET/:id | PATCH/:id | DELETE/:id → Assignment
- **`/api/admin/organization/venues`** GET | POST | GET/:id | PATCH/:id | DELETE/:id → Venue
- **`/api/admin/organization/venue-reservations`** GET | POST | GET/:id | PATCH/:id | DELETE/:id → Venue-reservation
- **`/api/admin/lms/staff`** GET | POST | GET/:id | DELETE/:id → Staff
- **`/api/admin/lms/courses`** GET | POST | GET/:id | PATCH/:id | DELETE/:id → Course
- **`/api/admin/lms/courses/{course_id}/modules`** POST | PATCH/:id | DELETE/:id → Module
- **`/api/admin/lms/journeys`** GET | POST | GET/:id | PATCH/:id | DELETE/:id → Journey
- **`/api/admin/lms/courses/{course_id}/grade-items`** GET | POST | GET/:id | PATCH/:id | DELETE/:id → Grade-item
- **`/api/admin/lms/courses/{course_id}/discussions`** GET | POST | GET/:id → Discussion
- **`/api/admin/lms/courses/{course_id}/rubrics`** GET | POST | GET/:id | DELETE/:id → Rubric
- **`/api/admin/lms/outcomes`** GET | POST | GET/:id | PATCH/:id | DELETE/:id → Outcome
- **`/api/admin/lms/courses/{course_id}/outcomes`** GET | POST | GET/:id | DELETE/:id → Outcome
- **`/api/admin/lms/badges`** GET | POST | GET/:id | PATCH/:id | DELETE/:id → Badge
- **`/api/admin/lms/courses/{course_id}/calendar`** GET | POST | GET/:id | DELETE/:id → Calendar
- **`/api/admin/lms/courses/{course_id}/attendance-sessions`** GET | POST | GET/:id | PATCH/:id | DELETE/:id → Attendance-session
- **`/api/admin/lms/bridges`** GET | POST | GET/:id | DELETE/:id → Bridge
- **`/api/admin/lms/quizzes`** GET/:id | PATCH/:id | DELETE/:id → Quizze
- **`/api/public/courses/{course_id}/discussions`** GET | POST | GET/:id → Discussion

## Other Routes

- `GET` `/api/admin/accreditation/bodies` params() → out: CpdSummaryOut [auth, db]
- `GET` `/api/admin/members/{member_id}/cpd` params(member_id) → out: CpdSummaryOut [auth, db]
- `GET` `/api/admin/accreditation/cpd-summary` params() → out: CpdSummaryOut [auth, db]
- `POST` `/api/admin/ai/generate-email` → out: EmailGenerateOut [auth, db, ai]
- `POST` `/api/admin/ai/generate-form` → out: EmailGenerateOut [auth, db, ai]
- `GET` `/api/admin/ai/anomalies/{event_id}` params(event_id) → out: AnomalyOut [auth, db, ai]
- `POST` `/api/admin/ai/digest/trigger` params() → out: AnomalyOut [auth, db, ai]
- `GET` `/api/admin/ai/digest/latest` params() → out: AnomalyOut [auth, db, ai]
- `POST` `/api/admin/superadmin/ai/digest/run-weekly` params() → out: AnomalyOut [auth, db, ai]
- `GET` `/api/admin/events/{event_id}/analytics` params(event_id) [auth, db]
- `GET` `/api/admin/events/{event_id}/analytics/engagement` params(event_id) [auth, db] ✓
- `GET` `/api/admin/events/{event_id}/analytics/badges` params(event_id) [auth, db]
- `GET` `/api/admin/events/{event_id}/analytics/tiers` params(event_id) [auth, db]
- `GET` `/api/admin/events/{event_id}/analytics/timeline` params(event_id) [auth, db]
- `GET` `/api/admin/events/{event_id}/analytics/export.csv` params(event_id) [auth, db]
- `GET` `/api/admin/events/{event_id}/analytics/export.xlsx` params(event_id) [auth, db]
- `GET` `/api/admin/api-keys/scopes` params() → in: CurrentUse, out: list [auth, db]
- `GET` `/api/admin/api-keys/v2` params() → in: CurrentUse, out: list [auth, db]
- `POST` `/api/admin/api-keys/v2` params() → out: list [auth, db]
- `PATCH` `/api/admin/api-keys/{key_id}/scopes` params(key_id) → out: list [auth, db]
- `GET` `/api/admin/events/{event_id}/segments` params(event_id) → out: list [auth, db, upload]
- `GET` `/api/admin/events/{event_id}/segments/saved/list` params(event_id) → out: list [auth, db, upload]
- `POST` `/api/admin/events/{event_id}/segments/saved` params(event_id) → out: list [auth, db, upload]
- `DELETE` `/api/admin/events/{event_id}/segments/saved/{segment_id}` params(event_id, segment_id) → out: list [auth, db, upload]
- `POST` `/api/admin/events/{event_id}/segments/export-jobs` params(event_id) → out: list [auth, db, upload]
- `GET` `/api/admin/events/{event_id}/segments/export-jobs` params(event_id) → out: list [auth, db, upload]
- `GET` `/api/admin/events/{event_id}/segments/export-jobs/{job_id}/download` params(event_id, job_id) → out: list [auth, db, upload]
- `POST` `/api/admin/events/{event_id}/segments/{segment_key}/handoff/crm` params(event_id, segment_key) → out: list [auth, db, upload]
- `POST` `/api/admin/events/{event_id}/segments/{segment_key}/handoff/automation` params(event_id, segment_key) → out: list [auth, db, upload]
- `GET` `/api/admin/events/{event_id}/segments/{segment_key}` params(event_id, segment_key) → out: list [auth, db, upload]
- `GET` `/api/admin/events/{event_id}/segments/{segment_key}/export` params(event_id, segment_key) → out: list [auth, db, upload]
- `POST` `/api/admin/events/{event_id}/segments/{segment_key}/export-to-excel` params(event_id, segment_key) → out: list [auth, db, upload]
- `GET` `/status` params() → in: CurrentUse, out: TwoFAStatusOut [auth, db]
- `POST` `/setup` params() → out: TwoFAStatusOut [auth, db]
- `POST` `/confirm` params() → out: TwoFAStatusOut [auth, db]
- `POST` `/enable` params() → out: TwoFAStatusOut [auth, db]
- `PATCH` `/disable` params() → out: TwoFAStatusOut [auth, db]
- `POST` `/backup-codes` params() → out: TwoFAStatusOut [auth, db]
- `GET` `/backup-codes/status` params() → in: CurrentUse, out: TwoFAStatusOut [auth, db]
- `POST` `/backup-codes/regenerate` params() → out: TwoFAStatusOut [auth, db]
- `POST` `/api/admin/events/{event_id}/automations/dispatch-now` params(event_id) → out: AutomationSummaryOut [auth, db, queue, payment]
- `GET` `/api/admin/events/{event_id}/automations/{rule_id}/dry-run` params(event_id, rule_id) → out: AutomationSummaryOut [auth, db, queue, payment]
- `GET` `/api/admin/events/{event_id}/automations/logs` params(event_id) → out: AutomationSummaryOut [auth, db, queue, payment]
- `POST` `/api/admin/events/{event_id}/bulk-generate` params(event_id) → out: BulkCertificateJobOut [auth, db, upload]
- `GET` `/api/admin/events/{event_id}/bulk-generate-jobs` params(event_id) → out: BulkCertificateJobOut [auth, db, upload]
- `GET` `/api/admin/events/{event_id}/bulk-generate-jobs/{job_id}` params(event_id, job_id) → out: BulkCertificateJobOut [auth, db, upload]
- `POST` `/api/admin/events/{event_id}/bulk-generate-jobs/{job_id}/cancel` params(event_id, job_id) → out: BulkCertificateJobOut [auth, db, upload]
- `GET` `/api/admin/events/{event_id}/bulk-generate-jobs/{job_id}/download` params(event_id, job_id) → out: BulkCertificateJobOut [auth, db, upload]
- `GET` `/api/admin/certificate-template-presets` params() → out: list [auth, db]
- `POST` `/api/admin/events/{event_id}/certificate-template-presets` params(event_id) → out: list [auth, db]
- `POST` `/api/admin/events/{event_id}/certificate-template-presets/{preset_id}/apply` params(event_id, preset_id) → out: list [auth, db]
- `GET` `/api/admin/certificate-template-presets/{preset_id}/versions` params(preset_id) → out: list [auth, db]
- `POST` `/api/admin/certificate-template-presets/{preset_id}/rollback/{version}` params(preset_id, version) → out: list [auth, db]
- `GET` `/api/admin/certificate-template-presets/{preset_id}/snapshots` params(preset_id) → out: list [auth, db]
- `GET` `/api/admin/certificate-template-presets/builtin` params() → out: list [auth, db]
- `DELETE` `/api/admin/certificate-template-presets/{preset_id}` params(preset_id) → out: list [auth, db]
- `POST` `/api/admin/events/{event_id}/certificate-tiers` params(event_id) → out: CertificateTierRulesOut [auth, db, upload]
- `GET` `/api/admin/events/{event_id}/certificate-tiers` params(event_id) → out: CertificateTierRulesOut [auth, db, upload]
- `POST` `/api/admin/events/{event_id}/checkin-nonce` params(event_id) → out: CheckinNonceOut [auth, db, cache, queue]
- `POST` `/api/admin/events/{event_id}/kiosk-sessions` params(event_id) → out: CheckinNonceOut [auth, db, cache, queue]
- `GET` `/api/admin/events/{event_id}/kiosk-sessions` params(event_id) → out: CheckinNonceOut [auth, db, cache, queue]
- `POST` `/api/admin/events/{event_id}/kiosk-sessions/{kiosk_id}/revoke` params(event_id, kiosk_id) → out: CheckinNonceOut [auth, db, cache, queue]
- `GET` `/api/admin/events/{event_id}/checkin-lookup` params(event_id) → out: CheckinNonceOut [auth, db, cache, queue]
- `GET` `/api/admin/events/{event_id}/checkin-metrics` params(event_id) → out: CheckinNonceOut [auth, db, cache, queue] ✓
- `GET` `/api/admin/events/{event_id}/checkin-activity` params(event_id) → out: CheckinNonceOut [auth, db, cache, queue]
- `GET` `/api/admin/events/{event_id}/checkin/stream` params(event_id) → out: CheckinNonceOut [auth, db, cache, queue]
- `GET` `/api/public/organizations` params() → out: list [auth, db] ✓
- `GET` `/api/public/organizations/{org_public_id}` params(org_public_id) → out: list [auth, db]
- `POST` `/api/public/organizations/{org_public_id}/follow` params(org_public_id) → out: list [auth, db]
- `DELETE` `/api/public/organizations/{org_public_id}/follow` params(org_public_id) → out: list [auth, db]
- `POST` `/api/public/members/{member_public_id}/follow` params(member_public_id) → out: list [auth, db]
- `DELETE` `/api/public/members/{member_public_id}/follow` params(member_public_id) → out: list [auth, db]
- `GET` `/api/public/members/{member_public_id}/followers` params(member_public_id) → in: CurrentPublicMembe, out: list [auth, db]
- `GET` `/api/public/members/{member_public_id}/following` params(member_public_id) → in: CurrentPublicMembe, out: list [auth, db]
- `GET` `/api/public/members/{member_public_id}/connection-stats` params(member_public_id) → in: CurrentPublicMembe, out: list [auth, db]
- `POST` `/api/public/members/{member_public_id}/block` params(member_public_id) → out: list [auth, db]
- `DELETE` `/api/public/members/{member_public_id}/block` params(member_public_id) → out: list [auth, db]
- `GET` `/api/public/members/me/privacy` params() → in: CurrentPublicMembe, out: list [auth, db]
- `PATCH` `/api/public/members/me/privacy` params() → in: ConnectionPrivacyIn, out: list [auth, db]
- `GET` `/api/admin/crm/accounts/{account_id}/deals` params(account_id) → out: list [auth, db]
- `GET` `/api/admin/crm/pipeline` params() → out: list [auth, db]
- `POST` `/api/admin/crm/accounts/{account_id}/deals` params(account_id) → out: list [auth, db]
- `PATCH` `/api/admin/crm/deals/{deal_id}` params(deal_id) → out: list [auth, db]
- `DELETE` `/api/admin/crm/deals/{deal_id}` params(deal_id) → out: list [auth, db]
- `POST` `/api/admin/crm/sequences/{sequence_id}/enroll` params(sequence_id) → out: list [auth, db]
- `POST` `/api/admin/crm/sequences/{sequence_id}/unenroll` params(sequence_id) → out: list [auth, db]
- `GET` `/api/admin/crm/sequences/{sequence_id}/enrollments` params(sequence_id) → out: list [auth, db]
- `GET` `/{job_id}/download` params(job_id) → out: DocumentExportJobOut [auth, db, queue]
- `POST` `/official-log` params() → in: OfficialLogDocumentIn [auth]
- `POST` `/official-log/pdf` params() → in: OfficialLogDocumentIn [auth]
- `POST` `/api/domains/{domain}/regenerate` params(domain) → out: DomainOut [auth, db]
- `GET` `/api/admin/organization/domains` params() → out: DomainOut [auth, db]
- `GET` `/api/admin/organization/domain` params() → out: DomainOut [auth, db] ✓
- `PUT` `/api/admin/organization/domain` params() → out: DomainOut [auth, db] ✓
- `GET` `/api/domains/{domain}/check` params(domain) → out: DomainOut [auth, db]
- `GET` `/.internal/caddy/authorize` params() → out: DomainOut [auth, db] ✓
- `POST` `/api/admin/events/{event_id}/email-templates/{template_id}/preview` params(event_id, template_id) → out: list [auth, db, cache, queue, payment]
- `GET` `/api/system/email-templates` params() → in: AsyncSessio, out: list [auth, db, cache, queue, payment]
- `GET` `/api/admin/email-config` params() → in: AsyncSessio, out: list [auth, db, cache, queue, payment] ✓
- `PATCH` `/api/admin/email-config` params() → out: list [auth, db, cache, queue, payment] ✓
- `GET` `/api/admin/email-config/saved-accounts` params() → in: AsyncSessio, out: list [auth, db, cache, queue, payment]
- `POST` `/api/admin/email-config/test-connection` params() → out: list [auth, db, cache, queue, payment] ✓
- `POST` `/api/admin/events/{event_id}/bulk-email` params(event_id) → out: list [auth, db, cache, queue, payment]
- `GET` `/api/admin/events/{event_id}/bulk-email/{job_id}` params(event_id, job_id) → in: AsyncSessio, out: list [auth, db, cache, queue, payment]
- `GET` `/api/admin/events/{event_id}/bulk-emails` params(event_id) → in: AsyncSessio, out: list [auth, db, cache, queue, payment]
- `POST` `/api/admin/events/{event_id}/scheduled-email` params(event_id) → out: list [auth, db, cache, queue, payment]
- `GET` `/api/admin/events/{event_id}/scheduled-emails` params(event_id) → in: AsyncSessio, out: list [auth, db, cache, queue, payment]
- `POST` `/api/admin/events/{event_id}/bulk-emails-cancel/{job_id}` params(event_id, job_id) → out: list [auth, db, cache, queue, payment]
- `POST` `/api/admin/bulk-email-jobs/{job_id}/log-delivery` params(job_id) → out: list [auth, db, cache, queue, payment]
- `GET` `/api/admin/events/{event_id}/bulk-email-jobs/{job_id}/delivery-stats` params(event_id, job_id) → in: AsyncSessio, out: list [auth, db, cache, queue, payment]
- `GET` `/api/admin/events/{event_id}/bulk-email-jobs/{job_id}/delivery-logs` params(event_id, job_id) → in: AsyncSessio, out: list [auth, db, cache, queue, payment]
- `GET` `/api/superadmin/email-audience` params() → in: AsyncSessio, out: list [auth, db, cache, queue, payment]
- `POST` `/api/superadmin/bulk-email` params() → out: list [auth, db, cache, queue, payment]
- `POST` `/api/superadmin/bulk-email/test` params() → out: list [auth, db, cache, queue, payment]
- `POST` `/api/superadmin/bulk-email/jobs` params() → out: list [auth, db, cache, queue, payment]
- `GET` `/api/admin/email-analytics/summary` params() → in: AsyncSessio, out: list [auth, db, cache, queue, payment]
- `GET` `/api/public/track/open/{log_id}` params(log_id) → in: AsyncSessio, out: list [auth, db, cache, queue, payment]
- `GET` `/api/public/track/click/{log_id}` params(log_id) → in: AsyncSessio, out: list [auth, db, cache, queue, payment]
- `GET` `/api/public/attendees/{attendee_id}/unsubscribe-verify` params(attendee_id) → in: AsyncSessio, out: list [auth, db, cache, queue, payment]
- `GET` `/api/superadmin/system-digest/config` params() → in: AsyncSessio, out: list [auth, db, cache, queue, payment]
- `PATCH` `/api/superadmin/system-digest/config` params() → out: list [auth, db, cache, queue, payment]
- `POST` `/api/superadmin/system-digest/send-now` params() → out: list [auth, db, cache, queue, payment]
- `POST` `/api/superadmin/system-digest/test` params() → out: list [auth, db, cache, queue, payment]
- `GET` `/api/superadmin/system-digest/preview` params() → in: AsyncSessio, out: list [auth, db, cache, queue, payment]
- `GET` `/api/superadmin/bulk-email/jobs` params() → in: AsyncSessio, out: list [auth, db, cache, queue, payment]
- `GET` `/api/superadmin/email-activity` params() → in: AsyncSessio, out: list [auth, db, cache, queue, payment]
- `POST` `/api/superadmin/bulk-email/jobs/{job_id}/cancel` params(job_id) → out: list [auth, db, cache, queue, payment]
- `POST` `/api/superadmin/bulk-email/jobs/{job_id}/retry` params(job_id) → out: list [auth, db, cache, queue, payment]
- `GET` `/api/public/attendees/{attendee_id}/unsubscribe` params(attendee_id) → in: AsyncSessio, out: list [auth, db, cache, queue, payment]
- `POST` `/api/public/attendees/{attendee_id}/unsubscribe` params(attendee_id) → out: list [auth, db, cache, queue, payment]
- `GET` `/api/public/members/{member_id}/unsubscribe-digest` params(member_id) → in: AsyncSessio, out: list [auth, db, cache, queue, payment]
- `POST` `/api/public/members/{member_id}/unsubscribe-digest` params(member_id) → out: list [auth, db, cache, queue, payment]
- `GET` `/api/admin/crm/summary` params() → out: ParticipantCrmSummary [auth, db, cache, payment, upload] ✓
- `GET` `/api/admin/crm/participants` params() → out: ParticipantCrmSummary [auth, db, cache, payment, upload]
- `GET` `/api/admin/crm/participant` params() → out: ParticipantCrmSummary [auth, db, cache, payment, upload]
- `PATCH` `/api/admin/crm/participant` params() → out: ParticipantCrmSummary [auth, db, cache, payment, upload]
- `POST` `/api/admin/crm/integrations/hubspot/test` params() → out: ParticipantCrmSummary [auth, db, cache, payment, upload]
- `POST` `/api/admin/crm/integrations/hubspot/push` params() → out: ParticipantCrmSummary [auth, db, cache, payment, upload]
- `POST` `/api/admin/crm/bulk-update` params() → out: ParticipantCrmSummary [auth, db, cache, payment, upload]
- `POST` `/api/admin/crm/export-selected` params() → out: ParticipantCrmSummary [auth, db, cache, payment, upload]
- `POST` `/api/admin/crm/bulk-email` params() → out: ParticipantCrmSummary [auth, db, cache, payment, upload]
- `GET` `/api/admin/crm/duplicates` params() → out: ParticipantCrmSummary [auth, db, cache, payment, upload]
- `POST` `/api/admin/crm/merge` params() → out: ParticipantCrmSummary [auth, db, cache, payment, upload]
- `GET` `/api/admin/crm/participant/snapshot` params() → out: ParticipantCrmSummary [auth, db, cache, payment, upload]
- `GET` `/api/admin/crm/audit` params() → out: ParticipantCrmSummary [auth, db, cache, payment, upload]
- `POST` `/api/admin/crm/tag-no-shows` params() → out: ParticipantCrmSummary [auth, db, cache, payment, upload]
- `POST` `/api/admin/crm/import-csv` params() → out: ParticipantCrmSummary [auth, db, cache, payment, upload]
- `GET` `/api/admin/crm/filter-by-score` params() → out: ParticipantCrmSummary [auth, db, cache, payment, upload]
- `POST` `/api/admin/crm/integrations/salesforce/push` params() → out: ParticipantCrmSummary [auth, db, cache, payment, upload]
- `POST` `/api/admin/crm/integrations/mailchimp/push` params() → out: ParticipantCrmSummary [auth, db, cache, payment, upload]
- `POST` `/api/admin/crm/lead-scores/recalculate` params() → out: ParticipantCrmSummary [auth, db, cache, payment, upload]
- `POST` `/api/admin/crm/lead-scores/recalculate-selected` params() → out: ParticipantCrmSummary [auth, db, cache, payment, upload]
- `GET` `/api/public/events/{event_id}/sponsors` params(event_id) → out: SponsorSlotOut [auth, db, upload]
- `POST` `/foo` [auth]
- `GET` `/api/admin/lead-forms/{form_id}/submissions` params(form_id) → out: list [auth, db]
- `GET` `/api/public/forms/{slug}/meta` params(slug) → out: list [auth, db]
- `POST` `/api/public/forms/{slug}/submit` params(slug) → out: list [auth, db]
- `PUT` `/api/admin/learning-paths/{path_id}/steps` params(path_id) [auth, db]
- `GET` `/api/admin/learning-paths/{path_id}/enrollments` params(path_id) → in: Optional [auth, db]
- `GET` `/api/public/learning-paths` params() → in: Optional [auth, db]
- `POST` `/api/public/learning-paths/{path_id}/enroll` params(path_id) [auth, db]
- `GET` `/api/public/learning-paths/{path_id}/progress` params(path_id) → in: Optional [auth, db]
- `POST` `/api/public/learning-paths/{path_id}/steps/{step_id}/complete` params(path_id, step_id) [auth, db]
- `POST` `/api/public/courses/{course_id}/modules/{module_id}/lti-launch` params(course_id, module_id) [auth, db]
- `GET` `/api/events/{event_id}/capacities` params(event_id) → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai] ✓
- `POST` `/api/admin/events/{event_id}/badge-rules` params(event_id) → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai] ✓
- `GET` `/api/admin/events/{event_id}/badge-rules` params(event_id) → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai] ✓
- `POST` `/api/admin/events/{event_id}/badges` params(event_id) → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
- `GET` `/api/admin/events/{event_id}/badges` params(event_id) → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
- `GET` `/api/events/{event_id}/attendees/{attendee_id}/badges` params(event_id, attendee_id) → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
- `GET` `/api/events/{event_id}/survey-access` params(event_id) → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai] ✓
- `GET` `/api/events/{event_id}/participant-status` params(event_id) → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
- `GET` `/api/events/{event_id}/participant-status/me` params(event_id) → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
- `POST` `/api/admin/events/{event_id}/badges/calculate` params(event_id) → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
- `POST` `/api/admin/events/{event_id}/certificates/assign-tiers` params(event_id) → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
- `GET` `/api/admin/events/{event_id}/certificates/tier-summary` params(event_id) → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
- `POST` `/api/surveys/{event_id}/submit` params(event_id) → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai] ✓
- `POST` `/api/surveys/external/webhook` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
- `GET` `/api/admin/events/{event_id}/surveys/responses` params(event_id) → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
- `GET` `/api/health` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai] ✓
- `GET` `/api/openapi.json` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
- `GET` `/api/openapi-actions.json` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
- `POST` `/api/auth/login` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai] ✓
- `POST` `/api/auth/2fa/validate` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
- `POST` `/api/auth/register` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai] ✓
- `GET` `/api/auth/verify-email` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
- `POST` `/api/auth/resend-verification` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
- `POST` `/api/auth/oauth/bridge/exchange` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
- `GET` `/api/auth/google/start` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
- `GET` `/api/auth/google/callback` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
- `GET` `/api/admin/google/sheets/status` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
- `GET` `/api/admin/google/sheets/start` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
- `GET` `/api/admin/google/sheets/callback` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
- `GET` `/api/admin/microsoft/excel/status` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
- `GET` `/api/admin/microsoft/excel/start` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
- `GET` `/api/admin/microsoft/excel/callback` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
- `POST` `/api/public/auth/register` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai] ✓
- `POST` `/api/public/auth/login` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai] ✓
- `GET` `/api/public/auth/verify-email` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
- `POST` `/api/public/auth/resend-verification` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
- `POST` `/api/public/auth/forgot-password` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai] ✓
- `POST` `/api/public/auth/reset-password` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai] ✓
- `POST` `/api/auth/forgot-password` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai] ✓
- `POST` `/api/auth/reset-password` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai] ✓
- `GET` `/api/system/cert-templates` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
- `POST` `/api/admin/events/{event_id}/apply-cert-template` params(event_id) → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai] ✓
- `POST` `/api/admin/webhooks/{webhook_id}/test` params(webhook_id) → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
- `GET` `/api/superadmin/transactions` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
- `PATCH` `/api/superadmin/admins/{admin_id}/role` params(admin_id) → in: PublicMemberProfileUpdateIn, out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
- `GET` `/api/admin/transactions` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
- `POST` `/api/superadmin/coins/credit` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
- `POST` `/api/waitlist` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
- `GET` `/api/superadmin/waitlist` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
- `GET` `/api/pricing/config` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai] ✓
- `GET` `/api/superadmin/pricing` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
- `PATCH` `/api/superadmin/pricing` → in: PublicMemberProfileUpdateIn, out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
- `GET` `/api/stats` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai] ✓
- `GET` `/api/superadmin/stats` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
- `PATCH` `/api/superadmin/stats` → in: PublicMemberProfileUpdateIn, out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
- `GET` `/api/billing/status` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai] ✓
- `POST` `/api/billing/create-payment` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
- `POST` `/api/billing/webhook/{provider_name}` params(provider_name) → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
- `GET` `/api/billing/orders` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
- `GET` `/api/billing/subscription` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
- `GET` `/api/superadmin/payment-config` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
- `PATCH` `/api/superadmin/payment-config` → in: PublicMemberProfileUpdateIn, out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
- `GET` `/api/me` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai] ✓
- `GET` `/api/me/export` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
- `GET` `/api/public/me/export` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
- `GET` `/api/public/me/email-preferences` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
- `GET` `/api/public/me/email-prefereonces` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
- `PATCH` `/api/public/me/email-preferences` → in: PublicMemberProfileUpdateIn, out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
- `PATCH` `/api/public/me/email-prefereonces` → in: PublicMemberProfileUpdateIn, out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
- `POST` `/api/public/me/avatar` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai] ✓
- `GET` `/api/public/members/{member_public_id}` params(member_public_id) → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai] ✓
- `PATCH` `/api/public/me/password` → in: PublicMemberProfileUpdateIn, out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai] ✓
- `GET` `/api/public/my-events` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
- `PATCH` `/api/me/password` → in: PublicMemberProfileUpdateIn, out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
- `PATCH` `/api/me/email` → in: PublicMemberProfileUpdateIn, out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
- `DELETE` `/api/me` → in: DeleteAccountIn, out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai] ✓
- `POST` `/api/admin/ai/event-assistant` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
- `GET` `/api/admin/mcp/me` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
- `POST` `/api/admin/mcp/agent-log` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
- `GET` `/api/admin/mcp/agent-logs` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
- `POST` `/api/admin/certificates/{cert_id}/revoke` params(cert_id) → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
- `GET` `/api/admin/events/{event_id}/health` params(event_id) → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
- `GET` `/api/admin/events/{event_id}/access` params(event_id) → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
- `POST` `/api/event-team/invitations/accept` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
- `GET` `/api/admin/events/{event_id}/team/activity` params(event_id) → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
- `GET` `/api/admin/events/{event_id}/sheets` params(event_id) → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
- `POST` `/api/admin/events/{event_id}/sheets/connect` params(event_id) → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
- `POST` `/api/admin/events/{event_id}/sheets/sync` params(event_id) → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
- `DELETE` `/api/admin/events/{event_id}/sheets` params(event_id) → in: DeleteAccountIn, out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
- `POST` `/api/admin/events/{event_id}/template-upload` params(event_id) → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
- `POST` `/api/admin/events/{event_id}/banner-upload` params(event_id) → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
- `PUT` `/api/admin/events/{event_id}/config` params(event_id) → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai] ✓
- `GET` `/api/verify/{uuid}` params(uuid) → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
- `POST` `/api/verify-watermark` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
- `GET` `/api/files/{path:path}` params(path) → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
- `GET` `/api/branding` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai] ✓
- `GET` `/api/admin/organization/settings` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai] ✓
- `PATCH` `/api/admin/organization/settings` → in: PublicMemberProfileUpdateIn, out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai] ✓
- `POST` `/api/admin/organization/logo` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
- `GET` `/public/branding` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
- `GET` `/api/admin/events/{event_id}/certificates` params(event_id) → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
- `GET` `/api/admin/events/{event_id}/certificates/cost-estimate` params(event_id) → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
- `POST` `/api/admin/events/{event_id}/certificates` params(event_id) → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
- `PATCH` `/api/admin/certificates/{cert_id}` params(cert_id) → in: PublicMemberProfileUpdateIn, out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
- `DELETE` `/api/admin/certificates/{cert_id}` params(cert_id) → in: DeleteAccountIn, out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
- `POST` `/api/admin/events/{event_id}/certificates/bulk-action` params(event_id) → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
- `GET` `/api/admin/events/{event_id}/certificates/export` params(event_id) → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
- `GET` `/api/admin/dashboard/stats` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
- `GET` `/api/superadmin/system-health` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
- `GET` `/api/superadmin/subscriptions` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai] ✓
- `POST` `/api/superadmin/subscriptions/grant` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai] ✓
- `DELETE` `/api/superadmin/subscriptions/{sub_id}` params(sub_id) → in: DeleteAccountIn, out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
- `POST` `/api/auth/magic-link` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
- `GET` `/api/auth/magic-link/verify` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
- `GET` `/api/public/events` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai] ✓
- `GET` `/api/public/events/{event_id}` params(event_id) → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
- `GET` `/api/public/events/{event_id}/comments` params(event_id) → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
- `POST` `/api/public/events/{event_id}/comments` params(event_id) → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
- `POST` `/api/public/events/{event_id}/comments/{comment_id}/report` params(event_id, comment_id) → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
- `GET` `/api/events/{event_id}/info` params(event_id) → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai] ✓
- `POST` `/api/legal/document-events` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai] ✓
- `POST` `/api/events/{event_id}/registration-document` params(event_id) → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
- `POST` `/api/events/{event_id}/register` params(event_id) → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai] ✓
- `GET` `/api/events/{event_id}/verify-email` params(event_id) → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai] ✓
- `POST` `/api/events/{event_id}/resend-verification` params(event_id) → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
- `GET` `/api/attend/{checkin_token}` params(checkin_token) → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
- `POST` `/api/attend/{checkin_token}` params(checkin_token) → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
- `POST` `/api/admin/support-tickets` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai] ✓
- `PATCH` `/api/admin/events/{event_id}/sessions/{session_id}/toggle` params(event_id, session_id) → in: PublicMemberProfileUpdateIn, out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
- `GET` `/api/admin/events/{event_id}/sessions/{session_id}/qr` params(event_id, session_id) → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
- `GET` `/api/admin/events/{event_id}/attendaonce/export` params(event_id) → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
- `GET` `/api/admin/events/{event_id}/registration-documents/file` params(event_id) → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
- `GET` `/api/admin/events/{event_id}/registration-documents/export` params(event_id) → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
- `GET` `/api/admin/events/{event_id}/attendees/{attendee_id}/survey-link` params(event_id, attendee_id) → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
- `GET` `/api/admin/events/{event_id}/comments` params(event_id) → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
- `PATCH` `/api/admin/events/{event_id}/comments/{comment_id}` params(event_id, comment_id) → in: PublicMemberProfileUpdateIn, out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
- `GET` `/api/admin/events/{event_id}/attendees/filter-for-email` params(event_id) → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
- `POST` `/api/admin/events/{event_id}/attendees/import` params(event_id) → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
- `POST` `/api/admin/events/{event_id}/sessions/{session_id}/checkin` params(event_id, session_id) → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
- `GET` `/api/admin/events/{event_id}/operations` params(event_id) → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
- `DELETE` `/api/admin/events/{event_id}/attendance-records/{record_id}` params(event_id, record_id) → in: DeleteAccountIn, out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
- `GET` `/api/admin/events/{event_id}/attendance` params(event_id) → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai] ✓
- `GET` `/api/admin/events/{event_id}/attendaonce` params(event_id) → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
- `GET` `/api/admin/events/{event_id}/attendance/export` params(event_id) → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
- `POST` `/api/admin/events/{event_id}/bulk-certify` params(event_id) → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
- `POST` `/api/admin/events/{event_id}/bulk-certify-queue` params(event_id) → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
- `GET` `/api/admin/transactions/list` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
- `GET` `/api/superadmin/audit-logs` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
- `GET` `/api/superadmin/audit-logs/export` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
- `GET` `/api/admin/organization/legal-consents/export` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
- `GET` `/api/superadmin/security-events` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
- `GET` `/api/admin/organization/venue-reservations/google-calendar/status` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
- `GET` `/api/admin/organization/venue-reservations/google-calendar/start` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
- `POST` `/api/admin/organization/venue-reservations/google-calendar/sync` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
- `POST` `/api/superadmin/organizations/{org_id}/domain/approve` params(org_id) → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai] ✓
- `POST` `/api/superadmin/organizations/{org_id}/domain/revoke` params(org_id) → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai] ✓
- `GET` `/api/feature-policies` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
- `GET` `/api/superadmin/job-status` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
- `GET` `/api/admin/jobs` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
- `GET` `/api/admin/badge-templates` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
- `GET` `/api/public/marketplace` params() → in: Optional, out: list [auth, db]
- `GET` `/api/public/marketplace/categories` params() → in: Optional, out: list [auth, db]
- `GET` `/api/public/marketplace/{event_id}` params(event_id) → in: Optional, out: list [auth, db]
- `PATCH` `/api/admin/events/{event_id}/marketplace` params(event_id) → out: list [auth, db]
- `GET` `/api/public/marketplace/courses` params() → in: Optional, out: list [auth, db]
- `GET` `/api/public/marketplace/courses/{course_id}` params(course_id) → in: Optional, out: list [auth, db]
- `PATCH` `/api/admin/lms/courses/{course_id}/marketplace` params(course_id) → out: list [auth, db]
- `POST` `/api/public/members/me/wallet-analytics` params() → out: WalletAnalyticsOut [auth, db, cache]
- `GET` `/api/public/members/me/wallet-analytics` params() → in: CurrentPublicMembe, out: WalletAnalyticsOut [auth, db, cache]
- `GET` `/api/public/members/me/certificate-privacy/audit` params() → in: CurrentPublicMembe, out: WalletAnalyticsOut [auth, db, cache]
- `POST` `/api/public/certificates/{certificate_uuid}/share-cache` params(certificate_uuid) → out: WalletAnalyticsOut [auth, db, cache]
- `GET` `/api/public/members/me/certificate-privacy` params() → in: CurrentPublicMembe, out: WalletAnalyticsOut [auth, db, cache]
- `PATCH` `/api/public/members/me/certificate-privacy` params() → in: CertificatePrivacyIn, out: WalletAnalyticsOut [auth, db, cache]
- `GET` `/api/admin/events/{event_id}/microsoft-excel` params(event_id) → out: EventMicrosoftExcelStatusOut [auth, db, upload]
- `POST` `/api/admin/events/{event_id}/microsoft-excel/connect` params(event_id) → out: EventMicrosoftExcelStatusOut [auth, db, upload]
- `POST` `/api/admin/events/{event_id}/microsoft-excel/sync` params(event_id) → out: EventMicrosoftExcelStatusOut [auth, db, upload]
- `DELETE` `/api/admin/events/{event_id}/microsoft-excel` params(event_id) → out: EventMicrosoftExcelStatusOut [auth, db, upload]
- `GET` `/api/admin/integrations/catalog` params() → out: IntegrationCatalogOut [auth, db, payment]
- `GET` `/api/admin/integrations/enterprise-config` params() → out: IntegrationCatalogOut [auth, db, payment]
- `PATCH` `/api/admin/integrations/enterprise-config` params() → out: IntegrationCatalogOut [auth, db, payment]
- `POST` `/api/admin/integrations/provider-config/{provider_key}/test` params(provider_key) → out: IntegrationCatalogOut [auth, db, payment]
- `POST` `/api/admin/integrations/notifications/test` params() → out: IntegrationCatalogOut [auth, db, payment]
- `GET` `/api/admin/integrations/webinar/zoom/webinars` params() → out: IntegrationCatalogOut [auth, db, payment]
- `POST` `/api/admin/integrations/webinar/zoom/webinars/{webinar_id}/import` params(webinar_id) → out: IntegrationCatalogOut [auth, db, payment]
- `GET` `/api/oauth/validate` params() → in: st, out: ValidateOut [auth, db]
- `POST` `/api/oauth/authorize` params() → in: AuthorizeIn, out: ValidateOut [auth, db]
- `POST` `/api/oauth/token` params() → in: AuthorizeIn, out: ValidateOut [auth, db]
- `DELETE` `/api/admin/superadmin/oauth-clients/{client_id}/tokens` params(client_id) → out: ValidateOut [auth, db]
- `GET` `/api/oauth/userinfo` params() → in: st, out: ValidateOut [auth, db]
- `GET` `/api/admin/me/oauth-connections` params() → in: st, out: ValidateOut [auth, db]
- `DELETE` `/api/oauth/disconnect/{client_id}` params(client_id) → out: ValidateOut [auth, db]
- `GET` `/api/auth/oidc/start` params() → in: in [auth, db]
- `GET` `/api/auth/oidc/callback` params() → in: in [auth, db]
- `GET` `/api/admin/organization/contexts` params() → out: list [auth, db] ✓
- `GET` `/api/admin/analytics/org/overview` params() [auth, db]
- `GET` `/api/admin/analytics/org/training-compliance` params() [auth, db]
- `GET` `/api/admin/analytics/org/learning-paths` params() [auth, db]
- `GET` `/api/admin/analytics/org/crm` params() [auth, db]
- `GET` `/api/admin/analytics/org/cert-timeline` params() [auth, db] ✓
- `GET` `/admin/organization/modules` params() [auth, db]
- `PATCH` `/admin/organization/modules` params() [auth, db]
- `POST` `/admin/organization/onboarding` params() [auth, db]
- `POST` `/api/admin/org/staff/invite` params() → in: StaffAcceptIn [auth, db]
- `POST` `/api/org/staff/accept` params() → in: StaffAcceptIn [auth, db]
- `GET` `/api/superadmin/platform-health` params() [auth, db, payment]
- `POST` `/api/admin/product-telemetry` params() → in: ProductTelemetryIn [auth, db]
- `GET` `/api/superadmin/product-telemetry/summary` params() [auth, db]
- `POST` `/api/superadmin/qa-seed` params() [auth, db]
- `GET` `/api/admin/events/{event_id}/quiz/results` params(event_id) [auth, db]
- `POST` `/api/admin/events/{event_id}/quiz/attempts/{attempt_id}/issue-cert` params(event_id, attempt_id) [auth, db]
- `GET` `/api/public/events/{event_id}/quiz` params(event_id) [auth, db]
- `POST` `/api/public/events/{event_id}/quiz/start` params(event_id) [auth, db]
- `POST` `/api/public/events/{event_id}/quiz/submit` params(event_id) [auth, db]
- `GET` `/api/public/events/{event_id}/quiz/my-result` params(event_id) [auth, db]
- `GET` `/api/admin/events/{event_id}/raffles/audit` params(event_id) → out: List [auth, db]
- `POST` `/api/admin/events/{event_id}/raffles/{raffle_id}/draw` params(event_id, raffle_id) → out: List [auth, db]
- `POST` `/api/admin/events/{event_id}/raffles/{raffle_id}/redraw` params(event_id, raffle_id) → out: List [auth, db]
- `GET` `/api/admin/events/{event_id}/raffles/{raffle_id}/export` params(event_id, raffle_id) → out: List [auth, db]
- `POST` `/api/admin/events/{event_id}/raffles/{raffle_id}/reset` params(event_id, raffle_id) → out: List [auth, db]
- `GET` `/api/admin/reports/types` params() → out: list [auth, db]
- `GET` `/api/public/feed` params() → in: in, out: list [auth, db] ✓
- `POST` `/api/public/feed` params() → in: CommunityPostCreateIn, out: list [auth, db] ✓
- `GET` `/api/public/organizations/{org_public_id}/feed` params(org_public_id) → in: in, out: list [auth, db]
- `POST` `/api/public/organizations/{org_public_id}/feed` params(org_public_id) → in: CommunityPostCreateIn, out: list [auth, db]
- `POST` `/api/public/posts/{post_public_id}/like` params(post_public_id) → in: CommunityPostCreateIn, out: list [auth, db]
- `DELETE` `/api/public/posts/{post_public_id}/like` params(post_public_id) → out: list [auth, db]
- `PATCH` `/api/public/posts/{post_public_id}` params(post_public_id) → out: list [auth, db]
- `DELETE` `/api/public/posts/{post_public_id}` params(post_public_id) → out: list [auth, db]
- `GET` `/api/public/posts/{post_public_id}/history` params(post_public_id) → in: in, out: list [auth, db]
- `GET` `/api/public/posts/{post_public_id}/comments` params(post_public_id) → in: in, out: list [auth, db]
- `POST` `/api/public/posts/{post_public_id}/comments` params(post_public_id) → in: CommunityPostCreateIn, out: list [auth, db]
- `GET` `/api/auth/sso/{provider}/authorize` params(provider) [auth, db]
- `GET` `/api/auth/sso/{provider}/callback` params(provider) [auth, db]
- `POST` `/api/admin/events/{event_id}/survey-config` params(event_id) → out: EventSurveyOut [auth, db, payment, upload] ✓
- `GET` `/api/admin/events/{event_id}/survey-config` params(event_id) → out: EventSurveyOut [auth, db, payment, upload] ✓
- `GET` `/api/admin/events/{event_id}/template-history` params(event_id) → out: List [auth, db, upload]
- `POST` `/api/admin/events/{event_id}/template-history/{snap_id}/restore` params(event_id, snap_id) → out: List [auth, db, upload]
- `GET` `/api/tickets/{token}` params(token) → out: PublicTicketOut [auth, db, cache]
- `GET` `/api/tickets/{token}/qr` params(token) → out: PublicTicketOut [auth, db, cache]
- `GET` `/api/tickets/{token}/png` params(token) → out: PublicTicketOut [auth, db, cache]
- `GET` `/api/tickets/{token}/pdf` params(token) → out: PublicTicketOut [auth, db, cache]
- `GET` `/api/tickets/{token}/apple-wallet` params(token) → out: PublicTicketOut [auth, db, cache]
- `GET` `/api/admin/events/{event_id}/tickets` params(event_id) → out: PublicTicketOut [auth, db, cache]
- `POST` `/api/admin/events/{event_id}/tickets/check-in` params(event_id) → out: PublicTicketOut [auth, db, cache] ✓
- `PATCH` `/api/admin/events/{event_id}/tickets/{ticket_id}/status` params(event_id, ticket_id) → out: PublicTicketOut [auth, db, cache] ✓
- `GET` `/api/admin/training/templates` params() → out: list [auth, db]
- `POST` `/api/admin/training/templates` params() → out: list [auth, db]
- `POST` `/api/admin/training/bulk-assign` params() → out: list [auth, db]
- `GET` `/api/admin/training/recurring-rules` params() → out: list [auth, db]
- `POST` `/api/admin/training/recurring-rules` params() → out: list [auth, db]
- `POST` `/api/admin/training/recurring-rules/run` params() → out: list [auth, db]
- `GET` `/api/admin/training/report` params() → out: list [auth, db]
- `GET` `/api/admin/training/report/export` params() → out: list [auth, db]
- `GET` `/api/admin/training/renewal-recommendations` params() → out: list [auth, db]
- `POST` `/api/admin/training/send-renewal-notifications` params() → out: list [auth, db]
- `GET` `/api/admin/training/notification-logs` params() → out: list [auth, db]
- `GET` `/api/admin/organization/venue-reservations/calendar.ics` params() → out: list [auth, db] ✓
- `GET` `/api/public/courses` params() → in: Optional [auth, db]
- `GET` `/api/public/courses/{course_id}` params(course_id) → in: Optional [auth, db]
- `POST` `/api/public/courses/{course_id}/enroll` params(course_id) [auth, db]
- `POST` `/api/public/courses/{course_id}/modules/{module_id}/complete` params(course_id, module_id) [auth, db]
- `GET` `/api/admin/lms/courses/{course_id}/enrollments` params(course_id) → in: Optional [auth, db]
- `POST` `/api/admin/lms/courses/{course_id}/enrollments/import` params(course_id) [auth, db]
- `POST` `/api/admin/lms/courses/{course_id}/enrollments/invite` params(course_id) [auth, db]
- `GET` `/api/admin/lms/courses/{course_id}/announcements` params(course_id) → in: Optional [auth, db]
- `POST` `/api/admin/lms/courses/{course_id}/announcements` params(course_id) [auth, db]
- `GET` `/api/admin/lms/courses/{course_id}/assignments/{module_id}/submissions` params(course_id, module_id) → in: Optional [auth, db]
- `PATCH` `/api/admin/lms/submissions/{submission_id}/grade` params(submission_id) [auth, db]
- `GET` `/api/public/lms/journeys` params() → in: Optional [auth, db]
- `POST` `/api/public/lms/journeys/{journey_id}/enroll` params(journey_id) [auth, db]
- `POST` `/api/public/courses/{course_id}/modules/{module_id}/submit` params(course_id, module_id) [auth, db]
- `GET` `/api/public/orgs/{org_id}/lms-branding` params(org_id) → in: Optional [auth, db]
- `GET` `/api/public/quizzes/{quiz_id}` params(quiz_id) → in: Optional [auth, db]
- `GET` `/api/public/quizzes/{quiz_id}/my-attempts` params(quiz_id) → in: Optional [auth, db]
- `POST` `/api/public/quizzes/{quiz_id}/start` params(quiz_id) [auth, db]
- `POST` `/api/public/quiz-attempts/{attempt_id}/submit` params(attempt_id) [auth, db]
- `GET` `/api/public/quiz-attempts/{attempt_id}/result` params(attempt_id) → in: Optional [auth, db]
- `GET` `/api/public/courses/{course_id}/announcements` params(course_id) → in: Optional [auth, db]
- `GET` `/api/public/courses/{course_id}/syllabus` params(course_id) → in: Optional [auth, db]
- `GET` `/api/public/my-courses` params() → in: Optional [auth, db]
- `GET` `/api/admin/lms/courses/{course_id}/gradebook` params(course_id) [auth, db]
- `POST` `/api/admin/lms/courses/{course_id}/gradebook/{enrollment_id}/summary` params(course_id, enrollment_id) [auth, db]
- `POST` `/api/admin/lms/courses/{course_id}/discussions/{discussion_id}/replies` params(course_id, discussion_id) [auth, db]
- `PATCH` `/api/admin/lms/courses/{course_id}/discussions/{discussion_id}/lock` params(course_id, discussion_id) [auth, db]
- `POST` `/api/admin/lms/courses/{course_id}/rubrics/{rubric_id}/criteria` params(course_id, rubric_id) [auth, db]
- `POST` `/api/admin/lms/submissions/{submission_id}/rubric-scores` params(submission_id) [auth, db]
- `DELETE` `/api/admin/lms/courses/{course_id}/rubrics/{rubric_id}/criteria/{criterion_id}` params(course_id, rubric_id, criterion_id) [auth, db]
- `GET` `/api/admin/lms/courses/{course_id}/groups` params(course_id) [auth, db]
- `POST` `/api/admin/lms/courses/{course_id}/groups` params(course_id) [auth, db]
- `POST` `/api/admin/lms/courses/{course_id}/groups/{group_id}/members` params(course_id, group_id) [auth, db]
- `DELETE` `/api/admin/lms/courses/{course_id}/groups/{group_id}/members/{member_id}` params(course_id, group_id, member_id) [auth, db]
- `POST` `/api/admin/lms/badges/{badge_id}/award` params(badge_id) [auth, db]
- `GET` `/api/admin/lms/badges/{badge_id}/awards` params(badge_id) [auth, db]
- `GET` `/api/admin/lms/courses/{course_id}/syllabus` params(course_id) [auth, db]
- `PUT` `/api/admin/lms/courses/{course_id}/syllabus` params(course_id) [auth, db]
- `GET` `/api/admin/lms/courses/{course_id}/attendance-sessions/{session_id}/records` params(course_id, session_id) [auth, db]
- `PUT` `/api/admin/lms/courses/{course_id}/attendance-sessions/{session_id}/records` params(course_id, session_id) [auth, db]
- `PATCH` `/api/admin/lms/bridges/{bridge_id}/toggle` params(bridge_id) [auth, db]
- `PATCH` `/api/admin/lms/announcements/{announcement_id}` params(announcement_id) [auth, db]
- `DELETE` `/api/admin/lms/announcements/{announcement_id}` params(announcement_id) [auth, db]
- `GET` `/api/admin/lms/courses/{course_id}/quizzes` params(course_id) [auth, db]
- `POST` `/api/admin/lms/courses/{course_id}/quizzes` params(course_id) [auth, db]
- `POST` `/api/admin/lms/quizzes/{quiz_id}/questions` params(quiz_id) [auth, db]
- `PATCH` `/api/admin/lms/questions/{question_id}` params(question_id) [auth, db]
- `DELETE` `/api/admin/lms/questions/{question_id}` params(question_id) [auth, db]
- `PUT` `/api/admin/lms/questions/{question_id}/choices` params(question_id) [auth, db]
- `GET` `/api/admin/lms/quizzes/{quiz_id}/attempts` params(quiz_id) [auth, db]
- `GET` `/api/admin/lms/analytics` params() [auth, db]
- `GET` `/api/admin/lms/courses/{course_id}/analytics` params(course_id) [auth, db]
- `GET` `/api/admin/lms/courses/{course_id}/analytics/funnel` params(course_id) [auth, db]
- `GET` `/api/admin/lms/analytics/compliance` params() [auth, db]
- `GET` `/api/admin/lms/analytics/outcomes` params() [auth, db]
- `POST` `/api/public/courses/{course_id}/discussions/{discussion_id}/replies` params(course_id, discussion_id) [auth, db]
- `GET` `/api/public/courses/{course_id}/calendar` params(course_id) [auth, db]
- `GET` `/api/public/courses/{course_id}/my-grades` params(course_id) [auth, db]

---

# Schema

### AccreditationBody
- id: Integer (pk)
- short_code: String (unique)
- name: String
- logo_url: Text (nullable)
- verification_url_pattern: Text (nullable)
- created_at: DateTime

### OrgAccreditation
- id: Integer (pk)
- organization_id: Integer (fk, index)
- body_id: Integer (fk)
- accreditation_number: String (nullable)
- valid_from: DateTime (nullable)
- valid_until: DateTime (nullable)
- documents_json: JSONB (nullable)
- notes: Text (nullable)
- created_at: DateTime
- updated_at: DateTime

### EventCpdConfig
- id: Integer (pk)
- event_id: Integer (fk, unique, index)
- body_id: Integer (fk)
- cpd_hours: Numeric (default)
- cpd_category: String (nullable)
- cpd_unit_type: String
- created_at: DateTime
- updated_at: DateTime

### MemberCpdLog
- id: Integer (pk)
- member_id: Integer (fk, index)
- event_id: Integer (fk)
- body_id: Integer (fk)
- cpd_hours: Numeric
- cpd_category: String (nullable)
- certificate_id: Integer (fk, nullable)
- earned_at: DateTime

### AIDigestJob
- id: Integer (pk)
- user_id: Integer
- week_start: Date
- status: String (default)
- digest_html: Text (nullable)
- sent_at: DateTime (nullable)
- error: String (nullable)
- created_at: DateTime (default)

### PublicMemberConnection
- id: Integer (pk)
- follower_id: Integer (fk)
- following_id: Integer (fk)
- created_at: DateTime (default)
- _relations_: follower: PublicMember, following: PublicMember

### PublicMemberConnectionRequest
- id: Integer (pk)
- requester_id: Integer (fk)
- recipient_id: Integer (fk)
- status: String (default)
- created_at: DateTime (default)
- updated_at: DateTime (default)
- _relations_: requester: PublicMember, recipient: PublicMember

### PublicMemberBlocklist
- id: Integer (pk)
- blocker_id: Integer (fk)
- blocked_id: Integer (fk)
- reason: String (nullable)
- created_at: DateTime (default)
- _relations_: blocker: PublicMember, blocked: PublicMember

### CrmAccount
- id: Integer (pk)
- organization_id: Integer (fk, index)
- name: String
- domain: String (nullable)
- industry: String (nullable)
- size_bucket: String (nullable)
- owner_user_id: Integer (fk, nullable)
- annual_value: Numeric (nullable)
- notes: Text (default)
- tags: JSONB (default)
- status: String (default, index)
- created_at: DateTime
- updated_at: DateTime

### CrmAccountContact
- id: Integer (pk)
- account_id: Integer (fk, index)
- participant_crm_profile_id: Integer (fk, index)
- role: String (nullable)
- is_primary: Boolean (default)
- created_at: DateTime

### CrmDeal
- id: Integer (pk)
- account_id: Integer (fk, index)
- organization_id: Integer (fk, index)
- name: String
- stage: String (default, index)
- amount: Numeric (nullable)
- expected_close_date: DateTime (nullable)
- owner_user_id: Integer (fk, nullable)
- created_at: DateTime
- updated_at: DateTime

### CrmDealActivity
- id: Integer (pk)
- deal_id: Integer (fk, index)
- activity_type: String
- content: Text (default)
- user_id: Integer (fk, nullable)
- activity_at: DateTime (index)
- created_at: DateTime

### CrmEmailSequence
- id: Integer (pk)
- organization_id: Integer (fk, index)
- name: String
- description: Text (nullable)
- active: Boolean
- created_by: Integer (fk, nullable)
- created_at: DateTime
- updated_at: DateTime

### CrmSequenceStep
- id: Integer (pk)
- sequence_id: Integer (fk, index)
- step_order: Integer
- delay_days: Integer
- email_template_id: Integer (fk, nullable)
- subject_override: String (nullable)
- created_at: DateTime

### CrmSequenceEnrollment
- id: Integer (pk)
- sequence_id: Integer (fk, index)
- organization_id: Integer (fk, index)
- email: String (index)
- enrolled_at: DateTime
- current_step: Integer
- next_send_at: DateTime (nullable, index)
- status: String
- completed_at: DateTime (nullable)
- unenrolled_at: DateTime (nullable)

### DocumentExportJob
- id: Integer (pk)
- export_type: String (index)
- export_format: String (default)
- requested_by: Integer (fk, index)
- organization_id: Integer (fk, nullable, index)
- filters: JSONB (default)
- status: String (default, index)
- row_count: Integer (default)
- output_file_path: Text (nullable)
- output_filename: String (nullable)
- error_message: Text (nullable)
- email_sent_at: DateTime (nullable)
- created_at: DateTime
- started_at: DateTime (nullable)
- completed_at: DateTime (nullable)

### Domain
- id: Integer (pk)
- domain: String (unique, index)
- owner: String (nullable)
- token: String (unique, index)
- status: String (default)
- created_at: DateTime (default)

### EventTicketType
- id: Integer (pk)
- event_id: Integer
- name: String
- description: Text (nullable)
- price: Numeric (default)
- currency: String (default)
- capacity: Integer (nullable)
- sold_count: Integer (default)
- is_active: Boolean (default)
- sort_order: Integer (default)
- created_at: DateTime (default)
- updated_at: DateTime (default)

### LeadCaptureForm
- id: Integer (pk)
- organization_id: Integer (fk, index)
- name: String
- slug: String (unique, index)
- fields_json: JSONB (default)
- destination: String (default)
- auto_tag: String (nullable)
- redirect_url: Text (nullable)
- active: Integer (default)
- submission_count: Integer (default)
- created_at: DateTime
- updated_at: DateTime

### LeadCaptureSubmission
- id: Integer (pk)
- form_id: Integer (fk, index)
- organization_id: Integer (fk, index)
- data_json: JSONB (default)
- source_url: Text (nullable)
- utm_source: String (nullable)
- utm_medium: String (nullable)
- utm_campaign: String (nullable)
- ip_addr: String (nullable)
- submitted_at: DateTime (index)

### LearningPath
- id: Integer (pk)
- org_id: Integer (fk)
- name: String
- description: Text (nullable)
- thumbnail_url: Text (nullable)
- published: Boolean (default)
- created_at: DateTime
- updated_at: DateTime
- _relations_: steps: , enrollments: 

### LearningPathStep
- id: Integer (pk)
- path_id: Integer (fk, index)
- event_id: Integer (fk, index)
- order: Integer (default)
- required: Boolean (default)
- min_score_override: Integer (nullable)
- _relations_: path: , completions: 

### LearningPathEnrollment
- id: Integer (pk)
- path_id: Integer (fk, index)
- member_id: Integer (fk, index)
- enrolled_at: DateTime
- completed_at: DateTime (nullable)
- progress_pct: Integer (default)
- _relations_: path: , step_completions: 

### LearningPathStepCompletion
- id: Integer (pk)
- enrollment_id: Integer (fk, index)
- step_id: Integer (fk, index)
- certificate_id: Integer (fk, nullable)
- completed_at: DateTime
- _relations_: enrollment: , step: 

### CourseGradeItem
- id: Integer (pk)
- course_id: Integer (fk, index)
- item_type: String (default)
- item_ref_id: Integer (nullable)
- title: String
- max_points: Integer (default)
- weight_pct: Numeric (default)
- order: Integer (default)
- created_at: DateTime

### CourseGradeSummary
- id: Integer (pk)
- enrollment_id: Integer (fk, unique)
- weighted_avg: Numeric (nullable)
- letter_grade: String (nullable)
- passed: Boolean (default)
- computed_at: DateTime
- _relations_: enrollment: CourseEnrollment

### CourseDiscussion
- id: Integer (pk)
- course_id: Integer (fk, index)
- module_id: Integer (fk, nullable)
- author_member_id: Integer (fk, nullable)
- title: String
- body: Text
- is_pinned: Boolean (default)
- is_locked: Boolean (default)
- reply_count: Integer (default)
- created_at: DateTime
- updated_at: DateTime
- _relations_: replies: 

### DiscussionReply
- id: Integer (pk)
- discussion_id: Integer (fk, index)
- parent_reply_id: Integer (fk, nullable)
- author_member_id: Integer (fk, nullable)
- body: Text
- is_instructor_reply: Boolean (default)
- created_at: DateTime
- _relations_: discussion: 

### Rubric
- id: Integer (pk)
- course_id: Integer (fk, index)
- title: String
- description: Text (nullable)
- created_at: DateTime
- _relations_: criteria: 

### RubricCriterion
- id: Integer (pk)
- rubric_id: Integer (fk, index)
- title: String
- description: Text (nullable)
- points: Integer (default)
- order: Integer (default)
- _relations_: rubric: , ratings: 

### RubricRating
- id: Integer (pk)
- criterion_id: Integer (fk, index)
- description: String
- points: Integer (default)
- _relations_: criterion: 

### SubmissionRubricScore
- id: Integer (pk)
- submission_id: Integer (fk, index)
- criterion_id: Integer (fk, index)
- rating_id: Integer (fk, nullable)
- points_earned: Integer (default)
- comment: Text (nullable)

### LearningOutcome
- id: Integer (pk)
- org_id: Integer (fk, index)
- title: String
- description: Text (nullable)
- mastery_points: Integer (default)
- display_name: String (nullable)
- created_at: DateTime
- _relations_: alignments: 

### CourseOutcomeAlignment
- id: Integer (pk)
- course_id: Integer (fk, index)
- outcome_id: Integer (fk, index)
- module_id: Integer (fk, nullable)
- _relations_: outcome: 

### OutcomeMastery
- id: Integer (pk)
- member_id: Integer (fk, index)
- outcome_id: Integer (fk, index)
- score: Integer (default)
- mastered_at: DateTime (nullable)
- evidence_type: String (nullable)
- evidence_id: Integer (nullable)

### CourseGroup
- id: Integer (pk)
- course_id: Integer (fk, index)
- name: String
- max_members: Integer (nullable)
- created_by_user_id: Integer (fk, nullable)
- created_at: DateTime
- _relations_: members: 

### CourseGroupMember
- id: Integer (pk)
- group_id: Integer (fk, index)
- member_id: Integer (fk, index)
- joined_at: DateTime
- _relations_: group: 

### Badge
- id: Integer (pk)
- org_id: Integer (fk, index)
- name: String
- description: Text (nullable)
- image_url: Text (nullable)
- criteria_text: Text (nullable)
- trigger_type: String (default)
- trigger_ref_id: Integer (nullable)
- created_at: DateTime
- _relations_: awards: 

### BadgeAward
- id: Integer (pk)
- badge_id: Integer (fk, index)
- member_id: Integer (fk, index)
- issued_at: DateTime
- evidence_url: Text (nullable)
- issued_by_user_id: Integer (fk, nullable)
- _relations_: badge: 

### CourseCalendarEvent
- id: Integer (pk)
- course_id: Integer (fk, index)
- title: String
- event_type: String (default)
- starts_at: DateTime
- ends_at: DateTime (nullable)
- module_id: Integer (fk, nullable)
- conference_url: Text (nullable)
- description: Text (nullable)
- created_at: DateTime

### CourseSyllabus
- id: Integer (pk)
- course_id: Integer (fk, unique)
- content_html: Text (default)
- updated_at: DateTime

### CourseAttendanceSession
- id: Integer (pk)
- course_id: Integer (fk, index)
- title: String
- session_type: String (default)
- starts_at: DateTime
- ends_at: DateTime (nullable)
- location: String (nullable)
- required: Boolean (default)
- notes: Text (nullable)
- created_by_user_id: Integer (fk, nullable)
- created_at: DateTime
- _relations_: records: 

### CourseAttendanceRecord
- id: Integer (pk)
- session_id: Integer (fk, index)
- enrollment_id: Integer (fk, index)
- member_id: Integer (fk, index)
- status: String (default)
- minutes_attended: Integer (nullable)
- note: Text (nullable)
- recorded_by_user_id: Integer (fk, nullable)
- recorded_at: DateTime
- _relations_: session: 

### EventLmsBridge
- id: Integer (pk)
- event_id: Integer (fk, index)
- course_id: Integer (fk, nullable)
- trigger_on: String (default)
- action: String (default)
- action_ref_id: Integer (nullable)
- is_active: Boolean (default)
- created_at: DateTime

### LMSQuiz
- id: Integer (pk)
- course_id: Integer (fk, index)
- title: String
- description: Text (nullable)
- time_limit_minutes: Integer (nullable)
- attempts_allowed: Integer (default)
- passing_score: Integer (default)
- shuffle_questions: Boolean (default)
- show_correct_answers: Boolean (default)
- created_at: DateTime
- _relations_: questions: , attempts: 

### LMSQuizQuestion
- id: Integer (pk)
- quiz_id: Integer (fk, index)
- question_text: Text
- question_type: String (default)
- points: Integer (default)
- order: Integer (default)
- explanation: Text (nullable)
- _relations_: quiz: , choices: 

### LMSQuizChoice
- id: Integer (pk)
- question_id: Integer (fk, index)
- choice_text: String
- is_correct: Boolean (default)
- order: Integer (default)
- _relations_: question: 

### LMSQuizAttempt
- id: Integer (pk)
- quiz_id: Integer (fk, index)
- member_id: Integer (fk, index)
- started_at: DateTime
- submitted_at: DateTime (nullable)
- score: Numeric (nullable)
- passed: Boolean (nullable)
- attempt_number: Integer (default)
- _relations_: quiz: , answers: 

### LMSQuizAnswer
- id: Integer (pk)
- attempt_id: Integer (fk, index)
- question_id: Integer (fk, index)
- selected_choice_ids: JSON (nullable)
- text_answer: Text (nullable)
- _relations_: attempt: 

### TrainingCourse
- id: Integer (pk)
- org_id: Integer (fk)
- title: String
- description: Text (nullable)
- thumbnail_url: Text (nullable)
- category: String (nullable)
- course_code: String (nullable)
- department: String (nullable)
- term: String (nullable)
- section: String (nullable)
- credits: Numeric (nullable)
- capacity: Integer (nullable)
- enrollment_policy: String (default)
- starts_at: DateTime (nullable)
- ends_at: DateTime (nullable)
- level: String (default)
- language: String (default)
- is_published: Boolean (default)
- is_featured: Boolean (default)
- price: Numeric (nullable)
- cert_template_url: Text (nullable)
- passing_score: Integer (nullable)
- is_marketplace_listed: Boolean (default)
- marketplace_price: Numeric (nullable)
- marketplace_description: Text (nullable)
- preview_video_url: Text (nullable)
- created_at: DateTime
- updated_at: DateTime
- _relations_: modules: , enrollments: , announcements: 

### CourseModule
- id: Integer (pk)
- course_id: Integer (fk, index)
- title: String
- description: Text (nullable)
- order: Integer (default)
- content_type: String (default)
- content_url: Text (nullable)
- content_text: Text (nullable)
- duration_minutes: Integer (nullable)
- is_required: Boolean (default)
- quiz_id: Integer (fk, nullable)
- created_at: DateTime
- _relations_: course: , progress_records: , assignment: 

### CourseEnrollment
- id: Integer (pk)
- course_id: Integer (fk, index)
- member_id: Integer (fk, index)
- enrolled_at: DateTime
- completed_at: DateTime (nullable)
- progress_pct: Integer (default)
- final_grade: Integer (nullable)
- certificate_id: Integer (fk, nullable)
- cert_pdf_url: Text (nullable)
- status: String (default, index)
- _relations_: course: , module_progress: , grade_summary: CourseGradeSummary

### ModuleProgress
- id: Integer (pk)
- enrollment_id: Integer (fk, index)
- module_id: Integer (fk, index)
- started_at: DateTime (nullable)
- completed_at: DateTime (nullable)
- time_spent_seconds: Integer (default)
- quiz_score: Integer (nullable)
- _relations_: enrollment: , module: 

### CourseAssignment
- id: Integer (pk)
- module_id: Integer (fk, index, unique)
- instructions: Text (nullable)
- due_date: DateTime (nullable)
- max_points: Integer (default)
- submission_type: String (default)
- _relations_: module: , submissions: 

### AssignmentSubmission
- id: Integer (pk)
- assignment_id: Integer (fk, index)
- member_id: Integer (fk, index)
- submitted_at: DateTime
- submission_text: Text (nullable)
- submission_url: Text (nullable)
- file_url: Text (nullable)
- grade: Integer (nullable)
- feedback: Text (nullable)
- graded_at: DateTime (nullable)
- graded_by_user_id: Integer (fk, nullable)
- _relations_: assignment: 

### LmsJourney
- id: Integer (pk)
- org_id: Integer (fk)
- title: String
- description: Text (nullable)
- thumbnail_url: Text (nullable)
- is_published: Boolean (default)
- cert_template_url: Text (nullable)
- created_at: DateTime
- updated_at: DateTime
- _relations_: steps: , enrollments: 

### LmsJourneyStep
- id: Integer (pk)
- journey_id: Integer (fk, index)
- course_id: Integer (fk, index)
- order: Integer (default)
- is_required: Boolean (default)
- _relations_: journey: 

### LmsJourneyEnrollment
- id: Integer (pk)
- journey_id: Integer (fk, index)
- member_id: Integer (fk, index)
- enrolled_at: DateTime
- completed_at: DateTime (nullable)
- progress_pct: Integer (default)
- certificate_id: Integer (fk, nullable)
- cert_pdf_url: Text (nullable)
- _relations_: journey: 

### CourseAnnouncement
- id: Integer (pk)
- course_id: Integer (fk, index)
- author_user_id: Integer (fk, index)
- title: String
- body: Text
- created_at: DateTime
- _relations_: course: 

### OrgLmsStaff
- id: Integer (pk)
- org_id: Integer (fk, index)
- user_id: Integer (fk, index)
- role: String (default)
- course_id: Integer (fk, nullable)
- created_at: DateTime

### CourseCpdConfig
- id: Integer (pk)
- course_id: Integer (fk, index)
- accreditation_body_id: Integer (nullable)
- cpd_hours: Numeric (default)
- cpd_category: String (nullable)

### LtiTool
- id: Integer (pk)
- org_id: Integer (fk, index)
- name: String
- launch_url: Text
- consumer_key: String (nullable)
- shared_secret: String (nullable)
- custom_params_json: Text (nullable)
- provider: String
- is_active: Boolean
- created_at: DateTime

### User
- id: Integer (pk)
- email: String (unique, index)
- password_hash: String
- role: Role (index)
- heptacoin_balaonce: Integer (default)
- created_at: DateTime
- deleted_at: DateTime (nullable, index)
- is_verified: Boolean (default)
- verification_token: String (nullable)
- password_reset_token: String (nullable)
- magic_link_token: String (nullable)
- _relations_: events: , transactions: , email_config: , google_integration: , ms365_integration: 

### PublicMember
- id: Integer (pk)
- public_id: String (unique, index)
- email: String (unique, index)
- display_name: String
- bio: Text (nullable)
- avatar_url: Text (nullable)
- headline: String (nullable)
- location: String (nullable)
- website_url: String (nullable)
- contact_email: String (nullable)
- digest_opt_in: Boolean (default, index)
- password_hash: String
- created_at: DateTime
- deleted_at: DateTime (nullable, index)
- is_verified: Boolean (default)
- verification_token: String (nullable)
- password_reset_token: String (nullable)
- _relations_: attendees: , comments: 

### Event
- id: Integer (pk)
- public_id: String (unique, index, nullable)
- admin_id: int (fk, index)
- name: String
- template_image_url: Text
- config: JSONB (default)
- created_at: DateTime
- cert_seq: Integer (default)
- event_date: date_type (nullable)
- event_description: Text (nullable)
- event_location: String (nullable)
- min_sessions_required: Integer (default)
- event_banner_url: Text (nullable)
- auto_email_on_cert: Boolean (default)
- cert_email_template_id: Integer (nullable)
- event_type: String (default)
- certificate_enabled: Boolean (default)
- checkin_enabled: Boolean (default)
- ticketing_enabled: Boolean (default)
- registration_enabled: Boolean (default)
- raffles_enabled: Boolean (default)
- gamification_enabled: Boolean (default)
- requires_approval: Boolean (default)
- quiz_enabled: Boolean (default)
- cpd_enabled: Boolean (default)
- is_marketplace_listed: Boolean (default)
- marketplace_category: String (nullable)
- marketplace_description: Text (nullable)
- marketplace_price: Numeric (nullable)
- _relations_: admin: , certificates: , sessions: , attendees: , tickets: , comments: , raffles: , template_snapshots: , email_templates: , bulk_email_jobs: , bulk_certificate_jobs: , team_members: 

### EventTeamMember
- id: Integer (pk)
- event_id: Integer (fk, index)
- user_id: Integer (fk, nullable, index)
- email: String (index)
- role: String (default, index)
- permissions: JSONB (nullable)
- status: String (default, index)
- invited_by: Integer (fk, nullable)
- created_at: DateTime
- updated_at: DateTime
- _relations_: event: , user: , inviter: 

### Certificate
- id: Integer (pk)
- uuid: String (unique, index)
- student_name: String
- event_id: int (fk, index)
- pdf_url: Text
- status: CertStatus (default)
- created_at: DateTime
- public_id: String (nullable)
- issued_at: DateTime
- hosting_term: String (default)
- hosting_ends_at: DateTime (nullable)
- auto_renew_enabled: Boolean (default)
- asset_size_bytes: Integer (default)
- deleted_at: DateTime (nullable)
- certificate_tier: String (nullable)
- tier_template_id: Integer (nullable)
- survey_required: Boolean (default)
- worldpass_anchor_id: String (nullable)
- _relations_: event: 

### TrainingAssignment
- id: Integer (pk)
- organization_id: Integer (fk, index)
- event_id: Integer (fk, nullable, index)
- course_id: Integer (fk, nullable, index)
- renewal_event_id: Integer (fk, nullable, index)
- certificate_id: Integer (fk, nullable, index)
- title: String
- description: Text (nullable)
- assignee_name: String
- assignee_email: String (index)
- department_id: Integer (fk, nullable, index)
- department: String (nullable, index)
- manager_email: String (nullable, index)
- approval_status: String (default, index)
- approved_by: Integer (fk, nullable)
- approved_at: DateTime (nullable)
- evidence_url: Text (nullable)
- evidence_label: String (nullable)
- template_id: Integer (fk, nullable, index)
- recurring_rule_id: Integer (fk, nullable, index)
- required: Boolean (default, index)
- status: String (default, index)
- due_at: DateTime (nullable, index)
- completed_at: DateTime (nullable)
- renewal_due_at: DateTime (nullable, index)
- notify_before_days: Integer (default)
- last_notified_at: DateTime (nullable)
- created_by: Integer (fk, nullable)
- created_at: DateTime
- updated_at: DateTime

### OrganizationDepartment
- id: Integer (pk)
- organization_id: Integer (fk, index)
- name: String
- code: String (nullable)
- manager_name: String (nullable)
- manager_email: String (nullable)
- active: Boolean (default, index)
- created_by: Integer (fk, nullable)
- created_at: DateTime
- updated_at: DateTime

### TrainingAssignmentTemplate
- id: Integer (pk)
- organization_id: Integer (fk, index)
- department_id: Integer (fk, nullable, index)
- name: String
- title: String
- description: Text (nullable)
- required: Boolean (default)
- default_due_days: Integer (default)
- renewal_interval_days: Integer (nullable)
- notify_before_days: Integer (default)
- approval_required: Boolean (default)
- active: Boolean (default, index)
- created_by: Integer (fk, nullable)
- created_at: DateTime
- updated_at: DateTime

### TrainingRecurringRule
- id: Integer (pk)
- organization_id: Integer (fk, index)
- template_id: Integer (fk, index)
- department_id: Integer (fk, nullable, index)
- source: String (default)
- enabled: Boolean (default, index)
- lookback_days: Integer (default)
- last_run_at: DateTime (nullable)
- created_by: Integer (fk, nullable)
- created_at: DateTime
- updated_at: DateTime

### TrainingRenewalNotificationLog
- id: Integer (pk)
- organization_id: Integer (fk, index)
- assignment_id: Integer (fk, index)
- recipient_email: String (index)
- status: String (default, index)
- attempts: Integer (default)
- error_message: Text (nullable)
- target_date: DateTime (nullable)
- sent_at: DateTime (nullable)
- created_at: DateTime

### CertificateTemplatePreset
- id: String (pk)
- scope_type: String (index)
- scope_id: Integer (index)
- name: String
- template_image_url: Text (nullable)
- config: JSONB (default)
- min_plan: String (default, index)
- enterprise_locked: Boolean (default, index)
- version: Integer (default)
- locked_by: Integer (fk, nullable)
- created_at: DateTime
- updated_at: DateTime

### CertificateTemplatePresetVersion
- id: Integer (pk)
- preset_id: String (fk, index)
- version: Integer (index)
- template_image_url: Text (nullable)
- config: JSONB (default)
- created_by: Integer (fk, nullable)
- created_at: DateTime

### CertificateTemplateRegressionSnapshot
- id: Integer (pk)
- preset_id: String (fk, index)
- scenario: String (index)
- render_hash: String
- payload: JSONB (default)
- created_at: DateTime

### EventAutomationRule
- id: String (pk)
- event_id: Integer (fk, index)
- name: String
- trigger: String (index)
- trigger_config: JSONB (default)
- enabled: Boolean (default, index)
- actions: JSONB (default)
- created_at: DateTime
- updated_at: DateTime

### EventAutomationDispatchState
- id: Integer (pk)
- event_id: Integer (fk, index)
- rule_id: String (index)
- state: JSONB (default)
- updated_at: DateTime

### EventAutomationExecutionLog
- id: Integer (pk)
- event_id: Integer (fk, index)
- rule_id: String (index)
- attendee_id: Integer (fk, nullable, index)
- recipient_email: String (nullable)
- action_index: Integer (default)
- action_type: String (index)
- idempotency_key: String
- status: String (default, index)
- attempts: Integer (default)
- next_attempt_at: DateTime (nullable, index)
- error_message: Text (nullable)
- response_status: Integer (nullable)
- payload: JSONB (default)
- created_at: DateTime
- updated_at: DateTime
- dispatched_at: DateTime (nullable)

### EventSavedAudienceSegment
- id: Integer (pk)
- event_id: Integer (fk, index)
- created_by: Integer (fk, nullable, index)
- name: String
- segment_key: String (index)
- filters: JSONB (default)
- visibility: String (default, index)
- last_count: Integer (default)
- last_computed_at: DateTime (nullable)
- created_at: DateTime
- updated_at: DateTime

### SegmentExportJob
- id: Integer (pk)
- event_id: Integer (fk, index)
- created_by: Integer (fk, index)
- segment_key: String (index)
- filters: JSONB (default)
- status: String (default, index)
- row_count: Integer (default)
- file_path: Text (nullable)
- file_name: String (nullable)
- sync_google_sheets: Boolean (default)
- google_spreadsheet_id: String (nullable)
- google_spreadsheet_url: Text (nullable)
- google_sheet_name: String (nullable)
- error_message: Text (nullable)
- created_at: DateTime
- started_at: DateTime (nullable)
- completed_at: DateTime (nullable)

### ParticipantCrmProfile
- id: Integer (pk)
- organization_id: Integer (fk, index)
- email: String (index)
- notes: Text (default)
- tags: JSONB (default)
- lifecycle_status: String (default, index)
- owner_user_id: Integer (fk, nullable, index)
- priority: String (default, index)
- lead_score: Integer (default, index)
- next_follow_up_at: DateTime (nullable, index)
- custom_fields: JSONB (default)
- created_at: DateTime
- updated_at: DateTime

### ParticipantCrmSnapshot
- id: Integer (pk)
- organization_id: Integer (fk, index)
- email: String (index)
- name: String (nullable)
- event_count: Integer (default)
- certificate_count: Integer (default)
- attended_count: Integer (default)
- survey_count: Integer (default)
- ticket_count: Integer (default)
- latest_activity_at: DateTime (nullable, index)
- computed_at: DateTime

### ParticipantCrmAuditLog
- id: Integer (pk)
- organization_id: Integer (fk, index)
- email: String (index)
- actor_user_id: Integer (fk, nullable, index)
- action: String (index)
- before: JSONB (nullable)
- after: JSONB (nullable)
- created_at: DateTime (index)

### ParticipantCrmSavedView
- id: Integer (pk)
- organization_id: Integer (fk, index)
- created_by: Integer (fk, nullable, index)
- name: String
- filters: JSONB (default)
- visibility: String (default, index)
- last_count: Integer (default)
- last_computed_at: DateTime (nullable)
- created_at: DateTime
- updated_at: DateTime

### ParticipantCrmEmailAlias
- id: Integer (pk)
- organization_id: Integer (fk, index)
- source_email: String (index)
- target_email: String (index)
- created_by: Integer (fk, nullable)
- created_at: DateTime

### MemberCertificatePreference
- id: Integer (pk)
- public_member_id: Integer (fk, unique, index)
- certificate_visibility: String (default, index)
- created_at: DateTime
- updated_at: DateTime

### WalletAnalyticsEvent
- id: Integer (pk)
- public_member_id: Integer (fk, nullable, index)
- certificate_id: Integer (fk, nullable, index)
- event_type: String (index)
- source: String (default, index)
- ip_address: String (nullable)
- user_agent: Text (nullable)
- metadata_json: JSONB (default)
- created_at: DateTime (index)

### WalletPrivacyAuditLog
- id: Integer (pk)
- public_member_id: Integer (fk, index)
- actor_public_member_id: Integer (fk, nullable, index)
- action: String (index)
- before: JSONB (nullable)
- after: JSONB (nullable)
- ip_address: String (nullable)
- user_agent: Text (nullable)
- created_at: DateTime (index)

### ProductTelemetryEvent
- id: Integer (pk)
- user_id: Integer (fk, nullable, index)
- event_name: String (index)
- feature_key: String (index)
- resource_type: String (nullable, index)
- resource_id: String (nullable)
- metadata_json: JSONB (default)
- user_agent: Text (nullable)
- created_at: DateTime (index)

### CertificateShareCache
- id: Integer (pk)
- certificate_id: Integer (fk, index)
- cache_key: String (unique, index)
- image_path: Text (nullable)
- version_hash: String (index)
- invalidated_at: DateTime (nullable)
- created_at: DateTime
- updated_at: DateTime

### Transaction
- id: Integer (pk)
- user_id: int (fk, index)
- amount: Integer
- type: TxType (index)
- timestamp: DateTime
- description: String (nullable)
- _relations_: user: 

### SystemConfig
- key: String (pk)
- value: JSONB (default)

### RegistrationOptionCapacity
- id: Integer (pk)
- event_id: int (fk, index)
- field_id: String (index)
- option_label: String
- capacity: Integer (nullable)
- reserved_count: Integer (default)
- created_at: DateTime

### Order
- id: Integer (pk)
- user_id: Integer (fk, nullable)
- plan_id: String
- amount_cents: Integer
- currency: String (default)
- provider: String
- provider_ref: String (nullable)
- status: String (default)
- created_at: DateTime
- paid_at: DateTime (nullable)
- meta: JSONB (default)

### Subscription
- id: Integer (pk)
- user_id: Integer (fk)
- plan_id: String
- order_id: Integer (fk, nullable)
- started_at: DateTime
- expires_at: DateTime (nullable)
- is_active: Boolean (default)
- last_hc_credited_at: DateTime (nullable)

### ApiKey
- id: Integer (pk)
- user_id: Integer (fk)
- name: String
- key_prefix: String
- key_hash: String (unique)
- scopes: JSONB (default)
- is_active: Boolean (default)
- last_used_at: DateTime (nullable)
- expires_at: DateTime (nullable)
- created_at: DateTime
- rate_limit_per_min: Integer (nullable)

### TotpSecret
- user_id: Integer (fk, pk)
- secret: String
- enabled: Boolean (default)
- created_at: DateTime

### TotpBackupCode
- id: Integer (pk)
- user_id: Integer (fk, index)
- code_hash: String
- used_at: DateTime (nullable)
- created_at: DateTime

### AuditLog
- id: int (pk)
- user_id: Integer (fk, nullable)
- action: String
- resource_type: String (nullable)
- resource_id: String (nullable)
- ip_address: str (nullable)
- user_agent: Text (nullable)
- extra: JSONB (nullable)
- created_at: DateTime

### WebhookEndpoint
- id: Integer (pk)
- user_id: Integer (fk)
- url: Text
- events: JSONB (default)
- secret: String
- is_active: Boolean (default)
- created_at: DateTime
- last_fired_at: DateTime (nullable)

### WebhookDelivery
- id: int (pk)
- endpoint_id: Integer (fk)
- event_type: String
- payload: JSONB (default)
- status: String (default)
- http_status: Integer (nullable)
- response_body: Text (nullable)
- attempt: Integer (default)
- delivered_at: DateTime

### Organization
- id: Integer (pk)
- user_id: Integer (fk, unique)
- public_id: String (unique, index)
- org_name: String
- custom_domain: String (unique, nullable)
- brand_logo: Text (nullable)
- brand_color: String (default)
- settings: JSONB (default)
- created_at: DateTime

### OrganizationAllowlist
- id: Integer (pk)
- org_id: Integer (fk, index)
- email: String (index)
- created_at: DateTime

### OrganizationFollower
- id: Integer (pk)
- org_id: Integer (fk, index)
- public_member_id: Integer (fk, index)
- created_at: DateTime

### CommunityPost
- id: Integer (pk)
- public_id: String (unique, index)
- org_id: Integer (fk, index, nullable)
- author_user_id: Integer (fk, index, nullable)
- author_public_member_id: Integer (fk, index, nullable)
- body: Text
- status: String (default, index)
- created_at: DateTime
- updated_at: DateTime

### CommunityPostLike
- id: Integer (pk)
- post_id: Integer (fk, index)
- public_member_id: Integer (fk, index)
- created_at: DateTime

### CommunityPostComment
- id: Integer (pk)
- post_id: Integer (fk, index)
- public_member_id: Integer (fk, index)
- parent_comment_id: Integer (fk, nullable, index)
- body: Text
- upvote_count: Integer (default)
- downvote_count: Integer (default)
- status: String (default, index)
- created_at: DateTime
- updated_at: DateTime

### CommunityCommentVote
- id: Integer (pk)
- comment_id: Integer (fk, index)
- member_id: Integer (fk, index)
- vote_type: String
- created_at: DateTime
- updated_at: DateTime

### SupportTicket
- id: Integer (pk)
- organization_id: Integer (fk, index)
- user_id: Integer (fk, index)
- subject: String
- messages: JSONB (default)
- status: String (default, index)
- created_at: DateTime
- updated_at: DateTime

### WaitlistEntry
- id: Integer (pk)
- name: String
- email: String (unique)
- phone: String (nullable)
- plan_interest: String (nullable)
- note: Text (nullable)
- created_at: DateTime

### VerificationHit
- id: int (pk)
- cert_uuid: String
- viewed_at: DateTime
- ip_address: str (nullable)
- user_agent: Text (nullable)
- referer: Text (nullable)

### EventTemplateSnapshot
- id: Integer (pk)
- event_id: Integer (fk, index)
- template_image_url: Text (nullable)
- config: JSONB (nullable)
- created_by: Integer (fk, nullable)
- created_at: DateTime
- _relations_: event: 

### UserEmailConfig
- id: Integer (pk)
- user_id: Integer (fk, unique, index)
- smtp_enabled: Boolean (default)
- smtp_host: String (nullable)
- smtp_port: Integer (nullable)
- smtp_use_tls: Boolean (default)
- smtp_user: String (nullable)
- smtp_password: String (nullable)
- from_email: String (nullable)
- from_name: String (nullable)
- reply_to: String (nullable)
- auto_cc: String (nullable)
- enable_tracking_pixel: Boolean (default)
- created_at: DateTime
- updated_at: DateTime
- _relations_: user: 

### UserGoogleIntegration
- id: Integer (pk)
- user_id: Integer (fk, unique, index)
- google_email: String (nullable)
- access_token: Text (nullable)
- refresh_token: Text (nullable)
- token_expires_at: DateTime (nullable)
- scopes: JSONB (default)
- created_at: DateTime
- updated_at: DateTime
- _relations_: user: 

### UserMicrosoftIntegration
- id: Integer (pk)
- user_id: Integer (fk, unique, index)
- microsoft_email: String (nullable)
- access_token: Text (nullable)
- refresh_token: Text (nullable)
- token_expires_at: DateTime (nullable)
- scopes: JSONB (default)
- created_at: DateTime
- updated_at: DateTime
- _relations_: user: 

### CertificateTemplate
- id: Integer (pk)
- name: String
- template_image_url: Text
- config: JSONB (default)
- is_default: Boolean (default)
- order_index: Integer (default)
- created_at: DateTime

### EmailTemplate
- id: Integer (pk)
- event_id: Integer (fk, index, nullable)
- created_by: Integer (fk, index)
- name: String
- subject_tr: String
- subject_en: String
- body_html: Text
- template_type: String (default)
- is_default: Boolean (default)
- created_at: DateTime
- updated_at: DateTime
- _relations_: event: , creator: 

### BulkEmailJob
- id: Integer (pk)
- event_id: Integer (fk, index)
- created_by: Integer (fk, index)
- email_template_id: Integer (fk, nullable)
- recipient_type: String (default)
- recipients_count: Integer (default)
- sent_count: Integer (default)
- failed_count: Integer (default)
- status: String (default)
- error_message: Text (nullable)
- scheduled_at: DateTime (nullable)
- cron_expression: String (nullable)
- created_at: DateTime
- started_at: DateTime (nullable)
- completed_at: DateTime (nullable)
- _relations_: event: , creator: , email_template: 

### SuperadminBulkEmailJob
- id: Integer (pk)
- created_by: Integer (fk, index)
- source: String (default, index)
- job_kind: String (default, index)
- subject: String
- body_html: Text
- total_targets: Integer (default)
- sent_count: Integer (default)
- failed_count: Integer (default)
- status: String (default, index)
- cancel_requested: Boolean (default)
- error_message: Text (nullable)
- created_at: DateTime
- started_at: DateTime (nullable)
- completed_at: DateTime (nullable)
- _relations_: creator: 

### SystemEmailDigestConfig
- id: Integer (pk)
- enabled: Boolean (default)
- frequency: String (default)
- send_weekday: Integer (default)
- send_hour: Integer (default)
- max_events: Integer (default)
- max_posts: Integer (default)
- last_sent_at: DateTime (nullable)
- updated_by: Integer (fk, nullable)
- created_at: DateTime
- updated_at: DateTime
- _relations_: updater: 

### BulkCertificateJob
- id: Integer (pk)
- event_id: Integer (fk, index)
- created_by: Integer (fk, index)
- names: JSONB (default)
- chunk_size: Integer (default)
- total_count: Integer (default)
- current_index: Integer (default)
- created_count: Integer (default)
- failed_count: Integer (default)
- already_exists_count: Integer (default)
- spent_heptacoin: Integer (default)
- generated_files: JSONB (default)
- zip_file_path: Text (nullable)
- status: String (default)
- error_message: Text (nullable)
- created_at: DateTime
- started_at: DateTime (nullable)
- updated_at: DateTime
- completed_at: DateTime (nullable)
- _relations_: event: , creator: 

### EmailDeliveryLog
- id: Integer (pk)
- bulk_job_id: Integer (fk, index)
- attendee_id: Integer (fk, index)
- recipient_email: String
- status: String (default)
- reason: Text (nullable)
- sent_at: DateTime
- opened_at: DateTime (nullable)
- clicked_at: DateTime (nullable)
- click_count: Integer (default)
- open_count: Integer (default)
- _relations_: bulk_job: , attendee: 

### WebhookSubscription
- id: Integer (pk)
- user_id: Integer (fk, index)
- event_type: String (index)
- url: Text
- secret: String (nullable)
- is_active: Boolean (default)
- created_at: DateTime
- _relations_: user: 

### WebhookLog
- id: Integer (pk)
- webhook_id: Integer (fk, index)
- event_type: String
- payload: JSONB (nullable)
- http_status: Integer (nullable)
- error_message: Text (nullable)
- sent_at: DateTime (index)
- _relations_: webhook: 

### EventSession
- id: Integer (pk)
- event_id: Integer (fk, index)
- name: String
- session_date: date_type (nullable)
- session_start: Any (nullable)
- session_location: String (nullable)
- checkin_token: String (unique)
- is_active: Boolean (default)
- enable_participation_test: Boolean (default)
- test_score_max: Integer (default)
- capacity: Integer (nullable)
- capacity_alert_threshold: Integer (default)
- created_at: DateTime
- _relations_: event: , attendaonce_records: 

### Attendee
- id: Integer (pk)
- event_id: Integer (fk, index)
- name: String
- email: String
- source: str (default)
- registered_at: DateTime
- email_verified: Boolean (default)
- email_verification_token: String (nullable)
- email_verified_at: DateTime (nullable)
- survey_completed_at: DateTime (nullable)
- survey_required: Boolean (default)
- can_download_cert: Boolean (default)
- public_member_id: Integer (fk, index, nullable)
- registration_answers: JSONB (nullable, default)
- unsubscribed_at: DateTime (nullable)
- _relations_: event: , public_member: , attendaonce_records: , tickets: 

### EventTicket
- id: Integer (pk)
- event_id: Integer (fk, index)
- attendee_id: Integer (fk, index)
- token: String (unique, index)
- qr_payload: Text
- status: String (default, index)
- issued_at: DateTime
- checked_in_at: DateTime (nullable)
- created_at: DateTime
- updated_at: DateTime
- _relations_: event: , attendee: 

### EventComment
- id: Integer (pk)
- event_id: Integer (fk, index)
- public_member_id: Integer (fk, index)
- body: Text
- status: String (default, index)
- report_count: Integer (default)
- created_at: DateTime
- updated_at: DateTime
- _relations_: event: , public_member: 

### AttendaonceRecord
- id: Integer (pk)
- attendee_id: Integer (fk, index)
- session_id: Integer (fk, index)
- checked_in_at: DateTime
- ip_address: String (nullable)
- _relations_: attendee: , session: 

### CheckinActivityLog
- id: Integer (pk)
- event_id: Integer (fk, index)
- session_id: Integer (fk, nullable, index)
- attendee_id: Integer (fk, nullable, index)
- ticket_id: Integer (fk, nullable, index)
- actor_user_id: Integer (fk, nullable, index)
- method: String (default, index)
- source: String (default, index)
- entry_point: String (default, index)
- success: Boolean (default, index)
- duplicate: Boolean (default, index)
- invalid_reason: String (nullable, index)
- message: String (nullable)
- ip_address: String (nullable)
- created_at: DateTime (index)

### AgentActionLog
- id: BigInteger (pk)
- user_id: Integer (fk, index)
- api_key_prefix: String (nullable)
- tool_name: String
- event_id: Integer (nullable, index)
- payload: JSONB (nullable)
- result_summary: String (nullable)
- ip_address: String (nullable)
- created_at: DateTime

### CheckinKioskSession
- id: Integer (pk)
- event_id: Integer (fk, index)
- session_id: Integer (fk, nullable, index)
- token_hash: String (unique, index)
- label: String (default)
- created_by: Integer (fk, nullable, index)
- expires_at: DateTime (index)
- revoked_at: DateTime (nullable, index)
- last_seen_at: DateTime (nullable)
- created_at: DateTime

### CheckinNonce
- id: Integer (pk)
- event_id: Integer (fk, index)
- nonce: String (unique, index)
- actor_user_id: Integer (fk, nullable, index)
- kiosk_session_id: Integer (fk, nullable, index)
- expires_at: DateTime (index)
- used_at: DateTime (nullable, index)
- created_at: DateTime

### BadgeRule
- id: Integer (pk)
- event_id: Integer (fk, index, unique)
- badge_definitions: JSONB (default)
- enabled: Boolean (default)
- created_by: Integer (fk)
- updated_at: DateTime
- _relations_: event: , creator: 

### ParticipantBadge
- id: Integer (pk)
- event_id: Integer (fk, index)
- attendee_id: Integer (fk, index)
- badge_type: String
- criteria_met: JSONB (nullable)
- awarded_by: Integer (fk, nullable)
- awarded_at: DateTime
- is_automatic: Boolean (default)
- badge_metadata: JSONB (nullable)
- _relations_: event: , attendee: , awardedby: 

### EventRaffle
- id: Integer (pk)
- event_id: Integer (fk, index)
- title: String
- prize_name: String
- description: Text (nullable)
- min_sessions_required: Integer (default)
- winner_count: Integer (default)
- reserve_winner_count: Integer (default)
- status: String (default)
- created_by: Integer (fk)
- created_at: DateTime
- updated_at: DateTime
- drawn_at: DateTime (nullable)
- _relations_: event: , creator: , winners: 

### EventRaffleWinner
- id: Integer (pk)
- raffle_id: Integer (fk, index)
- attendee_id: Integer (fk, index)
- drawn_at: DateTime
- _relations_: raffle: , attendee: 

### CertificateTierRule
- id: Integer (pk)
- event_id: Integer (fk, index, unique)
- tier_definitions: JSONB (default)
- created_by: Integer (fk)
- updated_at: DateTime
- _relations_: event: , creator: 

### EventSurvey
- id: Integer (pk)
- event_id: Integer (fk, index, unique)
- is_required: Boolean (default)
- survey_type: String (default)
- builtin_questions: JSONB (nullable)
- external_provider: String (nullable)
- external_url: Text (nullable)
- external_webhook_key: String (nullable)
- created_at: DateTime
- updated_at: DateTime
- _relations_: event: 

### SurveyResponse
- id: Integer (pk)
- event_id: Integer (fk, index)
- attendee_id: Integer (fk, index)
- survey_type: String
- answers: JSONB (nullable)
- external_response_id: String (nullable)
- completed_at: DateTime
- completion_proof: JSONB (nullable)
- _relations_: event: , attendee: 

### SponsorSlot
- id: Integer (pk)
- event_id: Integer (fk, index)
- slot_position: String
- sponsor_name: String
- sponsor_logo_url: Text
- sponsor_website_url: Text
- sponsor_color_hex: String (default)
- enabled: Boolean (default)
- order_index: Integer (default)
- created_at: DateTime
- _relations_: event: 

### OAuthClient
- id: Integer (pk)
- client_id: String (unique)
- client_secret_hash: String
- name: String
- redirect_uris: JSONB (default)
- allowed_scopes: JSONB (default)
- logo_url: String (nullable)
- is_active: Boolean (default)
- created_at: DateTime (default)

### OAuthCode
- id: Integer (pk)
- code_hash: String (unique)
- client_id: String
- user_id: Integer
- redirect_uri: Text
- scopes: JSONB (default)
- code_challenge: String (nullable)
- code_challenge_method: String (nullable)
- expires_at: DateTime
- used: Boolean (default)
- created_at: DateTime (default)

### OAuthRefreshToken
- id: Integer (pk)
- token_hash: String (unique)
- client_id: String
- user_id: Integer
- scopes: JSONB (default)
- expires_at: DateTime
- revoked: Boolean (default)
- created_at: DateTime (default)

### OrganizationMember
- id: Integer (pk)
- organization_id: Integer (fk, index)
- user_id: Integer (fk, nullable, index)
- email: String
- role: String (default)
- permissions: JSONB (nullable)
- status: String (default)
- invited_by: Integer (fk, nullable)
- created_at: DateTime
- updated_at: DateTime

### OrgStaff
- id: Integer (pk)
- org_id: Integer (fk, index)
- user_id: Integer (fk, nullable, index)
- email: String
- display_name: String (nullable)
- role: String
- department: String (nullable)
- is_active: Boolean
- invited_at: DateTime
- joined_at: DateTime (nullable)

### Quiz
- id: Integer (pk)
- event_id: Integer (fk, unique, index)
- title: String (default)
- description: Text (nullable)
- passing_score: Integer (default)
- max_attempts: Integer (default)
- time_limit_minutes: Integer (nullable)
- required_for_cert: Boolean (default)
- is_active: Boolean (default)
- created_at: DateTime
- updated_at: DateTime
- _relations_: questions: , attempts: 

### QuizQuestion
- id: Integer (pk)
- quiz_id: Integer (fk, index)
- question_text: Text
- question_type: String (default)
- order: Integer (default)
- points: Integer (default)
- _relations_: quiz: , choices: , answers: 

### QuizChoice
- id: Integer (pk)
- question_id: Integer (fk, index)
- choice_text: Text
- is_correct: Boolean (default)
- order: Integer (default)
- _relations_: question: 

### QuizAttempt
- id: Integer (pk)
- quiz_id: Integer (fk, index)
- member_id: Integer (fk, nullable, index)
- attendee_name: String
- attendee_email: String (nullable, index)
- score: Integer (default)
- passed: Boolean (default)
- attempt_number: Integer (default)
- cert_issued: Boolean (default)
- started_at: DateTime
- completed_at: DateTime (nullable)
- _relations_: quiz: , answers: 

### QuizAnswer
- id: Integer (pk)
- attempt_id: Integer (fk, index)
- question_id: Integer (fk, index)
- selected_choice_id: Integer (fk, nullable)
- open_text_answer: Text (nullable)
- _relations_: attempt: , question: 

### ScheduledReport
- id: Integer (pk)
- organization_id: Integer (fk, index)
- name: String
- report_type: String
- filters_json: JSONB (default)
- frequency: String (default)
- recipients_json: JSONB (default)
- active: Integer (default)
- last_run_at: DateTime (nullable)
- next_run_at: DateTime (nullable)
- created_by: Integer (fk, nullable)
- created_at: DateTime
- updated_at: DateTime

### OrgSsoConfig
- id: Integer (pk)
- org_id: Integer (fk, index)
- provider: String
- client_id: String (nullable)
- client_secret: String (nullable)
- tenant_id: String (nullable)
- redirect_uri: Text (nullable)
- extra_config_json: Text (nullable)
- is_active: Boolean
- created_at: DateTime
- updated_at: DateTime

### OrganizationVenue
- id: Integer (pk)
- organization_id: Integer (fk, index)
- name: String
- capacity: Integer
- location: String (nullable)
- notes: Text (nullable)
- is_active: Boolean (default)
- created_at: DateTime
- updated_at: DateTime

### VenueReservation
- id: Integer (pk)
- organization_id: Integer (fk, index)
- venue_id: Integer (fk, index)
- title: String
- description: Text (nullable)
- start_at: DateTime (index)
- end_at: DateTime (index)
- status: String (default, index)
- calendar_provider: String (default)
- external_event_id: String (nullable)
- created_by: Integer (fk)
- updated_by: Integer (fk, nullable)
- created_at: DateTime
- updated_at: DateTime

---

# Components

- **Custom404** — `heptacert\docs\pages\404.jsx`
- **AcceptInvitePage** [client] — `heptacert\frontend\src\app\accept-invite\page.tsx`
- **AcikRizaPage** [client] — `heptacert\frontend\src\app\acik-riza\page.tsx`
- **AccreditationPage** [client] — `heptacert\frontend\src\app\admin\accreditation\page.tsx`
- **OrgAnalyticsPage** [client] — `heptacert\frontend\src\app\admin\analytics\page.tsx`
- **ApiKeysPage** [client] — `heptacert\frontend\src\app\admin\api-keys\page.tsx`
- **AdminAssistantPage** [client] — `heptacert\frontend\src\app\admin\assistant\page.tsx`
- **TwoFAManagementPage** [client] — `heptacert\frontend\src\app\admin\auth\2fa\page.tsx`
- **CrmAccountsPage** [client] — `heptacert\frontend\src\app\admin\crm\accounts\page.tsx`
- **CrmAccountDetailPage** [client] — `heptacert\frontend\src\app\admin\crm\accounts\[id]\page.tsx`
- **AdminCrmLayout** [client] — `heptacert\frontend\src\app\admin\crm\layout.tsx`
- **AdminCrmPage** [client] — `heptacert\frontend\src\app\admin\crm\page.tsx`
- **CrmPipelinePage** [client] — `heptacert\frontend\src\app\admin\crm\pipeline\page.tsx`
- **CrmSequencesPage** [client] — `heptacert\frontend\src\app\admin\crm\sequences\page.tsx`
- **SequenceDetailPage** [client] — `heptacert\frontend\src\app\admin\crm\sequences\[id]\page.tsx`
- **DashboardPage** [client] — `heptacert\frontend\src\app\admin\dashboard\page.tsx`
- **EmailAnalyticsPage** [client] — `heptacert\frontend\src\app\admin\email-analytics\page.tsx`
- **EmailDashboard** [client] — `heptacert\frontend\src\app\admin\email-dashboard\page.tsx`
- **EmailSettingsPage** — `heptacert\frontend\src\app\admin\email-settings\page.tsx`
- **SMTPConfigurationPage** [client] — `heptacert\frontend\src\app\admin\email-settings\smtp-config\page.tsx`
- **NewEventPage** [client] — `heptacert\frontend\src\app\admin\events\new\page.tsx`
- **AdminEvents** [client] — `heptacert\frontend\src\app\admin\events\page.tsx`
- **AdvancedAnalyticsPage** [client] — `heptacert\frontend\src\app\admin\events\[id]\advanced-analytics\page.tsx`
- **AIToolsPage** [client] — `heptacert\frontend\src\app\admin\events\[id]\ai-tools\page.tsx`
- **EventAnalyticsRedirect** — props: params — `heptacert\frontend\src\app\admin\events\[id]\analytics\page.tsx`
- **DeliveryAnalyticsPage** [client] — `heptacert\frontend\src\app\admin\events\[id]\analytics\[jobId]\page.tsx`
- **AdminAttendeesPage** [client] — `heptacert\frontend\src\app\admin\events\[id]\attendees\page.tsx`
- **EventAutomationsPage** [client] — `heptacert\frontend\src\app\admin\events\[id]\automations\page.tsx`
- **BulkEmailsPage** [client] — `heptacert\frontend\src\app\admin\events\[id]\bulk-emails\page.tsx`
- **EmailJobDetailsPage** [client] — `heptacert\frontend\src\app\admin\events\[id]\bulk-emails\[jobId]\page.tsx`
- **CertificatesPage** [client] — `heptacert\frontend\src\app\admin\events\[id]\certificates\page.tsx`
- **AdminCheckinPage** [client] — `heptacert\frontend\src\app\admin\events\[id]\checkin\page.tsx`
- **EventCpdPage** [client] — `heptacert\frontend\src\app\admin\events\[id]\cpd\page.tsx`
- **EditorPage** [client] — `heptacert\frontend\src\app\admin\events\[id]\editor\page.tsx`
- **EmailTemplatesPage** [client] — `heptacert\frontend\src\app\admin\events\[id]\email-templates\page.tsx`
- **GamificationPage** [client] — `heptacert\frontend\src\app\admin\events\[id]\gamification\page.tsx`
- **EventLayout** — props: params — `heptacert\frontend\src\app\admin\events\[id]\layout.tsx`
- **LmsBridgeRedirect** — `heptacert\frontend\src\app\admin\events\[id]\lms-bridge\page.tsx`
- **EventMarketplacePage** [client] — `heptacert\frontend\src\app\admin\events\[id]\marketplace\page.tsx`
- **EventOperationsPage** [client] — `heptacert\frontend\src\app\admin\events\[id]\ops\page.tsx`
- **EventIndexPage** [client] — `heptacert\frontend\src\app\admin\events\[id]\page.tsx`
- **EmailTemplatePreviewPage** [client] — `heptacert\frontend\src\app\admin\events\[id]\preview\page.tsx`
- **QrPresentPage** [client] — `heptacert\frontend\src\app\admin\events\[id]\qr-present\page.tsx`
- **QuizBuilderPage** [client] — `heptacert\frontend\src\app\admin\events\[id]\quiz\page.tsx`
- **EventRafflesPage** [client] — `heptacert\frontend\src\app\admin\events\[id]\raffles\page.tsx`
- **RafflePresentationPage** [client] — `heptacert\frontend\src\app\admin\events\[id]\raffles\[raffleId]\present\page.tsx`
- **ScheduleEmailPage** [client] — `heptacert\frontend\src\app\admin\events\[id]\schedule-email\page.tsx`
- **EventSegmentsPage** [client] — `heptacert\frontend\src\app\admin\events\[id]\segments\page.tsx`
- **AdminSessionsPage** [client] — `heptacert\frontend\src\app\admin\events\[id]\sessions\page.tsx`
- **EventSettingsPage** [client] — `heptacert\frontend\src\app\admin\events\[id]\settings\page.tsx`
- **SurveysPage** [client] — `heptacert\frontend\src\app\admin\events\[id]\surveys\page.tsx`
- **EventTeamPage** [client] — `heptacert\frontend\src\app\admin\events\[id]\team\page.tsx`
- **EventTicketsPage** [client] — `heptacert\frontend\src\app\admin\events\[id]\tickets\page.tsx`
- **EventAdminLayoutShell** [client] — props: eventId — `heptacert\frontend\src\app\admin\events\[id]\_event-admin-layout-shell.tsx`
- **AdminIntegrationsPage** [client] — `heptacert\frontend\src\app\admin\integrations\page.tsx`
- **AdminJobsPage** [client] — `heptacert\frontend\src\app\admin\jobs\page.tsx`
- **AdminLayout** — `heptacert\frontend\src\app\admin\layout.tsx`
- **AdminLeadFormsLayout** [client] — `heptacert\frontend\src\app\admin\lead-forms\layout.tsx`
- **LeadFormsPage** [client] — `heptacert\frontend\src\app\admin\lead-forms\page.tsx`
- **LeadFormBuilderPage** [client] — `heptacert\frontend\src\app\admin\lead-forms\[id]\page.tsx`
- **LearningPathsRedirect** — `heptacert\frontend\src\app\admin\learning-paths\page.tsx`
- **LearningPathBuilderPage** [client] — `heptacert\frontend\src\app\admin\learning-paths\[id]\page.tsx`
- **AdminLogin** [client] — `heptacert\frontend\src\app\admin\login\page.tsx`
- **MagicVerifyPage** [client] — `heptacert\frontend\src\app\admin\magic-verify\page.tsx`
- **AdminMarketplacePage** [client] — `heptacert\frontend\src\app\admin\marketplace\page.tsx`
- **OrgSocialProfileAdminPage** [client] — `heptacert\frontend\src\app\admin\organization-social\page.tsx`
- **TransactionsPage** [client] — `heptacert\frontend\src\app\admin\payments\transactions\page.tsx`
- **ScheduledReportsPage** [client] — `heptacert\frontend\src\app\admin\reports\page.tsx`
- **AdminReservations** [client] — `heptacert\frontend\src\app\admin\reservations\page.tsx`
- **ApiSettingsPage** [client] — `heptacert\frontend\src\app\admin\settings\api\page.tsx`
- **AdminSettingsPage** [client] — `heptacert\frontend\src\app\admin\settings\page.tsx`
- **SsoSettingsPage** [client] — `heptacert\frontend\src\app\admin\settings\sso\page.tsx`
- **TeamPage** [client] — `heptacert\frontend\src\app\admin\settings\team\page.tsx`
- **SuperAdminAdminsPage** [client] — `heptacert\frontend\src\app\admin\superadmin\admins\page.tsx`
- **AuditLogsPage** [client] — `heptacert\frontend\src\app\admin\superadmin\audit-logs\page.tsx`
- **SuperadminHealthPage** [client] — `heptacert\frontend\src\app\admin\superadmin\health\page.tsx`
- **SuperadminLayout** [client] — `heptacert\frontend\src\app\admin\superadmin\layout.tsx`
- **SuperadminMailLogsPage** [client] — `heptacert\frontend\src\app\admin\superadmin\mail-logs\page.tsx`
- **SuperadminMembersPage** [client] — `heptacert\frontend\src\app\admin\superadmin\members\page.tsx`
- **OAuthClientsPage** [client] — `heptacert\frontend\src\app\admin\superadmin\oauth-clients\page.tsx`
- **SuperadminOrgsPage** [client] — `heptacert\frontend\src\app\admin\superadmin\orgs\page.tsx`
- **SuperadminPage** — `heptacert\frontend\src\app\admin\superadmin\page.tsx`
- **SuperadminPaymentPage** [client] — `heptacert\frontend\src\app\admin\superadmin\payment\page.tsx`
- **SuperadminPricingPage** [client] — `heptacert\frontend\src\app\admin\superadmin\pricing\page.tsx`
- **SuperAdminStatsPage** [client] — `heptacert\frontend\src\app\admin\superadmin\stats\page.tsx`
- **SuperadminSubscriptionsPage** [client] — `heptacert\frontend\src\app\admin\superadmin\subscriptions\page.tsx`
- **SupportTicketsPage** [client] — `heptacert\frontend\src\app\admin\superadmin\support-tickets\page.tsx`
- **SuperadminSystemDigestPage** [client] — `heptacert\frontend\src\app\admin\superadmin\system-digest\page.tsx`
- **SuperadminWaitlistPage** [client] — `heptacert\frontend\src\app\admin\superadmin\waitlist\page.tsx`
- **AdminTeamInvitePage** [client] — `heptacert\frontend\src\app\admin\team-invite\page.tsx`
- **AdminTrainingPage** [client] — `heptacert\frontend\src\app\admin\training\page.tsx`
- **AdminVenues** [client] — `heptacert\frontend\src\app\admin\venues\page.tsx`
- **WebhookLogsPage** [client] — `heptacert\frontend\src\app\admin\webhooks\logs\page.tsx`
- **WebhooksPage** [client] — `heptacert\frontend\src\app\admin\webhooks\page.tsx`
- **AdminLayoutShell** [client] — `heptacert\frontend\src\app\admin\_admin-layout-shell.tsx`
- **AttendCheckinPage** [client] — `heptacert\frontend\src\app\attend\[token]\page.tsx`
- **GoogleCallbackPage** [client] — `heptacert\frontend\src\app\auth\google\callback\page.tsx`
- **SsoSuccessPage** [client] — `heptacert\frontend\src\app\auth\sso\success\page.tsx`
- **CheckoutCancelPage** [client] — `heptacert\frontend\src\app\checkout\cancel\page.tsx`
- **CheckoutPage** [client] — `heptacert\frontend\src\app\checkout\page.tsx`
- **CheckoutSuccessPage** [client] — `heptacert\frontend\src\app\checkout\success\page.tsx`
- **ConnectionsPage** — `heptacert\frontend\src\app\community\connections\page.tsx`
- **ConnectionsClient** [client] — `heptacert\frontend\src\app\community\connections\_client.tsx`
- **CommunityPricingPage** — `heptacert\frontend\src\app\community\pricing\page.tsx`
- **SubscriptionSettingsPage** — `heptacert\frontend\src\app\community\settings\subscription\page.tsx`
- **DevelopersClient** [client] — `heptacert\frontend\src\app\developers\DevelopersClient.tsx`
- **DevelopersPage** — `heptacert\frontend\src\app\developers\page.tsx`
- **DiscoveryPage** [client] — `heptacert\frontend\src\app\discover\page.tsx`
- **PublicEventsPage** [client] — `heptacert\frontend\src\app\events\page.tsx`
- **PublicEventDetailPage** — `heptacert\frontend\src\app\events\[id]\page.tsx`
- **PublicQuizPage** [client] — `heptacert\frontend\src\app\events\[id]\quiz\page.tsx`
- **EventRegisterPage** [client] — `heptacert\frontend\src\app\events\[id]\register\page.tsx`
- **EventParticipantStatusPage** [client] — `heptacert\frontend\src\app\events\[id]\status\page.tsx`
- **EventSurveyPage** [client] — `heptacert\frontend\src\app\events\[id]\survey\_survey-clean.tsx`
- **VerifyAttendeeEmailPage** [client] — `heptacert\frontend\src\app\events\[id]\verify-email\page.tsx`
- **PublicEventDetailClient** [client] — `heptacert\frontend\src\app\events\[id]\_public-event-detail-client.tsx`
- **ForgotPasswordPage** [client] — `heptacert\frontend\src\app\forgot-password\page.tsx`
- **GizlilikPage** [client] — `heptacert\frontend\src\app\gizlilik\page.tsx`
- **IadePage** [client] — `heptacert\frontend\src\app\iade\page.tsx`
- **IletisimPage** [client] — `heptacert\frontend\src\app\iletisim\page.tsx`
- **TermsPage** [client] — `heptacert\frontend\src\app\kullanim-kosullari\page.tsx`
- **KVKKPage** [client] — `heptacert\frontend\src\app\kvkk\page.tsx`
- **PLATFORM_HOSTS** — `heptacert\frontend\src\app\layout.tsx`
- **LearningPathsLayout** — `heptacert\frontend\src\app\learning-paths\layout.tsx`
- **LearningPathsPage** [client] — `heptacert\frontend\src\app\learning-paths\page.tsx`
- **LearningPathProgressPage** [client] — `heptacert\frontend\src\app\learning-paths\[id]\page.tsx`
- **MemberLoginPage** [client] — `heptacert\frontend\src\app\login\page.tsx`
- **MarketplaceCourses** — `heptacert\frontend\src\app\marketplace\courses\page.tsx`
- **MarketplaceLayout** — `heptacert\frontend\src\app\marketplace\layout.tsx`
- **MarketplacePage** [client] — `heptacert\frontend\src\app\marketplace\page.tsx`
- **EventDetailClient** [client] — props: event — `heptacert\frontend\src\app\marketplace\[event_id]\EventDetailClient.tsx`
- **MarketplaceEventPage** — props: params — `heptacert\frontend\src\app\marketplace\[event_id]\page.tsx`
- **VerifyMemberEmailPage** [client] — `heptacert\frontend\src\app\member\verify-email\page.tsx`
- **PublicMemberProfilePage** [client] — `heptacert\frontend\src\app\member\[public_id]\page.tsx`
- **MembersRedirectPage** [client] — `heptacert\frontend\src\app\members\[id]\page.tsx`
- **MesafeliSatisPage** [client] — `heptacert\frontend\src\app\mesafeli-satis\page.tsx`
- **MyEventsPage** [client] — `heptacert\frontend\src\app\my-events\page.tsx`
- **NotFound** [client] — `heptacert\frontend\src\app\not-found.tsx`
- **OAuthAuthorizePage** — `heptacert\frontend\src\app\oauth\authorize\page.tsx`
- **OAuthConsentClient** [client] — `heptacert\frontend\src\app\oauth\authorize\_client.tsx`
- **PublicOrganizationsPage** [client] — `heptacert\frontend\src\app\organizations\page.tsx`
- **PublicOrganizationDetailPage** [client] — `heptacert\frontend\src\app\organizations\[id]\page.tsx`
- **HomePage** — `heptacert\frontend\src\app\page.tsx`
- **PortalCalendarPage** [client] — `heptacert\frontend\src\app\portal\calendar\page.tsx`
- **PortalCoursesDisabled** — `heptacert\frontend\src\app\portal\courses\page.tsx`
- **PortalLayout** [client] — `heptacert\frontend\src\app\portal\layout.tsx`
- **PortalLoginPage** [client] — `heptacert\frontend\src\app\portal\login\page.tsx`
- **PortalDashboard** [client] — `heptacert\frontend\src\app\portal\page.tsx`
- **CreatePostPage** [client] — `heptacert\frontend\src\app\post\create\page.tsx`
- **PostDetailPage** [client] — `heptacert\frontend\src\app\post\[postId]\page.tsx`
- **BusinessPricingPage** — `heptacert\frontend\src\app\pricing\business\page.tsx`
- **MemberPricingPage** — `heptacert\frontend\src\app\pricing\member\page.tsx`
- **PricingPage** — `heptacert\frontend\src\app\pricing\page.tsx`
- **PricingPage** [client] — props: tier, lang, onClose — `heptacert\frontend\src\app\pricing\_pricing-client.tsx`
- **ProfilePage** [client] — `heptacert\frontend\src\app\profile\page.tsx`
- **FormsLayout** — `heptacert\frontend\src\app\public\forms\[slug]\layout.tsx`
- **PublicFormPage** [client] — `heptacert\frontend\src\app\public\forms\[slug]\page.tsx`
- **RegisterPage** — `heptacert\frontend\src\app\register\page.tsx`
- **RegisterPage** [client] — `heptacert\frontend\src\app\register\_register-client.tsx`
- **RegisterHub** [client] — `heptacert\frontend\src\app\register\_register-hub.tsx`
- **ResetPasswordPage** [client] — `heptacert\frontend\src\app\reset-password\page.tsx`
- **PublicTicketPage** [client] — `heptacert\frontend\src\app\tickets\[token]\page.tsx`
- **VerifyPage** — `heptacert\frontend\src\app\verify\page.tsx`
- **API_BASE** — props: params — `heptacert\frontend\src\app\verify\[uuid]\page.tsx`
- **VerifyPage** [client] — props: params — `heptacert\frontend\src\app\verify\[uuid]\_verify-detail-client.tsx`
- **VerifyIndexPage** [client] — `heptacert\frontend\src\app\verify\_verify-client.tsx`
- **VerifyEmailPage** [client] — `heptacert\frontend\src\app\verify-email\page.tsx`
- **ClientShell** [client] — `heptacert\frontend\src\app\_client-shell.tsx`
- **LandingPage** [client] — `heptacert\frontend\src\app\_home-client.tsx`
- **ThemeInitializer** — `heptacert\frontend\src\app\_theme-initializer.tsx`
- **AccessibleModal** [client] — props: isOpen, onClose, title, maxWidth, footer — `heptacert\frontend\src\components\Accessible\AccessibleModal.tsx`
- **FormField** [client] — props: label, error, required, hint — `heptacert\frontend\src\components\Accessible\FormComponents.tsx`
- **AddAttendeeModal** [client] — props: open, onClose, onAdded, eventId — `heptacert\frontend\src\components\Admin\AddAttendeeModal.tsx`
- **LoadingState** [client] — props: title, description, icon, action, className — `heptacert\frontend\src\components\Admin\AdminState.tsx`
- **AIAssistant** [client] — props: pageMode — `heptacert\frontend\src\components\Admin\AIAssistant.tsx`
- **BulkActionBar** [client] — props: selectedCount, title, description, onClear, loading — `heptacert\frontend\src\components\Admin\BulkActionBar.tsx`
- **CommandPalette** [client] — `heptacert\frontend\src\components\Admin\CommandPalette.tsx`
- **ConfirmModal** [client] — props: open, title, description, confirmLabel, cancelLabel, processingLabel, danger, loading, onConfirm, onCancel — `heptacert\frontend\src\components\Admin\ConfirmModal.tsx`
- **CreateEventDrawer** [client] — props: open, onClose, onCreated, venues — `heptacert\frontend\src\components\Admin\CreateEventDrawer.tsx`
- **DateField** [client] — props: value, onChange, label, placeholder, locale, className — `heptacert\frontend\src\components\Admin\DateField.tsx`
- **DateTimeField** [client] — props: value, onChange, label, dateLabel, timeLabel, disabled, locale, className — `heptacert\frontend\src\components\Admin\DateTimeField.tsx`
- **EmailTemplateSelect** [client] — props: eventId, value, onChange, label, placeholder, emptyText, helperText, disabled — `heptacert\frontend\src\components\Admin\EmailTemplateSelect.tsx`
- **EmptyState** [client] — props: title, description, icon, action, className — `heptacert\frontend\src\components\Admin\EmptyState.tsx`
- **EventActivityTimeline** [client] — props: eventId — `heptacert\frontend\src\components\Admin\EventActivityTimeline.tsx`
- **EventAdminNav** [client] — props: eventId, active, eventName, className, variant, forceVisible — `heptacert\frontend\src\components\Admin\EventAdminNav.tsx`
- **EventSetupChecklist** [client] — props: event, overview, attendees, sessions, active_certificates — `heptacert\frontend\src\components\Admin\EventSetupChecklist.tsx`
- **FilterActionBar** [client] — props: search, onSearchChange, searchPlaceholder, clearLabel, filters, actions, onClear, hasActiveFilters, className — `heptacert\frontend\src\components\Admin\FilterActionBar.tsx`
- **ImportAttendeeModal** [client] — props: open, onClose, onImported, eventId — `heptacert\frontend\src\components\Admin\ImportAttendeeModal.tsx`
- **InAppTourGuide** [client] — `heptacert\frontend\src\components\Admin\InAppTourGuide.tsx`
- **IssueCertificateModal** [client] — props: open, onClose, onIssued, eventId, templateReady, sampleMonthlyCost, sampleYearlyCost — `heptacert\frontend\src\components\Admin\IssueCertificateModal.tsx`
- **MobileActionBar** [client] — props: className — `heptacert\frontend\src\components\Admin\MobileActionBar.tsx`
- **PageHeader** [client] — props: title, subtitle, icon, actions, breadcrumbs, iconBg — `heptacert\frontend\src\components\Admin\PageHeader.tsx`
- **StatCard** [client] — props: label, value, icon, iconBg, trend — `heptacert\frontend\src\components\Admin\StatCard.tsx`
- **TimeField** [client] — props: value, onChange, label, placeholder, className — `heptacert\frontend\src\components\Admin\TimeField.tsx`
- **HeptaCertLogoMark** — props: className, imageClassName — `heptacert\frontend\src\components\Brand\HeptaCertLogoMark.tsx`
- **CommentCard** — props: commentId, body, authorName, authorAvatar, timestamp, upvoteCount, downvoteCount, userVote, depth, onUpvote — `heptacert\frontend\src\components\CommunityFeed\CommentCard.tsx`
- **CommentTree** — props: comments, maxDepth, onUpvote, onDownvote, onReply, isLoading — `heptacert\frontend\src\components\CommunityFeed\CommentTree.tsx`
- **CreatePostForm** — props: onSubmit, placeholder, userAvatar, isSubmitting, maxLength — `heptacert\frontend\src\components\CommunityFeed\CreatePostForm.tsx`
- **PostCard** — props: postId, authorName, authorAvatar, timestamp, body, commentCount, upvoteCount, downvoteCount, userVote, onUpvote — `heptacert\frontend\src\components\CommunityFeed\PostCard.tsx`
- **ReplyForm** — props: parentAuthor, onSubmit, onCancel, placeholder, isSubmitting — `heptacert\frontend\src\components\CommunityFeed\ReplyForm.tsx`
- **CookieConsent** [client] — `heptacert\frontend\src\components\CookieConsent\CookieConsent.tsx`
- **DataTable** [client] — `heptacert\frontend\src\components\DataTable\DataTable.tsx`
- **FollowButton** [client] — props: memberId, isFollowing, onFollowChange, variant — `heptacert\frontend\src\components\FollowButton.tsx`
- **LoadingSkeleton** [client] — props: count, height, width, rounded, className — `heptacert\frontend\src\components\LoadingSkeleton\LoadingSkeleton.tsx`
- **OrgSocialProfileForm** — props: initialData, onSubmit, isLoading, orgName — `heptacert\frontend\src\components\OrgSocialProfile\OrgSocialProfileForm.tsx`
- **RichTextEditor** [client] — props: value, onChange, placeholder — `heptacert\frontend\src\components\RichTextEditor.tsx`
- **ThemeToggle** [client] — `heptacert\frontend\src\components\ThemeToggle.tsx`
- **ToastProvider** [client] — `heptacert\frontend\src\components\Toast\ToastProvider.tsx`
- **I18nProvider** [client] — `heptacert\frontend\src\lib\i18n.tsx`
- **PlanGateCard** [client] — props: feature, requiredPlans, "growth", "enterprise"], serverMessage, compact — `heptacert\frontend\src\lib\useSubscription.tsx`
- **LmsAnalyticsPage** [client] — `heptacert\frontend\_archive_lms\app\admin\lms\analytics\page.tsx`
- **LmsBadgesPage** [client] — `heptacert\frontend\_archive_lms\app\admin\lms\badges\page.tsx`
- **CourseAnnouncementsPage** [client] — `heptacert\frontend\_archive_lms\app\admin\lms\courses\[id]\announcements\page.tsx`
- **CourseAttendancePage** [client] — `heptacert\frontend\_archive_lms\app\admin\lms\courses\[id]\attendance\page.tsx`
- **GradebookPage** [client] — `heptacert\frontend\_archive_lms\app\admin\lms\courses\[id]\gradebook\page.tsx`
- **QuizBuilderPage** [client] — `heptacert\frontend\_archive_lms\app\admin\lms\courses\[id]\quizzes\[qid]\page.tsx`
- **RubricsPage** [client] — `heptacert\frontend\_archive_lms\app\admin\lms\courses\[id]\rubrics\page.tsx`
- **CourseStudentsPage** [client] — `heptacert\frontend\_archive_lms\app\admin\lms\courses\[id]\students\page.tsx`
- **CourseSyllabusPage** [client] — `heptacert\frontend\_archive_lms\app\admin\lms\courses\[id]\syllabus\page.tsx`
- **LmsIntegrationsPage** [client] — `heptacert\frontend\_archive_lms\app\admin\lms\integrations\page.tsx`
- **LmsJourneysPage** [client] — `heptacert\frontend\_archive_lms\app\admin\lms\journeys\page.tsx`
- **JourneyBuilderPage** [client] — `heptacert\frontend\_archive_lms\app\admin\lms\journeys\[id]\page.tsx`
- **AdminLmsLayout** [client] — `heptacert\frontend\_archive_lms\app\admin\lms\layout.tsx`
- **LtiRedirect** — `heptacert\frontend\_archive_lms\app\admin\lms\lti\page.tsx`
- **LmsOutcomesPage** [client] — `heptacert\frontend\_archive_lms\app\admin\lms\outcomes\page.tsx`
- **LmsCoursesPage** [client] — `heptacert\frontend\_archive_lms\app\admin\lms\page.tsx`
- **LmsStaffPage** [client] — `heptacert\frontend\_archive_lms\app\admin\lms\staff\page.tsx`
- **LmsWhiteLabelPage** [client] — `heptacert\frontend\_archive_lms\app\admin\lms\white-label\page.tsx`
- **LmsCourseDetailPage** [client] — `heptacert\frontend\_archive_lms\app\admin\lms\[id]\page.tsx`
- **CoursesRedirectPage** — `heptacert\frontend\_archive_lms\app\courses\page.tsx`
- **CourseAnnouncementsPublicPage** [client] — `heptacert\frontend\_archive_lms\app\courses\[id]\announcements\page.tsx`
- **CourseCalendarPage** [client] — `heptacert\frontend\_archive_lms\app\courses\[id]\calendar\page.tsx`
- **CourseDiscussionsPage** [client] — `heptacert\frontend\_archive_lms\app\courses\[id]\discussions\page.tsx`
- **CourseGradesPage** [client] — `heptacert\frontend\_archive_lms\app\courses\[id]\grades\page.tsx`
- **CourseIdDisabledLayout** — `heptacert\frontend\_archive_lms\app\courses\[id]\layout.tsx`
- **ModuleViewerPage** [client] — `heptacert\frontend\_archive_lms\app\courses\[id]\modules\[mid]\page.tsx`
- **CourseDetailPage** [client] — `heptacert\frontend\_archive_lms\app\courses\[id]\page.tsx`
- **CourseSyllabusPublicPage** [client] — `heptacert\frontend\_archive_lms\app\courses\[id]\syllabus\page.tsx`

---

# Libraries

- `heptacert\backend\alembic\env.py` — function run_migrations_offline: () -> None, function run_migrations_online: () -> None
- `heptacert\backend\alembic\versions\001_baseline.py` — function upgrade: () -> None, function downgrade: () -> None
- `heptacert\backend\alembic\versions\002_features.py` — function upgrade: () -> None, function downgrade: () -> None
- `heptacert\backend\alembic\versions\003_attendance.py` — function upgrade: () -> None, function downgrade: () -> None
- `heptacert\backend\alembic\versions\004_event_banner.py` — function upgrade: () -> None, function downgrade: () -> None
- `heptacert\backend\alembic\versions\005_hc_renewal.py` — function upgrade: () -> None, function downgrade: () -> None
- `heptacert\backend\alembic\versions\006_waitlist.py` — function upgrade: () -> None, function downgrade: () -> None
- `heptacert\backend\alembic\versions\007_transaction_description.py` — function upgrade: () -> None, function downgrade: () -> None
- `heptacert\backend\alembic\versions\008_email_system.py` — function upgrade: () -> None, function downgrade: () -> None
- `heptacert\backend\alembic\versions\009_email_system_complete.py` — function upgrade: () -> None, function downgrade: () -> None
- `heptacert\backend\alembic\versions\010_smtp_credentials.py` — function upgrade: () -> None, function downgrade: () -> None
- `heptacert\backend\alembic\versions\011_gamification_surveys_sponsors.py` — function upgrade: () -> None, function downgrade: () -> None
- `heptacert\backend\alembic\versions\012_add_domains_table.py` — function upgrade: () -> None, function downgrade: () -> None
- `heptacert\backend\alembic\versions\013_add_org_settings.py` — function upgrade: () -> None, function downgrade: () -> None
- `heptacert\backend\alembic\versions\014_add_organization_allowlist.py` — function upgrade: () -> None, function downgrade: () -> None
- `heptacert\backend\alembic\versions\015_add_raffle_reserve_winner_count.py` — function upgrade: () -> None, function downgrade: () -> None
- `heptacert\backend\alembic\versions\016_attendee_email_verification.py` — function upgrade: () -> None, function downgrade: () -> None
- `heptacert\backend\alembic\versions\017_bulk_email_recipient_type.py` — function upgrade: () -> None, function downgrade: () -> None
- `heptacert\backend\alembic\versions\018_att_reg_answers.py` — function upgrade: () -> None, function downgrade: () -> None
- `heptacert\backend\alembic\versions\019_reg_answers_guard.py` — function upgrade: () -> None, function downgrade: () -> None
- `heptacert\backend\alembic\versions\020_public_members.py` — function upgrade: () -> None, function downgrade: () -> None
- `heptacert\backend\alembic\versions\021_member_social.py` — function upgrade: () -> None, function downgrade: () -> None
- `heptacert\backend\alembic\versions\022_event_public_id.py` — function upgrade: () -> None, function downgrade: () -> None
- `heptacert\backend\alembic\versions\023_user_smtp_sender_fields.py` — function upgrade: () -> None, function downgrade: () -> None
- `heptacert\backend\alembic\versions\024_public_member_profile_fields.py` — function upgrade: () -> None, function downgrade: () -> None
- `heptacert\backend\alembic\versions\025_public_member_profile_enrichment.py` — function upgrade: () -> None, function downgrade: () -> None
- `heptacert\backend\alembic\versions\026_public_member_public_id.py` — function upgrade: () -> None, function downgrade: () -> None
- `heptacert\backend\alembic\versions\027_org_public_profile_follow.py` — function upgrade: () -> None, function downgrade: () -> None
- `heptacert\backend\alembic\versions\028_soc_feed.py` — function upgrade: () -> None, function downgrade: () -> None
- `heptacert\backend\alembic\versions\029_glob_feed.py` — function upgrade: () -> None, function downgrade: () -> None
- `heptacert\backend\alembic\versions\030_mem_subs.py` — function upgrade: () -> None, function downgrade: () -> None
- `heptacert\backend\alembic\versions\031_user_connections.py` — function upgrade: () -> None, function downgrade: () -> None
- `heptacert\backend\alembic\versions\032_add_connections.py` — function upgrade: () -> None, function downgrade: () -> None
- `heptacert\backend\alembic\versions\033_comment_votes.py` — function upgrade: () -> None, function downgrade: () -> None
- `heptacert\backend\alembic\versions\034_public_member_contact_email.py` — function upgrade: () -> None, function downgrade: () -> None
- `heptacert\backend\alembic\versions\035_support_tickets.py` — function upgrade: () -> None, function downgrade: () -> None
- `heptacert\backend\alembic\versions\036_superadmin_bulk_email_jobs.py` — function upgrade: () -> None, function downgrade: () -> None
- `heptacert\backend\alembic\versions\037_registration_option_capacities.py` — function upgrade: () -> None, function downgrade: () -> None
- `heptacert\backend\alembic\versions\038_event_feature_flags.py` — function upgrade: () -> None, function downgrade: () -> None
- `heptacert\backend\alembic\versions\039_event_tickets.py` — function upgrade: () -> None, function downgrade: () -> None
- `heptacert\backend\alembic\versions\040_event_engagement_feature_flags.py` — function upgrade: () -> None, function downgrade: () -> None
- `heptacert\backend\alembic\versions\041_google_sheets_integration.py` — function upgrade: () -> None, function downgrade: () -> None
- `heptacert\backend\alembic\versions\042_microsoft_excel_integration.py` — function upgrade: () -> None, function downgrade: () -> None
- `heptacert\backend\alembic\versions\043_system_digest_emails.py` — function upgrade: () -> None, function downgrade: () -> None
- `heptacert\backend\alembic\versions\044_email_scheduling_fields.py` — function upgrade: () -> None, function downgrade: () -> None
- `heptacert\backend\alembic\versions\045_event_team_members.py` — function upgrade: () -> None, function downgrade: () -> None
- `heptacert\backend\alembic\versions\046_event_team_perms.py` — function upgrade: () -> None, function downgrade: () -> None
- `heptacert\backend\alembic\versions\047_fix_attendance_table_name.py` — function upgrade: () -> None, function downgrade: () -> None
- `heptacert\backend\alembic\versions\048_certificate_auto_renew.py` — function upgrade: () -> None, function downgrade: () -> None
- `heptacert\backend\alembic\versions\049_drop_public_member_subscriptions.py` — function upgrade: () -> None, function downgrade: () -> None
- `heptacert\backend\alembic\versions\050_organization_venues.py` — function upgrade: () -> None, function downgrade: () -> None
- `heptacert\backend\alembic\versions\051_organization_access_reservations.py` — function upgrade: () -> None, function downgrade: () -> None
- `heptacert\backend\alembic\versions\052_training_assignments.py` — function upgrade: () -> None, function downgrade: () -> None
- `heptacert\backend\alembic\versions\053_product_config_tables.py` — function upgrade: () -> None, function downgrade: () -> None
- `heptacert\backend\alembic\versions\054_checkin_activity_logs.py` — function upgrade: () -> None, function downgrade: () -> None
- `heptacert\backend\alembic\versions\055_product_query_indexes.py` — function upgrade: () -> None, function downgrade: () -> None
- `heptacert\backend\alembic\versions\056_crm_enterprise_upgrade.py` — function upgrade: () -> None, function downgrade: () -> None
- `heptacert\backend\alembic\versions\057_crm_saved_views.py` — function upgrade: () -> None, function downgrade: () -> None
- `heptacert\backend\alembic\versions\058_crm_email_aliases.py` — function upgrade: () -> None, function downgrade: () -> None
- `heptacert\backend\alembic\versions\059_automation_execution_logs.py` — function upgrade: () -> None, function downgrade: () -> None
- `heptacert\backend\alembic\versions\060_saved_audience_segments.py` — function upgrade: () -> None, function downgrade: () -> None
- `heptacert\backend\alembic\versions\061_segment_export_jobs.py` — function upgrade: () -> None, function downgrade: () -> None
- `heptacert\backend\alembic\versions\062_departments_training_phase13.py` — function upgrade: () -> None, function downgrade: () -> None
- `heptacert\backend\alembic\versions\063_checkin_wallet_template_phase14_15.py` — function upgrade: () -> None, function downgrade: () -> None
- `heptacert\backend\alembic\versions\064_phase16_platform_packaging_qa.py` — function upgrade: () -> None, function downgrade: () -> None
- `heptacert\backend\alembic\versions\065_system_email_template_presets.py` — function upgrade: () -> None, function downgrade: () -> None
- `heptacert\backend\alembic\versions\066_fix_heptacoin_balance_column.py` — function upgrade: () -> None, function downgrade: () -> None
- `heptacert\backend\alembic\versions\067_document_export_jobs.py` — function upgrade: () -> None, function downgrade: () -> None
- `heptacert\backend\alembic\versions\068_soft_delete_users.py` — function upgrade: () -> None, function downgrade: () -> None
- `heptacert\backend\alembic\versions\069_crm_drip_sequences.py` — function upgrade: () -> None, function downgrade: () -> None
- `heptacert\backend\alembic\versions\070_performance_indexes.py` — function upgrade: () -> None, function downgrade: () -> None
- `heptacert\backend\alembic\versions\071_email_click_tracking.py` — function upgrade: () -> None, function downgrade: () -> None
- `heptacert\backend\alembic\versions\072_2fa_backup_codes.py` — function upgrade: () -> None, function downgrade: () -> None
- `heptacert\backend\alembic\versions\073_api_key_rate_limit.py` — function upgrade: () -> None, function downgrade: () -> None
- `heptacert\backend\alembic\versions\074_quiz_tables.py` — function upgrade: () -> None, function downgrade: () -> None
- `heptacert\backend\alembic\versions\075_learning_paths.py` — function upgrade: () -> None, function downgrade: () -> None
- `heptacert\backend\alembic\versions\076_crm_accounts.py` — function upgrade: () -> None, function downgrade: () -> None
- `heptacert\backend\alembic\versions\077_lead_capture_forms.py` — function upgrade: () -> None, function downgrade: () -> None
- `heptacert\backend\alembic\versions\078_scheduled_reports.py` — function upgrade: () -> None, function downgrade: () -> None
- `heptacert\backend\alembic\versions\079_marketplace_fields.py` — function upgrade: () -> None, function downgrade: () -> None
- `heptacert\backend\alembic\versions\080_accreditation.py` — function upgrade: () -> None, function downgrade: () -> None
- `heptacert\backend\alembic\versions\081_lms_tables.py` — function upgrade: (), function downgrade: ()
- `heptacert\backend\alembic\versions\082_lms_staff_cert_pdf.py` — function upgrade: () -> None, function downgrade: () -> None
- `heptacert\backend\alembic\versions\083_lms_extended.py` — function upgrade: () -> None, function downgrade: () -> None
- `heptacert\backend\alembic\versions\084_course_enrollment_status.py` — function upgrade: (), function downgrade: ()
- `heptacert\backend\alembic\versions\085_org_staff.py` — function upgrade: () -> None, function downgrade: () -> None
- `heptacert\backend\alembic\versions\086_course_marketplace.py` — function upgrade: () -> None, function downgrade: () -> None
- `heptacert\backend\alembic\versions\087_lti_tools.py` — function upgrade: () -> None, function downgrade: () -> None
- `heptacert\backend\alembic\versions\088_sso_config.py` — function upgrade: () -> None, function downgrade: () -> None
- `heptacert\backend\alembic\versions\089_lms_schema_repair.py` — function upgrade: () -> None, function downgrade: () -> None
- `heptacert\backend\alembic\versions\090_lms_academic_course_fields.py` — function upgrade: () -> None, function downgrade: () -> None
- `heptacert\backend\alembic\versions\091_lms_attendance.py` — function upgrade: () -> None, function downgrade: () -> None
- `heptacert\backend\alembic\versions\092_lms_quiz.py` — function upgrade: () -> None, function downgrade: () -> None
- `heptacert\backend\alembic\versions\093_lms_module_quiz_fk.py` — function upgrade: () -> None, function downgrade: () -> None
- `heptacert\backend\alembic\versions\094_event_quiz_cpd_toggles.py` — function upgrade: () -> None, function downgrade: () -> None
- `heptacert\backend\alembic\versions\095_agent_action_logs.py` — function upgrade: () -> None, function downgrade: () -> None
- `heptacert\backend\alembic\versions\096_oauth_server.py` — function upgrade: () -> None, function downgrade: () -> None
- `heptacert\backend\alembic\versions\097_ai_digest_jobs.py` — function upgrade: () -> None, function downgrade: () -> None
- `heptacert\backend\alembic\versions\098_event_ticket_types.py` — function upgrade: () -> None, function downgrade: () -> None
- `heptacert\backend\src\accreditation_api.py`
  - class OrgAccreditationIn
  - class OrgAccreditationOut
  - class EventCpdIn
  - class EventCpdOut
  - class CpdBodySummary
  - class CpdRecentLog
  - _...1 more_
- `heptacert\backend\src\accreditation_models.py`
  - class AccreditationBody
  - class OrgAccreditation
  - class EventCpdConfig
  - class MemberCpdLog
- `heptacert\backend\src\ai_content_api.py`
  - class EmailGenerateIn
  - class EmailGenerateOut
  - class FormGenerateIn
  - class FormField
  - class FormGenerateOut
- `heptacert\backend\src\ai_proactive_api.py`
  - class AIDigestJob
  - class AnomalyOut
  - class DigestOut
- `heptacert\backend\src\api_keys_ext_api.py`
  - class ApiKeyUpdateIn
  - class ApiKeyCreateFullIn
  - class ApiKeyOutFull
- `heptacert\backend\src\audience_segments_api.py`
  - function get_segment_attendees: (db, event, segment, *, field_id, answer, location, composition, Any]]) -> list[Attendee]
  - function get_segment_attendees_legacy: (db, event, segment, *, field_id, answer, location) -> list[Attendee]
  - function count_segment_attendees: (db, event, segment, *, field_id, answer, location, composition, Any]]) -> int
  - function count_standard_segments: (db, event) -> dict[str, int]
  - function process_segment_export_jobs_once: (limit) -> dict[str, int]
  - class AudienceSegmentOut
  - _...10 more_
- `heptacert\backend\src\auth_2fa_api.py`
  - class TwoFAStatusOut
  - class BackupCodesOut
  - class TwoFASetupOut
  - class TwoFACodeIn
- `heptacert\backend\src\automation_api.py`
  - function get_db_session: () -> _DbSessionContext
  - function process_automation_dispatches_once: (limit_events) -> dict[str, int]
  - function process_automation_dispatches_once_for_event: (event_id) -> dict[str, int]
  - class AutomationActionIn
  - class AutomationRuleIn
  - class AutomationActionOut
  - _...5 more_
- `heptacert\backend\src\badge_template_seeds.py` — function get_builtin_badge_templates: (lang) -> list[dict[str, Any]]
- `heptacert\backend\src\certificate_templates_api.py`
  - class CertificateTemplatePresetIn
  - class CertificateTemplatePresetOut
  - class TemplateVersionOut
  - class TemplateRegressionSnapshotOut
- `heptacert\backend\src\certificate_template_seeds.py` — function seed_builtin_presets: (db, base_url) -> int
- `heptacert\backend\src\checkin_ops_api.py`
  - function publish_checkin_event: (event_id, payload) -> None
  - function record_checkin_activity: (db, *, event_id, actor_user_id, method, source, success, message, ip_address, entry_point, duplicate, invalid_reason, session_id, attendee_id, ticket_id) -> None
  - class CheckinLookupItem
  - class CheckinMetricsOut
  - class CheckinActivityOut
  - class CheckinNonceOut
  - _...2 more_
- `heptacert\backend\src\community_notifications.py` — function send_public_event_announcement_to_followers: (event_id) -> None
- `heptacert\backend\src\config.py` — class Settings
- `heptacert\backend\src\connections_api.py`
  - class PublicMemberConnection
  - class PublicMemberConnectionRequest
  - class PublicMemberBlocklist
  - class ConnectionMemberOut
  - class ConnectionOut
  - class ConnectionRequestOut
  - _...3 more_
- `heptacert\backend\src\crm_accounts_api.py`
  - class AccountIn
  - class AccountOut
  - class AccountContactIn
  - class AccountContactOut
  - class DealIn
  - class DealOut
  - _...2 more_
- `heptacert\backend\src\crm_accounts_models.py`
  - class CrmAccount
  - class CrmAccountContact
  - class CrmDeal
  - class CrmDealActivity
- `heptacert\backend\src\crm_sequences_api.py`
  - function process_due_sequence_steps: (db_factory, *, organization_id) -> dict[str, int]
  - class CrmEmailSequence
  - class CrmSequenceStep
  - class CrmSequenceEnrollment
  - class SequenceStepIn
  - class SequenceIn
  - _...5 more_
- `heptacert\backend\src\crm_snapshot_hooks.py`
  - function refresh_crm_snapshot_for_event_email: (db, *, event_id, email) -> ParticipantCrmSnapshot | None
  - function refresh_crm_snapshot_for_attendee: (db, attendee) -> ParticipantCrmSnapshot | None
  - function auto_tag_certified_for_attendee_email: (db, *, org_id, email) -> bool
  - function refresh_crm_snapshots_for_certificate_name: (db, *, event_id, student_name) -> int
- `heptacert\backend\src\db.py` — function get_db: () -> AsyncSession, class Base
- `heptacert\backend\src\document_export_jobs.py`
  - function process_document_export_jobs_once: (limit) -> dict[str, int]
  - class DocumentExportJob
  - class DocumentExportJobIn
  - class DocumentExportJobOut
  - class next_db_session
- `heptacert\backend\src\document_outputs.py`
  - function render_official_document_html: (*, title, body_html, document_no, date_text, left_signer_name, left_signer_title, right_signer_name, right_signer_title, template_path) -> str
  - function render_key_value_table: (rows, Any]]) -> str
  - function render_records_table: (records, Any]], columns) -> str
  - function render_log_document_body: (*, summary, Any] | None, records, Any]] | None, columns, intro) -> str
  - function render_log_document_pdf_bytes: (*, title, summary, Any] | None, records, Any]] | None, columns, intro, document_no, left_signer_name, left_signer_title, right_signer_name, right_signer_title, template_path) -> bytes
- `heptacert\backend\src\document_outputs_api.py` — class OfficialLogDocumentIn
- `heptacert\backend\src\domains.py` — class DomainStatus, class Domain
- `heptacert\backend\src\domains_api.py`
  - class DomainCreateIn
  - class DomainOut
  - class OrganizationDomainOut
  - class OrganizationDomainUpdateIn
- `heptacert\backend\src\email_api.py`
  - function test_smtp_connection: (payload)
  - class SuperadminBulkEmailTestIn
  - class SuperadminSystemDigestTestIn
  - class SuperadminTestEmailOut
- `heptacert\backend\src\email_rendering.py`
  - function certificate_verify_url: (settings, cert_uuid) -> str
  - function linkedin_share_url: (target_url, text) -> str
  - function build_email_template_vars: (*, settings, event, attendee, certificate, cert_uuid, recipient_name, recipient_email, survey_link, unsubscribe_url) -> dict[str, Any]
  - function render_template_string: (source, variables, Any]) -> str
- `heptacert\backend\src\enums.py`
  - class Role
  - class CertStatus
  - class TxType
  - class OrderStatus
  - class AttendeeSource
- `heptacert\backend\src\event_crm_api.py`
  - class ParticipantCrmIn
  - class ParticipantCrmMeta
  - class ParticipantCrmListItem
  - class ParticipantCrmDetail
  - class ParticipantCrmSnapshotOut
  - class ParticipantCrmAuditLogOut
  - _...28 more_
- `heptacert\backend\src\event_extras_api.py`
  - class RegFieldIn
  - class RegFieldsReplaceIn
  - class EventTicketType
  - class TicketTypeIn
  - class TicketTypePatchIn
  - class TicketTypeOut
- `heptacert\backend\src\event_features.py`
  - function normalize_event_type: (raw_value) -> str
  - function normalize_feature_bool: (raw_value, *, default) -> bool
  - function feature_value: (event, field_name) -> bool
  - function is_public_registration_enabled: (event) -> bool
  - function is_certificate_enabled: (event) -> bool
  - function is_checkin_enabled: (event) -> bool
  - _...5 more_
- `heptacert\backend\src\generator.py`
  - function new_certificate_uuid: () -> str
  - function render_certificate_pdf: (template_image_bytes, student_name, verify_url, config, *, public_id, qr_size_px, brand_logo_bytes, certificate_footer) -> bytes
  - function render_certificate_png_watermarked: (template_image_bytes, student_name, verify_url, config, *, public_id, qr_size_px, brand_logo_bytes, certificate_footer) -> bytes
  - class TemplateConfig
- `heptacert\backend\src\i18n.py` — function lang_from_request: (request) -> str, function t: (key, lang, fallback) -> str
- `heptacert\backend\src\lead_forms_api.py`
  - class FormFieldDef
  - class FormIn
  - class FormOut
  - class SubmissionOut
  - class PublicSubmitIn
- `heptacert\backend\src\lead_forms_models.py` — class LeadCaptureForm, class LeadCaptureSubmission
- `heptacert\backend\src\learning_path_api.py`
  - class LearningPathStepIn
  - class LearningPathIn
  - class LearningPathPatch
- `heptacert\backend\src\learning_path_models.py`
  - class LearningPath
  - class LearningPathStep
  - class LearningPathEnrollment
  - class LearningPathStepCompletion
- `heptacert\backend\src\lms_extended_models.py`
  - class CourseGradeItem
  - class CourseGradeSummary
  - class CourseDiscussion
  - class DiscussionReply
  - class Rubric
  - class RubricCriterion
  - _...19 more_
- `heptacert\backend\src\lms_models.py`
  - class TrainingCourse
  - class CourseModule
  - class CourseEnrollment
  - class ModuleProgress
  - class CourseAssignment
  - class AssignmentSubmission
  - _...6 more_
- `heptacert\backend\src\local_bootstrap.py` — function main: () -> None
- `heptacert\backend\src\lti_api.py`
  - class LtiTool
  - class LtiToolIn
  - class LtiToolPatch
- `heptacert\backend\src\main.py`
  - function sanitize_event_description_html: (value) -> Optional[str]
  - function monthly_hosting_units: (asset_size_bytes) -> int
  - function hosting_units: (term, asset_size_bytes) -> int
  - function certificate_to_out: (cert, *, include_locked_pdf) -> CertificateOut
  - function hash_password: (pw) -> str
  - function verify_password: (pw, pw_hash) -> bool
  - _...23 more_
- `heptacert\backend\src\marketplace_api.py`
  - function list_marketplace_categories: ()
  - class MarketplaceEventOut
  - class MarketplaceSettingsIn
  - class CourseMarketplaceSettingsIn
- `heptacert\backend\src\mcp_server.py`
  - function list_events: (ctx, search, limit) -> str
  - function get_event: (ctx, event_id) -> str
  - function get_event_stats: (ctx, event_id) -> str
  - function create_event: (ctx, name, event_date, event_description, event_location, event_type, certificate_enabled, registration_enabled, checkin_enabled, ticketing_enabled, visibility) -> str
  - function update_event: (ctx, event_id, name, event_date, event_description, event_location, event_type, certificate_enabled, registration_enabled, checkin_enabled, ticketing_enabled, raffles_enabled, gamification_enabled, quiz_enabled, cpd_enabled, visibility, registration_closed, registration_quota, registration_quota_enabled) -> str
  - function delete_event: (ctx, event_id, confirm) -> str
  - _...38 more_
- `heptacert\backend\src\member_certificates_api.py`
  - function record_wallet_analytics: (db, *, event_type, public_member_id, certificate_id, request, source, metadata, Any]]) -> None
  - function get_member_certificate_privacy: (db, member_public_id) -> CertificatePrivacyOut
  - function update_member_certificate_privacy: (db, member_public_id, hide_certificates, visibility) -> CertificatePrivacyOut
  - function can_view_member_certificate_wallet: (db, target, viewer) -> bool
  - function list_public_member_certificates: (db, member_id) -> list[dict[str, Any]]
  - class CertificatePrivacyIn
  - _...3 more_
- `heptacert\backend\src\models.py`
  - class User
  - class PublicMember
  - class Event
  - class EventTeamMember
  - class Certificate
  - class TrainingAssignment
  - _...73 more_
- `heptacert\backend\src\moderation.py` — function moderate_public_text: (value) -> str
- `heptacert\backend\src\notification_integrations_api.py`
  - function trigger_notification_integrations: (db, org_id, event_type, context, Any]) -> None
  - function trigger_notification_integrations_for_user: (db, user_id, event_type, context, Any]) -> None
  - class NotificationWebhookChannel
  - class TwilioSmsConfig
  - class WhatsAppBusinessConfig
  - class NotificationIntegrationsIn
  - _...10 more_
- `heptacert\backend\src\oauth_api.py`
  - class OAuthClient
  - class OAuthCode
  - class OAuthRefreshToken
  - class ValidateOut
  - class AuthorizeIn
  - class AuthorizeOut
  - _...4 more_
- `heptacert\backend\src\organization_access_api.py`
  - function effective_organization_permissions: (member) -> list[str]
  - function member_allows: (member, permission) -> bool
  - function organization_id_from_request: (request) -> Optional[int]
  - function organization_owner_has_enterprise_plan: (db, organization) -> bool
  - function ensure_organization_enterprise: (db, organization) -> None
  - function user_can_manage_owner_organization: (db, me, owner_user_id, required_permission) -> bool
  - _...7 more_
- `heptacert\backend\src\org_modules_api.py` — class ModulesIn, class OnboardingIn
- `heptacert\backend\src\org_staff_api.py`
  - class OrgStaff
  - class StaffInviteIn
  - class StaffPatch
  - class StaffAcceptIn
- `heptacert\backend\src\payments.py`
  - function get_provider: (settings) -> Optional[PaymentProvider]
  - class PaymentRequest
  - class PaymentResult
  - class PaymentProvider
  - class IyzicoProvider
  - class PayTRProvider
  - _...1 more_
- `heptacert\backend\src\plan_policy.py`
  - function normalize_plan: (plan_id) -> str
  - function plan_allows: (plan_id, required_plans) -> bool
  - function subscription_is_active_plan: (subscription, required_plans) -> bool
  - function feature_policy_payload: () -> list[dict[str, object]]
  - class FeaturePolicy
- `heptacert\backend\src\product_observability.py` — function install_product_observability: (app, *, slow_ms) -> None
- `heptacert\backend\src\product_telemetry.py` — function sanitize_metadata: (raw, Any]) -> dict[str, Any]
- `heptacert\backend\src\product_telemetry_api.py` — class ProductTelemetryIn
- `heptacert\backend\src\quiz_api.py`
  - class QuizChoiceIn
  - class QuizQuestionIn
  - class QuizIn
  - class QuizPatch
  - class QuizAnswerIn
  - class QuizSubmitIn
  - _...1 more_
- `heptacert\backend\src\quiz_models.py`
  - class Quiz
  - class QuizQuestion
  - class QuizChoice
  - class QuizAttempt
  - class QuizAnswer
- `heptacert\backend\src\report_scheduler_api.py`
  - function list_report_types: ()
  - class ScheduledReportIn
  - class ScheduledReportOut
- `heptacert\backend\src\report_scheduler_models.py` — class ScheduledReport
- `heptacert\backend\src\schemas.py`
  - class TokenOut
  - class LoginIn
  - class RegisterIn
  - class PublicMemberRegisterIn
  - class PublicMemberLoginIn
  - class PublicMemberProfileUpdateIn
  - _...160 more_
- `heptacert\backend\src\services.py`
  - function require_role: (*allowed)
  - function editor_config_to_template_config: (raw) -> "TemplateConfig"
  - function write_audit_log: (db, *, user_id, action, resource_type, resource_id, extra, Any]], ip_address, user_agent) -> None
  - function build_public_participant_status: (db, *, event, attendee) -> PublicParticipantStatusOut
  - function deliver_webhook_task: (user_id, event_type, payload, Any]) -> None
  - function log_webhook_delivery: (webhook_id, event_type, payload, Any], http_status, error_message) -> None
- `heptacert\backend\src\signing.py` — function sign_pdf: (pdf_bytes) -> bytes
- `heptacert\backend\src\social_api.py`
  - class CommunityPostCreateIn
  - class CommunityCommentCreateIn
  - class CommunityPostUpdateIn
  - class CommunityPostEditHistoryOut
- `heptacert\backend\src\sso_api.py`
  - class OrgSsoConfig
  - class SsoConfigIn
  - class SsoConfigPatch
- `heptacert\backend\src\training_api.py`
  - function process_training_renewal_notifications_once: (db, organization_id) -> dict[str, int]
  - class TrainingAssignmentIn
  - class TrainingAssignmentPatch
  - class TrainingAssignmentOut
  - class TrainingReportOut
  - class RenewalRecommendationOut
  - _...10 more_
- `heptacert\backend\src\utils.py`
  - function compute_hosting_ends: (term) -> datetime
  - function ensure_utc: (dt) -> Optional[datetime]
  - function build_attendee_verify_url: (*, event_id, token) -> str
  - function create_access_token: (*, user_id, role) -> str
  - function create_public_member_access_token: (*, member_id) -> str
  - function create_partial_token: (*, user_id) -> str
  - _...6 more_
- `heptacert\backend\src\venues_api.py`
  - class OrganizationVenue
  - class VenueIn
  - class VenueOut
- `heptacert\backend\src\venue_reservations_api.py`
  - class VenueReservation
  - class ReservationIn
  - class ReservationOut
- `heptacert\backend\src\watermark.py`
  - function embed_watermark: (img, payload) -> Image.Image
  - function extract_watermark: (image_bytes) -> str | None
  - function to_watermarked_png_bytes: (img, payload) -> bytes
- `heptacert\backend\src\webhooks.py`
  - function generate_webhook_secret: () -> str
  - function sign_payload: (secret, body) -> str
  - function deliver_webhook: (db, user_id, event_type, payload, Any]) -> None
  - class WebhookEvent
- `heptacert\backend\_archive_lms\lms_api.py`
  - class CourseModuleIn
  - class CourseIn
  - class CoursePatch
  - class CourseModulePatch
  - class EnrollmentImportStudent
  - class EnrollmentImportIn
  - _...10 more_
- `heptacert\backend\_archive_lms\lms_extended_api.py`
  - class GradeItemIn
  - class GradeItemPatch
  - class GradeSummaryIn
  - class DiscussionIn
  - class ReplyIn
  - class RubricIn
  - _...24 more_
- `heptacert\cli\heptacert_cli\client.py` — class HeptaCertClient
- `heptacert\cli\heptacert_cli\commands\auth.py` — function logout: (), function status: ()
- `heptacert\cli\heptacert_cli\commands\config.py` — function show_config: (), function config_path: ()
- `heptacert\cli\heptacert_cli\config.py`
  - function get_api_key: () -> Optional[str]
  - function get_api_base: () -> str
  - function set_credentials: (api_key, api_base) -> None
  - function clear_credentials: () -> None
  - function require_api_key: () -> str
- `heptacert\cli\heptacert_cli\main.py` — function ping: ()
- `heptacert\cli\heptacert_cli\output.py`
  - function print_json: (data) -> None
  - function print_csv: (rows, columns) -> None
  - function print_table: (rows, columns, title) -> None
  - function ok: (msg) -> None
  - function warn: (msg) -> None
  - function error: (msg) -> None
  - _...1 more_
- `heptacert\frontend\src\hooks\useTheme.ts` — function useTheme: () => void
- `heptacert\frontend\src\hooks\useToast.ts` — function useToast: () => void
- `heptacert\frontend\src\lib\api-with-toast.ts` — function useApiWithToast: () => void
- `heptacert\frontend\src\lib\api.ts`
  - function getApiBase: () => string
  - function getApiOrigin: () => string
  - function apiUrl: (path) => string
  - function normalizeApiAssetUrl: (value?) => string | null
  - function getToken: () => string | null
  - function setToken: (token) => void
  - _...485 more_
- `heptacert\frontend\src\lib\assistant\eventDraft.ts`
  - function createInitialDraft: () => EventDraft
  - function normalizeEventDate: (value) => string
  - function parseTurkishMonthDate: (value) => string
  - function extractDateRange: (text) => void
  - function extractLocation: (text) => string
  - function normalizeEventType: (value) => string
  - _...23 more_
- `heptacert\frontend\src\lib\assistant\faq.ts` — function findFaqAnswer: (question, lang) => string | null
- `heptacert\frontend\src\lib\assistant\intent.ts`
  - function shouldStartCreateEventWizard: (text) => boolean
  - function detectIntent: (text, wizardActive) => IntentResult
  - type Intent
  - type IntentResult
- `heptacert\frontend\src\lib\assistant\text.ts`
  - function normalizePromptText: (value) => string
  - function compactText: (value) => string
  - function tokenize: (value) => string[]
  - function levenshteinDistance: (a, b) => number
  - function fuzzyIncludes: (text, target, maxDistance) => boolean
  - function fuzzyAny: (text, keywords) => boolean
  - _...3 more_
- `heptacert\frontend\src\lib\assistant\wizard.ts`
  - function isWizardActive: (step) => boolean
  - function getWizardQuestion: (step, draft, lang) => string
  - function buildReviewMessage: (draft, lang) => string
- `heptacert\frontend\src\lib\assistant\__debug__\assistantHeuristics.debug.ts` — function runAssistantHeuristicDebug: () => void
- `heptacert\frontend\src\lib\featureMetadata.ts`
  - function getFeatureMetadata: (key) => void
  - type FeatureKey
  - const FEATURE_METADATA: Record<FeatureKey, { requiredPlans: string[]; title: { tr: string; en: string }; enterpriseOnlyForStaff?: boolean }>
- `heptacert\frontend\src\lib\orgRoles.ts`
  - function orgRoleLabel: (role, lang) => string
  - function canManageEvents: (ctx) => boolean
  - function landingPathForContexts: (contexts) => string
  - type OrgLang
  - type OrgRoleContext
- `heptacert\frontend\src\lib\raffles.ts`
  - function formatRaffleDate: (value?) => void
  - function getRaffleStatusMeta: (status) => void
  - function formatWinnerPlan: (winnerCount, reserveWinnerCount) => void
  - function splitRaffleRounds: (raffle) => RaffleRound[]
  - type RaffleRound
- `heptacert\frontend\src\lib\richText.ts` — function stripRichTextToPlainText: (html) => string
- `heptacert\frontend\src\lib\theme.ts`
  - function getStoredTheme: () => Theme | null
  - function setStoredTheme: (theme) => void
  - function getSystemTheme: () => 'light' | 'dark'
  - function getEffectiveTheme: (theme) => 'light' | 'dark'
  - function applyTheme: (theme) => void
  - function initializeTheme: () => Theme
  - _...2 more_
- `heptacert\frontend\src\lib\url.ts` — function normalizeExternalUrl: (raw) => string | null
- `heptacert\frontend\src\lib\whiteLabel.ts`
  - function isWhiteLabelBranding: (branding, host?) => void
  - function fetchCurrentBranding: () => Promise<PublicBranding | null>
  - type PublicBranding
  - const PRIMARY_APP_HOSTS
- `heptacert\frontend\src\middleware.ts` — function middleware: (request) => void
- `heptacert\loadtest\k6-public-mixed.js` — function setup: () => void, const options
- `test_all_endpoints.py`
  - function log_test: (name, passed, message)
  - function test_health: ()
  - function test_badge_rules_endpoints: ()
  - function test_participant_badges_endpoints: ()
  - function test_certificate_tier_endpoints: ()
  - function test_survey_endpoints: ()
  - _...3 more_

---

# Config

## Environment Variables

- `ACTIVE_PAYMENT_PROVIDER` (has default) — heptacert\.env.local
- `ALEMBIC_DATABASE_URL` (has default) — heptacert\backend\.env.example
- `ALLOW_QA_SEED` **required** — heptacert\backend\src\qa_seed_api.py
- `APPLE_WALLET_CERT_PATH` **required** — heptacert\backend\.env.example
- `APPLE_WALLET_KEY_PASSWORD` **required** — heptacert\backend\.env.example
- `APPLE_WALLET_KEY_PATH` **required** — heptacert\backend\.env.example
- `APPLE_WALLET_PASS_TYPE_ID` **required** — heptacert\backend\.env.example
- `APPLE_WALLET_TEAM_ID` **required** — heptacert\backend\.env.example
- `APPLE_WALLET_WWDR_CERT_PATH` **required** — heptacert\backend\.env.example
- `BACKEND_PORT` (has default) — heptacert\.env.local
- `BOOTSTRAP_SUPERADMIN_EMAIL` (has default) — heptacert\backend\.env.example
- `BOOTSTRAP_SUPERADMIN_PASSWORD` (has default) — heptacert\backend\.env.example
- `CLAMAV_ENABLED` (has default) — heptacert\.env.example
- `CLAMAV_HOST` (has default) — heptacert\.env.example
- `CLAMAV_PORT` (has default) — heptacert\.env.example
- `CORS_ORIGINS` (has default) — heptacert\backend\.env.example
- `DATABASE_URL` (has default) — heptacert\backend\.env.example
- `DB_POOL_MAX_OVERFLOW` (has default) — heptacert\.env.local
- `DB_POOL_RECYCLE` (has default) — heptacert\.env.local
- `DB_POOL_SIZE` (has default) — heptacert\.env.local
- `DB_POOL_TIMEOUT` (has default) — heptacert\.env.local
- `EMAIL_TOKEN_SECRET` (has default) — heptacert\backend\.env.example
- `ENABLE_SCHEDULER` (has default) — heptacert\.env.local
- `FRONTEND_BASE_URL` (has default) — heptacert\backend\.env.example
- `FRONTEND_PORT` (has default) — heptacert\.env.local
- `GOOGLE_OAUTH_CLIENT_ID` **required** — heptacert\backend\.env.example
- `GOOGLE_OAUTH_CLIENT_SECRET` **required** — heptacert\backend\.env.example
- `HEPTACERT_API_BASE` **required** — heptacert\backend\src\mcp_server.py
- `HEPTACERT_API_KEY` **required** — heptacert\backend\src\mcp_server.py
- `HEPTACERT_BACKUP_DIR` (has default) — heptacert\.env.example
- `HEPTACERT_STORAGE_DIR` (has default) — heptacert\.env.example
- `HEPTACERT_UNIT_ONLY` **required** — heptacert\backend\tests\conftest.py
- `INTERNAL_API_BASE` **required** — heptacert\frontend\src\app\layout.tsx
- `IYZICO_API_KEY` **required** — heptacert\backend\.env.example
- `IYZICO_BASE_URL` (has default) — heptacert\backend\.env.example
- `IYZICO_SECRET_KEY` **required** — heptacert\backend\.env.example
- `JWT_EXPIRES_MINUTES` (has default) — heptacert\.env.local
- `JWT_SECRET` (has default) — heptacert\backend\.env.example
- `LANG_CODE` **required** — heptacert\backend\src\badge_template_seeds.py
- `LOCAL_STORAGE_DIR` (has default) — heptacert\backend\.env.example
- `MS365_OAUTH_CLIENT_ID` **required** — heptacert\backend\.env.example
- `MS365_OAUTH_CLIENT_SECRET` **required** — heptacert\backend\.env.example
- `NEXT_PHASE` **required** — heptacert\frontend\src\lib\api.ts
- `NEXT_PUBLIC_API_BASE` (has default) — heptacert\frontend\.env.example
- `NEXT_PUBLIC_FRONTEND_BASE_URL` **required** — heptacert\frontend\src\app\layout.tsx
- `NEXT_SERVER_API_BASE` **required** — heptacert\frontend\src\app\layout.tsx
- `NODE_ENV` **required** — heptacert\frontend\src\app\_client-shell.tsx
- `OPENAI_API_KEY` **required** — heptacert\backend\.env.example
- `OPENAI_MODEL` (has default) — heptacert\backend\.env.example
- `PAYMENT_ENABLED` (has default) — heptacert\.env.local
- `PAYTR_MERCHANT_ID` **required** — heptacert\.env.local
- `PAYTR_MERCHANT_KEY` **required** — heptacert\.env.local
- `PAYTR_MERCHANT_SALT` **required** — heptacert\.env.local
- `POSTGRES_DATA_DIR` (has default) — heptacert\.env.example
- `POSTGRES_DB` (has default) — heptacert\.env.local
- `POSTGRES_PASSWORD` (has default) — heptacert\.env.local
- `POSTGRES_USER` (has default) — heptacert\.env.local
- `PUBLIC_BASE_URL` (has default) — heptacert\backend\.env.example
- `RATE_LIMIT_STORAGE_URI` (has default) — heptacert\backend\.env.example
- `REDIS_URL` (has default) — heptacert\backend\.env.example
- `SMTP_FROM` (has default) — heptacert\backend\.env.example
- `SMTP_HOST` **required** — heptacert\backend\.env.example
- `SMTP_PASSWORD` **required** — heptacert\backend\.env.example
- `SMTP_PORT` (has default) — heptacert\backend\.env.example
- `SMTP_USER` **required** — heptacert\backend\.env.example
- `STORAGE_MODE` (has default) — heptacert\backend\.env.example
- `STRIPE_PUBLISHABLE_KEY` **required** — heptacert\backend\.env.example
- `STRIPE_SECRET_KEY` **required** — heptacert\backend\.env.example
- `STRIPE_WEBHOOK_SECRET` **required** — heptacert\backend\.env.example
- `TRUSTED_PROXY_NETWORKS` **required** — heptacert\backend\.env.example

## Config Files

- `heptacert\.env.example`
- `heptacert\backend\.env.example`
- `heptacert\docs\next.config.js`
- `heptacert\frontend\.env.example`
- `heptacert\frontend\next.config.mjs`
- `heptacert\frontend\tailwind.config.ts`

---

# Middleware

## custom
- 019_reg_answers_guard — `heptacert\backend\alembic\versions\019_reg_answers_guard.py`
- bulk_generate_api — `heptacert\backend\src\bulk_generate_api.py`

## rate-limit
- 073_api_key_rate_limit — `heptacert\backend\alembic\versions\073_api_key_rate_limit.py`

## auth
- auth_2fa_api — `heptacert\backend\src\auth_2fa_api.py`
- ratelimit — `heptacert\backend\src\ratelimit.py`
- auth — `heptacert\cli\heptacert_cli\commands\auth.py`
- middleware — `heptacert\frontend\src\middleware.ts`

---

# Dependency Graph

## Most Imported Files (change these carefully)

- `/main.py` — imported by **64** files
- `/organization_access_api.py` — imported by **14** files
- `//output.py` — imported by **11** files
- `//client.py` — imported by **10** files
- `/db_types.py` — imported by **7** files
- `/config.py` — imported by **7** files
- `/enums.py` — imported by **5** files
- `/generator.py` — imported by **4** files
- `/db.py` — imported by **4** files
- `/event_team.py` — imported by **3** files
- `/lms_models.py` — imported by **3** files
- `heptacert\frontend\src\lib\assistant\text.ts` — imported by **3** files
- `/email_rendering.py` — imported by **2** files
- `/crm_accounts_models.py` — imported by **2** files
- `/document_outputs.py` — imported by **2** files
- `/learning_path_models.py` — imported by **2** files
- `/quiz_models.py` — imported by **2** files
- `/moderation.py` — imported by **2** files
- `/event_features.py` — imported by **2** files
- `/services.py` — imported by **2** files

## Import Map (who imports what)

- `/main.py` ← `heptacert\backend\src\accreditation_api.py`, `heptacert\backend\src\accreditation_models.py`, `heptacert\backend\src\ai_content_api.py`, `heptacert\backend\src\ai_proactive_api.py`, `heptacert\backend\src\analytics_api.py` +59 more
- `/organization_access_api.py` ← `heptacert\backend\src\accreditation_api.py`, `heptacert\backend\src\checkin_ops_api.py`, `heptacert\backend\src\crm_accounts_api.py`, `heptacert\backend\src\crm_sequences_api.py`, `heptacert\backend\src\event_crm_api.py` +9 more
- `//output.py` ← `heptacert\cli\heptacert_cli\commands\attendees.py`, `heptacert\cli\heptacert_cli\commands\auth.py`, `heptacert\cli\heptacert_cli\commands\automations.py`, `heptacert\cli\heptacert_cli\commands\certs.py`, `heptacert\cli\heptacert_cli\commands\checkin.py` +6 more
- `//client.py` ← `heptacert\cli\heptacert_cli\commands\attendees.py`, `heptacert\cli\heptacert_cli\commands\auth.py`, `heptacert\cli\heptacert_cli\commands\automations.py`, `heptacert\cli\heptacert_cli\commands\certs.py`, `heptacert\cli\heptacert_cli\commands\checkin.py` +5 more
- `/db_types.py` ← `heptacert\backend\src\accreditation_models.py`, `heptacert\backend\src\crm_accounts_models.py`, `heptacert\backend\src\lead_forms_models.py`, `heptacert\backend\src\models.py`, `heptacert\backend\src\oauth_api.py` +2 more
- `/config.py` ← `heptacert\backend\src\db.py`, `heptacert\backend\src\main.py`, `heptacert\backend\src\ratelimit.py`, `heptacert\backend\src\services.py`, `heptacert\backend\src\utils.py` +2 more
- `/enums.py` ← `heptacert\backend\src\main.py`, `heptacert\backend\src\models.py`, `heptacert\backend\src\schemas.py`, `heptacert\backend\src\services.py`, `heptacert\backend\src\utils.py`
- `/generator.py` ← `heptacert\backend\src\main.py`, `heptacert\backend\src\quiz_api.py`, `heptacert\backend\src\services.py`, `heptacert\backend\_archive_lms\lms_api.py`
- `/db.py` ← `heptacert\backend\src\main.py`, `heptacert\backend\src\models.py`, `heptacert\backend\src\ratelimit.py`, `heptacert\backend\src\services.py`
- `/event_team.py` ← `heptacert\backend\src\main.py`, `heptacert\backend\src\schemas.py`, `heptacert\backend\src\services.py`

---

# Test Coverage

> **14%** of routes and models are covered by tests
> 25 test files found

## Covered Routes

- GET:/api/admin/events/{event_id}/analytics/engagement
- GET:/api/admin/events/{event_id}/checkin-metrics
- GET:/api/public/organizations
- POST:
- GET:
- POST:/api/domains
- GET:/api/admin/organization/domain
- PUT:/api/admin/organization/domain
- GET:/.internal/caddy/authorize
- GET:/api/admin/email-config
- PATCH:/api/admin/email-config
- POST:/api/admin/email-config/test-connection
- GET:/api/admin/crm/summary
- GET:/api/admin/crm/views
- POST:/api/admin/crm/views
- GET:/api/admin/crm/integrations/hubspot
- PATCH:/api/admin/crm/integrations/hubspot
- DELETE:/api/admin/crm/integrations/hubspot
- GET:/api/admin/crm/integrations/salesforce
- PATCH:/api/admin/crm/integrations/salesforce
- DELETE:/api/admin/crm/integrations/salesforce
- GET:/api/admin/crm/integrations/mailchimp
- PATCH:/api/admin/crm/integrations/mailchimp
- DELETE:/api/admin/crm/integrations/mailchimp
- GET:/api/events/{event_id}/capacities
- POST:/api/admin/events/{event_id}/badge-rules
- GET:/api/admin/events/{event_id}/badge-rules
- GET:/api/events/{event_id}/survey-access
- POST:/api/surveys/{event_id}/submit
- GET:/api/health
- POST:/api/auth/login
- POST:/api/auth/register
- POST:/api/public/auth/register
- POST:/api/public/auth/login
- POST:/api/public/auth/forgot-password
- POST:/api/public/auth/reset-password
- POST:/api/auth/forgot-password
- POST:/api/auth/reset-password
- POST:/api/admin/events/{event_id}/apply-cert-template
- GET:/api/superadmin/admins
- POST:/api/superadmin/admins
- GET:/api/pricing/config
- GET:/api/stats
- GET:/api/billing/status
- GET:/api/me
- GET:/api/public/me
- PATCH:/api/public/me
- POST:/api/public/me/avatar
- GET:/api/public/members/{member_public_id}
- PATCH:/api/public/me/password
- DELETE:/api/public/me
- DELETE:/api/me
- GET:/api/admin/events
- POST:/api/admin/events
- GET:/api/admin/events/{event_id}
- PATCH:/api/admin/events/{event_id}
- DELETE:/api/admin/events/{event_id}
- PUT:/api/admin/events/{event_id}/config
- GET:/api/branding
- GET:/api/admin/organization/settings
- PATCH:/api/admin/organization/settings
- GET:/api/superadmin/subscriptions
- POST:/api/superadmin/subscriptions/grant
- GET:/api/public/events
- GET:/api/events/{event_id}/info
- POST:/api/legal/document-events
- POST:/api/events/{event_id}/register
- GET:/api/events/{event_id}/verify-email
- POST:/api/admin/support-tickets
- GET:/api/admin/events/{event_id}/attendees
- POST:/api/admin/events/{event_id}/attendees
- GET:/api/admin/events/{event_id}/attendance
- POST:/api/superadmin/organizations/{org_id}/domain/approve
- POST:/api/superadmin/organizations/{org_id}/domain/revoke
- GET:/api/admin/organization/contexts
- GET:/api/admin/organization/team
- POST:/api/admin/organization/team
- GET:/api/admin/analytics/org/cert-timeline
- GET:/api/public/feed
- POST:/api/public/feed
- GET:/api/admin/community/posts
- POST:/api/admin/community/posts
- DELETE:/api/admin/community/posts/{post_public_id}
- POST:/api/admin/events/{event_id}/survey-config
- GET:/api/admin/events/{event_id}/survey-config
- POST:/api/admin/events/{event_id}/tickets/check-in
- PATCH:/api/admin/events/{event_id}/tickets/{ticket_id}/status
- GET:/api/admin/organization/venues
- POST:/api/admin/organization/venues
- PATCH:/api/admin/organization/venues/{venue_id}
- DELETE:/api/admin/organization/venues/{venue_id}
- GET:/api/admin/organization/venue-reservations
- POST:/api/admin/organization/venue-reservations
- GET:/api/admin/organization/venue-reservations/calendar.ics

## Covered Models

- Domain
- Badge
- User
- PublicMember
- Event
- Certificate
- TrainingAssignment
- OrganizationDepartment
- Order
- Subscription
- ApiKey
- AuditLog
- WebhookEndpoint
- WebhookDelivery
- Organization
- OrganizationFollower
- CommunityPost
- CommunityPostLike
- CommunityPostComment
- SupportTicket
- UserEmailConfig
- CertificateTemplate
- EventSession
- Attendee
- EventTicket
- EventComment
- OrganizationMember

---

_Generated by [codesight](https://github.com/Houseofmvps/codesight) — see your codebase clearly_