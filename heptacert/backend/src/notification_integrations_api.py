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


class NotificationIntegrationsIn(BaseModel):
    slack: Optional[NotificationWebhookChannel] = None
    teams: Optional[NotificationWebhookChannel] = None
    custom: Optional[NotificationWebhookChannel] = None
    sms: Optional[TwilioSmsConfig] = None


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
        ),
        item("slack", "Slack", "Notifications", "Post registrations, check-ins, certificate and CRM alerts into Slack channels.", "webhook", 40, configured=True, connected=bool(notifications.get("slack")), docs_url="https://api.slack.com/incoming-webhooks"),
        item("microsoft_teams", "Microsoft Teams", "Notifications", "Post operational cards into Teams channels through Workflows webhooks.", "webhook", 50, configured=True, connected=bool(notifications.get("teams")), docs_url="https://support.microsoft.com/teams/apps-service/create-incoming-webhooks-with-workflows-for-microsoft-teams"),
        item("zapier", "Zapier", "Automation", "Trigger Zapier workflows for registrations, certificates, check-ins, CRM changes, and training alerts.", "webhook", 60, configured=True, connected=bool(notifications.get("custom")), docs_url="https://help.zapier.com/hc/en-us/articles/8496083355661-How-to-Get-Started-with-Webhooks-by-Zapier"),
        item("make", "Make", "Automation", "Trigger Make scenarios through custom webhooks using the same HeptaCert event payload.", "webhook", 70, configured=True, connected=bool(notifications.get("custom")), docs_url="https://help.make.com/webhooks"),
        item("hubspot", "HubSpot", "CRM", "Push attendees and segments into HubSpot contacts and lists.", "private_app_token", 80, configured=True, connected=bool((crm_integrations.get("hubspot") or {}).get("private_app_token")), docs_url="https://developers.hubspot.com/docs/api-reference/latest/crm/objects/contacts/guide", settings_href="/admin/crm"),
        item("salesforce", "Salesforce", "CRM", "Sync event participants and certification status into Salesforce leads or contacts.", "oauth", 90, configured=True, connected=bool((provider_configs.get("salesforce") or {}).get("enabled")), docs_url="https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/"),
        item("sso_saml_oidc", "SSO / SAML / OIDC", "Identity", "Enterprise sign-in with Microsoft Entra ID, Okta, Google Workspace, and SAML providers.", "sso", 100, configured=True, connected=bool((enterprise.get("oidc") or {}).get("enabled") and (enterprise.get("oidc") or {}).get("issuer_url"))),
        item("scim", "SCIM Provisioning", "Identity", "Automate user provisioning and deprovisioning from enterprise identity providers.", "scim", 110, status="planned"),
        item("zoom_teams_webinar", "Zoom / Teams Webinar", "Events", "Import webinar attendance and completion data for certificate eligibility.", "oauth", 120, configured=True, connected=bool((enterprise.get("webinar") or {}).get("enabled") and (enterprise.get("webinar") or {}).get("client_id"))),
        item("whatsapp_sms", "WhatsApp Business / SMS", "Messaging", "Send QR tickets, reminders, and certificate notifications over SMS or WhatsApp.", "provider_credentials", 130, connected=bool(notifications.get("sms") or (provider_configs.get("whatsapp_sms") or {}).get("enabled")), configured=True),
        item("mailchimp_brevo", "Mailchimp / Brevo", "Marketing", "Export event segments into marketing audiences and campaigns.", "api_key", 140, configured=True, connected=bool((provider_configs.get("mailchimp_brevo") or {}).get("enabled"))),
        item("drive_sharepoint_archive", "Drive / SharePoint Archive", "Document storage", "Archive generated certificates and reports into organization folders.", "oauth", 150, configured=True, connected=bool((provider_configs.get("drive_sharepoint_archive") or {}).get("enabled"))),
        item("power_bi_looker", "Power BI / Looker Studio", "Analytics", "Expose event analytics for executive dashboards.", "data_export", 160, configured=True, connected=bool((provider_configs.get("power_bi_looker") or {}).get("enabled"))),
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
        key: GenericProviderConfig(**value)
        for key, value in (data.get("providers") or {}).items()
        if key in GENERIC_PROVIDER_KEYS and isinstance(value, dict)
    }
    return EnterpriseIntegrationsOut(
        oidc=OidcSsoConfig(**data["oidc"]) if data.get("oidc") else None,
        webinar=WebinarImportConfig(**data["webinar"]) if data.get("webinar") else None,
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
        update["oidc"] = payload.oidc.model_dump()
    if payload.webinar is not None:
        update["webinar"] = payload.webinar.model_dump()
    if payload.providers is not None:
        invalid = [key for key in payload.providers if key not in GENERIC_PROVIDER_KEYS]
        if invalid:
            raise HTTPException(status_code=400, detail=f"Unknown provider config: {', '.join(invalid)}")
        existing_providers = existing.get("providers") or {}
        update["providers"] = {
            **existing_providers,
            **{key: value.model_dump() for key, value in payload.providers.items()},
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
    cfg = GenericProviderConfig(**raw)
    if not cfg.enabled:
        raise HTTPException(status_code=400, detail="Provider is not enabled")
    has_secret = bool(cfg.api_key or cfg.access_token or cfg.client_secret or cfg.auth_type == "none")
    if not has_secret:
        raise HTTPException(status_code=400, detail="Provider credentials are missing")
    if not cfg.base_url:
        return {"ok": True, "message": "Configuration is present"}
    headers: dict[str, str] = {}
    if cfg.auth_type == "bearer_token" and cfg.access_token:
        headers["Authorization"] = f"Bearer {cfg.access_token}"
    elif cfg.auth_type == "api_key" and cfg.api_key:
        headers["Authorization"] = f"Bearer {cfg.api_key}"
    async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
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
