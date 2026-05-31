"""Event audience segmentation helpers and endpoints."""

from __future__ import annotations

import csv
import io
from datetime import datetime
from typing import Any, Optional

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .main import (
    Attendee,
    AttendaonceRecord,
    Certificate,
    CertStatus,
    CurrentUser,
    Event,
    EventTicket,
    Role,
    SurveyResponse,
    _get_event_for_admin,
    get_current_user,
    get_db,
    require_role,
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

DYNAMIC_SEGMENT_KEYS = {"registration_answer", "location_filter"}


class AudienceSegmentOut(BaseModel):
    key: str
    label: str
    description: str
    count: int
    dynamic: bool = False


class AudienceSegmentPreviewOut(BaseModel):
    segment: AudienceSegmentOut
    attendees: list[dict[str, Any]]


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


async def get_segment_attendees(
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
) -> int:
    return len(await get_segment_attendees(db, event, segment, field_id=field_id, answer=answer, location=location))


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


@router.get(
    "/api/admin/events/{event_id}/segments",
    response_model=list[AudienceSegmentOut],
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
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
    items: list[AudienceSegmentOut] = []
    for key, meta in STANDARD_SEGMENTS.items():
        items.append(
            AudienceSegmentOut(
                key=key,
                label=meta["label"],
                description=meta["description"],
                count=await count_segment_attendees(db, event, key),
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
    return items


@router.get(
    "/api/admin/events/{event_id}/segments/{segment_key}",
    response_model=AudienceSegmentPreviewOut,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def preview_event_segment(
    event_id: int,
    segment_key: str,
    field_id: Optional[str] = Query(default=None),
    answer: Optional[str] = Query(default=None),
    location: Optional[str] = Query(default=None),
    limit: int = Query(default=25, ge=1, le=100),
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    event = await _get_event_for_admin(event_id, me, db, "attendees:read")
    attendees = await get_segment_attendees(db, event, segment_key, field_id=field_id, answer=answer, location=location)
    meta = STANDARD_SEGMENTS.get(segment_key, {
        "label": "Dinamik segment",
        "description": "Kayıt cevabı veya lokasyon filtresi.",
    })
    return AudienceSegmentPreviewOut(
        segment=AudienceSegmentOut(
            key=segment_key,
            label=meta["label"],
            description=meta["description"],
            count=len(attendees),
            dynamic=segment_key in DYNAMIC_SEGMENT_KEYS,
        ),
        attendees=[_attendee_payload(attendee) for attendee in attendees[:limit]],
    )


@router.get(
    "/api/admin/events/{event_id}/segments/{segment_key}/export",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def export_event_segment(
    event_id: int,
    segment_key: str,
    field_id: Optional[str] = Query(default=None),
    answer: Optional[str] = Query(default=None),
    location: Optional[str] = Query(default=None),
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    event = await _get_event_for_admin(event_id, me, db, "attendees:read")
    attendees = await get_segment_attendees(db, event, segment_key, field_id=field_id, answer=answer, location=location)
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["id", "name", "email", "registered_at", "email_verified", "survey_completed"])
    for attendee in attendees:
        writer.writerow([
            attendee.id,
            attendee.name,
            attendee.email,
            attendee.registered_at.isoformat() if isinstance(attendee.registered_at, datetime) else "",
            "yes" if attendee.email_verified else "no",
            "yes" if attendee.survey_completed_at else "no",
        ])
    output.seek(0)
    filename = f"event-{event_id}-{segment_key}-segment.csv"
    return StreamingResponse(
        iter([output.getvalue().encode("utf-8-sig")]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
