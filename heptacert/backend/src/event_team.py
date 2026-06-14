"""Etkinlik ekibi (event team) rol/izin sabitleri ve yardimcilari.

main.py'dan ayiklandi (god-dosya bolme). Hem SQLAlchemy modelleri/handler'lar
(main.py) hem Pydantic semalari (schemas.py) bu sabitleri kullanir; ayri modulde
tutulmasi sema ayiklamasindaki dongusel importu onler. main.py bunlari tekrar
export eder.
"""

from __future__ import annotations

from typing import Dict, List, Optional

EVENT_TEAM_ROLES = {"manager", "checkin", "certificate", "email", "analytics", "viewer"}
EVENT_TEAM_STATUSES = {"pending", "active", "disabled"}
EVENT_TEAM_ROLE_PERMISSIONS: Dict[str, set[str]] = {
    "manager": {"event:view", "team:manage", "attendees:read", "attendees:write", "checkin:write", "certificates:write", "email:write", "analytics:read", "settings:write"},
    "checkin": {"event:view", "attendees:read", "checkin:write"},
    "certificate": {"event:view", "attendees:read", "certificates:write"},
    "email": {"event:view", "attendees:read", "email:write"},
    "analytics": {"event:view", "analytics:read"},
    "viewer": {"event:view"},
}
EVENT_TEAM_PERMISSION_LABELS: Dict[str, str] = {
    "event:view": "Etkinligi goruntuleyebilir",
    "team:manage": "Ekip uyelerini ve yetkilerini yonetebilir",
    "attendees:read": "Katılımcı listesini görebilir",
    "attendees:write": "Katılımcı ekleyebilir, içe aktarabilir ve silebilir",
    "checkin:write": "Check-in ve bilet kontrolu yapabilir",
    "certificates:write": "Sertifika olusturabilir ve sertifika islemleri yapabilir",
    "email:write": "E-posta sablonlari ve toplu e-posta islemlerini yonetebilir",
    "analytics:read": "Analitik ekranlarını görebilir",
    "settings:write": "Etkinlik ayarlarini degistirebilir",
}


def _normalize_event_team_permissions(raw_permissions: Optional[List[str]]) -> Optional[List[str]]:
    if raw_permissions is None:
        return None
    allowed = set(EVENT_TEAM_PERMISSION_LABELS.keys())
    normalized = list(dict.fromkeys(str(item).strip() for item in raw_permissions if str(item).strip()))
    invalid = [item for item in normalized if item not in allowed]
    if invalid:
        raise ValueError(f"invalid permissions: {', '.join(invalid)}")
    if "event:view" not in normalized:
        normalized.insert(0, "event:view")
    return normalized


def _effective_event_team_permissions(member: "EventTeamMember") -> List[str]:  # noqa: F821 (string annotation)
    if isinstance(member.permissions, list) and member.permissions:
        try:
            normalized = _normalize_event_team_permissions([str(item) for item in member.permissions])
            return normalized or []
        except ValueError:
            return ["event:view"]
    defaults = EVENT_TEAM_ROLE_PERMISSIONS.get((member.role or "").strip().lower(), {"event:view"})
    return sorted(defaults)


__all__ = [
    "EVENT_TEAM_ROLES",
    "EVENT_TEAM_STATUSES",
    "EVENT_TEAM_ROLE_PERMISSIONS",
    "EVENT_TEAM_PERMISSION_LABELS",
    "_normalize_event_team_permissions",
    "_effective_event_team_permissions",
]
