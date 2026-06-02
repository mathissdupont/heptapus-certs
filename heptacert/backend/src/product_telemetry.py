"""Privacy-safe product telemetry helpers."""

from __future__ import annotations

from typing import Any


ALLOWED_EVENTS = {
    "feature_open",
    "export_started",
    "automation_tested",
    "segment_previewed",
    "checkin_scan",
    "training_report_exported",
}


def sanitize_metadata(raw: dict[str, Any]) -> dict[str, Any]:
    safe: dict[str, Any] = {}
    for key, value in raw.items():
        normalized = str(key).strip()[:40]
        if normalized.lower() in {"email", "name", "phone", "token", "message", "body", "content"}:
            continue
        if isinstance(value, (str, int, float, bool)) or value is None:
            safe[normalized] = value if not isinstance(value, str) else value[:120]
    return safe
