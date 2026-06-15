"""Sertifika kademeleri route'lari (main.py'dan ayiklandi — routers refactor 4d).

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
    CertificateTierRule,
    CertificateTierRulesIn,
    CertificateTierRulesOut,
    Event,
    User,
    _can_manage_organization_event,
    get_current_user,
    get_db,
)

router = APIRouter()


@router.post("/api/admin/events/{event_id}/certificate-tiers", response_model=CertificateTierRulesOut)
async def create_or_update_tier_rules(
    event_id: int,
    tier_rules_in: CertificateTierRulesIn,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create or update certificate tier rules for an event."""
    # Check authorization
    e_res = await db.execute(select(Event).where(Event.id == event_id))
    event = e_res.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Etkinlik bulunamadÃ„Â±")

    if not await _can_manage_organization_event(db, current_user, event.admin_id):
        raise HTTPException(status_code=403, detail="Yetkisiz eriÅŸim")

    # Check if rules exist
    ctr_res = await db.execute(
        select(CertificateTierRule).where(CertificateTierRule.event_id == event_id)
    )
    tier_rule = ctr_res.scalar_one_or_none()

    if tier_rule:
        tier_rule.tier_definitions = [t.model_dump() for t in tier_rules_in.tier_definitions]
        tier_rule.updated_at = datetime.utcnow()
    else:
        tier_rule = CertificateTierRule(
            event_id=event_id,
            tier_definitions=[t.model_dump() for t in tier_rules_in.tier_definitions],
            created_by=current_user.id,
            updated_at=datetime.utcnow(),
        )
        db.add(tier_rule)

    await db.commit()
    await db.refresh(tier_rule)
    return tier_rule


@router.get("/api/admin/events/{event_id}/certificate-tiers", response_model=Optional[CertificateTierRulesOut])
async def get_tier_rules(
    event_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get certificate tier rules for an event."""
    e_res = await db.execute(select(Event).where(Event.id == event_id))
    event = e_res.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Etkinlik bulunamadÃ„Â±")

    if not await _can_manage_organization_event(db, current_user, event.admin_id):
        raise HTTPException(status_code=403, detail="Yetkisiz eriÅŸim")

    ctr_res = await db.execute(
        select(CertificateTierRule).where(CertificateTierRule.event_id == event_id)
    )
    tier_rule = ctr_res.scalar_one_or_none()
    return tier_rule
