from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel, ConfigDict, Field, model_validator
from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Mapped, mapped_column

from .main import Base, CurrentUser, Role, get_current_user, get_db, require_role, write_audit_log
from .organization_access_api import get_organization_for_access
from .venues_api import OrganizationVenue


router = APIRouter()


class VenueReservation(Base):
    __tablename__ = "venue_reservations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    organization_id: Mapped[int] = mapped_column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), index=True)
    venue_id: Mapped[int] = mapped_column(Integer, ForeignKey("organization_venues.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    start_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    end_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    status: Mapped[str] = mapped_column(String(20), default="confirmed", index=True)
    calendar_provider: Mapped[str] = mapped_column(String(32), default="local")
    external_event_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    created_by: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    updated_by: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class ReservationIn(BaseModel):
    venue_id: int
    title: str = Field(min_length=2, max_length=200)
    description: Optional[str] = Field(default=None, max_length=2000)
    start_at: datetime
    end_at: datetime

    @model_validator(mode="after")
    def validate_time_window(self):
        if self.end_at <= self.start_at:
            raise ValueError("Reservation end must be after its start")
        self.title = self.title.strip()
        self.description = self.description.strip() if self.description and self.description.strip() else None
        return self


class ReservationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    venue_id: int
    title: str
    description: Optional[str]
    start_at: datetime
    end_at: datetime
    status: str
    calendar_provider: str
    external_event_id: Optional[str]
    created_at: datetime
    updated_at: datetime


async def _venue_for_organization(db: AsyncSession, organization_id: int, venue_id: int) -> OrganizationVenue:
    result = await db.execute(
        select(OrganizationVenue).where(
            OrganizationVenue.id == venue_id,
            OrganizationVenue.organization_id == organization_id,
            OrganizationVenue.is_active.is_(True),
        )
    )
    venue = result.scalar_one_or_none()
    if not venue:
        raise HTTPException(status_code=404, detail="Active venue not found")
    return venue


async def _reservation_for_organization(db: AsyncSession, organization_id: int, reservation_id: int) -> VenueReservation:
    result = await db.execute(
        select(VenueReservation).where(
            VenueReservation.id == reservation_id,
            VenueReservation.organization_id == organization_id,
        )
    )
    reservation = result.scalar_one_or_none()
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")
    return reservation


async def _ensure_no_conflict(
    db: AsyncSession,
    organization_id: int,
    payload: ReservationIn,
    exclude_id: Optional[int] = None,
) -> None:
    query = select(VenueReservation.id).where(
        VenueReservation.organization_id == organization_id,
        VenueReservation.venue_id == payload.venue_id,
        VenueReservation.status == "confirmed",
        VenueReservation.start_at < payload.end_at,
        VenueReservation.end_at > payload.start_at,
    )
    if exclude_id is not None:
        query = query.where(VenueReservation.id != exclude_id)
    if (await db.execute(query)).scalar_one_or_none() is not None:
        raise HTTPException(status_code=409, detail="This venue is already reserved during the selected time")


@router.get(
    "/api/admin/organization/venue-reservations",
    response_model=list[ReservationOut],
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def list_reservations(
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    organization = await get_organization_for_access(db, me, "reservations:read")
    result = await db.execute(
        select(VenueReservation)
        .where(
            VenueReservation.organization_id == organization.id,
            VenueReservation.status == "confirmed",
        )
        .order_by(VenueReservation.start_at.asc())
    )
    return list(result.scalars().all())


@router.post(
    "/api/admin/organization/venue-reservations",
    response_model=ReservationOut,
    status_code=201,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def create_reservation(
    payload: ReservationIn,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    organization = await get_organization_for_access(db, me, "reservations:write")
    await _venue_for_organization(db, organization.id, payload.venue_id)
    await _ensure_no_conflict(db, organization.id, payload)
    reservation = VenueReservation(
        organization_id=organization.id,
        created_by=me.id,
        **payload.model_dump(),
    )
    db.add(reservation)
    await db.flush()
    await write_audit_log(
        db,
        user_id=me.id,
        action="organization.reservation.create",
        resource_type="venue_reservation",
        resource_id=str(reservation.id),
        extra={"organization_id": organization.id, "venue_id": reservation.venue_id},
    )
    await db.commit()
    await db.refresh(reservation)
    return reservation


@router.patch(
    "/api/admin/organization/venue-reservations/{reservation_id}",
    response_model=ReservationOut,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def update_reservation(
    reservation_id: int,
    payload: ReservationIn,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    organization = await get_organization_for_access(db, me, "reservations:write")
    reservation = await _reservation_for_organization(db, organization.id, reservation_id)
    await _venue_for_organization(db, organization.id, payload.venue_id)
    await _ensure_no_conflict(db, organization.id, payload, exclude_id=reservation.id)
    for key, value in payload.model_dump().items():
        setattr(reservation, key, value)
    reservation.updated_by = me.id
    await write_audit_log(
        db,
        user_id=me.id,
        action="organization.reservation.update",
        resource_type="venue_reservation",
        resource_id=str(reservation.id),
        extra={"organization_id": organization.id},
    )
    await db.commit()
    await db.refresh(reservation)
    return reservation


@router.delete(
    "/api/admin/organization/venue-reservations/{reservation_id}",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def cancel_reservation(
    reservation_id: int,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    organization = await get_organization_for_access(db, me, "reservations:write")
    reservation = await _reservation_for_organization(db, organization.id, reservation_id)
    reservation.status = "cancelled"
    reservation.updated_by = me.id
    await write_audit_log(
        db,
        user_id=me.id,
        action="organization.reservation.cancel",
        resource_type="venue_reservation",
        resource_id=str(reservation.id),
        extra={"organization_id": organization.id},
    )
    await db.commit()
    return {"ok": True}


def _escape_ics(value: str) -> str:
    return value.replace("\\", "\\\\").replace(";", "\\;").replace(",", "\\,").replace("\n", "\\n")


def _ics_time(value: datetime) -> str:
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc).strftime("%Y%m%dT%H%M%SZ")


@router.get(
    "/api/admin/organization/venue-reservations/calendar.ics",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def export_reservation_calendar(
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    organization = await get_organization_for_access(db, me, "reservations:read")
    result = await db.execute(
        select(VenueReservation, OrganizationVenue)
        .join(OrganizationVenue, OrganizationVenue.id == VenueReservation.venue_id)
        .where(
            VenueReservation.organization_id == organization.id,
            VenueReservation.status == "confirmed",
        )
        .order_by(VenueReservation.start_at.asc())
    )
    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//HeptaCert//Venue Reservations//TR",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
    ]
    generated_at = _ics_time(datetime.now(timezone.utc))
    for reservation, venue in result.all():
        lines.extend(
            [
                "BEGIN:VEVENT",
                f"UID:venue-reservation-{reservation.id}@heptacert",
                f"DTSTAMP:{generated_at}",
                f"DTSTART:{_ics_time(reservation.start_at)}",
                f"DTEND:{_ics_time(reservation.end_at)}",
                f"SUMMARY:{_escape_ics(reservation.title)}",
                f"LOCATION:{_escape_ics(venue.name + (' - ' + venue.location if venue.location else ''))}",
                f"DESCRIPTION:{_escape_ics(reservation.description or '')}",
                "END:VEVENT",
            ]
        )
    lines.append("END:VCALENDAR")
    return Response(
        content="\r\n".join(lines) + "\r\n",
        media_type="text/calendar",
        headers={"Content-Disposition": 'attachment; filename="venue-reservations.ics"'},
    )
