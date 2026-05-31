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
- [ ] Font, color, logo, footer, and brand-kit controls
- [ ] Save reusable organization template presets
- [x] Template validation before certificate generation

## Phase 3 - Post-Event Automation

- [ ] Automation rule builder per event
- [ ] Trigger: attended event
- [ ] Trigger: registered but no-show
- [ ] Trigger: certificate issued
- [ ] Trigger: survey not completed
- [ ] Trigger: badge earned
- [ ] Actions: send email, create reminder, webhook dispatch

## Phase 4 - Audience Segmentation

- [ ] Segment: attended but no certificate
- [ ] Segment: certificate holders
- [ ] Segment: survey respondents
- [ ] Segment: no-shows
- [ ] Segment: repeat attendees
- [ ] Segment: location or custom registration answer filters
- [ ] Use segments in bulk email and exports

## Phase 5 - Event CRM

- [ ] Organization-level participant history
- [ ] Member/attendee notes
- [ ] Tags and lifecycle status
- [ ] Payment, attendance, survey, certificate timeline
- [ ] Organization-level search across all attendees

## Phase 6 - Training and Renewal

- [ ] Training assignment model for organizations
- [ ] Required training completion tracking
- [ ] Department/team-based reporting
- [ ] Certificate renewal schedule
- [ ] Expiring certificate notifications
- [ ] Renewal event recommendations

## Phase 7 - Staff and Kiosk Mode

- [ ] Mobile-first staff check-in mode
- [ ] Kiosk mode for QR scanning
- [ ] Offline check-in cache
- [ ] Manual lookup for door teams
- [ ] Door traffic and staff performance metrics

## Revenue Packaging Notes

- Enterprise: white-label domain, hidden HeptaCert branding, organization access control, API and webhooks
- Growth: automation, segmentation, advanced analytics, bulk email, certificate templates
- Add-on candidates: venue reservations, training compliance, high-volume credential archive
