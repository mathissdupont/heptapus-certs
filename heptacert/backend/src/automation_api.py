"""Event automation rule builder endpoints."""

from datetime import datetime, timezone
from typing import Any, Literal, Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import and_, delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from .main import (
    Attendee,
    AttendaonceRecord,
    Certificate,
    EmailTemplate,
    CurrentUser,
    EventAutomationDispatchState,
    EventAutomationRule,
    EventTicket,
    Event,
    ParticipantBadge,
    Role,
    SurveyResponse,
    WebhookEndpointIn,
    build_certificate_verify_url,
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
]
AutomationActionType = Literal["send_email", "create_reminder", "webhook_dispatch"]

TRIGGER_LABELS: dict[str, str] = {
    "attended_event": "Katıldı",
    "registered_no_show": "Kayıt oldu ama gelmedi",
    "certificate_issued": "Sertifika aldı",
    "survey_not_completed": "Anketi tamamlamadı",
    "badge_earned": "Rozet kazandı",
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
    recent: list[dict[str, Any]]


def _automation_key(event_id: int) -> str:
    return f"event_automation_rules:{event_id}"


def _dispatch_key(event_id: int, rule_id: str) -> str:
    return f"event_automation_dispatch:{event_id}:{rule_id}"


def _rule_to_dict(rule: EventAutomationRule) -> dict[str, Any]:
    return {
        "id": rule.id,
        "name": rule.name,
        "trigger": rule.trigger,
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
        enabled=bool(raw.get("enabled", True)),
        actions=[_serialize_action(item) for item in raw.get("actions") or [] if isinstance(item, dict)],
        created_at=raw.get("created_at") or datetime.utcnow(),
        updated_at=raw.get("updated_at") or datetime.utcnow(),
    )


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


async def _automation_target_attendees(db: AsyncSession, event: Event, trigger: str) -> list[Attendee]:
    from .audience_segments_api import get_segment_attendees

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
    return {
        "recipient_name": attendee.name,
        "recipient_email": attendee.email,
        "event_name": event.name,
        "event_date": event.event_date.isoformat() if event.event_date else "TBD",
        "event_location": event.event_location or "Online",
        "certificate_link": (
            build_certificate_verify_url(cert_uuid_by_name[name_key])
            if name_key in cert_uuid_by_name
            else f"{settings.public_base_url}/events/{public_event_id}/register"
        ),
        "event_link": f"{settings.public_base_url}/events/{public_event_id}/register",
        "survey_link": build_public_survey_url(
            event_id=public_event_id,
            attendee_id=attendee.id,
            email=attendee.email,
        ),
    }


async def _dispatch_email_action(
    db: AsyncSession,
    event: Event,
    attendee: Attendee,
    action: dict[str, Any],
    cert_uuid_by_name: dict[str, str],
) -> tuple[bool, str]:
    from jinja2 import Template

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
    subject = Template(template.subject_tr).render(**variables)
    body = Template(template.body_html).render(**variables)
    await send_email_async(attendee.email, subject, body)
    return True, "email sent"


async def _dispatch_webhook_action(event: Event, attendee: Attendee, rule: dict[str, Any], action: dict[str, Any]) -> tuple[bool, str]:
    import httpx

    url = action.get("webhook_url")
    if not url:
        return False, "webhook_url missing"
    safe_url = WebhookEndpointIn(url=str(url), events=[]).url
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
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.post(safe_url, json=payload, headers={"X-HeptaCert-Event": "automation.dispatch"})
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

        for event in events:
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

                targets = await _automation_target_attendees(db, event, str(rule.get("trigger") or ""))
                stats["rules"] += 1
                stats["targets"] += len(targets)

                for attendee in targets:
                    for action_index, action in enumerate(actions):
                        action_type = str(action.get("type") or "")
                        key = _target_key(attendee, action_index, action_type)
                        if key in dispatched:
                            stats["skipped"] += 1
                            continue
                        try:
                            if action_type == "send_email":
                                ok, message = await _dispatch_email_action(db, event, attendee, action, cert_uuid_by_name)
                            elif action_type == "webhook_dispatch":
                                ok, message = await _dispatch_webhook_action(event, attendee, rule, action)
                            elif action_type == "create_reminder":
                                ok, message = True, f"reminder queued after {action.get('reminder_delay_hours') or 0}h"
                            else:
                                ok, message = False, f"unsupported action: {action_type}"
                        except Exception as exc:
                            ok, message = False, str(exc)
                            logger.warning("Automation dispatch failed: event=%s rule=%s attendee=%s action=%s error=%s", event.id, rule_id, attendee.id, action_type, exc)

                        dispatched[key] = {
                            "ok": ok,
                            "message": message,
                            "attendee_id": attendee.id,
                            "email": attendee.email,
                            "action_type": action_type,
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
    rule = EventAutomationRule(
        id=uuid4().hex,
        event_id=event_id,
        name=payload.name,
        trigger=payload.trigger,
        enabled=payload.enabled,
        actions=[action.model_dump() for action in payload.actions],
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
    rule.name = payload.name
    rule.trigger = payload.trigger
    rule.enabled = payload.enabled
    rule.actions = [action.model_dump() for action in payload.actions]
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
            select(EventAutomationDispatchState)
            .where(EventAutomationDispatchState.event_id == event_id)
            .order_by(EventAutomationDispatchState.updated_at.desc())
            .offset(offset)
            .limit(limit)
        )
    ).scalars().all()
    logs: list[AutomationDispatchLogOut] = []
    for row in rows:
        state = row.state if isinstance(row.state, dict) else {}
        dispatched = state.get("dispatched") if isinstance(state.get("dispatched"), dict) else {}
        values = list(dispatched.values())
        values.sort(key=lambda item: str(item.get("dispatched_at") or ""), reverse=True)
        logs.append(
            AutomationDispatchLogOut(
                rule_id=row.rule_id,
                updated_at=row.updated_at,
                dispatched_count=len(values),
                sent=sum(1 for item in values if item.get("ok")),
                failed=sum(1 for item in values if not item.get("ok")),
                recent=values[:25],
            )
        )
    return logs
