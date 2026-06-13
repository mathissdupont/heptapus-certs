"""
AI Content Generator — email drafts and registration form schemas.

Endpoints:
  POST /api/admin/ai/generate-email   — draft subject + HTML body for an event email
  POST /api/admin/ai/generate-form    — generate a registration form field schema

Both call Claude (claude-sonnet-4-6) and fall back to a deterministic template
if the API key is missing or the call fails.
"""

from __future__ import annotations

import json
import logging
from typing import Any, Optional

import httpx
from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from .main import CurrentUser, Event, Role, get_current_user, get_db, require_role, settings

logger = logging.getLogger(__name__)
router = APIRouter()


# ── Shared Claude helper ───────────────────────────────────────────────────────

async def _claude(system: str, user: str, max_tokens: int = 1500) -> Optional[str]:
    if not settings.anthropic_api_key.strip():
        return None
    body = {
        "model": settings.anthropic_model or "claude-sonnet-4-6",
        "system": system,
        "messages": [{"role": "user", "content": user}],
        "max_tokens": max_tokens,
    }
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
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
            logger.warning("Claude AI returned %s: %s", resp.status_code, resp.text[:300])
            return None
        data = resp.json()
        parts = [
            block.get("text", "")
            for block in (data.get("content") or [])
            if isinstance(block, dict) and block.get("type") == "text"
        ]
        return "\n".join(parts).strip() or None
    except Exception as exc:
        logger.warning("Claude AI request failed: %s", exc)
        return None


# ── Email generator ────────────────────────────────────────────────────────────

_EMAIL_SYSTEM = """\
You are an event email copywriter for HeptaCert. Write professional, warm, and concise event emails in the requested language.

Return ONLY a valid JSON object with exactly these two keys:
  "subject": string — the email subject line (max 80 chars, no quotes around it)
  "body": string — the full email body as HTML (use <p>, <strong>, <ul><li> as needed; no <html>/<body>/<head> tags)

Rules:
- Keep body under 300 words.
- Do NOT include placeholder brackets like [Name] — write for a general audience.
- If the event has a date/location, include it naturally in the body.
- Always end with a warm closing line.
- Return ONLY the JSON object. No markdown fences, no extra text."""

class EmailGenerateIn(BaseModel):
    intent: str = Field(..., description="What this email is for, e.g. 'davet', 'hatırlatma', 'sertifika bildirimi'")
    event_id: Optional[int] = None
    event_name: str = ""
    event_date: Optional[str] = None
    event_location: Optional[str] = None
    event_description: Optional[str] = None
    language: str = Field(default="tr", description="'tr' or 'en'")
    extra_notes: Optional[str] = None

class EmailGenerateOut(BaseModel):
    subject: str
    body: str
    provider: str


def _email_fallback(payload: EmailGenerateIn) -> EmailGenerateOut:
    if payload.language == "en":
        subject = f"Invitation: {payload.event_name}"
        body = f"<p>Dear participant,</p><p>We are pleased to invite you to <strong>{payload.event_name}</strong>."
        if payload.event_date:
            body += f" The event will be held on <strong>{payload.event_date}</strong>."
        if payload.event_location:
            body += f" Location: <strong>{payload.event_location}</strong>."
        body += "</p><p>We look forward to seeing you there.</p>"
    else:
        subject = f"Davet: {payload.event_name}"
        body = f"<p>Sayın katılımcı,</p><p><strong>{payload.event_name}</strong> etkinliğimize sizi davet etmekten memnuniyet duyarız."
        if payload.event_date:
            body += f" Etkinliğimiz <strong>{payload.event_date}</strong> tarihinde gerçekleşecektir."
        if payload.event_location:
            body += f" Konum: <strong>{payload.event_location}</strong>."
        body += "</p><p>Görüşmek üzere.</p>"
    return EmailGenerateOut(subject=subject, body=body, provider="fallback")


async def _enrich_email_from_event(payload: EmailGenerateIn, db: AsyncSession) -> EmailGenerateIn:
    """Fill event_name / event_date / event_location from DB if event_id supplied."""
    if not payload.event_id:
        return payload
    row = (await db.execute(select(Event).where(Event.id == payload.event_id))).scalar_one_or_none()
    if not row:
        return payload
    return payload.model_copy(update={
        "event_name":        payload.event_name or (row.name or ""),
        "event_date":        payload.event_date or (str(row.event_date) if getattr(row, "event_date", None) else None),
        "event_location":    payload.event_location or getattr(row, "event_location", None),
        "event_description": payload.event_description or getattr(row, "event_description", None),
    })


@router.post(
    "/api/admin/ai/generate-email",
    response_model=EmailGenerateOut,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
    tags=["ai-content"],
)
async def generate_email(
    payload: EmailGenerateIn,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> EmailGenerateOut:
    payload = await _enrich_email_from_event(payload, db)
    lang_label = "Turkish" if payload.language == "tr" else "English"
    context_parts = [f"Event name: {payload.event_name or 'Unknown event'}"]
    if payload.event_date:
        context_parts.append(f"Date: {payload.event_date}")
    if payload.event_location:
        context_parts.append(f"Location: {payload.event_location}")
    if payload.event_description:
        context_parts.append(f"Description: {payload.event_description[:400]}")
    if payload.extra_notes:
        context_parts.append(f"Extra notes: {payload.extra_notes}")

    user_prompt = (
        f"Language: {lang_label}\n"
        f"Email intent: {payload.intent}\n"
        + "\n".join(context_parts)
        + "\n\nWrite the email now."
    )

    raw = await _claude(_EMAIL_SYSTEM, user_prompt, max_tokens=1000)
    if not raw:
        return _email_fallback(payload)

    try:
        # Claude sometimes wraps in ```json ... ```, strip it
        clean = raw.strip()
        if clean.startswith("```"):
            clean = clean.split("```", 2)[1]
            if clean.startswith("json"):
                clean = clean[4:]
            clean = clean.rsplit("```", 1)[0].strip()
        parsed: dict[str, Any] = json.loads(clean)
        return EmailGenerateOut(
            subject=str(parsed.get("subject", "")).strip(),
            body=str(parsed.get("body", "")).strip(),
            provider="claude",
        )
    except (ValueError, KeyError):
        logger.warning("Claude email response was not valid JSON: %s", raw[:200])
        return _email_fallback(payload)


# ── Form generator ─────────────────────────────────────────────────────────────

_FORM_SYSTEM = """\
You are a registration form designer for HeptaCert events.

Return ONLY a valid JSON array of form field objects. Each object has:
  "label": string  — field label shown to user (in the requested language)
  "name": string   — snake_case identifier (no spaces)
  "type": one of: text | email | tel | textarea | select | checkbox | number | date
  "required": boolean
  "placeholder": string (optional, only for text/email/tel/textarea)
  "options": array of strings (only for select type)

Always include name (text, required) and email (email, required) as the first two fields.
Add 2–5 additional fields relevant to the event type.

Return ONLY the JSON array. No markdown, no explanation."""

class FormGenerateIn(BaseModel):
    event_id: Optional[int] = None
    event_name: str = ""
    event_type: str = Field(default="certificate_event", description="e.g. workshop, conference, training, webinar")
    event_description: Optional[str] = None
    language: str = Field(default="tr")
    extra_notes: Optional[str] = None

class FormField(BaseModel):
    label: str
    name: str
    type: str
    required: bool = False
    placeholder: Optional[str] = None
    options: Optional[list[str]] = None

class FormGenerateOut(BaseModel):
    fields: list[FormField]
    provider: str


def _form_fallback(payload: FormGenerateIn) -> FormGenerateOut:
    tr = payload.language == "tr"
    fields = [
        FormField(label="Ad Soyad" if tr else "Full Name", name="name", type="text", required=True, placeholder="Ahmet Yılmaz" if tr else "Jane Doe"),
        FormField(label="E-posta" if tr else "Email", name="email", type="email", required=True, placeholder="ornek@sirket.com" if tr else "you@company.com"),
        FormField(label="Şirket / Kurum" if tr else "Organization", name="company", type="text", required=False),
        FormField(label="Unvan" if tr else "Job Title", name="job_title", type="text", required=False),
        FormField(label="Telefon" if tr else "Phone", name="phone", type="tel", required=False),
    ]
    return FormGenerateOut(fields=fields, provider="fallback")


@router.post(
    "/api/admin/ai/generate-form",
    response_model=FormGenerateOut,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
    tags=["ai-content"],
)
async def generate_form(
    payload: FormGenerateIn,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> FormGenerateOut:
    if payload.event_id and not payload.event_name:
        row = (await db.execute(select(Event).where(Event.id == payload.event_id))).scalar_one_or_none()
        if row:
            payload = payload.model_copy(update={
                "event_name": row.name or "",
                "event_description": payload.event_description or getattr(row, "event_description", None),
            })
    lang_label = "Turkish" if payload.language == "tr" else "English"
    context = f"Event: {payload.event_name or 'Event'}\nType: {payload.event_type}\nLanguage: {lang_label}"
    if payload.event_description:
        context += f"\nDescription: {payload.event_description[:300]}"
    if payload.extra_notes:
        context += f"\nExtra notes: {payload.extra_notes}"
    context += "\n\nGenerate the registration form fields now."

    raw = await _claude(_FORM_SYSTEM, context, max_tokens=800)
    if not raw:
        return _form_fallback(payload)

    try:
        clean = raw.strip()
        if clean.startswith("```"):
            clean = clean.split("```", 2)[1]
            if clean.startswith("json"):
                clean = clean[4:]
            clean = clean.rsplit("```", 1)[0].strip()
        parsed: list[dict[str, Any]] = json.loads(clean)
        if not isinstance(parsed, list):
            raise ValueError("Expected array")
        fields = [
            FormField(
                label=str(f.get("label", "")),
                name=str(f.get("name", "")),
                type=str(f.get("type", "text")),
                required=bool(f.get("required", False)),
                placeholder=f.get("placeholder") or None,
                options=f.get("options") or None,
            )
            for f in parsed
            if f.get("label") and f.get("name")
        ]
        return FormGenerateOut(fields=fields, provider="claude")
    except (ValueError, KeyError):
        logger.warning("Claude form response was not valid JSON: %s", raw[:200])
        return _form_fallback(payload)
