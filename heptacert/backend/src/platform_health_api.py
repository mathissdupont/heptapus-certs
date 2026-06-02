"""Extended admin-facing platform health probes."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from .main import (
    BulkEmailJob,
    EventAutomationExecutionLog,
    Role,
    SegmentExportJob,
    WebhookDelivery,
    get_db,
    require_role,
)

router = APIRouter()


def _status(ok: bool, detail: str) -> dict[str, object]:
    return {"ok": ok, "status": "ok" if ok else "warning", "detail": detail}


@router.get("/api/superadmin/platform-health", dependencies=[Depends(require_role(Role.superadmin))])
async def platform_health(db: AsyncSession = Depends(get_db)):
    since = datetime.now(timezone.utc) - timedelta(hours=24)

    email_pending = int((await db.execute(select(func.count()).select_from(BulkEmailJob).where(BulkEmailJob.status.in_(["pending", "sending"])))).scalar_one() or 0)
    email_failed = int((await db.execute(select(func.count()).select_from(BulkEmailJob).where(BulkEmailJob.status == "failed", BulkEmailJob.created_at >= since))).scalar_one() or 0)
    webhook_failed = int((await db.execute(select(func.count()).select_from(WebhookDelivery).where(WebhookDelivery.status == "failed", WebhookDelivery.delivered_at >= since))).scalar_one() or 0)
    export_pending = int((await db.execute(select(func.count()).select_from(SegmentExportJob).where(SegmentExportJob.status.in_(["pending", "processing"])))).scalar_one() or 0)
    automation_failed = int((await db.execute(select(func.count()).select_from(EventAutomationExecutionLog).where(EventAutomationExecutionLog.status == "failed", EventAutomationExecutionLog.created_at >= since))).scalar_one() or 0)

    probes = {
        "worker": _status(email_pending < 100 and export_pending < 100, f"{email_pending} email jobs, {export_pending} export jobs pending"),
        "email": _status(email_failed == 0, f"{email_failed} failed bulk email jobs in 24h"),
        "webhook": _status(webhook_failed == 0, f"{webhook_failed} failed webhook deliveries in 24h"),
        "export": _status(export_pending < 50, f"{export_pending} export jobs pending"),
        "scheduler": _status(automation_failed == 0, f"{automation_failed} failed automation runs in 24h"),
    }
    return {"checked_at": datetime.now(timezone.utc).isoformat(), "probes": probes}
