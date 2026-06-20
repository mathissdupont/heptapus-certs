"""Presentation deck API.

Users can create AI-assisted or manual slide decks, edit slide JSON, and export
PowerPoint files without coupling the feature to the legacy LMS code.
"""

from __future__ import annotations

import json
import secrets
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

import jwt
from fastapi import APIRouter, Depends, File, Form, Header, HTTPException, Query, Request, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from .ai_content_api import _claude
from .main import CurrentUser, Organization, Role, get_current_user, get_db, require_role, settings, write_audit_log
from .models import Event, User
from .organization_access_api import get_organization_for_access, organization_id_from_request
from .presentation_converter import is_powerpoint_path
from .presentation_models import PresentationDeck
from .presentation_renderer import render_deck_pptx

router = APIRouter(prefix="/api/admin/presentations", tags=["presentations"])
public_router = APIRouter(prefix="/api/public/presentations", tags=["public-presentations"])

ALLOWED_UPLOAD_TYPES = {
    "application/pdf": ".pdf",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": ".pptx",
    "application/vnd.ms-powerpoint": ".ppt",
}
UPLOAD_MEDIA_TYPES_BY_SUFFIX = {suffix: media_type for media_type, suffix in ALLOWED_UPLOAD_TYPES.items()}
MAX_UPLOAD_BYTES = 80 * 1024 * 1024
PRESENTATION_DECK_COLUMNS = [
    "id",
    "organization_id",
    "event_id",
    "created_by",
    "title",
    "description",
    "language",
    "theme",
    "slides",
    "presenter_token",
    "source",
    "status",
    "file_path",
    "file_filename",
    "file_content_type",
    "file_size",
    "converted_file_path",
    "converted_file_filename",
    "conversion_status",
    "conversion_error",
    "conversion_attempts",
    "last_export_path",
    "last_export_filename",
    "created_at",
    "updated_at",
]


class SlideIn(BaseModel):
    title: str = Field(default="", max_length=180)
    layout: str = Field(default="bullets", max_length=32)
    subtitle: Optional[str] = Field(default=None, max_length=260)
    body: Optional[str] = Field(default=None, max_length=1800)
    bullets: list[str] = Field(default_factory=list, max_length=12)
    notes: Optional[str] = Field(default=None, max_length=2000)
    background: Optional[str] = Field(default=None, max_length=24)


class DeckCreateIn(BaseModel):
    title: str = Field(..., min_length=1, max_length=220)
    description: Optional[str] = Field(default=None, max_length=1000)
    language: str = Field(default="tr", max_length=8)
    theme: dict[str, Any] = Field(default_factory=dict)
    slides: list[SlideIn] = Field(default_factory=list, max_length=40)


class DeckUpdateIn(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=220)
    description: Optional[str] = Field(default=None, max_length=1000)
    language: Optional[str] = Field(default=None, max_length=8)
    theme: Optional[dict[str, Any]] = None
    slides: Optional[list[SlideIn]] = Field(default=None, max_length=60)
    status: Optional[str] = Field(default=None, max_length=24)


class DeckGenerateIn(BaseModel):
    topic: str = Field(..., min_length=3, max_length=240)
    audience: str = Field(default="profesyonel", max_length=160)
    slide_count: int = Field(default=6, ge=3, le=15)
    language: str = Field(default="tr", max_length=8)
    style: str = Field(default="modern ve sade", max_length=160)
    extra_notes: Optional[str] = Field(default=None, max_length=1200)


class DeckOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    organization_id: int
    event_id: Optional[int] = None
    created_by: Optional[int]
    title: str
    description: Optional[str]
    language: str
    theme: dict[str, Any]
    slides: list[dict[str, Any]]
    source: str
    status: str
    file_filename: Optional[str] = None
    file_content_type: Optional[str] = None
    file_size: Optional[int] = None
    converted_file_filename: Optional[str] = None
    conversion_status: str = "not_required"
    conversion_error: Optional[str] = None
    conversion_attempts: int = 0
    last_export_filename: Optional[str]
    created_at: datetime
    updated_at: datetime
    export_url: Optional[str] = None
    file_url: Optional[str] = None
    converted_file_url: Optional[str] = None
    presenter_url: Optional[str] = None


class PublicDeckOut(BaseModel):
    title: str
    description: Optional[str]
    language: str
    theme: dict[str, Any]
    slides: list[dict[str, Any]]


async def _presentation_deck_existing_columns(db: AsyncSession) -> set[str]:
    result = await db.execute(
        text(
            """
            SELECT column_name
            FROM information_schema.columns
            WHERE table_schema = current_schema()
              AND table_name = 'presentation_decks'
            """
        )
    )
    return {str(row[0]) for row in result.all()}


def _deck_out_from_row(row: Any) -> DeckOut:
    data = row._mapping if hasattr(row, "_mapping") else row
    created_at = data.get("created_at") or datetime.now(timezone.utc)
    updated_at = data.get("updated_at") or created_at
    file_path = data.get("file_path")
    converted_file_path = data.get("converted_file_path")
    last_export_path = data.get("last_export_path")
    event_id = data.get("event_id")
    presenter_token = data.get("presenter_token")
    deck_id = data["id"]
    return DeckOut(
        id=deck_id,
        organization_id=data["organization_id"],
        event_id=event_id,
        created_by=data.get("created_by"),
        title=data["title"],
        description=data.get("description"),
        language=data["language"],
        theme=data.get("theme") or {},
        slides=data.get("slides") or [],
        source=data["source"],
        status=data["status"],
        file_filename=data.get("file_filename"),
        file_content_type=data.get("file_content_type"),
        file_size=data.get("file_size"),
        converted_file_filename=data.get("converted_file_filename"),
        conversion_status=data.get("conversion_status") or "not_required",
        conversion_error=data.get("conversion_error"),
        conversion_attempts=data.get("conversion_attempts") or 0,
        last_export_filename=data.get("last_export_filename"),
        created_at=created_at,
        updated_at=updated_at,
        export_url=f"/api/admin/presentations/{deck_id}/export" if last_export_path else None,
        file_url=f"/api/admin/presentations/{deck_id}/file" if file_path else None,
        converted_file_url=f"/api/admin/presentations/{deck_id}/file?variant=converted" if converted_file_path else None,
        presenter_url=(
            f"/admin/events/{event_id}/presentations/{deck_id}/present"
            if event_id and presenter_token
            else (f"/present/{presenter_token}" if presenter_token else None)
        ),
    )


async def _load_deck_row(
    db: AsyncSession,
    *filters: Any,
) -> Any:
    columns = await _presentation_deck_existing_columns(db)
    selected_columns = [getattr(PresentationDeck, column_name) for column_name in PRESENTATION_DECK_COLUMNS if column_name in columns]
    if not selected_columns:
        raise HTTPException(status_code=500, detail="Presentation decks table is not available")
    stmt = select(*selected_columns)
    for filter_ in filters:
        stmt = stmt.where(filter_)
    return (await db.execute(stmt)).mappings().one_or_none()


async def _deck_out(deck: PresentationDeck | Any, db: AsyncSession | None = None) -> DeckOut:
    if db is not None and not isinstance(deck, PresentationDeck):
        return _deck_out_from_row(deck)
    if db is not None and isinstance(deck, PresentationDeck):
        row = await _load_deck_row(db, PresentationDeck.id == deck.id)
        if row is None:
            raise HTTPException(status_code=404, detail="Presentation not found")
        return _deck_out_from_row(row)
    return _deck_out_from_row(deck)
    return DeckOut(
        id=deck.id,
        organization_id=deck.organization_id,
        event_id=deck.event_id,
        created_by=deck.created_by,
        title=deck.title,
        description=deck.description,
        language=deck.language,
        theme=deck.theme or {},
        slides=deck.slides or [],
        source=deck.source,
        status=deck.status,
        file_filename=deck.file_filename,
        file_content_type=deck.file_content_type,
        file_size=deck.file_size,
        converted_file_filename=deck.converted_file_filename,
        conversion_status=deck.conversion_status or "not_required",
        conversion_error=deck.conversion_error,
        conversion_attempts=deck.conversion_attempts or 0,
        last_export_filename=deck.last_export_filename,
        created_at=deck.created_at,
        updated_at=deck.updated_at,
        export_url=f"/api/admin/presentations/{deck.id}/export" if deck.last_export_path else None,
        file_url=f"/api/admin/presentations/{deck.id}/file" if deck.file_path else None,
        converted_file_url=f"/api/admin/presentations/{deck.id}/file?variant=converted" if deck.converted_file_path else None,
        presenter_url=(
            f"/admin/events/{deck.event_id}/presentations/{deck.id}/present"
            if deck.event_id and deck.presenter_token
            else (f"/present/{deck.presenter_token}" if deck.presenter_token else None)
        ),
    )


def _fallback_slides(payload: DeckGenerateIn) -> list[dict[str, Any]]:
    tr = payload.language == "tr"
    slides: list[dict[str, Any]] = [
        {
            "title": payload.topic,
            "layout": "title",
            "subtitle": f"{payload.audience} için {payload.style} sunum" if tr else f"A {payload.style} presentation for {payload.audience}",
            "notes": "Açılışta dinleyiciyi konuya hazırlayın ve sunumun amacını net söyleyin." if tr else "Open by orienting the audience and stating the goal clearly.",
        }
    ]
    sections = (
        [
            ("Bağlam", ["Konu neden önemli?", "Hedef kitle için ana problem", "Beklenen çıktı"]),
            ("Ana Fikirler", ["Temel kavramlar", "Kritik karar noktaları", "Öne çıkan fırsatlar"]),
            ("Uygulama", ["Adım adım yaklaşım", "Gerekli kaynaklar", "Başarı ölçütleri"]),
            ("Riskler", ["Operasyonel riskler", "İletişim riskleri", "Önleyici aksiyonlar"]),
            ("Sonraki Adımlar", ["Öncelikleri netleştir", "Sorumluları ata", "Takip toplantısı planla"]),
        ]
        if tr
        else [
            ("Context", ["Why this topic matters", "The main audience problem", "Expected outcome"]),
            ("Key Ideas", ["Core concepts", "Critical decision points", "Notable opportunities"]),
            ("Execution", ["Step-by-step approach", "Required resources", "Success metrics"]),
            ("Risks", ["Operational risks", "Communication risks", "Preventive actions"]),
            ("Next Steps", ["Clarify priorities", "Assign owners", "Plan the follow-up"]),
        ]
    )
    for title, bullets in sections[: max(1, payload.slide_count - 1)]:
        slides.append({
            "title": title,
            "layout": "bullets",
            "bullets": bullets,
            "notes": "Bu slaytta maddeleri kısa örneklerle bağlayın." if tr else "Connect these points with brief examples.",
        })
    return slides

def _clean_ai_json(raw: str) -> str:
    clean = raw.strip()
    if clean.startswith("```"):
        clean = clean.split("```", 2)[1]
        if clean.startswith("json"):
            clean = clean[4:]
        clean = clean.rsplit("```", 1)[0].strip()
    return clean


async def _generate_slides(payload: DeckGenerateIn) -> tuple[list[dict[str, Any]], str]:
    language = "Turkish" if payload.language == "tr" else "English"
    system = (
        "You design concise business presentations for HeptaCert. "
        "Return only a JSON object with title, description, theme, and slides. "
        "slides must be an array of objects: title, layout ('title' or 'bullets'), subtitle, bullets, notes. "
        "No markdown, no extra prose."
    )
    user = (
        f"Topic: {payload.topic}\nAudience: {payload.audience}\nLanguage: {language}\n"
        f"Style: {payload.style}\nSlide count: {payload.slide_count}\n"
        f"Extra notes: {payload.extra_notes or '-'}"
    )
    raw = await _claude(system, user, max_tokens=2200)
    if not raw:
        return _fallback_slides(payload), "fallback"
    try:
        parsed = json.loads(_clean_ai_json(raw))
        slides = parsed.get("slides")
        if not isinstance(slides, list) or not slides:
            raise ValueError("missing slides")
        normalized = []
        for item in slides[: payload.slide_count]:
            if not isinstance(item, dict):
                continue
            bullets = item.get("bullets") if isinstance(item.get("bullets"), list) else []
            normalized.append({
                "title": str(item.get("title") or "Slide"),
                "layout": str(item.get("layout") or "bullets"),
                "subtitle": item.get("subtitle") or None,
                "bullets": [str(b) for b in bullets[:12]],
                "notes": item.get("notes") or None,
            })
        return normalized or _fallback_slides(payload), "claude"
    except (ValueError, TypeError, json.JSONDecodeError):
        return _fallback_slides(payload), "fallback"


async def _authorized_deck(db: AsyncSession, me: CurrentUser, deck_id: int, request: Request, permission: str) -> PresentationDeck:
    deck = await _load_deck_row(db, PresentationDeck.id == deck_id)
    if not deck:
        raise HTTPException(status_code=404, detail="Presentation not found")
    await get_organization_for_access(db, me, permission, deck["organization_id"] or organization_id_from_request(request))
    return deck


async def _authorized_event_org(db: AsyncSession, me: CurrentUser, event_id: int, request: Request, permission: str) -> tuple[Event, Organization]:
    event = await db.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    org = await get_organization_for_access(db, me, permission, organization_id_from_request(request))
    if getattr(org, "user_id", None) != event.admin_id and me.role != Role.superadmin:
        raise HTTPException(status_code=404, detail="Event not found")
    return event, org


async def _current_user_from_query_token(db: AsyncSession, token: str) -> CurrentUser:
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
        user_id = int(payload.get("sub") or 0)
    except Exception as exc:
        raise HTTPException(status_code=401, detail="Invalid token") from exc
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    return CurrentUser(id=user.id, role=user.role, email=user.email)


async def _authorized_file_deck(
    db: AsyncSession,
    deck_id: int,
    request: Request,
    authorization: Optional[str],
    token: Optional[str],
) -> Any:
    if authorization and authorization.lower().startswith("bearer "):
        me = await get_current_user(db=db, Authorization=authorization)
    elif token:
        me = await _current_user_from_query_token(db, token)
    else:
        raise HTTPException(status_code=401, detail="Missing token")
    return await _authorized_deck(db, me, deck_id, request, "presentations:read")


def _safe_upload_suffix(content_type: str, filename: str) -> str:
    if content_type in ALLOWED_UPLOAD_TYPES:
        return ALLOWED_UPLOAD_TYPES[content_type]
    lower = filename.lower()
    for suffix in (".pdf", ".pptx", ".ppt"):
        if lower.endswith(suffix):
            return suffix
    raise HTTPException(status_code=400, detail="Only PDF and PowerPoint files are supported")


def _upload_media_type(deck: PresentationDeck) -> str:
    file_content_type = deck.get("file_content_type") if hasattr(deck, "get") else deck.file_content_type
    file_filename = deck.get("file_filename") if hasattr(deck, "get") else deck.file_filename
    if file_content_type:
        return file_content_type
    if (file_filename or "").lower().endswith(".pdf"):
        return "application/pdf"
    if (file_filename or "").lower().endswith(".ppt"):
        return "application/vnd.ms-powerpoint"
    return "application/vnd.openxmlformats-officedocument.presentationml.presentation"


def _file_download_name(deck: Any, fallback_prefix: str = "presentation") -> str:
    if hasattr(deck, "get"):
        return deck.get("file_filename") or f"{fallback_prefix}-{deck['id']}"
    return deck.file_filename or f"{fallback_prefix}-{deck.id}"


async def _store_upload_file(deck: PresentationDeck, file: UploadFile) -> None:
    suffix = _safe_upload_suffix(file.content_type or "", file.filename or "")
    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="File is empty")
    if len(raw) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="Presentation file is too large")
    event_id = deck.get("event_id") if hasattr(deck, "get") else deck.event_id
    deck_id = deck.get("id") if hasattr(deck, "get") else deck.id
    rel_path = f"presentations/events/event_{event_id}/deck_{deck_id}{suffix}"
    abs_path = Path(settings.local_storage_dir) / rel_path
    abs_path.parent.mkdir(parents=True, exist_ok=True)
    abs_path.write_bytes(raw)
    if isinstance(deck, PresentationDeck):
        deck.file_path = rel_path
        deck.file_filename = file.filename or f"presentation{suffix}"
        deck.file_content_type = file.content_type if file.content_type in ALLOWED_UPLOAD_TYPES else UPLOAD_MEDIA_TYPES_BY_SUFFIX.get(suffix)
        deck.file_size = len(raw)
        if is_powerpoint_path(deck.file_filename or deck.file_path):
            deck.conversion_status = "queued"
            deck.conversion_error = None
            deck.converted_file_path = None
            deck.converted_file_filename = None
            deck.status = "processing"
        else:
            deck.conversion_status = "not_required"
            deck.conversion_error = None
            deck.status = "ready"


@router.get("", response_model=list[DeckOut], dependencies=[Depends(require_role(Role.admin, Role.superadmin))])
async def list_decks(
    request: Request,
    limit: int = Query(default=30, ge=1, le=100),
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[DeckOut]:
    org = await get_organization_for_access(db, me, "presentations:read", organization_id_from_request(request))
    rows = (
        await _load_deck_row(
            db,
            PresentationDeck.organization_id == org.id,
        )
    )
    if rows is None:
        return []
    all_rows = (
        await db.execute(
            select(*[getattr(PresentationDeck, col) for col in PRESENTATION_DECK_COLUMNS if col in await _presentation_deck_existing_columns(db)])
            .where(PresentationDeck.organization_id == org.id)
            .order_by(PresentationDeck.updated_at.desc(), PresentationDeck.id.desc())
            .limit(limit)
        )
    ).mappings().all()
    return [_deck_out_from_row(row) for row in all_rows]


@router.get("/events/{event_id}", response_model=list[DeckOut], dependencies=[Depends(require_role(Role.admin, Role.superadmin))])
async def list_event_presentations(
    event_id: int,
    request: Request,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[DeckOut]:
    event, org = await _authorized_event_org(db, me, event_id, request, "presentations:read")
    existing_columns = await _presentation_deck_existing_columns(db)
    selected_columns = [getattr(PresentationDeck, column_name) for column_name in PRESENTATION_DECK_COLUMNS if column_name in existing_columns]
    rows = (
        await db.execute(
            select(*selected_columns)
            .where(PresentationDeck.organization_id == org.id, PresentationDeck.event_id == event.id)
            .order_by(PresentationDeck.updated_at.desc(), PresentationDeck.id.desc())
        )
    ).mappings().all()
    return [_deck_out_from_row(row) for row in rows]


@router.post("/events/{event_id}/upload", response_model=DeckOut, status_code=201, dependencies=[Depends(require_role(Role.admin, Role.superadmin))])
async def upload_event_presentation(
    event_id: int,
    request: Request,
    title: str = Form(..., min_length=1, max_length=220),
    description: Optional[str] = Form(default=None, max_length=1000),
    language: str = Form(default="tr", max_length=8),
    file: UploadFile = File(...),
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DeckOut:
    event, org = await _authorized_event_org(db, me, event_id, request, "presentations:write")
    deck = PresentationDeck(
        organization_id=org.id,
        event_id=event.id,
        created_by=me.id,
        title=title.strip(),
        description=description,
        language=language or "tr",
        theme=_default_theme(org),
        slides=[],
        presenter_token=_new_presenter_token(),
        source="upload",
        status="ready",
    )
    db.add(deck)
    await db.flush()
    await _store_upload_file(deck, file)
    await write_audit_log(
        db,
        user_id=me.id,
        action="presentation.upload",
        resource_type="presentation_deck",
        resource_id=str(deck.id),
        extra={"event_id": event.id, "filename": deck.file_filename, "content_type": deck.file_content_type},
    )
    await db.commit()
    row = await _load_deck_row(db, PresentationDeck.id == deck.id)
    if row is None:
        raise HTTPException(status_code=404, detail="Presentation not found")
    return _deck_out_from_row(row)


@router.post("", response_model=DeckOut, status_code=201, dependencies=[Depends(require_role(Role.admin, Role.superadmin))])
async def create_deck(
    payload: DeckCreateIn,
    request: Request,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DeckOut:
    org = await get_organization_for_access(db, me, "presentations:write", organization_id_from_request(request))
    deck = PresentationDeck(
        organization_id=org.id,
        created_by=me.id,
        title=payload.title.strip(),
        description=payload.description,
        language=payload.language or "tr",
        theme=payload.theme or _default_theme(org),
        slides=[slide.model_dump(exclude_none=True) for slide in payload.slides] or _fallback_slides(
            DeckGenerateIn(topic=payload.title, language=payload.language or "tr")
        ),
        presenter_token=_new_presenter_token(),
        source="manual",
    )
    db.add(deck)
    await db.flush()
    await write_audit_log(db, user_id=me.id, action="presentation.create", resource_type="presentation_deck", resource_id=str(deck.id))
    await db.commit()
    row = await _load_deck_row(db, PresentationDeck.id == deck.id)
    if row is None:
        raise HTTPException(status_code=404, detail="Presentation not found")
    return _deck_out_from_row(row)


@router.post("/generate", response_model=DeckOut, status_code=201, dependencies=[Depends(require_role(Role.admin, Role.superadmin))])
async def generate_deck(
    payload: DeckGenerateIn,
    request: Request,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DeckOut:
    org = await get_organization_for_access(db, me, "presentations:write", organization_id_from_request(request))
    slides, provider = await _generate_slides(payload)
    deck = PresentationDeck(
        organization_id=org.id,
        created_by=me.id,
        title=payload.topic.strip(),
        description=payload.extra_notes,
        language=payload.language or "tr",
        theme=_default_theme(org),
        slides=slides,
        presenter_token=_new_presenter_token(),
        source=f"ai:{provider}",
    )
    db.add(deck)
    await db.flush()
    await write_audit_log(
        db,
        user_id=me.id,
        action="presentation.generate",
        resource_type="presentation_deck",
        resource_id=str(deck.id),
        extra={"provider": provider, "slide_count": len(slides)},
    )
    await db.commit()
    row = await _load_deck_row(db, PresentationDeck.id == deck.id)
    if row is None:
        raise HTTPException(status_code=404, detail="Presentation not found")
    return _deck_out_from_row(row)


@router.get("/{deck_id}", response_model=DeckOut, dependencies=[Depends(require_role(Role.admin, Role.superadmin))])
async def get_deck(
    deck_id: int,
    request: Request,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DeckOut:
    row = await _authorized_deck(db, me, deck_id, request, "presentations:read")
    return _deck_out_from_row(row)


@router.get("/{deck_id}/file")
async def get_presentation_file(
    deck_id: int,
    request: Request,
    variant: str = Query(default="original", pattern="^(original|converted)$"),
    token: Optional[str] = Query(default=None),
    authorization: Optional[str] = Header(default=None),
    db: AsyncSession = Depends(get_db),
):
    deck = await _authorized_file_deck(db, deck_id, request, authorization, token)
    if variant == "converted":
        file_path = deck.get("converted_file_path") if hasattr(deck, "get") else deck.converted_file_path
        file_filename = deck.get("converted_file_filename") if hasattr(deck, "get") else deck.converted_file_filename
        media_type = "application/pdf"
    else:
        file_path = deck.get("file_path") if hasattr(deck, "get") else deck.file_path
        file_filename = _file_download_name(deck)
        media_type = _upload_media_type(deck)
    if not file_path:
        raise HTTPException(status_code=404, detail="Presentation file not found")
    storage_root = Path(settings.local_storage_dir).resolve()
    abs_path = (storage_root / file_path).resolve()
    if not abs_path.is_relative_to(storage_root) or not abs_path.exists():
        raise HTTPException(status_code=404, detail="Presentation file not found")
    return FileResponse(
        abs_path,
        media_type=media_type,
        filename=file_filename or f"presentation-{deck['id']}.pdf",
        headers={"Content-Disposition": f'inline; filename="{file_filename or f"presentation-{deck["id"]}.pdf"}"'},
    )


@router.patch("/{deck_id}", response_model=DeckOut, dependencies=[Depends(require_role(Role.admin, Role.superadmin))])
async def update_deck(
    deck_id: int,
    payload: DeckUpdateIn,
    request: Request,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DeckOut:
    deck = await _authorized_deck(db, me, deck_id, request, "presentations:write")
    updates: dict[str, Any] = {}
    if payload.title is not None:
        updates["title"] = payload.title.strip()
    if payload.description is not None:
        updates["description"] = payload.description
    if payload.language is not None:
        updates["language"] = payload.language
    if payload.theme is not None:
        updates["theme"] = payload.theme
    if payload.slides is not None:
        updates["slides"] = [slide.model_dump(exclude_none=True) for slide in payload.slides]
    if payload.status is not None:
        updates["status"] = payload.status
    if updates:
        await db.execute(
            PresentationDeck.__table__.update()
            .where(PresentationDeck.id == deck["id"])
            .values(**updates)
        )
    await write_audit_log(db, user_id=me.id, action="presentation.update", resource_type="presentation_deck", resource_id=str(deck["id"]))
    await db.commit()
    row = await _load_deck_row(db, PresentationDeck.id == deck["id"])
    if row is None:
        raise HTTPException(status_code=404, detail="Presentation not found")
    return _deck_out_from_row(row)


@router.delete("/{deck_id}", status_code=204, dependencies=[Depends(require_role(Role.admin, Role.superadmin))])
async def delete_deck(
    deck_id: int,
    request: Request,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    deck = await _authorized_deck(db, me, deck_id, request, "presentations:write")
    await write_audit_log(db, user_id=me.id, action="presentation.delete", resource_type="presentation_deck", resource_id=str(deck["id"]))
    await db.execute(PresentationDeck.__table__.delete().where(PresentationDeck.id == deck["id"]))
    await db.commit()


@router.post("/{deck_id}/export", response_model=DeckOut, dependencies=[Depends(require_role(Role.admin, Role.superadmin))])
async def export_deck(
    deck_id: int,
    request: Request,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DeckOut:
    deck = await _authorized_deck(db, me, deck_id, request, "presentations:read")
    output = render_deck_pptx(PresentationDeck(**deck))
    rel_path = f"presentations/org_{deck['organization_id']}/deck_{deck['id']}.pptx"
    abs_path = Path(settings.local_storage_dir) / rel_path
    abs_path.parent.mkdir(parents=True, exist_ok=True)
    abs_path.write_bytes(output)
    await db.execute(
        PresentationDeck.__table__.update()
        .where(PresentationDeck.id == deck["id"])
        .values(last_export_path=rel_path, last_export_filename=f"{_safe_filename(deck['title'])}.pptx")
    )
    await write_audit_log(db, user_id=me.id, action="presentation.export", resource_type="presentation_deck", resource_id=str(deck["id"]))
    await db.commit()
    row = await _load_deck_row(db, PresentationDeck.id == deck["id"])
    if row is None:
        raise HTTPException(status_code=404, detail="Presentation not found")
    return _deck_out_from_row(row)


@router.get("/{deck_id}/export", dependencies=[Depends(require_role(Role.admin, Role.superadmin))])
async def download_deck_export(
    deck_id: int,
    request: Request,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    deck = await _authorized_deck(db, me, deck_id, request, "presentations:read")
    if not deck.last_export_path:
        raise HTTPException(status_code=409, detail="Presentation has not been exported yet")
    storage_root = Path(settings.local_storage_dir).resolve()
    abs_path = (storage_root / deck.last_export_path).resolve()
    if not abs_path.is_relative_to(storage_root) or not abs_path.exists():
        raise HTTPException(status_code=404, detail="Export file not found")
    return FileResponse(
        abs_path,
        media_type="application/vnd.openxmlformats-officedocument.presentationml.presentation",
        filename=deck.last_export_filename or f"presentation-{deck.id}.pptx",
    )


@router.post("/{deck_id}/presenter-token", response_model=DeckOut, dependencies=[Depends(require_role(Role.admin, Role.superadmin))])
async def regenerate_presenter_token(
    deck_id: int,
    request: Request,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DeckOut:
    deck = await _authorized_deck(db, me, deck_id, request, "presentations:write")
    new_token = _new_presenter_token()
    await db.execute(
        PresentationDeck.__table__.update()
        .where(PresentationDeck.id == deck["id"])
        .values(presenter_token=new_token)
    )
    await write_audit_log(db, user_id=me.id, action="presentation.presenter_token.regenerate", resource_type="presentation_deck", resource_id=str(deck["id"]))
    await db.commit()
    row = await _load_deck_row(db, PresentationDeck.id == deck["id"])
    if row is None:
        raise HTTPException(status_code=404, detail="Presentation not found")
    return _deck_out_from_row(row)


@public_router.get("/{token}", response_model=PublicDeckOut)
async def get_public_presentation(
    token: str,
    db: AsyncSession = Depends(get_db),
) -> PublicDeckOut:
    deck = await _load_deck_row(db, PresentationDeck.presenter_token == token)
    if not deck:
        raise HTTPException(status_code=404, detail="Presentation not found")
    return PublicDeckOut(
        title=deck["title"],
        description=deck.get("description"),
        language=deck["language"],
        theme=deck.get("theme") or {},
        slides=deck.get("slides") or [],
    )


def _default_theme(org: Organization) -> dict[str, str]:
    return {
        "primary": getattr(org, "brand_color", None) or "#2563eb",
        "background": "#f8fafc",
        "foreground": "#0f172a",
    }


def _safe_filename(value: str) -> str:
    cleaned = "".join(ch if ch.isalnum() or ch in ("-", "_", " ") else "-" for ch in value).strip()
    return (cleaned or "presentation")[:120]


def _new_presenter_token() -> str:
    return secrets.token_urlsafe(24)
