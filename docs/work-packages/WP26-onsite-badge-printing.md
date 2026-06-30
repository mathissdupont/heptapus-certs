# WP26 — On-Site Badge Design & Printing

**Phase:** 5 — Competitive expansion · **Status:** 📐 Planned · **Related ADRs:** [0017](../adr/0017-per-event-feature-toggles-two-layer-gate.md), [0010](../adr/0010-certificate-generation-and-verification.md)

## Objective
Add physical name-badge design and on-site printing at check-in, reusing the existing
certificate/PDF generation pipeline. Closes the gap versus Cvent OnArrival for large
in-person events.

## Scope
**In:** badge template designer (reuse certificate template engine); badge layout with
attendee fields + QR; print-on-check-in trigger; badge size/printer-friendly output.
**Out:** vendor-specific printer drivers (rely on standard PDF/browser print); badge stock procurement.

## Key deliverables
- Badge template model + designer (extends certificate generator, ADR-0010).
- `Event.badge_print_enabled` flag + helper + `FeaturePolicy` (pro+).
- Print trigger integrated into the existing check-in/kiosk flow.
- Print-ready PDF output sized for common badge stock.

## Key components
- `heptacert/backend/src/generator.py` — badge rendering (reuse certificate pipeline).
- `heptacert/backend/src/models.py` — badge template model.
- `heptacert/backend/src/event_features.py`, `plan_policy.py` — gating.
- `heptacert/frontend/` — badge designer + kiosk print action.
- Migration: badge template table + `events.badge_print_enabled`.

## Acceptance criteria
- A designed badge renders correctly with attendee data + QR and prints at check-in.
- Badge printing is available only when the event toggle and plan gate pass.
- Reuses certificate generation rather than introducing a second rendering stack.

## Dependencies & related ADRs
Upstream: WP04, WP05, WP17. See ADR-0010, ADR-0017.
