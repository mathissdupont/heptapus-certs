"""Event audience segmentation helpers and endpoints."""

from __future__ import annotations

import csv
import io
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy import and_, exists, false, func, or_, select, true
from sqlalchemy.ext.asyncio import AsyncSession

from .main import (
    Attendee,
    AttendaonceRecord,
    Certificate,
    CertStatus,
    CurrentUser,
    Event,
    EventAutomationRule,
    EventSavedAudienceSegment,
    EventTicket,
    Organization,
    ParticipantCrmAuditLog,
    ParticipantCrmProfile,
    Role,
    SegmentExportJob,
    SurveyResponse,
    _get_event_for_admin,
    get_current_user,
    get_db,
    require_email_system_access,
    require_role,
    settings,
)

router = APIRouter()

STANDARD_SEGMENTS = {
    "attended_no_certificate": {
        "label": "Katıldı ama sertifika almadı",
        "description": "Check-in veya oturum katılımı var, aktif sertifikası yok.",
    },
    "certificate_holders": {
        "label": "Sertifika sahipleri",
        "description": "Etkinlik için aktif sertifikası olan katılımcılar.",
    },
    "survey_respondents": {
        "label": "Anket dolduranlar",
        "description": "Yerleşik veya harici anket cevabı bulunan katılımcılar.",
    },
    "no_shows": {
        "label": "No-show",
        "description": "Kaydı var ama check-in/oturum katılımı yok.",
    },
    "repeat_attendees": {
        "label": "Tekrar katılanlar",
        "description": "Aynı organizatörün birden fazla etkinliğinde görünen e-postalar.",
    },
}

DYNAMIC_SEGMENT_KEYS = {"registration_answer", "location_filter", "composition"}


class AudienceSegmentOut(BaseModel):
    key: str
    label: str
    description: str
    count: int
    dynamic: bool = False


class AudienceSegmentPreviewOut(BaseModel):
    segment: AudienceSegmentOut
    attendees: list[dict[str, Any]]


class SavedAudienceSegmentIn(BaseModel):
    name: str
    segment_key: str
    filters: dict[str, Any] = {}
    visibility: str = "private"


class SavedAudienceSegmentOut(BaseModel):
    id: int
    name: str
    segment_key: str
    filters: dict[str, Any]
    visibility: str
    last_count: int
    last_computed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime


class SegmentExportJobIn(BaseModel):
    segment_key: str
    filters: dict[str, Any] = {}
    sync_google_sheets: bool = False
    pii_mode: str = Field(default="masked", pattern="^(masked|full)$")


class SegmentExportJobOut(BaseModel):
    id: int
    event_id: int
    segment_key: str
    filters: dict[str, Any]
    status: str
    row_count: int
    file_name: Optional[str] = None
    sync_google_sheets: bool = False
    google_spreadsheet_url: Optional[str] = None
    google_sheet_name: Optional[str] = None
    error_message: Optional[str] = None
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    pii_mode: str = "masked"


class SegmentCrmHandoffIn(BaseModel):
    add_tags: list[str] = Field(default_factory=lambda: ["segment"])
    lifecycle_status: Optional[str] = Field(default=None, max_length=64)
    priority: Optional[str] = Field(default=None, max_length=32)


class SegmentCrmHandoffOut(BaseModel):
    updated: int
    skipped: int


class SegmentAutomationHandoffIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email_template_id: Optional[int] = Field(default=None, ge=1)
    enabled: bool = True


class SegmentAutomationHandoffOut(BaseModel):
    rule_id: str
    target_count: int


def _parse_composition(raw: Optional[str]) -> Optional[dict[str, Any]]:
    if not raw:
        return None
    try:
        value = json.loads(raw)
    except Exception:
        return None
    return value if isinstance(value, dict) else None


def _attendee_key(attendee: Attendee) -> str:
    email = (attendee.email or "").strip().lower()
    return email or f"id:{attendee.id}"


def _certified_name_set(certificates: list[Certificate]) -> set[str]:
    return {
        (cert.student_name or "").strip().lower()
        for cert in certificates
        if (cert.student_name or "").strip()
    }


def _attended_id_set(records: list[AttendaonceRecord], tickets: list[EventTicket]) -> set[int]:
    ids = {record.attendee_id for record in records if record.attendee_id}
    ids.update(ticket.attendee_id for ticket in tickets if ticket.checked_in_at is not None)
    return ids


def _survey_respondent_id_set(attendees: list[Attendee], responses: list[SurveyResponse]) -> set[int]:
    ids = {attendee.id for attendee in attendees if attendee.survey_completed_at is not None}
    ids.update(response.attendee_id for response in responses if response.attendee_id)
    return ids


async def _event_segment_context(db: AsyncSession, event: Event) -> dict[str, Any]:
    attendees_res = await db.execute(select(Attendee).where(Attendee.event_id == event.id))
    attendees = attendees_res.scalars().all()

    records_res = await db.execute(
        select(AttendaonceRecord).join(Attendee, Attendee.id == AttendaonceRecord.attendee_id).where(Attendee.event_id == event.id)
    )
    records = records_res.scalars().all()

    tickets_res = await db.execute(select(EventTicket).where(EventTicket.event_id == event.id))
    tickets = tickets_res.scalars().all()

    cert_res = await db.execute(
        select(Certificate).where(
            Certificate.event_id == event.id,
            Certificate.status == CertStatus.active,
            Certificate.deleted_at.is_(None),
        )
    )
    certificates = cert_res.scalars().all()

    survey_res = await db.execute(select(SurveyResponse).where(SurveyResponse.event_id == event.id))
    responses = survey_res.scalars().all()

    org_events_res = await db.execute(select(Event.id).where(Event.admin_id == event.admin_id))
    org_event_ids = [int(item) for item in org_events_res.scalars().all()]
    repeat_emails: set[str] = set()
    if org_event_ids:
        org_attendees_res = await db.execute(select(Attendee.email, Attendee.event_id).where(Attendee.event_id.in_(org_event_ids)))
        by_email: dict[str, set[int]] = {}
        for email, event_id in org_attendees_res.all():
            normalized = (email or "").strip().lower()
            if normalized:
                by_email.setdefault(normalized, set()).add(int(event_id))
        repeat_emails = {email for email, event_ids in by_email.items() if len(event_ids) > 1}

    return {
        "attendees": attendees,
        "attended_ids": _attended_id_set(records, tickets),
        "certified_names": _certified_name_set(certificates),
        "survey_ids": _survey_respondent_id_set(attendees, responses),
        "repeat_emails": repeat_emails,
    }


def _answer_matches(value: Any, expected: str) -> bool:
    expected = expected.strip().lower()
    if not expected:
        return True
    if isinstance(value, (list, tuple)):
        return any(_answer_matches(item, expected) for item in value)
    return expected in str(value or "").strip().lower()


def _location_value(answers: dict[str, Any]) -> str:
    for key in ("location", "city", "sehir", "şehir", "il", "province"):
        value = answers.get(key)
        if value:
            return str(value)
    haystack = []
    for key, value in answers.items():
        key_lower = str(key).lower()
        if any(token in key_lower for token in ("location", "city", "sehir", "şehir", "il", "province")):
            haystack.append(str(value))
    return " ".join(haystack)


def _segment_conditions(
    event: Event,
    segment: str,
    *,
    field_id: Optional[str] = None,
    answer: Optional[str] = None,
    location: Optional[str] = None,
    composition: Optional[dict[str, Any]] = None,
):
    attended_exists = exists(select(1).where(AttendaonceRecord.attendee_id == Attendee.id))
    ticket_checkin_exists = exists(
        select(1).where(EventTicket.attendee_id == Attendee.id, EventTicket.checked_in_at.is_not(None))
    )
    certificate_exists = exists(
        select(1).where(
            Certificate.event_id == event.id,
            Certificate.status == CertStatus.active,
            Certificate.deleted_at.is_(None),
            func.lower(func.trim(Certificate.student_name)) == func.lower(func.trim(Attendee.name)),
        )
    )
    survey_exists = exists(
        select(1).where(SurveyResponse.event_id == event.id, SurveyResponse.attendee_id == Attendee.id)
    )
    attended_condition = attended_exists | ticket_checkin_exists

    if segment == "composition":
        spec = composition or {}
        operator = str(spec.get("operator") or "AND").upper()
        rules = [item for item in spec.get("rules") or [] if isinstance(item, dict)][:10]
        clauses = [
            _segment_conditions(
                event,
                str(rule.get("segment_key") or ""),
                field_id=(rule.get("filters") or {}).get("field_id"),
                answer=(rule.get("filters") or {}).get("answer"),
                location=(rule.get("filters") or {}).get("location"),
            )
            for rule in rules
        ]
        if not clauses:
            return false()
        return or_(*clauses) if operator == "OR" else and_(*clauses)

    if segment == "attended_no_certificate":
        return attended_condition & ~certificate_exists
    if segment == "certificate_holders":
        return certificate_exists
    if segment == "survey_respondents":
        return Attendee.survey_completed_at.is_not(None) | survey_exists
    if segment == "no_shows":
        return ~attended_condition
    if segment == "repeat_attendees":
        org_events = select(Event.id).where(Event.admin_id == event.admin_id).subquery()
        repeat_emails = (
            select(func.lower(func.trim(Attendee.email)).label("email"))
            .where(Attendee.event_id.in_(select(org_events.c.id)), Attendee.email.is_not(None), func.trim(Attendee.email) != "")
            .group_by(func.lower(func.trim(Attendee.email)))
            .having(func.count(func.distinct(Attendee.event_id)) > 1)
            .subquery()
        )
        return func.lower(func.trim(Attendee.email)).in_(select(repeat_emails.c.email))
    if segment == "registration_answer":
        field = (field_id or "").strip()
        expected = (answer or "").strip()
        if not field:
            return false()
        if not expected:
            return Attendee.registration_answers[field].astext.is_not(None)
        return Attendee.registration_answers[field].astext.ilike(f"%{expected}%")
    if segment == "location_filter":
        expected_location = (location or answer or "").strip()
        if not expected_location:
            return false()
        keys = ("location", "city", "sehir", "şehir", "il", "province")
        return or_(*[Attendee.registration_answers[key].astext.ilike(f"%{expected_location}%") for key in keys])
    return true()


def _segment_stmt(
    event: Event,
    segment: str,
    *,
    field_id: Optional[str] = None,
    answer: Optional[str] = None,
    location: Optional[str] = None,
    composition: Optional[dict[str, Any]] = None,
):
    return (
        select(Attendee)
        .where(
            Attendee.event_id == event.id,
            _segment_conditions(event, segment, field_id=field_id, answer=answer, location=location, composition=composition),
        )
        .order_by(Attendee.registered_at.desc(), Attendee.id.desc())
    )


async def get_segment_attendees(
    db: AsyncSession,
    event: Event,
    segment: str,
    *,
    field_id: Optional[str] = None,
    answer: Optional[str] = None,
    location: Optional[str] = None,
    composition: Optional[dict[str, Any]] = None,
) -> list[Attendee]:
    rows = await db.execute(_segment_stmt(event, segment, field_id=field_id, answer=answer, location=location, composition=composition))
    return rows.scalars().all()


async def get_segment_attendees_legacy(
    db: AsyncSession,
    event: Event,
    segment: str,
    *,
    field_id: Optional[str] = None,
    answer: Optional[str] = None,
    location: Optional[str] = None,
) -> list[Attendee]:
    ctx = await _event_segment_context(db, event)
    attendees: list[Attendee] = ctx["attendees"]
    attended_ids: set[int] = ctx["attended_ids"]
    certified_names: set[str] = ctx["certified_names"]
    survey_ids: set[int] = ctx["survey_ids"]
    repeat_emails: set[str] = ctx["repeat_emails"]

    if segment == "attended_no_certificate":
        return [
            attendee for attendee in attendees
            if attendee.id in attended_ids and (attendee.name or "").strip().lower() not in certified_names
        ]
    if segment == "certificate_holders":
        return [attendee for attendee in attendees if (attendee.name or "").strip().lower() in certified_names]
    if segment == "survey_respondents":
        return [attendee for attendee in attendees if attendee.id in survey_ids]
    if segment == "no_shows":
        return [attendee for attendee in attendees if attendee.id not in attended_ids]
    if segment == "repeat_attendees":
        return [attendee for attendee in attendees if (attendee.email or "").strip().lower() in repeat_emails]
    if segment == "registration_answer":
        field = (field_id or "").strip()
        expected = (answer or "").strip()
        if not field:
            return []
        return [
            attendee for attendee in attendees
            if _answer_matches((attendee.registration_answers or {}).get(field), expected)
        ]
    if segment == "location_filter":
        expected_location = (location or answer or "").strip()
        return [
            attendee for attendee in attendees
            if _answer_matches(_location_value(attendee.registration_answers or {}), expected_location)
        ]
    return attendees


async def count_segment_attendees(
    db: AsyncSession,
    event: Event,
    segment: str,
    *,
    field_id: Optional[str] = None,
    answer: Optional[str] = None,
    location: Optional[str] = None,
    composition: Optional[dict[str, Any]] = None,
) -> int:
    stmt = _segment_stmt(event, segment, field_id=field_id, answer=answer, location=location, composition=composition).order_by(None).subquery()
    res = await db.execute(select(func.count()).select_from(stmt))
    return int(res.scalar_one() or 0)


async def count_standard_segments(db: AsyncSession, event: Event) -> dict[str, int]:
    attended_exists = exists(
        select(1).where(AttendaonceRecord.attendee_id == Attendee.id)
    )
    ticket_checkin_exists = exists(
        select(1).where(EventTicket.attendee_id == Attendee.id, EventTicket.checked_in_at.is_not(None))
    )
    certificate_exists = exists(
        select(1).where(
            Certificate.event_id == event.id,
            Certificate.status == CertStatus.active,
            Certificate.deleted_at.is_(None),
            func.lower(func.trim(Certificate.student_name)) == func.lower(func.trim(Attendee.name)),
        )
    )
    survey_exists = exists(
        select(1).where(
            SurveyResponse.event_id == event.id,
            SurveyResponse.attendee_id == Attendee.id,
        )
    )
    attended_condition = attended_exists | ticket_checkin_exists
    survey_condition = Attendee.survey_completed_at.is_not(None) | survey_exists

    async def _count(where_clause) -> int:
        res = await db.execute(
            select(func.count(func.distinct(Attendee.id))).where(Attendee.event_id == event.id, where_clause)
        )
        return int(res.scalar_one() or 0)

    org_events = select(Event.id).where(Event.admin_id == event.admin_id).subquery()
    repeat_emails = (
        select(func.lower(func.trim(Attendee.email)).label("email"))
        .where(Attendee.event_id.in_(select(org_events.c.id)), Attendee.email.is_not(None), func.trim(Attendee.email) != "")
        .group_by(func.lower(func.trim(Attendee.email)))
        .having(func.count(func.distinct(Attendee.event_id)) > 1)
        .subquery()
    )
    repeat_res = await db.execute(
        select(func.count(func.distinct(Attendee.id))).where(
            Attendee.event_id == event.id,
            func.lower(func.trim(Attendee.email)).in_(select(repeat_emails.c.email)),
        )
    )

    return {
        "attended_no_certificate": await _count(attended_condition & ~certificate_exists),
        "certificate_holders": await _count(certificate_exists),
        "survey_respondents": await _count(survey_condition),
        "no_shows": await _count(~attended_condition),
        "repeat_attendees": int(repeat_res.scalar_one() or 0),
    }


def _attendee_payload(attendee: Attendee) -> dict[str, Any]:
    return {
        "id": attendee.id,
        "name": attendee.name,
        "email": attendee.email,
        "registered_at": attendee.registered_at,
        "email_verified": bool(attendee.email_verified),
        "survey_completed": attendee.survey_completed_at is not None,
        "registration_answers": attendee.registration_answers or {},
    }


def _clean_visibility(value: str) -> str:
    visibility = (value or "private").strip().lower()
    if visibility not in {"private", "event"}:
        return "private"
    return visibility


def _saved_segment_out(row: EventSavedAudienceSegment) -> SavedAudienceSegmentOut:
    return SavedAudienceSegmentOut(
        id=row.id,
        name=row.name,
        segment_key=row.segment_key,
        filters=row.filters or {},
        visibility=row.visibility or "private",
        last_count=int(row.last_count or 0),
        last_computed_at=row.last_computed_at,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


def _export_job_out(row: SegmentExportJob) -> SegmentExportJobOut:
    return SegmentExportJobOut(
        id=row.id,
        event_id=row.event_id,
        segment_key=row.segment_key,
        filters=row.filters or {},
        status=row.status,
        row_count=int(row.row_count or 0),
        file_name=row.file_name,
        sync_google_sheets=bool(row.sync_google_sheets),
        google_spreadsheet_url=row.google_spreadsheet_url,
        google_sheet_name=row.google_sheet_name,
        error_message=row.error_message,
        created_at=row.created_at,
        started_at=row.started_at,
        completed_at=row.completed_at,
        pii_mode=_normalize_pii_mode((row.filters or {}).get("_export_pii_mode")),
    )


def _filters_for_query(filters: dict[str, Any]) -> dict[str, Any]:
    return {
        "field_id": filters.get("field_id"),
        "answer": filters.get("answer"),
        "location": filters.get("location"),
        "composition": filters.get("composition") if isinstance(filters.get("composition"), dict) else None,
    }


async def _segment_rows_for_export(db: AsyncSession, event: Event, segment_key: str, filters: dict[str, Any]) -> list[Attendee]:
    query_filters = _filters_for_query(filters)
    rows = await db.execute(
        _segment_stmt(
            event,
            segment_key,
            field_id=query_filters["field_id"],
            answer=query_filters["answer"],
            location=query_filters["location"],
            composition=query_filters["composition"],
        ).limit(100_000)
    )
    return rows.scalars().all()


async def _organization_for_event(db: AsyncSession, event: Event) -> Organization:
    org_res = await db.execute(select(Organization).where(Organization.user_id == event.admin_id))
    org = org_res.scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    return org


def _normalize_pii_mode(value: Optional[str]) -> str:
    return "full" if value == "full" else "masked"


def _mask_name(value: Optional[str]) -> str:
    text = (value or "").strip()
    if not text:
        return ""
    parts = text.split()
    return " ".join(f"{part[:1]}***" for part in parts)


def _mask_email(value: Optional[str]) -> str:
    text = (value or "").strip()
    if "@" not in text:
        return "***"
    local, domain = text.split("@", 1)
    return f"{local[:2]}***@{domain}"


async def _ensure_full_pii_export_allowed(db: AsyncSession, event: Event, pii_mode: str) -> None:
    if pii_mode != "full":
        return
    from .main import _event_owner_has_enterprise_plan

    if not await _event_owner_has_enterprise_plan(event.id, db):
        raise HTTPException(status_code=403, detail="Full-data segment exports require Enterprise plan.")


def _segment_export_values(attendees: list[Attendee], *, pii_mode: str = "masked") -> list[list[Any]]:
    values: list[list[Any]] = [["id", "name", "email", "registered_at", "email_verified", "survey_completed"]]
    include_full_pii = pii_mode == "full"
    for attendee in attendees:
        values.append(
            [
                attendee.id,
                attendee.name if include_full_pii else _mask_name(attendee.name),
                attendee.email if include_full_pii else _mask_email(attendee.email),
                attendee.registered_at.isoformat() if isinstance(attendee.registered_at, datetime) else "",
                "yes" if attendee.email_verified else "no",
                "yes" if attendee.survey_completed_at else "no",
            ]
        )
    return values


async def _sync_segment_export_to_google_sheet(db: AsyncSession, event: Event, job: SegmentExportJob, values: list[list[Any]]) -> None:
    from .main import _get_google_access_token_for_sheets, _google_json_request, _google_sheets_a1_range

    access_token = await _get_google_access_token_for_sheets(db, event.admin_id)
    title = f"HeptaCert - {event.name} - {job.segment_key} segment"
    sheet_name = "Segment Export"
    created = await _google_json_request(
        access_token,
        "POST",
        "https://sheets.googleapis.com/v4/spreadsheets",
        json_body={
            "properties": {"title": title[:100]},
            "sheets": [{"properties": {"title": sheet_name}}],
        },
    )
    spreadsheet_id = str(created.get("spreadsheetId") or "")
    if not spreadsheet_id:
        raise HTTPException(status_code=502, detail="Google Sheet could not be created")
    spreadsheet_url = str(created.get("spreadsheetUrl") or f"https://docs.google.com/spreadsheets/d/{spreadsheet_id}")
    encoded_range = _google_sheets_a1_range(sheet_name)
    await _google_json_request(
        access_token,
        "PUT",
        f"https://sheets.googleapis.com/v4/spreadsheets/{spreadsheet_id}/values/{encoded_range}?valueInputOption=USER_ENTERED",
        json_body={"majorDimension": "ROWS", "values": values},
    )
    job.google_spreadsheet_id = spreadsheet_id
    job.google_spreadsheet_url = spreadsheet_url
    job.google_sheet_name = sheet_name


@router.get(
    "/api/admin/events/{event_id}/segments",
    response_model=list[AudienceSegmentOut],
    dependencies=[Depends(require_role(Role.admin, Role.superadmin)), Depends(require_email_system_access)],
)
async def list_event_segments(
    event_id: int,
    field_id: Optional[str] = Query(default=None),
    answer: Optional[str] = Query(default=None),
    location: Optional[str] = Query(default=None),
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    event = await _get_event_for_admin(event_id, me, db, "attendees:read")
    standard_counts = await count_standard_segments(db, event)
    items: list[AudienceSegmentOut] = []
    for key, meta in STANDARD_SEGMENTS.items():
        items.append(
            AudienceSegmentOut(
                key=key,
                label=meta["label"],
                description=meta["description"],
                count=standard_counts.get(key, 0),
            )
        )
    if field_id:
        label = f"Kayıt cevabı: {field_id}"
        items.append(
            AudienceSegmentOut(
                key="registration_answer",
                label=label,
                description=f"{field_id} alanında '{answer or ''}' içeren katılımcılar.",
                count=await count_segment_attendees(db, event, "registration_answer", field_id=field_id, answer=answer),
                dynamic=True,
            )
        )
    if location:
        items.append(
            AudienceSegmentOut(
                key="location_filter",
                label=f"Lokasyon: {location}",
                description="Lokasyon/şehir cevabı belirtilen değeri içeren katılımcılar.",
                count=await count_segment_attendees(db, event, "location_filter", location=location),
                dynamic=True,
            )
        )
    items.append(
        AudienceSegmentOut(
            key="composition",
            label="Kural grubu",
            description="AND/OR ile birleştirilen segment kuralları.",
            count=0,
            dynamic=True,
        )
    )
    return items


@router.get(
    "/api/admin/events/{event_id}/segments/saved/list",
    response_model=list[SavedAudienceSegmentOut],
    dependencies=[Depends(require_role(Role.admin, Role.superadmin)), Depends(require_email_system_access)],
)
async def list_saved_event_segments(
    event_id: int,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_event_for_admin(event_id, me, db, "attendees:read")
    rows = (
        await db.execute(
            select(EventSavedAudienceSegment)
            .where(
                EventSavedAudienceSegment.event_id == event_id,
                or_(EventSavedAudienceSegment.visibility == "event", EventSavedAudienceSegment.created_by == me.id),
            )
            .order_by(EventSavedAudienceSegment.updated_at.desc(), EventSavedAudienceSegment.id.desc())
        )
    ).scalars().all()
    return [_saved_segment_out(row) for row in rows]


@router.post(
    "/api/admin/events/{event_id}/segments/saved",
    response_model=SavedAudienceSegmentOut,
    status_code=201,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin)), Depends(require_email_system_access)],
)
async def save_event_segment(
    event_id: int,
    payload: SavedAudienceSegmentIn,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    event = await _get_event_for_admin(event_id, me, db, "attendees:write")
    name = " ".join(payload.name.strip().split())[:120]
    if not name:
        name = STANDARD_SEGMENTS.get(payload.segment_key, {}).get("label") or "Saved segment"
    filters = payload.filters or {}
    composition = filters.get("composition") if isinstance(filters.get("composition"), dict) else None
    last_count = await count_segment_attendees(
        db,
        event,
        payload.segment_key,
        field_id=filters.get("field_id"),
        answer=filters.get("answer"),
        location=filters.get("location"),
        composition=composition,
    )
    row = EventSavedAudienceSegment(
        event_id=event_id,
        created_by=me.id,
        name=name,
        segment_key=payload.segment_key,
        filters=filters,
        visibility=_clean_visibility(payload.visibility),
        last_count=last_count,
        last_computed_at=datetime.utcnow(),
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return _saved_segment_out(row)


@router.delete(
    "/api/admin/events/{event_id}/segments/saved/{segment_id}",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin)), Depends(require_email_system_access)],
)
async def delete_saved_event_segment(
    event_id: int,
    segment_id: int,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_event_for_admin(event_id, me, db, "attendees:write")
    row = await db.get(EventSavedAudienceSegment, segment_id)
    if not row or row.event_id != event_id or (row.visibility != "event" and row.created_by != me.id):
        return {"ok": True}
    await db.delete(row)
    await db.commit()
    return {"ok": True}


@router.post(
    "/api/admin/events/{event_id}/segments/export-jobs",
    response_model=SegmentExportJobOut,
    status_code=201,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin)), Depends(require_email_system_access)],
)
async def create_segment_export_job(
    event_id: int,
    payload: SegmentExportJobIn,
    request: Request,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    event = await _get_event_for_admin(event_id, me, db, "attendees:read")
    from .main import write_audit_log

    pii_mode = _normalize_pii_mode(payload.pii_mode)
    await _ensure_full_pii_export_allowed(db, event, pii_mode)
    export_filters = dict(payload.filters or {})
    export_filters["_export_pii_mode"] = pii_mode
    row = SegmentExportJob(
        event_id=event_id,
        created_by=me.id,
        segment_key=payload.segment_key,
        filters=export_filters,
        sync_google_sheets=bool(payload.sync_google_sheets),
        status="pending",
    )
    db.add(row)
    await db.flush()
    await write_audit_log(
        db,
        user_id=me.id,
        action="segment.export_job.created",
        resource_type="event",
        resource_id=str(event_id),
        extra={
            "job_id": row.id,
            "segment_key": payload.segment_key,
            "filters": export_filters,
            "sync_google_sheets": bool(payload.sync_google_sheets),
            "pii_mode": pii_mode,
        },
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )
    await db.commit()
    await db.refresh(row)
    return _export_job_out(row)


@router.get(
    "/api/admin/events/{event_id}/segments/export-jobs",
    response_model=list[SegmentExportJobOut],
    dependencies=[Depends(require_role(Role.admin, Role.superadmin)), Depends(require_email_system_access)],
)
async def list_segment_export_jobs(
    event_id: int,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_event_for_admin(event_id, me, db, "attendees:read")
    rows = (
        await db.execute(
            select(SegmentExportJob)
            .where(SegmentExportJob.event_id == event_id, SegmentExportJob.created_by == me.id)
            .order_by(SegmentExportJob.created_at.desc(), SegmentExportJob.id.desc())
            .limit(25)
        )
    ).scalars().all()
    return [_export_job_out(row) for row in rows]


@router.get(
    "/api/admin/events/{event_id}/segments/export-jobs/{job_id}/download",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin)), Depends(require_email_system_access)],
)
async def download_segment_export_job(
    event_id: int,
    job_id: int,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_event_for_admin(event_id, me, db, "attendees:read")
    row = await db.get(SegmentExportJob, job_id)
    if not row or row.event_id != event_id or row.created_by != me.id:
        raise HTTPException(status_code=404, detail="Export job not found")
    if row.status != "completed" or not row.file_path:
        raise HTTPException(status_code=409, detail="Export job is not completed")
    path = Path(settings.local_storage_dir) / row.file_path
    if not path.exists():
        raise HTTPException(status_code=404, detail="Export file not found")
    return FileResponse(path, media_type="text/csv", filename=row.file_name or f"segment-export-{row.id}.csv")


@router.post(
    "/api/admin/events/{event_id}/segments/{segment_key}/handoff/crm",
    response_model=SegmentCrmHandoffOut,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin)), Depends(require_email_system_access)],
)
async def handoff_segment_to_crm(
    event_id: int,
    segment_key: str,
    payload: SegmentCrmHandoffIn,
    field_id: Optional[str] = Query(default=None),
    answer: Optional[str] = Query(default=None),
    location: Optional[str] = Query(default=None),
    composition: Optional[str] = Query(default=None),
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    event = await _get_event_for_admin(event_id, me, db, "attendees:read")
    org = await _organization_for_event(db, event)
    composition_spec = _parse_composition(composition)
    attendees = (
        await db.execute(
            _segment_stmt(event, segment_key, field_id=field_id, answer=answer, location=location, composition=composition_spec)
            .limit(1000)
        )
    ).scalars().all()
    tags = [tag.strip() for tag in payload.add_tags if tag.strip()]
    updated = skipped = 0
    for attendee in attendees:
        email = (attendee.email or "").strip().lower()
        if not email:
            skipped += 1
            continue
        profile_res = await db.execute(
            select(ParticipantCrmProfile).where(ParticipantCrmProfile.organization_id == org.id, ParticipantCrmProfile.email == email)
        )
        profile = profile_res.scalar_one_or_none()
        before = None
        if not profile:
            profile = ParticipantCrmProfile(organization_id=org.id, email=email, notes="", tags=[], lifecycle_status="lead")
            db.add(profile)
        else:
            before = {
                "tags": profile.tags or [],
                "lifecycle_status": profile.lifecycle_status,
                "priority": profile.priority,
            }
        current_tags = {str(item).strip() for item in profile.tags or [] if str(item).strip()}
        current_tags.update(tags)
        current_tags.add(f"segment:{segment_key}")
        profile.tags = sorted(current_tags)
        if payload.lifecycle_status:
            profile.lifecycle_status = payload.lifecycle_status
        if payload.priority:
            profile.priority = payload.priority
        profile.custom_fields = {
            **(profile.custom_fields or {}),
            "last_segment_handoff": {
                "event_id": event_id,
                "segment_key": segment_key,
                "filters": {"field_id": field_id, "answer": answer, "location": location, "composition": composition_spec},
                "at": datetime.now(timezone.utc).isoformat(),
            },
        }
        db.add(
            ParticipantCrmAuditLog(
                organization_id=org.id,
                email=email,
                actor_user_id=me.id,
                action="segment_handoff",
                before=before,
                after={"tags": profile.tags, "lifecycle_status": profile.lifecycle_status, "priority": profile.priority},
            )
        )
        updated += 1
    await db.commit()
    return SegmentCrmHandoffOut(updated=updated, skipped=skipped)


@router.post(
    "/api/admin/events/{event_id}/segments/{segment_key}/handoff/automation",
    response_model=SegmentAutomationHandoffOut,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin)), Depends(require_email_system_access)],
)
async def handoff_segment_to_automation(
    event_id: int,
    segment_key: str,
    payload: SegmentAutomationHandoffIn,
    field_id: Optional[str] = Query(default=None),
    answer: Optional[str] = Query(default=None),
    location: Optional[str] = Query(default=None),
    composition: Optional[str] = Query(default=None),
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    event = await _get_event_for_admin(event_id, me, db, "email:write")
    composition_spec = _parse_composition(composition)
    target_count = await count_segment_attendees(db, event, segment_key, field_id=field_id, answer=answer, location=location, composition=composition_spec)
    actions: list[dict[str, Any]] = [{"type": "create_reminder", "reminder_delay_hours": 0}]
    if payload.email_template_id:
        actions = [{"type": "send_email", "email_template_id": payload.email_template_id, "reminder_delay_hours": 0}]
    rule = EventAutomationRule(
        id=uuid4().hex,
        event_id=event_id,
        name=payload.name.strip(),
        trigger="audience_segment",
        trigger_config={
            "segment_key": segment_key,
            "filters": {"field_id": field_id, "answer": answer, "location": location, "composition": composition_spec},
        },
        enabled=payload.enabled,
        actions=actions,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(rule)
    await db.commit()
    return SegmentAutomationHandoffOut(rule_id=rule.id, target_count=target_count)


@router.get(
    "/api/admin/events/{event_id}/segments/{segment_key}",
    response_model=AudienceSegmentPreviewOut,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin)), Depends(require_email_system_access)],
)
async def preview_event_segment(
    event_id: int,
    segment_key: str,
    field_id: Optional[str] = Query(default=None),
    answer: Optional[str] = Query(default=None),
    location: Optional[str] = Query(default=None),
    composition: Optional[str] = Query(default=None),
    limit: int = Query(default=25, ge=1, le=100),
    offset: int = Query(default=0, ge=0, le=10000),
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    event = await _get_event_for_admin(event_id, me, db, "attendees:read")
    composition_spec = _parse_composition(composition)
    count = await count_segment_attendees(db, event, segment_key, field_id=field_id, answer=answer, location=location, composition=composition_spec)
    rows = await db.execute(
        _segment_stmt(event, segment_key, field_id=field_id, answer=answer, location=location, composition=composition_spec)
        .offset(offset)
        .limit(limit)
    )
    attendees = rows.scalars().all()
    meta = STANDARD_SEGMENTS.get(segment_key, {
        "label": "Dinamik segment",
        "description": "Kayıt cevabı veya lokasyon filtresi.",
    })
    return AudienceSegmentPreviewOut(
        segment=AudienceSegmentOut(
            key=segment_key,
            label=meta["label"],
            description=meta["description"],
            count=count,
            dynamic=segment_key in DYNAMIC_SEGMENT_KEYS,
        ),
        attendees=[_attendee_payload(attendee) for attendee in attendees],
    )


@router.get(
    "/api/admin/events/{event_id}/segments/{segment_key}/export",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin)), Depends(require_email_system_access)],
)
async def export_event_segment(
    event_id: int,
    segment_key: str,
    request: Request,
    field_id: Optional[str] = Query(default=None),
    answer: Optional[str] = Query(default=None),
    location: Optional[str] = Query(default=None),
    composition: Optional[str] = Query(default=None),
    pii_mode: str = Query(default="masked", pattern="^(masked|full)$"),
    limit: int = Query(default=5000, ge=1, le=10000),
    offset: int = Query(default=0, ge=0, le=100000),
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from .main import write_audit_log

    event = await _get_event_for_admin(event_id, me, db, "attendees:read")
    pii_mode = _normalize_pii_mode(pii_mode)
    await _ensure_full_pii_export_allowed(db, event, pii_mode)
    composition_spec = _parse_composition(composition)
    rows = await db.execute(
        _segment_stmt(event, segment_key, field_id=field_id, answer=answer, location=location, composition=composition_spec)
        .offset(offset)
        .limit(limit)
    )
    export_rows = rows.scalars().all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerows(_segment_export_values(export_rows, pii_mode=pii_mode))
    output.seek(0)
    filename = f"event-{event_id}-{segment_key}-segment.csv"
    await write_audit_log(
        db,
        user_id=me.id,
        action="segment.export.downloaded",
        resource_type="event",
        resource_id=str(event_id),
        extra={
            "segment_key": segment_key,
            "filters": {
                "field_id": field_id,
                "answer": answer,
                "location": location,
                "composition": composition_spec,
                "limit": limit,
                "offset": offset,
                "pii_mode": pii_mode,
            },
            "row_count": len(export_rows),
        },
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )
    await db.commit()
    return StreamingResponse(
        iter([output.getvalue().encode("utf-8-sig")]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


async def process_segment_export_jobs_once(limit: int = 5) -> dict[str, int]:
    from .main import SessionLocal, write_audit_log

    stats = {"processed": 0, "completed": 0, "failed": 0}
    async with SessionLocal() as db:
        job_rows = (
            await db.execute(
                select(SegmentExportJob)
                .where(SegmentExportJob.status == "pending")
                .order_by(SegmentExportJob.created_at.asc(), SegmentExportJob.id.asc())
                .limit(limit)
                .with_for_update(skip_locked=True)
            )
        ).scalars().all()
        for job in job_rows:
            stats["processed"] += 1
            try:
                event = await db.get(Event, job.event_id)
                if not event:
                    raise RuntimeError("Event not found")
                job.status = "processing"
                job.started_at = datetime.now(timezone.utc)
                job.error_message = None
                await db.commit()

                pii_mode = _normalize_pii_mode((job.filters or {}).get("_export_pii_mode"))
                await _ensure_full_pii_export_allowed(db, event, pii_mode)
                attendees = await _segment_rows_for_export(db, event, job.segment_key, job.filters or {})
                values = _segment_export_values(attendees, pii_mode=pii_mode)
                rel_dir = Path("segment_exports") / f"event_{event.id}"
                file_name = f"segment-{event.id}-{job.segment_key}-{job.id}.csv"
                rel_path = rel_dir / file_name
                abs_path = Path(settings.local_storage_dir) / rel_path
                abs_path.parent.mkdir(parents=True, exist_ok=True)
                output = io.StringIO()
                writer = csv.writer(output)
                writer.writerows(values)
                abs_path.write_bytes(output.getvalue().encode("utf-8-sig"))

                job.row_count = max(0, len(values) - 1)
                job.file_path = str(rel_path).replace("\\", "/")
                job.file_name = file_name
                if job.sync_google_sheets:
                    await _sync_segment_export_to_google_sheet(db, event, job, values)
                job.status = "completed"
                job.completed_at = datetime.now(timezone.utc)
                await write_audit_log(
                    db,
                    user_id=job.created_by,
                    action="segment.export_job.completed",
                    resource_type="event",
                    resource_id=str(event.id),
                    extra={
                        "job_id": job.id,
                        "segment_key": job.segment_key,
                        "filters": job.filters or {},
                        "row_count": job.row_count,
                        "sync_google_sheets": bool(job.sync_google_sheets),
                        "google_spreadsheet_id": job.google_spreadsheet_id,
                        "pii_mode": pii_mode,
                    },
                )
                stats["completed"] += 1
                await db.commit()
            except Exception as exc:
                job.status = "failed"
                job.error_message = str(exc)[:2000]
                job.completed_at = datetime.now(timezone.utc)
                await write_audit_log(
                    db,
                    user_id=job.created_by,
                    action="segment.export_job.failed",
                    resource_type="event",
                    resource_id=str(job.event_id),
                    extra={
                        "job_id": job.id,
                        "segment_key": job.segment_key,
                        "filters": job.filters or {},
                        "sync_google_sheets": bool(job.sync_google_sheets),
                        "error_message": job.error_message,
                    },
                )
                stats["failed"] += 1
                await db.commit()
    return stats
