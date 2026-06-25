"""Central subscription and feature policy registry.

This module is intentionally pure: no database access and no framework imports.
Backend guards, tests, and frontend metadata can all depend on the same plan
shape without duplicating product decisions across the codebase.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Iterable, Optional


PLAN_IDS = ("starter", "pro", "growth", "enterprise")
PAID_PLAN_IDS = ("pro", "growth", "enterprise")

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


@dataclass(frozen=True)
class PlanDefinition:
    id: str
    title_tr: str
    title_en: str
    position: str
    included_features: tuple[str, ...]
    excluded_features: tuple[str, ...] = ()


FEATURE_POLICIES: dict[str, FeaturePolicy] = {
    "checkin": FeaturePolicy("checkin", ("pro", "growth", "enterprise"), "Check-in", "Check-in"),
    "ticketing": FeaturePolicy("ticketing", ("pro", "growth", "enterprise"), "Biletleme", "Ticketing"),
    "bulk_certificates": FeaturePolicy("bulk_certificates", ("pro", "growth", "enterprise"), "Toplu sertifika", "Bulk certificates"),
    "custom_registration": FeaturePolicy("custom_registration", ("pro", "growth", "enterprise"), "Ozel kayit formlari", "Custom registration"),
    "automation": FeaturePolicy("automation", ("growth", "enterprise"), "Otomasyon", "Automation"),
    "email": FeaturePolicy("email", ("growth", "enterprise"), "Toplu e-posta", "Bulk email"),
    "segmentation": FeaturePolicy("segmentation", ("growth", "enterprise"), "Katilimci segmentasyonu", "Audience segmentation"),
    "advanced_analytics": FeaturePolicy("advanced_analytics", ("growth", "enterprise"), "Gelismis analitik", "Advanced analytics"),
    "webhooks": FeaturePolicy("webhooks", ("growth", "enterprise"), "Webhook API", "Webhook API"),
    "domains": FeaturePolicy("domains", ("growth", "enterprise"), "Ozel alan adi", "Custom domains"),
    "branding": FeaturePolicy("branding", ("growth", "enterprise"), "Marka yonetimi", "Branding"),
    "api": FeaturePolicy("api", ("growth", "enterprise"), "API erisimi", "API access"),
    "certificate_templates": FeaturePolicy("certificate_templates", ("growth", "enterprise"), "Sertifika sablonlari", "Certificate templates"),
    "presentations": FeaturePolicy("presentations", ("growth", "enterprise"), "Sunumlar", "Presentations"),
    "raffles": FeaturePolicy("raffles", ("growth", "enterprise"), "Cekilisler", "Raffles"),
    "accreditation": FeaturePolicy("accreditation", ("enterprise",), "Akreditasyon", "Accreditation", True),
    "crm": FeaturePolicy("crm", ("enterprise",), "Event CRM", "Event CRM", True),
    "lead_forms": FeaturePolicy("lead_forms", ("enterprise",), "Lead formlari", "Lead forms", True),
    "integrations": FeaturePolicy("integrations", ("enterprise",), "Kurumsal entegrasyonlar", "Enterprise integrations", True),
    "lms": FeaturePolicy("lms", ("enterprise",), "LMS", "LMS", True),
    "training": FeaturePolicy("training", ("enterprise",), "Kurum ici egitim", "Training compliance", True),
    "team": FeaturePolicy("team", ("enterprise",), "Organizasyon ekibi", "Organization team", True),
    "reports": FeaturePolicy("reports", ("enterprise",), "Planli raporlar", "Scheduled reports", True),
    "sso": FeaturePolicy("sso", ("enterprise",), "SSO", "SSO", True),
    "kiosk": FeaturePolicy("kiosk", ("enterprise",), "Kiosk modu", "Kiosk mode", True),
    "health": FeaturePolicy("health", ("enterprise",), "Platform sagligi", "Platform health", True),
}


def _features_allowed_by(plan_id: str) -> tuple[str, ...]:
    return tuple(key for key, policy in FEATURE_POLICIES.items() if plan_id in policy.required_plans)


def _features_blocked_for(plan_id: str) -> tuple[str, ...]:
    return tuple(key for key, policy in FEATURE_POLICIES.items() if plan_id not in policy.required_plans)


PLAN_CATALOG: dict[str, PlanDefinition] = {
    "starter": PlanDefinition(
        "starter",
        "Baslangic",
        "Starter",
        "Free verification and light certificate issuing.",
        ("certificate_verification", "basic_editor", "public_profiles", "community_read"),
        tuple(FEATURE_POLICIES.keys()),
    ),
    "pro": PlanDefinition(
        "pro",
        "Profesyonel",
        "Professional",
        "Paid event operations: registration, check-in, tickets, and bulk issuing.",
        _features_allowed_by("pro"),
        _features_blocked_for("pro"),
    ),
    "growth": PlanDefinition(
        "growth",
        "Buyume",
        "Growth",
        "Growth operations with email, automation, analytics, API, branding, and audience workflows.",
        _features_allowed_by("growth"),
        _features_blocked_for("growth"),
    ),
    "enterprise": PlanDefinition(
        "enterprise",
        "Kurumsal",
        "Enterprise",
        "Organization-grade collaboration, CRM, LMS, compliance, SSO, and managed operations.",
        tuple(FEATURE_POLICIES.keys()),
        (),
    ),
}


def normalize_plan(plan_id: Optional[str]) -> str:
    return str(plan_id or "starter").strip().lower() or "starter"


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
    if getattr(subscription, "is_active", True) is False:
        return False
    if not plan_allows(getattr(subscription, "plan_id", None), required_plans):
        return False
    expires_at = getattr(subscription, "expires_at", None)
    if expires_at is None:
        return True
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    return expires_at >= datetime.now(timezone.utc)


def feature_required_plans(feature_key: str) -> tuple[str, ...]:
    policy = FEATURE_POLICIES.get(feature_key)
    if policy is None:
        raise KeyError(f"Unknown feature policy: {feature_key}")
    return policy.required_plans


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


def plan_catalog_payload() -> list[dict[str, object]]:
    return [
        {
            "id": plan.id,
            "title_tr": plan.title_tr,
            "title_en": plan.title_en,
            "position": plan.position,
            "included_features": list(plan.included_features),
            "excluded_features": list(plan.excluded_features),
        }
        for plan in PLAN_CATALOG.values()
    ]
