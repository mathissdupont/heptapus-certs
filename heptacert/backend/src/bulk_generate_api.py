"""Toplu sertifika uretimi route'lari (main.py'dan ayiklandi — routers refactor 4d)."""

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
    BulkCertificateJob,
    BulkCertificateJobOut,
    CurrentUser,
    Role,
    User,
    _ensure_certificate_feature_enabled,
    _get_event_for_admin,
    _process_bulk_certificate_jobs,
    bad_request,
    editor_config_to_template_config,
    get_current_user,
    get_db,
    pd,
    require_role,
    settings,
)

router = APIRouter()


@router.post(
    "/api/admin/events/{event_id}/bulk-generate",
    response_model=BulkCertificateJobOut,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def bulk_generate(
    event_id: int,
    excel: UploadFile = File(...),
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ev = await _get_event_for_admin(event_id, me, db, "certificates:write")
    _ensure_certificate_feature_enabled(ev)

    if not ev.config:
        raise bad_request("Event config missing. Save coordinates in editor first.")
    try:
        cfg = editor_config_to_template_config(ev.config)
    except Exception as e:
        raise bad_request(f"Invalid event config: {e}")

    # File size limit: 5MB
    MAX_EXCEL_SIZE = 5 * 1024 * 1024
    raw = await excel.read()
    if len(raw) > MAX_EXCEL_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"Excel dosyasÃ„Â± ÃƒÂ§ok bÃƒÂ¼yÃƒÂ¼k. Maksimum {MAX_EXCEL_SIZE // (1024*1024)} MB.",
        )
    try:
        df = pd.read_excel(io.BytesIO(raw))
    except Exception:
        raise bad_request("Excel parse failed. Ensure .xlsx and readable sheet.")

    if df.empty:
        raise bad_request("Excel is empty")

    col = None
    for c in df.columns:
        lc = str(c).strip().lower()
        if lc in ("name", "student_name", "isim", "ad soyad", "fullname", "full_name"):
            col = c
            break
    if col is None:
        col = df.columns[0]

    raw_names = [str(x).strip() for x in df[col].tolist() if str(x).strip() and str(x).strip().lower() != "nan"]
    names = list(dict.fromkeys(raw_names))
    if not names:
        raise bad_request("No names found in Excel")
    if len(names) > 1000:
        raise bad_request("Excel'de en fazla 1000 isim iÃ…Å¸lenebilir. DosyayÃ„Â± bÃƒÂ¶lerek tekrar deneyin.")

    # User
    res_u = await db.execute(select(User).where(User.id == me.id))
    user = res_u.scalar_one()

    ISSUE_UNITS_PER_CERT = 10
    HOSTING_ESTIMATE_UNITS = 20  # estimate per cert for early balance check

    # Ã¢â€â‚¬Ã¢â€â‚¬ Early balance check (before any file I/O) Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
    estimated_total = len(names) * (ISSUE_UNITS_PER_CERT + HOSTING_ESTIMATE_UNITS)
    if user.heptacoin_balaonce < estimated_total:
        raise HTTPException(
            status_code=402,
            detail=f"Yetersiz HeptaCoin. TahminiGereksinim={estimated_total}, Bakiye={user.heptacoin_balaonce}",
        )
    # Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

    chunk_size = 5 if len(names) >= 500 else 10

    job = BulkCertificateJob(
        event_id=ev.id,
        created_by=me.id,
        names=names,
        chunk_size=chunk_size,
        total_count=len(names),
        status="pending",
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)

    # Nudge processor so first chunk starts quickly
    asyncio.create_task(_process_bulk_certificate_jobs())

    return job


@router.get(
    "/api/admin/events/{event_id}/bulk-generate-jobs",
    response_model=List[BulkCertificateJobOut],
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def list_bulk_generate_jobs(
    event_id: int,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _ = await _get_event_for_admin(event_id, me, db, "certificates:write")
    res = await db.execute(
        select(BulkCertificateJob)
        .where(BulkCertificateJob.event_id == event_id, BulkCertificateJob.created_by == me.id)
        .order_by(BulkCertificateJob.created_at.desc())
        .limit(30)
    )
    return res.scalars().all()


@router.get(
    "/api/admin/events/{event_id}/bulk-generate-jobs/{job_id}",
    response_model=BulkCertificateJobOut,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def get_bulk_generate_job(
    event_id: int,
    job_id: int,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _ = await _get_event_for_admin(event_id, me, db, "certificates:write")
    res = await db.execute(
        select(BulkCertificateJob).where(
            BulkCertificateJob.id == job_id,
            BulkCertificateJob.event_id == event_id,
            BulkCertificateJob.created_by == me.id,
        )
    )
    job = res.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Bulk certificate job not found")
    return job


@router.post(
    "/api/admin/events/{event_id}/bulk-generate-jobs/{job_id}/cancel",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def cancel_bulk_generate_job(
    event_id: int,
    job_id: int,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _ = await _get_event_for_admin(event_id, me, db, "certificates:write")
    res = await db.execute(
        select(BulkCertificateJob).where(
            BulkCertificateJob.id == job_id,
            BulkCertificateJob.event_id == event_id,
            BulkCertificateJob.created_by == me.id,
        )
    )
    job = res.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Bulk certificate job not found")
    if job.status in ["completed", "failed", "cancelled"]:
        raise HTTPException(status_code=400, detail="Job already finished")

    job.status = "cancelled"
    job.completed_at = datetime.now(timezone.utc)
    db.add(job)
    await db.commit()
    return {"ok": True, "job_id": job.id, "status": job.status}


@router.get(
    "/api/admin/events/{event_id}/bulk-generate-jobs/{job_id}/download",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def download_bulk_generate_job_zip(
    event_id: int,
    job_id: int,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _ = await _get_event_for_admin(event_id, me, db, "certificates:write")
    res = await db.execute(
        select(BulkCertificateJob).where(
            BulkCertificateJob.id == job_id,
            BulkCertificateJob.event_id == event_id,
            BulkCertificateJob.created_by == me.id,
        )
    )
    job = res.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Bulk certificate job not found")
    if job.status != "completed" or not job.zip_file_path:
        raise HTTPException(status_code=409, detail="Job henÃƒÂ¼z tamamlanmadÃ„Â±")

    zip_path = Path(settings.local_storage_dir) / job.zip_file_path
    if not zip_path.exists():
        raise HTTPException(status_code=404, detail="ZIP file not found")

    return FileResponse(
        zip_path,
        media_type="application/zip",
        filename=f"certificates-event-{event_id}-job-{job.id}.zip",
    )
