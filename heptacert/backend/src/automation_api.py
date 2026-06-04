"""Event automation rule builder endpoints."""

import hashlib
import hmac
import ipaddress
import json
import socket
from datetime import datetime, timedelta, timezone
from typing import Any, Literal, Optional
from urllib.parse import urlparse
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import and_, delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from .email_rendering import build_email_template_vars, render_template_string
from .main import (
    Attendee,
    AttendaonceRecord,
    Certificate,
    EmailTemplate,
    CurrentUser,
    EventAutomationDispatchState,
    EventAutomationExecutionLog,
    EventAutomationRule,
    EventTicket,
    Event,
    ParticipantBadge,
    Role,
    SurveyResponse,
    WebhookEndpointIn,
    build_public_survey_url,
    logger,
    send_email_async,
    settings,
    _get_event_for_admin,
    _get_public_event_identifier,
    get_current_user,
    get_db,
    require_email_system_access,
    require_role,
)

router = APIRouter()

AutomationTrigger = Literal[
    "attended_event",
    "registered_no_show",
    "certificate_issued",
    "survey_not_completed",
    "badge_earned",
    "audience_segment",
]
AutomationActionType = Literal["send_email", "create_reminder", "webhook_dispatch"]

TRIGGER_LABELS: dict[str, str] = {
    "attended_event": "Katıldı",
    "registered_no_show": "Kayıt oldu ama gelmedi",
    "certificate_issued": "Sertifika aldı",
    "survey_not_completed": "Anketi tamamlamadı",
    "badge_earned": "Rozet kazandı",
    "audience_segment": "Katılımcı segmenti",
}

ACTION_LABELS: dict[str, str] = {
    "send_email": "E-posta gönder",
    "create_reminder": "Hatırlatma oluştur",
    "webhook_dispatch": "Webhook tetikle",
}


class AutomationActionIn(BaseModel):
    type: AutomationActionType
    email_template_id: Optional[int] = Field(default=None, ge=1)
    reminder_delay_hours: Optional[int] = Field(default=None, ge=0, le=720)
    webhook_url: Optional[str] = Field(default=None, max_length=2000)


class AutomationRuleIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    trigger: AutomationTrigger
    trigger_config: dict[str, Any] = Field(default_factory=dict)
    enabled: bool = True
    actions: list[AutomationActionIn] = Field(default_factory=list, min_length=1, max_length=5)

    @field_validator("name")
    @classmethod
    def clean_name(cls, value: str) -> str:
        return value.strip()


class AutomationActionOut(AutomationActionIn):
    label: str


class AutomationRuleOut(BaseModel):
    id: str
    name: str
    trigger: AutomationTrigger
    trigger_label: str
    trigger_config: dict[str, Any] = Field(default_factory=dict)
    enabled: bool
    actions: list[AutomationActionOut] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime


class AutomationSummaryOut(BaseModel):
    trigger_counts: dict[str, int]
    trigger_labels: dict[str, str]
    action_labels: dict[str, str]
    rules: list[AutomationRuleOut]


class AutomationDispatchOut(BaseModel):
    events: int = 0
    rules: int = 0
    targets: int = 0
    sent: int = 0
    failed: int = 0
    skipped: int = 0


class AutomationDispatchLogOut(BaseModel):
    rule_id: str
    updated_at: datetime
    dispatched_count: int
    sent: int
    failed: int
    skipped: int = 0
    recent: list[dict[str, Any]]


class AutomationDryRunOut(BaseModel):
    rule_id: str
    trigger: str
    target_count: int
    sample_recipients: list[dict[str, Any]]
    actions: list[AutomationActionOut]


AUTOMATION_EVENT_LIMIT_PER_HOUR = 250
AUTOMATION_ORG_LIMIT_PER_HOUR = 1000
AUTOMATION_MAX_ATTEMPTS = 3
AUTOMATION_DEFAULT_EMAIL_BATCH_SIZE = 10


def _automation_key(event_id: int) -> str:
    return f"event_automation_rules:{event_id}"


def _dispatch_key(event_id: int, rule_id: str) -> str:
    return f"event_automation_dispatch:{event_id}:{rule_id}"


def _rule_to_dict(rule: EventAutomationRule) -> dict[str, Any]:
    return {
        "id": rule.id,
        "name": rule.name,
        "trigger": rule.trigger,
        "trigger_config": rule.trigger_config or {},
        "enabled": rule.enabled,
        "actions": rule.actions or [],
        "created_at": rule.created_at,
        "updated_at": rule.updated_at,
    }


def _serialize_action(raw: dict[str, Any]) -> AutomationActionOut:
    action_type = str(raw.get("type") or "send_email")
    if action_type not in ACTION_LABELS:
        action_type = "send_email"
    return AutomationActionOut(
        type=action_type,  # type: ignore[arg-type]
        label=ACTION_LABELS[action_type],
        email_template_id=raw.get("email_template_id"),
        reminder_delay_hours=raw.get("reminder_delay_hours"),
        webhook_url=raw.get("webhook_url"),
    )


def _serialize_rule(raw: dict[str, Any]) -> AutomationRuleOut:
    trigger = str(raw.get("trigger") or "attended_event")
    if trigger not in TRIGGER_LABELS:
        trigger = "attended_event"
    return AutomationRuleOut(
        id=str(raw.get("id") or ""),
        name=str(raw.get("name") or TRIGGER_LABELS[trigger]),
        trigger=trigger,  # type: ignore[arg-type]
        trigger_label=TRIGGER_LABELS[trigger],
        trigger_config=raw.get("trigger_config") or {},
        enabled=bool(raw.get("enabled", True)),
        actions=[_serialize_action(item) for item in raw.get("actions") or [] if isinstance(item, dict)],
        created_at=raw.get("created_at") or datetime.utcnow(),
        updated_at=raw.get("updated_at") or datetime.utcnow(),
    )


def _clean_actions_for_storage(actions: list[AutomationActionIn]) -> list[dict[str, Any]]:
    clean: list[dict[str, Any]] = []
    for action in actions:
        data = action.model_dump()
        if data.get("type") == "webhook_dispatch" and data.get("webhook_url"):
            data["webhook_url"] = _safe_webhook_url(str(data["webhook_url"]))
        clean.append(data)
    return clean


async def _load_rule_rows(db: AsyncSession, event_id: int) -> list[EventAutomationRule]:
    rows_res = await db.execute(
        select(EventAutomationRule)
        .where(EventAutomationRule.event_id == event_id)
        .order_by(EventAutomationRule.created_at.desc())
    )
    return rows_res.scalars().all()


async def _trigger_counts(db: AsyncSession, event_id: int) -> dict[str, int]:
    attended_res = await db.execute(
        select(func.count(func.distinct(Attendee.id)))
        .select_from(Attendee)
        .outerjoin(AttendaonceRecord, AttendaonceRecord.attendee_id == Attendee.id)
        .outerjoin(EventTicket, EventTicket.attendee_id == Attendee.id)
        .where(
            Attendee.event_id == event_id,
            ((AttendaonceRecord.id.is_not(None)) | (EventTicket.checked_in_at.is_not(None))),
        )
    )
    attended = int(attended_res.scalar_one() or 0)

    no_show_res = await db.execute(
        select(func.count(func.distinct(Attendee.id)))
        .select_from(Attendee)
        .outerjoin(AttendaonceRecord, AttendaonceRecord.attendee_id == Attendee.id)
        .outerjoin(EventTicket, EventTicket.attendee_id == Attendee.id)
        .where(
            Attendee.event_id == event_id,
            AttendaonceRecord.id.is_(None),
            EventTicket.checked_in_at.is_(None),
        )
    )

    certificate_res = await db.execute(
        select(func.count(func.distinct(Certificate.id))).where(
            Certificate.event_id == event_id,
            Certificate.deleted_at.is_(None),
        )
    )

    survey_pending_res = await db.execute(
        select(func.count(func.distinct(Attendee.id)))
        .select_from(Attendee)
        .outerjoin(
            SurveyResponse,
            and_(
                SurveyResponse.attendee_id == Attendee.id,
                SurveyResponse.event_id == Attendee.event_id,
            ),
        )
        .where(
            Attendee.event_id == event_id,
            Attendee.survey_required.is_(True),
            Attendee.survey_completed_at.is_(None),
            SurveyResponse.id.is_(None),
        )
    )

    badge_res = await db.execute(
        select(func.count(func.distinct(ParticipantBadge.attendee_id))).where(ParticipantBadge.event_id == event_id)
    )

    return {
        "attended_event": attended,
        "registered_no_show": int(no_show_res.scalar_one() or 0),
        "certificate_issued": int(certificate_res.scalar_one() or 0),
        "survey_not_completed": int(survey_pending_res.scalar_one() or 0),
        "badge_earned": int(badge_res.scalar_one() or 0),
    }


async def _summary(db: AsyncSession, event_id: int, rules: list[dict[str, Any]]) -> AutomationSummaryOut:
    return AutomationSummaryOut(
        trigger_counts=await _trigger_counts(db, event_id),
        trigger_labels=TRIGGER_LABELS,
        action_labels=ACTION_LABELS,
        rules=[_serialize_rule(item) for item in rules],
    )


def _target_key(attendee: Attendee, action_index: int, action_type: str) -> str:
    email = (attendee.email or "").strip().lower()
    return f"{action_index}:{action_type}:{email or attendee.id}"


def _retry_at(attempts: int) -> datetime:
    delay_minutes = min(60, 2 ** max(0, attempts - 1))
    return datetime.now(timezone.utc) + timedelta(minutes=delay_minutes)


def _block_private_address(value: str) -> None:
    ip = ipaddress.ip_address(value)
    if ip.is_private or ip.is_loopback or ip.is_reserved or ip.is_link_local or ip.is_multicast:
        raise HTTPException(status_code=400, detail="Webhook URL must not resolve to private/internal addresses")


def _safe_webhook_url(raw_url: str) -> str:
    safe_url = WebhookEndpointIn(url=str(raw_url), events=[]).url
    parsed = urlparse(safe_url)
    hostname = parsed.hostname or ""
    try:
        _block_private_address(hostname)
    except ValueError:
        try:
            for info in socket.getaddrinfo(hostname, parsed.port or 443, type=socket.SOCK_STREAM):
                _block_private_address(info[4][0])
        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(status_code=400, detail=f"Webhook hostname could not be validated: {exc}") from exc
    return safe_url


def _sign_webhook_payload(payload: dict[str, Any]) -> str:
    secret = (settings.jwt_secret or "heptacert").encode()
    body = json.dumps(payload, sort_keys=True, separators=(",", ":"), default=str).encode()
    return hmac.new(secret, body, hashlib.sha256).hexdigest()


async def _rate_limit_available(db: AsyncSession, event: Event) -> bool:
    since = datetime.now(timezone.utc) - timedelta(hours=1)
    event_count_res = await db.execute(
        select(func.count(EventAutomationExecutionLog.id)).where(
            EventAutomationExecutionLog.event_id == event.id,
            EventAutomationExecutionLog.created_at >= since,
            EventAutomationExecutionLog.status.in_(["sent", "failed", "pending"]),
        )
    )
    if int(event_count_res.scalar_one() or 0) >= AUTOMATION_EVENT_LIMIT_PER_HOUR:
        return False
    org_count_res = await db.execute(
        select(func.count(EventAutomationExecutionLog.id))
        .join(Event, Event.id == EventAutomationExecutionLog.event_id)
        .where(
            Event.admin_id == event.admin_id,
            EventAutomationExecutionLog.created_at >= since,
            EventAutomationExecutionLog.status.in_(["sent", "failed", "pending"]),
        )
    )
    return int(org_count_res.scalar_one() or 0) < AUTOMATION_ORG_LIMIT_PER_HOUR


async def _execution_log_for_action(
    db: AsyncSession,
    event: Event,
    rule_id: str,
    attendee: Attendee,
    action_index: int,
    action_type: str,
) -> EventAutomationExecutionLog:
    key = _target_key(attendee, action_index, action_type)
    row_res = await db.execute(
        select(EventAutomationExecutionLog).where(
            EventAutomationExecutionLog.event_id == event.id,
            EventAutomationExecutionLog.idempotency_key == key,
        )
    )
    row = row_res.scalar_one_or_none()
    if row:
        return row
    row = EventAutomationExecutionLog(
        event_id=event.id,
        rule_id=rule_id,
        attendee_id=attendee.id,
        recipient_email=(attendee.email or "").strip().lower() or None,
        action_index=action_index,
        action_type=action_type,
        idempotency_key=key,
        status="pending",
        payload={},
    )
    db.add(row)
    await db.flush()
    return row


async def _automation_target_attendees(db: AsyncSession, event: Event, trigger: str, trigger_config: Optional[dict[str, Any]] = None) -> list[Attendee]:
    from .audience_segments_api import get_segment_attendees

    if trigger == "audience_segment":
        config = trigger_config or {}
        segment_key = str(config.get("segment_key") or "attended_no_certificate")
        filters = config.get("filters") if isinstance(config.get("filters"), dict) else {}
        return await get_segment_attendees(
            db,
            event,
            segment_key,
            field_id=filters.get("field_id"),
            answer=filters.get("answer"),
            location=filters.get("location"),
            composition=filters.get("composition") if isinstance(filters.get("composition"), dict) else None,
        )

    if trigger == "registered_no_show":
        return await get_segment_attendees(db, event, "no_shows")
    if trigger == "certificate_issued":
        return await get_segment_attendees(db, event, "certificate_holders")

    if trigger == "attended_event":
        records_res = await db.execute(
            select(AttendaonceRecord.attendee_id)
            .join(Attendee, Attendee.id == AttendaonceRecord.attendee_id)
            .where(Attendee.event_id == event.id)
        )
        ticket_res = await db.execute(
            select(EventTicket.attendee_id).where(EventTicket.event_id == event.id, EventTicket.checked_in_at.is_not(None))
        )
        ids = {int(item) for item in records_res.scalars().all() if item}
        ids.update(int(item) for item in ticket_res.scalars().all() if item)
        if not ids:
            return []
        attendees_res = await db.execute(select(Attendee).where(Attendee.id.in_(ids)))
        return attendees_res.scalars().all()

    if trigger == "survey_not_completed":
        attendees_res = await db.execute(
            select(Attendee).where(
                Attendee.event_id == event.id,
                Attendee.survey_required.is_(True),
                Attendee.survey_completed_at.is_(None),
                Attendee.email.is_not(None),
                func.trim(Attendee.email) != "",
            )
        )
        return attendees_res.scalars().all()

    if trigger == "badge_earned":
        badge_res = await db.execute(select(ParticipantBadge.attendee_id).where(ParticipantBadge.event_id == event.id))
        attendee_ids = {int(item) for item in badge_res.scalars().all() if item}
        if not attendee_ids:
            return []
        attendees_res = await db.execute(select(Attendee).where(Attendee.id.in_(attendee_ids)))
        return attendees_res.scalars().all()

    return []


async def _certificate_uuid_by_name(db: AsyncSession, event_id: int) -> dict[str, str]:
    cert_res = await db.execute(
        select(Certificate)
        .where(Certificate.event_id == event_id, Certificate.deleted_at.is_(None))
        .order_by(Certificate.created_at.desc())
    )
    by_name: dict[str, str] = {}
    for cert in cert_res.scalars().all():
        name_key = (cert.student_name or "").strip().lower()
        if name_key and name_key not in by_name:
            by_name[name_key] = cert.uuid
    return by_name


def _template_vars(event: Event, attendee: Attendee, cert_uuid_by_name: dict[str, str]) -> dict[str, Any]:
    name_key = (attendee.name or "").strip().lower()
    public_event_id = _get_public_event_identifier(event)
    return build_email_template_vars(
        settings=settings,
        event=event,
        attendee=attendee,
        cert_uuid=cert_uuid_by_name.get(name_key),
        survey_link=build_public_survey_url(
            event_id=public_event_id,
            attendee_id=attendee.id,
            email=attendee.email,
        ),
    )


async def _dispatch_email_action(
    db: AsyncSession,
    event: Event,
    attendee: Attendee,
    action: dict[str, Any],
    cert_uuid_by_name: dict[str, str],
) -> tuple[bool, str]:
    template_id = action.get("email_template_id")
    if not template_id:
        return False, "email_template_id missing"
    template_res = await db.execute(select(EmailTemplate).where(EmailTemplate.id == int(template_id)))
    template = template_res.scalar_one_or_none()
    if not template:
        return False, "email template not found"
    if not attendee.email or not attendee.email.strip() or attendee.unsubscribed_at is not None:
        return False, "recipient unavailable or unsubscribed"

    variables = _template_vars(event, attendee, cert_uuid_by_name)
    subject = render_template_string(template.subject_tr, variables)
    body = render_template_string(template.body_html, variables)
    await send_email_async(attendee.email, subject, body)
    return True, "email sent"


async def _dispatch_webhook_action(event: Event, attendee: Attendee, rule: dict[str, Any], action: dict[str, Any]) -> tuple[bool, str]:
    import httpx

    url = action.get("webhook_url")
    if not url:
        return False, "webhook_url missing"
    safe_url = _safe_webhook_url(str(url))
    payload = {
        "event": "automation.dispatch",
        "automation_rule_id": rule.get("id"),
        "automation_rule_name": rule.get("name"),
        "trigger": rule.get("trigger"),
        "event_id": event.id,
        "event_name": event.name,
        "attendee": {
            "id": attendee.id,
            "name": attendee.name,
            "email": attendee.email,
        },
        "sent_at": datetime.now(timezone.utc).isoformat(),
    }
    signature = _sign_webhook_payload(payload)
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.post(
            safe_url,
            json=payload,
            headers={
                "X-HeptaCert-Event": "automation.dispatch",
                "X-HeptaCert-Signature": f"sha256={signature}",
            },
        )
    if response.status_code >= 400:
        return False, f"webhook failed: HTTP {response.status_code}"
    return True, f"webhook delivered: HTTP {response.status_code}"


async def process_automation_dispatches_once(limit_events: int = 25) -> dict[str, int]:
    return await _process_automation_dispatches(limit_events=limit_events)


async def _process_automation_dispatches(*, event_id: Optional[int] = None, limit_events: int = 25) -> dict[str, int]:
    """Run enabled automation rules once and persist idempotency in event_automation_dispatch_states."""
    async with get_db_session() as db:
        query = select(Event).join(EventAutomationRule, EventAutomationRule.event_id == Event.id).where(EventAutomationRule.enabled.is_(True))
        if event_id is not None:
            query = query.where(Event.id == event_id)
        rows_res = await db.execute(query.distinct().limit(limit_events))
        events = rows_res.scalars().all()
        stats = {"events": 0, "rules": 0, "targets": 0, "sent": 0, "failed": 0, "skipped": 0}
        max_email_sends = max(1, int(getattr(settings, "email_batch_size", AUTOMATION_DEFAULT_EMAIL_BATCH_SIZE) or AUTOMATION_DEFAULT_EMAIL_BATCH_SIZE))
        email_sends_this_run = 0

        for event in events:
            if email_sends_this_run >= max_email_sends:
                break
            rule_rows = await _load_rule_rows(db, event.id)
            rules = [_rule_to_dict(rule) for rule in rule_rows if rule.enabled]
            stats["events"] += 1
            cert_uuid_by_name = await _certificate_uuid_by_name(db, event.id)

            for rule in rules:
                if not isinstance(rule, dict) or not rule.get("enabled", True):
                    continue
                rule_id = str(rule.get("id") or "")
                if not rule_id:
                    continue
                actions = [item for item in (rule.get("actions") or []) if isinstance(item, dict)]
                if not actions:
                    continue

                dispatch_res = await db.execute(
                    select(EventAutomationDispatchState).where(
                        EventAutomationDispatchState.event_id == event.id,
                        EventAutomationDispatchState.rule_id == rule_id,
                    )
                )
                dispatch_row = dispatch_res.scalar_one_or_none()
                dispatch_value = dict(dispatch_row.state or {}) if dispatch_row and isinstance(dispatch_row.state, dict) else {}
                dispatched = dict(dispatch_value.get("dispatched") or {})

                targets = await _automation_target_attendees(
                    db,
                    event,
                    str(rule.get("trigger") or ""),
                    rule.get("trigger_config") if isinstance(rule.get("trigger_config"), dict) else {},
                )
                stats["rules"] += 1
                stats["targets"] += len(targets)

                for attendee in targets:
                    if email_sends_this_run >= max_email_sends:
                        break
                    for action_index, action in enumerate(actions):
                        action_type = str(action.get("type") or "")
                        if action_type == "send_email" and email_sends_this_run >= max_email_sends:
                            break
                        log_row = await _execution_log_for_action(db, event, rule_id, attendee, action_index, action_type)
                        next_attempt_at = log_row.next_attempt_at
                        if log_row.status == "sent":
                            stats["skipped"] += 1
                            continue
                        if log_row.status == "failed" and log_row.attempts >= AUTOMATION_MAX_ATTEMPTS:
                            stats["skipped"] += 1
                            continue
                        if next_attempt_at and next_attempt_at > datetime.now(timezone.utc):
                            stats["skipped"] += 1
                            continue
                        if action_type == "send_email" and (not attendee.email or not attendee.email.strip() or attendee.unsubscribed_at is not None):
                            log_row.status = "suppressed"
                            log_row.error_message = "recipient unavailable or unsubscribed"
                            log_row.updated_at = datetime.now(timezone.utc)
                            log_row.payload = {"attendee_id": attendee.id, "action": action}
                            db.add(log_row)
                            stats["skipped"] += 1
                            continue
                        if not await _rate_limit_available(db, event):
                            log_row.status = "pending"
                            log_row.next_attempt_at = datetime.now(timezone.utc) + timedelta(minutes=15)
                            log_row.error_message = "automation rate limit reached"
                            log_row.updated_at = datetime.now(timezone.utc)
                            db.add(log_row)
                            stats["skipped"] += 1
                            continue
                        try:
                            if action_type == "send_email":
                                ok, message = await _dispatch_email_action(db, event, attendee, action, cert_uuid_by_name)
                                email_sends_this_run += 1
                            elif action_type == "webhook_dispatch":
                                ok, message = await _dispatch_webhook_action(event, attendee, rule, action)
                            elif action_type == "create_reminder":
                                ok, message = True, f"reminder queued after {action.get('reminder_delay_hours') or 0}h"
                            else:
                                ok, message = False, f"unsupported action: {action_type}"
                        except Exception as exc:
                            ok, message = False, str(exc)
                            logger.warning("Automation dispatch failed: event=%s rule=%s attendee=%s action=%s error=%s", event.id, rule_id, attendee.id, action_type, exc)

                        log_row.attempts = int(log_row.attempts or 0) + 1
                        log_row.status = "sent" if ok else "failed"
                        log_row.error_message = None if ok else message[:2000]
                        log_row.next_attempt_at = None if ok or log_row.attempts >= AUTOMATION_MAX_ATTEMPTS else _retry_at(log_row.attempts)
                        log_row.dispatched_at = datetime.now(timezone.utc)
                        log_row.updated_at = datetime.now(timezone.utc)
                        log_row.payload = {"attendee_id": attendee.id, "email": attendee.email, "action": action, "message": message}
                        db.add(log_row)

                        dispatched[log_row.idempotency_key] = {
                            "ok": ok,
                            "message": message,
                            "attendee_id": attendee.id,
                            "email": attendee.email,
                            "action_type": action_type,
                            "attempts": log_row.attempts,
                            "status": log_row.status,
                            "dispatched_at": datetime.now(timezone.utc).isoformat(),
                        }
                        if ok:
                            stats["sent"] += 1
                        else:
                            stats["failed"] += 1

                dispatch_value["dispatched"] = dispatched
                dispatch_value["updated_at"] = datetime.now(timezone.utc).isoformat()
                if dispatch_row:
                    dispatch_row.state = dispatch_value
                    dispatch_row.updated_at = datetime.now(timezone.utc)
                else:
                    db.add(EventAutomationDispatchState(event_id=event.id, rule_id=rule_id, state=dispatch_value))
                await db.commit()
        return stats


class _DbSessionContext:
    def __init__(self):
        from .main import SessionLocal

        self._session_local = SessionLocal
        self.session = None

    async def __aenter__(self):
        self.session = self._session_local()
        return self.session

    async def __aexit__(self, exc_type, exc, tb):
        await self.session.close()


def get_db_session() -> _DbSessionContext:
    return _DbSessionContext()


@router.get(
    "/api/admin/events/{event_id}/automations",
    response_model=AutomationSummaryOut,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin)), Depends(require_email_system_access)],
)
async def list_event_automations(
    event_id: int,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_event_for_admin(event_id, me, db, "email:write")
    rules = [_rule_to_dict(rule) for rule in await _load_rule_rows(db, event_id)]
    return await _summary(db, event_id, rules)


async def _validate_no_circular_trigger(
    db: AsyncSession,
    event_id: int,
    payload: "AutomationRuleIn",
    exclude_rule_id: Optional[str],
) -> None:
    if payload.trigger != "audience_segment":
        return
    incoming_segment = str((payload.trigger_config or {}).get("segment_key") or "")
    if not incoming_segment:
        return
    existing_rules = await _load_rule_rows(db, event_id)
    for rule in existing_rules:
        if exclude_rule_id and rule.id == exclude_rule_id:
            continue
        if rule.trigger != "audience_segment":
            continue
        existing_segment = str((rule.trigger_config or {}).get("segment_key") or "")
        if existing_segment == incoming_segment and rule.enabled:
            raise HTTPException(
                status_code=400,
                detail=f"Bu etkinlikte '{incoming_segment}' segmenti zaten başka bir etkin kuralı tetikliyor. Aynı segment iki aktif kuralı tetikleyemez.",
            )


@router.post(
    "/api/admin/events/{event_id}/automations",
    response_model=AutomationSummaryOut,
    status_code=201,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin)), Depends(require_email_system_access)],
)
async def create_event_automation(
    event_id: int,
    payload: AutomationRuleIn,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_event_for_admin(event_id, me, db, "email:write")
    await _validate_no_circular_trigger(db, event_id, payload, exclude_rule_id=None)
    rule = EventAutomationRule(
        id=uuid4().hex,
        event_id=event_id,
        name=payload.name,
        trigger=payload.trigger,
        trigger_config=payload.trigger_config or {},
        enabled=payload.enabled,
        actions=_clean_actions_for_storage(payload.actions),
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(rule)
    await db.commit()
    rules = [_rule_to_dict(item) for item in await _load_rule_rows(db, event_id)]
    return await _summary(db, event_id, rules)


@router.patch(
    "/api/admin/events/{event_id}/automations/{rule_id}",
    response_model=AutomationSummaryOut,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin)), Depends(require_email_system_access)],
)
async def update_event_automation(
    event_id: int,
    rule_id: str,
    payload: AutomationRuleIn,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_event_for_admin(event_id, me, db, "email:write")
    rule = await db.get(EventAutomationRule, rule_id)
    if not rule or rule.event_id != event_id:
        raise HTTPException(status_code=404, detail="Automation rule not found")
    await _validate_no_circular_trigger(db, event_id, payload, exclude_rule_id=rule_id)
    rule.name = payload.name
    rule.trigger = payload.trigger
    rule.trigger_config = payload.trigger_config or {}
    rule.enabled = payload.enabled
    rule.actions = _clean_actions_for_storage(payload.actions)
    rule.updated_at = datetime.utcnow()
    await db.commit()
    rules = [_rule_to_dict(item) for item in await _load_rule_rows(db, event_id)]
    return await _summary(db, event_id, rules)


@router.delete(
    "/api/admin/events/{event_id}/automations/{rule_id}",
    response_model=AutomationSummaryOut,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin)), Depends(require_email_system_access)],
)
async def delete_event_automation(
    event_id: int,
    rule_id: str,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_event_for_admin(event_id, me, db, "email:write")
    rule = await db.get(EventAutomationRule, rule_id)
    if not rule or rule.event_id != event_id:
        raise HTTPException(status_code=404, detail="Automation rule not found")
    await db.delete(rule)
    await db.execute(
        delete(EventAutomationDispatchState).where(
            EventAutomationDispatchState.event_id == event_id,
            EventAutomationDispatchState.rule_id == rule_id,
        )
    )
    await db.execute(
        delete(EventAutomationExecutionLog).where(
            EventAutomationExecutionLog.event_id == event_id,
            EventAutomationExecutionLog.rule_id == rule_id,
        )
    )
    await db.commit()
    rules = [_rule_to_dict(item) for item in await _load_rule_rows(db, event_id)]
    return await _summary(db, event_id, rules)


@router.post(
    "/api/admin/events/{event_id}/automations/dispatch-now",
    response_model=AutomationDispatchOut,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin)), Depends(require_email_system_access)],
)
async def dispatch_event_automations_now(
    event_id: int,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_event_for_admin(event_id, me, db, "email:write")
    return await process_automation_dispatches_once_for_event(event_id)


async def process_automation_dispatches_once_for_event(event_id: int) -> dict[str, int]:
    return await _process_automation_dispatches(event_id=event_id, limit_events=1)


@router.get(
    "/api/admin/events/{event_id}/automations/{rule_id}/dry-run",
    response_model=AutomationDryRunOut,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin)), Depends(require_email_system_access)],
)
async def dry_run_event_automation(
    event_id: int,
    rule_id: str,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    event = await _get_event_for_admin(event_id, me, db, "email:write")
    rule = await db.get(EventAutomationRule, rule_id)
    if not rule or rule.event_id != event_id:
        raise HTTPException(status_code=404, detail="Automation rule not found")
    targets = await _automation_target_attendees(db, event, rule.trigger, rule.trigger_config or {})
    samples = [
        {
            "attendee_id": attendee.id,
            "name": attendee.name,
            "email": attendee.email,
            "suppressed": bool(not attendee.email or not attendee.email.strip() or attendee.unsubscribed_at is not None),
        }
        for attendee in targets[:10]
    ]
    return AutomationDryRunOut(
        rule_id=rule.id,
        trigger=rule.trigger,
        target_count=len(targets),
        sample_recipients=samples,
        actions=[_serialize_action(action) for action in rule.actions or [] if isinstance(action, dict)],
    )


@router.get(
    "/api/admin/events/{event_id}/automations/logs",
    response_model=list[AutomationDispatchLogOut],
    dependencies=[Depends(require_role(Role.admin, Role.superadmin)), Depends(require_email_system_access)],
)
async def list_event_automation_logs(
    event_id: int,
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0, le=10000),
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_event_for_admin(event_id, me, db, "email:write")
    rows = (
        await db.execute(
            select(EventAutomationExecutionLog)
            .where(EventAutomationExecutionLog.event_id == event_id)
            .order_by(EventAutomationExecutionLog.updated_at.desc())
            .offset(offset)
            .limit(limit)
        )
    ).scalars().all()
    grouped: dict[str, list[EventAutomationExecutionLog]] = {}
    for row in rows:
        grouped.setdefault(row.rule_id, []).append(row)
    logs: list[AutomationDispatchLogOut] = []
    for rule_id, values in grouped.items():
        values.sort(key=lambda item: item.updated_at or item.created_at, reverse=True)
        logs.append(
            AutomationDispatchLogOut(
                rule_id=rule_id,
                updated_at=values[0].updated_at,
                dispatched_count=len(values),
                sent=sum(1 for item in values if item.status == "sent"),
                failed=sum(1 for item in values if item.status == "failed"),
                skipped=sum(1 for item in values if item.status in {"suppressed", "pending"}),
                recent=[
                    {
                        "id": item.id,
                        "status": item.status,
                        "attempts": item.attempts,
                        "attendee_id": item.attendee_id,
                        "email": item.recipient_email,
                        "action_type": item.action_type,
                        "message": item.error_message or (item.payload or {}).get("message"),
                        "next_attempt_at": item.next_attempt_at.isoformat() if item.next_attempt_at else None,
                        "dispatched_at": item.dispatched_at.isoformat() if item.dispatched_at else None,
                    }
                    for item in values[:25]
                ],
            )
        )
    return logs
