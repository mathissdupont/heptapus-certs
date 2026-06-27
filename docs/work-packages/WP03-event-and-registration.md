# WP03 — Event & Registration Management

**Phase:** 1 — Core event lifecycle · **Status:** ✅ Delivered · **Related ADRs:** [0004](../adr/0004-postgresql-alembic-jsonb.md), [0007](../adr/0007-plan-feature-policy-single-source.md)

## Objective
Let organizers create and operate events end to end: configurable events, custom
registration forms, ticket types and capacity, public event pages, and the feature
flags that toggle each module per event.

## Scope
**In:** event CRUD and lifecycle; per-event feature flags; custom registration forms
(conditional fields, document uploads, approval); ticket types and capacities;
public registration and event pages; participant management and import/export.
**Out:** check-in (WP04), certificates (WP05), marketing email (WP06).

## Key deliverables
- Event model with type, visibility, schedule, branding, and feature toggles.
- Registration form builder: typed fields, conditional logic, file uploads, quotas.
- Ticket types with per-option capacity tracking.
- Public, SEO-friendly event and registration pages.
- Attendee records with registration answers; bulk import/export.
- Email-verification gate for public registration.

## Key components
- `heptacert/backend/src/main.py` — event endpoints, `sanitize_event_description_html`.
- `heptacert/backend/src/event_features.py` — `is_public_registration_enabled`, `is_certificate_enabled`, `is_checkin_enabled`, feature normalization.
- `heptacert/backend/src/event_extras_api.py` — registration fields, ticket types.
- `heptacert/backend/src/models.py` — `Event`, `Attendee`, ticket/registration models.
- `heptacert/frontend/src/app/admin/events/` — event admin UIs.
- `heptacert/frontend/src/app/events/[id]/register/` — public registration.
- Migrations: `004_event_banner`, `022_event_public_id`, `037_registration_option_capacities`, `038_event_feature_flags`, `039_event_tickets`, `098_event_ticket_types`, `018_att_reg_answers`.

## Acceptance criteria
- An event can be created, configured, published, and closed.
- Registration honors required fields, conditional logic, quotas, and capacity.
- Per-event feature flags correctly enable/disable downstream modules.
- Participants can be imported/exported without data loss.

## Dependencies & related ADRs
Upstream: WP01, WP02. Downstream: WP04, WP05, WP06, WP07, WP08, WP10. See ADR-0004.
