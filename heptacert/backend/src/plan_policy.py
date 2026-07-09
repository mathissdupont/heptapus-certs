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
    # Commercial definition (single source of truth for pricing UI + billing).
    price_monthly: Optional[int] = None  # TRY; None = custom/contact sales
    price_annual: Optional[int] = None   # TRY (effective monthly when billed annually)
    hc_quota: Optional[int] = None       # monthly HeptaCoin quota; None = unlimited
    is_free: bool = False
    is_enterprise: bool = False
    marketing_tr: tuple[str, ...] = ()   # customer-facing feature bullets (TR)
    marketing_en: tuple[str, ...] = ()   # customer-facing feature bullets (EN)


FEATURE_POLICIES: dict[str, FeaturePolicy] = {
    "checkin": FeaturePolicy("checkin", ("pro", "growth", "enterprise"), "Check-in", "Check-in"),
    "ticketing": FeaturePolicy("ticketing", ("pro", "growth", "enterprise"), "Biletleme", "Ticketing"),
    "agenda": FeaturePolicy("agenda", ("starter", "pro", "growth", "enterprise"), "Ajanda", "Agenda"),
    "cfp": FeaturePolicy("cfp", ("growth", "enterprise"), "Bildiri Çağrısı (CFP)", "Call for Papers"),
    "networking": FeaturePolicy("networking", ("growth", "enterprise"), "Networking & 1:1 Toplantı", "Networking & Meetings"),
    "live_engagement": FeaturePolicy("live_engagement", ("pro", "growth", "enterprise"), "Canlı Katılım (Q&A + Poll)", "Live Engagement"),
    "bulk_certificates": FeaturePolicy("bulk_certificates", ("pro", "growth", "enterprise"), "Toplu sertifika", "Bulk certificates"),
    "custom_registration": FeaturePolicy("custom_registration", ("pro", "growth", "enterprise"), "Ozel kayit formlari", "Custom registration"),
    "automation": FeaturePolicy("automation", ("growth", "enterprise"), "Otomasyon", "Automation"),
    "email": FeaturePolicy("email", ("growth", "enterprise"), "Toplu e-posta", "Bulk email"),
    "segmentation": FeaturePolicy("segmentation", ("growth", "enterprise"), "Katilimci segmentasyonu", "Audience segmentation"),
    "advanced_analytics": FeaturePolicy("advanced_analytics", ("growth", "enterprise"), "Gelismis analitik", "Advanced analytics"),
    "webhooks": FeaturePolicy("webhooks", ("growth", "enterprise"), "Webhook API", "Webhook API"),
    "domains": FeaturePolicy("domains", ("growth", "enterprise"), "Ozel alan adi", "Custom domains"),
    "branding": FeaturePolicy("branding", ("pro", "growth", "enterprise"), "Marka yonetimi", "Branding"),
    "api": FeaturePolicy("api", ("growth", "enterprise"), "API erisimi", "API access"),
    "certificate_templates": FeaturePolicy("certificate_templates", ("pro", "growth", "enterprise"), "Sertifika sablonlari", "Certificate templates"),
    "presentations": FeaturePolicy("presentations", ("growth", "enterprise"), "Sunumlar", "Presentations"),
    "raffles": FeaturePolicy("raffles", ("growth", "enterprise"), "Cekilisler", "Raffles"),
    "accreditation": FeaturePolicy("accreditation", ("enterprise",), "Akreditasyon", "Accreditation", True),
    "crm": FeaturePolicy("crm", ("enterprise",), "Event CRM", "Event CRM", True),
    "lead_forms": FeaturePolicy("lead_forms", ("growth", "enterprise"), "Lead formlari", "Lead forms"),
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
        id="starter",
        title_tr="Başlangıç",
        title_en="Starter",
        position="Free verification and light certificate issuing.",
        included_features=("certificate_verification", "basic_editor", "public_profiles", "community_read"),
        excluded_features=tuple(FEATURE_POLICIES.keys()),
        price_monthly=0,
        price_annual=0,
        hc_quota=50,
        is_free=True,
        is_enterprise=False,
        marketing_tr=(
            "50 HC hoş geldin bonusu (tek seferlik)",
            "QR kod doğrulama",
            "Sertifika arşivi (1 yıl)",
            "Temel şablon editörü",
            "HeptaCert filigranı",
        ),
        marketing_en=(
            "50 HC welcome bonus (one-time)",
            "QR code verification",
            "Certificate archive (1 year)",
            "Basic template editor",
            "HeptaCert watermark",
        ),
    ),
    "pro": PlanDefinition(
        id="pro",
        title_tr="Profesyonel",
        title_en="Professional",
        position="Paid event operations: registration, check-in, tickets, and bulk issuing.",
        included_features=_features_allowed_by("pro"),
        excluded_features=_features_blocked_for("pro"),
        price_monthly=499,
        price_annual=399,
        hc_quota=500,
        is_free=False,
        is_enterprise=False,
        marketing_tr=(
            "Aylık 500 HC",
            "Sınırsız etkinlik",
            "Excel ile toplu basım",
            "Sertifika arşivi (3 yıl)",
            "Etkinlik kayıt ve check-in sistemi",
            "QR ile yoklama takibi",
            "Hazır sertifika şablonları",
            "Marka filigranını kaldırma",
            "Öncelikli destek",
        ),
        marketing_en=(
            "500 HC per month",
            "Unlimited events",
            "Excel bulk generation",
            "Certificate archive (3 years)",
            "Event registration & check-in system",
            "QR attendance tracking",
            "Ready-made certificate templates",
            "Remove branding watermark",
            "Priority support",
        ),
    ),
    "growth": PlanDefinition(
        id="growth",
        title_tr="Büyüme",
        title_en="Growth",
        position="Growth operations with email, automation, analytics, API, branding, and audience workflows.",
        included_features=_features_allowed_by("growth"),
        excluded_features=_features_blocked_for("growth"),
        price_monthly=1299,
        price_annual=1099,
        hc_quota=2000,
        is_free=False,
        is_enterprise=False,
        marketing_tr=(
            "Aylık 2.000 HC",
            "Sınırsız etkinlik",
            "Excel ile toplu basım",
            "Sertifika arşivi (3 yıl)",
            "Etkinlik kayıt ve check-in sistemi",
            "QR ile yoklama takibi",
            "Tam API erişimi",
            "Özel alan adı doğrulama",
            "Marka filigranını kaldırma",
            "Otomatik e-posta sistemi (toplu mail + şablonlar)",
            "Özel etkinlik açıklaması ve banner'ı",
            "Webhook API desteği",
            "Gelişmiş analitik paneli",
            "Lead toplama formları",
            "Özel form alanları",
            "Katılımcı self-servis sertifika indirme",
        ),
        marketing_en=(
            "2,000 HC per month",
            "Unlimited events",
            "Excel bulk generation",
            "Certificate archive (3 years)",
            "Event registration & check-in system",
            "QR attendance tracking",
            "Full API access",
            "Custom domain verification",
            "Remove branding watermark",
            "Automated email system (bulk mail + templates)",
            "Custom event description & banner",
            "Webhook API support",
            "Advanced analytics dashboard",
            "Lead capture forms",
            "Custom form fields",
            "Attendee self-service certificate download",
        ),
    ),
    "enterprise": PlanDefinition(
        id="enterprise",
        title_tr="Kurumsal",
        title_en="Enterprise",
        position="Organization-grade collaboration, CRM, LMS, compliance, SSO, and managed operations.",
        included_features=tuple(FEATURE_POLICIES.keys()),
        excluded_features=(),
        price_monthly=None,
        price_annual=None,
        hc_quota=None,
        is_free=False,
        is_enterprise=True,
        marketing_tr=(
            "Sınırsız HC kotası",
            "Özel SLA anlaşması",
            "API entegrasyonu",
            "Özel alan adı desteği",
            "Etkinlik kayıt ve check-in sistemi",
            "QR ile yoklama takibi",
            "Toplu sertifika üretimi",
            "7/24 kurumsal destek",
        ),
        marketing_en=(
            "Unlimited HC quota",
            "Custom SLA agreement",
            "API integration",
            "Custom domain support",
            "Event registration & check-in system",
            "QR attendance tracking",
            "Bulk certificate generation",
            "24/7 enterprise support",
        ),
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


def pricing_catalog_payload() -> list[dict[str, object]]:
    """Commercial pricing tiers derived from PLAN_CATALOG (single source of truth).

    Matches the ``PricingTier`` schema consumed by the pricing UI and billing
    endpoints, so ``DEFAULT_PRICING`` can be generated from here instead of
    being duplicated as a hand-maintained literal.
    """
    return [
        {
            "id": plan.id,
            "name_tr": plan.title_tr,
            "name_en": plan.title_en,
            "price_monthly": plan.price_monthly,
            "price_annual": plan.price_annual,
            "hc_quota": plan.hc_quota,
            "features_tr": list(plan.marketing_tr),
            "features_en": list(plan.marketing_en),
            "is_free": plan.is_free,
            "is_enterprise": plan.is_enterprise,
        }
        for plan in PLAN_CATALOG.values()
    ]


def plan_hc_quota(plan_id: Optional[str]) -> Optional[int]:
    """Monthly HeptaCoin quota for a plan; None means unlimited (Enterprise)."""
    plan = PLAN_CATALOG.get(normalize_plan(plan_id))
    return plan.hc_quota if plan else None


def plan_is_unlimited_hc(plan_id: Optional[str]) -> bool:
    """True when the plan grants unlimited HeptaCoin (no quota deduction)."""
    plan = PLAN_CATALOG.get(normalize_plan(plan_id))
    return bool(plan and plan.is_enterprise and plan.hc_quota is None)
