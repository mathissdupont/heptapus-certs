"""
Proactive AI — weekly digest emails and check-in anomaly detection.

Endpoints:
  POST /api/admin/ai/digest/trigger          — manually trigger digest for calling user
  GET  /api/admin/ai/digest/latest           — get last digest HTML for preview
  GET  /api/admin/ai/anomalies/{event_id}    — check-in anomaly report for an event

Background job (called from cron or scheduler):
  POST /api/admin/superadmin/ai/digest/run-weekly  — superadmin-only, sends digests to all users
"""

from __future__ import annotations

import logging
from datetime import date, datetime, timedelta, timezone
from typing import Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import Boolean, Date, DateTime, Integer, String, Text, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Mapped, mapped_column

from .main import (
    Base, CurrentUser, Event, Role,
    get_current_user, get_db, require_role, send_email_async, settings,
)

logger = logging.getLogger(__name__)
router = APIRouter()

# ── DB Model ───────────────────────────────────────────────────────────────────

class AIDigestJob(Base):
    __tablename__ = "ai_digest_jobs"

    id:          Mapped[int]           = mapped_column(Integer, primary_key=True)
    user_id:     Mapped[int]           = mapped_column(Integer, nullable=False)
    week_start:  Mapped[date]          = mapped_column(Date, nullable=False)
    status:      Mapped[str]           = mapped_column(String(20), nullable=False, default="pending")
    digest_html: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    sent_at:     Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    error:       Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    created_at:  Mapped[datetime]      = mapped_column(
        DateTime(timezone=True), nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )


# ── Claude helper (reuse pattern from ai_content_api) ─────────────────────────

async def _claude(system: str, user: str, max_tokens: int = 2000) -> Optional[str]:
    if not settings.anthropic_api_key.strip():
        return None
    body = {
        "model": settings.anthropic_model or "claude-sonnet-4-6",
        "system": system,
        "messages": [{"role": "user", "content": user}],
        "max_tokens": max_tokens,
    }
    try:
        async with httpx.AsyncClient(timeout=40.0) as client:
            resp = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": settings.anthropic_api_key,
                    "anthropic-version": "2023-06-01",
                    "Content-Type": "application/json",
                },
                json=body,
            )
        if resp.status_code >= 400:
            logger.warning("Claude digest call returned %s", resp.status_code)
            return None
        data = resp.json()
        parts = [
            block.get("text", "")
            for block in (data.get("content") or [])
            if isinstance(block, dict) and block.get("type") == "text"
        ]
        return "\n".join(parts).strip() or None
    except Exception as exc:
        logger.warning("Claude digest request failed: %s", exc)
        return None


# ── Digest builder ─────────────────────────────────────────────────────────────

_DIGEST_SYSTEM = """\
You are an event management analytics assistant for HeptaCert.
Given a summary of the user's events for the past week, write a concise weekly digest email in HTML format.

Rules:
- Write in Turkish.
- Be encouraging and professional.
- Highlight the most important metrics (highest attendance, certificates issued, new registrations).
- Add 1-2 actionable suggestions based on the data (e.g. "X etkinliğinin check-in oranı düşük, katılımcılara hatırlatma gönderin").
- Use <h2>, <p>, <ul>, <li>, <strong> tags. No <html>/<head>/<body>.
- Keep it under 400 words.
- End with "İyi etkinlikler!" sign-off.
- Return ONLY the HTML content, no markdown fences."""


async def _build_digest_html(user_email: str, events_summary: list[dict]) -> str:
    if not events_summary:
        return "<p>Bu hafta herhangi bir etkinlik aktivitesi bulunmuyor.</p>"

    summary_text = "\n".join(
        f"- {e['name']}: {e['registrations']} kayıt, {e['checkins']} check-in, {e['certificates']} sertifika"
        for e in events_summary
    )
    user_prompt = (
        f"User: {user_email}\n"
        f"Week: {date.today().isocalendar()[1]}. hafta\n\n"
        f"Event activity:\n{summary_text}\n\n"
        "Write the weekly digest now."
    )
    html = await _claude(_DIGEST_SYSTEM, user_prompt)
    if html:
        return html

    # Fallback: plain HTML summary
    rows = "".join(
        f"<li><strong>{e['name']}</strong>: {e['registrations']} kayıt · {e['checkins']} check-in · {e['certificates']} sertifika</li>"
        for e in events_summary
    )
    return (
        f"<h2>Haftalık Etkinlik Özeti</h2>"
        f"<p>Bu haftaki etkinlik aktiviteniz:</p><ul>{rows}</ul>"
        f"<p>İyi etkinlikler!</p>"
    )


async def _collect_user_event_stats(user_id: int, db: AsyncSession) -> list[dict]:
    week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    events = (await db.execute(
        select(Event).where(Event.admin_id == user_id)
    )).scalars().all()

    summaries = []
    for ev in events:
        # Count registrations in last 7 days via attendance table (proxy: total attendees)
        from sqlalchemy import text as sa_text
        try:
            reg_count = (await db.execute(
                sa_text("SELECT COUNT(*) FROM attendees WHERE event_id = :eid"),
                {"eid": ev.id},
            )).scalar() or 0
            ci_count = (await db.execute(
                sa_text("SELECT COUNT(*) FROM attendee_checkins WHERE event_id = :eid AND checked_in_at >= :since"),
                {"eid": ev.id, "since": week_ago},
            )).scalar() or 0
            cert_count = (await db.execute(
                sa_text("SELECT COUNT(*) FROM certificates WHERE event_id = :eid AND issued_at >= :since"),
                {"eid": ev.id, "since": week_ago},
            )).scalar() or 0
            if reg_count > 0 or ci_count > 0 or cert_count > 0:
                summaries.append({
                    "name": ev.name,
                    "registrations": reg_count,
                    "checkins": ci_count,
                    "certificates": cert_count,
                })
        except Exception:
            continue
    return summaries


# ── Anomaly detection ──────────────────────────────────────────────────────────

_ANOMALY_SYSTEM = """\
You are an event analytics assistant. Given attendance data for an event, identify anomalies and give short recommendations in Turkish.

Return a JSON object with:
  "anomalies": list of strings describing each anomaly found
  "recommendations": list of strings with actionable advice
  "risk_level": "low" | "medium" | "high"

If no anomalies, return empty lists and risk_level "low".
Return ONLY the JSON object."""


class AnomalyOut(BaseModel):
    event_id: int
    event_name: str
    total_registered: int
    total_checkins: int
    checkin_rate: float
    anomalies: list[str]
    recommendations: list[str]
    risk_level: str


@router.get(
    "/api/admin/ai/anomalies/{event_id}",
    response_model=AnomalyOut,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
    tags=["ai-proactive"],
)
async def get_checkin_anomalies(
    event_id: int,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> AnomalyOut:
    from sqlalchemy import text as sa_text

    event = (await db.execute(select(Event).where(Event.id == event_id))).scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    if me.role != Role.superadmin and event.admin_id != me.id:
        raise HTTPException(status_code=403, detail="Access denied")

    try:
        total_reg = (await db.execute(
            sa_text("SELECT COUNT(*) FROM attendees WHERE event_id = :eid"), {"eid": event_id}
        )).scalar() or 0
        total_ci = (await db.execute(
            sa_text("SELECT COUNT(DISTINCT attendee_id) FROM attendee_checkins WHERE event_id = :eid"), {"eid": event_id}
        )).scalar() or 0
    except Exception:
        total_reg, total_ci = 0, 0

    checkin_rate = round((total_ci / total_reg * 100) if total_reg > 0 else 0, 1)

    # Quick rule-based anomalies (no Claude needed for this)
    anomalies: list[str] = []
    recommendations: list[str] = []
    risk_level = "low"

    if total_reg == 0:
        anomalies.append("Etkinliğe henüz kayıt yapılmamış.")
        recommendations.append("Kayıt formunuzun yayında olduğunu kontrol edin.")
        risk_level = "high"
    elif checkin_rate == 0 and total_reg > 0:
        anomalies.append(f"{total_reg} kayıtlı katılımcı var ancak hiç check-in yapılmamış.")
        recommendations.append("Check-in sisteminin açık olduğunu ve QR kodların dağıtıldığını doğrulayın.")
        risk_level = "high"
    elif checkin_rate < 30 and total_reg >= 10:
        anomalies.append(f"Check-in oranı düşük: %{checkin_rate} ({total_ci}/{total_reg}).")
        recommendations.append("Etkinlik öncesinde katılımcılara hatırlatma e-postası gönderin.")
        risk_level = "medium"
    elif checkin_rate > 110:
        anomalies.append(f"Check-in sayısı ({total_ci}) kayıt sayısından ({total_reg}) fazla — veri tutarsızlığı.")
        recommendations.append("Tekrarlı check-in kayıtlarını inceleyin.")
        risk_level = "medium"

    # Optionally enhance with Claude if API key present
    if settings.anthropic_api_key.strip() and (anomalies or total_reg > 0):
        prompt = (
            f"Event: {event.name}\n"
            f"Registered: {total_reg}, Checked-in: {total_ci}, Rate: %{checkin_rate}\n"
            f"Rule-based anomalies already found: {anomalies}\n"
            "Add any further insights."
        )
        import json as _json
        raw = await _claude(_ANOMALY_SYSTEM, prompt, max_tokens=400)
        if raw:
            try:
                clean = raw.strip().lstrip("```json").lstrip("```").rstrip("```").strip()
                parsed = _json.loads(clean)
                extra_anomalies = parsed.get("anomalies") or []
                extra_recs = parsed.get("recommendations") or []
                ai_risk = parsed.get("risk_level", "low")
                anomalies.extend([a for a in extra_anomalies if a not in anomalies])
                recommendations.extend([r for r in extra_recs if r not in recommendations])
                if ai_risk == "high" or (ai_risk == "medium" and risk_level == "low"):
                    risk_level = ai_risk
            except Exception:
                pass

    return AnomalyOut(
        event_id=event_id,
        event_name=event.name or "",
        total_registered=total_reg,
        total_checkins=total_ci,
        checkin_rate=checkin_rate,
        anomalies=anomalies,
        recommendations=recommendations,
        risk_level=risk_level,
    )


# ── Digest endpoints ───────────────────────────────────────────────────────────

class DigestOut(BaseModel):
    status: str
    digest_html: Optional[str] = None
    week_start: Optional[str] = None


@router.post(
    "/api/admin/ai/digest/trigger",
    response_model=DigestOut,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
    tags=["ai-proactive"],
)
async def trigger_digest(
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DigestOut:
    """Manually trigger a weekly digest for the calling user."""
    week_start = date.today() - timedelta(days=date.today().weekday())  # Monday

    existing = (await db.execute(
        select(AIDigestJob).where(
            AIDigestJob.user_id == me.id,
            AIDigestJob.week_start == week_start,
        )
    )).scalar_one_or_none()

    if existing and existing.status == "sent":
        return DigestOut(status="already_sent", digest_html=existing.digest_html, week_start=str(week_start))

    summaries = await _collect_user_event_stats(me.id, db)
    html = await _build_digest_html(str(me.email), summaries)

    if existing:
        existing.digest_html = html
        existing.status = "generated"
    else:
        db.add(AIDigestJob(
            user_id=me.id,
            week_start=week_start,
            status="generated",
            digest_html=html,
        ))
    await db.commit()

    # Try to send email
    try:
        subject = f"HeptaCert Haftalık Özet — {week_start.strftime('%d %B %Y')}"
        await send_email_async(to=str(me.email), subject=subject, html_body=html)
        if existing:
            existing.status = "sent"
            existing.sent_at = datetime.now(timezone.utc)
        else:
            job = (await db.execute(
                select(AIDigestJob).where(AIDigestJob.user_id == me.id, AIDigestJob.week_start == week_start)
            )).scalar_one()
            job.status = "sent"
            job.sent_at = datetime.now(timezone.utc)
        await db.commit()
    except Exception as exc:
        logger.warning("Digest email send failed for user %s: %s", me.id, exc)

    return DigestOut(status="generated", digest_html=html, week_start=str(week_start))


@router.get(
    "/api/admin/ai/digest/latest",
    response_model=DigestOut,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
    tags=["ai-proactive"],
)
async def get_latest_digest(
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DigestOut:
    job = (await db.execute(
        select(AIDigestJob)
        .where(AIDigestJob.user_id == me.id)
        .order_by(AIDigestJob.week_start.desc())
        .limit(1)
    )).scalar_one_or_none()
    if not job:
        return DigestOut(status="none")
    return DigestOut(status=job.status, digest_html=job.digest_html, week_start=str(job.week_start))


@router.post(
    "/api/admin/superadmin/ai/digest/run-weekly",
    dependencies=[Depends(require_role(Role.superadmin))],
    tags=["ai-proactive"],
)
async def run_weekly_digest(
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Send weekly digest to all admin users. Call this from a cron job every Monday at 09:00.
    """
    from .main import User
    admins = (await db.execute(
        select(User).where(User.role.in_(["admin", "superadmin"]))
    )).scalars().all()

    week_start = date.today() - timedelta(days=date.today().weekday())
    sent, skipped, failed = 0, 0, 0

    for user in admins:
        try:
            existing = (await db.execute(
                select(AIDigestJob).where(
                    AIDigestJob.user_id == user.id,
                    AIDigestJob.week_start == week_start,
                    AIDigestJob.status == "sent",
                )
            )).scalar_one_or_none()
            if existing:
                skipped += 1
                continue

            summaries = await _collect_user_event_stats(user.id, db)
            if not summaries:
                skipped += 1
                continue

            html = await _build_digest_html(str(user.email), summaries)
            subject = f"HeptaCert Haftalık Özet — {week_start.strftime('%d %B %Y')}"
            await send_email_async(to=str(user.email), subject=subject, html_body=html)

            db.add(AIDigestJob(
                user_id=user.id,
                week_start=week_start,
                status="sent",
                digest_html=html,
                sent_at=datetime.now(timezone.utc),
            ))
            await db.commit()
            sent += 1
        except Exception as exc:
            logger.warning("Weekly digest failed for user %s: %s", user.id, exc)
            failed += 1

    return {"sent": sent, "skipped": skipped, "failed": failed, "week_start": str(week_start)}
