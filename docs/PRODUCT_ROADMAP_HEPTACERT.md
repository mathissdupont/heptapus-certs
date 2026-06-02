# HeptaCert Product Roadmap

This roadmap tracks the feature direction discussed for turning HeptaCert from a certificate tool into a broader event, credential, community, and organization operations platform.

## Engineering Rule

- New feature areas should be implemented as focused modules such as `*_api.py` instead of adding more endpoint logic directly to `backend/src/main.py`.
- `main.py` may keep shared models, legacy endpoints, and router registration, but new product surfaces should prefer dedicated modules.
- If a feature needs database persistence, add or evolve real tables with Alembic migrations. Runtime/system config should stay limited to true global settings such as pricing, stats, and payment provider configuration.

## Phase 1 - Credential Wallet and Sharing

- [x] Public member certificate wallet on member profiles
- [x] Certificate verification sharing actions
- [x] LinkedIn add-to-profile flow on certificate verification
- [x] Member privacy toggle for hiding the certificate wallet
- [x] Visibility levels for certificate wallet: public, connections-only, private
- [x] Certificate share card image for social posts
- [x] CV-ready certificate export summary

## Phase 2 - Smarter Certificate Templates

- [x] Live certificate template preview in admin
- [x] Drag-and-drop field positioning
- [x] Font, color, logo, footer, and brand-kit controls
- [x] Save reusable organization template presets
- [x] Template validation before certificate generation

## Phase 3 - Post-Event Automation

- [x] Automation rule builder per event
- [x] Trigger: attended event
- [x] Trigger: registered but no-show
- [x] Trigger: certificate issued
- [x] Trigger: survey not completed
- [x] Trigger: badge earned
- [x] Actions: send email, create reminder, webhook dispatch
- [x] Automation dispatch engine with scheduled and manual execution

## Phase 4 - Audience Segmentation

- [x] Segment: attended but no certificate
- [x] Segment: certificate holders
- [x] Segment: survey respondents
- [x] Segment: no-shows
- [x] Segment: repeat attendees
- [x] Segment: location or custom registration answer filters
- [x] Use segments in bulk email and exports

## Phase 5 - Event CRM

- [x] Organization-level participant history
- [x] Member/attendee notes
- [x] Tags and lifecycle status
- [x] Payment, attendance, survey, certificate timeline
- [x] Organization-level search across all attendees

## Phase 6 - Training and Renewal

- [x] Training assignment model for organizations
- [x] Required training completion tracking
- [x] Department/team-based reporting
- [x] Certificate renewal schedule
- [x] Expiring certificate notifications
- [x] Renewal event recommendations

## Phase 7 - Staff and Kiosk Mode

- [x] Mobile-first staff check-in mode
- [x] Kiosk mode for QR scanning
- [x] Offline check-in cache
- [x] Manual lookup for door teams
- [x] Door traffic and staff performance metrics

## Phase 8 - Hardening, Packaging, and Localization

- [x] Move new product data out of JSON config into Alembic-managed tables
- [x] Enforce Enterprise access for Event CRM and Training/Renewal
- [x] Enforce Growth/Enterprise access for Automation and Segmentation
- [x] Add check-in activity logging for QR, ticket, manual, duplicate, and failed attempts
- [x] Add frontend plan gates for CRM, Training, Automation, and Segmentation
- [x] Clean high-visibility Turkish UI copy in newly added admin screens
- [x] Add initial English/Turkish UI copy separation for CRM, Training, Segmentation, and Automation
- [ ] Continue deeper UI polish and full localization pass across older admin screens

## Phase 9 - Performance and Data Access Hardening

- [x] Add Alembic-managed indexes for CRM, segmentation, automation, training, check-in, wallet, and template queries
- [x] Replace CRM list N+1 queries with aggregate SQL and pagination
- [x] Add cursor/offset pagination to CRM, training assignments, check-in activity, automation logs, and segment previews
- [x] Make CRM detail loading lazy and non-blocking in the frontend
- [x] Add lightweight summary endpoints for dashboards instead of loading full records
- [x] Add query limits, bounded date ranges, and defensive caps to all exports/previews
- [x] Add response-time logging for new product endpoints

## Phase 10 - CRM Enterprise Upgrade

- [x] Add `participant_crm_snapshots` table for precomputed event count, attendance, surveys, tickets, certificates, and latest activity
- [x] Refresh CRM snapshots during CRM detail reads, explicit refreshes, merge flows, and selected exports
- [x] Add CRM activity audit log for notes, tags, lifecycle changes, owner changes, and manual edits
- [x] Add owner/assignee field, priority, lead score, custom fields, and next-follow-up date
- [x] Add saved CRM views and Enterprise filter payloads such as VIP, renewal due, high engagement, no-show risk
- [x] Add bulk CRM actions: tag, status update, assign owner
- [x] Add bulk CRM actions: export selected and send selected segment email
- [x] Add duplicate detection and merge flow for same participant across different emails
- [x] Improve CRM UI with scroll-contained list, selection toolbar, detail panel, loading states, and faster search debounce

## Phase 11 - Automation Reliability and Safety

- [x] Add durable automation execution log table with per-recipient/action status, retry count, error message, and timestamps
- [x] Move automation dispatch to a durable scheduler-backed queue with backoff and idempotency keys
- [x] Add per-event and per-organization automation rate limits
- [x] Validate webhook URLs against private IP/localhost SSRF targets
- [x] Add signed webhook payloads and delivery retry history
- [x] Add dry-run mode showing target count and sample recipients before enabling a rule
- [x] Add suppression rules so unsubscribed, bounced, or blocked recipients are skipped
- [x] Add automation UI timeline and error drill-down
- [x] Add event-driven CRM snapshot refresh hooks for attendee, check-in, ticket, certificate, and survey writes

## Phase 12 - Segmentation and Export Controls

- [x] Convert standard segment list counts to optimized aggregate queries
- [x] Convert segment previews to query-level pagination instead of in-memory filtering
- [x] Add saved segments with owner, visibility, and last computed count
- [x] Add segment composition builder with AND/OR groups instead of only fixed presets
- [x] Add export job queue for large segments instead of synchronous CSV downloads
- [x] Add optional Google Sheets sync for segment export jobs
- [x] Add export audit log with actor, filters, row count, IP, and timestamp
- [x] Add PII masking options and Enterprise-only full-data export policy
- [x] Add segment-to-CRM and segment-to-automation handoff flows

## Phase 13 - Training and Renewal Compliance

- [x] Add bulk assignment import and assignment templates by department/team
- [x] Add recurring training rules and auto-assignment for new participants/employees
- [x] Add completion evidence attachments or links
- [x] Add manager/department ownership and approval workflow
- [x] Add renewal notification execution log and retry state
- [x] Add compliance dashboard with overdue trend, department risk, and upcoming renewals
- [x] Add Enterprise CSV/PDF compliance report export with audit trail

## Phase 14 - Check-in, Kiosk, and Staff Operations

- [x] Add staff-scoped permissions for lookup, manual check-in, ticket scan, and metrics
- [x] Add check-in activity pagination and filterable operations log
- [x] Add offline queue signing or server-issued nonce to reduce tampering risk
- [x] Add kiosk session tokens with expiration and revocation
- [x] Add duplicate/invalid scan analytics by staff member and entry point
- [x] Add door capacity alerts and hourly traffic charts
- [x] Add mobile UI polish for scanner, lookup, and manual fallback states

## Phase 15 - Wallet, Sharing, and Certificate Template Polish

- [x] Add wallet analytics: profile views, certificate views, LinkedIn clicks, CV export clicks
- [x] Add wallet privacy audit and public preview mode
- [x] Add certificate share image caching and invalidation when certificate data changes
- [x] Add stricter template schema validation, versioning, and rollback
- [x] Add template preset permissions and Enterprise organization brand lock
- [x] Add template render regression snapshots for common field layouts
- [x] Add better bilingual UI copy for wallet, sharing, and template editor screens

## Phase 16 - Platform Packaging and QA

- [x] Centralize plan gates in backend policy helpers and frontend feature metadata
- [x] Add tests for Growth vs Enterprise access across every new endpoint
- [x] Add seed/demo data for CRM, automation, segmentation, training, and check-in QA
- [x] Add integration tests for automation dispatch, segment export, training notifications, and check-in logs
- [x] Add product telemetry events for feature usage without storing sensitive content
- [x] Add admin-facing health checks for worker, email, webhook, export, and scheduler status
- [x] Finish full Turkish/English localization pass and remove mojibake/English-keyboard Turkish strings

## Revenue Packaging Notes

- Enterprise: white-label domain, hidden HeptaCert branding, organization access control, API and webhooks
- Growth: automation, segmentation, advanced analytics, bulk email, certificate templates
- Add-on candidates: venue reservations, training compliance, high-volume credential archive
