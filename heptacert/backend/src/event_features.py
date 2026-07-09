from __future__ import annotations

from typing import Any


EVENT_TYPE_CERTIFICATE = "certificate_event"
EVENT_TYPES = {
    EVENT_TYPE_CERTIFICATE,
    "seminar",
    "workshop",
    "conference",
    "concert",
    "training",
    "club_event",
    "online_event",
    "custom",
}

FEATURE_DEFAULTS = {
    "certificate_enabled": True,
    "checkin_enabled": True,
    "ticketing_enabled": False,
    "registration_enabled": True,
    "raffles_enabled": False,
    "gamification_enabled": False,
    "requires_approval": False,
    "quiz_enabled": False,
    "cpd_enabled": False,
    "agenda_enabled": False,
    "cfp_enabled": False,
    "networking_meetings_enabled": False,
    "live_engagement_enabled": False,
}

# Per-event-type default toggle sets (ADR-0018). These are *starting points* applied at
# event creation when the client does not explicitly send a flag; they never override an
# explicitly-provided value, and they never retroactively change an existing event.
# Only keys present here override FEATURE_DEFAULTS — unlisted flags fall back to it, so a
# new feature flag added later automatically inherits its FEATURE_DEFAULTS value until a
# preset opts in. Event types not listed (e.g. certificate_event, custom) use the minimal
# safe FEATURE_DEFAULTS set. Only reference flags that already exist as Event columns.
PRESET_BY_EVENT_TYPE: dict[str, dict[str, bool]] = {
    "seminar": {
        "certificate_enabled": True,
        "checkin_enabled": True,
        "registration_enabled": True,
    },
    "workshop": {
        "certificate_enabled": True,
        "checkin_enabled": True,
        "registration_enabled": True,
        "quiz_enabled": True,
        "cpd_enabled": True,
    },
    "training": {
        "certificate_enabled": True,
        "checkin_enabled": True,
        "registration_enabled": True,
        "quiz_enabled": True,
        "cpd_enabled": True,
    },
    "conference": {
        "certificate_enabled": True,
        "checkin_enabled": True,
        "registration_enabled": True,
        "ticketing_enabled": True,
        "agenda_enabled": True,
        "cfp_enabled": True,
        "networking_meetings_enabled": True,
        "live_engagement_enabled": True,
    },
    "concert": {
        "certificate_enabled": False,
        "checkin_enabled": True,
        "registration_enabled": True,
        "ticketing_enabled": True,
    },
    "club_event": {
        "certificate_enabled": False,
        "checkin_enabled": True,
        "registration_enabled": True,
        "gamification_enabled": True,
    },
    "online_event": {
        "certificate_enabled": True,
        "checkin_enabled": False,
        "registration_enabled": True,
        "agenda_enabled": True,
    },
}


def normalize_event_type(raw_value: Any) -> str:
    value = str(raw_value or "").strip().lower()
    return value if value in EVENT_TYPES else EVENT_TYPE_CERTIFICATE


def resolved_feature_defaults(event_type: Any) -> dict[str, bool]:
    """Feature defaults for an event type: the type preset overlaid on FEATURE_DEFAULTS.

    Used at event creation so that picking a type (e.g. "conference") seeds a coherent
    toggle set without the organizer flipping each switch. Unlisted flags fall back to
    FEATURE_DEFAULTS, so this is forward-compatible with future feature flags."""
    merged = dict(FEATURE_DEFAULTS)
    merged.update(PRESET_BY_EVENT_TYPE.get(normalize_event_type(event_type), {}))
    return merged


def normalize_feature_bool(raw_value: Any, *, default: bool) -> bool:
    if raw_value is None:
        return default
    if isinstance(raw_value, bool):
        return raw_value
    if isinstance(raw_value, (int, float)):
        return bool(raw_value)
    if isinstance(raw_value, str):
        value = raw_value.strip().lower()
        if value in {"1", "true", "yes", "on", "enabled"}:
            return True
        if value in {"0", "false", "no", "off", "disabled"}:
            return False
    return default


def feature_value(event: Any, field_name: str) -> bool:
    default = bool(FEATURE_DEFAULTS[field_name])
    return normalize_feature_bool(getattr(event, field_name, None), default=default)


def is_public_registration_enabled(event: Any) -> bool:
    return feature_value(event, "registration_enabled")


def is_certificate_enabled(event: Any) -> bool:
    return feature_value(event, "certificate_enabled")


def is_checkin_enabled(event: Any) -> bool:
    return feature_value(event, "checkin_enabled")


def is_ticketing_enabled(event: Any) -> bool:
    return feature_value(event, "ticketing_enabled")


def is_raffles_enabled(event: Any) -> bool:
    return feature_value(event, "raffles_enabled")


def is_gamification_enabled(event: Any) -> bool:
    return feature_value(event, "gamification_enabled")


def is_quiz_enabled(event: Any) -> bool:
    return feature_value(event, "quiz_enabled")


def is_cpd_enabled(event: Any) -> bool:
    return feature_value(event, "cpd_enabled")


def is_approval_required(event: Any) -> bool:
    """Whether new registrations must be approved by an admin before they count
    (e.g. after confirming an offline/bank payment). Gates check-in + certificate."""
    return feature_value(event, "requires_approval")


def is_agenda_enabled(event: Any) -> bool:
    """Whether the structured conference agenda (tracks, rooms, timed sessions,
    speakers, public agenda view + calendar export) is surfaced for this event.
    Independent of check-in: an agenda can exist without QR attendance (WP20)."""
    return feature_value(event, "agenda_enabled")


def is_cfp_enabled(event: Any) -> bool:
    """Whether the Call-for-Papers / abstract submission + review workflow is
    active for this event (WP21): speakers submit abstracts, reviewers score them
    against a rubric, and accepted talks become agenda sessions."""
    return feature_value(event, "cfp_enabled")


def is_networking_meetings_enabled(event: Any) -> bool:
    """Whether attendee networking + 1:1 meeting scheduling is active for this
    event (WP22): members discover each other, request meetings, accept/decline.
    Builds on the connection graph; blocked/private members are excluded."""
    return feature_value(event, "networking_meetings_enabled")


def is_live_engagement_enabled(event: Any) -> bool:
    """Whether real-time in-session engagement is active for this event (WP23):
    live audience Q&A (submit/upvote/moderate) and live polls. Member-authenticated,
    rate-limited; complements the async quiz/survey tooling."""
    return feature_value(event, "live_engagement_enabled")
