"""Central plan policy registry used by backend gates and frontend metadata."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Iterable, Optional


PLAN_ORDER = {
    "starter": 0,
    "free": 0,
    "pro": 1,
    "growth": 2,
    "enterprise": 3,
}


@dataclass(frozen=True)
class FeaturePolicy:
    key: str
    required_plans: tuple[str, ...]
    title_tr: str
    title_en: str
    enterprise_only_for_staff: bool = False


FEATURE_POLICIES: dict[str, FeaturePolicy] = {
    "checkin": FeaturePolicy("checkin", ("pro", "growth", "enterprise"), "Check-in", "Check-in"),
    "ticketing": FeaturePolicy("ticketing", ("pro", "growth", "enterprise"), "Biletleme", "Ticketing"),
    "automation": FeaturePolicy("automation", ("growth", "enterprise"), "Otomasyon", "Automation"),
    "segmentation": FeaturePolicy("segmentation", ("growth", "enterprise"), "Katılımcı segmentasyonu", "Audience segmentation"),
    "crm": FeaturePolicy("crm", ("enterprise",), "Event CRM", "Event CRM", True),
    "training": FeaturePolicy("training", ("enterprise",), "Kurum içi eğitim", "Training compliance", True),
    "certificate_templates": FeaturePolicy("certificate_templates", ("growth", "enterprise"), "Sertifika şablonları", "Certificate templates"),
    "kiosk": FeaturePolicy("kiosk", ("enterprise",), "Kiosk modu", "Kiosk mode", True),
    "health": FeaturePolicy("health", ("enterprise",), "Platform sağlığı", "Platform health", True),
}


def normalize_plan(plan_id: Optional[str]) -> str:
    return str(plan_id or "starter").strip().lower()


def plan_allows(plan_id: Optional[str], required_plans: Iterable[str]) -> bool:
    plan = normalize_plan(plan_id)
    required = {normalize_plan(item) for item in required_plans}
    if plan in required:
        return True
    if not required:
        return True
    min_rank = min(PLAN_ORDER.get(item, 99) for item in required)
    return PLAN_ORDER.get(plan, -1) >= min_rank


def subscription_is_active_plan(subscription: object | None, required_plans: Iterable[str]) -> bool:
    if subscription is None:
        return False
    if not plan_allows(getattr(subscription, "plan_id", None), required_plans):
        return False
    expires_at = getattr(subscription, "expires_at", None)
    if expires_at is None:
        return True
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    return expires_at >= datetime.now(timezone.utc)


def feature_policy_payload() -> list[dict[str, object]]:
    return [
        {
            "key": policy.key,
            "required_plans": list(policy.required_plans),
            "title_tr": policy.title_tr,
            "title_en": policy.title_en,
            "enterprise_only_for_staff": policy.enterprise_only_for_staff,
        }
        for policy in FEATURE_POLICIES.values()
    ]
