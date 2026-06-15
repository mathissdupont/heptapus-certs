"""Etkinlik sponsorlari route'lari (main.py'dan ayiklandi — routers refactor 4d).

Handler'lar main.py'daki paylasilan helper'lara bagimli; main bu router'i en
sonda include ettigi icin `from .main import ...` (gec-import) calisir.
"""

import csv
import io
import asyncio
import base64
import hashlib
import hmac
import ipaddress
import json
import math
import os
import re
import secrets
import textwrap
import uuid
import zipfile
from pathlib import Path
from datetime import datetime, timezone, timedelta
from datetime import date as date_type
from typing import Any, Dict, List, Literal, Optional, Tuple

from fastapi import (
    APIRouter, BackgroundTasks, Body, Depends, File, HTTPException, Query, Request, UploadFile,
)
from fastapi.responses import (
    FileResponse, JSONResponse, RedirectResponse, Response, StreamingResponse,
)
from sqlalchemy import and_, delete, distinct, func, literal, or_, select, union_all, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from .main import (
    AsyncSession,
    Event,
    SponsorSlot,
    SponsorSlotIn,
    SponsorSlotOut,
    User,
    _can_manage_organization_event,
    get_current_user,
    get_db,
)

router = APIRouter()


@router.post("/api/admin/events/{event_id}/sponsors", response_model=SponsorSlotOut)
async def create_sponsor_slot(
    event_id: int,
    sponsor_in: SponsorSlotIn,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a sponsor slot for an event."""
    # Check authorization
    e_res = await db.execute(select(Event).where(Event.id == event_id))
    event = e_res.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Etkinlik bulunamadÃ„Â±")

    if not await _can_manage_organization_event(db, current_user, event.admin_id):
        raise HTTPException(status_code=403, detail="Yetkisiz eriÅŸim")

    # Create sponsor slot
    sponsor_slot = SponsorSlot(
        event_id=event_id,
        slot_position=sponsor_in.slot_position,
        sponsor_name=sponsor_in.sponsor_name,
        sponsor_logo_url=sponsor_in.sponsor_logo_url,
        sponsor_website_url=sponsor_in.sponsor_website_url,
        sponsor_color_hex=sponsor_in.sponsor_color_hex,
        enabled=sponsor_in.enabled,
        order_index=sponsor_in.order_index,
    )
    db.add(sponsor_slot)
    await db.commit()
    await db.refresh(sponsor_slot)
    return sponsor_slot


@router.get("/api/admin/events/{event_id}/sponsors")
async def list_sponsors(
    event_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all sponsor slots for an event."""
    e_res = await db.execute(select(Event).where(Event.id == event_id))
    event = e_res.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Etkinlik bulunamadÃ„Â±")

    if not await _can_manage_organization_event(db, current_user, event.admin_id):
        raise HTTPException(status_code=403, detail="Yetkisiz eriÅŸim")

    ss_res = await db.execute(
        select(SponsorSlot)
        .where(SponsorSlot.event_id == event_id, SponsorSlot.enabled == True)
        .order_by(SponsorSlot.order_index)
    )
    sponsors = ss_res.scalars().all()

    return {
        "total_sponsors": len(sponsors),
        "sponsors": [SponsorSlotOut.model_validate(s) for s in sponsors],
        "by_position": {},
    }


@router.put("/api/admin/events/{event_id}/sponsors/{sponsor_id}", response_model=SponsorSlotOut)
async def update_sponsor_slot(
    event_id: int,
    sponsor_id: int,
    sponsor_in: SponsorSlotIn,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update a sponsor slot."""
    # Check authorization
    e_res = await db.execute(select(Event).where(Event.id == event_id))
    event = e_res.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Etkinlik bulunamadÃ„Â±")

    if not await _can_manage_organization_event(db, current_user, event.admin_id):
        raise HTTPException(status_code=403, detail="Yetkisiz eriÅŸim")

    # Get sponsor slot
    ss_res = await db.execute(
        select(SponsorSlot).where(
            SponsorSlot.id == sponsor_id,
            SponsorSlot.event_id == event_id,
        )
    )
    sponsor_slot = ss_res.scalar_one_or_none()
    if not sponsor_slot:
        raise HTTPException(status_code=404, detail="Sponsor bulunamadÃ„Â±")

    # Update fields
    sponsor_slot.slot_position = sponsor_in.slot_position
    sponsor_slot.sponsor_name = sponsor_in.sponsor_name
    sponsor_slot.sponsor_logo_url = sponsor_in.sponsor_logo_url
    sponsor_slot.sponsor_website_url = sponsor_in.sponsor_website_url
    sponsor_slot.sponsor_color_hex = sponsor_in.sponsor_color_hex
    sponsor_slot.enabled = sponsor_in.enabled
    sponsor_slot.order_index = sponsor_in.order_index

    await db.commit()
    await db.refresh(sponsor_slot)
    return sponsor_slot


@router.delete("/api/admin/events/{event_id}/sponsors/{sponsor_id}")
async def delete_sponsor_slot(
    event_id: int,
    sponsor_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a sponsor slot."""
    # Check authorization
    e_res = await db.execute(select(Event).where(Event.id == event_id))
    event = e_res.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Etkinlik bulunamadÃ„Â±")

    if not await _can_manage_organization_event(db, current_user, event.admin_id):
        raise HTTPException(status_code=403, detail="Yetkisiz eriÅŸim")

    # Get sponsor slot
    ss_res = await db.execute(
        select(SponsorSlot).where(
            SponsorSlot.id == sponsor_id,
            SponsorSlot.event_id == event_id,
        )
    )
    sponsor_slot = ss_res.scalar_one_or_none()
    if not sponsor_slot:
        raise HTTPException(status_code=404, detail="Sponsor bulunamadÃ„Â±")

    await db.delete(sponsor_slot)
    await db.commit()

    return {
        "status": "deleted",
        "message": f"Sponsor '{sponsor_slot.sponsor_name}' kaldÃ„Â±rÃ„Â±ldÃ„Â±",
    }


@router.get("/api/public/events/{event_id}/sponsors")
async def get_event_sponsors_public(
    event_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Get enabled sponsors for an event (public endpoint)."""
    ss_res = await db.execute(
        select(SponsorSlot)
        .where(SponsorSlot.event_id == event_id, SponsorSlot.enabled == True)
        .order_by(SponsorSlot.order_index)
    )
    sponsors = ss_res.scalars().all()

    # Group by position
    by_position = {}
    for sponsor in sponsors:
        if sponsor.slot_position not in by_position:
            by_position[sponsor.slot_position] = []
        by_position[sponsor.slot_position].append(SponsorSlotOut.model_validate(sponsor))

    return {
        "sponsors": [SponsorSlotOut.model_validate(s) for s in sponsors],
        "by_position": by_position,
        "total": len(sponsors),
    }
