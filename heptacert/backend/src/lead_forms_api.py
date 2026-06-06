"""Lead capture form API endpoints."""

import re
import unicodedata
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from .main import (
    CurrentUser,
    Organization,
    ParticipantCrmProfile,
    Role,
    get_current_user,
    get_db,
    require_role,
)
from .organization_access_api import (
    ensure_organization_enterprise,
    get_organization_for_access,
    organization_id_from_request,
)
from .lead_forms_models import LeadCaptureForm, LeadCaptureSubmission

router = APIRouter()

FIELD_TYPES = {"text", "email", "tel", "textarea", "dropdown", "checkbox", "number"}


def _slugify(text: str) -> str:
    text = unicodedata.normalize("NFD", text)
    text = text.encode("ascii", "ignore").decode("ascii")
    text = re.sub(r"[^\w\s-]", "", text).strip().lower()
    return re.sub(r"[-\s]+", "-", text)


async def _admin_org(db: AsyncSession, me: CurrentUser, request: Request) -> Organization:
    org = await get_organization_for_access(
        db, me, "organization:view", organization_id_from_request(request)
    )
    if me.role != Role.superadmin:
        await ensure_organization_enterprise(db, org)
    return org


# ── Schemas ───────────────────────────────────────────────────────────────────

class FormFieldDef(BaseModel):
    name: str = Field(..., min_length=1, max_length=80)
    label: str = Field(..., min_length=1, max_length=120)
    field_type: str = "text"
    required: bool = True
    options: list[str] = []
    placeholder: Optional[str] = None


class FormIn(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    fields: list[FormFieldDef] = []
    destination: str = "crm"
    auto_tag: Optional[str] = Field(None, max_length=100)
    redirect_url: Optional[str] = None
    active: bool = True


class FormOut(BaseModel):
    id: int
    organization_id: int
    name: str
    slug: str
    fields_json: list
    destination: str
    auto_tag: Optional[str]
    redirect_url: Optional[str]
    active: bool
    submission_count: int
    created_at: datetime
    updated_at: datetime


class SubmissionOut(BaseModel):
    id: int
    form_id: int
    data_json: dict
    source_url: Optional[str]
    utm_source: Optional[str]
    utm_medium: Optional[str]
    utm_campaign: Optional[str]
    submitted_at: datetime


class PublicSubmitIn(BaseModel):
    data: dict
    source_url: Optional[str] = None
    utm_source: Optional[str] = None
    utm_medium: Optional[str] = None
    utm_campaign: Optional[str] = None


# ── Admin Endpoints ───────────────────────────────────────────────────────────

@router.get(
    "/api/admin/lead-forms",
    response_model=list[FormOut],
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def list_forms(
    request: Request,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await _admin_org(db, me, request)
    rows = (
        await db.execute(
            select(LeadCaptureForm)
            .where(LeadCaptureForm.organization_id == org.id)
            .order_by(LeadCaptureForm.created_at.desc())
        )
    ).scalars().all()
    return [_to_form_out(f) for f in rows]


@router.post(
    "/api/admin/lead-forms",
    response_model=FormOut,
    status_code=201,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def create_form(
    request: Request,
    payload: FormIn,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await _admin_org(db, me, request)
    base_slug = _slugify(payload.name) or "form"
    slug = await _unique_slug(db, base_slug)
    form = LeadCaptureForm(
        organization_id=org.id,
        name=payload.name.strip(),
        slug=slug,
        fields_json=[f.model_dump() for f in payload.fields],
        destination=payload.destination,
        auto_tag=payload.auto_tag,
        redirect_url=payload.redirect_url,
        active=int(payload.active),
    )
    db.add(form)
    await db.commit()
    await db.refresh(form)
    return _to_form_out(form)


@router.get(
    "/api/admin/lead-forms/{form_id}",
    response_model=FormOut,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def get_form(
    request: Request,
    form_id: int,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await _admin_org(db, me, request)
    form = await _get_form(db, form_id, org.id)
    return _to_form_out(form)


@router.patch(
    "/api/admin/lead-forms/{form_id}",
    response_model=FormOut,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def update_form(
    request: Request,
    form_id: int,
    payload: FormIn,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await _admin_org(db, me, request)
    form = await _get_form(db, form_id, org.id)
    form.name = payload.name.strip()
    form.fields_json = [f.model_dump() for f in payload.fields]
    form.destination = payload.destination
    form.auto_tag = payload.auto_tag
    form.redirect_url = payload.redirect_url
    form.active = int(payload.active)
    form.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(form)
    return _to_form_out(form)


@router.delete(
    "/api/admin/lead-forms/{form_id}",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def delete_form(
    request: Request,
    form_id: int,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await _admin_org(db, me, request)
    form = await _get_form(db, form_id, org.id)
    await db.delete(form)
    await db.commit()
    return {"ok": True}


@router.get(
    "/api/admin/lead-forms/{form_id}/submissions",
    response_model=list[SubmissionOut],
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def list_submissions(
    request: Request,
    form_id: int,
    limit: int = Query(default=200, ge=1, le=1000),
    offset: int = Query(default=0, ge=0),
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await _admin_org(db, me, request)
    await _get_form(db, form_id, org.id)
    rows = (
        await db.execute(
            select(LeadCaptureSubmission)
            .where(LeadCaptureSubmission.form_id == form_id)
            .order_by(LeadCaptureSubmission.submitted_at.desc())
            .limit(limit).offset(offset)
        )
    ).scalars().all()
    return [_to_sub_out(s) for s in rows]


# ── Public Endpoint ───────────────────────────────────────────────────────────

@router.get("/api/public/forms/{slug}/meta")
async def public_form_meta(slug: str, db: AsyncSession = Depends(get_db)):
    form = (
        await db.execute(select(LeadCaptureForm).where(LeadCaptureForm.slug == slug))
    ).scalar_one_or_none()
    if not form or not form.active:
        raise HTTPException(status_code=404, detail="Form not found")
    return {
        "id": form.id,
        "name": form.name,
        "slug": form.slug,
        "fields_json": form.fields_json or [],
        "redirect_url": form.redirect_url,
        "active": bool(form.active),
    }


@router.post(
    "/api/public/forms/{slug}/submit",
    status_code=201,
)
async def public_submit(
    slug: str,
    payload: PublicSubmitIn,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    form = (
        await db.execute(select(LeadCaptureForm).where(LeadCaptureForm.slug == slug))
    ).scalar_one_or_none()
    if not form or not form.active:
        raise HTTPException(status_code=404, detail="Form not found")

    # Basic required field validation
    for field_def in (form.fields_json or []):
        if field_def.get("required") and not payload.data.get(field_def["name"]):
            raise HTTPException(status_code=422, detail=f"Field '{field_def['name']}' is required")

    ip = (request.headers.get("x-forwarded-for") or request.client.host if request.client else None)

    sub = LeadCaptureSubmission(
        form_id=form.id,
        organization_id=form.organization_id,
        data_json=payload.data,
        source_url=payload.source_url,
        utm_source=payload.utm_source,
        utm_medium=payload.utm_medium,
        utm_campaign=payload.utm_campaign,
        ip_addr=ip,
    )
    db.add(sub)

    # Increment counter
    form.submission_count = (form.submission_count or 0) + 1

    # Upsert CRM profile if destination == "crm" and email present
    if form.destination == "crm":
        email_val = None
        for field_def in (form.fields_json or []):
            if field_def.get("field_type") == "email" or field_def.get("name") == "email":
                email_val = payload.data.get(field_def["name"])
                break
        if email_val and "@" in email_val:
            email_val = email_val.strip().lower()
            existing = (
                await db.execute(
                    select(ParticipantCrmProfile).where(
                        ParticipantCrmProfile.organization_id == form.organization_id,
                        ParticipantCrmProfile.email == email_val,
                    )
                )
            ).scalar_one_or_none()
            if not existing:
                profile = ParticipantCrmProfile(
                    organization_id=form.organization_id,
                    email=email_val,
                    tags=[form.auto_tag] if form.auto_tag else [],
                    custom_fields={k: v for k, v in payload.data.items() if k != "email"},
                )
                db.add(profile)
            elif form.auto_tag and form.auto_tag not in (existing.tags or []):
                existing.tags = list(existing.tags or []) + [form.auto_tag]

    await db.commit()
    return {"ok": True, "redirect_url": form.redirect_url}


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _get_form(db: AsyncSession, form_id: int, org_id: int) -> LeadCaptureForm:
    form = await db.get(LeadCaptureForm, form_id)
    if not form or form.organization_id != org_id:
        raise HTTPException(status_code=404, detail="Form not found")
    return form


async def _unique_slug(db: AsyncSession, base: str) -> str:
    slug = base
    for i in range(1, 100):
        exists = (
            await db.execute(select(LeadCaptureForm).where(LeadCaptureForm.slug == slug))
        ).scalar_one_or_none()
        if not exists:
            return slug
        slug = f"{base}-{i}"
    return f"{base}-{datetime.now().timestamp():.0f}"


def _to_form_out(f: LeadCaptureForm) -> FormOut:
    return FormOut(
        id=f.id,
        organization_id=f.organization_id,
        name=f.name,
        slug=f.slug,
        fields_json=f.fields_json or [],
        destination=f.destination,
        auto_tag=f.auto_tag,
        redirect_url=f.redirect_url,
        active=bool(f.active),
        submission_count=f.submission_count or 0,
        created_at=f.created_at,
        updated_at=f.updated_at,
    )


def _to_sub_out(s: LeadCaptureSubmission) -> SubmissionOut:
    return SubmissionOut(
        id=s.id,
        form_id=s.form_id,
        data_json=s.data_json or {},
        source_url=s.source_url,
        utm_source=s.utm_source,
        utm_medium=s.utm_medium,
        utm_campaign=s.utm_campaign,
        submitted_at=s.submitted_at,
    )
