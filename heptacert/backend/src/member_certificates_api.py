"""Public member certificate wallet helpers and privacy endpoints."""

import hashlib
from datetime import datetime, timezone
from typing import Any, Literal, Optional

from fastapi import APIRouter, Depends, Query, Request
from pydantic import BaseModel
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from .main import (
    Attendee,
    Certificate,
    CurrentPublicMember,
    Event,
    CertificateShareCache,
    MemberCertificatePreference,
    PublicMember,
    WalletAnalyticsEvent,
    WalletPrivacyAuditLog,
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


class WalletAnalyticsOut(BaseModel):
    profile_views: int = 0
    certificate_views: int = 0
    linkedin_clicks: int = 0
    cv_export_clicks: int = 0


class WalletPrivacyAuditOut(BaseModel):
    id: int
    action: str
    before: Optional[dict[str, Any]] = None
    after: Optional[dict[str, Any]] = None
    created_at: datetime


async def record_wallet_analytics(
    db: AsyncSession,
    *,
    event_type: str,
    public_member_id: Optional[int] = None,
    certificate_id: Optional[int] = None,
    request: Optional[Request] = None,
    source: str = "public",
    metadata: Optional[dict[str, Any]] = None,
) -> None:
    db.add(
        WalletAnalyticsEvent(
            public_member_id=public_member_id,
            certificate_id=certificate_id,
            event_type=event_type[:48],
            source=source[:48],
            ip_address=request.client.host if request and request.client else None,
            user_agent=request.headers.get("user-agent") if request else None,
            metadata_json=metadata or {},
        )
    )


def _privacy_key(member_public_id: str) -> str:
    return f"member_privacy:{member_public_id}"


async def get_member_certificate_privacy(db: AsyncSession, member_public_id: str) -> CertificatePrivacyOut:
    row_res = await db.execute(
        select(MemberCertificatePreference)
        .join(PublicMember, PublicMember.id == MemberCertificatePreference.public_member_id)
        .where(PublicMember.public_id == member_public_id)
    )
    row = row_res.scalar_one_or_none()
    if not row:
        return CertificatePrivacyOut()
    raw_visibility = str(row.certificate_visibility or "").strip()
    if raw_visibility not in {"public", "connections_only", "private"}:
        raw_visibility = "public"
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
    if visibility not in {"public", "connections_only", "private"}:
        visibility = "private" if hide_certificates else "public"
    member_res = await db.execute(select(PublicMember).where(PublicMember.public_id == member_public_id))
    member = member_res.scalar_one_or_none()
    if not member:
        return CertificatePrivacyOut(hide_certificates=False, visibility="public")
    row_res = await db.execute(select(MemberCertificatePreference).where(MemberCertificatePreference.public_member_id == member.id))
    row = row_res.scalar_one_or_none()
    before = {"visibility": row.certificate_visibility} if row else {"visibility": "public"}
    if row:
        row.certificate_visibility = visibility
    else:
        db.add(MemberCertificatePreference(public_member_id=member.id, certificate_visibility=visibility))
    db.add(
        WalletPrivacyAuditLog(
            public_member_id=member.id,
            actor_public_member_id=member.id,
            action="certificate_privacy.update",
            before=before,
            after={"visibility": visibility},
        )
    )

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


@router.post("/api/public/members/me/wallet-analytics")
async def track_my_wallet_analytics(
    request: Request,
    event_type: str = Query(pattern="^(profile_view|certificate_view|linkedin_click|cv_export_click)$"),
    certificate_uuid: str = Query(default=""),
    member: CurrentPublicMember = Depends(get_current_public_member),
    db: AsyncSession = Depends(get_db),
):
    cert_id = None
    if certificate_uuid:
        cert = (await db.execute(select(Certificate).where(Certificate.uuid == certificate_uuid))).scalar_one_or_none()
        cert_id = cert.id if cert else None
    await record_wallet_analytics(db, event_type=event_type, public_member_id=member.id, certificate_id=cert_id, request=request, source="member")
    await db.commit()
    return {"ok": True}


@router.get("/api/public/members/me/wallet-analytics", response_model=WalletAnalyticsOut)
async def get_my_wallet_analytics(
    member: CurrentPublicMember = Depends(get_current_public_member),
    db: AsyncSession = Depends(get_db),
):
    rows = (
        await db.execute(
            select(WalletAnalyticsEvent.event_type, func.count(WalletAnalyticsEvent.id))
            .where(WalletAnalyticsEvent.public_member_id == member.id)
            .group_by(WalletAnalyticsEvent.event_type)
        )
    ).all()
    counts = {event_type: int(count or 0) for event_type, count in rows}
    return WalletAnalyticsOut(
        profile_views=counts.get("profile_view", 0),
        certificate_views=counts.get("certificate_view", 0),
        linkedin_clicks=counts.get("linkedin_click", 0),
        cv_export_clicks=counts.get("cv_export_click", 0),
    )


@router.get("/api/public/members/me/certificate-privacy/audit", response_model=list[WalletPrivacyAuditOut])
async def list_my_certificate_privacy_audit(
    member: CurrentPublicMember = Depends(get_current_public_member),
    db: AsyncSession = Depends(get_db),
):
    rows = (
        await db.execute(
            select(WalletPrivacyAuditLog)
            .where(WalletPrivacyAuditLog.public_member_id == member.id)
            .order_by(WalletPrivacyAuditLog.created_at.desc())
            .limit(50)
        )
    ).scalars().all()
    return [WalletPrivacyAuditOut(id=row.id, action=row.action, before=row.before, after=row.after, created_at=row.created_at) for row in rows]


@router.post("/api/public/certificates/{certificate_uuid}/share-cache")
async def ensure_certificate_share_cache(
    certificate_uuid: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    cert = (await db.execute(select(Certificate).where(Certificate.uuid == certificate_uuid, Certificate.deleted_at.is_(None)))).scalar_one_or_none()
    if not cert:
        return {"ok": False, "reason": "not_found"}
    version_source = f"{cert.uuid}:{cert.student_name}:{cert.status}:{cert.issued_at}:{cert.pdf_url}:{cert.png_url}"
    version_hash = hashlib.sha256(version_source.encode("utf-8")).hexdigest()
    cache_key = f"share:{cert.id}:{version_hash[:32]}"
    row = (await db.execute(select(CertificateShareCache).where(CertificateShareCache.cache_key == cache_key))).scalar_one_or_none()
    if not row:
        row = CertificateShareCache(certificate_id=cert.id, cache_key=cache_key, version_hash=version_hash, image_path=None)
        db.add(row)
    await record_wallet_analytics(db, event_type="certificate_view", certificate_id=cert.id, request=request, source="share-cache")
    await db.commit()
    return {"ok": True, "cache_key": cache_key, "image_path": row.image_path, "invalidated": bool(row.invalidated_at)}


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
