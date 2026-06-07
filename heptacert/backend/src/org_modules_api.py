"""Organization module settings — enable/disable Events, LMS, Accreditation per org."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from .main import (
    Organization,
    Role,
    _get_or_create_admin_organization,
    get_current_user,
    get_db,
    require_role,
    CurrentUser,
)
from .organization_access_api import get_organization_for_access, organization_id_from_request

router = APIRouter(prefix="/api")

DEFAULT_MODULES: dict[str, bool] = {
    "events": True,
    "lms": True,
    "accreditation": True,
}

# Which modules are on by default for each org type
ORG_TYPE_DEFAULTS: dict[str, dict[str, bool]] = {
    "event_organizer": {"events": True, "lms": False, "accreditation": False},
    "training_institute": {"events": True, "lms": True, "accreditation": True},
    "university": {"events": True, "lms": True, "accreditation": True},
    "corporate_training": {"events": False, "lms": True, "accreditation": False},
    "professional_association": {"events": True, "lms": True, "accreditation": True},
}


def _get_modules(org: Organization) -> dict[str, bool]:
    settings: dict[str, Any] = dict(getattr(org, "settings", {}) or {})
    stored = settings.get("modules")
    if isinstance(stored, dict):
        return {k: bool(stored.get(k, DEFAULT_MODULES[k])) for k in DEFAULT_MODULES}
    return dict(DEFAULT_MODULES)


class ModulesIn(BaseModel):
    events: bool = True
    lms: bool = True
    accreditation: bool = True


class OnboardingIn(BaseModel):
    org_type: str
    org_name: str | None = None
    # Allow overriding module defaults
    modules: ModulesIn | None = None


@router.get(
    "/admin/organization/modules",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def get_org_modules(
    request: Request,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await get_organization_for_access(db, me, "organization:view", organization_id_from_request(request))
    return {"modules": _get_modules(org), "org_type": (org.settings or {}).get("org_type")}


@router.patch(
    "/admin/organization/modules",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def update_org_modules(
    payload: ModulesIn,
    request: Request,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await get_organization_for_access(db, me, "organization:profile_write", organization_id_from_request(request))
    settings: dict[str, Any] = dict(getattr(org, "settings", {}) or {})
    settings["modules"] = payload.model_dump()
    org.settings = settings
    await db.commit()
    return {"modules": _get_modules(org)}


@router.post(
    "/admin/organization/onboarding",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def complete_onboarding(
    payload: OnboardingIn,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await _get_or_create_admin_organization(db, me.id)

    modules = (payload.modules.model_dump() if payload.modules else None) or ORG_TYPE_DEFAULTS.get(
        payload.org_type, DEFAULT_MODULES
    )

    settings: dict[str, Any] = dict(getattr(org, "settings", {}) or {})
    settings["modules"] = modules
    settings["org_type"] = payload.org_type
    settings["onboarding_completed"] = True
    org.settings = settings

    if payload.org_name and payload.org_name.strip():
        org.org_name = payload.org_name.strip()

    await db.commit()
    return {"modules": modules, "org_type": payload.org_type}
