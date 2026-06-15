"""Anket yapilandirmasi route'lari (main.py'dan ayiklandi — routers refactor 4d).

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
    Attendee,
    Event,
    EventSurvey,
    EventSurveyIn,
    EventSurveyOut,
    User,
    _can_manage_organization_event,
    get_current_user,
    get_db,
)

router = APIRouter()


@router.post("/api/admin/events/{event_id}/survey-config", response_model=EventSurveyOut)
async def configure_event_survey(
    event_id: int,
    survey_in: EventSurveyIn,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Configure survey requirements for an event."""
    e_res = await db.execute(select(Event).where(Event.id == event_id))
    event = e_res.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Etkinlik bulunamad")

    if not await _can_manage_organization_event(db, current_user, event.admin_id):
        raise HTTPException(status_code=403, detail="Yetkisiz eriim")

    if survey_in.survey_type not in {"disabled", "builtin", "external", "both"}:
        raise HTTPException(status_code=400, detail="Gecersiz anket turu")

    survey_disabled = survey_in.survey_type == "disabled"
    builtin_questions = [] if survey_disabled else [q.model_dump() for q in survey_in.builtin_questions]
    if survey_in.survey_type in {"builtin", "both"} and not builtin_questions:
        raise HTTPException(status_code=400, detail="Yerleik anket icin en az bir soru gerekli")

    if survey_in.survey_type in {"external", "both"} and not survey_in.external_url:
        raise HTTPException(status_code=400, detail="Harici anket icin URL gerekli")

    webhook_key = survey_in.external_webhook_key
    if survey_in.survey_type in {"external", "both"} and not webhook_key:
        webhook_key = secrets.token_urlsafe(24)
    elif survey_in.survey_type in {"disabled", "builtin"}:
        webhook_key = None

    es_res = await db.execute(select(EventSurvey).where(EventSurvey.event_id == event_id))
    event_survey = es_res.scalar_one_or_none()

    if event_survey:
        event_survey.is_required = survey_in.is_required
        event_survey.survey_type = survey_in.survey_type
        event_survey.builtin_questions = builtin_questions
        event_survey.external_provider = None if survey_disabled else survey_in.external_provider
        event_survey.external_url = None if survey_disabled else survey_in.external_url
        event_survey.external_webhook_key = webhook_key
    else:
        event_survey = EventSurvey(
            event_id=event_id,
            is_required=survey_in.is_required,
            survey_type=survey_in.survey_type,
            builtin_questions=builtin_questions,
            external_provider=None if survey_disabled else survey_in.external_provider,
            external_url=None if survey_disabled else survey_in.external_url,
            external_webhook_key=webhook_key,
        )
        db.add(event_survey)

    att_res = await db.execute(select(Attendee).where(Attendee.event_id == event_id))
    attendees = att_res.scalars().all()
    for attendee in attendees:
        attendee.survey_required = survey_in.is_required if not survey_disabled else False
        if survey_disabled:
            attendee.can_download_cert = True
        elif survey_in.is_required:
            attendee.can_download_cert = attendee.survey_completed_at is not None
        else:
            attendee.can_download_cert = True

    await db.commit()
    await db.refresh(event_survey)
    return event_survey


@router.get("/api/admin/events/{event_id}/survey-config", response_model=Optional[EventSurveyOut])
async def get_event_survey(
    event_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get survey configuration for an event."""
    e_res = await db.execute(select(Event).where(Event.id == event_id))
    event = e_res.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Etkinlik bulunamad")

    if not await _can_manage_organization_event(db, current_user, event.admin_id):
        raise HTTPException(status_code=403, detail="Yetkisiz eriim")

    es_res = await db.execute(select(EventSurvey).where(EventSurvey.event_id == event_id))
    event_survey = es_res.scalar_one_or_none()
    return event_survey
