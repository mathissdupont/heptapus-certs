"""
Notification integrations API — Slack, Teams, SMS, custom webhooks.
Settings are stored in organization.settings JSONB under 'notification_integrations'.
No additional migration needed.

Supported channels:
  - Slack   (Incoming Webhook URL)
  - Teams   (Teams Incoming Webhook URL / Power Automate)
  - SMS     (Twilio)
  - Custom  (any HTTP endpoint, JSON body)

Supported trigger events:
  cert.issued | cert.bulk_completed | attendee.registered | checkin.completed | training.overdue
"""

from __future__ import annotations

import hashlib
import hmac
import re
from datetime import datetime, timezone
from typing import Any, Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .main import (
    CurrentUser,
    Organization,
    Role,
    get_current_user,
    get_db,
    require_role,
    settings,
)
from .organization_access_api import ensure_organization_enterprise, get_organization_for_access, organization_id_from_request
from .webhooks import _is_private_address  # reuse SSRF guard

router = APIRouter()

SUPPORTED_EVENTS = {
    "cert.issued",
    "cert.bulk_completed",
    "attendee.registered",
    "checkin.completed",
    "training.overdue",
    "crm.lead_score_changed",
}

SETTINGS_KEY = "notification_integrations"


# ── Pydantic schemas ──────────────────────────────────────────────────────────

class NotificationWebhookChannel(BaseModel):
    url: str = Field(max_length=2000)
    events: list[str] = Field(default_factory=list, max_length=20)
    enabled: bool = True
    secret: Optional[str] = Field(default=None, max_length=256)

    @field_validator("url")
    @classmethod
    def url_must_be_https_and_public(cls, v: str) -> str:
        if not v.startswith(("https://", "http://")):
            raise ValueError("URL must start with https:// or http://")
        host = re.sub(r"https?://", "", v).split("/")[0].split(":")[0]
        if _is_private_address(host):
            raise ValueError("Private/internal URLs are not allowed")
        return v

    @field_validator("events")
    @classmethod
    def events_must_be_valid(cls, v: list[str]) -> list[str]:
        invalid = [e for e in v if e not in SUPPORTED_EVENTS]
        if invalid:
            raise ValueError(f"Unknown events: {', '.join(invalid)}")
        return v


class TwilioSmsConfig(BaseModel):
    account_sid: str = Field(max_length=64)
    auth_token: str = Field(max_length=64)
    from_number: str = Field(max_length=20)
    to_numbers: list[str] = Field(default_factory=list, max_length=50)
    events: list[str] = Field(default_factory=list, max_length=20)
    enabled: bool = True

    @field_validator("events")
    @classmethod
    def events_must_be_valid(cls, v: list[str]) -> list[str]:
        invalid = [e for e in v if e not in SUPPORTED_EVENTS]
        if invalid:
            raise ValueError(f"Unknown events: {', '.join(invalid)}")
        return v


class NotificationIntegrationsIn(BaseModel):
    slack: Optional[NotificationWebhookChannel] = None
    teams: Optional[NotificationWebhookChannel] = None
    custom: Optional[NotificationWebhookChannel] = None
    sms: Optional[TwilioSmsConfig] = None


class NotificationIntegrationsOut(NotificationIntegrationsIn):
    supported_events: list[str] = Field(default_factory=lambda: sorted(SUPPORTED_EVENTS))


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _get_org(db: AsyncSession, me: CurrentUser, request: Request) -> Organization:
    org = await get_organization_for_access(db, me, "organization:view", organization_id_from_request(request))
    if me.role != Role.superadmin:
        await ensure_organization_enterprise(db, org)
    return org


def _integrations_from_org(org: Organization) -> dict[str, Any]:
    s = org.settings or {}
    return s.get(SETTINGS_KEY) or {}


async def _save_integrations(db: AsyncSession, org: Organization, data: dict[str, Any]) -> None:
    settings_copy = dict(org.settings or {})
    settings_copy[SETTINGS_KEY] = data
    org.settings = settings_copy
    await db.commit()


def _slack_payload(event_type: str, context: dict[str, Any]) -> dict[str, Any]:
    icon = "📜" if "cert" in event_type else "✅" if "checkin" in event_type else "🔔"
    text = f"{icon} *{event_type}*"
    details = "\n".join(f"> {k}: {v}" for k, v in context.items() if v)
    return {
        "text": text,
        "blocks": [
            {"type": "section", "text": {"type": "mrkdwn", "text": f"{icon} *{event_type}*\n{details}"}},
        ],
    }


def _teams_payload(event_type: str, context: dict[str, Any]) -> dict[str, Any]:
    facts = [{"name": k, "value": str(v)} for k, v in context.items() if v]
    return {
        "@type": "MessageCard",
        "@context": "http://schema.org/extensions",
        "themeColor": "7C3AED",
        "summary": event_type,
        "sections": [{"activityTitle": event_type, "facts": facts}],
    }


def _sign_payload(secret: Optional[str], body: bytes) -> dict[str, str]:
    if not secret:
        return {}
    sig = hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
    return {"X-HeptaCert-Signature": f"sha256={sig}"}


async def _send_webhook(channel: NotificationWebhookChannel, payload: dict[str, Any]) -> bool:
    try:
        import json
        body = json.dumps(payload).encode()
        headers = {"Content-Type": "application/json", **_sign_payload(channel.secret, body)}
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.post(channel.url, content=body, headers=headers)
            return resp.status_code < 400
    except Exception:
        return False


async def _send_twilio_sms(cfg: TwilioSmsConfig, message: str) -> int:
    sent = 0
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            for number in cfg.to_numbers:
                resp = await client.post(
                    f"https://api.twilio.com/2010-04-01/Accounts/{cfg.account_sid}/Messages.json",
                    data={"From": cfg.from_number, "To": number, "Body": message[:1600]},
                    auth=(cfg.account_sid, cfg.auth_token),
                )
                if resp.status_code == 201:
                    sent += 1
    except Exception:
        pass
    return sent


# ── Public trigger function (called from cert issuance, check-in, etc.) ──────

async def trigger_notification_integrations(
    db: AsyncSession,
    org_id: int,
    event_type: str,
    context: dict[str, Any],
) -> None:
    """Call this from any code path where an integration notification should fire."""
    if event_type not in SUPPORTED_EVENTS:
        return
    org = await db.get(Organization, org_id)
    if not org:
        return
    data = _integrations_from_org(org)

    async def _fire(channel_key: str, build_payload):
        raw = data.get(channel_key)
        if not raw or not raw.get("enabled", True) or event_type not in raw.get("events", []):
            return
        try:
            channel = NotificationWebhookChannel(**raw)
            await _send_webhook(channel, build_payload())
        except Exception:
            pass

    await _fire("slack", lambda: _slack_payload(event_type, context))
    await _fire("teams", lambda: _teams_payload(event_type, context))
    await _fire("custom", lambda: {"event": event_type, "timestamp": datetime.now(timezone.utc).isoformat(), **context})

    sms_raw = data.get("sms")
    if sms_raw and sms_raw.get("enabled", True) and event_type in sms_raw.get("events", []):
        try:
            cfg = TwilioSmsConfig(**sms_raw)
            text = f"HeptaCert [{event_type}]: {context.get('event_name', '')} - {context.get('detail', '')}"
            await _send_twilio_sms(cfg, text)
        except Exception:
            pass


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get(
    "/api/admin/integrations/notifications",
    response_model=NotificationIntegrationsOut,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def get_notification_integrations(
    request: Request,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await _get_org(db, me, request)
    data = _integrations_from_org(org)
    return NotificationIntegrationsOut(
        slack=NotificationWebhookChannel(**data["slack"]) if data.get("slack") else None,
        teams=NotificationWebhookChannel(**data["teams"]) if data.get("teams") else None,
        custom=NotificationWebhookChannel(**data["custom"]) if data.get("custom") else None,
        sms=TwilioSmsConfig(**data["sms"]) if data.get("sms") else None,
    )


@router.patch(
    "/api/admin/integrations/notifications",
    response_model=NotificationIntegrationsOut,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def update_notification_integrations(
    request: Request,
    payload: NotificationIntegrationsIn,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await _get_org(db, me, request)
    existing = _integrations_from_org(org)

    update: dict[str, Any] = {}
    if payload.slack is not None:
        update["slack"] = payload.slack.model_dump()
    if payload.teams is not None:
        update["teams"] = payload.teams.model_dump()
    if payload.custom is not None:
        update["custom"] = payload.custom.model_dump()
    if payload.sms is not None:
        update["sms"] = payload.sms.model_dump()

    merged = {**existing, **update}
    await _save_integrations(db, org, merged)
    return await get_notification_integrations(request, me=me, db=db)


@router.delete(
    "/api/admin/integrations/notifications/{channel}",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def remove_notification_channel(
    request: Request,
    channel: str,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if channel not in ("slack", "teams", "custom", "sms"):
        raise HTTPException(status_code=400, detail="Unknown channel")
    org = await _get_org(db, me, request)
    data = _integrations_from_org(org)
    data.pop(channel, None)
    await _save_integrations(db, org, data)
    return {"ok": True, "removed": channel}


@router.post(
    "/api/admin/integrations/notifications/test",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def test_notification_channel(
    request: Request,
    payload: NotificationWebhookChannel,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Send a test message to the specified webhook URL."""
    await _get_org(db, me, request)
    test_context = {"event_name": "Test Event", "detail": "HeptaCert entegrasyon testi — bağlantı başarılı!"}
    test_payload = _slack_payload("test.ping", test_context)
    ok = await _send_webhook(payload, test_payload)
    if not ok:
        raise HTTPException(status_code=502, detail="Test mesajı gönderilemedi. URL ve erişilebilirliği kontrol edin.")
    return {"ok": True}
