"""Microsoft Excel route'lari (main.py'dan ayiklandi — routers refactor 4d)."""

import asyncio
import base64
import csv
import hashlib
import hmac
import io
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

from fastapi import APIRouter, BackgroundTasks, Body, Depends, File, HTTPException, Query, Request, UploadFile
from fastapi.responses import FileResponse, JSONResponse, RedirectResponse, Response, StreamingResponse
from sqlalchemy import and_, delete, distinct, func, literal, or_, select, union_all, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from .main import (
    CurrentUser,
    EventMicrosoftExcelStatusOut,
    Role,
    _event_ms365_excel_status_payload,
    _get_event_for_admin,
    _get_event_ms365_excel_config,
    _set_event_ms365_excel_config,
    _write_event_attendees_to_ms365_excel,
    get_current_user,
    get_db,
    require_role,
)

router = APIRouter()


@router.get(
    "/api/admin/events/{event_id}/microsoft-excel",
    response_model=EventMicrosoftExcelStatusOut,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def get_event_ms365_excel_status(
    event_id: int,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    event = await _get_event_for_admin(event_id, me, db, "attendees:read")
    return await _event_ms365_excel_status_payload(db, event)


@router.post(
    "/api/admin/events/{event_id}/microsoft-excel/connect",
    response_model=EventMicrosoftExcelStatusOut,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def connect_event_ms365_excel(
    event_id: int,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    event = await _get_event_for_admin(event_id, me, db, "settings:write")
    await _write_event_attendees_to_ms365_excel(db, event, create_if_missing=True)
    return await _event_ms365_excel_status_payload(db, event)


@router.post(
    "/api/admin/events/{event_id}/microsoft-excel/sync",
    response_model=EventMicrosoftExcelStatusOut,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def sync_event_ms365_excel(
    event_id: int,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    event = await _get_event_for_admin(event_id, me, db, "settings:write")
    excel_config = _get_event_ms365_excel_config(event)
    if not excel_config.get("enabled") or not excel_config.get("workbook_id"):
        raise HTTPException(status_code=409, detail="No Microsoft Excel workbook is connected for this event.")
    await _write_event_attendees_to_ms365_excel(db, event)
    return await _event_ms365_excel_status_payload(db, event)


@router.delete(
    "/api/admin/events/{event_id}/microsoft-excel",
    response_model=EventMicrosoftExcelStatusOut,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def disconnect_event_ms365_excel(
    event_id: int,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    event = await _get_event_for_admin(event_id, me, db, "settings:write")
    _set_event_ms365_excel_config(event, None)
    db.add(event)
    await db.commit()
    await db.refresh(event)
    return await _event_ms365_excel_status_payload(db, event)
