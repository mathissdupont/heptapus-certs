"""Servis/yardimci fonksiyonlari + auth dependency'leri (main.py'dan ayiklandi).

god-dosya bolme Adim 4c-2. Model/db/sema/utils/event_features/generator'a bagimli
ama main'deki mutable state'e veya route-only siniflara DEGIL -> dongusel import
yok. auth dependency'leri (get_current_user, require_role, get_current_public_member,
get_optional_public_member) burada. main.py `from .services import *` ile re-export eder.
"""

import asyncio
import base64
import hashlib
import hmac
import io
import json
import logging
import re
import secrets
import zipfile
import uuid as _uuid_module
from datetime import datetime, date, time, timezone, timedelta
from datetime import date as date_type
from pathlib import Path
from typing import Any, Dict, List, Literal, Optional, Tuple

import httpx
import jwt
from jwt import InvalidTokenError as JWTError
from fastapi import Body, Depends, Header as FastAPIHeader, HTTPException, Query, Request
from fastapi.responses import JSONResponse, Response
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.serialization import pkcs7
from sqlalchemy import and_, delete, distinct, func, literal, or_, select, union_all, update
from sqlalchemy.dialects.postgresql import insert as _pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from .config import settings
from .db import Base, SessionLocal, engine, get_db
from .db_types import JSONB, INET, BIGINT_PK
from .enums import Role, CertStatus, TxType, OrderStatus, AttendeeSource
from .event_features import (
    FEATURE_DEFAULTS, is_agenda_enabled, is_certificate_enabled, is_checkin_enabled, is_cpd_enabled,
    is_gamification_enabled, is_public_registration_enabled, is_quiz_enabled,
    is_raffles_enabled, is_ticketing_enabled, normalize_event_type, normalize_feature_bool,
)
from .generator import TemplateConfig, render_certificate_pdf, render_certificate_png_watermarked, new_certificate_uuid
from .event_team import *
from .models import *
from .schemas import *
from .utils import *

logger = logging.getLogger("heptacert")

__all__ = [
    "GRANTABLE_SCOPES",
    "attendee_is_confirmed",
    "_ensure_capacity_row",
    "_reserve_option_capacity",
    "_ensure_user_email_config",
    "_get_user_google_integration",
    "_get_user_ms365_integration",
    "write_audit_log",
    "_enforce_registration_risk_controls",
    "build_public_participant_status",
    "deliver_webhook_task",
    "log_webhook_delivery",
    "get_current_user",
    "_resolve_public_member_from_authorization",
    "get_current_public_member",
    "get_optional_public_member",
    "require_role",
    "_get_active_subscription_for_user",
    "_subscription_is_active_plan",
    "_event_owner_has_enterprise_plan",
    "_check_event_owner_has_premium_for_teams",
    "_get_event_email_verification_required",
    "_get_event_registration_quota",
    "_is_event_registration_quota_enabled",
    "_is_event_kvkk_consent_required",
    "_get_event_kvkk_consent_text",
    "_is_event_organizer_privacy_notice_enabled",
    "_is_event_cross_border_transfer_notice_enabled",
    "_is_event_cross_border_transfer_consent_required",
    "_get_event_cross_border_transfer_notice_text",
    "_get_event_data_controller_name",
    "_get_event_data_controller_contact_email",
    "_get_event_data_retention_note",
    "_is_event_registration_closed",
    "_get_public_event_identifier",
    "_resolve_public_event",
    "_generate_event_public_id",
    "_generate_public_member_public_id",
    "_generate_organization_public_id",
    "_get_organization_public_settings",
    "_build_public_org_summary",
    "_build_participant_badge_items",
    "editor_config_to_template_config",
    "_superadmin_audience_union_stmt",
    "_resolve_superadmin_recipient_emails",
    "_resolve_system_digest_recipient_emails",
    "_get_default_superadmin_id",
    "_ensure_system_digest_config",
    "_system_digest_is_due",
    "_event_reservation_window",
    "_build_local_ai_assistant_response",
    "_build_ai_event_context",
    "_event_activity_detail",
    "_organization_for_request_host",
    "_ensure_event_allowed_for_request_host",
    "_get_or_create_admin_organization",
    "_serialize_admin_organization",
    "_api_key_to_out",
    "_event_team_member_allows",
    "_event_team_member_to_out",
    "_ensure_certificate_feature_enabled",
    "_ensure_checkin_feature_enabled",
    "_ensure_sessions_feature_enabled",
    "_ensure_ticketing_feature_enabled",
    "_issue_event_ticket_if_needed",
    "_get_or_create_ticket_checkin_session",
    "_record_ticket_attendaonce",
    "_ticket_to_out",
    "_ticket_response_payload",
    "_session_to_out",
    "_make_apple_wallet_pass",
    "_get_event_attendaonce_counts",
    "_raffle_to_out",
    "_pick_raffle_winners",
    "_event_comment_to_out",
    "_audit_category_filter",
    "_audit_row_payload",
    "_serialize_superadmin_org",
    "_domain_row_for_org",
    "_ensure_domain_row_for_org",
    "_sync_superadmin_org_domain",
    "_maybe_log_cpd",
]


async def _ensure_capacity_row(db: AsyncSession, event_id: int, field_id: str, option_label: str, capacity: Optional[int]):
    # Insert row if not exists with provided capacity (only when capacity is not None)
    try:
        if capacity is None:
            return
        insert_stmt = _pg_insert(RegistrationOptionCapacity.__table__).values(
            event_id=event_id,
            field_id=field_id,
            option_label=option_label,
            capacity=capacity,
            reserved_count=0,
        ).on_conflict_do_nothing(index_elements=["event_id", "field_id", "option_label"])
        await db.execute(insert_stmt)
    except Exception:
        # Best-effort: ignore failures here
        return

async def _reserve_option_capacity(db: AsyncSession, event_id: int, field_id: str, option_label: str, capacity: Optional[int]) -> bool:
    """Attempt an atomic reservation for a single option. Returns True on success, False if no capacity left.

    If capacity is None (unlimited), returns True immediately.
    """
    if capacity is None:
        return True

    # Ensure a capacity row exists (best-effort)
    await _ensure_capacity_row(db, event_id, field_id, option_label, capacity)

    # Try atomic increment where reserved_count < capacity
    upd = (
        update(RegistrationOptionCapacity)
        .where(
            RegistrationOptionCapacity.event_id == event_id,
            RegistrationOptionCapacity.field_id == field_id,
            RegistrationOptionCapacity.option_label == option_label,
            RegistrationOptionCapacity.reserved_count < RegistrationOptionCapacity.capacity,
        )
        .values(reserved_count=(RegistrationOptionCapacity.reserved_count + 1))
        .returning(RegistrationOptionCapacity.reserved_count)
    )
    try:
        res = await db.execute(upd)
        row = res.scalar_one_or_none()
        if row is None:
            return False
        return True
    except Exception:
        return False

async def _ensure_user_email_config(db: AsyncSession, user_id: int) -> "UserEmailConfig":
    res = await db.execute(select(UserEmailConfig).where(UserEmailConfig.user_id == user_id))
    config = res.scalar_one_or_none()
    if config:
        # Lazy migration: convert legacy plaintext SMTP passwords to encrypted value.
        if config.smtp_password and not str(config.smtp_password).startswith("enc:v1:"):
            config.smtp_password = _encrypt_smtp_password(config.smtp_password)
            db.add(config)
            await db.commit()
            await db.refresh(config)
        return config

    stmt = (
        _pg_insert(UserEmailConfig)
        .values(user_id=user_id, smtp_enabled=False, smtp_use_tls=True)
        .on_conflict_do_nothing(index_elements=["user_id"])
    )
    await db.execute(stmt)
    await db.commit()
    res = await db.execute(select(UserEmailConfig).where(UserEmailConfig.user_id == user_id))
    config = res.scalar_one()
    return config

async def _get_user_google_integration(db: AsyncSession, user_id: int) -> Optional["UserGoogleIntegration"]:
    res = await db.execute(select(UserGoogleIntegration).where(UserGoogleIntegration.user_id == user_id))
    return res.scalar_one_or_none()

async def _get_user_ms365_integration(db: AsyncSession, user_id: int) -> Optional["UserMicrosoftIntegration"]:
    res = await db.execute(select(UserMicrosoftIntegration).where(UserMicrosoftIntegration.user_id == user_id))
    return res.scalar_one_or_none()

async def write_audit_log(
    db: AsyncSession,
    *,
    user_id: Optional[int],
    action: str,
    resource_type: Optional[str] = None,
    resource_id: Optional[str] = None,
    extra: Optional[Dict[str, Any]] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
) -> None:
    db.add(
        AuditLog(
            user_id=user_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            extra=extra,
            ip_address=ip_address,
            user_agent=user_agent,
        )
    )

async def _enforce_registration_risk_controls(
    db: AsyncSession,
    *,
    event_id: int,
    email: str,
    ip_address: Optional[str],
    user_agent: Optional[str],
    device_id: str,
) -> None:
    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(minutes=30)
    recent_logs_res = await db.execute(
        select(AuditLog)
        .where(
            AuditLog.action == "attendee.register",
            AuditLog.created_at >= cutoff,
        )
        .order_by(AuditLog.created_at.desc())
        .limit(250)
    )
    recent_logs = recent_logs_res.scalars().all()

    def _extra(log: AuditLog) -> Dict[str, Any]:
        return log.extra or {}

    def _utc_created_at(log: AuditLog) -> datetime:
        created_at = log.created_at
        if created_at.tzinfo is None:
            return created_at.replace(tzinfo=timezone.utc)
        return created_at.astimezone(timezone.utc)

    same_event_logs = [log for log in recent_logs if str(_extra(log).get("event_id")) == str(event_id)]
    email_lc = email.lower()

    same_ip_recent = [
        log for log in same_event_logs
        if ip_address and log.ip_address == ip_address and _utc_created_at(log) >= now - timedelta(minutes=10)
    ]
    if len(same_ip_recent) >= 5:
        raise HTTPException(status_code=429, detail="Bu IP adresinden çok fazla etkinlik kaydı denemesi algılandı.")

    same_device_logs = [
        log for log in same_event_logs
        if _extra(log).get("device_id") == device_id
    ]
    distinct_device_emails = {
        str(_extra(log).get("email") or "").lower()
        for log in same_device_logs
        if _extra(log).get("email")
    }
    if len(same_device_logs) >= 4 and email_lc not in distinct_device_emails:
        raise HTTPException(status_code=429, detail="Bu cihazdan cok sayida farkli e-posta denemesi algilandi.")

    same_ip_ua_logs = [
        log for log in same_event_logs
        if ip_address and log.ip_address == ip_address and (log.user_agent or "") == (user_agent or "")
    ]
    distinct_ip_ua_emails = {
        str(_extra(log).get("email") or "").lower()
        for log in same_ip_ua_logs
        if _extra(log).get("email")
    }
    if len(distinct_ip_ua_emails) >= 4 and email_lc not in distinct_ip_ua_emails:
        raise HTTPException(status_code=429, detail="Şüpheli kayıt denemesi algılandı. Lütfen daha sonra tekrar deneyin.")

async def build_public_participant_status(
    db: AsyncSession,
    *,
    event: Event,
    attendee: Attendee,
) -> PublicParticipantStatusOut:
    survey_res = await db.execute(select(EventSurvey).where(EventSurvey.event_id == event.id))
    event_survey = survey_res.scalar_one_or_none()
    survey_enabled = bool(event_survey and event_survey.survey_type != "disabled")
    certificate_enabled = is_certificate_enabled(event)
    checkin_enabled = is_checkin_enabled(event)
    ticketing_enabled = is_ticketing_enabled(event)
    gamification_enabled = normalize_feature_bool(getattr(event, "gamification_enabled", None), default=FEATURE_DEFAULTS["gamification_enabled"])

    total_sessions_res = await db.execute(
        select(func.count()).select_from(EventSession).where(EventSession.event_id == event.id)
    )
    total_sessions = int(total_sessions_res.scalar_one() or 0)

    sessions_attended_res = await db.execute(
        select(func.count()).select_from(AttendaonceRecord).where(AttendaonceRecord.attendee_id == attendee.id)
    )
    sessions_attended = int(sessions_attended_res.scalar_one() or 0)

    badge_items: List[ParticipantBadgeOut] = []
    if gamification_enabled:
        badge_res = await db.execute(
            select(ParticipantBadge)
            .where(
                ParticipantBadge.event_id == event.id,
                ParticipantBadge.attendee_id == attendee.id,
            )
            .order_by(ParticipantBadge.awarded_at.desc())
        )
        badges = badge_res.scalars().all()
        badge_items = await _build_participant_badge_items(db, event.id, badges)

    certs_res = await db.execute(
        select(Certificate)
        .where(
            Certificate.event_id == event.id,
            Certificate.student_name == attendee.name,
            Certificate.deleted_at.is_(None),
        )
        .order_by(Certificate.created_at.desc())
    )
    certificates = certs_res.scalars().all()
    latest_certificate = certificates[0] if certificates else None

    ticket: Optional[EventTicket] = None
    ticket_out: Optional[PublicParticipantTicketOut] = None
    if ticketing_enabled:
        ticket_res = await db.execute(
            select(EventTicket).where(
                EventTicket.event_id == event.id,
                EventTicket.attendee_id == attendee.id,
            )
        )
        ticket = ticket_res.scalar_one_or_none()
        if ticket:
            ticket_out = PublicParticipantTicketOut(
                id=ticket.id,
                token=ticket.token,
                qr_payload=ticket.qr_payload,
                status=ticket.status,
                ticket_url=_ticket_public_url(ticket.token),
                issued_at=ticket.issued_at,
                checked_in_at=ticket.checked_in_at,
            )

    if ticketing_enabled and ticket and ticket.status == "used":
        sessions_attended = max(sessions_attended, 1)

    eligible_raffles: List[Dict[str, Any]] = []
    if is_raffles_enabled(event):
        raffle_res = await db.execute(
            select(EventRaffle)
            .where(EventRaffle.event_id == event.id)
            .order_by(EventRaffle.created_at.desc())
        )
        raffles = raffle_res.scalars().all()
        eligible_raffles = [
            {
                "id": raffle.id,
                "title": raffle.title,
                "prize_name": raffle.prize_name,
                "status": raffle.status,
                "min_sessions_required": raffle.min_sessions_required,
            }
            for raffle in raffles
            if attendee.email_verified and sessions_attended >= raffle.min_sessions_required
        ]

    certificate_ready = bool(
        attendee.can_download_cert
        and sessions_attended >= event.min_sessions_required
        and latest_certificate is not None
    )

    return PublicParticipantStatusOut(
        attendee_id=attendee.id,
        attendee_name=attendee.name,
        attendee_email=attendee.email,
        email_verified=bool(attendee.email_verified),
        event_id=event.id,
        event_name=event.name,
        event_type=event.event_type,
        certificate_enabled=certificate_enabled,
        checkin_enabled=checkin_enabled,
        ticketing_enabled=ticketing_enabled,
        raffles_enabled=is_raffles_enabled(event),
        gamification_enabled=gamification_enabled,
        sessions_attended=sessions_attended,
        total_sessions=total_sessions,
        sessions_required=event.min_sessions_required,
        survey_enabled=survey_enabled,
        survey_required=bool(attendee.survey_required) if survey_enabled else False,
        survey_completed=attendee.survey_completed_at is not None,
        can_download_cert=bool(attendee.can_download_cert),
        certificate_ready=certificate_ready,
        certificate_count=len(certificates),
        latest_certificate_uuid=latest_certificate.uuid if latest_certificate else None,
        latest_certificate_verify_url=(
            build_certificate_verify_url(latest_certificate.uuid) if latest_certificate else None
        ),
        ticket=ticket_out,
        badge_count=len(badge_items),
        badges=badge_items,
        eligible_raffles=eligible_raffles,
    )

async def deliver_webhook_task(user_id: int, event_type: str, payload: Dict[str, Any]) -> None:
    from .webhooks import deliver_webhook
    from .notification_integrations_api import trigger_notification_integrations_for_user

    async with SessionLocal() as db_webhook:
        await deliver_webhook(db_webhook, user_id, event_type, payload)
        await trigger_notification_integrations_for_user(db_webhook, user_id, event_type, payload)

async def log_webhook_delivery(
    webhook_id: int,
    event_type: str,
    payload: Dict[str, Any],
    http_status: Optional[int] = None,
    error_message: Optional[str] = None,
) -> None:
    """Log a webhook delivery attempt."""
    async with SessionLocal() as db:
        log_entry = WebhookLog(
            webhook_id=webhook_id,
            event_type=event_type,
            payload=payload,
            http_status=http_status,
            error_message=error_message,
        )
        db.add(log_entry)
        await db.commit()

# ── API scope enforcement ───────────────────────────────────────────────────
# API keys (hc_*) and OAuth access tokens may carry a restricted scope list.
# Historically these scopes were stored but NEVER enforced on the REST API, so a
# key scoped to e.g. "events:read" had full admin access. The helpers below
# derive the scope a request requires and reject credentials that don't hold it.
# An empty/None scope list means "full access" (interactive sessions, unrestricted
# keys) and is intentionally left untouched for backwards compatibility.

# ── Single source of truth for grantable scopes ─────────────────────────────
# Every scope that _required_scope_for_request() below can return MUST appear
# here, otherwise a credential can never be granted the scope it needs and the
# matching endpoints become unreachable for scoped tokens. API keys
# (api_keys_ext_api.API_SCOPES), the OAuth server (oauth_api.VALID_SCOPES) and
# the consent UI all derive from this map — keep them in sync by referencing it,
# never by re-declaring scopes. Labels are Turkish (default product language)
# and surface directly on the OAuth consent screen.
GRANTABLE_SCOPES: Dict[str, str] = {
    "events:read":        "Etkinlikleri oku",
    "events:write":       "Etkinlik oluştur, güncelle ve sil",
    "attendees:read":     "Katılımcıları oku",
    "attendees:write":    "Katılımcı ekle, güncelle ve kaldır",
    "certificates:read":  "Sertifikaları oku",
    "certificates:write": "Sertifika oluştur ve iptal et",
    "sessions:read":      "Oturumları oku",
    "sessions:write":     "Oturum oluştur, güncelle ve sil",
    "checkin:write":      "Check-in (yoklama) işlemi yap",
    "analytics:read":     "Analitik ve istatistikleri oku",
    "reports:read":       "Raporları oku",
    "automations:read":   "Otomasyon kurallarını oku",
    "automations:write":  "Otomasyon kuralı oluştur ve yönet",
    "crm:read":           "CRM verilerini oku",
    "crm:write":          "CRM verilerini yönet",
    "forms:read":         "Lead formlarını oku",
    "forms:write":        "Lead formları oluştur ve düzenle",
}

# Meta/identity endpoints a scope-restricted credential may always reach even
# though they map to no resource scope. Everything else that can't be classified
# is denied (least privilege) — including billing, auth and other sensitive paths.
_SCOPE_SAFE_GET_PREFIXES = (
    "/api/health",
    "/api/openapi",
    "/api/branding",
    "/public/branding",
    "/api/feature-policies",
    "/api/pricing/config",
    "/api/oauth/userinfo",
    "/api/me",
    "/api/admin/mcp/me",
)


def _required_scope_for_request(method: str, path: str) -> Optional[str]:
    """Map an HTTP request to the scope it requires, or None if unclassified.

    Scope names match _DEFINED_SCOPES (API keys) and oauth VALID_SCOPES.
    """
    action = "read" if method.upper() in ("GET", "HEAD", "OPTIONS") else "write"
    p = path.lower()
    # Read-only resources first (no :write variant defined).
    if "/analytics" in p or "/dashboard/stats" in p or p.endswith("/stats"):
        return "analytics:read"
    if "/reports" in p or "/report" in p:
        return "reports:read"
    # Certificates nest under /events/.../certificates — check before events.
    if "certificate" in p or "/bulk-certify" in p or "/bulk-generate" in p or "/tier" in p:
        return f"certificates:{action}"
    # Check-in endpoints only. NOTE: do NOT match a bare "/attend" here — it is a
    # substring of "/attendees" and "/attendance", which would misclassify all
    # attendee CRUD as check-in (a token with attendees:write would be denied on
    # POST /attendees). Attendee paths are handled by the next branch.
    if "/checkin" in p or "/kiosk" in p:
        # No checkin:read scope exists; reads fall back to attendees:read.
        return "checkin:write" if action == "write" else "attendees:read"
    if "/attendees" in p or "/attendance" in p or "/attendaonce" in p or "/registration" in p:
        return f"attendees:{action}"
    if "/sessions" in p:
        return f"sessions:{action}"
    if "/automations" in p:
        return f"automations:{action}"
    if "/crm" in p:
        return f"crm:{action}"
    if "/lead-forms" in p or "/forms" in p:
        return f"forms:{action}"
    # LMS: enrollments behave like attendees; everything else (courses, modules,
    # settings) is gated by the events scope. LMS analytics already matched above.
    if "/enrollments" in p:
        return f"attendees:{action}"
    if "/lms" in p:
        return f"events:{action}"
    # Integration/config surfaces the MCP tools touch. No dedicated scope exists,
    # so they ride on the events scope (matching the MCP tool declarations).
    if "/webhooks" in p:
        return f"events:{action}"
    if "/organization" in p:
        return f"events:{action}"
    if "/events" in p or "/event" in p:
        return f"events:{action}"
    return None


def _scopes_satisfy(held: List[str], required: str) -> bool:
    if required in held:
        return True
    # A :write scope implies the matching :read scope.
    if required.endswith(":read"):
        resource = required.split(":", 1)[0]
        if f"{resource}:write" in held:
            return True
    return False


def _enforce_api_scope(request: Optional[Request], held_scopes: Optional[List[str]]) -> None:
    """Reject the request if the scoped credential lacks the required scope.

    No-op when held_scopes is None/empty (full access) or when no Request is
    available (e.g. background/internal calls).
    """
    if not held_scopes or request is None:
        return
    path = request.url.path
    method = request.method
    # MCP meta endpoints (identity check + fire-and-forget audit logging) touch no
    # business resource and must stay reachable by any authenticated credential
    # regardless of its scope set, so scoped OAuth tokens can still be audited.
    if path.startswith("/api/admin/mcp/"):
        return
    required = _required_scope_for_request(method, path)
    if required is not None:
        if not _scopes_satisfy(held_scopes, required):
            raise HTTPException(status_code=403, detail=f"API anahtarı gerekli yetkiye sahip değil: {required}")
        return
    # Unclassified path: allow only safe meta/identity GETs, deny everything else.
    if method.upper() in ("GET", "HEAD", "OPTIONS") and any(path.startswith(p) for p in _SCOPE_SAFE_GET_PREFIXES):
        return
    raise HTTPException(status_code=403, detail="API anahtarı bu uç nokta için yetkili değil")


async def get_current_user(request: Request = None, db: AsyncSession = Depends(get_db), Authorization: Optional[str] = FastAPIHeader(default=None)) -> CurrentUser:
    if not Authorization or not Authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")
    token = Authorization.split(" ", 1)[1].strip()

    # API key path: tokens start with "hc_"
    if token.startswith("hc_"):
        key_hash = _hash_api_key(token)
        res = await db.execute(
            select(ApiKey).where(
                ApiKey.key_hash == key_hash,
                ApiKey.is_active.is_(True),
            )
        )
        api_key = res.scalar_one_or_none()
        if not api_key:
            raise HTTPException(status_code=401, detail="Invalid API key")
        if api_key.expires_at and api_key.expires_at < datetime.now(timezone.utc):
            raise HTTPException(status_code=401, detail="API key expired")
        # Enforce the key's scopes (empty list == unrestricted, kept for compat).
        key_scopes = list(api_key.scopes or [])
        _enforce_api_scope(request, key_scopes)
        # Per-key rate limiting (if configured)
        if api_key.rate_limit_per_min:
            try:
                from .cache import cache
                rl_key = f"apikey_rl:{api_key.id}:{int(datetime.now(timezone.utc).timestamp() // 60)}"
                current = await cache.get(rl_key) or 0
                if int(current) >= api_key.rate_limit_per_min:
                    raise HTTPException(
                        status_code=429,
                        detail=f"API key rate limit exceeded ({api_key.rate_limit_per_min}/min)",
                        headers={
                            "X-RateLimit-Limit": str(api_key.rate_limit_per_min),
                            "X-RateLimit-Remaining": "0",
                            "Retry-After": "60",
                        },
                    )
                await cache.set(rl_key, int(current) + 1, ttl=60)
            except HTTPException:
                raise
            except Exception:
                pass  # rate limit check failure is non-fatal
        # Update last_used_at (fire-and-forget style)
        api_key.last_used_at = datetime.now(timezone.utc)
        await db.commit()
        # Load user
        user_res = await db.execute(select(User).where(User.id == api_key.user_id))
        user = user_res.scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        if user.role in (Role.admin, Role.superadmin):
            await _get_or_create_admin_organization(db, user.id)
            await db.commit()
        return CurrentUser(id=user.id, role=user.role, email=user.email, scopes=key_scopes or None)

    # JWT path
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
        user_id = int(payload.get("sub"))
        role = Role(payload.get("role"))
        # Reject partial tokens (2FA pending)
        if payload.get("partial"):
            raise HTTPException(status_code=401, detail="2FA verification required")
    except (JWTError, ValueError, TypeError):
        raise HTTPException(status_code=401, detail="Invalid token")

    # OAuth access token: instantly reject if user disconnected (refresh token revoked)
    oauth_client_id = payload.get("client_id")
    if oauth_client_id:
        from sqlalchemy import text as _sa_text
        # Bound params (not literal `false`/`now()`) so the query is portable
        # across Postgres (prod) and SQLite (tests); SQLAlchemy adapts the bool
        # and datetime to each dialect.
        active_rt = (await db.execute(
            _sa_text(
                "SELECT 1 FROM oauth_refresh_tokens "
                "WHERE user_id = :uid AND client_id = :cid "
                "AND revoked = :not_revoked AND expires_at > :now "
                "LIMIT 1"
            ),
            {
                "uid": user_id,
                "cid": oauth_client_id,
                "not_revoked": False,
                "now": datetime.now(timezone.utc),
            },
        )).scalar()
        if not active_rt:
            raise HTTPException(status_code=401, detail="OAuth session revoked")

    # OAuth access tokens carry a space-separated "scope" claim. Enforce it just
    # like API-key scopes (interactive JWT sessions have no scope claim -> full access).
    oauth_scopes = [s for s in (payload.get("scope") or "").split() if s] if oauth_client_id else None
    _enforce_api_scope(request, oauth_scopes)

    from .cache import cache, USER_TTL
    cached_user = await cache.get(f"user:{user_id}")
    if cached_user:
        if cached_user.get("deleted_at"):
            raise HTTPException(status_code=401, detail="Bu hesap silinmiştir.")
        cached_role = Role(cached_user["role"])
        if cached_role in (Role.admin, Role.superadmin):
            await _get_or_create_admin_organization(db, int(cached_user["id"]))
            await db.commit()
        return CurrentUser(id=cached_user["id"], role=cached_role, email=cached_user["email"], scopes=oauth_scopes or None)
    res = await db.execute(select(User).where(User.id == user_id))
    user = res.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    if user.deleted_at is not None:
        raise HTTPException(status_code=401, detail="Bu hesap silinmiştir.")
    if user.role in (Role.admin, Role.superadmin):
        await _get_or_create_admin_organization(db, user.id)
        await db.commit()
    await cache.set(f"user:{user_id}", {"id": user.id, "role": str(user.role.value), "email": user.email, "deleted_at": None}, ttl=USER_TTL)
    return CurrentUser(id=user.id, role=user.role, email=user.email, scopes=oauth_scopes or None)

async def _resolve_public_member_from_authorization(
    db: AsyncSession,
    authorization: Optional[str],
) -> Optional[CurrentPublicMember]:
    if not authorization or not authorization.lower().startswith("bearer "):
        return None
    token = authorization.split(" ", 1)[1].strip()

    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
        if payload.get("scope") != "public_member":
            raise HTTPException(status_code=401, detail="Invalid token scope")
        member_id = int(payload.get("sub"))
    except HTTPException:
        raise
    except (JWTError, ValueError, TypeError):
        raise HTTPException(status_code=401, detail="Invalid token")

    res = await db.execute(select(PublicMember).where(PublicMember.id == member_id))
    member = res.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=401, detail="Member not found")
    return CurrentPublicMember(
        id=member.id,
        email=member.email,
        display_name=member.display_name,
        public_id=member.public_id,
        avatar_url=member.avatar_url,
    )

async def get_current_public_member(
    db: AsyncSession = Depends(get_db),
    Authorization: Optional[str] = FastAPIHeader(default=None),
) -> CurrentPublicMember:
    if not Authorization or not Authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")
    member = await _resolve_public_member_from_authorization(db, Authorization)
    if not member:
        raise HTTPException(status_code=401, detail="Missing bearer token")
    return member

async def get_optional_public_member(
    db: AsyncSession = Depends(get_db),
    Authorization: Optional[str] = FastAPIHeader(default=None),
) -> Optional[CurrentPublicMember]:
    return await _resolve_public_member_from_authorization(db, Authorization)

def require_role(*allowed: Role):
    async def _guard(u: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if u.role not in allowed:
            raise HTTPException(status_code=403, detail="Forbidden")
        return u
    return _guard

async def _get_active_subscription_for_user(user_id: int, db: AsyncSession) -> Optional[Subscription]:
    res = await db.execute(
        select(Subscription)
        .where(Subscription.user_id == user_id, Subscription.is_active == True)
        .order_by(Subscription.expires_at.desc())
        .limit(1)
    )
    return res.scalar_one_or_none()

def _subscription_is_active_plan(sub: Optional[Subscription], allowed_plans: set[str]) -> bool:
    from .plan_policy import subscription_is_active_plan

    return subscription_is_active_plan(sub, allowed_plans)

async def _event_owner_has_enterprise_plan(event_id: int, db: AsyncSession) -> bool:
    event_owner_res = await db.execute(select(Event.admin_id).where(Event.id == event_id))
    event_owner_id = event_owner_res.scalar_one_or_none()
    if event_owner_id is None:
        return False
    owner = await db.get(User, int(event_owner_id))
    if owner and owner.role == Role.superadmin:
        return True
    sub = await _get_active_subscription_for_user(int(event_owner_id), db)
    return _subscription_is_active_plan(sub, {"enterprise"})

async def _check_event_owner_has_premium_for_teams(
    event_id: int,
    db: AsyncSession,
) -> bool:
    """Check if event owner has Enterprise plan for organization/team features."""
    owner_res = await db.execute(
        select(User.role)
        .join(Event, Event.admin_id == User.id)
        .where(Event.id == event_id)
    )
    owner_role = owner_res.scalar_one_or_none()
    if owner_role == Role.superadmin:
        return True
    res = await db.execute(
        select(Event, Subscription)
        .outerjoin(Subscription, Subscription.user_id == Event.admin_id)
        .where(
            Event.id == event_id,
            Subscription.is_active == True,
        )
        .order_by(Subscription.expires_at.desc())
    )
    row = res.first()
    if not row:
        return False
    event, sub = row
    if not _subscription_is_active_plan(sub, {"enterprise"}):
        return False
    return True

def _get_event_email_verification_required(event: Event) -> bool:
    config = event.config or {}
    raw_value = config.get("require_email_verification")
    if raw_value is None:
        return True
    return bool(raw_value)

def _get_event_registration_quota(event: Event) -> Optional[int]:
    config = event.config or {}
    raw_value = config.get("registration_quota")
    if raw_value is None or raw_value == "":
        return None
    try:
        quota = int(raw_value)
    except (TypeError, ValueError):
        return None
    return quota if quota > 0 else None

def _is_event_registration_quota_enabled(event: Event) -> bool:
    config = event.config or {}
    raw_value = config.get("registration_quota_enabled")
    if raw_value is None:
        # Backward-compatible default: enabled only when quota is set.
        return _get_event_registration_quota(event) is not None
    return bool(raw_value)

def _is_event_kvkk_consent_required(event: Event) -> bool:
    config = event.config or {}
    raw_value = config.get("kvkk_consent_required")
    if raw_value is None:
        # Backward compatibility: legacy events without this key are not forced.
        return False
    return bool(raw_value)

def _get_event_kvkk_consent_text(event: Event) -> str:
    config = event.config or {}
    custom = str(config.get("kvkk_consent_text") or "").strip()
    if custom:
        return custom
    return (
        "KVKK AYDINLATMA METNI\n\n"
        "1) Veri sorumlusu\n"
        "Bu etkinlik kaydi kapsaminda paylastiginiz kisisel verileriniz, ilgili organizasyon ve Heptapus Group tarafindan "
        "6698 sayili Kisisel Verilerin Korunmasi Kanunu (KVKK) hukumlerine uygun sekilde islenebilir.\n\n"
        "2) Islenen veri kategorileri\n"
        "Etkinlik kaydi sirasinda ad-soyad, e-posta adresi, kayit formunda girdiginiz ek bilgiler, "
        "zorunlu/istege bagli yuklediginiz belgeler ve teknik kayitlar (IP, cihaz ve zaman bilgisi) islenebilir.\n\n"
        "3) Isleme amaclari\n"
        "Verileriniz; kaydinizin alinmasi, katilimci dogrulama sureclerinin yurutilmesi, yoklama/check-in islemleri, "
        "sertifika surecleri, destek hizmetleri, guvenlik kontrolleri ve ilgili mevzuattan dogan yukumluluklerin yerine "
        "getirilmesi amaclariyla kullanilir.\n\n"
        "4) Hukuki sebep\n"
        "Kisisel verileriniz KVKK madde 5 ve 6 kapsaminda; acik rizaniz, bir sozlesmenin kurulmasi/ifasi, "
        "hukuki yukumluluklerin yerine getirilmesi ve mesru menfaat hukuki sebeplerine dayanilarak islenebilir.\n\n"
        "5) Aktarim\n"
        "Verileriniz, hizmetin sunulmasi icin gerekli oldugu olcude; altyapi, barindirma, e-posta veya teknik destek "
        "saglayicilari gibi is ortagi/hizmet saglayicilarla, yalnizca amacla sinirli ve olculu sekilde paylasilabilir.\n\n"
        "6) Saklama suresi ve guvenlik\n"
        "Verileriniz ilgili isleme amaci ortadan kalkincaya kadar ve mevzuatta ongorulen saklama sureleri boyunca saklanir. "
        "Bu sure sonunda veriler silinir, yok edilir veya anonim hale getirilir. Uygun teknik ve idari guvenlik onlemleri uygulanir.\n\n"
        "7) Haklariniz\n"
        "KVKK madde 11 kapsaminda; verinize erisim, duzeltme, silme, islemeyi sinirlama, itiraz ve zararin giderilmesini talep etme "
        "haklarina sahipsiniz.\n\n"
        "8) Basvuru ve iletisim\n"
        "KVKK kapsamindaki taleplerinizi contact@heptapusgroup.com adresine iletebilirsiniz."
    )

def _is_event_organizer_privacy_notice_enabled(event: Event) -> bool:
    config = event.config or {}
    return bool(config.get("organizer_privacy_notice_enabled"))

def _is_event_cross_border_transfer_notice_enabled(event: Event) -> bool:
    return True

def _is_event_cross_border_transfer_consent_required(event: Event) -> bool:
    return True

def _get_event_cross_border_transfer_notice_text(event: Event) -> str:
    return (
        "YURT DISI AKTARIM BILGILENDIRMESI\n\n"
        "HeptaCert altyapisinda kullanilan bazi hizmetler yurt disinda bulunan sunucular uzerinden saglanabilir. "
        "Bu nedenle kisisel verileriniz hizmetin sunulmasi, guvenlik, yedekleme ve sistem surekliligi amaclariyla "
        "yurt disindaki altyapi saglayicilarinda islenebilir. Bu ifade taslaktir ve hukukcu kontrolu gerektirir."
    )

def _get_event_data_controller_name(event: Event) -> Optional[str]:
    config = event.config or {}
    value = str(config.get("data_controller_name") or "").strip()
    return value or None

def _get_event_data_controller_contact_email(event: Event) -> Optional[str]:
    config = event.config or {}
    value = str(config.get("data_controller_contact_email") or "").strip()
    return value or None

def _get_event_data_retention_note(event: Event) -> Optional[str]:
    config = event.config or {}
    value = str(config.get("data_retention_note") or "").strip()
    return value or None

def _is_event_registration_closed(event: Event) -> bool:
    config = event.config or {}
    if bool(config.get("registration_closed")):
        return True
    if event.event_date and event.event_date < datetime.now(timezone.utc).date():
        return True
    return False

def _get_public_event_identifier(event: Event) -> str:
    return event.public_id or str(event.id)

async def _resolve_public_event(db: AsyncSession, event_ref: str) -> Optional[Event]:
    identifier = str(event_ref or "").strip()
    if not identifier:
        return None

    public_res = await db.execute(select(Event).where(Event.public_id == identifier))
    event = public_res.scalar_one_or_none()
    if event:
        return event

    if identifier.isdigit():
        legacy_res = await db.execute(select(Event).where(Event.id == int(identifier)))
        legacy_event = legacy_res.scalar_one_or_none()
        if legacy_event and not legacy_event.public_id:
            return legacy_event
    return None

async def _generate_event_public_id(db: AsyncSession) -> str:
    for _ in range(10):
        candidate = f"evt_{secrets.token_hex(8)}"
        exists_res = await db.execute(select(Event.id).where(Event.public_id == candidate))
        if exists_res.scalar_one_or_none() is None:
            return candidate
    raise RuntimeError("Unable to generate a unique event public id")

async def _generate_public_member_public_id(db: AsyncSession) -> str:
    for _ in range(10):
        candidate = f"mem_{secrets.token_hex(8)}"
        exists_res = await db.execute(select(PublicMember.id).where(PublicMember.public_id == candidate))
        if exists_res.scalar_one_or_none() is None:
            return candidate
    raise RuntimeError("Unable to generate a unique public member id")

async def _generate_organization_public_id(db: AsyncSession) -> str:
    for _ in range(10):
        candidate = f"org_{secrets.token_hex(8)}"
        exists_res = await db.execute(select(Organization.id).where(Organization.public_id == candidate))
        if exists_res.scalar_one_or_none() is None:
            return candidate
    raise RuntimeError("Unable to generate a unique organization public id")

def _get_organization_public_settings(org: Organization) -> Dict[str, Any]:
    settings_map = getattr(org, "settings", {}) or {}
    if not isinstance(settings_map, dict):
        settings_map = {}
    return settings_map

def _build_public_org_summary(
    org: Organization,
    *,
    event_count: int = 0,
    follower_count: int = 0,
) -> PublicOrganizationListItemOut:
    settings_map = _get_organization_public_settings(org)
    return PublicOrganizationListItemOut(
        public_id=org.public_id,
        org_name=org.org_name,
        brand_logo=org.brand_logo,
        brand_color=org.brand_color,
        bio=settings_map.get("public_bio"),
        website_url=settings_map.get("public_website_url"),
        event_count=event_count,
        follower_count=follower_count,
    )

async def _build_participant_badge_items(
    db: AsyncSession,
    event_id: int,
    badges: List[ParticipantBadge],
) -> List[ParticipantBadgeOut]:
    att_res = await db.execute(select(Attendee).where(Attendee.event_id == event_id))
    attendees = att_res.scalars().all()
    attendee_map = {attendee.id: attendee for attendee in attendees}

    br_res = await db.execute(select(BadgeRule).where(BadgeRule.event_id == event_id))
    badge_rule = br_res.scalar_one_or_none()
    badge_definition_map = (
        {
            str(definition.get("type", "")): definition
            for definition in (badge_rule.badge_definitions or [])
            if definition.get("type")
        }
        if badge_rule
        else {}
    )

    badge_items: List[ParticipantBadgeOut] = []
    for badge in badges:
        attendee = attendee_map.get(badge.attendee_id)
        definition = badge_definition_map.get(badge.badge_type, {})
        badge_items.append(
            ParticipantBadgeOut(
                id=badge.id,
                event_id=badge.event_id,
                attendee_id=badge.attendee_id,
                badge_type=badge.badge_type,
                badge_name=definition.get("name"),
                badge_description=definition.get("description"),
                badge_icon_url=definition.get("icon_url"),
                badge_color_hex=definition.get("color_hex"),
                attendee_name=attendee.name if attendee else None,
                attendee_email=attendee.email if attendee else None,
                criteria_met=badge.criteria_met or {},
                awarded_by=badge.awarded_by,
                awarded_at=badge.awarded_at,
                is_automatic=badge.is_automatic,
                badge_metadata=badge.badge_metadata,
            )
        )

    return badge_items

def editor_config_to_template_config(raw: dict) -> "TemplateConfig":
    """Translate nested EditorConfig or flat legacy format â†’ TemplateConfig."""
    if "name" in raw and isinstance(raw.get("name"), dict):
        name    = raw["name"]
        cert_id = raw.get("cert_id") or {}
        qr      = raw.get("qr") or {}
        return TemplateConfig(
            # Name
            isim_x=int(name.get("x", 620)),
            isim_y=int(name.get("y", 438)),
            font_size=int(name.get("font_size", 48)),
            font_color=str(name.get("font_color", "#FFFFFF")),
            name_text_align=str(name.get("text_align", "center")),
            name_font_weight=str(name.get("font_weight", "normal")),
            name_font_style=str(name.get("font_style", "normal")),
            # QR
            qr_x=int(qr.get("x", 80)),
            qr_y=int(qr.get("y", 700)),
            qr_size=int(qr.get("size", 260)),
            show_qr=bool(qr.get("show", True)),
            # Certificate ID
            cert_id_x=int(cert_id.get("x", 60)),
            cert_id_y=int(cert_id.get("y", 60)),
            cert_id_font_size=int(cert_id.get("font_size", 22)),
            cert_id_color=str(cert_id.get("font_color", "#334155")),
            cert_id_text_align=str(cert_id.get("text_align", "left")),
            cert_id_font_weight=str(cert_id.get("font_weight", "normal")),
            cert_id_font_style=str(cert_id.get("font_style", "normal")),
            show_cert_id=bool(cert_id.get("show", True)),
            # Hologram
            show_hologram=bool(raw.get("show_hologram", True)),
        )
    else:
        # Legacy flat-field format
        return TemplateConfig(
            isim_x=int(raw.get("isim_x", 620)),
            isim_y=int(raw.get("isim_y", 438)),
            font_size=int(raw.get("font_size", 48)),
            font_color=str(raw.get("font_color", "#FFFFFF")),
            name_text_align=str(raw.get("name_text_align", "center")),
            name_font_weight=str(raw.get("name_font_weight", "normal")),
            name_font_style=str(raw.get("name_font_style", "normal")),
            qr_x=int(raw.get("qr_x", 80)),
            qr_y=int(raw.get("qr_y", 700)),
            qr_size=int(raw.get("qr_size", 260)),
            show_qr=bool(raw.get("show_qr", True)),
            cert_id_x=int(raw.get("cert_id_x", 60)),
            cert_id_y=int(raw.get("cert_id_y", 60)),
            cert_id_font_size=int(raw.get("cert_id_font_size", 22)),
            cert_id_color=str(raw.get("cert_id_color", "#334155")),
            cert_id_text_align=str(raw.get("cert_id_text_align", "left")),
            cert_id_font_weight=str(raw.get("cert_id_font_weight", "normal")),
            cert_id_font_style=str(raw.get("cert_id_font_style", "normal")),
            show_cert_id=bool(raw.get("show_cert_id", True)),
            show_hologram=bool(raw.get("show_hologram", True)),
        )

def _superadmin_audience_union_stmt(source: str):
    pm_email, pm_non_empty = _non_empty_normalized_email(PublicMember.email)
    attendee_email, attendee_non_empty = _non_empty_normalized_email(Attendee.email)
    organizer_email, organizer_non_empty = _non_empty_normalized_email(User.email)

    public_members_stmt = select(
        pm_email.label("email"),
        literal(1).label("public_member_count"),
        literal(0).label("attendee_count"),
        literal(0).label("organizer_count"),
    ).where(PublicMember.email.is_not(None), pm_non_empty)

    attendees_stmt = select(
        attendee_email.label("email"),
        literal(0).label("public_member_count"),
        literal(1).label("attendee_count"),
        literal(0).label("organizer_count"),
    ).where(Attendee.email.is_not(None), attendee_non_empty)

    organizers_stmt = select(
        organizer_email.label("email"),
        literal(0).label("public_member_count"),
        literal(0).label("attendee_count"),
        literal(1).label("organizer_count"),
    ).where(User.email.is_not(None), organizer_non_empty, User.role == Role.admin)

    if source == "public_members":
        return public_members_stmt
    if source == "attendees":
        return attendees_stmt
    if source == "organizers":
        return organizers_stmt
    return union_all(public_members_stmt, attendees_stmt, organizers_stmt)

async def _resolve_superadmin_recipient_emails(db: AsyncSession, source: str) -> List[str]:
    audience_union = _superadmin_audience_union_stmt(source).subquery("audience_send")
    email_rows_res = await db.execute(
        select(distinct(audience_union.c.email)).order_by(audience_union.c.email.asc())
    )
    return [email for email in email_rows_res.scalars().all() if email]

async def _resolve_system_digest_recipient_emails(db: AsyncSession) -> List[str]:
    member_emails_stmt = select(func.lower(func.trim(PublicMember.email)).label("email")).where(
        PublicMember.email.is_not(None),
        func.trim(PublicMember.email) != "",
        PublicMember.digest_opt_in == True,
    )
    attendee_emails_stmt = select(func.lower(func.trim(Attendee.email)).label("email")).where(
        Attendee.email.is_not(None),
        func.trim(Attendee.email) != "",
        Attendee.unsubscribed_at.is_(None),
    )
    audieonce_stmt = union_all(member_emails_stmt, attendee_emails_stmt).subquery("system_digest_audieonce")
    email_rows_res = await db.execute(
        select(distinct(audieonce_stmt.c.email))
        .where(audieonce_stmt.c.email.is_not(None), audieonce_stmt.c.email != "")
        .order_by(audieonce_stmt.c.email.asc())
    )
    return [email for email in email_rows_res.scalars().all() if email]

async def _get_default_superadmin_id(db: AsyncSession) -> Optional[int]:
    res = await db.execute(select(User.id).where(User.role == Role.superadmin).order_by(User.id.asc()).limit(1))
    return res.scalar_one_or_none()

async def _ensure_system_digest_config(db: AsyncSession) -> SystemEmailDigestConfig:
    res = await db.execute(select(SystemEmailDigestConfig).where(SystemEmailDigestConfig.id == 1))
    config = res.scalar_one_or_none()
    if config:
        return config

    config = SystemEmailDigestConfig(id=1)
    db.add(config)
    await db.commit()
    await db.refresh(config)
    return config

def _system_digest_is_due(config: SystemEmailDigestConfig, now: datetime) -> bool:
    if not config.enabled:
        return False
    if now.hour != int(config.send_hour or 0):
        return False

    last_sent = config.last_sent_at
    if config.frequency == "daily":
        return not last_sent or last_sent.date() < now.date()

    if config.frequency == "weekly":
        if now.weekday() != int(config.send_weekday or 0):
            return False
        if not last_sent:
            return True
        return (last_sent.isocalendar().year, last_sent.isocalendar().week) < (now.isocalendar().year, now.isocalendar().week)

    return False

def _event_reservation_window(ev: Event, start_at: Optional[datetime], end_at: Optional[datetime]) -> tuple[datetime, datetime]:
    if start_at and end_at:
        start = start_at if start_at.tzinfo else start_at.replace(tzinfo=timezone.utc)
        end = end_at if end_at.tzinfo else end_at.replace(tzinfo=timezone.utc)
    elif ev.event_date:
        start = datetime.combine(ev.event_date, datetime.min.time(), tzinfo=timezone.utc)
        end = start + timedelta(days=1)
    else:
        raise HTTPException(status_code=400, detail="Venue reservation time range is required")
    if end <= start:
        raise HTTPException(status_code=400, detail="Venue reservation end must be after start")
    return start, end

def _build_local_ai_assistant_response(payload: AIAssistantIn, event: Optional[Event]) -> AIAssistantOut:
    text = payload.message.lower()
    lang = (payload.language or "tr").lower()
    is_tr = lang.startswith("tr")
    event_name = event.name if event else ("etkinlik" if is_tr else "event")

    registration_fields = [
        {"key": "full_name", "label": "Ad Soyad", "type": "text", "required": True},
        {"key": "email", "label": "E-posta", "type": "email", "required": True},
    ]
    if any(word in text for word in ["sirket", "firma", "company", "kurum"]):
        registration_fields.append({"key": "company", "label": "Sirket/Kurum", "type": "text", "required": False})
    if any(word in text for word in ["unvan", "title", "pozisyon", "position"]):
        registration_fields.append({"key": "job_title", "label": "Unvan", "type": "text", "required": False})
    if any(word in text for word in ["telefon", "phone", "sms"]):
        registration_fields.append({"key": "phone", "label": "Telefon", "type": "phone", "required": False})

    event_update: Dict[str, Any] = {}
    if any(word in text for word in ["konferans", "conference", "zirve", "summit"]):
        event_update["event_type"] = "conference"
    elif any(word in text for word in ["workshop", "atolye"]):
        event_update["event_type"] = "workshop"
    elif any(word in text for word in ["egitim", "training"]):
        event_update["event_type"] = "training"

    event_update["certificate_enabled"] = any(word in text for word in ["sertifika", "certificate"])
    event_update["checkin_enabled"] = any(word in text for word in ["qr", "check-in", "checkin", "katilim"])
    event_update["registration_enabled"] = True

    sessions = []
    if any(word in text for word in ["oturum", "session", "program", "gun", "gün"]):
        sessions = [
            {"title": "Acilis ve Tanisma", "duration_minutes": 30},
            {"title": "Ana Oturum", "duration_minutes": 60},
            {"title": "Soru-Cevap ve Kapanis", "duration_minutes": 30},
        ]

    if is_tr:
        answer = (
            f"{event_name} icin bunu taslak olarak kurabiliriz. Onerim: kayit formunu temel bilgilerle acmak, "
            "QR check-in ve sertifikayi istekte geciyorsa aktif etmek, oturum varsa kisa bir program taslagi "
            "olusturmak. Su an otomatik kaydetmiyorum; asagidaki alanlari onay ekranina tasiyabiliriz."
        )
    else:
        answer = (
            f"For {event_name}, I would draft the event with core registration fields, enable QR check-in "
            "and certificates when requested, and prepare a short session outline. I am not saving anything yet."
        )

    return AIAssistantOut(
        answer=answer,
        provider="local",
        suggestions={
            "event_update": event_update,
            "registration_fields": registration_fields,
            "sessions": sessions,
        },
    )

def _build_ai_event_context(event: Optional[Event]) -> Dict[str, Any]:
    if not event:
        return {}
    return {
        "id": event.id,
        "name": event.name,
        "event_type": getattr(event, "event_type", None),
        "event_date": event.event_date.isoformat() if event.event_date else None,
        "event_location": getattr(event, "event_location", None),
        "event_description": (getattr(event, "event_description", None) or "")[:300] or None,
        "certificate_enabled": bool(getattr(event, "certificate_enabled", False)),
        "checkin_enabled": bool(getattr(event, "checkin_enabled", False)),
        "ticketing_enabled": bool(getattr(event, "ticketing_enabled", False)),
        "registration_enabled": bool(getattr(event, "registration_enabled", False)),
        "quiz_enabled": bool(getattr(event, "quiz_enabled", False)),
        "cpd_enabled": bool(getattr(event, "cpd_enabled", False)),
        "visibility": getattr(event, "visibility", "private"),
        "registration_closed": bool(getattr(event, "registration_closed", False)),
    }

def _event_activity_detail(log: AuditLog) -> str:
    extra = log.extra if isinstance(log.extra, dict) else {}
    action = log.action or ""
    if action.startswith("team.member."):
        email = extra.get("member_email")
        role = extra.get("role")
        status = extra.get("status")
        pieces = []
        if email:
            pieces.append(f"Kisi: {email}")
        if role:
            pieces.append(f"Rol: {role}")
        if status:
            pieces.append(f"Durum: {status}")
        return " | ".join(pieces) or "Ekip kaydı güncellendi."
    if "attendee_email" in extra:
        return f"Katılımcı: {extra.get('attendee_email')}"
    if "title" in extra:
        return f"Baslik: {extra.get('title')}"
    if "status" in extra:
        return f"Yeni durum: {extra.get('status')}"
    return "Detay kaydı bulunmuyor."

async def _organization_for_request_host(request: Request, db: AsyncSession) -> Optional[Organization]:
    host = (request.headers.get("host") or "").split(":")[0].strip().lower()
    if not host:
        return None
    res = await db.execute(select(Organization).where(Organization.custom_domain == host))
    return res.scalar_one_or_none()

async def _ensure_event_allowed_for_request_host(request: Request, db: AsyncSession, event: Event) -> None:
    host_org = await _organization_for_request_host(request, db)
    if host_org and event.admin_id != host_org.user_id:
        raise HTTPException(status_code=404, detail="Event not found")

async def _get_or_create_admin_organization(db: AsyncSession, user_id: int) -> Organization:
    res = await db.execute(select(Organization).where(Organization.user_id == user_id))
    org = res.scalar_one_or_none()
    if org:
        return org

    for _ in range(20):
        candidate_public_id = f"org_{secrets.token_hex(8)}"
        exists_res = await db.execute(select(Organization.id).where(Organization.public_id == candidate_public_id))
        if exists_res.scalar_one_or_none() is None:
            org = Organization(
                user_id=user_id,
                public_id=candidate_public_id,
                org_name="",
                brand_color="#6366f1",
                settings={},
            )
            db.add(org)
            await db.flush()
            return org

    raise RuntimeError("Unable to generate organization public id")

def _serialize_admin_organization(org: Organization) -> dict[str, Any]:
    return {
        "id": org.id,
        "public_id": org.public_id,
        "org_name": org.org_name,
        "brand_logo": org.brand_logo,
        "brand_color": org.brand_color,
        "custom_domain": org.custom_domain,
        "settings": getattr(org, "settings", {}) or {},
    }

def _api_key_to_out(api_key: ApiKey) -> ApiKeyOut:
    return ApiKeyOut(
        id=api_key.id,
        name=api_key.name,
        key_prefix=api_key.key_prefix,
        is_active=api_key.is_active,
        scopes=list(api_key.scopes or []),
        last_used_at=api_key.last_used_at,
        expires_at=api_key.expires_at,
        created_at=api_key.created_at,
        rate_limit_per_min=api_key.rate_limit_per_min,
    )

def _event_team_member_allows(member: EventTeamMember, required_permission: Optional[str]) -> bool:
    if required_permission is None:
        required_permission = "event:view"
    return required_permission in set(_effective_event_team_permissions(member))

def _event_team_member_to_out(member: EventTeamMember) -> EventTeamMemberOut:
    return EventTeamMemberOut(
        id=member.id,
        event_id=member.event_id,
        user_id=member.user_id,
        email=member.email,
        role=member.role,
        permissions=[str(item) for item in member.permissions] if isinstance(member.permissions, list) else None,
        effective_permissions=_effective_event_team_permissions(member),
        status=member.status,
        invited_by=member.invited_by,
        created_at=member.created_at,
        updated_at=member.updated_at,
    )

def _ensure_certificate_feature_enabled(event: Event) -> None:
    if not is_certificate_enabled(event):
        raise HTTPException(status_code=403, detail="Certificate features are disabled for this event.")

def _ensure_checkin_feature_enabled(event: Event) -> None:
    if not is_checkin_enabled(event):
        raise HTTPException(status_code=403, detail="Check-in features are disabled for this event.")

def _ensure_sessions_feature_enabled(event: Event) -> None:
    """Session management is available when EITHER check-in or the agenda is enabled.
    Sessions back both QR attendance (check-in) and the public agenda (WP20), so an
    online/agenda-only event with check-in off can still build its schedule."""
    if not (is_checkin_enabled(event) or is_agenda_enabled(event)):
        raise HTTPException(status_code=403, detail="Session/agenda features are disabled for this event.")

def _ensure_ticketing_feature_enabled(event: Event) -> None:
    if not is_ticketing_enabled(event):
        raise HTTPException(status_code=403, detail="Ticket/pass features are disabled for this event.")

async def _issue_event_ticket_if_needed(db: AsyncSession, event: Event, attendee: Attendee) -> Optional[EventTicket]:
    if not is_ticketing_enabled(event):
        return None
    existing_res = await db.execute(
        select(EventTicket).where(
            EventTicket.event_id == event.id,
            EventTicket.attendee_id == attendee.id,
        )
    )
    existing = existing_res.scalar_one_or_none()
    if existing:
        return existing
    token = secrets.token_urlsafe(36)
    ticket = EventTicket(
        event_id=event.id,
        attendee_id=attendee.id,
        token=token,
        qr_payload=_ticket_public_url(token),
        status="issued",
    )
    db.add(ticket)
    await db.flush()
    from .crm_snapshot_hooks import refresh_crm_snapshot_for_attendee
    await refresh_crm_snapshot_for_attendee(db, attendee)
    return ticket

async def _get_or_create_ticket_checkin_session(db: AsyncSession, event: Event) -> EventSession:
    session_res = await db.execute(
        select(EventSession)
        .where(EventSession.event_id == event.id, EventSession.name == "Ticket Check-in")
        .order_by(EventSession.id.asc())
        .limit(1)
    )
    session = session_res.scalar_one_or_none()
    if session:
        return session

    session = EventSession(
        event_id=event.id,
        name="Ticket Check-in",
        session_date=event.event_date,
        session_location=event.event_location,
        checkin_token=str(_uuid_module.uuid4()).replace("-", ""),
        is_active=True,
    )
    db.add(session)
    await db.flush()
    return session

def attendee_is_confirmed(attendee: Any) -> bool:
    """True when an attendee may check in / receive a certificate. "pending" and
    "rejected" (awaiting or denied manual/offline-payment approval) are blocked;
    "not_required" (no approval gate) and "approved" pass."""
    status = getattr(attendee, "approval_status", None) or "not_required"
    return status in ("not_required", "approved")


async def _record_ticket_attendaonce(
    db: AsyncSession,
    *,
    event: Event,
    ticket: EventTicket,
    ip_address: Optional[str] = None,
) -> bool:
    session = await _get_or_create_ticket_checkin_session(db, event)
    existing_res = await db.execute(
        select(AttendaonceRecord.id).where(
            AttendaonceRecord.attendee_id == ticket.attendee_id,
            AttendaonceRecord.session_id == session.id,
        )
    )
    if existing_res.scalar_one_or_none() is not None:
        return False

    db.add(
        AttendaonceRecord(
            attendee_id=ticket.attendee_id,
            session_id=session.id,
            ip_address=ip_address,
        )
    )
    await db.flush()
    from .crm_snapshot_hooks import refresh_crm_snapshot_for_attendee
    await refresh_crm_snapshot_for_attendee(db, ticket.attendee_id)
    return True

def _ticket_to_out(ticket: EventTicket) -> EventTicketOut:
    return EventTicketOut(
        id=ticket.id,
        event_id=ticket.event_id,
        attendee_id=ticket.attendee_id,
        attendee_name=ticket.attendee.name,
        attendee_email=ticket.attendee.email,
        token=ticket.token,
        qr_payload=ticket.qr_payload,
        status=ticket.status,
        issued_at=ticket.issued_at,
        checked_in_at=ticket.checked_in_at,
    )

def _ticket_response_payload(ticket: Optional[EventTicket]) -> Optional[Dict[str, Any]]:
    if not ticket:
        return None
    return {
        "id": ticket.id,
        "token": ticket.token,
        "qr_payload": ticket.qr_payload,
        "status": ticket.status,
        "issued_at": ticket.issued_at.isoformat() if ticket.issued_at else None,
        "checked_in_at": ticket.checked_in_at.isoformat() if ticket.checked_in_at else None,
    }

def _session_to_out(s: EventSession, attendaonce_count: int = 0) -> SessionOut:
    start_str = s.session_start.strftime("%H:%M") if s.session_start else None
    end_str = s.session_end.strftime("%H:%M") if getattr(s, "session_end", None) else None
    return SessionOut(
        id=s.id,
        event_id=s.event_id,
        name=s.name,
        session_date=s.session_date.isoformat() if s.session_date else None,
        session_start=start_str,
        session_end=end_str,
        session_location=s.session_location,
        track=getattr(s, "track", None),
        speaker_name=getattr(s, "speaker_name", None),
        description=getattr(s, "description", None),
        capacity=getattr(s, "capacity", None),
        checkin_token=s.checkin_token,
        is_active=s.is_active,
        created_at=s.created_at,
        attendaonce_count=attendaonce_count,
        attendance_count=attendaonce_count,
    )

def _make_apple_wallet_pass(ticket: EventTicket) -> bytes:
    if not _apple_wallet_configured():
        raise HTTPException(
            status_code=503,
            detail="Apple Wallet pass configuration is missing",
        )

    event = ticket.event
    attendee = ticket.attendee
    event_date = event.event_date.isoformat() if event.event_date else None
    serial = f"ticket-{ticket.id}-{ticket.token}"
    ticket_url = f"{settings.frontend_base_url.rstrip('/')}/tickets/{ticket.token}"

    pass_payload: Dict[str, Any] = {
        "formatVersion": 1,
        "passTypeIdentifier": settings.apple_wallet_pass_type_id,
        "serialNumber": serial,
        "teamIdentifier": settings.apple_wallet_team_id,
        "organizationName": "HeptaCert",
        "description": f"{event.name} digital ticket",
        "logoText": "HeptaCert",
        "foregroundColor": "rgb(255, 255, 255)",
        "backgroundColor": "rgb(37, 99, 235)",
        "labelColor": "rgb(219, 234, 254)",
        "sharingProhibited": False,
        "barcodes": [
            {
                "format": "PKBarcodeFormatQR",
                "message": ticket.qr_payload,
                "messageEncoding": "iso-8859-1",
            }
        ],
        "barcode": {
            "format": "PKBarcodeFormatQR",
            "message": ticket.qr_payload,
            "messageEncoding": "iso-8859-1",
        },
        "eventTicket": {
            "primaryFields": [
                {"key": "event", "label": "Etkinlik", "value": event.name},
            ],
            "secondaryFields": [
                {"key": "name", "label": "Katılımcı", "value": attendee.name},
            ],
            "auxiliaryFields": [
                {"key": "status", "label": "Durum", "value": ticket.status},
            ],
            "backFields": [
                {"key": "email", "label": "E-posta", "value": attendee.email},
                {"key": "ticket", "label": "Bilet linki", "value": ticket_url},
            ],
        },
    }
    if event.event_location:
        pass_payload["eventTicket"]["secondaryFields"].append(
            {"key": "location", "label": "Konum", "value": event.event_location}
        )
    if event_date:
        pass_payload["relevantDate"] = f"{event_date}T09:00:00+03:00"
        pass_payload["eventTicket"]["auxiliaryFields"].insert(
            0,
            {"key": "date", "label": "Tarih", "value": event_date},
        )

    files: Dict[str, bytes] = {
        "pass.json": json.dumps(pass_payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8"),
        "icon.png": _make_pass_icon(29),
        "icon@2x.png": _make_pass_icon(58),
        "logo.png": _make_pass_icon(160),
        "logo@2x.png": _make_pass_icon(320),
    }
    manifest = {
        name: hashlib.sha1(content).hexdigest()
        for name, content in files.items()
    }
    manifest_bytes = json.dumps(manifest, separators=(",", ":"), sort_keys=True).encode("utf-8")

    cert = _load_x509_cert(settings.apple_wallet_cert_path)
    wwdr_cert = _load_x509_cert(settings.apple_wallet_wwdr_cert_path)
    key_password = settings.apple_wallet_key_password.encode("utf-8") if settings.apple_wallet_key_password else None
    key_data = Path(settings.apple_wallet_key_path).expanduser().read_bytes()
    private_key = serialization.load_pem_private_key(key_data, password=key_password)
    signature = (
        pkcs7.PKCS7SignatureBuilder()
        .set_data(manifest_bytes)
        .add_signer(cert, private_key, hashes.SHA256())
        .add_certificate(wwdr_cert)
        .sign(serialization.Encoding.DER, [pkcs7.PKCS7Options.DetachedSignature, pkcs7.PKCS7Options.Binary])
    )

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for name, content in files.items():
            archive.writestr(name, content)
        archive.writestr("manifest.json", manifest_bytes)
        archive.writestr("signature", signature)
    return buf.getvalue()

async def _get_event_attendaonce_counts(
    event_id: int,
    db: AsyncSession,
) -> tuple[List[Attendee], Dict[int, int]]:
    attendees_res = await db.execute(
        select(Attendee).where(Attendee.event_id == event_id).order_by(Attendee.name, Attendee.id)
    )
    attendees = attendees_res.scalars().all()
    if not attendees:
        return [], {}

    counts_res = await db.execute(
        select(AttendaonceRecord.attendee_id, func.count().label("cnt"))
        .where(AttendaonceRecord.attendee_id.in_([a.id for a in attendees]))
        .group_by(AttendaonceRecord.attendee_id)
    )
    counts = {int(row.attendee_id): int(row.cnt or 0) for row in counts_res.all()}
    return attendees, counts

def _raffle_to_out(
    raffle: EventRaffle,
    attendees: List[Attendee],
    attendaonce_counts: Dict[int, int],
    *,
    require_email_verification: bool,
) -> EventRaffleOut:
    def _winner_draw_sort_key(winner: EventRaffleWinner) -> datetime:
        drawn_at = winner.drawn_at or datetime.min
        if drawn_at.tzinfo is None:
            return drawn_at.replace(tzinfo=timezone.utc)
        return drawn_at.astimezone(timezone.utc)

    attendee_map = {attendee.id: attendee for attendee in attendees}
    eligible_attendees = [
        EventRaffleEligibleOut(
            attendee_id=attendee.id,
            attendee_name=attendee.name,
            attendee_email=attendee.email,
            sessions_attended=attendaonce_counts.get(attendee.id, 0),
        )
        for attendee in attendees
        if (attendee.email_verified or not require_email_verification)
        and attendaonce_counts.get(attendee.id, 0) >= raffle.min_sessions_required
    ]
    winners: List[EventRaffleWinnerOut] = []
    for winner in sorted(raffle.winners, key=_winner_draw_sort_key):
        attendee = attendee_map.get(winner.attendee_id) or winner.attendee
        if not attendee:
            continue
        winners.append(
            EventRaffleWinnerOut(
                attendee_id=attendee.id,
                attendee_name=attendee.name,
                attendee_email=attendee.email,
                sessions_attended=attendaonce_counts.get(attendee.id, 0),
                drawn_at=winner.drawn_at,
            )
        )

    return EventRaffleOut(
        id=raffle.id,
        event_id=raffle.event_id,
        title=raffle.title,
        prize_name=raffle.prize_name,
        description=raffle.description,
        min_sessions_required=raffle.min_sessions_required,
        winner_count=raffle.winner_count,
        reserve_winner_count=raffle.reserve_winner_count,
        status=raffle.status,
        created_at=raffle.created_at,
        updated_at=raffle.updated_at,
        drawn_at=raffle.drawn_at,
        eligible_count=len(eligible_attendees),
        total_attendees=len(attendees),
        eligible_attendees=eligible_attendees,
        winners=winners,
    )

def _pick_raffle_winners(
    raffle: EventRaffle,
    attendees: List[Attendee],
    attendaonce_counts: Dict[int, int],
    *,
    require_email_verification: bool,
    excluded_attendee_ids: Optional[set[int]] = None,
) -> List[Attendee]:
    excluded = excluded_attendee_ids or set()
    eligible_attendees = [
        attendee
        for attendee in attendees
        if (attendee.email_verified or not require_email_verification)
        and attendaonce_counts.get(attendee.id, 0) >= raffle.min_sessions_required
        and attendee.id not in excluded
    ]
    if not eligible_attendees:
        raise HTTPException(status_code=400, detail="cekiliş icin uygun katılımcı bulunamadı")

    draw_count = min(raffle.winner_count + raffle.reserve_winner_count, len(eligible_attendees))
    return secrets.SystemRandom().sample(eligible_attendees, draw_count)

def _event_comment_to_out(comment: EventComment) -> PublicEventCommentOut:
    return PublicEventCommentOut(
        id=comment.id,
        event_id=comment.event_id,
        member_public_id=comment.public_member.public_id,
        member_name=comment.public_member.display_name,
        member_email=comment.public_member.email,
        member_avatar_url=comment.public_member.avatar_url,
        body=comment.body,
        status=comment.status,
        report_count=comment.report_count,
        created_at=comment.created_at,
        updated_at=comment.updated_at,
    )

def _audit_category_filter(q: Any, category: Optional[str]) -> Any:
    if category == "legal":
        return q.where(or_(AuditLog.action.like("legal.%"), AuditLog.resource_type == "legal_consent"))
    if category == "security":
        return q.where(or_(AuditLog.action.like("security.%"), AuditLog.action.ilike("%login%"), AuditLog.action.ilike("%rate_limit%")))
    return q

def _audit_row_payload(log: AuditLog, user_email: Optional[str] = None) -> Dict[str, Any]:
    extra = log.extra or {}
    details = extra.get("detail") or extra.get("result") or extra.get("context") or extra.get("status_code")
    return {
        "id": log.id,
        "user_id": log.user_id,
        "user_email": user_email,
        "action": log.action,
        "resource_type": log.resource_type,
        "resource_id": log.resource_id,
        "ip_address": str(log.ip_address) if log.ip_address else None,
        "user_agent": log.user_agent[:300] if log.user_agent else None,
        "details": str(details) if details is not None else None,
        "extra": extra,
        "created_at": log.created_at.isoformat() if log.created_at else None,
    }

def _serialize_superadmin_org(org: Organization, domain_row: Optional[Any] = None) -> dict[str, Any]:
    domain_status = getattr(domain_row, "status", None) if domain_row else None
    return {
        "id": org.id,
        "user_id": org.user_id,
        "public_id": org.public_id,
        "org_name": org.org_name,
        "custom_domain": org.custom_domain,
        "brand_logo": org.brand_logo,
        "brand_color": org.brand_color,
        "created_at": org.created_at.isoformat() if org.created_at else None,
        "domain_status": domain_status,
        "domain_token": getattr(domain_row, "token", None) if domain_row else None,
        "verification_host": _white_label_verification_host(org.custom_domain),
        "dns_target": _white_label_dns_target() if org.custom_domain else None,
        "caddy_authorized": bool(org.custom_domain and domain_status == "active"),
    }

async def _domain_row_for_org(db: AsyncSession, org: Organization) -> Optional[Any]:
    if not org.custom_domain:
        return None
    from .domains import Domain

    return await Domain.get_by_domain(db, org.custom_domain)

async def _ensure_domain_row_for_org(db: AsyncSession, org: Organization) -> Optional[Any]:
    if not org.custom_domain:
        return None
    from .domains import Domain

    dom = await Domain.get_by_domain(db, org.custom_domain)
    if dom:
        dom.owner = str(org.user_id)
        db.add(dom)
        await db.flush()
        return dom
    return await Domain.create(db, org.custom_domain, owner=str(org.user_id))

async def _sync_superadmin_org_domain(db: AsyncSession, org: Organization, old_domain: Optional[str]) -> None:
    from .domains import Domain, DomainStatus

    if old_domain and old_domain != org.custom_domain:
        old = await Domain.get_by_domain(db, old_domain)
        if old:
            old.status = DomainStatus.revoked
            db.add(old)
    await _ensure_domain_row_for_org(db, org)

async def _maybe_log_cpd(
    db: AsyncSession,
    event_id: int,
    certificate_id: Optional[int],
    *,
    student_name: Optional[str] = None,
    attendee_email: Optional[str] = None,
) -> None:
    """MemberCpdLog yaz: event CPD config varsa ve attendee PublicMember'a bağlıysa."""
    from .accreditation_models import EventCpdConfig, MemberCpdLog

    cpd = (await db.execute(
        select(EventCpdConfig).where(EventCpdConfig.event_id == event_id)
    )).scalar_one_or_none()
    if not cpd:
        return

    q = select(Attendee.public_member_id).where(
        Attendee.event_id == event_id,
        Attendee.public_member_id.is_not(None),
    )
    if student_name:
        q = q.where(func.lower(func.trim(Attendee.name)) == student_name.strip().lower())
    elif attendee_email:
        q = q.where(func.lower(func.trim(Attendee.email)) == attendee_email.strip().lower())
    else:
        return

    member_id = (await db.execute(q.limit(1))).scalar_one_or_none()
    if not member_id:
        return

    already = (await db.execute(
        select(MemberCpdLog.id).where(
            MemberCpdLog.member_id == member_id,
            MemberCpdLog.event_id == event_id,
        )
    )).scalar_one_or_none()
    if already:
        return

    db.add(MemberCpdLog(
        member_id=member_id,
        event_id=event_id,
        body_id=cpd.body_id,
        cpd_hours=cpd.cpd_hours,
        cpd_category=cpd.cpd_category,
        certificate_id=certificate_id,
        earned_at=datetime.now(timezone.utc),
    ))
