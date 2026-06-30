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
    GOOGLE_CALENDAR_SCOPES,
    GOOGLE_SHEETS_SCOPES,
    MS365_EXCEL_SCOPES,
    Organization,
    Role,
    UserGoogleIntegration,
    UserMicrosoftIntegration,
    _decrypt_secret,
    _encrypt_secret,
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
    "attendee.register",
    "attendee.registered",
    "checkin.completed",
    "training.overdue",
    "crm.lead_score_changed",
}

SETTINGS_KEY = "notification_integrations"
EVENT_ALIASES = {"attendee.register": "attendee.registered"}
ENTERPRISE_SETTINGS_KEY = "enterprise_integrations"
SECRET_MASK = "********"
GENERIC_PROVIDER_KEYS = {
    "salesforce",
    "mailchimp_brevo",
    "whatsapp_sms",
    "drive_sharepoint_archive",
    "power_bi_looker",
    "lms",
    "accounting_tr",
}


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


class WhatsAppBusinessConfig(BaseModel):
    phone_number_id: str = Field(max_length=64)
    access_token: str = Field(max_length=512)
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
    discord: Optional[NotificationWebhookChannel] = None
    google_chat: Optional[NotificationWebhookChannel] = None
    custom: Optional[NotificationWebhookChannel] = None
    sms: Optional[TwilioSmsConfig] = None
    whatsapp: Optional[WhatsAppBusinessConfig] = None


class NotificationIntegrationsOut(NotificationIntegrationsIn):
    supported_events: list[str] = Field(default_factory=lambda: sorted(SUPPORTED_EVENTS))


class IntegrationCatalogItem(BaseModel):
    key: str
    name: str
    category: str
    status: str
    description: str
    connect_type: str
    priority: int
    configured: bool = False
    connected: bool = False
    docs_url: Optional[str] = None
    settings_href: Optional[str] = None
    app_required: bool = False
    app_provider: Optional[str] = None
    setup_url: Optional[str] = None
    required_scopes: list[str] = Field(default_factory=list)
    callback_urls: list[str] = Field(default_factory=list)
    credential_fields: list[str] = Field(default_factory=list)


class IntegrationCatalogOut(BaseModel):
    items: list[IntegrationCatalogItem]
    supported_events: list[str] = Field(default_factory=lambda: sorted(SUPPORTED_EVENTS))


class OidcSsoConfig(BaseModel):
    enabled: bool = False
    issuer_url: str = Field(default="", max_length=500)
    client_id: str = Field(default="", max_length=255)
    client_secret: str = Field(default="", max_length=512)
    allowed_domains: list[str] = Field(default_factory=list, max_length=50)


class WebinarImportConfig(BaseModel):
    enabled: bool = False
    provider: str = Field(default="zoom", pattern="^(zoom|microsoft_teams)$")
    account_id: str = Field(default="", max_length=255)
    client_id: str = Field(default="", max_length=255)
    client_secret: str = Field(default="", max_length=512)


class GenericProviderConfig(BaseModel):
    enabled: bool = False
    provider: str = Field(default="", max_length=80)
    auth_type: str = Field(default="api_key", pattern="^(api_key|bearer_token|oauth|basic|webhook|none)$")
    base_url: str = Field(default="", max_length=1000)
    api_key: str = Field(default="", max_length=1000)
    access_token: str = Field(default="", max_length=2000)
    client_id: str = Field(default="", max_length=255)
    client_secret: str = Field(default="", max_length=512)
    account_id: str = Field(default="", max_length=255)
    list_id: str = Field(default="", max_length=255)
    folder_id: str = Field(default="", max_length=255)
    report_id: str = Field(default="", max_length=255)
    course_id: str = Field(default="", max_length=255)
    field_mapping: dict[str, str] = Field(default_factory=dict)
    notes: str = Field(default="", max_length=1000)


class EnterpriseIntegrationsIn(BaseModel):
    oidc: Optional[OidcSsoConfig] = None
    webinar: Optional[WebinarImportConfig] = None
    providers: Optional[dict[str, GenericProviderConfig]] = None


class EnterpriseIntegrationsOut(BaseModel):
    oidc: Optional[OidcSsoConfig] = None
    webinar: Optional[WebinarImportConfig] = None
    providers: dict[str, GenericProviderConfig] = Field(default_factory=dict)


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _get_org(db: AsyncSession, me: CurrentUser, request: Request) -> Organization:
    org = await get_organization_for_access(db, me, "organization:view", organization_id_from_request(request))
    if me.role != Role.superadmin:
        await ensure_organization_enterprise(db, org)
    return org


def _integrations_from_org(org: Organization) -> dict[str, Any]:
    s = org.settings or {}
    return s.get(SETTINGS_KEY) or {}


def _enterprise_integrations_from_org(org: Organization) -> dict[str, Any]:
    s = org.settings or {}
    return s.get(ENTERPRISE_SETTINGS_KEY) or {}


def _is_secret_placeholder(value: Any) -> bool:
    if value is None:
        return True
    return str(value).strip() in {"", SECRET_MASK}


def _mask_secret_value(value: Any) -> str:
    return SECRET_MASK if value else ""


def _decrypt_stored_secret(value: Any) -> str:
    decrypted = _decrypt_secret(str(value)) if value else None
    return decrypted or ""


def _encrypt_stored_secret(value: Any) -> str:
    encrypted = _encrypt_secret(str(value)) if value else None
    return encrypted or ""


def _normalize_stored_secret(value: Any) -> str:
    if not value:
        return ""
    raw = str(value)
    if raw.startswith("enc:v1:"):
        return raw
    return _encrypt_stored_secret(_decrypt_stored_secret(raw))


def _mask_fields(raw: dict[str, Any], fields: set[str]) -> dict[str, Any]:
    masked = dict(raw or {})
    for field in fields:
        if field in masked:
            masked[field] = _mask_secret_value(masked.get(field))
    return masked


def _merge_secret_fields(existing: dict[str, Any], incoming: dict[str, Any], fields: set[str]) -> dict[str, Any]:
    merged = dict(incoming or {})
    for field in fields:
        if field not in merged:
            continue
        if _is_secret_placeholder(merged.get(field)):
            merged[field] = _normalize_stored_secret(existing.get(field))
        else:
            merged[field] = _encrypt_stored_secret(merged.get(field))
    return merged


def _decrypt_fields(raw: dict[str, Any], fields: set[str]) -> dict[str, Any]:
    decrypted = dict(raw or {})
    for field in fields:
        if field in decrypted:
            decrypted[field] = _decrypt_stored_secret(decrypted.get(field))
    return decrypted


def _masked_notification_channel(raw: dict[str, Any] | None) -> NotificationWebhookChannel | None:
    if not raw:
        return None
    return NotificationWebhookChannel(**_mask_fields(raw, {"secret"}))


def _masked_sms_config(raw: dict[str, Any] | None) -> TwilioSmsConfig | None:
    if not raw:
        return None
    return TwilioSmsConfig(**_mask_fields(raw, {"auth_token"}))


def _masked_oidc_config(raw: dict[str, Any] | None) -> OidcSsoConfig | None:
    if not raw:
        return None
    return OidcSsoConfig(**_mask_fields(raw, {"client_secret"}))


def _masked_webinar_config(raw: dict[str, Any] | None) -> WebinarImportConfig | None:
    if not raw:
        return None
    return WebinarImportConfig(**_mask_fields(raw, {"client_secret"}))


def _masked_whatsapp_config(raw: dict[str, Any] | None) -> WhatsAppBusinessConfig | None:
    if not raw:
        return None
    return WhatsAppBusinessConfig(**_mask_fields(raw, {"access_token"}))


def _masked_provider_config(raw: dict[str, Any] | None) -> GenericProviderConfig | None:
    if not raw:
        return None
    return GenericProviderConfig(**_mask_fields(raw, {"api_key", "access_token", "client_secret"}))


def _normalize_event_type(event_type: str) -> str:
    return EVENT_ALIASES.get(event_type, event_type)


def _scopes_cover(current: list[str], required: list[str]) -> bool:
    return set(current or []).issuperset(set(required or []))


async def _save_integrations(db: AsyncSession, org: Organization, data: dict[str, Any]) -> None:
    settings_copy = dict(org.settings or {})
    settings_copy[SETTINGS_KEY] = data
    org.settings = settings_copy
    await db.commit()


async def _save_enterprise_integrations(db: AsyncSession, org: Organization, data: dict[str, Any]) -> None:
    settings_copy = dict(org.settings or {})
    settings_copy[ENTERPRISE_SETTINGS_KEY] = data
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


def _plain_message(event_type: str, context: dict[str, Any]) -> str:
    icon = "📜" if "cert" in event_type else "✅" if "checkin" in event_type else "🔔"
    details = "\n".join(f"• {k}: {v}" for k, v in context.items() if v)
    return f"{icon} {event_type}\n{details}".strip()


def _discord_payload(event_type: str, context: dict[str, Any]) -> dict[str, Any]:
    # Discord Incoming Webhook expects "content" (max 2000 chars).
    return {"content": _plain_message(event_type, context)[:2000]}


def _google_chat_payload(event_type: str, context: dict[str, Any]) -> dict[str, Any]:
    # Google Chat Incoming Webhook expects "text".
    return {"text": _plain_message(event_type, context)[:4000]}


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


async def _send_whatsapp_message(cfg: WhatsAppBusinessConfig, message: str) -> int:
    sent = 0
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            for number in cfg.to_numbers:
                resp = await client.post(
                    f"https://graph.facebook.com/v19.0/{cfg.phone_number_id}/messages",
                    headers={"Authorization": f"Bearer {cfg.access_token}", "Content-Type": "application/json"},
                    json={
                        "messaging_product": "whatsapp",
                        "to": number.lstrip("+").replace(" ", "").replace("-", ""),
                        "type": "text",
                        "text": {"body": message[:4096]},
                    },
                )
                if resp.status_code < 400:
                    sent += 1
    except Exception:
        pass
    return sent


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
    event_type = _normalize_event_type(event_type)
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
            channel = NotificationWebhookChannel(**_decrypt_fields(raw, {"secret"}))
            await _send_webhook(channel, build_payload())
        except Exception:
            pass

    await _fire("slack", lambda: _slack_payload(event_type, context))
    await _fire("teams", lambda: _teams_payload(event_type, context))
    await _fire("discord", lambda: _discord_payload(event_type, context))
    await _fire("google_chat", lambda: _google_chat_payload(event_type, context))
    await _fire("custom", lambda: {"event": event_type, "timestamp": datetime.now(timezone.utc).isoformat(), **context})

    sms_raw = data.get("sms")
    if sms_raw and sms_raw.get("enabled", True) and event_type in sms_raw.get("events", []):
        try:
            cfg = TwilioSmsConfig(**_decrypt_fields(sms_raw, {"auth_token"}))
            text = f"HeptaCert [{event_type}]: {context.get('event_name', '')} - {context.get('detail', '')}"
            await _send_twilio_sms(cfg, text)
        except Exception:
            pass

    whatsapp_raw = data.get("whatsapp")
    if whatsapp_raw and whatsapp_raw.get("enabled", True) and event_type in whatsapp_raw.get("events", []):
        try:
            cfg = WhatsAppBusinessConfig(**_decrypt_fields(whatsapp_raw, {"access_token"}))
            text = f"HeptaCert [{event_type}]: {context.get('event_name', '')} - {context.get('detail', '')}"
            await _send_whatsapp_message(cfg, text)
        except Exception:
            pass


# ── Endpoints ─────────────────────────────────────────────────────────────────

async def trigger_notification_integrations_for_user(
    db: AsyncSession,
    user_id: int,
    event_type: str,
    context: dict[str, Any],
) -> None:
    org_res = await db.execute(select(Organization).where(Organization.user_id == user_id).limit(1))
    org = org_res.scalar_one_or_none()
    if not org:
        return
    await trigger_notification_integrations(db, org.id, event_type, context)


@router.get(
    "/api/admin/integrations/catalog",
    response_model=IntegrationCatalogOut,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def get_integration_catalog(
    request: Request,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await _get_org(db, me, request)
    notifications = _integrations_from_org(org)
    enterprise = _enterprise_integrations_from_org(org)
    provider_configs = enterprise.get("providers") or {}
    crm_integrations = (org.settings or {}).get("crm_integrations") or {}
    google = (await db.execute(select(UserGoogleIntegration).where(UserGoogleIntegration.user_id == org.user_id))).scalar_one_or_none()
    microsoft = (await db.execute(select(UserMicrosoftIntegration).where(UserMicrosoftIntegration.user_id == org.user_id))).scalar_one_or_none()

    google_scopes = list(google.scopes or []) if google else []
    microsoft_scopes = list(microsoft.scopes or []) if microsoft else []
    public_base = settings.public_base_url.rstrip("/")
    google_oauth_callback = f"{public_base}/api/admin/google/sheets/callback"
    microsoft_excel_callback = f"{public_base}/api/admin/microsoft/excel/callback"
    sso_callback = f"{public_base}/api/auth/oidc/callback"
    slack_callback = f"{public_base}/api/admin/integrations/slack/callback"

    def item(
        key: str,
        name: str,
        category: str,
        description: str,
        connect_type: str,
        priority: int,
        *,
        configured: bool = False,
        connected: bool = False,
        docs_url: Optional[str] = None,
        settings_href: Optional[str] = None,
        status: Optional[str] = None,
        app_required: bool = False,
        app_provider: Optional[str] = None,
        setup_url: Optional[str] = None,
        required_scopes: Optional[list[str]] = None,
        callback_urls: Optional[list[str]] = None,
        credential_fields: Optional[list[str]] = None,
    ) -> IntegrationCatalogItem:
        resolved_status = status or ("connected" if connected else "available" if configured else "not_configured")
        return IntegrationCatalogItem(
            key=key,
            name=name,
            category=category,
            status=resolved_status,
            description=description,
            connect_type=connect_type,
            priority=priority,
            configured=configured,
            connected=connected,
            docs_url=docs_url,
            settings_href=settings_href,
            app_required=app_required,
            app_provider=app_provider,
            setup_url=setup_url,
            required_scopes=required_scopes or [],
            callback_urls=callback_urls or [],
            credential_fields=credential_fields or [],
        )

    items = [
        item(
            "google_sheets",
            "Google Sheets",
            "Data sync",
            "Sync attendees, segments, registration answers, and certificate status into Sheets.",
            "oauth",
            10,
            configured=bool(settings.google_oauth_client_id and settings.google_oauth_client_secret),
            connected=bool(google and _scopes_cover(google_scopes, GOOGLE_SHEETS_SCOPES)),
            docs_url="https://developers.google.com/sheets/api",
            settings_href="/admin/events",
            app_required=True,
            app_provider="Google Cloud OAuth client",
            setup_url="https://developers.google.com/identity/protocols/oauth2/web-server",
            required_scopes=GOOGLE_SHEETS_SCOPES,
            callback_urls=[google_oauth_callback],
            credential_fields=["GOOGLE_OAUTH_CLIENT_ID", "GOOGLE_OAUTH_CLIENT_SECRET"],
        ),
        item(
            "microsoft_excel",
            "Microsoft Excel",
            "Data sync",
            "Sync event data into Excel workbooks in OneDrive or SharePoint.",
            "oauth",
            20,
            configured=bool(settings.ms365_oauth_client_id and settings.ms365_oauth_client_secret),
            connected=bool(microsoft and _scopes_cover(microsoft_scopes, MS365_EXCEL_SCOPES)),
            docs_url="https://learn.microsoft.com/graph/api/resources/excel",
            settings_href="/admin/events",
            app_required=True,
            app_provider="Microsoft Entra app registration",
            setup_url="https://learn.microsoft.com/en-us/entra/identity-platform/v2-app-types",
            required_scopes=MS365_EXCEL_SCOPES,
            callback_urls=[microsoft_excel_callback],
            credential_fields=["MS365_OAUTH_CLIENT_ID", "MS365_OAUTH_CLIENT_SECRET"],
        ),
        item(
            "google_calendar",
            "Google Calendar",
            "Calendar",
            "Two-way sync venue reservations and event schedules.",
            "oauth",
            30,
            configured=bool(settings.google_oauth_client_id and settings.google_oauth_client_secret),
            connected=bool(google and _scopes_cover(google_scopes, GOOGLE_CALENDAR_SCOPES)),
            docs_url="https://developers.google.com/calendar/api",
            settings_href="/admin/settings?tab=venues",
            app_required=True,
            app_provider="Google Cloud OAuth client",
            setup_url="https://developers.google.com/identity/protocols/oauth2/web-server",
            required_scopes=GOOGLE_CALENDAR_SCOPES,
            callback_urls=[google_oauth_callback],
            credential_fields=["GOOGLE_OAUTH_CLIENT_ID", "GOOGLE_OAUTH_CLIENT_SECRET"],
        ),
        item("slack", "Slack", "Notifications", "Post registrations, check-ins, certificate and CRM alerts into Slack channels.", "webhook", 40, configured=True, connected=bool(notifications.get("slack")), docs_url="https://api.slack.com/incoming-webhooks", app_required=True, app_provider="Slack app", setup_url="https://api.slack.com/apps", required_scopes=["incoming-webhook"], callback_urls=[slack_callback], credential_fields=["Webhook URL"]),
        item("microsoft_teams", "Microsoft Teams", "Notifications", "Post operational cards into Teams channels through Workflows webhooks.", "webhook", 50, configured=True, connected=bool(notifications.get("teams")), docs_url="https://support.microsoft.com/teams/apps-service/create-incoming-webhooks-with-workflows-for-microsoft-teams"),
        item("discord", "Discord", "Notifications", "Post registration, check-in, and certificate alerts into a Discord channel via an Incoming Webhook.", "webhook", 52, configured=True, connected=bool(notifications.get("discord")), docs_url="https://support.discord.com/hc/en-us/articles/228383668-Intro-to-Webhooks", credential_fields=["Webhook URL"]),
        item("google_chat", "Google Chat", "Notifications", "Post operational alerts into a Google Chat space using an Incoming Webhook.", "webhook", 54, configured=True, connected=bool(notifications.get("google_chat")), docs_url="https://developers.google.com/workspace/chat/quickstart/webhooks", credential_fields=["Webhook URL"]),
        item("zapier", "Zapier", "Automation", "Trigger Zapier workflows for registrations, certificates, check-ins, CRM changes, and training alerts.", "webhook", 60, configured=True, connected=bool(notifications.get("custom")), docs_url="https://help.zapier.com/hc/en-us/articles/8496083355661-How-to-Get-Started-with-Webhooks-by-Zapier"),
        item("make", "Make", "Automation", "Trigger Make scenarios through custom webhooks using the same HeptaCert event payload.", "webhook", 70, configured=True, connected=bool(notifications.get("custom")), docs_url="https://help.make.com/webhooks"),
        item("hubspot", "HubSpot", "CRM", "Push attendees and segments into HubSpot contacts and lists.", "private_app_token", 80, configured=True, connected=bool((crm_integrations.get("hubspot") or {}).get("private_app_token")), docs_url="https://developers.hubspot.com/docs/api-reference/latest/crm/objects/contacts/guide", settings_href="/admin/crm", app_required=True, app_provider="HubSpot private app", setup_url="https://developers.hubspot.com/docs/guides/apps/private-apps/overview", required_scopes=["crm.objects.contacts.read", "crm.objects.contacts.write"], credential_fields=["Private app access token"]),
        item("salesforce", "Salesforce", "CRM", "Sync event participants and certification status into Salesforce leads or contacts.", "oauth", 90, configured=True, connected=bool((provider_configs.get("salesforce") or {}).get("enabled")), docs_url="https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/", app_required=True, app_provider="Salesforce connected/external client app", setup_url="https://developer.salesforce.com/docs/atlas.en-us.mobile_sdk.meta/mobile_sdk/connected_apps.htm", required_scopes=["api", "refresh_token"], callback_urls=[f"{public_base}/api/admin/integrations/salesforce/callback"], credential_fields=["Client ID", "Client secret", "Instance URL"]),
        item("sso_saml_oidc", "SSO / SAML / OIDC", "Identity", "Enterprise sign-in with Microsoft Entra ID, Okta, Google Workspace, and SAML providers.", "sso", 100, configured=True, connected=bool((enterprise.get("oidc") or {}).get("enabled") and (enterprise.get("oidc") or {}).get("issuer_url")), app_required=True, app_provider="OIDC/SAML identity provider app", setup_url="https://learn.microsoft.com/en-us/entra/identity-platform/v2-protocols", required_scopes=["openid", "profile", "email"], callback_urls=[sso_callback], credential_fields=["Issuer URL", "Client ID", "Client secret", "Allowed domains"]),
        item("scim", "SCIM Provisioning", "Identity", "Automate user provisioning and deprovisioning from enterprise identity providers.", "scim", 110, status="planned", app_required=True, app_provider="Identity provider SCIM app", setup_url="https://learn.microsoft.com/en-us/entra/identity/app-provisioning/use-scim-to-provision-users-and-groups", callback_urls=[f"{public_base}/api/scim/v2"], credential_fields=["SCIM bearer token"]),
        item("zoom_teams_webinar", "Zoom / Teams Webinar", "Events", "Import webinar attendance and completion data for certificate eligibility.", "oauth", 120, configured=True, connected=bool((enterprise.get("webinar") or {}).get("enabled") and (enterprise.get("webinar") or {}).get("client_id")), app_required=True, app_provider="Zoom Server-to-Server OAuth app or Microsoft Entra app", setup_url="https://developers.zoom.us/docs/internal-apps/create/", required_scopes=["report:read:admin", "webinar:read:admin"], callback_urls=[microsoft_excel_callback], credential_fields=["Account/Tenant ID", "Client ID", "Client secret"]),
        item("whatsapp_sms", "WhatsApp Business / SMS", "Messaging", "Send QR tickets, reminders, and certificate notifications over SMS or WhatsApp.", "provider_credentials", 130, connected=bool(notifications.get("sms") or (provider_configs.get("whatsapp_sms") or {}).get("enabled")), configured=True, app_required=True, app_provider="Meta app / WhatsApp Business app or Twilio account", setup_url="https://developers.facebook.com/docs/whatsapp/cloud-api/get-started", required_scopes=["whatsapp_business_messaging"], credential_fields=["Phone number ID", "Business account ID", "Access token"]),
        item("mailchimp_brevo", "Mailchimp / Brevo", "Marketing", "Export event segments into marketing audiences and campaigns.", "api_key", 140, configured=True, connected=bool((provider_configs.get("mailchimp_brevo") or {}).get("enabled"))),
        item("drive_sharepoint_archive", "Drive / SharePoint Archive", "Document storage", "Archive generated certificates and reports into organization folders.", "oauth", 150, configured=True, connected=bool((provider_configs.get("drive_sharepoint_archive") or {}).get("enabled")), app_required=True, app_provider="Google Cloud OAuth client or Microsoft Entra app", setup_url="https://learn.microsoft.com/en-us/entra/identity-platform/v2-app-types", required_scopes=["Files.ReadWrite", "Sites.ReadWrite.All"], callback_urls=[google_oauth_callback, microsoft_excel_callback], credential_fields=["Client ID", "Client secret", "Folder ID"]),
        item("power_bi_looker", "Power BI / Looker Studio", "Analytics", "Expose event analytics for executive dashboards.", "data_export", 160, configured=True, connected=bool((provider_configs.get("power_bi_looker") or {}).get("enabled")), app_required=True, app_provider="Microsoft Entra app or Google Cloud connector", setup_url="https://learn.microsoft.com/en-us/power-bi/developer/embedded/register-app", required_scopes=["Dataset.ReadWrite.All", "Report.Read.All"], callback_urls=[microsoft_excel_callback], credential_fields=["Workspace ID", "Dataset/Report ID", "Access token"]),
        item("lms", "Moodle / Canvas LMS", "Learning", "Use course completion data to issue or renew certificates.", "oauth", 170, configured=True, connected=bool((provider_configs.get("lms") or {}).get("enabled"))),
        item("accounting_tr", "Logo / Parasut / Mikro", "Accounting", "Sync invoices, institutional payments, and billing references for Turkey.", "api_key", 180, configured=True, connected=bool((provider_configs.get("accounting_tr") or {}).get("enabled"))),
    ]

    return IntegrationCatalogOut(items=sorted(items, key=lambda value: value.priority))


@router.get(
    "/api/admin/integrations/enterprise-config",
    response_model=EnterpriseIntegrationsOut,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def get_enterprise_integrations(
    request: Request,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await _get_org(db, me, request)
    data = _enterprise_integrations_from_org(org)
    providers = {
        key: masked
        for key, value in (data.get("providers") or {}).items()
        if key in GENERIC_PROVIDER_KEYS and isinstance(value, dict)
        for masked in [_masked_provider_config(value)]
        if masked is not None
    }
    return EnterpriseIntegrationsOut(
        oidc=_masked_oidc_config(data.get("oidc")),
        webinar=_masked_webinar_config(data.get("webinar")),
        providers=providers,
    )


@router.patch(
    "/api/admin/integrations/enterprise-config",
    response_model=EnterpriseIntegrationsOut,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def update_enterprise_integrations(
    request: Request,
    payload: EnterpriseIntegrationsIn,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await _get_org(db, me, request)
    existing = _enterprise_integrations_from_org(org)
    update: dict[str, Any] = {}
    if payload.oidc is not None:
        update["oidc"] = _merge_secret_fields(
            existing.get("oidc") or {},
            payload.oidc.model_dump(),
            {"client_secret"},
        )
    if payload.webinar is not None:
        update["webinar"] = _merge_secret_fields(
            existing.get("webinar") or {},
            payload.webinar.model_dump(),
            {"client_secret"},
        )
    if payload.providers is not None:
        invalid = [key for key in payload.providers if key not in GENERIC_PROVIDER_KEYS]
        if invalid:
            raise HTTPException(status_code=400, detail=f"Unknown provider config: {', '.join(invalid)}")
        existing_providers = existing.get("providers") or {}
        update["providers"] = {
            **existing_providers,
            **{
                key: _merge_secret_fields(
                    existing_providers.get(key) or {},
                    value.model_dump(),
                    {"api_key", "access_token", "client_secret"},
                )
                for key, value in payload.providers.items()
            },
        }
    merged = {**existing, **update}
    await _save_enterprise_integrations(db, org, merged)
    await db.refresh(org)
    return await get_enterprise_integrations(request, me=me, db=db)


@router.post(
    "/api/admin/integrations/provider-config/{provider_key}/test",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def test_provider_config(
    request: Request,
    provider_key: str,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if provider_key not in GENERIC_PROVIDER_KEYS:
        raise HTTPException(status_code=400, detail="Unknown provider")
    org = await _get_org(db, me, request)
    data = _enterprise_integrations_from_org(org)
    raw = (data.get("providers") or {}).get(provider_key) or {}
    cfg = GenericProviderConfig(**_decrypt_fields(raw, {"api_key", "access_token", "client_secret"}))
    if not cfg.enabled:
        raise HTTPException(status_code=400, detail="Provider is not enabled")
    has_secret = bool(cfg.api_key or cfg.access_token or cfg.client_secret or cfg.auth_type == "none")
    if not has_secret:
        raise HTTPException(status_code=400, detail="Provider credentials are missing")
    if not cfg.base_url:
        return {"ok": True, "message": "Configuration is present"}
    # SSRF guard: base_url is admin-configured and we issue an outbound request to it,
    # so require https + a non-internal host, and never follow redirects (a redirect
    # to an internal address would otherwise bypass the check).
    from urllib.parse import urlparse as _urlparse
    from .webhooks import _is_private_address as _is_priv
    _parsed_base = _urlparse(cfg.base_url)
    if _parsed_base.scheme != "https" or not _parsed_base.hostname or _is_priv(_parsed_base.hostname):
        raise HTTPException(status_code=400, detail="Provider base_url must be a public https URL.")
    headers: dict[str, str] = {}
    if cfg.auth_type == "bearer_token" and cfg.access_token:
        headers["Authorization"] = f"Bearer {cfg.access_token}"
    elif cfg.auth_type == "api_key" and cfg.api_key:
        headers["Authorization"] = f"Bearer {cfg.api_key}"
    async with httpx.AsyncClient(timeout=10.0, follow_redirects=False) as client:
        res = await client.get(cfg.base_url, headers=headers)
    if res.status_code >= 500:
        raise HTTPException(status_code=502, detail=f"Provider test failed: HTTP {res.status_code}")
    return {"ok": True, "http_status": res.status_code}


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
        slack=_masked_notification_channel(data.get("slack")),
        teams=_masked_notification_channel(data.get("teams")),
        discord=_masked_notification_channel(data.get("discord")),
        google_chat=_masked_notification_channel(data.get("google_chat")),
        custom=_masked_notification_channel(data.get("custom")),
        sms=_masked_sms_config(data.get("sms")),
        whatsapp=_masked_whatsapp_config(data.get("whatsapp")),
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
        update["slack"] = _merge_secret_fields(existing.get("slack") or {}, payload.slack.model_dump(), {"secret"})
    if payload.teams is not None:
        update["teams"] = _merge_secret_fields(existing.get("teams") or {}, payload.teams.model_dump(), {"secret"})
    if payload.discord is not None:
        update["discord"] = _merge_secret_fields(existing.get("discord") or {}, payload.discord.model_dump(), {"secret"})
    if payload.google_chat is not None:
        update["google_chat"] = _merge_secret_fields(existing.get("google_chat") or {}, payload.google_chat.model_dump(), {"secret"})
    if payload.custom is not None:
        update["custom"] = _merge_secret_fields(existing.get("custom") or {}, payload.custom.model_dump(), {"secret"})
    if payload.sms is not None:
        update["sms"] = _merge_secret_fields(existing.get("sms") or {}, payload.sms.model_dump(), {"auth_token"})
    if payload.whatsapp is not None:
        update["whatsapp"] = _merge_secret_fields(existing.get("whatsapp") or {}, payload.whatsapp.model_dump(), {"access_token"})

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
    if channel not in ("slack", "teams", "discord", "google_chat", "custom", "sms", "whatsapp"):
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
    """Send a test message to the specified webhook URL.

    The endpoint only receives a URL (not the channel type), so the payload carries
    both ``text`` (Slack / Google Chat) and ``content`` (Discord) plus Slack blocks.
    Each provider reads the key it understands and ignores the rest.
    """
    await _get_org(db, me, request)
    test_context = {"event_name": "Test Event", "detail": "HeptaCert entegrasyon testi — bağlantı başarılı!"}
    msg = _plain_message("test.ping", test_context)
    test_payload = {**_slack_payload("test.ping", test_context), "content": msg[:2000]}
    ok = await _send_webhook(payload, test_payload)
    if not ok:
        raise HTTPException(status_code=502, detail="Test mesajı gönderilemedi. URL ve erişilebilirliği kontrol edin.")
    return {"ok": True}


# ── Zoom Webinar import ───────────────────────────────────────────────────────

class ZoomWebinarOut(BaseModel):
    id: str
    topic: str
    start_time: Optional[str] = None
    duration: Optional[int] = None
    participants_count: Optional[int] = None


class ZoomWebinarImportOut(BaseModel):
    webinar_id: str
    topic: str
    total_participants: int
    matched_profiles: int
    tagged_emails: list[str]


async def _zoom_get_access_token(account_id: str, client_id: str, client_secret: str) -> str:
    import base64
    credentials = base64.b64encode(f"{client_id}:{client_secret}".encode()).decode()
    async with httpx.AsyncClient(timeout=10.0) as client:
        res = await client.post(
            f"https://zoom.us/oauth/token?grant_type=account_credentials&account_id={account_id}",
            headers={"Authorization": f"Basic {credentials}"},
        )
    if res.status_code >= 400:
        raise HTTPException(status_code=502, detail="Zoom token exchange failed. Check account_id, client_id, client_secret.")
    token = str(res.json().get("access_token") or "")
    if not token:
        raise HTTPException(status_code=502, detail="Zoom access token missing from response.")
    return token


async def _zoom_list_webinars(access_token: str) -> list[dict]:
    results: list[dict] = []
    next_page_token = ""
    async with httpx.AsyncClient(timeout=15.0) as client:
        while True:
            params: dict = {"page_size": 30}
            if next_page_token:
                params["next_page_token"] = next_page_token
            res = await client.get(
                "https://api.zoom.us/v2/users/me/webinars",
                headers={"Authorization": f"Bearer {access_token}"},
                params=params,
            )
            if res.status_code >= 400:
                break
            data = res.json()
            results.extend(data.get("webinars") or [])
            next_page_token = data.get("next_page_token") or ""
            if not next_page_token or len(results) >= 100:
                break
    return results


async def _zoom_get_webinar_participants(access_token: str, webinar_id: str) -> list[dict]:
    participants: list[dict] = []
    next_page_token = ""
    async with httpx.AsyncClient(timeout=15.0) as client:
        while True:
            params: dict = {"page_size": 300}
            if next_page_token:
                params["next_page_token"] = next_page_token
            res = await client.get(
                f"https://api.zoom.us/v2/report/webinars/{webinar_id}/participants",
                headers={"Authorization": f"Bearer {access_token}"},
                params=params,
            )
            if res.status_code >= 400:
                break
            data = res.json()
            participants.extend(data.get("participants") or [])
            next_page_token = data.get("next_page_token") or ""
            if not next_page_token or len(participants) >= 3000:
                break
    return participants


def _get_webinar_config(org: Organization) -> dict:
    return (((org.settings or {}).get("enterprise_integrations") or {}).get("webinar") or {})


@router.get(
    "/api/admin/integrations/webinar/zoom/webinars",
    response_model=list[ZoomWebinarOut],
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def list_zoom_webinars(
    request: Request,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List available Zoom webinars for the configured account."""
    org = await _get_org(db, me, request)
    cfg = _get_webinar_config(org)
    if not cfg.get("enabled") or cfg.get("provider") not in ("zoom", None, ""):
        raise HTTPException(status_code=400, detail="Zoom webinar integration is not enabled.")
    account_id = str(cfg.get("account_id") or "")
    client_id = str(cfg.get("client_id") or "")
    raw_secret = str(cfg.get("client_secret") or "")
    client_secret = (_decrypt_secret(raw_secret) if raw_secret.startswith("enc:v1:") else raw_secret) or ""
    if not account_id or not client_id or not client_secret:
        raise HTTPException(status_code=400, detail="Zoom credentials are incomplete.")

    access_token = await _zoom_get_access_token(account_id, client_id, client_secret)
    webinars = await _zoom_list_webinars(access_token)
    return [
        ZoomWebinarOut(
            id=str(w.get("id") or ""),
            topic=str(w.get("topic") or ""),
            start_time=str(w.get("start_time") or "") or None,
            duration=w.get("duration"),
            participants_count=w.get("participants_count"),
        )
        for w in webinars
    ]


@router.post(
    "/api/admin/integrations/webinar/zoom/webinars/{webinar_id}/import",
    response_model=ZoomWebinarImportOut,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def import_zoom_webinar_attendance(
    request: Request,
    webinar_id: str,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Import Zoom webinar participant emails and tag matching CRM profiles."""
    from sqlalchemy import select as sa_select
    from .main import ParticipantCrmProfile

    org = await _get_org(db, me, request)
    cfg = _get_webinar_config(org)
    if not cfg.get("enabled"):
        raise HTTPException(status_code=400, detail="Zoom webinar integration is not enabled.")
    account_id = str(cfg.get("account_id") or "")
    client_id = str(cfg.get("client_id") or "")
    raw_secret = str(cfg.get("client_secret") or "")
    client_secret = (_decrypt_secret(raw_secret) if raw_secret.startswith("enc:v1:") else raw_secret) or ""
    if not account_id or not client_id or not client_secret:
        raise HTTPException(status_code=400, detail="Zoom credentials are incomplete.")

    access_token = await _zoom_get_access_token(account_id, client_id, client_secret)

    # Fetch webinar info
    async with httpx.AsyncClient(timeout=10.0) as client:
        info_res = await client.get(
            f"https://api.zoom.us/v2/webinars/{webinar_id}",
            headers={"Authorization": f"Bearer {access_token}"},
        )
    topic = str((info_res.json() if info_res.status_code < 400 else {}).get("topic") or webinar_id)

    participants = await _zoom_get_webinar_participants(access_token, webinar_id)
    participant_emails = {
        str(p.get("user_email") or "").strip().lower()
        for p in participants
        if p.get("user_email")
    }
    participant_emails.discard("")

    # Tag matching CRM profiles
    tag = f"zoom_webinar:{webinar_id}"
    tagged: list[str] = []
    if participant_emails:
        profiles_res = await db.execute(
            sa_select(ParticipantCrmProfile).where(
                ParticipantCrmProfile.organization_id == org.id,
                ParticipantCrmProfile.email.in_(list(participant_emails)),
            )
        )
        profiles = profiles_res.scalars().all()
        for profile in profiles:
            existing_tags = list(profile.tags or [])
            if tag not in existing_tags:
                profile.tags = existing_tags + [tag]
                db.add(profile)
                tagged.append(profile.email)
        if tagged:
            await db.commit()

    return ZoomWebinarImportOut(
        webinar_id=webinar_id,
        topic=topic,
        total_participants=len(participant_emails),
        matched_profiles=len(tagged),
        tagged_emails=tagged[:100],
    )
