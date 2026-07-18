"""Executor for scheduled reports (fixes the missing run path).

Scheduled reports (report_scheduler_models.ScheduledReport) were fully CRUD-manageable
from the admin UI, but nothing ever ran them: create/update set ``next_run_at`` yet no
job queried due reports, generated output, or emailed anyone. This module closes that
gap. :func:`run_due_scheduled_reports` finds active, due reports, builds an HTML summary
scoped to the org's events for the report's period, emails it to the recipients (falling
back to the org owner), and advances ``last_run_at`` / ``next_run_at``.

It is registered as an APScheduler job in main (``_process_scheduled_reports``).
Report content is intentionally an inline HTML summary (no attachments), which keeps the
delivery path simple and dependency-free; per-type deep breakdowns can be extended later.
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from html import escape
from typing import List, Optional, Tuple

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from .db import SessionLocal
from .enums import CertStatus
from .main import send_email_async
from .models import Attendee, Certificate, Event, Organization, User
from .report_scheduler_api import REPORT_TYPES, _next_run
from .report_scheduler_models import ScheduledReport

logger = logging.getLogger(__name__)

# How far back each frequency's report looks when summarizing "this period".
_LOOKBACK_DAYS = {"daily": 1, "weekly": 7, "monthly": 30}


async def _org_event_ids(db: AsyncSession, org: Organization) -> List[int]:
    """Event ids owned by the org (events attach to the org's admin user)."""
    rows = await db.execute(select(Event.id).where(Event.admin_id == org.user_id))
    return [row[0] for row in rows.all()]


async def _build_report(db: AsyncSession, report: ScheduledReport, org: Organization) -> Tuple[str, str]:
    """Return (subject, html_body) for one scheduled report."""
    label = REPORT_TYPES.get(report.report_type, report.report_type)
    period_days = _LOOKBACK_DAYS.get(report.frequency, 7)
    now = datetime.now(timezone.utc)
    since = now - timedelta(days=period_days)
    subject = f"HeptaCert Rapor: {report.name} ({label})"

    event_ids = await _org_event_ids(db, org)
    if not event_ids:
        return subject, f"<h2>{escape(report.name)}</h2><p>{escape(label)} — bu dönem için veri bulunamadı.</p>"

    total_attendees = (await db.execute(
        select(func.count(Attendee.id)).where(Attendee.event_id.in_(event_ids))
    )).scalar() or 0
    new_attendees = (await db.execute(
        select(func.count(Attendee.id)).where(
            Attendee.event_id.in_(event_ids), Attendee.registered_at >= since
        )
    )).scalar() or 0
    active_certs = (await db.execute(
        select(func.count(Certificate.id)).where(
            Certificate.event_id.in_(event_ids),
            Certificate.status == CertStatus.active,
            Certificate.deleted_at.is_(None),
        )
    )).scalar() or 0
    new_certs = (await db.execute(
        select(func.count(Certificate.id)).where(
            Certificate.event_id.in_(event_ids),
            Certificate.created_at >= since,
            Certificate.deleted_at.is_(None),
        )
    )).scalar() or 0

    parts: List[str] = [
        f"<h2>{escape(report.name)}</h2>",
        f"<p><b>{escape(label)}</b> · {escape(report.frequency)} · son {period_days} gün</p>",
        "<table border='1' cellpadding='6' style='border-collapse:collapse'>",
        f"<tr><td>Etkinlik sayısı</td><td>{len(event_ids)}</td></tr>",
        f"<tr><td>Toplam katılımcı</td><td>{int(total_attendees)}</td></tr>",
        f"<tr><td>Yeni katılımcı (dönem)</td><td>{int(new_attendees)}</td></tr>",
        f"<tr><td>Aktif sertifika</td><td>{int(active_certs)}</td></tr>",
        f"<tr><td>Yeni sertifika (dönem)</td><td>{int(new_certs)}</td></tr>",
        "</table>",
    ]

    if report.report_type == "attendee_list":
        rows = (await db.execute(
            select(Attendee.name, Attendee.email, Event.name)
            .join(Event, Event.id == Attendee.event_id)
            .where(Attendee.event_id.in_(event_ids), Attendee.registered_at >= since)
            .order_by(Attendee.registered_at.desc())
            .limit(100)
        )).all()
        parts.append("<h3>Yeni katılımcılar (ilk 100)</h3>")
        parts.append("<table border='1' cellpadding='6' style='border-collapse:collapse'>"
                     "<tr><th>Ad</th><th>E-posta</th><th>Etkinlik</th></tr>")
        for name, email, ev_name in rows:
            parts.append(
                f"<tr><td>{escape(str(name or ''))}</td>"
                f"<td>{escape(str(email or ''))}</td>"
                f"<td>{escape(str(ev_name or ''))}</td></tr>"
            )
        parts.append("</table>")
    elif report.report_type == "cert_issuance":
        rows = (await db.execute(
            select(Certificate.student_name, Event.name, Certificate.created_at)
            .join(Event, Event.id == Certificate.event_id)
            .where(
                Certificate.event_id.in_(event_ids),
                Certificate.created_at >= since,
                Certificate.deleted_at.is_(None),
            )
            .order_by(Certificate.created_at.desc())
            .limit(100)
        )).all()
        parts.append("<h3>Bu dönem düzenlenen sertifikalar (ilk 100)</h3>")
        parts.append("<table border='1' cellpadding='6' style='border-collapse:collapse'>"
                     "<tr><th>Ad</th><th>Etkinlik</th><th>Tarih</th></tr>")
        for sname, ev_name, created in rows:
            parts.append(
                f"<tr><td>{escape(str(sname or ''))}</td>"
                f"<td>{escape(str(ev_name or ''))}</td>"
                f"<td>{created.strftime('%d.%m.%Y') if created else ''}</td></tr>"
            )
        parts.append("</table>")

    parts.append(
        f"<p style='color:#888;font-size:12px'>Bu otomatik rapor "
        f"{now.strftime('%d.%m.%Y %H:%M')} UTC'de oluşturuldu.</p>"
    )
    return subject, "".join(parts)


async def run_due_scheduled_reports(
    db: Optional[AsyncSession] = None,
    *,
    now: Optional[datetime] = None,
    limit: int = 50,
) -> int:
    """Run all active reports whose next_run_at has passed. Returns the number run.

    Each report's next_run_at is advanced even on failure so a broken report never
    becomes a hot retry loop. Recipients come from recipients_json, falling back to the
    org owner's email.
    """
    owns_session = db is None
    if db is None:
        db = SessionLocal()
    now = now or datetime.now(timezone.utc)
    ran = 0
    try:
        rows = (await db.execute(
            select(ScheduledReport, Organization)
            .join(Organization, Organization.id == ScheduledReport.organization_id)
            .where(
                ScheduledReport.next_run_at.is_not(None),
                ScheduledReport.next_run_at <= now,
            )
            .limit(limit)
        )).all()

        for report, org in rows:
            if not report.active:
                continue
            try:
                subject, html = await _build_report(db, report, org)
                recipients = [r for r in (report.recipients_json or []) if r]
                if not recipients:
                    owner = await db.get(User, org.user_id)
                    if owner and owner.email:
                        recipients = [owner.email]
                for to in recipients:
                    try:
                        await send_email_async(to, subject, html)
                    except Exception as mail_exc:
                        logger.warning("Scheduled report email failed for %s: %s", to, mail_exc)
                ran += 1
            except Exception:
                logger.exception("Scheduled report %s failed to build", report.id)
            finally:
                # Always advance so a failing report doesn't retry every tick.
                report.last_run_at = now
                report.next_run_at = _next_run(report.frequency)

        await db.commit()
    except Exception:
        await db.rollback()
        logger.exception("Scheduled report run failed")
        raise
    finally:
        if owns_session:
            await db.close()

    if ran:
        logger.info("Scheduled reports: ran %d due report(s)", ran)
    return ran
