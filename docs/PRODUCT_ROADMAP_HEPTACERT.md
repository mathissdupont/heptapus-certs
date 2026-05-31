# HeptaCert Product Roadmap

This roadmap tracks the feature direction discussed for turning HeptaCert from a certificate tool into a broader event, credential, community, and organization operations platform.

## Engineering Rule

- New feature areas should be implemented as focused modules such as `*_api.py` instead of adding more endpoint logic directly to `backend/src/main.py`.
- `main.py` may keep shared models, legacy endpoints, and router registration, but new product surfaces should prefer dedicated modules.
- If a feature needs database persistence and can fit an existing JSON config safely, use that for small preferences; use Alembic migrations for durable product data.

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

## Revenue Packaging Notes

- Enterprise: white-label domain, hidden HeptaCert branding, organization access control, API and webhooks
- Growth: automation, segmentation, advanced analytics, bulk email, certificate templates
- Add-on candidates: venue reservations, training compliance, high-volume credential archive
