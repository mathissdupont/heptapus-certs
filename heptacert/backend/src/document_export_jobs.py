"""Queued document export jobs for heavy PDF/CSV outputs."""

from __future__ import annotations

import csv
import io
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import FileResponse
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Mapped, mapped_column

from .document_outputs import render_log_document_pdf_bytes
from .main import (
    AuditLog,
    Base,
    CurrentUser,
    Event,
    JSONB,
    Organization,
    Role,
    User,
    _audit_category_filter,
    _audit_row_payload,
    get_current_user,
    get_db,
    logger,
    require_role,
    send_email_async,
    settings,
    write_audit_log,
)


router = APIRouter(prefix="/api/admin/document-export-jobs", tags=["document-export-jobs"])

EXPORT_TYPES = {"audit_logs", "organization_legal_consents"}
EXPORT_FORMATS = {"csv", "pdf"}
EXPORT_STATUSES = {"pending", "processing", "completed", "failed"}
MAX_EXPORT_ROWS = 10_000


class DocumentExportJob(Base):
    __tablename__ = "document_export_jobs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    export_type: Mapped[str] = mapped_column(String(64), index=True)
    export_format: Mapped[str] = mapped_column(String(12), default="pdf")
    requested_by: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    organization_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("organizations.id", ondelete="SET NULL"), nullable=True, index=True)
    filters: Mapped[dict] = mapped_column(JSONB, default=dict)
    status: Mapped[str] = mapped_column(String(32), default="pending", index=True)
    row_count: Mapped[int] = mapped_column(Integer, default=0)
    output_file_path: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    output_filename: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    email_sent_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)


class DocumentExportJobIn(BaseModel):
    export_type: str = Field(pattern="^(audit_logs|organization_legal_consents)$")
    format: str = Field(default="pdf", pattern="^(csv|pdf)$")
    category: Optional[str] = Field(default=None, pattern="^(legal|security)$")
    action: Optional[str] = Field(default=None, max_length=160)
    resource_type: Optional[str] = Field(default=None, max_length=120)


class DocumentExportJobOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    export_type: str
    export_format: str
    status: str
    row_count: int
    output_filename: Optional[str]
    error_message: Optional[str]
    created_at: datetime
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    email_sent_at: Optional[datetime]
    download_url: Optional[str] = None


def _job_out(job: DocumentExportJob) -> DocumentExportJobOut:
    return DocumentExportJobOut(
        id=job.id,
        export_type=job.export_type,
        export_format=job.export_format,
        status=job.status,
        row_count=job.row_count,
        output_filename=job.output_filename,
        error_message=job.error_message,
        created_at=job.created_at,
        started_at=job.started_at,
        completed_at=job.completed_at,
        email_sent_at=job.email_sent_at,
        download_url=f"/api/admin/document-export-jobs/{job.id}/download" if job.output_file_path else None,
    )


async def _authorized_job(db: AsyncSession, me: CurrentUser, job_id: int) -> DocumentExportJob:
    job = await db.get(DocumentExportJob, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Export job not found")
    if me.role != Role.superadmin and job.requested_by != me.id:
        raise HTTPException(status_code=403, detail="Export job access denied")
    return job


@router.post("", response_model=DocumentExportJobOut, status_code=202, dependencies=[Depends(require_role(Role.admin, Role.superadmin))])
async def create_document_export_job(
    payload: DocumentExportJobIn,
    request: Request,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    organization_id: Optional[int] = None
    if payload.export_type == "audit_logs":
        if me.role != Role.superadmin:
            raise HTTPException(status_code=403, detail="Audit log exports require superadmin access")
    elif payload.export_type == "organization_legal_consents":
        from .organization_access_api import get_organization_for_access, organization_id_from_request

        organization = await get_organization_for_access(db, me, "organization:view", organization_id_from_request(request))
        organization_id = organization.id

    job = DocumentExportJob(
        export_type=payload.export_type,
        export_format=payload.format,
        requested_by=me.id,
        organization_id=organization_id,
        filters={
            "category": payload.category,
            "action": payload.action,
            "resource_type": payload.resource_type,
        },
        status="pending",
    )
    db.add(job)
    await db.flush()
    await write_audit_log(
        db,
        user_id=me.id,
        action="document_export.enqueue",
        resource_type="document_export_job",
        resource_id=str(job.id),
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("User-Agent"),
        extra={"export_type": payload.export_type, "format": payload.format, "organization_id": organization_id},
    )
    await db.commit()
    await db.refresh(job)
    return _job_out(job)


@router.get("", response_model=list[DocumentExportJobOut], dependencies=[Depends(require_role(Role.admin, Role.superadmin))])
async def list_document_export_jobs(
    limit: int = Query(default=20, ge=1, le=100),
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(DocumentExportJob).order_by(DocumentExportJob.created_at.desc()).limit(limit)
    if me.role != Role.superadmin:
        query = query.where(DocumentExportJob.requested_by == me.id)
    jobs = (await db.execute(query)).scalars().all()
    return [_job_out(job) for job in jobs]


@router.get("/{job_id}", response_model=DocumentExportJobOut, dependencies=[Depends(require_role(Role.admin, Role.superadmin))])
async def get_document_export_job(
    job_id: int,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return _job_out(await _authorized_job(db, me, job_id))


@router.get("/{job_id}/download", dependencies=[Depends(require_role(Role.admin, Role.superadmin))])
async def download_document_export_job(
    job_id: int,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    job = await _authorized_job(db, me, job_id)
    if job.status != "completed" or not job.output_file_path:
        raise HTTPException(status_code=409, detail="Export is not ready yet")
    storage_root = Path(settings.local_storage_dir).resolve()
    abs_path = (storage_root / job.output_file_path).resolve()
    if not abs_path.is_relative_to(storage_root) or not abs_path.exists() or not abs_path.is_file():
        raise HTTPException(status_code=404, detail="Export file not found")
    media_type = "application/pdf" if job.export_format == "pdf" else "text/csv"
    return FileResponse(abs_path, media_type=media_type, filename=job.output_filename or abs_path.name)


async def process_document_export_jobs_once(limit: int = 3) -> dict[str, int]:
    processed = 0
    failed = 0
    async with next_db_session() as db:
        result = await db.execute(
            select(DocumentExportJob.id)
            .where(DocumentExportJob.status == "pending")
            .order_by(DocumentExportJob.created_at.asc())
            .with_for_update(skip_locked=True)
            .limit(limit)
        )
        job_ids = list(result.scalars().all())

    for job_id in job_ids:
        try:
            await _process_one_document_export_job(job_id)
            processed += 1
        except Exception:
            logger.exception("Document export job %s failed outside job handler", job_id)
            failed += 1
    return {"processed": processed, "failed": failed}


class next_db_session:
    async def __aenter__(self) -> AsyncSession:
        from .main import SessionLocal

        self.session = SessionLocal()
        return self.session

    async def __aexit__(self, exc_type: Any, exc: Any, tb: Any) -> None:
        await self.session.close()


async def _process_one_document_export_job(job_id: int) -> None:
    async with next_db_session() as db:
        job = await db.get(DocumentExportJob, job_id)
        if not job or job.status != "pending":
            return
        job.status = "processing"
        job.started_at = datetime.now(timezone.utc)
        job.error_message = None
        await db.commit()

    try:
        async with next_db_session() as db:
            job = await db.get(DocumentExportJob, job_id)
            if not job:
                return
            requester = await db.get(User, job.requested_by)
            rows, title, filename_base = await _build_export_rows(db, job)
            output_bytes, extension, media_type = _render_export_bytes(job, rows, title)
            rel_path = f"document_exports/{job.export_type}/job_{job.id}.{extension}"
            abs_path = Path(settings.local_storage_dir) / rel_path
            abs_path.parent.mkdir(parents=True, exist_ok=True)
            abs_path.write_bytes(output_bytes)

            job.row_count = len(rows)
            job.output_file_path = rel_path
            job.output_filename = f"{filename_base}.{extension}"
            job.status = "completed"
            job.completed_at = datetime.now(timezone.utc)
            await db.commit()

            if requester and requester.email:
                await _email_export_ready(requester.email, job, output_bytes, media_type)
                job.email_sent_at = datetime.now(timezone.utc)
                await db.commit()
    except Exception as exc:
        async with next_db_session() as db:
            job = await db.get(DocumentExportJob, job_id)
            if job:
                job.status = "failed"
                job.error_message = str(exc)[:4000]
                job.completed_at = datetime.now(timezone.utc)
                await db.commit()
        logger.exception("Document export job %s failed", job_id)


async def _build_export_rows(db: AsyncSession, job: DocumentExportJob) -> tuple[list[dict[str, Any]], str, str]:
    filters = job.filters or {}
    if job.export_type == "audit_logs":
        query = select(AuditLog, User.email).outerjoin(User, User.id == AuditLog.user_id)
        if filters.get("action"):
            query = query.where(AuditLog.action.ilike(f"%{filters['action']}%"))
        if filters.get("resource_type"):
            query = query.where(AuditLog.resource_type == filters["resource_type"])
        query = _audit_category_filter(query, filters.get("category"))
        query = query.order_by(AuditLog.created_at.desc()).limit(MAX_EXPORT_ROWS)
        rows = [_audit_row_payload(log, email) for log, email in (await db.execute(query)).all()]
        suffix = filters.get("category") or "all"
        return rows, "HeptaCert Audit Logs", f"audit-logs-{suffix}"

    if job.export_type == "organization_legal_consents":
        if not job.organization_id:
            raise RuntimeError("organization_id missing")
        organization = await db.get(Organization, job.organization_id)
        if not organization:
            raise RuntimeError("organization not found")
        event_ids = set((await db.execute(select(Event.id).where(Event.admin_id == organization.user_id))).scalars().all())
        rows: list[dict[str, Any]] = []
        if event_ids:
            query = (
                select(AuditLog, User.email)
                .outerjoin(User, User.id == AuditLog.user_id)
                .where(AuditLog.action.in_(["legal.consent.accept", "legal.document.click", "legal.document.view"]))
                .order_by(AuditLog.created_at.desc())
                .limit(MAX_EXPORT_ROWS)
            )
            for log, email in (await db.execute(query)).all():
                extra = log.extra if isinstance(log.extra, dict) else {}
                try:
                    log_event_id = int(extra.get("event_id") or 0)
                except (TypeError, ValueError):
                    log_event_id = 0
                if log_event_id in event_ids:
                    rows.append(_audit_row_payload(log, email))
        return rows, "Organization Consent Logs", f"organization-consent-logs-{organization.id}"

    raise RuntimeError(f"unsupported export type: {job.export_type}")


def _render_export_bytes(job: DocumentExportJob, rows: list[dict[str, Any]], title: str) -> tuple[bytes, str, str]:
    if job.export_format == "csv":
        return _csv_bytes(rows), "csv", "text/csv"
    pdf = render_log_document_pdf_bytes(
        title=title,
        intro="This document was automatically generated from HeptaCert system records.",
        summary={
            "Generated at": datetime.now(timezone.utc).isoformat(),
            "Record count": len(rows),
            "Output type": "Queued official log PDF",
        },
        records=rows,
        columns=["id", "created_at", "user_email", "action", "resource_type", "resource_id", "ip_address", "details"],
    )
    return pdf, "pdf", "application/pdf"


def _csv_bytes(rows: list[dict[str, Any]]) -> bytes:
    buffer = io.StringIO()
    fieldnames = ["id", "created_at", "user_email", "action", "resource_type", "resource_id", "ip_address", "details", "extra"]
    writer = csv.DictWriter(buffer, fieldnames=fieldnames)
    writer.writeheader()
    for row in rows:
        writer.writerow({key: json.dumps(row.get(key), ensure_ascii=False) if key == "extra" else row.get(key, "") for key in fieldnames})
    return buffer.getvalue().encode("utf-8-sig")


async def _email_export_ready(to_email: str, job: DocumentExportJob, payload: bytes, media_type: str) -> None:
    filename = job.output_filename or f"document-export-{job.id}.{job.export_format}"
    html = f"""
    <p>Merhaba,</p>
    <p>HeptaCert belge çıktınız hazırlandı.</p>
    <ul>
      <li><strong>Job:</strong> #{job.id}</li>
      <li><strong>Tip:</strong> {job.export_type}</li>
      <li><strong>Kayıt sayısı:</strong> {job.row_count}</li>
    </ul>
    <p>Dosya bu e-postaya eklenmiştir. Panele giriş yaparak çıktıyı güvenli şekilde tekrar indirebilirsiniz.</p>
    """
    await send_email_async(
        to=to_email,
        subject=f"HeptaCert export hazır: {filename}",
        html_body=html,
        attachments=[(filename, payload, media_type)],
        raise_on_error=False,
        sender_user_id=job.requested_by,
    )

