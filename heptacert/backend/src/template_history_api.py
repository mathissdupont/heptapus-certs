"""Sablon gecmisi route'lari (main.py'dan ayiklandi — routers refactor 4d).

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
    CurrentUser,
    EventTemplateSnapshot,
    Role,
    TemplateSnapshotOut,
    _get_event_for_admin,
    get_current_user,
    get_db,
    require_role,
)

router = APIRouter()


@router.get(
    "/api/admin/events/{event_id}/template-history",
    response_model=List[TemplateSnapshotOut],
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def get_template_history(
    event_id: int,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_event_for_admin(event_id, me, db, "certificates:write")

    res = await db.execute(
        select(EventTemplateSnapshot)
        .where(EventTemplateSnapshot.event_id == event_id)
        .order_by(EventTemplateSnapshot.created_at.desc())
        .limit(10)
    )
    return res.scalars().all()


@router.post(
    "/api/admin/events/{event_id}/template-history/{snap_id}/restore",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def restore_template_snapshot(
    event_id: int,
    snap_id: int,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ev = await _get_event_for_admin(event_id, me, db, "certificates:write")

    res_snap = await db.execute(
        select(EventTemplateSnapshot).where(
            EventTemplateSnapshot.id == snap_id,
            EventTemplateSnapshot.event_id == event_id,
        )
    )
    snap = res_snap.scalar_one_or_none()
    if not snap:
        raise HTTPException(status_code=404, detail="Snapshot not found")

    # Save current state as new snapshot before restoring
    current_snap = EventTemplateSnapshot(
        event_id=event_id,
        template_image_url=ev.template_image_url,
        config=ev.config,
        created_by=me.id,
    )
    db.add(current_snap)

    if snap.template_image_url:
        ev.template_image_url = snap.template_image_url
    if snap.config:
        ev.config = snap.config
    await db.commit()
    return {"ok": True, "restored_snapshot_id": snap_id}
