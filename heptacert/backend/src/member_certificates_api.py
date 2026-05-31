"""Public member certificate wallet helpers and privacy endpoints."""

from datetime import datetime
from typing import Any, Literal, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from .main import (
    Attendee,
    Certificate,
    CurrentPublicMember,
    Event,
    PublicMember,
    SystemConfig,
    build_certificate_verify_url,
    get_current_public_member,
    get_db,
)

router = APIRouter()


class CertificatePrivacyIn(BaseModel):
    hide_certificates: Optional[bool] = None
    visibility: Optional[Literal["public", "connections_only", "private"]] = None


class CertificatePrivacyOut(BaseModel):
    hide_certificates: bool = False
    visibility: Literal["public", "connections_only", "private"] = "public"


def _privacy_key(member_public_id: str) -> str:
    return f"member_privacy:{member_public_id}"


async def get_member_certificate_privacy(db: AsyncSession, member_public_id: str) -> CertificatePrivacyOut:
    row_res = await db.execute(select(SystemConfig).where(SystemConfig.key == _privacy_key(member_public_id)))
    row = row_res.scalar_one_or_none()
    if not row or not isinstance(row.value, dict):
        return CertificatePrivacyOut()
    raw_visibility = str(row.value.get("certificate_visibility") or "").strip()
    if raw_visibility not in {"public", "connections_only", "private"}:
        raw_visibility = "private" if bool(row.value.get("hide_certificates", False)) else "public"
    return CertificatePrivacyOut(
        hide_certificates=raw_visibility == "private",
        visibility=raw_visibility,
    )


async def update_member_certificate_privacy(
    db: AsyncSession,
    member_public_id: str,
    hide_certificates: Optional[bool] = None,
    visibility: Optional[str] = None,
) -> CertificatePrivacyOut:
    key = _privacy_key(member_public_id)
    row_res = await db.execute(select(SystemConfig).where(SystemConfig.key == key))
    row = row_res.scalar_one_or_none()
    value = dict(row.value or {}) if row and isinstance(row.value, dict) else {}
    if visibility not in {"public", "connections_only", "private"}:
        visibility = "private" if hide_certificates else "public"
    value["certificate_visibility"] = visibility
    value["hide_certificates"] = visibility == "private"

    if row:
        row.value = value
    else:
        db.add(SystemConfig(key=key, value=value))

    await db.commit()
    return CertificatePrivacyOut(hide_certificates=visibility == "private", visibility=visibility)


async def can_view_member_certificate_wallet(
    db: AsyncSession,
    target: PublicMember,
    viewer: Optional[CurrentPublicMember],
) -> bool:
    privacy = await get_member_certificate_privacy(db, target.public_id)
    if privacy.visibility == "public":
        return True
    if viewer and viewer.public_id == target.public_id:
        return True
    if privacy.visibility == "private" or not viewer:
        return False

    from .connections_api import PublicMemberConnection

    connection_res = await db.execute(
        select(PublicMemberConnection.id).where(
            PublicMemberConnection.follower_id == viewer.id,
            PublicMemberConnection.following_id == target.id,
        )
    )
    return connection_res.scalar_one_or_none() is not None


async def list_public_member_certificates(db: AsyncSession, member_id: int) -> list[dict[str, Any]]:
    certificates_res = await db.execute(
        select(Certificate, Event)
        .join(Event, Certificate.event_id == Event.id)
        .join(
            Attendee,
            and_(
                Attendee.event_id == Certificate.event_id,
                Attendee.public_member_id == member_id,
                func.lower(Attendee.name) == func.lower(Certificate.student_name),
            ),
        )
        .where(Certificate.deleted_at.is_(None))
        .order_by(Certificate.issued_at.desc().nullslast(), Certificate.created_at.desc())
        .limit(24)
    )

    items: list[dict[str, Any]] = []
    for cert, event in certificates_res.all():
        event_date: Optional[str] = None
        raw_event_date = getattr(event, "event_date", None)
        if raw_event_date is not None:
            event_date = raw_event_date.isoformat() if hasattr(raw_event_date, "isoformat") else str(raw_event_date)

        issued_at = getattr(cert, "issued_at", None)
        items.append(
            {
                "uuid": cert.uuid,
                "public_id": cert.public_id,
                "student_name": cert.student_name,
                "event_id": event.id,
                "event_name": event.name,
                "event_date": event_date,
                "status": cert.status.value if hasattr(cert.status, "value") else str(cert.status),
                "issued_at": issued_at if isinstance(issued_at, datetime) else None,
                "verify_url": build_certificate_verify_url(cert.uuid),
            }
        )
    return items


@router.get("/api/public/members/me/certificate-privacy", response_model=CertificatePrivacyOut)
async def get_my_certificate_privacy(
    member: CurrentPublicMember = Depends(get_current_public_member),
    db: AsyncSession = Depends(get_db),
):
    return await get_member_certificate_privacy(db, member.public_id)


@router.patch("/api/public/members/me/certificate-privacy", response_model=CertificatePrivacyOut)
async def update_my_certificate_privacy(
    data: CertificatePrivacyIn,
    member: CurrentPublicMember = Depends(get_current_public_member),
    db: AsyncSession = Depends(get_db),
):
    member_res = await db.execute(select(PublicMember).where(PublicMember.id == member.id))
    db_member = member_res.scalar_one_or_none()
    public_id = db_member.public_id if db_member else member.public_id
    return await update_member_certificate_privacy(db, public_id, data.hide_certificates, data.visibility)
