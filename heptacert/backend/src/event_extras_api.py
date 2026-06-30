"""
Registration form fields + ticket types management.

Endpoints:
  GET  /api/admin/events/{event_id}/registration-fields         — list form fields
  PUT  /api/admin/events/{event_id}/registration-fields         — replace all form fields
  POST /api/admin/events/{event_id}/registration-fields         — append a single field

  GET    /api/admin/events/{event_id}/ticket-types              — list ticket types
  POST   /api/admin/events/{event_id}/ticket-types              — create ticket type
  PATCH  /api/admin/events/{event_id}/ticket-types/{type_id}   — update ticket type
  DELETE /api/admin/events/{event_id}/ticket-types/{type_id}   — delete ticket type
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import DateTime, Integer, Numeric, String, Text, Boolean, select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Mapped, mapped_column

from .main import (
    Base, CurrentUser, Event, Role,
    get_current_user, get_db, require_role,
    _get_event_registration_fields,
    _validate_registration_fields_for_write,
)
from .event_features import (
    EVENT_TYPES,
    EVENT_TYPE_CERTIFICATE,
    PRESET_BY_EVENT_TYPE,
    resolved_feature_defaults,
)

router = APIRouter()


# ── Event-type feature presets (ADR-0018) ───────────────────────────────────────
# Read-only: lets the admin UI seed feature toggles when the organizer picks a type,
# without duplicating the preset map on the frontend (single source of truth).

@router.get(
    "/api/admin/event-feature-presets",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def get_event_feature_presets(
    me: CurrentUser = Depends(get_current_user),
):
    """Resolved default toggle set per event type (preset overlaid on global defaults)."""
    return {
        "default_event_type": EVENT_TYPE_CERTIFICATE,
        "event_types": sorted(EVENT_TYPES),
        # Full resolved defaults per type so the client never has to merge anything.
        "presets": {etype: resolved_feature_defaults(etype) for etype in sorted(EVENT_TYPES)},
        # Which flags each type explicitly opts into (for UI hints; optional).
        "explicit_overrides": PRESET_BY_EVENT_TYPE,
    }


# ── Helpers ────────────────────────────────────────────────────────────────────

async def _get_event_or_404(event_id: int, me: CurrentUser, db: AsyncSession) -> Event:
    event = (await db.execute(select(Event).where(Event.id == event_id))).scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    if me.role != Role.superadmin and event.admin_id != me.id:
        raise HTTPException(status_code=403, detail="Access denied")
    return event


# ── Registration fields ────────────────────────────────────────────────────────

class RegFieldIn(BaseModel):
    label: str = Field(..., min_length=1, max_length=200)
    name: str = Field(..., min_length=1, max_length=100)
    type: str = Field(default="text", description="text | email | tel | textarea | select | checkbox | number | date")
    required: bool = False
    placeholder: Optional[str] = None
    options: Optional[list[str]] = None


class RegFieldsReplaceIn(BaseModel):
    fields: list[dict[str, Any]]


@router.get(
    "/api/admin/events/{event_id}/registration-fields",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
    tags=["registration-fields"],
)
async def get_registration_fields(
    event_id: int,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    event = await _get_event_or_404(event_id, me, db)
    fields = _get_event_registration_fields(event)
    return {"event_id": event_id, "fields": fields, "count": len(fields)}


@router.put(
    "/api/admin/events/{event_id}/registration-fields",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
    tags=["registration-fields"],
)
async def replace_registration_fields(
    event_id: int,
    payload: RegFieldsReplaceIn,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Replace all registration form fields. Pass empty list to clear."""
    event = await _get_event_or_404(event_id, me, db)
    existing = _get_event_registration_fields(event)
    validated = _validate_registration_fields_for_write(payload.fields, existing_fields=existing)
    config = dict(event.config or {})
    config["registration_fields"] = validated
    event.config = config
    await db.commit()
    return {"event_id": event_id, "fields": validated, "count": len(validated)}


@router.post(
    "/api/admin/events/{event_id}/registration-fields",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
    tags=["registration-fields"],
    status_code=201,
)
async def append_registration_field(
    event_id: int,
    payload: RegFieldIn,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Append a single field to the registration form."""
    event = await _get_event_or_404(event_id, me, db)
    existing = _get_event_registration_fields(event)

    new_field: dict[str, Any] = {
        "id": str(uuid.uuid4())[:8],
        "label": payload.label,
        "name": payload.name,
        "type": payload.type,
        "required": payload.required,
    }
    if payload.placeholder:
        new_field["placeholder"] = payload.placeholder
    if payload.options:
        new_field["options"] = payload.options

    updated = _validate_registration_fields_for_write(existing + [new_field], existing_fields=existing)
    config = dict(event.config or {})
    config["registration_fields"] = updated
    event.config = config
    await db.commit()
    return {"event_id": event_id, "field": new_field, "total_fields": len(updated)}


# ── Ticket types ───────────────────────────────────────────────────────────────

class EventTicketType(Base):
    __tablename__ = "event_ticket_types"

    id:          Mapped[int]            = mapped_column(Integer, primary_key=True)
    event_id:    Mapped[int]            = mapped_column(Integer, nullable=False)
    name:        Mapped[str]            = mapped_column(String(200), nullable=False)
    description: Mapped[Optional[str]]  = mapped_column(Text, nullable=True)
    price:       Mapped[Decimal]        = mapped_column(Numeric(10, 2), nullable=False, default=Decimal("0"))
    currency:    Mapped[str]            = mapped_column(String(3), nullable=False, default="TRY")
    capacity:    Mapped[Optional[int]]  = mapped_column(Integer, nullable=True)
    sold_count:  Mapped[int]            = mapped_column(Integer, nullable=False, default=0)
    is_active:   Mapped[bool]           = mapped_column(Boolean, nullable=False, default=True)
    sort_order:  Mapped[int]            = mapped_column(Integer, nullable=False, default=0)
    created_at:  Mapped[datetime]       = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc)
    )
    updated_at:  Mapped[datetime]       = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc)
    )


class TicketTypeIn(BaseModel):
    name:        str             = Field(..., min_length=1, max_length=200)
    description: Optional[str]  = None
    price:       Decimal         = Field(default=Decimal("0"), ge=0)
    currency:    str             = Field(default="TRY", max_length=3)
    capacity:    Optional[int]   = Field(default=None, ge=1)
    sort_order:  int             = 0


class TicketTypePatchIn(BaseModel):
    name:        Optional[str]     = None
    description: Optional[str]    = None
    price:       Optional[Decimal] = None
    currency:    Optional[str]     = None
    capacity:    Optional[int]     = None
    is_active:   Optional[bool]    = None
    sort_order:  Optional[int]     = None


class TicketTypeOut(BaseModel):
    id:          int
    event_id:    int
    name:        str
    description: Optional[str]
    price:       float
    currency:    str
    capacity:    Optional[int]
    sold_count:  int
    is_active:   bool
    sort_order:  int
    created_at:  datetime


def _tt_to_out(t: EventTicketType) -> TicketTypeOut:
    return TicketTypeOut(
        id=t.id, event_id=t.event_id, name=t.name, description=t.description,
        price=float(t.price), currency=t.currency, capacity=t.capacity,
        sold_count=t.sold_count, is_active=t.is_active, sort_order=t.sort_order,
        created_at=t.created_at,
    )


@router.get(
    "/api/admin/events/{event_id}/ticket-types",
    response_model=list[TicketTypeOut],
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
    tags=["ticket-types"],
)
async def list_ticket_types(
    event_id: int,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[TicketTypeOut]:
    await _get_event_or_404(event_id, me, db)
    rows = (await db.execute(
        select(EventTicketType)
        .where(EventTicketType.event_id == event_id)
        .order_by(EventTicketType.sort_order, EventTicketType.id)
    )).scalars().all()
    return [_tt_to_out(r) for r in rows]


@router.post(
    "/api/admin/events/{event_id}/ticket-types",
    response_model=TicketTypeOut,
    status_code=201,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
    tags=["ticket-types"],
)
async def create_ticket_type(
    event_id: int,
    payload: TicketTypeIn,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> TicketTypeOut:
    await _get_event_or_404(event_id, me, db)
    tt = EventTicketType(
        event_id=event_id,
        name=payload.name.strip(),
        description=payload.description,
        price=payload.price,
        currency=payload.currency.upper(),
        capacity=payload.capacity,
        sort_order=payload.sort_order,
    )
    db.add(tt)
    await db.commit()
    await db.refresh(tt)
    return _tt_to_out(tt)


@router.patch(
    "/api/admin/events/{event_id}/ticket-types/{type_id}",
    response_model=TicketTypeOut,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
    tags=["ticket-types"],
)
async def update_ticket_type(
    event_id: int,
    type_id: int,
    payload: TicketTypePatchIn,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> TicketTypeOut:
    await _get_event_or_404(event_id, me, db)
    tt = (await db.execute(
        select(EventTicketType).where(EventTicketType.id == type_id, EventTicketType.event_id == event_id)
    )).scalar_one_or_none()
    if not tt:
        raise HTTPException(status_code=404, detail="Ticket type not found")
    if payload.name is not None:
        tt.name = payload.name.strip()
    if payload.description is not None:
        tt.description = payload.description
    if payload.price is not None:
        tt.price = payload.price
    if payload.currency is not None:
        tt.currency = payload.currency.upper()
    if payload.capacity is not None:
        tt.capacity = payload.capacity
    if payload.is_active is not None:
        tt.is_active = payload.is_active
    if payload.sort_order is not None:
        tt.sort_order = payload.sort_order
    tt.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(tt)
    return _tt_to_out(tt)


@router.delete(
    "/api/admin/events/{event_id}/ticket-types/{type_id}",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
    tags=["ticket-types"],
)
async def delete_ticket_type(
    event_id: int,
    type_id: int,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    await _get_event_or_404(event_id, me, db)
    result = await db.execute(
        delete(EventTicketType).where(
            EventTicketType.id == type_id,
            EventTicketType.event_id == event_id,
        )
    )
    await db.commit()
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Ticket type not found")
    return {"deleted": True, "type_id": type_id}
