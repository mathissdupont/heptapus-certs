# ADR-0018 — Event-Type Feature Presets

**Status:** Accepted · **Date:** 2026-06-30 · **Related:** [0017](0017-per-event-feature-toggles-two-layer-gate.md)

## Context
With the two-layer toggle convention (ADR-0017), the number of per-event flags grows
with every roadmap feature. If organizers must configure each flag manually, the
"create event" experience becomes a wall of switches — exactly the complexity we want
to avoid. The `Event.event_type` field already exists (`certificate_event`, `seminar`,
`workshop`, `conference`, `concert`, `training`, `club_event`, `online_event`, `custom`)
but currently carries no behavior; it only labels the event.

## Decision
Make `event_type` drive a **preset of sensible default toggles**. A
`PRESET_BY_EVENT_TYPE: dict[str, dict[str, bool]]` map in `event_features.py` defines,
per type, which features start enabled (e.g. `conference` → registration + check-in +
agenda + speakers + ticketing; `concert` → ticketing + registration + check-in).

- On event creation (or when the organizer changes the type), the preset is applied as
  the **starting point**; individual toggles remain freely overridable in an "Advanced"
  settings section.
- Presets only set event-layer defaults. The plan layer (ADR-0017) still independently
  decides whether the org may use a feature at all — a preset never bypasses plan gating.
- Unknown/`custom` types fall back to the minimal safe set (registration + certificate +
  check-in), matching `normalize_event_type`'s existing default.

## Consequences
- Default "create event" UX stays simple: pick a type, get a coherent set, tweak only
  if needed. Complexity is opt-in, not mandatory.
- Presets are data, not logic — adding a type or adjusting a default is a one-line map
  change, testable in isolation.
- Trade-off: presets are *defaults only*. Changing a preset does not retroactively alter
  existing events (their flags are already persisted) — intentional, to avoid surprise
  behavior changes on live events.
