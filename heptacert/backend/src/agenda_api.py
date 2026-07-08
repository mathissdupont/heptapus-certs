"""
WP20 agenda — public calendar (ICS) export.

Kept in its own router to avoid growing main.py. Exposes a single public endpoint
that returns the event's agenda as an RFC 5545 iCalendar file, so attendees can add
the whole schedule to Google/Apple/Outlook calendars with one click. Session
management + the structured agenda fields live on the existing session CRUD
(main.py); this module only reads and serialises them.

Endpoint:
  GET /api/public/events/{event_id}/agenda.ics  — download the agenda as .ics

The endpoint is public (no auth) but respects event visibility, white-label host
scoping, and the two-layer agenda gate (agenda_enabled). Times are emitted as
floating local time (Europe/Istanbul context) which calendar clients interpret in
the viewer's local zone — adequate for Phase A; a VTIMEZONE block can be added later.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .event_features import is_agenda_enabled
from .main import (
    EventSession,
    get_db,
    _resolve_public_event,
    _get_event_visibility,
    _ensure_event_allowed_for_request_host,
)

router = APIRouter()


def _ics_escape(value: Optional[str]) -> str:
    """Escape a value for an iCalendar TEXT field (RFC 5545 §3.3.11)."""
    if not value:
        return ""
    return (
        value.replace("\\", "\\\\")
        .replace(";", "\\;")
        .replace(",", "\\,")
        .replace("\r\n", "\\n")
        .replace("\n", "\\n")
        .replace("\r", "\\n")
    )


def _ics_fold(line: str) -> str:
    """Fold a content line to <=75 octets per RFC 5545 §3.1 (UTF-8 safe-ish).

    Folds on character boundaries with a conservative byte budget so multi-byte
    Turkish characters are never split mid-sequence."""
    encoded = line.encode("utf-8")
    if len(encoded) <= 75:
        return line
    out: list[str] = []
    current = ""
    current_bytes = 0
    first = True
    for ch in line:
        ch_bytes = len(ch.encode("utf-8"))
        # continuation lines start with a space, so their budget is 74 bytes
        budget = 75 if first else 74
        if current_bytes + ch_bytes > budget:
            out.append(current)
            current = ch
            current_bytes = ch_bytes
            first = False
        else:
            current += ch
            current_bytes += ch_bytes
    if current:
        out.append(current)
    return "\r\n ".join(out)


def _slugify(value: str) -> str:
    keep = [c if c.isalnum() else "-" for c in (value or "").lower()]
    slug = "".join(keep).strip("-")
    while "--" in slug:
        slug = slug.replace("--", "-")
    return slug or "agenda"


def _build_agenda_ics(event, sessions) -> str:
    now = datetime.now(timezone.utc)
    dtstamp = now.strftime("%Y%m%dT%H%M%SZ")
    event_name = getattr(event, "name", "Etkinlik")

    lines: list[str] = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//HeptaCert//Agenda//TR",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        _ics_fold(f"X-WR-CALNAME:{_ics_escape(event_name)}"),
    ]

    for s in sessions:
        session_date = getattr(s, "session_date", None)
        if not session_date:
            # An ICS VEVENT requires a start; sessions without a date can't be
            # placed on a calendar, so they are omitted (still shown in the web UI).
            continue

        start_time = getattr(s, "session_start", None)
        end_time = getattr(s, "session_end", None)
        date_str = session_date.strftime("%Y%m%d")

        vevent = ["BEGIN:VEVENT", f"UID:session-{getattr(s, 'id', '0')}@heptacert"]
        vevent.append(f"DTSTAMP:{dtstamp}")

        if start_time is not None:
            vevent.append(f"DTSTART:{date_str}T{start_time.strftime('%H%M%S')}")
            if end_time is not None:
                vevent.append(f"DTEND:{date_str}T{end_time.strftime('%H%M%S')}")
        else:
            # All-day event when only a date is known.
            vevent.append(f"DTSTART;VALUE=DATE:{date_str}")

        summary = getattr(s, "name", "") or ""
        vevent.append(_ics_fold(f"SUMMARY:{_ics_escape(summary)}"))

        location = getattr(s, "session_location", None)
        if location:
            vevent.append(_ics_fold(f"LOCATION:{_ics_escape(location)}"))

        desc_parts = []
        speaker = getattr(s, "speaker_name", None)
        if speaker:
            desc_parts.append(f"Konuşmacı: {speaker}")
        track = getattr(s, "track", None)
        if track:
            desc_parts.append(f"Track: {track}")
        description = getattr(s, "description", None)
        if description:
            desc_parts.append(description)
        if desc_parts:
            vevent.append(_ics_fold(f"DESCRIPTION:{_ics_escape(chr(10).join(desc_parts))}"))

        vevent.append("END:VEVENT")
        lines.extend(vevent)

    lines.append("END:VCALENDAR")
    return "\r\n".join(lines) + "\r\n"


@router.get("/api/public/events/{event_id}/agenda.ics")
async def export_agenda_ics(
    event_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    event = await _resolve_public_event(db, event_id)
    if not event or _get_event_visibility(event) == "private":
        raise HTTPException(status_code=404, detail="Event not found")
    await _ensure_event_allowed_for_request_host(request, db, event)
    if not is_agenda_enabled(event):
        raise HTTPException(status_code=404, detail="Agenda not available for this event")

    sessions_res = await db.execute(
        select(EventSession)
        .where(EventSession.event_id == event.id)
        .order_by(EventSession.session_date, EventSession.session_start, EventSession.id)
    )
    sessions = sessions_res.scalars().all()

    ics = _build_agenda_ics(event, sessions)
    filename = f"{_slugify(getattr(event, 'name', 'agenda'))}-agenda.ics"
    return Response(
        content=ics,
        media_type="text/calendar; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
