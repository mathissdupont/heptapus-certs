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
}


def normalize_event_type(raw_value: Any) -> str:
    value = str(raw_value or "").strip().lower()
    return value if value in EVENT_TYPES else EVENT_TYPE_CERTIFICATE


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
