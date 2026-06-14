"""Saf yardimci fonksiyonlar (token/crypto/format/url/ticket/google/ms365 vb.).

main.py'dan ayiklandi (god-dosya bolme Adim 4c-1). Yalnizca stdlib/3rd-party +
config.settings + enums'a bagimli (model/db/app-modul/main-sinifina DEGIL) ->
dongusel import yok. main.py `from .utils import *` ile tekrar export eder.
"""

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
import zipfile
import uuid as _uuid_module
from datetime import datetime, timedelta, timezone
from datetime import date as date_type
from html import escape
from html.parser import HTMLParser
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import quote, urlencode, urlparse

import httpx
import jwt
import pandas as pd
from cryptography import x509
from cryptography.fernet import Fernet, InvalidToken
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.serialization import pkcs7
from fastapi import HTTPException
from fastapi.responses import JSONResponse, Response, StreamingResponse
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer
from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncSession

try:
    from PIL import Image as PILImage
except ImportError:
    PILImage = None  # type: ignore
try:
    import qrcode
    import qrcode.image.pil
except ImportError:
    qrcode = None  # type: ignore

from .config import settings
from .enums import Role, CertStatus, TxType, OrderStatus, AttendeeSource

__all__ = [
    "compute_hosting_ends",
    "ensure_utc",
    "_certificate_days_remaining",
    "build_attendee_verify_url",
    "_smtp_password_cipher",
    "_encrypt_smtp_password",
    "_encrypt_secret",
    "_google_sheets_redirect_uri",
    "_normalize_google_scopes",
    "_get_event_google_sheets_config",
    "_set_event_google_sheets_config",
    "_google_exchange_code_for_tokens",
    "_google_get_profile",
    "_google_json_request",
    "_sheet_safe_value",
    "_format_export_datetime",
    "_google_sheets_a1_range",
    "_google_sheets_default_sheet_name",
    "_ms365_excel_redirect_uri",
    "_normalize_ms365_scopes",
    "_get_event_ms365_excel_config",
    "_set_event_ms365_excel_config",
    "_ms365_exchange_code_for_tokens",
    "_ms365_get_profile",
    "_ms365_upload_workbook",
    "_safe_ms365_filename",
    "_certificate_png_rel_path",
    "_certificate_png_public_url",
    "create_access_token",
    "create_public_member_access_token",
    "create_partial_token",
    "_hash_api_key",
    "ensure_dirs",
    "local_path_from_url",
    "build_public_pdf_url",
    "build_certificate_verify_url",
    "build_linkedin_share_url",
    "bad_request",
    "_normalize_registration_answers",
    "_is_registration_field_condition_met",
    "_safe_cert_filename",
    "_sanitize_zip_path_part",
    "_safe_registration_document_name",
    "_normalize_oauth_next",
    "_normalize_oauth_frontend_origin",
    "_google_oauth_redirect_uri",
    "_non_empty_normalized_email",
    "_parse_event_reservation_datetime",
    "_extract_openai_response_text",
    "_event_team_invite_url",
    "_event_activity_label",
    "_legal_text_hash",
    "_cross_border_notice_text_for_audit",
    "_stamp_event_legal_versions",
    "_ticket_token_from_payload",
    "_ticket_public_url",
    "_apple_wallet_configured",
    "_load_x509_cert",
    "_make_pass_icon",
    "_wrap_text",
    "_ticket_status_theme",
    "_ticket_font",
    "_fit_text",
    "_draw_dashed_line",
    "_make_ticket_image",
    "_ticket_download_filename",
    "_build_public_survey_info",
    "_audit_csv_response",
    "_pdf_escape_text",
    "_minimal_pdf_response",
    "_google_calendar_event_datetime",
    "_pull_google_calendar_reservations",
    "_white_label_dns_target",
    "_white_label_verification_host",
]


def compute_hosting_ends(term: str) -> datetime:
    now = datetime.now(timezone.utc)
    if term == "monthly":
        return now + timedelta(days=30)
    return now + timedelta(days=365)


def ensure_utc(dt: Optional[datetime]) -> Optional[datetime]:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def _certificate_days_remaining(cert: "Certificate") -> Optional[int]:
    hosting_ends_at = ensure_utc(getattr(cert, "hosting_ends_at", None))
    if hosting_ends_at is None:
        return None
    remaining_seconds = (hosting_ends_at - datetime.now(timezone.utc)).total_seconds()
    return max(0, math.ceil(remaining_seconds / 86400))


def build_attendee_verify_url(*, event_id: str, token: str) -> str:
    return f"{settings.frontend_base_url.rstrip('/')}/events/{event_id}/verify-email?token={token}"


def _smtp_password_cipher() -> Fernet:
    key_material = hashlib.sha256(settings.email_token_secret.encode("utf-8")).digest()
    fernet_key = base64.urlsafe_b64encode(key_material)
    return Fernet(fernet_key)


def _encrypt_smtp_password(plaintext: str) -> str:
    raw = (plaintext or "").strip()
    if not raw:
        return ""
    token = _smtp_password_cipher().encrypt(raw.encode("utf-8")).decode("utf-8")
    return f"enc:v1:{token}"


def _encrypt_secret(plaintext: Optional[str]) -> Optional[str]:
    raw = (plaintext or "").strip()
    if not raw:
        return None
    return _encrypt_smtp_password(raw)


def _google_sheets_redirect_uri() -> str:
    return f"{settings.public_base_url.rstrip('/')}/api/admin/google/sheets/callback"


def _normalize_google_scopes(raw_scopes: Any) -> List[str]:
    if isinstance(raw_scopes, str):
        return [scope for scope in raw_scopes.split() if scope]
    if isinstance(raw_scopes, list):
        return [str(scope) for scope in raw_scopes if str(scope).strip()]
    return []


def _get_event_google_sheets_config(event: "Event") -> Dict[str, Any]:
    config = dict(event.config or {})
    sheets_config = config.get("google_sheets")
    return dict(sheets_config) if isinstance(sheets_config, dict) else {}


def _set_event_google_sheets_config(event: "Event", sheets_config: Optional[Dict[str, Any]]) -> None:
    next_config = dict(event.config or {})
    if sheets_config:
        next_config["google_sheets"] = sheets_config
    else:
        next_config.pop("google_sheets", None)
    event.config = next_config


async def _google_exchange_code_for_tokens(code: str, redirect_uri: str) -> Dict[str, Any]:
    async with httpx.AsyncClient(timeout=15.0) as client:
        token_res = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "code": code,
                "client_id": settings.google_oauth_client_id,
                "client_secret": settings.google_oauth_client_secret,
                "redirect_uri": redirect_uri,
                "grant_type": "authorization_code",
            },
        )
    if token_res.status_code >= 400:
        raise HTTPException(status_code=400, detail="Google token exchange failed.")
    return token_res.json()


async def _google_get_profile(access_token: str) -> Dict[str, Any]:
    async with httpx.AsyncClient(timeout=10.0) as client:
        userinfo_res = await client.get(
            "https://openidconnect.googleapis.com/v1/userinfo",
            headers={"Authorization": f"Bearer {access_token}"},
        )
    if userinfo_res.status_code >= 400:
        raise HTTPException(status_code=400, detail="Google profile could not be read.")
    return userinfo_res.json()


async def _google_json_request(
    access_token: str,
    method: str,
    url: str,
    *,
    json_body: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    async with httpx.AsyncClient(timeout=20.0) as client:
        res = await client.request(
            method,
            url,
            headers={"Authorization": f"Bearer {access_token}"},
            json=json_body,
    )
    if res.status_code >= 400:
        detail = "Google request failed."
        try:
            detail = res.json().get("error", {}).get("message") or detail
        except Exception:
            pass
        raise HTTPException(status_code=502, detail=detail)
    if not res.content:
        return {}
    return res.json()


def _sheet_safe_value(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, (str, int, float, bool)):
        return str(value)
    if isinstance(value, list):
        return ", ".join(_sheet_safe_value(item) for item in value)
    return json.dumps(value, ensure_ascii=False)


def _format_export_datetime(value: Optional[datetime]) -> str:
    if value is None:
        return ""
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc).strftime("%d.%m.%Y %H:%M:%S UTC")


def _google_sheets_a1_range(sheet_name: str, cell_range: str = "A1") -> str:
    safe_sheet_name = sheet_name.replace("'", "''")
    if any(char in safe_sheet_name for char in (" ", "!", ":", ",", "(", ")")):
        safe_sheet_name = f"'{safe_sheet_name}'"
    return quote(f"{safe_sheet_name}!{cell_range}", safe="")


def _google_sheets_default_sheet_name(spreadsheet_metadata: Dict[str, Any]) -> str:
    sheets = spreadsheet_metadata.get("sheets")
    if isinstance(sheets, list) and sheets:
        first_sheet = sheets[0]
        if isinstance(first_sheet, dict):
            properties = first_sheet.get("properties")
            if isinstance(properties, dict):
                title = properties.get("title")
                if title:
                    return str(title)
    return "Sheet1"


def _ms365_excel_redirect_uri() -> str:
    return f"{settings.public_base_url.rstrip('/')}/api/admin/microsoft/excel/callback"


def _normalize_ms365_scopes(raw_scopes: Any) -> List[str]:
    if isinstance(raw_scopes, str):
        return [scope for scope in raw_scopes.split() if scope]
    if isinstance(raw_scopes, list):
        return [str(scope) for scope in raw_scopes if str(scope).strip()]
    return []


def _get_event_ms365_excel_config(event: "Event") -> Dict[str, Any]:
    config = dict(event.config or {})
    excel_config = config.get("ms365_excel")
    return dict(excel_config) if isinstance(excel_config, dict) else {}


def _set_event_ms365_excel_config(event: "Event", excel_config: Optional[Dict[str, Any]]) -> None:
    next_config = dict(event.config or {})
    if excel_config:
        next_config["ms365_excel"] = excel_config
    else:
        next_config.pop("ms365_excel", None)
    event.config = next_config


async def _ms365_exchange_code_for_tokens(code: str, redirect_uri: str) -> Dict[str, Any]:
    async with httpx.AsyncClient(timeout=15.0) as client:
        token_res = await client.post(
            "https://login.microsoftonline.com/common/oauth2/v2.0/token",
            data={
                "code": code,
                "client_id": settings.ms365_oauth_client_id,
                "client_secret": settings.ms365_oauth_client_secret,
                "redirect_uri": redirect_uri,
                "grant_type": "authorization_code",
            },
        )
    if token_res.status_code >= 400:
        try:
            err_body = token_res.json()
            ms_error = err_body.get("error_description") or err_body.get("error") or "unknown"
        except Exception:
            ms_error = token_res.text[:200]
        raise HTTPException(status_code=400, detail=f"Microsoft token exchange failed: {ms_error}")
    return token_res.json()


async def _ms365_get_profile(access_token: str) -> Dict[str, Any]:
    async with httpx.AsyncClient(timeout=10.0) as client:
        profile_res = await client.get(
            "https://graph.microsoft.com/v1.0/me",
            headers={"Authorization": f"Bearer {access_token}"},
        )
    if profile_res.status_code >= 400:
        raise HTTPException(status_code=400, detail="Microsoft profile could not be read.")
    return profile_res.json()


async def _ms365_upload_workbook(access_token: str, workbook_bytes: bytes, *, workbook_id: str = "", filename: str = "") -> Dict[str, Any]:
    if workbook_id:
        url = f"https://graph.microsoft.com/v1.0/me/drive/items/{workbook_id}/content"
    else:
        safe_filename = quote(filename or "HeptaCert Registrations.xlsx", safe="")
        url = f"https://graph.microsoft.com/v1.0/me/drive/root:/{safe_filename}:/content"
    async with httpx.AsyncClient(timeout=30.0) as client:
        res = await client.put(
            url,
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            },
            content=workbook_bytes,
        )
    if res.status_code >= 400:
        detail = "Microsoft Excel request failed."
        try:
            detail = res.json().get("error", {}).get("message") or detail
        except Exception:
            pass
        raise HTTPException(status_code=502, detail=detail)
    return res.json()


def _safe_ms365_filename(value: str) -> str:
    cleaned = re.sub(r'[<>:"/\\|*\x00-\x1F]', "-", value).strip().strip(".")
    return cleaned[:180] or "HeptaCert Registrations.xlsx"


def _certificate_png_rel_path(event_id: int, cert_uuid: str) -> str:
    return f"pngs/event_{event_id}/{cert_uuid}.png"


def _certificate_png_public_url(event_id: int, cert_uuid: str) -> Optional[str]:
    rel_png_path = _certificate_png_rel_path(event_id, cert_uuid)
    abs_png_path = Path(settings.local_storage_dir) / rel_png_path
    if not abs_png_path.exists():
        return None
    return build_public_pdf_url(rel_png_path)


def create_access_token(*, user_id: int, role: Role) -> str:
    now = datetime.now(timezone.utc)
    exp = now + timedelta(minutes=settings.jwt_expires_minutes)
    payload = {"sub": str(user_id), "role": role.value, "iat": int(now.timestamp()), "exp": exp}
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")


def create_public_member_access_token(*, member_id: int) -> str:
    now = datetime.now(timezone.utc)
    exp = now + timedelta(minutes=settings.jwt_expires_minutes)
    payload = {"sub": str(member_id), "scope": "public_member", "iat": int(now.timestamp()), "exp": exp}
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")


def create_partial_token(*, user_id: int) -> str:
    """Short-lived token issued after password check when 2FA is required."""
    now = datetime.now(timezone.utc)
    exp = now + timedelta(seconds=120)
    payload = {"sub": str(user_id), "partial": True, "iat": int(now.timestamp()), "exp": exp}
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")


def _hash_api_key(key: str) -> str:
    return hashlib.sha256(key.encode()).hexdigest()


def ensure_dirs():
    base = Path(settings.local_storage_dir)
    (base / "templates").mkdir(parents=True, exist_ok=True)
    (base / "pdfs").mkdir(parents=True, exist_ok=True)


def local_path_from_url(url_or_path: str) -> Path:
    """Convert a public stored asset URL or relative path to a local path."""
    storage_root = Path(settings.local_storage_dir).resolve()
    if url_or_path.startswith(("http://", "https://")):
        # Extract relative part after /api/files/
        marker = "/api/files/"
        idx = url_or_path.find(marker)
        if idx != -1:
            rel = url_or_path[idx + len(marker):]
            candidate = storage_root / rel
        else:
            candidate = storage_root / url_or_path.rsplit("/", 1)[-1]
    else:
        p = Path(url_or_path)
        candidate = p if p.is_absolute() else storage_root / p
    resolved = candidate.resolve()
    if not resolved.is_relative_to(storage_root):
        raise ValueError("Stored asset path is outside local storage")
    top_level = resolved.relative_to(storage_root).parts[0].lower() if resolved != storage_root else ""
    if top_level in {"registration_docs", "zips"}:
        raise ValueError("Private storage object cannot be used as a public asset")
    return resolved


def build_public_pdf_url(rel_path: str) -> str:
    return f"{settings.public_base_url}/api/files/{rel_path}"


def build_certificate_verify_url(
    cert_uuid: str,
    host: str | None = None,
    scheme: str = "https",
    verification_path: str | None = None,
) -> str:
    path = (verification_path or "/verify").strip()
    if not path.startswith("/"):
        path = "/" + path

    if host:
        return f"{scheme}://{host}{path.rstrip('/')}/{cert_uuid}"

    return f"{settings.frontend_base_url.rstrip('/')}{path.rstrip('/')}/{cert_uuid}"


def build_linkedin_share_url(target_url: str, text: str = "") -> str:
    if not target_url:
        return ""
    query = f"url={quote(target_url, safe='')}"
    if text:
        query += f"&summary={quote(text, safe='')}"
    return f"https://www.linkedin.com/sharing/share-offsite/?{query}"


def bad_request(msg: str) -> HTTPException:
    return HTTPException(status_code=400, detail=msg)


def _normalize_registration_answers(
    registration_fields: List[Dict[str, Any]],
    raw_answers: Any,
) -> Dict[str, Any]:
    raw_map = raw_answers if isinstance(raw_answers, dict) else {}
    normalized: Dict[str, Any] = {}

    for field in registration_fields:
        field_id = field["id"]
        if field.get("type") == "file":
            # File fields are validated via registration_documents payload.
            continue

        if field.get("type") == "select":
            options = field.get("options") or []
            # options may be list of dicts {label, capacity} or strings; normalize labels
            option_labels: List[str] = []
            for o in options:
                if isinstance(o, dict):
                    option_labels.append(str(o.get("label") or "").strip())
                else:
                    option_labels.append(str(o or "").strip())
            selection_mode = "multiple" if str(field.get("selection_mode") or "").strip().lower() == "multiple" else "single"
            raw_value = raw_map.get(field_id)

            if selection_mode == "multiple":
                if raw_value is None:
                    values: List[str] = []
                elif isinstance(raw_value, str):
                    stripped = raw_value.strip()
                    values = [stripped] if stripped else []
                elif isinstance(raw_value, (list, tuple, set)):
                    values = [str(item).strip()[:120] for item in raw_value if str(item).strip()]
                else:
                    raise bad_request(f'"{field["label"]}" alanı icin gecerli bir değer girin.')

                values = list(dict.fromkeys(values))[:30]
                invalid_values = [value for value in values if value not in option_labels]
                if invalid_values:
                    raise bad_request(f'"{field["label"]}" alanı icin gecerli secimler yapın.')

                is_required = bool(field.get("required")) or _is_registration_field_condition_met(field, raw_map)
                if is_required and not values:
                    raise bad_request(f'"{field["label"]}" alanı zorunludur.')

                if values:
                    normalized[field_id] = values
                continue

            if raw_value is None:
                value = ""
            elif isinstance(raw_value, str):
                value = raw_value.strip()
            elif isinstance(raw_value, (int, float, bool)):
                value = str(raw_value).strip()
            else:
                raise bad_request(f'"{field["label"]}" alanı icin gecerli bir değer girin.')

            is_required = bool(field.get("required")) or _is_registration_field_condition_met(field, raw_map)
            if is_required and not value:
                raise bad_request(f'"{field["label"]}" alanı zorunludur.')

            if not value:
                continue

            if value not in option_labels:
                raise bad_request(f'"{field["label"]}" alanı icin gecerli bir secim yapın.')

            normalized[field_id] = value[:1000]
            continue

        raw_value = raw_map.get(field_id, "")
        if raw_value is None:
            value = ""
        elif isinstance(raw_value, str):
            value = raw_value.strip()
        elif isinstance(raw_value, (int, float, bool)):
            value = str(raw_value).strip()
        else:
            raise bad_request(f'"{field["label"]}" alanı icin gecerli bir değer girin.')

        is_required = bool(field.get("required")) or _is_registration_field_condition_met(field, raw_map)
        if is_required and not value:
            raise bad_request(f'"{field["label"]}" alanı zorunludur.')

        if not value:
            continue

        normalized[field_id] = value[:1000]

    return normalized


def _is_registration_field_condition_met(field: Dict[str, Any], answers: Dict[str, Any]) -> bool:
    condition_field_id = str(field.get("required_when_field_id") or "").strip()
    condition_value = str(field.get("required_when_equals") or "").strip()
    if not condition_field_id or not condition_value:
        return False

    raw_value = answers.get(condition_field_id)
    if raw_value is None:
        return False

    if isinstance(raw_value, str):
        actual_value = raw_value.strip()
    elif isinstance(raw_value, (int, float, bool)):
        actual_value = str(raw_value).strip()
    elif isinstance(raw_value, (list, tuple, set)):
        normalized_values = [str(item).strip() for item in raw_value if str(item).strip()]
        return any(value.casefold() == condition_value.casefold() for value in normalized_values)
    else:
        return False

    return actual_value.casefold() == condition_value.casefold()


def _safe_cert_filename(student_name: str, public_id: str) -> str:
    base = f"{student_name}_{public_id}.pdf"
    return "".join(c if c.isalnum() or c in " _-." else "_" for c in base)


def _sanitize_zip_path_part(value: str, fallback: str = "item", max_len: int = 90) -> str:
    cleaned = "".join(c if c.isalnum() or c in "._-" else "_" for c in (value or "").strip())
    cleaned = cleaned.strip("._-")
    if not cleaned:
        cleaned = fallback
    return cleaned[:max_len]


def _safe_registration_document_name(raw_name: str, fallback: str = "document") -> str:
    filename = Path(raw_name or "").name or fallback
    stem = Path(filename).stem or fallback
    suffix = Path(filename).suffix[:12]
    safe_stem = _sanitize_zip_path_part(stem, fallback=fallback, max_len=100)
    safe_suffix = "".join(c if c.isalnum() or c == "." else "" for c in suffix)
    if safe_suffix and not safe_suffix.startswith("."):
        safe_suffix = f".{safe_suffix}"
    return f"{safe_stem}{safe_suffix}"[:130]


def _normalize_oauth_next(next_url: Optional[str], fallback: str) -> str:
    value = (next_url or "").strip()
    if value.startswith("/") and not value.startswith("//"):
        return value
    return fallback


def _normalize_oauth_frontend_origin(origin: Optional[str]) -> str:
    value = (origin or "").strip().rstrip("/")
    parsed = urlparse(value)
    configured_origin = settings.frontend_base_url.rstrip("/")
    public_origin = f"{urlparse(settings.public_base_url).scheme}://{urlparse(settings.public_base_url).netloc}".rstrip("/")
    allowed = {configured_origin, public_origin}
    for raw_origin in (settings.cors_origins or "").split(","):
        cleaned = raw_origin.strip().rstrip("/")
        if cleaned and cleaned != "*":
            allowed.add(cleaned)
    for host in ("localhost", "127.0.0.1"):
        for port in ("3000", "3030"):
            allowed.add(f"http://{host}:{port}")
    if parsed.scheme in {"http", "https"} and value in allowed:
        return value
    return configured_origin


def _google_oauth_redirect_uri() -> str:
    return f"{settings.public_base_url.rstrip('/')}/api/auth/google/callback"


def _non_empty_normalized_email(column_expr: Any) -> Any:
    normalized = func.lower(func.trim(column_expr))
    return normalized, func.trim(column_expr) != ""


def _parse_event_reservation_datetime(value: Any) -> Optional[datetime]:
    if isinstance(value, datetime):
        return value
    if not value:
        return None
    try:
        return datetime.fromisoformat(str(value))
    except ValueError:
        return None


def _extract_openai_response_text(data: Dict[str, Any]) -> str:
    output_text = data.get("output_text")
    if isinstance(output_text, str) and output_text.strip():
        return output_text.strip()
    parts: List[str] = []
    for item in data.get("output") or []:
        if not isinstance(item, dict):
            continue
        for content in item.get("content") or []:
            if isinstance(content, dict):
                text = content.get("text")
                if isinstance(text, str):
                    parts.append(text)
    return "\n".join(parts).strip()


def _event_team_invite_url(token: str) -> str:
    return f"{settings.frontend_base_url.rstrip('/')}/admin/team-invite?token={token}"


def _event_activity_label(action: str) -> tuple[str, str]:
    labels = {
        "team.member.invited": ("Ekip daveti gonderildi", "Bir kisiye etkinlik ekibi daveti gonderildi."),
        "team.member.added": ("Ekip uyesi eklendi", "Bir kisiye etkinlik ekibi erisimi verildi."),
        "team.member.accepted": ("Ekip daveti kabul edildi", "Bir ekip uyesi daveti kabul etti."),
        "team.member.updated": ("Ekip yetkisi guncellendi", "Bir ekip uyesinin rolu, durumu veya izinleri degistirildi."),
        "team.member.removed": ("Ekip uyesi kaldirildi", "Bir kisinin etkinlik ekibi erisimi kaldirildi."),
        "attendee.manual_add": ("Katılımcı eklendi", "Etkinliğe elle katılımcı eklendi."),
        "admin.comment.update": ("Yorum durumu degistirildi", "Etkinlik yorumlarindan birinin gorunurluk durumu guncellendi."),
        "raffle.create": ("Cekilis olusturuldu", "Etkinlik icin yeni cekilis olusturuldu."),
        "raffle.update": ("Cekilis guncellendi", "Cekilis bilgileri degistirildi."),
        "raffle.delete": ("Çekiliş silindi", "Bir çekiliş etkinlikten kaldırıldı."),
        "raffle.draw": ("Cekilis yapildi", "Cekilis kazananlari belirlendi."),
        "raffle.redraw": ("Cekilis yenilendi", "Cekilis yeniden calistirildi."),
        "raffle.export": ("Cekilis sonucu indirildi", "Cekilis sonuc dosyasi olusturuldu."),
        "raffle.reset": ("Cekilis sifirlandi", "Cekilis sonuclari temizlendi."),
    }
    return labels.get(action, ("Etkinlik islemi", "Etkinlik uzerinde bir islem yapildi."))


def _legal_text_hash(value: Optional[str]) -> str:
    normalized = re.sub(r"\s+", " ", (value or "").strip())
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


def _cross_border_notice_text_for_audit(lang: str = "tr") -> str:
    if lang == "en":
        return (
            "Some services used by HeptaCert may be delivered through servers located outside the country. "
            "Personal data may be processed by overseas infrastructure services for service delivery, security, "
            "backup, and continuity purposes."
        )
    return (
        "HeptaCert altyapisinda kullanilan bazi hizmetler yurt disinda bulunan sunucular uzerinden saglanabilir. "
        "Kisisel veriler hizmetin sunulmasi, guvenlik, yedekleme ve sistem surekliligi amaclariyla yurt disindaki "
        "altyapi hizmetlerinde islenebilir."
    )


def _stamp_event_legal_versions(config: Dict[str, Any]) -> Dict[str, Any]:
    next_config = dict(config or {})
    current = dict(next_config.get("legal_versions") or {})
    changed = False
    tracked = {
        "kvkk_consent_text": str(next_config.get("kvkk_consent_text") or ""),
        "organizer_privacy_notice_text": str(next_config.get("organizer_privacy_notice_text") or ""),
        "cross_border_notice_text": _cross_border_notice_text_for_audit(),
    }
    for key, text in tracked.items():
        digest = _legal_text_hash(text)
        existing = dict(current.get(key) or {})
        if existing.get("hash") != digest:
            current[key] = {
                "hash": digest,
                "version": int(existing.get("version") or 0) + 1,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
            changed = True
    if changed:
        next_config["legal_versions"] = current
    return next_config


def _ticket_token_from_payload(raw_value: str) -> str:
    value = str(raw_value or "").strip()
    if not value:
        return value
    if "/tickets/" in value:
        value = value.rsplit("/tickets/", 1)[-1]
    return value.split("?", 1)[0].split("#", 1)[0].strip()


def _ticket_public_url(token: str) -> str:
    return f"{settings.frontend_base_url.rstrip('/')}/tickets/{token}"


def _apple_wallet_configured() -> bool:
    required = [
        settings.apple_wallet_pass_type_id,
        settings.apple_wallet_team_id,
        settings.apple_wallet_cert_path,
        settings.apple_wallet_key_path,
        settings.apple_wallet_wwdr_cert_path,
    ]
    if not all(required):
        return False
    return all(
        Path(path).expanduser().exists()
        for path in [
            settings.apple_wallet_cert_path,
            settings.apple_wallet_key_path,
            settings.apple_wallet_wwdr_cert_path,
        ]
    )


def _load_x509_cert(path: str) -> x509.Certificate:
    data = Path(path).expanduser().read_bytes()
    try:
        return x509.load_pem_x509_certificate(data)
    except ValueError:
        return x509.load_der_x509_certificate(data)


def _make_pass_icon(size: int) -> bytes:
    if PILImage is None:
        raise HTTPException(status_code=503, detail="Wallet icon generation is not available")
    img = PILImage.new("RGB", (size, size), "#111827")
    inner_margin = max(4, size // 8)
    inner = PILImage.new("RGB", (size - inner_margin * 2, size - inner_margin * 2), "#2563eb")
    img.paste(inner, (inner_margin, inner_margin))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def _wrap_text(draw: Any, text: str, font: Any, max_width: int) -> List[str]:
    words = str(text or "").split()
    if not words:
        return []
    lines: List[str] = []
    current = words[0]
    for word in words[1:]:
        candidate = f"{current} {word}"
        bbox = draw.textbbox((0, 0), candidate, font=font)
        if bbox[2] - bbox[0] <= max_width:
            current = candidate
        else:
            lines.append(current)
            current = word
    lines.append(current)
    return lines


def _ticket_status_theme(status: str) -> tuple[str, str, str]:
    # (Metin, Yazı Rengi, Arkaplan Rengi)
    if status in {"cancelled", "revoked"}:
        return "İptal Edildi", "#dc2626", "#fef2f2"  # Red
    if status == "used":
        return "Kullanıldı", "#71717a", "#f4f4f5"    # Zinc
    return "Girişe Hazır", "#2563eb", "#eff6ff"      # Blue


def _ticket_font(size: int, bold: bool = False) -> Any:
    from PIL import ImageFont

    candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
        "C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf",
        "C:/Windows/Fonts/ARIALBD.TTF" if bold else "C:/Windows/Fonts/ARIAL.TTF",
        "arialbd.ttf" if bold else "arial.ttf",
        "Arial Bold.ttf" if bold else "Arial.ttf",
    ]
    for candidate in candidates:
        try:
            return ImageFont.truetype(candidate, size)
        except Exception:
            continue
    return ImageFont.load_default()


def _fit_text(text: str, max_chars: int) -> str:
    clean = " ".join(str(text or "").split())
    if len(clean) <= max_chars:
        return clean
    return clean[: max(1, max_chars - 1)].rstrip() + "..."


def _draw_dashed_line(draw: Any, xy: tuple[int, int, int, int], fill: str, width: int = 2, dash: int = 14, gap: int = 12) -> None:
    x1, y1, x2, y2 = xy
    if x1 == x2:
        y = y1
        while y < y2:
            draw.line((x1, y, x2, min(y + dash, y2)), fill=fill, width=width)
            y += dash + gap
        return
    x = x1
    while x < x2:
        draw.line((x, y1, min(x + dash, x2), y2), fill=fill, width=width)
        x += dash + gap


def _make_ticket_image(ticket: 'EventTicket') -> bytes:
    if PILImage is None or qrcode is None:
        raise HTTPException(status_code=503, detail="Ticket image generation is not available")
    from PIL import ImageDraw

    width, height = 900, 1420
    # iOS Arka plan rengi
    image = PILImage.new("RGB", (width, height), "#f5f5f7")
    draw = ImageDraw.Draw(image)

    # Yeni font sistemiyle boyutları premium tasarıma gre ayarlıyoruz
    title_font = _ticket_font(52, bold=True)
    body_font = _ticket_font(36, bold=True)
    small_font = _ticket_font(28)
    label_font = _ticket_font(22, bold=True)

    # 1. Ana Bilet Kartı (Geniş kşeli, saf temiz gorunum)
    card_margin = 60
    draw.rounded_rectangle(
        (card_margin, 60, width - card_margin, height - 60), 
        radius=64, 
        fill="#ffffff"
    )

    # 2. st Kısım: İkon ve Etkinlik Başlığı
    # İkon Yuvarlağı
    # Icon circle (background)
    icon_radius = 45
    icon_top = 120
    cx = width // 2
    draw.ellipse((cx - icon_radius, icon_top, cx + icon_radius, icon_top + icon_radius * 2), fill="#f4f4f5")

    # Use only locally stored logos; fetching arbitrary URLs here would enable SSRF.
    logo_used = False
    logo_source = getattr(ticket.event, "brand_logo", None)
    if logo_source:
        try:
            storage_root = Path(settings.local_storage_dir).resolve()
            logo_path = local_path_from_url(str(logo_source)).resolve()
            if logo_path.is_relative_to(storage_root) and logo_path.is_file():
                logo_img = PILImage.open(logo_path).convert("RGBA")
                # fit inside circle with slight padding
                target_size = (icon_radius * 2 - 12, icon_radius * 2 - 12)
                logo_img = logo_img.resize(target_size, PILImage.LANCZOS)

                # circular mask
                mask = PILImage.new("L", logo_img.size, 0)
                mdraw = ImageDraw.Draw(mask)
                mdraw.ellipse((0, 0, logo_img.size[0], logo_img.size[1]), fill=255)

                paste_x = cx - logo_img.size[0] // 2
                paste_y = icon_top + (icon_radius * 2 - logo_img.size[1]) // 2
                image.paste(logo_img, (paste_x, paste_y), mask)
                logo_used = True
        except Exception:
            logo_used = False

    if not logo_used:
        # Fallback: render a short text label; use a smaller bold font for crispness
        draw.text((cx, icon_top + icon_radius), "HeptaCert", fill="#18181b", font=_ticket_font(28, bold=True), anchor="mm")
    
    # Dijital Bilet Etiketi
    draw.text((width // 2, 260), "DİJİTAL BİLET", fill="#a1a1aa", font=label_font, anchor="mm")

    # Başlık (Sarma)
    y = 320
    # Satır yksekliği dinamik hesaplanır
    bbox_test = draw.textbbox((0, 0), "Test", font=title_font)
    line_height = (bbox_test[3] - bbox_test[1]) + 20

    for line in _wrap_text(draw, ticket.event.name, title_font, 700)[:3]:
        draw.text((width // 2, y), line, fill="#18181b", font=title_font, anchor="mm")
        y += line_height

    # 3. Orta Kısım: QR Kod
    qr_y = y + 40
    qr = qrcode.QRCode(
        version=2,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=12,
        border=2,
    )
    qr.add_data(ticket.qr_payload)
    qr.make(fit=True)
    
    # QR kodunu koyu gri (Zinc 900) bir tonla ciziyoruz
    qr_img = qr.make_image(fill_color="#18181b", back_color="white").convert("RGB").resize((420, 420))
    qr_x = (width - 420) // 2
    
    # QR erevesi (Hafif gri border)
    draw.rounded_rectangle((qr_x - 24, qr_y - 24, qr_x + 444, qr_y + 444), radius=36, fill="#ffffff", outline="#e4e4e7", width=2)
    image.paste(qr_img, (qr_x, qr_y))

    # 4. Durum Rozeti (Pill)
    pill_y = qr_y + 490
    status_text, text_color, bg_color = _ticket_status_theme(ticket.status)
    
    # Rozet genişliğini metne gre dinamik ayarlıyoruz
    bbox_status = draw.textbbox((0, 0), status_text, font=small_font)
    text_w = bbox_status[2] - bbox_status[0]
    pill_w = text_w + 80  # Sağ/sol padding
    
    draw.rounded_rectangle(((width - pill_w) // 2, pill_y, (width + pill_w) // 2, pill_y + 64), radius=32, fill=bg_color)
    draw.text((width // 2, pill_y + 32), status_text, fill=text_color, font=small_font, anchor="mm")

    # 5. Bilet Kesik Ayırıcısı (Apple Wallet Stili)
    divider_y = pill_y + 120
    cutout_radius = 40
    
    # Sol ve Sağ Czdan Kesikleri
    draw.ellipse((card_margin - cutout_radius, divider_y - cutout_radius, card_margin + cutout_radius, divider_y + cutout_radius), fill="#f5f5f7")
    draw.ellipse((width - card_margin - cutout_radius, divider_y - cutout_radius, width - card_margin + cutout_radius, divider_y + cutout_radius), fill="#f5f5f7")
    
    # Kesik (Dashed) izgi - Senin fonksiyonunla iziliyor
    start_x = card_margin + cutout_radius + 15
    end_x = width - card_margin - cutout_radius - 15
    _draw_dashed_line(draw, (start_x, divider_y, end_x, divider_y), fill="#e4e4e7", width=3, dash=16, gap=16)

    # 6. Alt Kısım: Detaylar
    details_y = divider_y + 60
    
    # Katılımcı Blm
    draw.text((130, details_y), "Katılımcı", fill="#a1a1aa", font=label_font)
    draw.text((130, details_y + 40), _fit_text(ticket.attendee.name, 24), fill="#18181b", font=body_font)
    draw.text((130, details_y + 95), _fit_text(ticket.attendee.email, 30), fill="#71717a", font=small_font)
    
    # Tarih Blm
    if ticket.event.event_date:
        draw.text((540, details_y), "Tarih", fill="#a1a1aa", font=label_font)
        
        date_obj = ticket.event.event_date
        date_str = date_obj.strftime("%d.%m.%Y") if hasattr(date_obj, 'strftime') else str(date_obj)[:10]
        time_str = date_obj.strftime("%H:%M") if hasattr(date_obj, 'strftime') else str(date_obj)[11:16]
        
        draw.text((540, details_y + 40), date_str, fill="#18181b", font=body_font)
        if time_str:
            draw.text((540, details_y + 95), time_str, fill="#71717a", font=small_font)

    buf = io.BytesIO()
    image.save(buf, format="PNG")
    return buf.getvalue()


def _ticket_download_filename(ticket: 'EventTicket', ext: str) -> str:
    event_slug = re.sub(r"[^A-Za-z0-9_-]+", "-", ticket.event.name).strip("-") or "event"
    return f"{event_slug}-{ticket.id}.{ext}"


def _build_public_survey_info(survey: Optional["EventSurvey"]) -> Optional[Dict[str, Any]]:
    if not survey or survey.survey_type == "disabled":
        return None
    builtin_questions = survey.builtin_questions or []
    return {
        "is_required": bool(survey.is_required),
        "survey_type": survey.survey_type,
        "external_url": survey.external_url,
        "has_builtin_questions": len(builtin_questions) > 0,
        "builtin_questions": builtin_questions,
    }


def _audit_csv_response(rows: List[Dict[str, Any]], filename: str) -> StreamingResponse:
    buffer = io.StringIO()
    fieldnames = ["id", "created_at", "user_email", "action", "resource_type", "resource_id", "ip_address", "details", "extra"]
    writer = csv.DictWriter(buffer, fieldnames=fieldnames)
    writer.writeheader()
    for row in rows:
        writer.writerow({key: json.dumps(row.get(key), ensure_ascii=False) if key == "extra" else row.get(key, "") for key in fieldnames})
    buffer.seek(0)
    return StreamingResponse(
        iter([buffer.getvalue().encode("utf-8-sig")]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


def _pdf_escape_text(value: Any) -> str:
    text = str(value if value is not None else "")
    return text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def _minimal_pdf_response(rows: List[Dict[str, Any]], title: str, filename: str) -> Response:
    from .document_outputs import render_log_document_pdf_bytes

    pdf = render_log_document_pdf_bytes(
        title=title,
        intro="This document was automatically generated from HeptaCert system records.",
        summary={
            "Generated at": datetime.now(timezone.utc).isoformat(),
            "Record count": len(rows),
            "Output type": "Official log PDF",
        },
        records=rows,
        columns=["id", "created_at", "user_email", "action", "resource_type", "resource_id", "ip_address", "details"],
    )
    return Response(
        pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


def _google_calendar_event_datetime(value: Dict[str, Any]) -> Optional[datetime]:
    raw = value.get("dateTime") or value.get("date")
    if not raw:
        return None
    try:
        parsed = datetime.fromisoformat(str(raw).replace("Z", "+00:00"))
    except ValueError:
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed


async def _pull_google_calendar_reservations(
    db: AsyncSession,
    access_token: str,
    organization_id: int,
    reservations_by_id: Dict[int, Any],
) -> int:
    if not reservations_by_id:
        return 0
    params = urlencode(
        {
            "singleEvents": "true",
            "showDeleted": "false",
            "maxResults": "250",
            "privateExtendedProperty": "heptacert_source=venue_reservation",
        }
    )
    payload = await _google_json_request(
        access_token,
        "GET",
        f"https://www.googleapis.com/calendar/v3/calendars/primary/events?{params}",
    )
    pulled = 0
    for item in payload.get("items") or []:
        private = ((item.get("extendedProperties") or {}).get("private") or {})
        if str(private.get("heptacert_organization_id") or "") != str(organization_id):
            continue
        try:
            reservation_id = int(private.get("heptacert_reservation_id") or 0)
        except (TypeError, ValueError):
            continue
        reservation = reservations_by_id.get(reservation_id)
        if not reservation or reservation.external_event_id != item.get("id"):
            continue
        start_at = _google_calendar_event_datetime(item.get("start") or {})
        end_at = _google_calendar_event_datetime(item.get("end") or {})
        if not start_at or not end_at or end_at <= start_at:
            continue
        reservation.title = str(item.get("summary") or reservation.title)[:200]
        reservation.description = str(item.get("description") or "")[:2000] or None
        reservation.start_at = start_at
        reservation.end_at = end_at
        pulled += 1
    return pulled


def _white_label_dns_target() -> str:
    parsed = urlparse(settings.frontend_base_url)
    return (parsed.hostname or settings.frontend_base_url.replace("https://", "").replace("http://", "").split("/", 1)[0]).strip()


def _white_label_verification_host(domain: Optional[str]) -> Optional[str]:
    return f"_heptacert-verify.{domain}" if domain else None
