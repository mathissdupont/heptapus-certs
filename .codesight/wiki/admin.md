# Admin

> **Navigation aid.** Route list and file locations extracted via AST. Read the source files listed below before implementing or modifying this subsystem.

The Admin subsystem handles **441 routes** and touches: auth, db, ai, queue, payment, cache, email.

## Routes

- `GET` `/api/admin/accreditation/bodies` → out: CpdSummaryOut [auth, db]
  `heptacert\backend\src\accreditation_api.py`
- `GET` `/api/admin/accreditation` → out: CpdSummaryOut [auth, db]
  `heptacert\backend\src\accreditation_api.py`
- `POST` `/api/admin/accreditation` → out: CpdSummaryOut [auth, db]
  `heptacert\backend\src\accreditation_api.py`
- `PATCH` `/api/admin/accreditation/{accred_id}` params(accred_id) → out: CpdSummaryOut [auth, db]
  `heptacert\backend\src\accreditation_api.py`
- `DELETE` `/api/admin/accreditation/{accred_id}` params(accred_id) → out: CpdSummaryOut [auth, db]
  `heptacert\backend\src\accreditation_api.py`
- `GET` `/api/admin/events/{event_id}/cpd` params(event_id) → out: CpdSummaryOut [auth, db]
  `heptacert\backend\src\accreditation_api.py`
- `PUT` `/api/admin/events/{event_id}/cpd` params(event_id) → out: CpdSummaryOut [auth, db]
  `heptacert\backend\src\accreditation_api.py`
- `DELETE` `/api/admin/events/{event_id}/cpd` params(event_id) → out: CpdSummaryOut [auth, db]
  `heptacert\backend\src\accreditation_api.py`
- `GET` `/api/admin/members/{member_id}/cpd` params(member_id) → out: CpdSummaryOut [auth, db]
  `heptacert\backend\src\accreditation_api.py`
- `GET` `/api/admin/accreditation/cpd-summary` → out: CpdSummaryOut [auth, db]
  `heptacert\backend\src\accreditation_api.py`
- `POST` `/api/admin/ai/generate-email` → out: EmailGenerateOut [auth, db, ai]
  `heptacert\backend\src\ai_content_api.py`
- `POST` `/api/admin/ai/generate-form` → out: EmailGenerateOut [auth, db, ai]
  `heptacert\backend\src\ai_content_api.py`
- `GET` `/api/admin/ai/anomalies/{event_id}` params(event_id) → out: AnomalyOut [auth, db, ai]
  `heptacert\backend\src\ai_proactive_api.py`
- `POST` `/api/admin/ai/digest/trigger` → out: AnomalyOut [auth, db, ai]
  `heptacert\backend\src\ai_proactive_api.py`
- `GET` `/api/admin/ai/digest/latest` → out: AnomalyOut [auth, db, ai]
  `heptacert\backend\src\ai_proactive_api.py`
- `POST` `/api/admin/superadmin/ai/digest/run-weekly` → out: AnomalyOut [auth, db, ai]
  `heptacert\backend\src\ai_proactive_api.py`
- `GET` `/api/admin/events/{event_id}/analytics` params(event_id) [auth, db]
  `heptacert\backend\src\analytics_api.py`
- `GET` `/api/admin/events/{event_id}/analytics/engagement` params(event_id) [auth, db]
  `heptacert\backend\src\analytics_api.py`
- `GET` `/api/admin/events/{event_id}/analytics/badges` params(event_id) [auth, db]
  `heptacert\backend\src\analytics_api.py`
- `GET` `/api/admin/events/{event_id}/analytics/tiers` params(event_id) [auth, db]
  `heptacert\backend\src\analytics_api.py`
- `GET` `/api/admin/events/{event_id}/analytics/timeline` params(event_id) [auth, db]
  `heptacert\backend\src\analytics_api.py`
- `GET` `/api/admin/events/{event_id}/analytics/export.csv` params(event_id) [auth, db]
  `heptacert\backend\src\analytics_api.py`
- `GET` `/api/admin/events/{event_id}/analytics/export.xlsx` params(event_id) [auth, db]
  `heptacert\backend\src\analytics_api.py`
- `GET` `/api/admin/api-keys/scopes` → in: CurrentUse, out: list [auth, db]
  `heptacert\backend\src\api_keys_ext_api.py`
- `GET` `/api/admin/api-keys/v2` → in: CurrentUse, out: list [auth, db]
  `heptacert\backend\src\api_keys_ext_api.py`
- `POST` `/api/admin/api-keys/v2` → out: list [auth, db]
  `heptacert\backend\src\api_keys_ext_api.py`
- `PATCH` `/api/admin/api-keys/{key_id}/scopes` params(key_id) → out: list [auth, db]
  `heptacert\backend\src\api_keys_ext_api.py`
- `GET` `/api/admin/events/{event_id}/segments` params(event_id) → out: list [auth, db, upload]
  `heptacert\backend\src\audience_segments_api.py`
- `GET` `/api/admin/events/{event_id}/segments/saved/list` params(event_id) → out: list [auth, db, upload]
  `heptacert\backend\src\audience_segments_api.py`
- `POST` `/api/admin/events/{event_id}/segments/saved` params(event_id) → out: list [auth, db, upload]
  `heptacert\backend\src\audience_segments_api.py`
- `DELETE` `/api/admin/events/{event_id}/segments/saved/{segment_id}` params(event_id, segment_id) → out: list [auth, db, upload]
  `heptacert\backend\src\audience_segments_api.py`
- `POST` `/api/admin/events/{event_id}/segments/export-jobs` params(event_id) → out: list [auth, db, upload]
  `heptacert\backend\src\audience_segments_api.py`
- `GET` `/api/admin/events/{event_id}/segments/export-jobs` params(event_id) → out: list [auth, db, upload]
  `heptacert\backend\src\audience_segments_api.py`
- `GET` `/api/admin/events/{event_id}/segments/export-jobs/{job_id}/download` params(event_id, job_id) → out: list [auth, db, upload]
  `heptacert\backend\src\audience_segments_api.py`
- `POST` `/api/admin/events/{event_id}/segments/{segment_key}/handoff/crm` params(event_id, segment_key) → out: list [auth, db, upload]
  `heptacert\backend\src\audience_segments_api.py`
- `POST` `/api/admin/events/{event_id}/segments/{segment_key}/handoff/automation` params(event_id, segment_key) → out: list [auth, db, upload]
  `heptacert\backend\src\audience_segments_api.py`
- `GET` `/api/admin/events/{event_id}/segments/{segment_key}` params(event_id, segment_key) → out: list [auth, db, upload]
  `heptacert\backend\src\audience_segments_api.py`
- `GET` `/api/admin/events/{event_id}/segments/{segment_key}/export` params(event_id, segment_key) → out: list [auth, db, upload]
  `heptacert\backend\src\audience_segments_api.py`
- `POST` `/api/admin/events/{event_id}/segments/{segment_key}/export-to-excel` params(event_id, segment_key) → out: list [auth, db, upload]
  `heptacert\backend\src\audience_segments_api.py`
- `GET` `/api/admin/events/{event_id}/automations` params(event_id) → out: AutomationSummaryOut [auth, db, queue, payment]
  `heptacert\backend\src\automation_api.py`
- `POST` `/api/admin/events/{event_id}/automations` params(event_id) → out: AutomationSummaryOut [auth, db, queue, payment]
  `heptacert\backend\src\automation_api.py`
- `PATCH` `/api/admin/events/{event_id}/automations/{rule_id}` params(event_id, rule_id) → out: AutomationSummaryOut [auth, db, queue, payment]
  `heptacert\backend\src\automation_api.py`
- `DELETE` `/api/admin/events/{event_id}/automations/{rule_id}` params(event_id, rule_id) → out: AutomationSummaryOut [auth, db, queue, payment]
  `heptacert\backend\src\automation_api.py`
- `POST` `/api/admin/events/{event_id}/automations/dispatch-now` params(event_id) → out: AutomationSummaryOut [auth, db, queue, payment]
  `heptacert\backend\src\automation_api.py`
- `GET` `/api/admin/events/{event_id}/automations/{rule_id}/dry-run` params(event_id, rule_id) → out: AutomationSummaryOut [auth, db, queue, payment]
  `heptacert\backend\src\automation_api.py`
- `GET` `/api/admin/events/{event_id}/automations/logs` params(event_id) → out: AutomationSummaryOut [auth, db, queue, payment]
  `heptacert\backend\src\automation_api.py`
- `POST` `/api/admin/events/{event_id}/bulk-generate` params(event_id) → out: BulkCertificateJobOut [auth, db, upload]
  `heptacert\backend\src\bulk_generate_api.py`
- `GET` `/api/admin/events/{event_id}/bulk-generate-jobs` params(event_id) → out: BulkCertificateJobOut [auth, db, upload]
  `heptacert\backend\src\bulk_generate_api.py`
- `GET` `/api/admin/events/{event_id}/bulk-generate-jobs/{job_id}` params(event_id, job_id) → out: BulkCertificateJobOut [auth, db, upload]
  `heptacert\backend\src\bulk_generate_api.py`
- `POST` `/api/admin/events/{event_id}/bulk-generate-jobs/{job_id}/cancel` params(event_id, job_id) → out: BulkCertificateJobOut [auth, db, upload]
  `heptacert\backend\src\bulk_generate_api.py`
- `GET` `/api/admin/events/{event_id}/bulk-generate-jobs/{job_id}/download` params(event_id, job_id) → out: BulkCertificateJobOut [auth, db, upload]
  `heptacert\backend\src\bulk_generate_api.py`
- `GET` `/api/admin/certificate-template-presets` → out: list [auth, db]
  `heptacert\backend\src\certificate_templates_api.py`
- `POST` `/api/admin/events/{event_id}/certificate-template-presets` params(event_id) → out: list [auth, db]
  `heptacert\backend\src\certificate_templates_api.py`
- `POST` `/api/admin/events/{event_id}/certificate-template-presets/{preset_id}/apply` params(event_id, preset_id) → out: list [auth, db]
  `heptacert\backend\src\certificate_templates_api.py`
- `GET` `/api/admin/certificate-template-presets/{preset_id}/versions` params(preset_id) → out: list [auth, db]
  `heptacert\backend\src\certificate_templates_api.py`
- `POST` `/api/admin/certificate-template-presets/{preset_id}/rollback/{version}` params(preset_id, version) → out: list [auth, db]
  `heptacert\backend\src\certificate_templates_api.py`
- `GET` `/api/admin/certificate-template-presets/{preset_id}/snapshots` params(preset_id) → out: list [auth, db]
  `heptacert\backend\src\certificate_templates_api.py`
- `GET` `/api/admin/certificate-template-presets/builtin` → out: list [auth, db]
  `heptacert\backend\src\certificate_templates_api.py`
- `DELETE` `/api/admin/certificate-template-presets/{preset_id}` params(preset_id) → out: list [auth, db]
  `heptacert\backend\src\certificate_templates_api.py`
- `POST` `/api/admin/events/{event_id}/certificate-tiers` params(event_id) → out: CertificateTierRulesOut [auth, db, upload]
  `heptacert\backend\src\certificate_tiers_api.py`
- `GET` `/api/admin/events/{event_id}/certificate-tiers` params(event_id) → out: CertificateTierRulesOut [auth, db, upload]
  `heptacert\backend\src\certificate_tiers_api.py`
- `POST` `/api/admin/events/{event_id}/checkin-nonce` params(event_id) → out: CheckinNonceOut [auth, db, cache, queue]
  `heptacert\backend\src\checkin_ops_api.py`
- `POST` `/api/admin/events/{event_id}/kiosk-sessions` params(event_id) → out: CheckinNonceOut [auth, db, cache, queue]
  `heptacert\backend\src\checkin_ops_api.py`
- `GET` `/api/admin/events/{event_id}/kiosk-sessions` params(event_id) → out: CheckinNonceOut [auth, db, cache, queue]
  `heptacert\backend\src\checkin_ops_api.py`
- `POST` `/api/admin/events/{event_id}/kiosk-sessions/{kiosk_id}/revoke` params(event_id, kiosk_id) → out: CheckinNonceOut [auth, db, cache, queue]
  `heptacert\backend\src\checkin_ops_api.py`
- `GET` `/api/admin/events/{event_id}/checkin-lookup` params(event_id) → out: CheckinNonceOut [auth, db, cache, queue]
  `heptacert\backend\src\checkin_ops_api.py`
- `GET` `/api/admin/events/{event_id}/checkin-metrics` params(event_id) → out: CheckinNonceOut [auth, db, cache, queue]
  `heptacert\backend\src\checkin_ops_api.py`
- `GET` `/api/admin/events/{event_id}/checkin-activity` params(event_id) → out: CheckinNonceOut [auth, db, cache, queue]
  `heptacert\backend\src\checkin_ops_api.py`
- `GET` `/api/admin/events/{event_id}/checkin/stream` params(event_id) → out: CheckinNonceOut [auth, db, cache, queue]
  `heptacert\backend\src\checkin_ops_api.py`
- `GET` `/api/admin/crm/accounts` → out: list [auth, db]
  `heptacert\backend\src\crm_accounts_api.py`
- `POST` `/api/admin/crm/accounts` → out: list [auth, db]
  `heptacert\backend\src\crm_accounts_api.py`
- `GET` `/api/admin/crm/accounts/{account_id}` params(account_id) → out: list [auth, db]
  `heptacert\backend\src\crm_accounts_api.py`
- `PATCH` `/api/admin/crm/accounts/{account_id}` params(account_id) → out: list [auth, db]
  `heptacert\backend\src\crm_accounts_api.py`
- `DELETE` `/api/admin/crm/accounts/{account_id}` params(account_id) → out: list [auth, db]
  `heptacert\backend\src\crm_accounts_api.py`
- `GET` `/api/admin/crm/accounts/{account_id}/contacts` params(account_id) → out: list [auth, db]
  `heptacert\backend\src\crm_accounts_api.py`
- `POST` `/api/admin/crm/accounts/{account_id}/contacts` params(account_id) → out: list [auth, db]
  `heptacert\backend\src\crm_accounts_api.py`
- `DELETE` `/api/admin/crm/accounts/{account_id}/contacts/{contact_id}` params(account_id, contact_id) → out: list [auth, db]
  `heptacert\backend\src\crm_accounts_api.py`
- `GET` `/api/admin/crm/accounts/{account_id}/deals` params(account_id) → out: list [auth, db]
  `heptacert\backend\src\crm_accounts_api.py`
- `GET` `/api/admin/crm/pipeline` → out: list [auth, db]
  `heptacert\backend\src\crm_accounts_api.py`
- `POST` `/api/admin/crm/accounts/{account_id}/deals` params(account_id) → out: list [auth, db]
  `heptacert\backend\src\crm_accounts_api.py`
- `PATCH` `/api/admin/crm/deals/{deal_id}` params(deal_id) → out: list [auth, db]
  `heptacert\backend\src\crm_accounts_api.py`
- `DELETE` `/api/admin/crm/deals/{deal_id}` params(deal_id) → out: list [auth, db]
  `heptacert\backend\src\crm_accounts_api.py`
- `GET` `/api/admin/crm/deals/{deal_id}/activities` params(deal_id) → out: list [auth, db]
  `heptacert\backend\src\crm_accounts_api.py`
- `POST` `/api/admin/crm/deals/{deal_id}/activities` params(deal_id) → out: list [auth, db]
  `heptacert\backend\src\crm_accounts_api.py`
- `DELETE` `/api/admin/crm/deals/{deal_id}/activities/{activity_id}` params(deal_id, activity_id) → out: list [auth, db]
  `heptacert\backend\src\crm_accounts_api.py`
- `GET` `/api/admin/crm/sequences` → out: list [auth, db]
  `heptacert\backend\src\crm_sequences_api.py`
- `POST` `/api/admin/crm/sequences` → out: list [auth, db]
  `heptacert\backend\src\crm_sequences_api.py`
- `PATCH` `/api/admin/crm/sequences/{sequence_id}` params(sequence_id) → out: list [auth, db]
  `heptacert\backend\src\crm_sequences_api.py`
- `DELETE` `/api/admin/crm/sequences/{sequence_id}` params(sequence_id) → out: list [auth, db]
  `heptacert\backend\src\crm_sequences_api.py`
- `POST` `/api/admin/crm/sequences/{sequence_id}/enroll` params(sequence_id) → out: list [auth, db]
  `heptacert\backend\src\crm_sequences_api.py`
- `POST` `/api/admin/crm/sequences/{sequence_id}/unenroll` params(sequence_id) → out: list [auth, db]
  `heptacert\backend\src\crm_sequences_api.py`
- `GET` `/api/admin/crm/sequences/{sequence_id}/enrollments` params(sequence_id) → out: list [auth, db]
  `heptacert\backend\src\crm_sequences_api.py`
- `GET` `/api/admin/organization/domains` → out: DomainOut [auth, db]
  `heptacert\backend\src\domains_api.py`
- `GET` `/api/admin/organization/domain` → out: DomainOut [auth, db]
  `heptacert\backend\src\domains_api.py`
- `PUT` `/api/admin/organization/domain` → out: DomainOut [auth, db]
  `heptacert\backend\src\domains_api.py`
- `GET` `/api/admin/events/{event_id}/email-templates` params(event_id) → in: AsyncSessio, out: list [auth, db, cache, queue, payment]
  `heptacert\backend\src\email_api.py`
- `POST` `/api/admin/events/{event_id}/email-templates` params(event_id) → out: list [auth, db, cache, queue, payment]
  `heptacert\backend\src\email_api.py`
- `PATCH` `/api/admin/events/{event_id}/email-templates/{template_id}` params(event_id, template_id) → out: list [auth, db, cache, queue, payment]
  `heptacert\backend\src\email_api.py`
- `DELETE` `/api/admin/events/{event_id}/email-templates/{template_id}` params(event_id, template_id) → out: list [auth, db, cache, queue, payment]
  `heptacert\backend\src\email_api.py`
- `POST` `/api/admin/events/{event_id}/email-templates/{template_id}/preview` params(event_id, template_id) → out: list [auth, db, cache, queue, payment]
  `heptacert\backend\src\email_api.py`
- `GET` `/api/admin/email-config` → in: AsyncSessio, out: list [auth, db, cache, queue, payment]
  `heptacert\backend\src\email_api.py`
- `PATCH` `/api/admin/email-config` → out: list [auth, db, cache, queue, payment]
  `heptacert\backend\src\email_api.py`
- `GET` `/api/admin/email-config/saved-accounts` → in: AsyncSessio, out: list [auth, db, cache, queue, payment]
  `heptacert\backend\src\email_api.py`
- `POST` `/api/admin/email-config/test-connection` → out: list [auth, db, cache, queue, payment]
  `heptacert\backend\src\email_api.py`
- `POST` `/api/admin/events/{event_id}/bulk-email` params(event_id) → out: list [auth, db, cache, queue, payment]
  `heptacert\backend\src\email_api.py`
- `GET` `/api/admin/events/{event_id}/bulk-email/{job_id}` params(event_id, job_id) → in: AsyncSessio, out: list [auth, db, cache, queue, payment]
  `heptacert\backend\src\email_api.py`
- `GET` `/api/admin/events/{event_id}/bulk-emails` params(event_id) → in: AsyncSessio, out: list [auth, db, cache, queue, payment]
  `heptacert\backend\src\email_api.py`
- `POST` `/api/admin/events/{event_id}/scheduled-email` params(event_id) → out: list [auth, db, cache, queue, payment]
  `heptacert\backend\src\email_api.py`
- `GET` `/api/admin/events/{event_id}/scheduled-emails` params(event_id) → in: AsyncSessio, out: list [auth, db, cache, queue, payment]
  `heptacert\backend\src\email_api.py`
- `POST` `/api/admin/events/{event_id}/bulk-emails-cancel/{job_id}` params(event_id, job_id) → out: list [auth, db, cache, queue, payment]
  `heptacert\backend\src\email_api.py`
- `POST` `/api/admin/bulk-email-jobs/{job_id}/log-delivery` params(job_id) → out: list [auth, db, cache, queue, payment]
  `heptacert\backend\src\email_api.py`
- `GET` `/api/admin/events/{event_id}/bulk-email-jobs/{job_id}/delivery-stats` params(event_id, job_id) → in: AsyncSessio, out: list [auth, db, cache, queue, payment]
  `heptacert\backend\src\email_api.py`
- `GET` `/api/admin/events/{event_id}/bulk-email-jobs/{job_id}/delivery-logs` params(event_id, job_id) → in: AsyncSessio, out: list [auth, db, cache, queue, payment]
  `heptacert\backend\src\email_api.py`
- `GET` `/api/admin/email-analytics/summary` → in: AsyncSessio, out: list [auth, db, cache, queue, payment]
  `heptacert\backend\src\email_api.py`
- `GET` `/api/admin/crm/summary` → out: ParticipantCrmSummary [auth, db, cache, payment, upload]
  `heptacert\backend\src\event_crm_api.py`
- `GET` `/api/admin/crm/views` → out: ParticipantCrmSummary [auth, db, cache, payment, upload]
  `heptacert\backend\src\event_crm_api.py`
- `POST` `/api/admin/crm/views` → out: ParticipantCrmSummary [auth, db, cache, payment, upload]
  `heptacert\backend\src\event_crm_api.py`
- `PATCH` `/api/admin/crm/views/{view_id}` params(view_id) → out: ParticipantCrmSummary [auth, db, cache, payment, upload]
  `heptacert\backend\src\event_crm_api.py`
- `DELETE` `/api/admin/crm/views/{view_id}` params(view_id) → out: ParticipantCrmSummary [auth, db, cache, payment, upload]
  `heptacert\backend\src\event_crm_api.py`
- `GET` `/api/admin/crm/participants` → out: ParticipantCrmSummary [auth, db, cache, payment, upload]
  `heptacert\backend\src\event_crm_api.py`
- `GET` `/api/admin/crm/participant` → out: ParticipantCrmSummary [auth, db, cache, payment, upload]
  `heptacert\backend\src\event_crm_api.py`
- `PATCH` `/api/admin/crm/participant` → out: ParticipantCrmSummary [auth, db, cache, payment, upload]
  `heptacert\backend\src\event_crm_api.py`
- `GET` `/api/admin/crm/integrations/hubspot` → out: ParticipantCrmSummary [auth, db, cache, payment, upload]
  `heptacert\backend\src\event_crm_api.py`
- `PATCH` `/api/admin/crm/integrations/hubspot` → out: ParticipantCrmSummary [auth, db, cache, payment, upload]
  `heptacert\backend\src\event_crm_api.py`
- `DELETE` `/api/admin/crm/integrations/hubspot` → out: ParticipantCrmSummary [auth, db, cache, payment, upload]
  `heptacert\backend\src\event_crm_api.py`
- `POST` `/api/admin/crm/integrations/hubspot/test` → out: ParticipantCrmSummary [auth, db, cache, payment, upload]
  `heptacert\backend\src\event_crm_api.py`
- `POST` `/api/admin/crm/integrations/hubspot/push` → out: ParticipantCrmSummary [auth, db, cache, payment, upload]
  `heptacert\backend\src\event_crm_api.py`
- `POST` `/api/admin/crm/bulk-update` → out: ParticipantCrmSummary [auth, db, cache, payment, upload]
  `heptacert\backend\src\event_crm_api.py`
- `POST` `/api/admin/crm/export-selected` → out: ParticipantCrmSummary [auth, db, cache, payment, upload]
  `heptacert\backend\src\event_crm_api.py`
- `POST` `/api/admin/crm/bulk-email` → out: ParticipantCrmSummary [auth, db, cache, payment, upload]
  `heptacert\backend\src\event_crm_api.py`
- `GET` `/api/admin/crm/duplicates` → out: ParticipantCrmSummary [auth, db, cache, payment, upload]
  `heptacert\backend\src\event_crm_api.py`
- `POST` `/api/admin/crm/merge` → out: ParticipantCrmSummary [auth, db, cache, payment, upload]
  `heptacert\backend\src\event_crm_api.py`
- `GET` `/api/admin/crm/participant/snapshot` → out: ParticipantCrmSummary [auth, db, cache, payment, upload]
  `heptacert\backend\src\event_crm_api.py`
- `GET` `/api/admin/crm/audit` → out: ParticipantCrmSummary [auth, db, cache, payment, upload]
  `heptacert\backend\src\event_crm_api.py`
- `POST` `/api/admin/crm/tag-no-shows` → out: ParticipantCrmSummary [auth, db, cache, payment, upload]
  `heptacert\backend\src\event_crm_api.py`
- `POST` `/api/admin/crm/import-csv` → out: ParticipantCrmSummary [auth, db, cache, payment, upload]
  `heptacert\backend\src\event_crm_api.py`
- `GET` `/api/admin/crm/filter-by-score` → out: ParticipantCrmSummary [auth, db, cache, payment, upload]
  `heptacert\backend\src\event_crm_api.py`
- `GET` `/api/admin/crm/integrations/salesforce` → out: ParticipantCrmSummary [auth, db, cache, payment, upload]
  `heptacert\backend\src\event_crm_api.py`
- `PATCH` `/api/admin/crm/integrations/salesforce` → out: ParticipantCrmSummary [auth, db, cache, payment, upload]
  `heptacert\backend\src\event_crm_api.py`
- `DELETE` `/api/admin/crm/integrations/salesforce` → out: ParticipantCrmSummary [auth, db, cache, payment, upload]
  `heptacert\backend\src\event_crm_api.py`
- `POST` `/api/admin/crm/integrations/salesforce/push` → out: ParticipantCrmSummary [auth, db, cache, payment, upload]
  `heptacert\backend\src\event_crm_api.py`
- `GET` `/api/admin/crm/integrations/mailchimp` → out: ParticipantCrmSummary [auth, db, cache, payment, upload]
  `heptacert\backend\src\event_crm_api.py`
- `PATCH` `/api/admin/crm/integrations/mailchimp` → out: ParticipantCrmSummary [auth, db, cache, payment, upload]
  `heptacert\backend\src\event_crm_api.py`
- `DELETE` `/api/admin/crm/integrations/mailchimp` → out: ParticipantCrmSummary [auth, db, cache, payment, upload]
  `heptacert\backend\src\event_crm_api.py`
- `POST` `/api/admin/crm/integrations/mailchimp/push` → out: ParticipantCrmSummary [auth, db, cache, payment, upload]
  `heptacert\backend\src\event_crm_api.py`
- `POST` `/api/admin/crm/lead-scores/recalculate` → out: ParticipantCrmSummary [auth, db, cache, payment, upload]
  `heptacert\backend\src\event_crm_api.py`
- `POST` `/api/admin/crm/lead-scores/recalculate-selected` → out: ParticipantCrmSummary [auth, db, cache, payment, upload]
  `heptacert\backend\src\event_crm_api.py`
- `GET` `/api/admin/events/{event_id}/registration-fields` params(event_id) → out: list [auth, db]
  `heptacert\backend\src\event_extras_api.py`
- `PUT` `/api/admin/events/{event_id}/registration-fields` params(event_id) → out: list [auth, db]
  `heptacert\backend\src\event_extras_api.py`
- `POST` `/api/admin/events/{event_id}/registration-fields` params(event_id) → out: list [auth, db]
  `heptacert\backend\src\event_extras_api.py`
- `GET` `/api/admin/events/{event_id}/ticket-types` params(event_id) → out: list [auth, db]
  `heptacert\backend\src\event_extras_api.py`
- `POST` `/api/admin/events/{event_id}/ticket-types` params(event_id) → out: list [auth, db]
  `heptacert\backend\src\event_extras_api.py`
- `PATCH` `/api/admin/events/{event_id}/ticket-types/{type_id}` params(event_id, type_id) → out: list [auth, db]
  `heptacert\backend\src\event_extras_api.py`
- `DELETE` `/api/admin/events/{event_id}/ticket-types/{type_id}` params(event_id, type_id) → out: list [auth, db]
  `heptacert\backend\src\event_extras_api.py`
- `POST` `/api/admin/events/{event_id}/sponsors` params(event_id) → out: SponsorSlotOut [auth, db, upload]
  `heptacert\backend\src\event_sponsors_api.py`
- `GET` `/api/admin/events/{event_id}/sponsors` params(event_id) → out: SponsorSlotOut [auth, db, upload]
  `heptacert\backend\src\event_sponsors_api.py`
- `PUT` `/api/admin/events/{event_id}/sponsors/{sponsor_id}` params(event_id, sponsor_id) → out: SponsorSlotOut [auth, db, upload]
  `heptacert\backend\src\event_sponsors_api.py`
- `DELETE` `/api/admin/events/{event_id}/sponsors/{sponsor_id}` params(event_id, sponsor_id) → out: SponsorSlotOut [auth, db, upload]
  `heptacert\backend\src\event_sponsors_api.py`
- `GET` `/api/admin/lead-forms` → out: list [auth, db]
  `heptacert\backend\src\lead_forms_api.py`
- `POST` `/api/admin/lead-forms` → out: list [auth, db]
  `heptacert\backend\src\lead_forms_api.py`
- `GET` `/api/admin/lead-forms/{form_id}` params(form_id) → out: list [auth, db]
  `heptacert\backend\src\lead_forms_api.py`
- `PATCH` `/api/admin/lead-forms/{form_id}` params(form_id) → out: list [auth, db]
  `heptacert\backend\src\lead_forms_api.py`
- `DELETE` `/api/admin/lead-forms/{form_id}` params(form_id) → out: list [auth, db]
  `heptacert\backend\src\lead_forms_api.py`
- `GET` `/api/admin/lead-forms/{form_id}/submissions` params(form_id) → out: list [auth, db]
  `heptacert\backend\src\lead_forms_api.py`
- `POST` `/api/admin/learning-paths` [auth, db]
  `heptacert\backend\src\learning_path_api.py`
- `GET` `/api/admin/learning-paths` → in: Optional [auth, db]
  `heptacert\backend\src\learning_path_api.py`
- `GET` `/api/admin/learning-paths/{path_id}` params(path_id) → in: Optional [auth, db]
  `heptacert\backend\src\learning_path_api.py`
- `PATCH` `/api/admin/learning-paths/{path_id}` params(path_id) [auth, db]
  `heptacert\backend\src\learning_path_api.py`
- `PUT` `/api/admin/learning-paths/{path_id}/steps` params(path_id) [auth, db]
  `heptacert\backend\src\learning_path_api.py`
- `DELETE` `/api/admin/learning-paths/{path_id}` params(path_id) [auth, db]
  `heptacert\backend\src\learning_path_api.py`
- `GET` `/api/admin/learning-paths/{path_id}/enrollments` params(path_id) → in: Optional [auth, db]
  `heptacert\backend\src\learning_path_api.py`
- `GET` `/api/admin/lms/lti-tools` [auth, db]
  `heptacert\backend\src\lti_api.py`
- `POST` `/api/admin/lms/lti-tools` [auth, db]
  `heptacert\backend\src\lti_api.py`
- `PATCH` `/api/admin/lms/lti-tools/{tool_id}` params(tool_id) [auth, db]
  `heptacert\backend\src\lti_api.py`
- `DELETE` `/api/admin/lms/lti-tools/{tool_id}` params(tool_id) [auth, db]
  `heptacert\backend\src\lti_api.py`
- `POST` `/api/admin/events/{event_id}/badge-rules` params(event_id) → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `GET` `/api/admin/events/{event_id}/badge-rules` params(event_id) → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `POST` `/api/admin/events/{event_id}/badges` params(event_id) → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `GET` `/api/admin/events/{event_id}/badges` params(event_id) → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `POST` `/api/admin/events/{event_id}/badges/calculate` params(event_id) → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `POST` `/api/admin/events/{event_id}/certificates/assign-tiers` params(event_id) → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `GET` `/api/admin/events/{event_id}/certificates/tier-summary` params(event_id) → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `GET` `/api/admin/events/{event_id}/surveys/responses` params(event_id) → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `POST` `/api/admin/events/{event_id}/apply-cert-template` params(event_id) → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `GET` `/api/admin/transactions` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `GET` `/api/admin/events` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `POST` `/api/admin/events` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `POST` `/api/admin/ai/event-assistant` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `GET` `/api/admin/mcp/me` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `POST` `/api/admin/mcp/agent-log` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `GET` `/api/admin/mcp/agent-logs` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `PATCH` `/api/admin/events/{event_id}/attendees/{attendee_id}` params(event_id, attendee_id) → in: PublicMemberProfileUpdateIn, out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `POST` `/api/admin/certificates/{cert_id}/revoke` params(cert_id) → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `GET` `/api/admin/events/{event_id}` params(event_id) → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `GET` `/api/admin/events/{event_id}/health` params(event_id) → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `GET` `/api/admin/events/{event_id}/team` params(event_id) → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `GET` `/api/admin/events/{event_id}/access` params(event_id) → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `POST` `/api/admin/events/{event_id}/team` params(event_id) → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `PATCH` `/api/admin/events/{event_id}/team/{member_id}` params(event_id, member_id) → in: PublicMemberProfileUpdateIn, out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `DELETE` `/api/admin/events/{event_id}/team/{member_id}` params(event_id, member_id) → in: DeleteAccountIn, out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `GET` `/api/admin/events/{event_id}/team/activity` params(event_id) → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `GET` `/api/admin/events/{event_id}/sheets` params(event_id) → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `POST` `/api/admin/events/{event_id}/sheets/connect` params(event_id) → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `POST` `/api/admin/events/{event_id}/sheets/sync` params(event_id) → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `DELETE` `/api/admin/events/{event_id}/sheets` params(event_id) → in: DeleteAccountIn, out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `PATCH` `/api/admin/events/{event_id}` params(event_id) → in: PublicMemberProfileUpdateIn, out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `DELETE` `/api/admin/events/{event_id}` params(event_id) → in: DeleteAccountIn, out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `POST` `/api/admin/events/{event_id}/template-upload` params(event_id) → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `POST` `/api/admin/events/{event_id}/banner-upload` params(event_id) → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `PUT` `/api/admin/events/{event_id}/config` params(event_id) → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `GET` `/api/admin/organization/settings` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `PATCH` `/api/admin/organization/settings` → in: PublicMemberProfileUpdateIn, out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `POST` `/api/admin/organization/logo` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `GET` `/api/admin/api-keys` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `POST` `/api/admin/api-keys` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `DELETE` `/api/admin/api-keys/{key_id}` params(key_id) → in: DeleteAccountIn, out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `GET` `/api/admin/events/{event_id}/certificates` params(event_id) → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `GET` `/api/admin/events/{event_id}/certificates/cost-estimate` params(event_id) → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `POST` `/api/admin/events/{event_id}/certificates` params(event_id) → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `PATCH` `/api/admin/certificates/{cert_id}` params(cert_id) → in: PublicMemberProfileUpdateIn, out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `DELETE` `/api/admin/certificates/{cert_id}` params(cert_id) → in: DeleteAccountIn, out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `POST` `/api/admin/events/{event_id}/certificates/bulk-action` params(event_id) → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `GET` `/api/admin/events/{event_id}/certificates/export` params(event_id) → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `GET` `/api/admin/dashboard/stats` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `POST` `/api/admin/support-tickets` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `GET` `/api/admin/events/{event_id}/sessions` params(event_id) → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `POST` `/api/admin/events/{event_id}/sessions` params(event_id) → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `PATCH` `/api/admin/events/{event_id}/sessions/{session_id}` params(event_id, session_id) → in: PublicMemberProfileUpdateIn, out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `DELETE` `/api/admin/events/{event_id}/sessions/{session_id}` params(event_id, session_id) → in: DeleteAccountIn, out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `PATCH` `/api/admin/events/{event_id}/sessions/{session_id}/toggle` params(event_id, session_id) → in: PublicMemberProfileUpdateIn, out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `GET` `/api/admin/events/{event_id}/sessions/{session_id}/qr` params(event_id, session_id) → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `GET` `/api/admin/events/{event_id}/attendees` params(event_id) → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `GET` `/api/admin/events/{event_id}/attendaonce/export` params(event_id) → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `GET` `/api/admin/events/{event_id}/registration-documents/file` params(event_id) → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `GET` `/api/admin/events/{event_id}/registration-documents/export` params(event_id) → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `GET` `/api/admin/events/{event_id}/attendees/{attendee_id}/survey-link` params(event_id, attendee_id) → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `GET` `/api/admin/events/{event_id}/comments` params(event_id) → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `PATCH` `/api/admin/events/{event_id}/comments/{comment_id}` params(event_id, comment_id) → in: PublicMemberProfileUpdateIn, out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `GET` `/api/admin/events/{event_id}/attendees/filter-for-email` params(event_id) → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `POST` `/api/admin/events/{event_id}/attendees/import` params(event_id) → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `POST` `/api/admin/events/{event_id}/attendees` params(event_id) → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `DELETE` `/api/admin/events/{event_id}/attendees/{attendee_id}` params(event_id, attendee_id) → in: DeleteAccountIn, out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `POST` `/api/admin/events/{event_id}/sessions/{session_id}/checkin` params(event_id, session_id) → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `GET` `/api/admin/events/{event_id}/operations` params(event_id) → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `DELETE` `/api/admin/events/{event_id}/attendance-records/{record_id}` params(event_id, record_id) → in: DeleteAccountIn, out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `GET` `/api/admin/events/{event_id}/attendance` params(event_id) → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `GET` `/api/admin/events/{event_id}/attendaonce` params(event_id) → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `GET` `/api/admin/events/{event_id}/attendance/export` params(event_id) → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `POST` `/api/admin/events/{event_id}/bulk-certify` params(event_id) → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `POST` `/api/admin/events/{event_id}/bulk-certify-queue` params(event_id) → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `GET` `/api/admin/transactions/list` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `GET` `/api/admin/organization/legal-consents/export` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `GET` `/api/admin/organization/venue-reservations/google-calendar/status` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `GET` `/api/admin/organization/venue-reservations/google-calendar/start` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `POST` `/api/admin/organization/venue-reservations/google-calendar/sync` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `GET` `/api/admin/jobs` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `GET` `/api/admin/badge-templates` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `PATCH` `/api/admin/events/{event_id}/marketplace` params(event_id) → out: list [auth, db]
  `heptacert\backend\src\marketplace_api.py`
- `PATCH` `/api/admin/lms/courses/{course_id}/marketplace` params(course_id) → out: list [auth, db]
  `heptacert\backend\src\marketplace_api.py`
- `GET` `/api/admin/events/{event_id}/microsoft-excel` params(event_id) → out: EventMicrosoftExcelStatusOut [auth, db, upload]
  `heptacert\backend\src\ms_excel_api.py`
- `POST` `/api/admin/events/{event_id}/microsoft-excel/connect` params(event_id) → out: EventMicrosoftExcelStatusOut [auth, db, upload]
  `heptacert\backend\src\ms_excel_api.py`
- `POST` `/api/admin/events/{event_id}/microsoft-excel/sync` params(event_id) → out: EventMicrosoftExcelStatusOut [auth, db, upload]
  `heptacert\backend\src\ms_excel_api.py`
- `DELETE` `/api/admin/events/{event_id}/microsoft-excel` params(event_id) → out: EventMicrosoftExcelStatusOut [auth, db, upload]
  `heptacert\backend\src\ms_excel_api.py`
- `GET` `/api/admin/integrations/catalog` → out: IntegrationCatalogOut [auth, db, payment]
  `heptacert\backend\src\notification_integrations_api.py`
- `GET` `/api/admin/integrations/enterprise-config` → out: IntegrationCatalogOut [auth, db, payment]
  `heptacert\backend\src\notification_integrations_api.py`
- `PATCH` `/api/admin/integrations/enterprise-config` → out: IntegrationCatalogOut [auth, db, payment]
  `heptacert\backend\src\notification_integrations_api.py`
- `POST` `/api/admin/integrations/provider-config/{provider_key}/test` params(provider_key) → out: IntegrationCatalogOut [auth, db, payment]
  `heptacert\backend\src\notification_integrations_api.py`
- `GET` `/api/admin/integrations/notifications` → out: IntegrationCatalogOut [auth, db, payment]
  `heptacert\backend\src\notification_integrations_api.py`
- `PATCH` `/api/admin/integrations/notifications` → out: IntegrationCatalogOut [auth, db, payment]
  `heptacert\backend\src\notification_integrations_api.py`
- `DELETE` `/api/admin/integrations/notifications/{channel}` params(channel) → out: IntegrationCatalogOut [auth, db, payment]
  `heptacert\backend\src\notification_integrations_api.py`
- `POST` `/api/admin/integrations/notifications/test` → out: IntegrationCatalogOut [auth, db, payment]
  `heptacert\backend\src\notification_integrations_api.py`
- `GET` `/api/admin/integrations/webinar/zoom/webinars` → out: IntegrationCatalogOut [auth, db, payment]
  `heptacert\backend\src\notification_integrations_api.py`
- `POST` `/api/admin/integrations/webinar/zoom/webinars/{webinar_id}/import` params(webinar_id) → out: IntegrationCatalogOut [auth, db, payment]
  `heptacert\backend\src\notification_integrations_api.py`
- `GET` `/api/admin/superadmin/oauth-clients` → in: st, out: ValidateOut [auth, db]
  `heptacert\backend\src\oauth_api.py`
- `POST` `/api/admin/superadmin/oauth-clients` → in: AuthorizeIn, out: ValidateOut [auth, db]
  `heptacert\backend\src\oauth_api.py`
- `PATCH` `/api/admin/superadmin/oauth-clients/{client_id}` params(client_id) → out: ValidateOut [auth, db]
  `heptacert\backend\src\oauth_api.py`
- `DELETE` `/api/admin/superadmin/oauth-clients/{client_id}/tokens` params(client_id) → out: ValidateOut [auth, db]
  `heptacert\backend\src\oauth_api.py`
- `GET` `/api/admin/me/oauth-connections` → in: st, out: ValidateOut [auth, db]
  `heptacert\backend\src\oauth_api.py`
- `GET` `/api/admin/organization/contexts` → out: list [auth, db]
  `heptacert\backend\src\organization_access_api.py`
- `GET` `/api/admin/organization/team` → out: list [auth, db]
  `heptacert\backend\src\organization_access_api.py`
- `POST` `/api/admin/organization/team` → out: list [auth, db]
  `heptacert\backend\src\organization_access_api.py`
- `PATCH` `/api/admin/organization/team/{member_id}` params(member_id) → out: list [auth, db]
  `heptacert\backend\src\organization_access_api.py`
- `DELETE` `/api/admin/organization/team/{member_id}` params(member_id) → out: list [auth, db]
  `heptacert\backend\src\organization_access_api.py`
- `GET` `/api/admin/analytics/org/overview` [auth, db]
  `heptacert\backend\src\org_analytics_api.py`
- `GET` `/api/admin/analytics/org/training-compliance` [auth, db]
  `heptacert\backend\src\org_analytics_api.py`
- `GET` `/api/admin/analytics/org/learning-paths` [auth, db]
  `heptacert\backend\src\org_analytics_api.py`
- `GET` `/api/admin/analytics/org/crm` [auth, db]
  `heptacert\backend\src\org_analytics_api.py`
- `GET` `/api/admin/analytics/org/cert-timeline` [auth, db]
  `heptacert\backend\src\org_analytics_api.py`
- `GET` `/admin/organization/modules` [auth, db]
  `heptacert\backend\src\org_modules_api.py`
- `PATCH` `/admin/organization/modules` [auth, db]
  `heptacert\backend\src\org_modules_api.py`
- `POST` `/admin/organization/onboarding` [auth, db]
  `heptacert\backend\src\org_modules_api.py`
- `GET` `/api/admin/org/staff` [auth, db]
  `heptacert\backend\src\org_staff_api.py`
- `POST` `/api/admin/org/staff/invite` → in: StaffAcceptIn [auth, db]
  `heptacert\backend\src\org_staff_api.py`
- `PATCH` `/api/admin/org/staff/{staff_id}` params(staff_id) [auth, db]
  `heptacert\backend\src\org_staff_api.py`
- `DELETE` `/api/admin/org/staff/{staff_id}` params(staff_id) [auth, db]
  `heptacert\backend\src\org_staff_api.py`
- `POST` `/api/admin/product-telemetry` → in: ProductTelemetryIn [auth, db]
  `heptacert\backend\src\product_telemetry_api.py`
- `POST` `/api/admin/events/{event_id}/quiz` params(event_id) [auth, db]
  `heptacert\backend\src\quiz_api.py`
- `PATCH` `/api/admin/events/{event_id}/quiz` params(event_id) [auth, db]
  `heptacert\backend\src\quiz_api.py`
- `DELETE` `/api/admin/events/{event_id}/quiz` params(event_id) [auth, db]
  `heptacert\backend\src\quiz_api.py`
- `GET` `/api/admin/events/{event_id}/quiz` params(event_id) [auth, db]
  `heptacert\backend\src\quiz_api.py`
- `GET` `/api/admin/events/{event_id}/quiz/results` params(event_id) [auth, db]
  `heptacert\backend\src\quiz_api.py`
- `POST` `/api/admin/events/{event_id}/quiz/attempts/{attempt_id}/issue-cert` params(event_id, attempt_id) [auth, db]
  `heptacert\backend\src\quiz_api.py`
- `GET` `/api/admin/events/{event_id}/raffles` params(event_id) → out: List [auth, db]
  `heptacert\backend\src\raffles_api.py`
- `GET` `/api/admin/events/{event_id}/raffles/audit` params(event_id) → out: List [auth, db]
  `heptacert\backend\src\raffles_api.py`
- `POST` `/api/admin/events/{event_id}/raffles` params(event_id) → out: List [auth, db]
  `heptacert\backend\src\raffles_api.py`
- `PATCH` `/api/admin/events/{event_id}/raffles/{raffle_id}` params(event_id, raffle_id) → out: List [auth, db]
  `heptacert\backend\src\raffles_api.py`
- `DELETE` `/api/admin/events/{event_id}/raffles/{raffle_id}` params(event_id, raffle_id) → out: List [auth, db]
  `heptacert\backend\src\raffles_api.py`
- `POST` `/api/admin/events/{event_id}/raffles/{raffle_id}/draw` params(event_id, raffle_id) → out: List [auth, db]
  `heptacert\backend\src\raffles_api.py`
- `POST` `/api/admin/events/{event_id}/raffles/{raffle_id}/redraw` params(event_id, raffle_id) → out: List [auth, db]
  `heptacert\backend\src\raffles_api.py`
- `GET` `/api/admin/events/{event_id}/raffles/{raffle_id}/export` params(event_id, raffle_id) → out: List [auth, db]
  `heptacert\backend\src\raffles_api.py`
- `GET` `/api/admin/reports` → out: list [auth, db]
  `heptacert\backend\src\report_scheduler_api.py`
- `POST` `/api/admin/reports` → out: list [auth, db]
  `heptacert\backend\src\report_scheduler_api.py`
- `GET` `/api/admin/reports/types` → out: list [auth, db]
  `heptacert\backend\src\report_scheduler_api.py`
- `PATCH` `/api/admin/reports/{report_id}` params(report_id) → out: list [auth, db]
  `heptacert\backend\src\report_scheduler_api.py`
- `DELETE` `/api/admin/reports/{report_id}` params(report_id) → out: list [auth, db]
  `heptacert\backend\src\report_scheduler_api.py`
- `GET` `/api/admin/community/posts` → in: in, out: list [auth, db]
  `heptacert\backend\src\social_api.py`
- `POST` `/api/admin/community/posts` → in: CommunityPostCreateIn, out: list [auth, db]
  `heptacert\backend\src\social_api.py`
- `DELETE` `/api/admin/community/posts/{post_public_id}` params(post_public_id) → out: list [auth, db]
  `heptacert\backend\src\social_api.py`
- `POST` `/api/admin/events/{event_id}/survey-config` params(event_id) → out: EventSurveyOut [auth, db, payment, upload]
  `heptacert\backend\src\survey_config_api.py`
- `GET` `/api/admin/events/{event_id}/survey-config` params(event_id) → out: EventSurveyOut [auth, db, payment, upload]
  `heptacert\backend\src\survey_config_api.py`
- `GET` `/api/admin/events/{event_id}/template-history` params(event_id) → out: List [auth, db, upload]
  `heptacert\backend\src\template_history_api.py`
- `POST` `/api/admin/events/{event_id}/template-history/{snap_id}/restore` params(event_id, snap_id) → out: List [auth, db, upload]
  `heptacert\backend\src\template_history_api.py`
- `GET` `/api/admin/events/{event_id}/tickets` params(event_id) → out: PublicTicketOut [auth, db, cache]
  `heptacert\backend\src\tickets_api.py`
- `POST` `/api/admin/events/{event_id}/tickets/check-in` params(event_id) → out: PublicTicketOut [auth, db, cache]
  `heptacert\backend\src\tickets_api.py`
- `PATCH` `/api/admin/events/{event_id}/tickets/{ticket_id}/status` params(event_id, ticket_id) → out: PublicTicketOut [auth, db, cache]
  `heptacert\backend\src\tickets_api.py`
- `GET` `/api/admin/training/departments` → out: list [auth, db]
  `heptacert\backend\src\training_api.py`
- `POST` `/api/admin/training/departments` → out: list [auth, db]
  `heptacert\backend\src\training_api.py`
- `PATCH` `/api/admin/training/departments/{department_id}` params(department_id) → out: list [auth, db]
  `heptacert\backend\src\training_api.py`
- `GET` `/api/admin/training/templates` → out: list [auth, db]
  `heptacert\backend\src\training_api.py`
- `POST` `/api/admin/training/templates` → out: list [auth, db]
  `heptacert\backend\src\training_api.py`
- `POST` `/api/admin/training/bulk-assign` → out: list [auth, db]
  `heptacert\backend\src\training_api.py`
- `GET` `/api/admin/training/recurring-rules` → out: list [auth, db]
  `heptacert\backend\src\training_api.py`
- `POST` `/api/admin/training/recurring-rules` → out: list [auth, db]
  `heptacert\backend\src\training_api.py`
- `POST` `/api/admin/training/recurring-rules/run` → out: list [auth, db]
  `heptacert\backend\src\training_api.py`
- `GET` `/api/admin/training/assignments` → out: list [auth, db]
  `heptacert\backend\src\training_api.py`
- `POST` `/api/admin/training/assignments` → out: list [auth, db]
  `heptacert\backend\src\training_api.py`
- `PATCH` `/api/admin/training/assignments/{assignment_id}` params(assignment_id) → out: list [auth, db]
  `heptacert\backend\src\training_api.py`
- `DELETE` `/api/admin/training/assignments/{assignment_id}` params(assignment_id) → out: list [auth, db]
  `heptacert\backend\src\training_api.py`
- `GET` `/api/admin/training/report` → out: list [auth, db]
  `heptacert\backend\src\training_api.py`
- `GET` `/api/admin/training/report/export` → out: list [auth, db]
  `heptacert\backend\src\training_api.py`
- `GET` `/api/admin/training/renewal-recommendations` → out: list [auth, db]
  `heptacert\backend\src\training_api.py`
- `POST` `/api/admin/training/send-renewal-notifications` → out: list [auth, db]
  `heptacert\backend\src\training_api.py`
- `GET` `/api/admin/training/notification-logs` → out: list [auth, db]
  `heptacert\backend\src\training_api.py`
- `GET` `/api/admin/organization/venues` → out: list [auth, db]
  `heptacert\backend\src\venues_api.py`
- `POST` `/api/admin/organization/venues` → out: list [auth, db]
  `heptacert\backend\src\venues_api.py`
- `PATCH` `/api/admin/organization/venues/{venue_id}` params(venue_id) → out: list [auth, db]
  `heptacert\backend\src\venues_api.py`
- `DELETE` `/api/admin/organization/venues/{venue_id}` params(venue_id) → out: list [auth, db]
  `heptacert\backend\src\venues_api.py`
- `GET` `/api/admin/organization/venue-reservations` → out: list [auth, db]
  `heptacert\backend\src\venue_reservations_api.py`
- `POST` `/api/admin/organization/venue-reservations` → out: list [auth, db]
  `heptacert\backend\src\venue_reservations_api.py`
- `PATCH` `/api/admin/organization/venue-reservations/{reservation_id}` params(reservation_id) → out: list [auth, db]
  `heptacert\backend\src\venue_reservations_api.py`
- `DELETE` `/api/admin/organization/venue-reservations/{reservation_id}` params(reservation_id) → out: list [auth, db]
  `heptacert\backend\src\venue_reservations_api.py`
- `GET` `/api/admin/organization/venue-reservations/calendar.ics` → out: list [auth, db]
  `heptacert\backend\src\venue_reservations_api.py`
- `GET` `/api/admin/lms/staff` → in: Optional [auth, db]
  `heptacert\backend\_archive_lms\lms_api.py`
- `POST` `/api/admin/lms/staff` [auth, db]
  `heptacert\backend\_archive_lms\lms_api.py`
- `DELETE` `/api/admin/lms/staff/{staff_id}` params(staff_id) [auth, db]
  `heptacert\backend\_archive_lms\lms_api.py`
- `GET` `/api/admin/lms/courses` → in: Optional [auth, db]
  `heptacert\backend\_archive_lms\lms_api.py`
- `POST` `/api/admin/lms/courses` [auth, db]
  `heptacert\backend\_archive_lms\lms_api.py`
- `GET` `/api/admin/lms/courses/{course_id}` params(course_id) → in: Optional [auth, db]
  `heptacert\backend\_archive_lms\lms_api.py`
- `PATCH` `/api/admin/lms/courses/{course_id}` params(course_id) [auth, db]
  `heptacert\backend\_archive_lms\lms_api.py`
- `DELETE` `/api/admin/lms/courses/{course_id}` params(course_id) [auth, db]
  `heptacert\backend\_archive_lms\lms_api.py`
- `POST` `/api/admin/lms/courses/{course_id}/modules` params(course_id) [auth, db]
  `heptacert\backend\_archive_lms\lms_api.py`
- `PATCH` `/api/admin/lms/courses/{course_id}/modules/{module_id}` params(course_id, module_id) [auth, db]
  `heptacert\backend\_archive_lms\lms_api.py`
- `DELETE` `/api/admin/lms/courses/{course_id}/modules/{module_id}` params(course_id, module_id) [auth, db]
  `heptacert\backend\_archive_lms\lms_api.py`
- `GET` `/api/admin/lms/courses/{course_id}/enrollments` params(course_id) → in: Optional [auth, db]
  `heptacert\backend\_archive_lms\lms_api.py`
- `POST` `/api/admin/lms/courses/{course_id}/enrollments/import` params(course_id) [auth, db]
  `heptacert\backend\_archive_lms\lms_api.py`
- `POST` `/api/admin/lms/courses/{course_id}/enrollments/invite` params(course_id) [auth, db]
  `heptacert\backend\_archive_lms\lms_api.py`
- `GET` `/api/admin/lms/journeys` → in: Optional [auth, db]
  `heptacert\backend\_archive_lms\lms_api.py`
- `POST` `/api/admin/lms/journeys` [auth, db]
  `heptacert\backend\_archive_lms\lms_api.py`
- `GET` `/api/admin/lms/journeys/{journey_id}` params(journey_id) → in: Optional [auth, db]
  `heptacert\backend\_archive_lms\lms_api.py`
- `PATCH` `/api/admin/lms/journeys/{journey_id}` params(journey_id) [auth, db]
  `heptacert\backend\_archive_lms\lms_api.py`
- `DELETE` `/api/admin/lms/journeys/{journey_id}` params(journey_id) [auth, db]
  `heptacert\backend\_archive_lms\lms_api.py`
- `GET` `/api/admin/lms/courses/{course_id}/announcements` params(course_id) → in: Optional [auth, db]
  `heptacert\backend\_archive_lms\lms_api.py`
- `POST` `/api/admin/lms/courses/{course_id}/announcements` params(course_id) [auth, db]
  `heptacert\backend\_archive_lms\lms_api.py`
- `GET` `/api/admin/lms/courses/{course_id}/assignments/{module_id}/submissions` params(course_id, module_id) → in: Optional [auth, db]
  `heptacert\backend\_archive_lms\lms_api.py`
- `PATCH` `/api/admin/lms/submissions/{submission_id}/grade` params(submission_id) [auth, db]
  `heptacert\backend\_archive_lms\lms_api.py`
- `GET` `/api/admin/lms/courses/{course_id}/grade-items` params(course_id) [auth, db]
  `heptacert\backend\_archive_lms\lms_extended_api.py`
- `POST` `/api/admin/lms/courses/{course_id}/grade-items` params(course_id) [auth, db]
  `heptacert\backend\_archive_lms\lms_extended_api.py`
- `PATCH` `/api/admin/lms/courses/{course_id}/grade-items/{item_id}` params(course_id, item_id) [auth, db]
  `heptacert\backend\_archive_lms\lms_extended_api.py`
- `DELETE` `/api/admin/lms/courses/{course_id}/grade-items/{item_id}` params(course_id, item_id) [auth, db]
  `heptacert\backend\_archive_lms\lms_extended_api.py`
- `GET` `/api/admin/lms/courses/{course_id}/gradebook` params(course_id) [auth, db]
  `heptacert\backend\_archive_lms\lms_extended_api.py`
- `POST` `/api/admin/lms/courses/{course_id}/gradebook/{enrollment_id}/summary` params(course_id, enrollment_id) [auth, db]
  `heptacert\backend\_archive_lms\lms_extended_api.py`
- `GET` `/api/admin/lms/courses/{course_id}/discussions` params(course_id) [auth, db]
  `heptacert\backend\_archive_lms\lms_extended_api.py`
- `POST` `/api/admin/lms/courses/{course_id}/discussions` params(course_id) [auth, db]
  `heptacert\backend\_archive_lms\lms_extended_api.py`
- `GET` `/api/admin/lms/courses/{course_id}/discussions/{discussion_id}` params(course_id, discussion_id) [auth, db]
  `heptacert\backend\_archive_lms\lms_extended_api.py`
- `POST` `/api/admin/lms/courses/{course_id}/discussions/{discussion_id}/replies` params(course_id, discussion_id) [auth, db]
  `heptacert\backend\_archive_lms\lms_extended_api.py`
- `PATCH` `/api/admin/lms/courses/{course_id}/discussions/{discussion_id}/lock` params(course_id, discussion_id) [auth, db]
  `heptacert\backend\_archive_lms\lms_extended_api.py`
- `GET` `/api/admin/lms/courses/{course_id}/rubrics` params(course_id) [auth, db]
  `heptacert\backend\_archive_lms\lms_extended_api.py`
- `POST` `/api/admin/lms/courses/{course_id}/rubrics` params(course_id) [auth, db]
  `heptacert\backend\_archive_lms\lms_extended_api.py`
- `POST` `/api/admin/lms/courses/{course_id}/rubrics/{rubric_id}/criteria` params(course_id, rubric_id) [auth, db]
  `heptacert\backend\_archive_lms\lms_extended_api.py`
- `POST` `/api/admin/lms/submissions/{submission_id}/rubric-scores` params(submission_id) [auth, db]
  `heptacert\backend\_archive_lms\lms_extended_api.py`
- `DELETE` `/api/admin/lms/courses/{course_id}/rubrics/{rubric_id}` params(course_id, rubric_id) [auth, db]
  `heptacert\backend\_archive_lms\lms_extended_api.py`
- `DELETE` `/api/admin/lms/courses/{course_id}/rubrics/{rubric_id}/criteria/{criterion_id}` params(course_id, rubric_id, criterion_id) [auth, db]
  `heptacert\backend\_archive_lms\lms_extended_api.py`
- `GET` `/api/admin/lms/outcomes` [auth, db]
  `heptacert\backend\_archive_lms\lms_extended_api.py`
- `POST` `/api/admin/lms/outcomes` [auth, db]
  `heptacert\backend\_archive_lms\lms_extended_api.py`
- `PATCH` `/api/admin/lms/outcomes/{outcome_id}` params(outcome_id) [auth, db]
  `heptacert\backend\_archive_lms\lms_extended_api.py`
- `DELETE` `/api/admin/lms/outcomes/{outcome_id}` params(outcome_id) [auth, db]
  `heptacert\backend\_archive_lms\lms_extended_api.py`
- `GET` `/api/admin/lms/courses/{course_id}/outcomes` params(course_id) [auth, db]
  `heptacert\backend\_archive_lms\lms_extended_api.py`
- `POST` `/api/admin/lms/courses/{course_id}/outcomes` params(course_id) [auth, db]
  `heptacert\backend\_archive_lms\lms_extended_api.py`
- `DELETE` `/api/admin/lms/courses/{course_id}/outcomes/{alignment_id}` params(course_id, alignment_id) [auth, db]
  `heptacert\backend\_archive_lms\lms_extended_api.py`
- `GET` `/api/admin/lms/courses/{course_id}/groups` params(course_id) [auth, db]
  `heptacert\backend\_archive_lms\lms_extended_api.py`
- `POST` `/api/admin/lms/courses/{course_id}/groups` params(course_id) [auth, db]
  `heptacert\backend\_archive_lms\lms_extended_api.py`
- `POST` `/api/admin/lms/courses/{course_id}/groups/{group_id}/members` params(course_id, group_id) [auth, db]
  `heptacert\backend\_archive_lms\lms_extended_api.py`
- `DELETE` `/api/admin/lms/courses/{course_id}/groups/{group_id}/members/{member_id}` params(course_id, group_id, member_id) [auth, db]
  `heptacert\backend\_archive_lms\lms_extended_api.py`
- `GET` `/api/admin/lms/badges` [auth, db]
  `heptacert\backend\_archive_lms\lms_extended_api.py`
- `POST` `/api/admin/lms/badges` [auth, db]
  `heptacert\backend\_archive_lms\lms_extended_api.py`
- `PATCH` `/api/admin/lms/badges/{badge_id}` params(badge_id) [auth, db]
  `heptacert\backend\_archive_lms\lms_extended_api.py`
- `DELETE` `/api/admin/lms/badges/{badge_id}` params(badge_id) [auth, db]
  `heptacert\backend\_archive_lms\lms_extended_api.py`
- `POST` `/api/admin/lms/badges/{badge_id}/award` params(badge_id) [auth, db]
  `heptacert\backend\_archive_lms\lms_extended_api.py`
- `GET` `/api/admin/lms/badges/{badge_id}/awards` params(badge_id) [auth, db]
  `heptacert\backend\_archive_lms\lms_extended_api.py`
- `GET` `/api/admin/lms/courses/{course_id}/calendar` params(course_id) [auth, db]
  `heptacert\backend\_archive_lms\lms_extended_api.py`
- `POST` `/api/admin/lms/courses/{course_id}/calendar` params(course_id) [auth, db]
  `heptacert\backend\_archive_lms\lms_extended_api.py`
- `DELETE` `/api/admin/lms/courses/{course_id}/calendar/{event_id}` params(course_id, event_id) [auth, db]
  `heptacert\backend\_archive_lms\lms_extended_api.py`
- `GET` `/api/admin/lms/courses/{course_id}/syllabus` params(course_id) [auth, db]
  `heptacert\backend\_archive_lms\lms_extended_api.py`
- `PUT` `/api/admin/lms/courses/{course_id}/syllabus` params(course_id) [auth, db]
  `heptacert\backend\_archive_lms\lms_extended_api.py`
- `GET` `/api/admin/lms/courses/{course_id}/attendance-sessions` params(course_id) [auth, db]
  `heptacert\backend\_archive_lms\lms_extended_api.py`
- `POST` `/api/admin/lms/courses/{course_id}/attendance-sessions` params(course_id) [auth, db]
  `heptacert\backend\_archive_lms\lms_extended_api.py`
- `PATCH` `/api/admin/lms/courses/{course_id}/attendance-sessions/{session_id}` params(course_id, session_id) [auth, db]
  `heptacert\backend\_archive_lms\lms_extended_api.py`
- `DELETE` `/api/admin/lms/courses/{course_id}/attendance-sessions/{session_id}` params(course_id, session_id) [auth, db]
  `heptacert\backend\_archive_lms\lms_extended_api.py`
- `GET` `/api/admin/lms/courses/{course_id}/attendance-sessions/{session_id}/records` params(course_id, session_id) [auth, db]
  `heptacert\backend\_archive_lms\lms_extended_api.py`
- `PUT` `/api/admin/lms/courses/{course_id}/attendance-sessions/{session_id}/records` params(course_id, session_id) [auth, db]
  `heptacert\backend\_archive_lms\lms_extended_api.py`
- `GET` `/api/admin/lms/bridges` [auth, db]
  `heptacert\backend\_archive_lms\lms_extended_api.py`
- `POST` `/api/admin/lms/bridges` [auth, db]
  `heptacert\backend\_archive_lms\lms_extended_api.py`
- `PATCH` `/api/admin/lms/bridges/{bridge_id}/toggle` params(bridge_id) [auth, db]
  `heptacert\backend\_archive_lms\lms_extended_api.py`
- `PATCH` `/api/admin/lms/announcements/{announcement_id}` params(announcement_id) [auth, db]
  `heptacert\backend\_archive_lms\lms_extended_api.py`
- `DELETE` `/api/admin/lms/announcements/{announcement_id}` params(announcement_id) [auth, db]
  `heptacert\backend\_archive_lms\lms_extended_api.py`
- `GET` `/api/admin/lms/courses/{course_id}/quizzes` params(course_id) [auth, db]
  `heptacert\backend\_archive_lms\lms_extended_api.py`
- `POST` `/api/admin/lms/courses/{course_id}/quizzes` params(course_id) [auth, db]
  `heptacert\backend\_archive_lms\lms_extended_api.py`
- `GET` `/api/admin/lms/quizzes/{quiz_id}` params(quiz_id) [auth, db]
  `heptacert\backend\_archive_lms\lms_extended_api.py`
- `PATCH` `/api/admin/lms/quizzes/{quiz_id}` params(quiz_id) [auth, db]
  `heptacert\backend\_archive_lms\lms_extended_api.py`
- `DELETE` `/api/admin/lms/quizzes/{quiz_id}` params(quiz_id) [auth, db]
  `heptacert\backend\_archive_lms\lms_extended_api.py`
- `POST` `/api/admin/lms/quizzes/{quiz_id}/questions` params(quiz_id) [auth, db]
  `heptacert\backend\_archive_lms\lms_extended_api.py`
- `PATCH` `/api/admin/lms/questions/{question_id}` params(question_id) [auth, db]
  `heptacert\backend\_archive_lms\lms_extended_api.py`
- `DELETE` `/api/admin/lms/questions/{question_id}` params(question_id) [auth, db]
  `heptacert\backend\_archive_lms\lms_extended_api.py`
- `PUT` `/api/admin/lms/questions/{question_id}/choices` params(question_id) [auth, db]
  `heptacert\backend\_archive_lms\lms_extended_api.py`
- `GET` `/api/admin/lms/quizzes/{quiz_id}/attempts` params(quiz_id) [auth, db]
  `heptacert\backend\_archive_lms\lms_extended_api.py`
- `DELETE` `/api/admin/lms/bridges/{bridge_id}` params(bridge_id) [auth, db]
  `heptacert\backend\_archive_lms\lms_extended_api.py`
- `GET` `/api/admin/lms/analytics` [auth, db]
  `heptacert\backend\_archive_lms\lms_extended_api.py`
- `GET` `/api/admin/lms/courses/{course_id}/analytics` params(course_id) [auth, db]
  `heptacert\backend\_archive_lms\lms_extended_api.py`
- `GET` `/api/admin/lms/courses/{course_id}/analytics/funnel` params(course_id) [auth, db]
  `heptacert\backend\_archive_lms\lms_extended_api.py`
- `GET` `/api/admin/lms/analytics/compliance` [auth, db]
  `heptacert\backend\_archive_lms\lms_extended_api.py`
- `GET` `/api/admin/lms/analytics/outcomes` [auth, db]
  `heptacert\backend\_archive_lms\lms_extended_api.py`

## Source Files

Read these before implementing or modifying this subsystem:
- `heptacert\backend\src\accreditation_api.py`
- `heptacert\backend\src\ai_content_api.py`
- `heptacert\backend\src\ai_proactive_api.py`
- `heptacert\backend\src\analytics_api.py`
- `heptacert\backend\src\api_keys_ext_api.py`
- `heptacert\backend\src\audience_segments_api.py`
- `heptacert\backend\src\automation_api.py`
- `heptacert\backend\src\bulk_generate_api.py`
- `heptacert\backend\src\certificate_templates_api.py`
- `heptacert\backend\src\certificate_tiers_api.py`
- `heptacert\backend\src\checkin_ops_api.py`
- `heptacert\backend\src\crm_accounts_api.py`
- `heptacert\backend\src\crm_sequences_api.py`
- `heptacert\backend\src\domains_api.py`
- `heptacert\backend\src\email_api.py`
- `heptacert\backend\src\event_crm_api.py`
- `heptacert\backend\src\event_extras_api.py`
- `heptacert\backend\src\event_sponsors_api.py`
- `heptacert\backend\src\lead_forms_api.py`
- `heptacert\backend\src\learning_path_api.py`
- `heptacert\backend\src\lti_api.py`
- `heptacert\backend\src\main.py`
- `heptacert\backend\src\marketplace_api.py`
- `heptacert\backend\src\ms_excel_api.py`
- `heptacert\backend\src\notification_integrations_api.py`
- `heptacert\backend\src\oauth_api.py`
- `heptacert\backend\src\organization_access_api.py`
- `heptacert\backend\src\org_analytics_api.py`
- `heptacert\backend\src\org_modules_api.py`
- `heptacert\backend\src\org_staff_api.py`
- `heptacert\backend\src\product_telemetry_api.py`
- `heptacert\backend\src\quiz_api.py`
- `heptacert\backend\src\raffles_api.py`
- `heptacert\backend\src\report_scheduler_api.py`
- `heptacert\backend\src\social_api.py`
- `heptacert\backend\src\survey_config_api.py`
- `heptacert\backend\src\template_history_api.py`
- `heptacert\backend\src\tickets_api.py`
- `heptacert\backend\src\training_api.py`
- `heptacert\backend\src\venues_api.py`
- `heptacert\backend\src\venue_reservations_api.py`
- `heptacert\backend\_archive_lms\lms_api.py`
- `heptacert\backend\_archive_lms\lms_extended_api.py`

---
_Back to [overview.md](./overview.md)_