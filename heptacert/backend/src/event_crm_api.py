"""Organization-level participant CRM endpoints."""

import csv
import io
from datetime import datetime, timezone
from typing import Any, Optional

import httpx
from fastapi import UploadFile

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy import case, distinct, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased

from .main import (
    Attendee,
    AttendaonceRecord,
    Certificate,
    CurrentUser,
    EmailTemplate,
    Event,
    EventTicket,
    Organization,
    ParticipantCrmAuditLog,
    ParticipantCrmEmailAlias,
    ParticipantCrmProfile,
    ParticipantCrmSavedView,
    ParticipantCrmSnapshot,
    Role,
    SurveyResponse,
    User,
    get_current_user,
    get_db,
    require_role,
    send_email_async,
    settings,
)
from .organization_access_api import OrganizationMember, ensure_organization_enterprise, get_organization_for_access, organization_id_from_request

router = APIRouter()


class ParticipantCrmIn(BaseModel):
    email: str = Field(min_length=3, max_length=320)
    notes: Optional[str] = Field(default=None, max_length=5000)
    tags: Optional[list[str]] = None
    lifecycle_status: Optional[str] = Field(default=None, max_length=64)
    owner_user_id: Optional[int] = None
    priority: Optional[str] = Field(default=None, max_length=32)
    lead_score: Optional[int] = Field(default=None, ge=0, le=100)
    next_follow_up_at: Optional[datetime] = None
    custom_fields: Optional[dict[str, Any]] = None


class ParticipantCrmMeta(BaseModel):
    notes: str = ""
    tags: list[str] = Field(default_factory=list)
    lifecycle_status: str = "lead"
    owner_user_id: Optional[int] = None
    owner_email: Optional[str] = None
    priority: str = "normal"
    lead_score: int = 0
    next_follow_up_at: Optional[datetime] = None
    custom_fields: dict[str, Any] = Field(default_factory=dict)
    updated_at: Optional[datetime] = None


class ParticipantCrmListItem(BaseModel):
    email: str
    name: str
    event_count: int
    certificate_count: int
    attended_count: int
    survey_count: int
    latest_activity_at: Optional[datetime] = None
    meta: ParticipantCrmMeta


class ParticipantCrmDetail(BaseModel):
    email: str
    name: str
    meta: ParticipantCrmMeta
    summary: dict[str, int]
    history: list[dict[str, Any]]
    timeline: list[dict[str, Any]]


class ParticipantCrmSnapshotOut(BaseModel):
    email: str
    name: Optional[str] = None
    event_count: int
    certificate_count: int
    attended_count: int
    survey_count: int
    ticket_count: int
    latest_activity_at: Optional[datetime] = None
    computed_at: datetime


class ParticipantCrmAuditLogOut(BaseModel):
    id: int
    email: str
    actor_user_id: Optional[int] = None
    actor_email: Optional[str] = None
    action: str
    before: Optional[dict[str, Any]] = None
    after: Optional[dict[str, Any]] = None
    created_at: datetime


class ParticipantCrmSummary(BaseModel):
    total_participants: int
    profiled_participants: int
    latest_activity_at: Optional[datetime] = None
    by_status: dict[str, int]


class ParticipantCrmSavedViewIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    filters: dict[str, Any] = Field(default_factory=dict)
    visibility: str = Field(default="private", max_length=24)


class ParticipantCrmSavedViewOut(BaseModel):
    id: int
    name: str
    filters: dict[str, Any]
    visibility: str
    last_count: int
    last_computed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime


class ParticipantCrmBulkUpdateIn(BaseModel):
    emails: list[str] = Field(min_length=1, max_length=500)
    add_tags: list[str] = Field(default_factory=list)
    remove_tags: list[str] = Field(default_factory=list)
    lifecycle_status: Optional[str] = Field(default=None, max_length=64)
    owner_user_id: Optional[int] = None
    priority: Optional[str] = Field(default=None, max_length=32)


class ParticipantCrmBulkUpdateOut(BaseModel):
    updated: int
    skipped: int


class ParticipantCrmSelectionIn(BaseModel):
    emails: list[str] = Field(min_length=1, max_length=1000)


class ParticipantCrmBulkEmailIn(ParticipantCrmSelectionIn):
    email_template_id: int


class ParticipantCrmBulkEmailOut(BaseModel):
    sent: int
    skipped: int
    failed: int


class ParticipantCrmDuplicateCandidate(BaseModel):
    name_key: str
    display_name: str
    emails: list[str]
    count: int


class ParticipantCrmMergeIn(BaseModel):
    target_email: str = Field(min_length=3, max_length=320)
    source_emails: list[str] = Field(min_length=1, max_length=25)


class ParticipantCrmMergeOut(BaseModel):
    target_email: str
    merged_emails: list[str]
    aliases_created: int


class HubSpotIntegrationIn(BaseModel):
    private_app_token: str = Field(min_length=8, max_length=512)
    enabled: bool = True


class HubSpotIntegrationOut(BaseModel):
    configured: bool
    enabled: bool
    token_preview: Optional[str] = None


class HubSpotPushIn(ParticipantCrmSelectionIn):
    create_missing: bool = True


class HubSpotPushOut(BaseModel):
    pushed: int
    created: int
    updated: int
    failed: int
    errors: list[str] = Field(default_factory=list)


def _normalize_email(email: str) -> str:
    return (email or "").strip().lower()


def _crm_key(org_id: int, email: str) -> str:
    return f"event_crm:{org_id}:{_normalize_email(email)}"


def _name_key(value: str) -> str:
    return (value or "").strip().lower()


def _profile_state(row: ParticipantCrmProfile) -> dict[str, Any]:
    return {
        "notes": row.notes or "",
        "tags": [str(item).strip() for item in row.tags or [] if str(item).strip()],
        "lifecycle_status": row.lifecycle_status or "lead",
        "owner_user_id": row.owner_user_id,
        "priority": row.priority or "normal",
        "lead_score": int(row.lead_score or 0),
        "next_follow_up_at": row.next_follow_up_at.isoformat() if row.next_follow_up_at else None,
        "custom_fields": row.custom_fields or {},
    }


def _serialize_saved_view(row: ParticipantCrmSavedView) -> ParticipantCrmSavedViewOut:
    return ParticipantCrmSavedViewOut(
        id=row.id,
        name=row.name,
        filters=row.filters or {},
        visibility=row.visibility or "private",
        last_count=int(row.last_count or 0),
        last_computed_at=row.last_computed_at,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


def _clean_visibility(value: str) -> str:
    visibility = (value or "private").strip().lower()
    if visibility not in {"private", "organization"}:
        raise HTTPException(status_code=400, detail="Invalid saved view visibility")
    return visibility


def _clean_tags(values: list[str]) -> list[str]:
    return list(dict.fromkeys(str(item).strip() for item in values if str(item).strip()))[:50]


async def _admin_org(db: AsyncSession, me: CurrentUser, request: Request):
    org = await get_organization_for_access(db, me, "organization:view", organization_id_from_request(request))
    if me.role != Role.superadmin:
        await ensure_organization_enterprise(db, org)
    return org


async def _canonical_email(db: AsyncSession, org_id: int, email: str) -> str:
    normalized = _normalize_email(email)
    row_res = await db.execute(
        select(ParticipantCrmEmailAlias.target_email).where(
            ParticipantCrmEmailAlias.organization_id == org_id,
            ParticipantCrmEmailAlias.source_email == normalized,
        )
    )
    return row_res.scalar_one_or_none() or normalized


async def _identity_emails(db: AsyncSession, org_id: int, email: str) -> list[str]:
    canonical = await _canonical_email(db, org_id, email)
    rows = (
        await db.execute(
            select(ParticipantCrmEmailAlias.source_email).where(
                ParticipantCrmEmailAlias.organization_id == org_id,
                ParticipantCrmEmailAlias.target_email == canonical,
            )
        )
    ).scalars().all()
    return list(dict.fromkeys([canonical, *[_normalize_email(item) for item in rows if item]]))


async def _load_meta(db: AsyncSession, org_id: int, email: str) -> ParticipantCrmMeta:
    email = await _canonical_email(db, org_id, email)
    row_res = await db.execute(
        select(ParticipantCrmProfile).where(
            ParticipantCrmProfile.organization_id == org_id,
            ParticipantCrmProfile.email == _normalize_email(email),
        )
    )
    row = row_res.scalar_one_or_none()
    if not row:
        return ParticipantCrmMeta()
    tags = [str(item).strip() for item in row.tags or [] if str(item).strip()]
    owner_email = None
    if row.owner_user_id:
        owner = await db.get(User, row.owner_user_id)
        owner_email = owner.email if owner else None
    return ParticipantCrmMeta(
        notes=row.notes or "",
        tags=list(dict.fromkeys(tags))[:20],
        lifecycle_status=row.lifecycle_status or "lead",
        owner_user_id=row.owner_user_id,
        owner_email=owner_email,
        priority=row.priority or "normal",
        lead_score=int(row.lead_score or 0),
        next_follow_up_at=row.next_follow_up_at,
        custom_fields=row.custom_fields or {},
        updated_at=row.updated_at,
    )


async def _save_meta(db: AsyncSession, org_id: int, payload: ParticipantCrmIn, actor_user_id: Optional[int]) -> ParticipantCrmMeta:
    email = _normalize_email(payload.email)
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")
    row_res = await db.execute(
        select(ParticipantCrmProfile).where(ParticipantCrmProfile.organization_id == org_id, ParticipantCrmProfile.email == email)
    )
    row = row_res.scalar_one_or_none()
    if not row:
        row = ParticipantCrmProfile(organization_id=org_id, email=email, notes="", tags=[], lifecycle_status="lead")
        db.add(row)
        before = None
    else:
        before = _profile_state(row)
    if payload.notes is not None:
        row.notes = payload.notes.strip()
    if payload.tags is not None:
        row.tags = list(dict.fromkeys(str(item).strip() for item in payload.tags if str(item).strip()))[:20]
    if payload.lifecycle_status is not None:
        row.lifecycle_status = payload.lifecycle_status.strip() or "lead"
    if payload.owner_user_id is not None:
        owner = await db.get(User, payload.owner_user_id)
        if not owner:
            raise HTTPException(status_code=404, detail="Owner user not found")
        org_row = await db.get(Organization, org_id)
        is_org_owner = org_row is not None and org_row.user_id == owner.id
        if not is_org_owner:
            member_res = await db.execute(
                select(OrganizationMember).where(
                    OrganizationMember.organization_id == org_id,
                    OrganizationMember.user_id == owner.id,
                    OrganizationMember.status == "active",
                )
            )
            if not member_res.scalar_one_or_none():
                raise HTTPException(status_code=400, detail="Owner must be a member of this organization")
        row.owner_user_id = payload.owner_user_id
    if payload.priority is not None:
        priority = payload.priority.strip().lower() or "normal"
        if priority not in {"low", "normal", "high", "urgent"}:
            raise HTTPException(status_code=400, detail="Invalid CRM priority")
        row.priority = priority
    if payload.lead_score is not None:
        row.lead_score = int(payload.lead_score)
    if payload.next_follow_up_at is not None:
        row.next_follow_up_at = payload.next_follow_up_at
    if payload.custom_fields is not None:
        row.custom_fields = {str(key)[:80]: value for key, value in payload.custom_fields.items()}
    row.updated_at = datetime.now(timezone.utc)
    after = _profile_state(row)
    if before != after:
        db.add(
            ParticipantCrmAuditLog(
                organization_id=org_id,
                email=email,
                actor_user_id=actor_user_id,
                action="profile.updated" if before else "profile.created",
                before=before,
                after=after,
            )
        )
    await db.commit()
    if before != after and actor_user_id:
        try:
            from .webhooks import WebhookEvent, deliver_webhook
            org_row = await db.get(Organization, org_id)
            if org_row:
                webhook_payload: dict[str, Any] = {"email": email, "before": before, "after": after}
                await deliver_webhook(db, org_row.user_id, WebhookEvent.crm_profile_updated, webhook_payload)
                if before and after and before.get("lead_score") != after.get("lead_score"):
                    await deliver_webhook(db, org_row.user_id, WebhookEvent.crm_lead_score_changed, {
                        "email": email,
                        "old_score": before.get("lead_score"),
                        "new_score": after.get("lead_score"),
                    })
        except Exception:
            pass
    return await _load_meta(db, org_id, email)


async def _attendees_for_org(db: AsyncSession, org: Organization) -> list[tuple[Attendee, Event]]:
    rows_res = await db.execute(
        select(Attendee, Event)
        .join(Event, Event.id == Attendee.event_id)
        .where(Event.admin_id == org.user_id, Attendee.email.is_not(None), func.trim(Attendee.email) != "")
        .order_by(Attendee.registered_at.desc())
    )
    return rows_res.all()


async def _attendees_for_identity(db: AsyncSession, org: Organization, emails: list[str]) -> list[tuple[Attendee, Event]]:
    normalized = [email for email in dict.fromkeys(_normalize_email(item) for item in emails) if email]
    if not normalized:
        return []
    rows_res = await db.execute(
        select(Attendee, Event)
        .join(Event, Event.id == Attendee.event_id)
        .where(
            Event.admin_id == org.user_id,
            Attendee.email.is_not(None),
            func.lower(func.trim(Attendee.email)).in_(normalized),
        )
        .order_by(Attendee.registered_at.desc(), Attendee.id.desc())
    )
    return rows_res.all()


def _crm_integrations_settings(org: Organization) -> dict[str, Any]:
    settings_data = org.settings or {}
    return settings_data.get("crm_integrations") or {}


async def _save_crm_integrations_settings(db: AsyncSession, org: Organization, data: dict[str, Any]) -> None:
    settings_data = dict(org.settings or {})
    settings_data["crm_integrations"] = data
    org.settings = settings_data
    await db.commit()


def _hubspot_config(org: Organization) -> dict[str, Any]:
    return (_crm_integrations_settings(org).get("hubspot") or {}) if org else {}


def _token_preview(token: str) -> str:
    if not token:
        return ""
    if len(token) <= 10:
        return "*" * len(token)
    return f"{token[:6]}...{token[-4:]}"


def _split_name(name: str) -> tuple[str, str]:
    parts = [part for part in (name or "").strip().split(" ") if part]
    if not parts:
        return "", ""
    if len(parts) == 1:
        return parts[0], ""
    return parts[0], " ".join(parts[1:])


async def _crm_contact_payload(db: AsyncSession, org: Organization, email: str) -> dict[str, str] | None:
    canonical = await _canonical_email(db, org.id, email)
    identity_emails = await _identity_emails(db, org.id, canonical)
    rows = await _attendees_for_identity(db, org, identity_emails)
    if not rows:
        return None
    attendee = rows[0][0]
    first_name, last_name = _split_name(attendee.name or "")
    properties = {"email": canonical}
    if first_name:
        properties["firstname"] = first_name
    if last_name:
        properties["lastname"] = last_name
    return properties


async def _hubspot_upsert_contact(client: httpx.AsyncClient, token: str, properties: dict[str, str], create_missing: bool) -> str:
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    email = properties["email"]
    update = await client.patch(
        f"https://api.hubapi.com/crm/v3/objects/contacts/{email}",
        params={"idProperty": "email"},
        headers=headers,
        json={"properties": properties},
    )
    if update.status_code < 400:
        return "updated"
    if update.status_code != 404 or not create_missing:
        raise HTTPException(status_code=502, detail=f"HubSpot update failed for {email}: HTTP {update.status_code}")
    create = await client.post(
        "https://api.hubapi.com/crm/v3/objects/contacts",
        headers=headers,
        json={"properties": properties},
    )
    if create.status_code < 400:
        return "created"
    raise HTTPException(status_code=502, detail=f"HubSpot create failed for {email}: HTTP {create.status_code}")


async def _certificate_count_for_email(db: AsyncSession, rows: list[tuple[Attendee, Event]]) -> int:
    total = 0
    for attendee, event in rows:
        cert_res = await db.execute(
            select(func.count(Certificate.id)).where(
                Certificate.event_id == event.id,
                Certificate.deleted_at.is_(None),
                func.lower(func.trim(Certificate.student_name)) == _name_key(attendee.name),
            )
        )
        total += int(cert_res.scalar_one() or 0)
    return total


async def _attended_count_for_ids(db: AsyncSession, attendee_ids: list[int]) -> int:
    if not attendee_ids:
        return 0
    records_res = await db.execute(select(AttendaonceRecord.attendee_id).where(AttendaonceRecord.attendee_id.in_(attendee_ids)))
    ticket_res = await db.execute(
        select(EventTicket.attendee_id).where(EventTicket.attendee_id.in_(attendee_ids), EventTicket.checked_in_at.is_not(None))
    )
    ids = {int(item) for item in records_res.scalars().all() if item}
    ids.update(int(item) for item in ticket_res.scalars().all() if item)
    return len(ids)


async def _upsert_snapshot(
    db: AsyncSession,
    org: Organization,
    email: str,
    rows: list[tuple[Attendee, Event]],
    *,
    commit: bool = True,
) -> ParticipantCrmSnapshot:
    normalized = _normalize_email(email)
    attendee_ids = [attendee.id for attendee, _ in rows]
    certificate_count = await _certificate_count_for_email(db, rows)
    attended_count = await _attended_count_for_ids(db, attendee_ids)
    survey_count = sum(1 for attendee, _ in rows if attendee.survey_completed_at is not None)
    ticket_res = await db.execute(select(func.count(EventTicket.id)).where(EventTicket.attendee_id.in_(attendee_ids))) if attendee_ids else None
    ticket_count = int(ticket_res.scalar_one() or 0) if ticket_res is not None else 0
    latest_activity = max((attendee.registered_at for attendee, _ in rows if attendee.registered_at), default=None)
    snapshot_res = await db.execute(
        select(ParticipantCrmSnapshot).where(
            ParticipantCrmSnapshot.organization_id == org.id,
            ParticipantCrmSnapshot.email == normalized,
        )
    )
    snapshot = snapshot_res.scalar_one_or_none()
    if not snapshot:
        snapshot = ParticipantCrmSnapshot(organization_id=org.id, email=normalized)
        db.add(snapshot)
    snapshot.name = rows[0][0].name if rows else None
    snapshot.event_count = len({event.id for _, event in rows})
    snapshot.certificate_count = certificate_count
    snapshot.attended_count = attended_count
    snapshot.survey_count = survey_count
    snapshot.ticket_count = ticket_count
    snapshot.latest_activity_at = latest_activity
    snapshot.computed_at = datetime.now(timezone.utc)

    # Repeat attendee auto-score boost: 2+ events → +20 lead score (only if unset)
    event_count = len({event.id for _, event in rows})
    if event_count >= 2:
        profile_res = await db.execute(
            select(ParticipantCrmProfile).where(
                ParticipantCrmProfile.organization_id == org.id,
                ParticipantCrmProfile.email == normalized,
            )
        )
        profile = profile_res.scalar_one_or_none()
        if not profile:
            profile = ParticipantCrmProfile(organization_id=org.id, email=normalized, notes="", tags=[], lifecycle_status="lead", lead_score=20)
            db.add(profile)
        elif (profile.lead_score or 0) == 0:
            profile.lead_score = 20
            profile.updated_at = datetime.now(timezone.utc)

    if commit:
        await db.commit()
        await db.refresh(snapshot)
    return snapshot


@router.get(
    "/api/admin/crm/summary",
    response_model=ParticipantCrmSummary,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def get_crm_summary(
    request: Request,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await _admin_org(db, me, request)
    email_expr = func.lower(func.trim(Attendee.email))
    attendee_summary = (
        await db.execute(
            select(
                func.count(distinct(email_expr)),
                func.max(Attendee.registered_at),
            )
            .join(Event, Event.id == Attendee.event_id)
            .where(Event.admin_id == org.user_id, Attendee.email.is_not(None), func.trim(Attendee.email) != "")
        )
    ).one()
    profile_rows = (
        await db.execute(
            select(ParticipantCrmProfile.lifecycle_status, func.count(ParticipantCrmProfile.id))
            .where(ParticipantCrmProfile.organization_id == org.id)
            .group_by(ParticipantCrmProfile.lifecycle_status)
        )
    ).all()
    by_status = {status or "lead": int(count or 0) for status, count in profile_rows}
    return ParticipantCrmSummary(
        total_participants=int(attendee_summary[0] or 0),
        profiled_participants=sum(by_status.values()),
        latest_activity_at=attendee_summary[1],
        by_status=by_status,
    )


@router.get(
    "/api/admin/crm/views",
    response_model=list[ParticipantCrmSavedViewOut],
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def list_crm_saved_views(
    request: Request,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await _admin_org(db, me, request)
    rows = (
        await db.execute(
            select(ParticipantCrmSavedView)
            .where(
                ParticipantCrmSavedView.organization_id == org.id,
                or_(ParticipantCrmSavedView.visibility == "organization", ParticipantCrmSavedView.created_by == me.id),
            )
            .order_by(ParticipantCrmSavedView.updated_at.desc())
        )
    ).scalars().all()
    return [_serialize_saved_view(row) for row in rows]


@router.post(
    "/api/admin/crm/views",
    response_model=ParticipantCrmSavedViewOut,
    status_code=201,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def create_crm_saved_view(
    request: Request,
    payload: ParticipantCrmSavedViewIn,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await _admin_org(db, me, request)
    row = ParticipantCrmSavedView(
        organization_id=org.id,
        created_by=me.id,
        name=payload.name.strip(),
        filters=payload.filters or {},
        visibility=_clean_visibility(payload.visibility),
        last_count=0,
        last_computed_at=datetime.now(timezone.utc),
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return _serialize_saved_view(row)


@router.patch(
    "/api/admin/crm/views/{view_id}",
    response_model=ParticipantCrmSavedViewOut,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def update_crm_saved_view(
    request: Request,
    view_id: int,
    payload: ParticipantCrmSavedViewIn,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await _admin_org(db, me, request)
    row = await db.get(ParticipantCrmSavedView, view_id)
    if not row or row.organization_id != org.id or (row.visibility != "organization" and row.created_by != me.id):
        raise HTTPException(status_code=404, detail="Saved view not found")
    row.name = payload.name.strip()
    row.filters = payload.filters or {}
    row.visibility = _clean_visibility(payload.visibility)
    row.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(row)
    return _serialize_saved_view(row)


@router.delete(
    "/api/admin/crm/views/{view_id}",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def delete_crm_saved_view(
    request: Request,
    view_id: int,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await _admin_org(db, me, request)
    row = await db.get(ParticipantCrmSavedView, view_id)
    if not row or row.organization_id != org.id or (row.visibility != "organization" and row.created_by != me.id):
        raise HTTPException(status_code=404, detail="Saved view not found")
    await db.delete(row)
    await db.commit()
    return {"ok": True}


@router.get(
    "/api/admin/crm/participants",
    response_model=list[ParticipantCrmListItem],
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def list_crm_participants(
    request: Request,
    query: str = Query(default=""),
    tag: str = Query(default=""),
    status: str = Query(default=""),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0, le=10000),
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await _admin_org(db, me, request)
    email_expr = func.lower(func.trim(Attendee.email))
    alias = aliased(ParticipantCrmEmailAlias)
    canonical_email = func.coalesce(alias.target_email, email_expr)
    name_expr = func.max(Attendee.name)
    attendance_subq = (
        select(AttendaonceRecord.attendee_id.label("attendee_id"))
        .group_by(AttendaonceRecord.attendee_id)
        .subquery()
    )
    ticket_checkin_subq = (
        select(EventTicket.attendee_id.label("attendee_id"))
        .where(EventTicket.checked_in_at.is_not(None))
        .group_by(EventTicket.attendee_id)
        .subquery()
    )
    needle = query.strip().lower()
    stmt = (
        select(
            canonical_email.label("email"),
            name_expr.label("name"),
            func.count(distinct(Event.id)).label("event_count"),
            func.count(distinct(Certificate.id)).label("certificate_count"),
            func.count(
                distinct(
                    case(
                        (
                            or_(
                                attendance_subq.c.attendee_id.is_not(None),
                                ticket_checkin_subq.c.attendee_id.is_not(None),
                            ),
                            Attendee.id,
                        )
                    )
                )
            ).label("attended_count"),
            func.count(distinct(case((Attendee.survey_completed_at.is_not(None), Attendee.id)))).label("survey_count"),
            func.max(Attendee.registered_at).label("latest_activity_at"),
            ParticipantCrmProfile.notes,
            ParticipantCrmProfile.tags,
            ParticipantCrmProfile.lifecycle_status,
            ParticipantCrmProfile.owner_user_id,
            ParticipantCrmProfile.priority,
            ParticipantCrmProfile.lead_score,
            ParticipantCrmProfile.next_follow_up_at,
            ParticipantCrmProfile.custom_fields,
            ParticipantCrmProfile.updated_at,
        )
        .join(Event, Event.id == Attendee.event_id)
        .outerjoin(
            alias,
            (alias.organization_id == org.id)
            & (alias.source_email == email_expr),
        )
        .outerjoin(attendance_subq, attendance_subq.c.attendee_id == Attendee.id)
        .outerjoin(ticket_checkin_subq, ticket_checkin_subq.c.attendee_id == Attendee.id)
        .outerjoin(
            Certificate,
            (Certificate.event_id == Event.id)
            & (Certificate.deleted_at.is_(None))
            & (func.lower(func.trim(Certificate.student_name)) == func.lower(func.trim(Attendee.name))),
        )
        .outerjoin(
            ParticipantCrmProfile,
            (ParticipantCrmProfile.organization_id == org.id)
            & (ParticipantCrmProfile.email == canonical_email),
        )
        .where(Event.admin_id == org.user_id, Attendee.email.is_not(None), func.trim(Attendee.email) != "")
    )
    if needle:
        like = f"%{needle}%"
        stmt = stmt.where(or_(canonical_email.like(like), email_expr.like(like), func.lower(Attendee.name).like(like)))
    if status:
        stmt = stmt.where(ParticipantCrmProfile.lifecycle_status == status.strip())
    if tag:
        stmt = stmt.where(ParticipantCrmProfile.tags.contains([tag.strip()]))
    stmt = (
        stmt.group_by(
            canonical_email,
            ParticipantCrmProfile.notes,
            ParticipantCrmProfile.tags,
            ParticipantCrmProfile.lifecycle_status,
            ParticipantCrmProfile.owner_user_id,
            ParticipantCrmProfile.priority,
            ParticipantCrmProfile.lead_score,
            ParticipantCrmProfile.next_follow_up_at,
            ParticipantCrmProfile.custom_fields,
            ParticipantCrmProfile.updated_at,
        )
        .order_by(func.max(Attendee.registered_at).desc())
        .offset(offset)
        .limit(limit)
    )
    rows = (await db.execute(stmt)).all()
    items: list[ParticipantCrmListItem] = []
    for row in rows:
        tags = [str(item).strip() for item in (row.tags or []) if str(item).strip()]
        items.append(
            ParticipantCrmListItem(
                email=row.email,
                name=row.name or row.email,
                event_count=int(row.event_count or 0),
                certificate_count=int(row.certificate_count or 0),
                attended_count=int(row.attended_count or 0),
                survey_count=int(row.survey_count or 0),
                latest_activity_at=row.latest_activity_at,
                meta=ParticipantCrmMeta(
                    notes=row.notes or "",
                    tags=list(dict.fromkeys(tags))[:20],
                    lifecycle_status=row.lifecycle_status or "lead",
                    owner_user_id=row.owner_user_id,
                    priority=row.priority or "normal",
                    lead_score=int(row.lead_score or 0),
                    next_follow_up_at=row.next_follow_up_at,
                    custom_fields=row.custom_fields or {},
                    updated_at=row.updated_at,
                ),
            )
        )
    return items


@router.get(
    "/api/admin/crm/participant",
    response_model=ParticipantCrmDetail,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def get_crm_participant(
    request: Request,
    email: str,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await _admin_org(db, me, request)
    normalized = await _canonical_email(db, org.id, email)
    identity_emails = set(await _identity_emails(db, org.id, normalized))
    rows = [(attendee, event) for attendee, event in await _attendees_for_org(db, org) if _normalize_email(attendee.email) in identity_emails]
    if not rows:
        raise HTTPException(status_code=404, detail="Participant not found")
    await _upsert_snapshot(db, org, normalized, rows)
    meta = await _load_meta(db, org.id, normalized)
    timeline: list[dict[str, Any]] = []
    history: list[dict[str, Any]] = []
    total_certificates = 0
    attended_count = 0
    survey_count = 0

    for attendee, event in rows:
        attendee_ids = [attendee.id]
        event_item: dict[str, Any] = {
            "event_id": event.id,
            "event_name": event.name,
            "registered_at": attendee.registered_at,
            "email_verified": bool(attendee.email_verified),
            "survey_completed": attendee.survey_completed_at is not None,
            "certificates": [],
            "tickets": [],
            "attendance_count": 0,
        }
        timeline.append({"at": attendee.registered_at, "type": "registered", "label": f"{event.name}: kayıt"})
        if attendee.email_verified_at:
            timeline.append({"at": attendee.email_verified_at, "type": "email_verified", "label": f"{event.name}: e-posta doğrulandı"})
        if attendee.survey_completed_at:
            survey_count += 1
            timeline.append({"at": attendee.survey_completed_at, "type": "survey", "label": f"{event.name}: anket tamamlandı"})

        records_res = await db.execute(select(AttendaonceRecord).where(AttendaonceRecord.attendee_id.in_(attendee_ids)))
        records = records_res.scalars().all()
        event_item["attendance_count"] = len(records)
        if records:
            attended_count += 1
        for record in records:
            timeline.append({"at": record.checked_in_at, "type": "attendance", "label": f"{event.name}: oturum katılımı"})

        tickets_res = await db.execute(select(EventTicket).where(EventTicket.attendee_id == attendee.id))
        tickets = tickets_res.scalars().all()
        for ticket in tickets:
            event_item["tickets"].append({"status": ticket.status, "issued_at": ticket.issued_at, "checked_in_at": ticket.checked_in_at})
            timeline.append({"at": ticket.issued_at, "type": "ticket", "label": f"{event.name}: bilet {ticket.status}"})
            if ticket.checked_in_at:
                timeline.append({"at": ticket.checked_in_at, "type": "checkin", "label": f"{event.name}: bilet check-in"})

        cert_res = await db.execute(
            select(Certificate).where(
                Certificate.event_id == event.id,
                Certificate.deleted_at.is_(None),
                func.lower(func.trim(Certificate.student_name)) == _name_key(attendee.name),
            )
        )
        certs = cert_res.scalars().all()
        total_certificates += len(certs)
        for cert in certs:
            event_item["certificates"].append({"uuid": cert.uuid, "status": cert.status.value if hasattr(cert.status, "value") else str(cert.status), "issued_at": cert.issued_at})
            timeline.append({"at": cert.issued_at, "type": "certificate", "label": f"{event.name}: sertifika üretildi"})

        history.append(event_item)

    timeline = sorted([item for item in timeline if item.get("at")], key=lambda item: item["at"], reverse=True)
    first = rows[0][0]
    return ParticipantCrmDetail(
        email=normalized,
        name=first.name,
        meta=meta,
        summary={
            "events": len({event.id for _, event in rows}),
            "certificates": total_certificates,
            "attended": attended_count,
            "surveys": survey_count,
        },
        history=history,
        timeline=timeline,
    )


@router.patch(
    "/api/admin/crm/participant",
    response_model=ParticipantCrmMeta,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def update_crm_participant(
    request: Request,
    payload: ParticipantCrmIn,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await _admin_org(db, me, request)
    return await _save_meta(db, org.id, payload, me.id)


@router.get(
    "/api/admin/crm/integrations/hubspot",
    response_model=HubSpotIntegrationOut,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def get_hubspot_integration(
    request: Request,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await _admin_org(db, me, request)
    cfg = _hubspot_config(org)
    token = str(cfg.get("private_app_token") or "")
    return HubSpotIntegrationOut(
        configured=bool(token),
        enabled=bool(cfg.get("enabled", True)),
        token_preview=_token_preview(token) if token else None,
    )


@router.patch(
    "/api/admin/crm/integrations/hubspot",
    response_model=HubSpotIntegrationOut,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def update_hubspot_integration(
    request: Request,
    payload: HubSpotIntegrationIn,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await _admin_org(db, me, request)
    data = _crm_integrations_settings(org)
    data["hubspot"] = {
        "private_app_token": payload.private_app_token.strip(),
        "enabled": bool(payload.enabled),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "updated_by": me.id,
    }
    await _save_crm_integrations_settings(db, org, data)
    await db.refresh(org)
    return await get_hubspot_integration(request, me=me, db=db)


@router.delete(
    "/api/admin/crm/integrations/hubspot",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def delete_hubspot_integration(
    request: Request,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await _admin_org(db, me, request)
    data = _crm_integrations_settings(org)
    data.pop("hubspot", None)
    await _save_crm_integrations_settings(db, org, data)
    return {"ok": True}


@router.post(
    "/api/admin/crm/integrations/hubspot/test",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def test_hubspot_integration(
    request: Request,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await _admin_org(db, me, request)
    cfg = _hubspot_config(org)
    token = str(cfg.get("private_app_token") or "")
    if not token or not cfg.get("enabled", True):
        raise HTTPException(status_code=400, detail="HubSpot integration is not configured")
    async with httpx.AsyncClient(timeout=10.0) as client:
        res = await client.get(
            "https://api.hubapi.com/crm/v3/objects/contacts",
            params={"limit": "1"},
            headers={"Authorization": f"Bearer {token}"},
        )
    if res.status_code >= 400:
        raise HTTPException(status_code=502, detail=f"HubSpot token test failed: HTTP {res.status_code}")
    return {"ok": True}


@router.post(
    "/api/admin/crm/integrations/hubspot/push",
    response_model=HubSpotPushOut,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def push_crm_participants_to_hubspot(
    request: Request,
    payload: HubSpotPushIn,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await _admin_org(db, me, request)
    cfg = _hubspot_config(org)
    token = str(cfg.get("private_app_token") or "")
    if not token or not cfg.get("enabled", True):
        raise HTTPException(status_code=400, detail="HubSpot integration is not configured")
    emails = list(dict.fromkeys(_normalize_email(email) for email in payload.emails if _normalize_email(email)))[:1000]
    if not emails:
        raise HTTPException(status_code=400, detail="At least one valid email is required")

    pushed = created = updated = failed = 0
    errors: list[str] = []
    async with httpx.AsyncClient(timeout=15.0) as client:
        for email in emails:
            properties = await _crm_contact_payload(db, org, email)
            if not properties:
                failed += 1
                errors.append(f"{email}: participant not found")
                continue
            try:
                result = await _hubspot_upsert_contact(client, token, properties, payload.create_missing)
                pushed += 1
                if result == "created":
                    created += 1
                else:
                    updated += 1
            except HTTPException as exc:
                failed += 1
                errors.append(str(exc.detail))

    db.add(
        ParticipantCrmAuditLog(
            organization_id=org.id,
            email="*",
            actor_user_id=me.id,
            action="hubspot.push",
            before=None,
            after={"requested": len(emails), "pushed": pushed, "created": created, "updated": updated, "failed": failed},
        )
    )
    await db.commit()
    return HubSpotPushOut(pushed=pushed, created=created, updated=updated, failed=failed, errors=errors[:20])


@router.post(
    "/api/admin/crm/bulk-update",
    response_model=ParticipantCrmBulkUpdateOut,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def bulk_update_crm_participants(
    request: Request,
    payload: ParticipantCrmBulkUpdateIn,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await _admin_org(db, me, request)
    normalized_emails = list(dict.fromkeys(_normalize_email(email) for email in payload.emails if _normalize_email(email)))
    if not normalized_emails:
        raise HTTPException(status_code=400, detail="At least one valid email is required")
    owner_user = None
    if payload.owner_user_id is not None:
        owner_user = await db.get(User, payload.owner_user_id)
        if not owner_user:
            raise HTTPException(status_code=404, detail="Owner user not found")
        org_row = await db.get(Organization, org.id)
        is_org_owner = org_row is not None and org_row.user_id == owner_user.id
        if not is_org_owner:
            member_res = await db.execute(
                select(OrganizationMember).where(
                    OrganizationMember.organization_id == org.id,
                    OrganizationMember.user_id == owner_user.id,
                    OrganizationMember.status == "active",
                )
            )
            if not member_res.scalar_one_or_none():
                raise HTTPException(status_code=400, detail="Owner must be a member of this organization")
    priority = None
    if payload.priority is not None:
        priority = payload.priority.strip().lower() or "normal"
        if priority not in {"low", "normal", "high", "urgent"}:
            raise HTTPException(status_code=400, detail="Invalid CRM priority")
    add_tags = _clean_tags(payload.add_tags)
    remove_tags = set(_clean_tags(payload.remove_tags))
    updated = skipped = 0
    for email in normalized_emails:
        row_res = await db.execute(
            select(ParticipantCrmProfile).where(ParticipantCrmProfile.organization_id == org.id, ParticipantCrmProfile.email == email)
        )
        row = row_res.scalar_one_or_none()
        if not row:
            row = ParticipantCrmProfile(organization_id=org.id, email=email, notes="", tags=[], lifecycle_status="lead")
            db.add(row)
            before = None
        else:
            before = _profile_state(row)
        tags = [item for item in _clean_tags(row.tags or []) if item not in remove_tags]
        tags = list(dict.fromkeys([*tags, *add_tags]))[:20]
        row.tags = tags
        if payload.lifecycle_status is not None:
            row.lifecycle_status = payload.lifecycle_status.strip() or "lead"
        if owner_user is not None:
            row.owner_user_id = owner_user.id
        if priority is not None:
            row.priority = priority
        row.updated_at = datetime.now(timezone.utc)
        after = _profile_state(row)
        if before == after:
            skipped += 1
            continue
        db.add(
            ParticipantCrmAuditLog(
                organization_id=org.id,
                email=email,
                actor_user_id=me.id,
                action="profile.bulk_updated",
                before=before,
                after=after,
            )
        )
        updated += 1
    await db.commit()
    return ParticipantCrmBulkUpdateOut(updated=updated, skipped=skipped)


@router.post(
    "/api/admin/crm/export-selected",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def export_selected_crm_participants(
    request: Request,
    payload: ParticipantCrmSelectionIn,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await _admin_org(db, me, request)
    normalized_emails = list(dict.fromkeys(_normalize_email(email) for email in payload.emails if _normalize_email(email)))
    if not normalized_emails:
        raise HTTPException(status_code=400, detail="At least one valid email is required")

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(
        [
            "email",
            "name",
            "lifecycle_status",
            "priority",
            "lead_score",
            "tags",
            "owner_user_id",
            "next_follow_up_at",
            "event_count",
            "attended_count",
            "certificate_count",
            "survey_count",
            "ticket_count",
            "latest_activity_at",
        ]
    )

    for email in normalized_emails:
        canonical = await _canonical_email(db, org.id, email)
        identity_emails = await _identity_emails(db, org.id, canonical)
        rows = await _attendees_for_identity(db, org, identity_emails)
        if not rows:
            continue
        snapshot = await _upsert_snapshot(db, org, canonical, rows, commit=False)
        meta = await _load_meta(db, org.id, canonical)
        writer.writerow(
            [
                canonical,
                snapshot.name or rows[0][0].name or canonical,
                meta.lifecycle_status,
                meta.priority,
                meta.lead_score,
                ", ".join(meta.tags),
                meta.owner_user_id or "",
                meta.next_follow_up_at.isoformat() if meta.next_follow_up_at else "",
                snapshot.event_count,
                snapshot.attended_count,
                snapshot.certificate_count,
                snapshot.survey_count,
                snapshot.ticket_count,
                snapshot.latest_activity_at.isoformat() if snapshot.latest_activity_at else "",
            ]
        )

    await db.commit()
    output.seek(0)
    filename = f"crm-selected-{datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S')}.csv"
    headers = {"Content-Disposition": f'attachment; filename="{filename}"'}
    return StreamingResponse(iter([output.getvalue().encode("utf-8-sig")]), media_type="text/csv; charset=utf-8", headers=headers)


@router.post(
    "/api/admin/crm/bulk-email",
    response_model=ParticipantCrmBulkEmailOut,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def send_selected_crm_email(
    request: Request,
    payload: ParticipantCrmBulkEmailIn,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await _admin_org(db, me, request)
    normalized_emails = list(dict.fromkeys(_normalize_email(email) for email in payload.emails if _normalize_email(email)))
    if not normalized_emails:
        raise HTTPException(status_code=400, detail="At least one valid email is required")

    template_res = await db.execute(
        select(EmailTemplate, Event)
        .outerjoin(Event, Event.id == EmailTemplate.event_id)
        .where(
            EmailTemplate.id == payload.email_template_id,
            or_(EmailTemplate.template_type == "system", Event.admin_id == org.user_id),
        )
    )
    template_row = template_res.one_or_none()
    if not template_row:
        raise HTTPException(status_code=404, detail="Email template not found")
    template, template_event = template_row

    sent = skipped = failed = 0
    for email in normalized_emails:
        canonical = await _canonical_email(db, org.id, email)
        identity_emails = await _identity_emails(db, org.id, canonical)
        rows = [
            row
            for row in await _attendees_for_identity(db, org, identity_emails)
            if row[0].email and row[0].email.strip() and row[0].unsubscribed_at is None
        ]
        if not rows:
            skipped += 1
            continue
        attendee, event = rows[0]
        event_for_template = template_event or event
        template_vars = {
            "recipient_name": attendee.name,
            "recipient_email": attendee.email,
            "event_name": event_for_template.name,
            "event_date": event_for_template.event_date.isoformat() if event_for_template.event_date else "TBD",
            "event_location": event_for_template.event_location or "Online",
        }
        try:
            await send_email_async(
                to=attendee.email,
                subject=template.subject_tr,
                html_body=template.body_html,
                template_vars=template_vars,
                raise_on_error=True,
                sender_user_id=event_for_template.admin_id,
            )
            db.add(
                ParticipantCrmAuditLog(
                    organization_id=org.id,
                    email=canonical,
                    actor_user_id=me.id,
                    action="profile.bulk_email_sent",
                    before=None,
                    after={"email_template_id": template.id, "recipient_email": attendee.email},
                )
            )
            sent += 1
        except Exception as exc:
            db.add(
                ParticipantCrmAuditLog(
                    organization_id=org.id,
                    email=canonical,
                    actor_user_id=me.id,
                    action="profile.bulk_email_failed",
                    before=None,
                    after={"email_template_id": template.id, "recipient_email": attendee.email, "error": str(exc)[:500]},
                )
            )
            failed += 1
    await db.commit()
    return ParticipantCrmBulkEmailOut(sent=sent, skipped=skipped, failed=failed)


@router.get(
    "/api/admin/crm/duplicates",
    response_model=list[ParticipantCrmDuplicateCandidate],
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def list_crm_duplicate_candidates(
    request: Request,
    limit: int = Query(default=50, ge=1, le=200),
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await _admin_org(db, me, request)
    rows = await _attendees_for_org(db, org)
    by_name: dict[str, dict[str, Any]] = {}
    for attendee, _event in rows:
        name_key = _name_key(attendee.name)
        email = await _canonical_email(db, org.id, attendee.email)
        if not name_key or not email:
            continue
        bucket = by_name.setdefault(name_key, {"display_name": attendee.name, "emails": set()})
        bucket["emails"].add(email)
    candidates = [
        ParticipantCrmDuplicateCandidate(
            name_key=name_key,
            display_name=str(data["display_name"]),
            emails=sorted(data["emails"]),
            count=len(data["emails"]),
        )
        for name_key, data in by_name.items()
        if len(data["emails"]) > 1
    ]
    candidates.sort(key=lambda item: item.count, reverse=True)
    return candidates[:limit]


@router.post(
    "/api/admin/crm/merge",
    response_model=ParticipantCrmMergeOut,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def merge_crm_participants(
    request: Request,
    payload: ParticipantCrmMergeIn,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await _admin_org(db, me, request)
    target = await _canonical_email(db, org.id, payload.target_email)
    sources = [
        await _canonical_email(db, org.id, item)
        for item in payload.source_emails
        if _normalize_email(item) and _normalize_email(item) != target
    ]
    sources = list(dict.fromkeys(source for source in sources if source and source != target))
    if not sources:
        raise HTTPException(status_code=400, detail="No source emails to merge")

    target_profile_res = await db.execute(
        select(ParticipantCrmProfile).where(ParticipantCrmProfile.organization_id == org.id, ParticipantCrmProfile.email == target)
    )
    target_profile = target_profile_res.scalar_one_or_none()
    if not target_profile:
        target_profile = ParticipantCrmProfile(organization_id=org.id, email=target, notes="", tags=[], lifecycle_status="lead")
        db.add(target_profile)
    before = _profile_state(target_profile)

    aliases_created = 0
    for source in sources:
        source_profile_res = await db.execute(
            select(ParticipantCrmProfile).where(ParticipantCrmProfile.organization_id == org.id, ParticipantCrmProfile.email == source)
        )
        source_profile = source_profile_res.scalar_one_or_none()
        if source_profile:
            source_state = _profile_state(source_profile)
            target_profile.tags = list(dict.fromkeys([*_clean_tags(target_profile.tags or []), *_clean_tags(source_profile.tags or [])]))[:20]
            if source_profile.notes and source_profile.notes not in (target_profile.notes or ""):
                target_profile.notes = ((target_profile.notes or "").strip() + f"\n\n--- merged from {source} ---\n" + source_profile.notes.strip()).strip()
            target_profile.lead_score = max(int(target_profile.lead_score or 0), int(source_profile.lead_score or 0))
            if (source_profile.priority or "normal") in {"urgent", "high"} and target_profile.priority not in {"urgent"}:
                target_profile.priority = source_profile.priority
            db.add(
                ParticipantCrmAuditLog(
                    organization_id=org.id,
                    email=source,
                    actor_user_id=me.id,
                    action="profile.merged_into",
                    before=source_state,
                    after={"target_email": target},
                )
            )
        alias_res = await db.execute(
            select(ParticipantCrmEmailAlias).where(
                ParticipantCrmEmailAlias.organization_id == org.id,
                ParticipantCrmEmailAlias.source_email == source,
            )
        )
        alias = alias_res.scalar_one_or_none()
        if not alias:
            alias = ParticipantCrmEmailAlias(organization_id=org.id, source_email=source, target_email=target, created_by=me.id)
            db.add(alias)
            aliases_created += 1
        else:
            alias.target_email = target

    target_profile.updated_at = datetime.now(timezone.utc)
    db.add(
        ParticipantCrmAuditLog(
            organization_id=org.id,
            email=target,
            actor_user_id=me.id,
            action="profile.merge_completed",
            before=before,
            after={**_profile_state(target_profile), "merged_emails": sources},
        )
    )
    await db.commit()
    return ParticipantCrmMergeOut(target_email=target, merged_emails=sources, aliases_created=aliases_created)


@router.get(
    "/api/admin/crm/participant/snapshot",
    response_model=ParticipantCrmSnapshotOut,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def refresh_crm_participant_snapshot(
    request: Request,
    email: str,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await _admin_org(db, me, request)
    normalized = await _canonical_email(db, org.id, email)
    identity_emails = set(await _identity_emails(db, org.id, normalized))
    rows = [(attendee, event) for attendee, event in await _attendees_for_org(db, org) if _normalize_email(attendee.email) in identity_emails]
    if not rows:
        raise HTTPException(status_code=404, detail="Participant not found")
    snapshot = await _upsert_snapshot(db, org, normalized, rows)
    return ParticipantCrmSnapshotOut(
        email=snapshot.email,
        name=snapshot.name,
        event_count=snapshot.event_count,
        certificate_count=snapshot.certificate_count,
        attended_count=snapshot.attended_count,
        survey_count=snapshot.survey_count,
        ticket_count=snapshot.ticket_count,
        latest_activity_at=snapshot.latest_activity_at,
        computed_at=snapshot.computed_at,
    )


@router.get(
    "/api/admin/crm/audit",
    response_model=list[ParticipantCrmAuditLogOut],
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def list_crm_audit_logs(
    request: Request,
    email: Optional[str] = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0, le=10000),
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await _admin_org(db, me, request)
    stmt = (
        select(ParticipantCrmAuditLog, User)
        .outerjoin(User, User.id == ParticipantCrmAuditLog.actor_user_id)
        .where(ParticipantCrmAuditLog.organization_id == org.id)
    )
    if email:
        stmt = stmt.where(ParticipantCrmAuditLog.email == _normalize_email(email))
    rows = (
        await db.execute(
            stmt.order_by(ParticipantCrmAuditLog.created_at.desc()).offset(offset).limit(limit)
        )
    ).all()
    return [
        ParticipantCrmAuditLogOut(
            id=row.id,
            email=row.email,
            actor_user_id=row.actor_user_id,
            actor_email=user.email if user else None,
            action=row.action,
            before=row.before,
            after=row.after,
            created_at=row.created_at,
        )
        for row, user in rows
    ]


# ── No-show detection ────────────────────────────────────────────────────────

class CrmNoShowTagOut(BaseModel):
    tagged: int
    skipped: int


@router.post(
    "/api/admin/crm/tag-no-shows",
    response_model=CrmNoShowTagOut,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def tag_crm_no_shows(
    request: Request,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Tag participants who registered but never checked in as 'no_show' in CRM."""
    from datetime import date
    org = await _admin_org(db, me, request)
    today = date.today()
    past_event_ids_res = await db.execute(
        select(Event.id).where(Event.admin_id == org.user_id, Event.event_date < today)
    )
    past_event_ids = [int(item) for item in past_event_ids_res.scalars().all()]
    if not past_event_ids:
        return CrmNoShowTagOut(tagged=0, skipped=0)

    attended_attendee_ids_res = await db.execute(
        select(AttendaonceRecord.attendee_id).where(
            AttendaonceRecord.attendee_id.in_(
                select(Attendee.id).where(Attendee.event_id.in_(past_event_ids))
            )
        )
    )
    ticket_checkin_ids_res = await db.execute(
        select(EventTicket.attendee_id).where(
            EventTicket.attendee_id.in_(
                select(Attendee.id).where(Attendee.event_id.in_(past_event_ids))
            ),
            EventTicket.checked_in_at.is_not(None),
        )
    )
    attended_ids = {int(item) for item in attended_attendee_ids_res.scalars().all()}
    attended_ids.update(int(item) for item in ticket_checkin_ids_res.scalars().all())

    no_show_rows = (
        await db.execute(
            select(Attendee.email).where(
                Attendee.event_id.in_(past_event_ids),
                Attendee.id.not_in(list(attended_ids)) if attended_ids else True,
                Attendee.email.is_not(None),
                func.trim(Attendee.email) != "",
            ).distinct()
        )
    ).scalars().all()

    tagged = skipped = 0
    for raw_email in no_show_rows:
        email = _normalize_email(raw_email)
        if not email:
            continue
        canonical = await _canonical_email(db, org.id, email)
        profile_res = await db.execute(
            select(ParticipantCrmProfile).where(
                ParticipantCrmProfile.organization_id == org.id,
                ParticipantCrmProfile.email == canonical,
            )
        )
        profile = profile_res.scalar_one_or_none()
        if not profile:
            profile = ParticipantCrmProfile(organization_id=org.id, email=canonical, notes="", tags=[], lifecycle_status="lead")
            db.add(profile)
        existing_tags = list(profile.tags or [])
        if "no_show" in existing_tags:
            skipped += 1
            continue
        profile.tags = list(dict.fromkeys([*existing_tags, "no_show"]))[:20]
        profile.updated_at = datetime.now(timezone.utc)
        tagged += 1
    await db.commit()
    return CrmNoShowTagOut(tagged=tagged, skipped=skipped)


# ── CSV Import ───────────────────────────────────────────────────────────────

class CrmImportOut(BaseModel):
    created: int
    updated: int
    skipped: int
    errors: list[str]


@router.post(
    "/api/admin/crm/import-csv",
    response_model=CrmImportOut,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def import_crm_from_csv(
    request: Request,
    file: UploadFile,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Import CRM profiles from CSV. Columns: email (required), tags, lifecycle_status, priority, lead_score, notes."""
    org = await _admin_org(db, me, request)
    raw = await file.read()
    if len(raw) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="CSV dosyası 5 MB'ı geçemez.")
    try:
        text = raw.decode("utf-8-sig")
    except UnicodeDecodeError:
        text = raw.decode("latin-1", errors="replace")

    reader = csv.DictReader(io.StringIO(text))
    created = updated = skipped = 0
    errors: list[str] = []
    VALID_PRIORITIES = {"low", "normal", "high", "urgent"}
    VALID_STATUSES = {"lead", "active", "vip", "renewal", "inactive"}

    for i, row in enumerate(reader, start=2):
        email = _normalize_email(row.get("email") or "")
        if not email or "@" not in email:
            errors.append(f"Satır {i}: Geçersiz e-posta '{row.get('email', '')}'")
            skipped += 1
            continue
        canonical = await _canonical_email(db, org.id, email)
        profile_res = await db.execute(
            select(ParticipantCrmProfile).where(
                ParticipantCrmProfile.organization_id == org.id,
                ParticipantCrmProfile.email == canonical,
            )
        )
        profile = profile_res.scalar_one_or_none()
        is_new = profile is None
        if not profile:
            profile = ParticipantCrmProfile(organization_id=org.id, email=canonical, notes="", tags=[], lifecycle_status="lead")
            db.add(profile)
        before = None if is_new else _profile_state(profile)

        tags_raw = row.get("tags", "")
        if tags_raw.strip():
            profile.tags = _clean_tags([t.strip() for t in tags_raw.split(",")])

        status_raw = (row.get("lifecycle_status") or "").strip().lower()
        if status_raw and status_raw in VALID_STATUSES:
            profile.lifecycle_status = status_raw

        priority_raw = (row.get("priority") or "").strip().lower()
        if priority_raw and priority_raw in VALID_PRIORITIES:
            profile.priority = priority_raw

        score_raw = row.get("lead_score", "").strip()
        if score_raw:
            try:
                score = int(score_raw)
                if 0 <= score <= 100:
                    profile.lead_score = score
            except ValueError:
                pass

        notes_raw = (row.get("notes") or "").strip()
        if notes_raw:
            profile.notes = notes_raw[:5000]

        profile.updated_at = datetime.now(timezone.utc)
        after = _profile_state(profile)
        if before != after or is_new:
            db.add(ParticipantCrmAuditLog(
                organization_id=org.id,
                email=canonical,
                actor_user_id=me.id,
                action="profile.csv_imported",
                before=before,
                after=after,
            ))
            if is_new:
                created += 1
            else:
                updated += 1
        else:
            skipped += 1

    await db.commit()
    return CrmImportOut(created=created, updated=updated, skipped=skipped, errors=errors[:50])


# ── CRM → Automation bridge ──────────────────────────────────────────────────

class CrmLeadScoreFilterOut(BaseModel):
    emails: list[str]
    count: int


@router.get(
    "/api/admin/crm/filter-by-score",
    response_model=CrmLeadScoreFilterOut,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def filter_crm_by_lead_score(
    request: Request,
    min_score: int = Query(default=0, ge=0, le=100),
    max_score: int = Query(default=100, ge=0, le=100),
    lifecycle_status: str = Query(default=""),
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return emails matching CRM lead score range — used by automation rules."""
    org = await _admin_org(db, me, request)
    stmt = select(ParticipantCrmProfile.email).where(
        ParticipantCrmProfile.organization_id == org.id,
        ParticipantCrmProfile.lead_score >= min_score,
        ParticipantCrmProfile.lead_score <= max_score,
    )
    if lifecycle_status.strip():
        stmt = stmt.where(ParticipantCrmProfile.lifecycle_status == lifecycle_status.strip())
    emails = (await db.execute(stmt)).scalars().all()
    return CrmLeadScoreFilterOut(emails=list(emails), count=len(emails))
