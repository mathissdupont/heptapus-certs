"""Shared email template variables and rendering helpers."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from urllib.parse import quote

from jinja2 import Template


def _event_identifier(event: Any) -> str:
    return str(getattr(event, "public_id", None) or getattr(event, "id", "") or "").strip()


def _front_base(settings: Any) -> str:
    return str(getattr(settings, "frontend_base_url", "") or getattr(settings, "public_base_url", "")).rstrip("/")


def certificate_verify_url(settings: Any, cert_uuid: str | None) -> str:
    if not cert_uuid:
        return ""
    return f"{_front_base(settings)}/verify/{cert_uuid}"


def linkedin_share_url(target_url: str, text: str = "") -> str:
    if not target_url:
        return ""
    query = f"url={quote(target_url, safe='')}"
    if text:
        query += f"&summary={quote(text, safe='')}"
    return f"https://www.linkedin.com/sharing/share-offsite/?{query}"


def build_email_template_vars(
    *,
    settings: Any,
    event: Any,
    attendee: Any | None = None,
    certificate: Any | None = None,
    cert_uuid: str | None = None,
    recipient_name: str | None = None,
    recipient_email: str | None = None,
    survey_link: str | None = None,
    unsubscribe_url: str | None = None,
) -> dict[str, Any]:
    public_event_id = _event_identifier(event)
    cert_id = cert_uuid or getattr(certificate, "uuid", None)
    cert_link = certificate_verify_url(settings, cert_id)
    event_link = f"{_front_base(settings)}/events/{public_event_id}/register" if public_event_id else _front_base(settings)
    name = recipient_name or getattr(attendee, "name", None) or "Katılımcı"
    email = recipient_email or getattr(attendee, "email", None) or ""
    event_name = getattr(event, "name", None) or "HeptaCert"
    event_date = getattr(event, "event_date", None)
    if event_date and hasattr(event_date, "isoformat"):
        event_date_value = event_date.isoformat()
    else:
        event_date_value = "TBD"
    event_location = getattr(event, "event_location", None) or "Online"
    share_text = f"{event_name} sertifikamı HeptaCert üzerinden doğrulanabilir şekilde paylaşıyorum."
    certificate_public_id = getattr(certificate, "public_id", None) or cert_id or ""

    return {
        "recipient_name": name,
        "recipient_email": email,
        "event_name": event_name,
        "event_date": event_date_value,
        "event_location": event_location,
        "event_link": event_link,
        "registration_link": event_link,
        "certificate_link": cert_link or event_link,
        "certificate_verify_url": cert_link or event_link,
        "certificate_pdf_url": getattr(certificate, "pdf_url", None) or cert_link or event_link,
        "certificate_png_url": getattr(certificate, "image_url", None) or getattr(certificate, "png_url", None) or cert_link or event_link,
        "certificate_public_id": certificate_public_id,
        "certificate_uuid": cert_id or "",
        "linkedin_share_link": linkedin_share_url(cert_link or event_link, share_text),
        "linkedin_share_url": linkedin_share_url(cert_link or event_link, share_text),
        "wallet_link": f"{_front_base(settings)}/profile",
        "survey_link": survey_link or event_link,
        "unsubscribe_url": unsubscribe_url or "",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "logo_url": f"{_front_base(settings)}/static/images/email-logo.png",
    }


def render_template_string(source: str | None, variables: dict[str, Any]) -> str:
    return Template(source or "").render(**variables)
