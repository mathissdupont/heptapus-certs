"""LTI (Learning Tools Interoperability) API — LTI 1.1 tool management and launch."""

import hashlib
import hmac
import json
import time
import urllib.parse
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Mapped, mapped_column

from .main import (
    Base,
    CurrentUser,
    Organization,
    Role,
    get_current_user,
    get_db,
    require_role,
    settings,
)

async def _require_admin_lms_enterprise(
    request: Request,
    db: AsyncSession = Depends(get_db),
    Authorization: Optional[str] = Header(default=None),
) -> None:
    if not request.url.path.startswith("/api/admin/lms"):
        return
    me = await get_current_user(db=db, Authorization=Authorization)
    if me.role == Role.superadmin:
        return
    from .organization_access_api import ensure_organization_enterprise, get_organization_for_access, organization_id_from_request

    org = await get_organization_for_access(db, me, "organization:view", organization_id_from_request(request))
    await ensure_organization_enterprise(db, org)


router = APIRouter(dependencies=[Depends(_require_admin_lms_enterprise)])


# ---------------------------------------------------------------------------
# Model
# ---------------------------------------------------------------------------


class LtiTool(Base):
    __tablename__ = "lti_tools"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    org_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    launch_url: Mapped[str] = mapped_column(Text, nullable=False)
    consumer_key: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    shared_secret: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    custom_params_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    provider: Mapped[str] = mapped_column(String(20), nullable=False, server_default="lti_1_1")
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="true")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------


class LtiToolIn(BaseModel):
    name: str = Field(max_length=200)
    launch_url: str = Field(max_length=2000)
    consumer_key: Optional[str] = Field(default=None, max_length=500)
    shared_secret: Optional[str] = Field(default=None, max_length=500)
    custom_params: Optional[dict] = None
    provider: str = Field(default="lti_1_1", pattern="^(lti_1_1|lti_1_3)$")


class LtiToolPatch(BaseModel):
    name: Optional[str] = Field(default=None, max_length=200)
    launch_url: Optional[str] = Field(default=None, max_length=2000)
    consumer_key: Optional[str] = None
    shared_secret: Optional[str] = None
    custom_params: Optional[dict] = None
    is_active: Optional[bool] = None


# ---------------------------------------------------------------------------
# LTI 1.1 HMAC-SHA1 launch signature
# ---------------------------------------------------------------------------


def _lti_sign(method: str, url: str, params: dict, secret: str) -> str:
    """Compute OAuth 1.0 HMAC-SHA1 signature for LTI 1.1 launch."""
    sorted_params = sorted(params.items())
    param_string = "&".join(
        f"{urllib.parse.quote(k, safe='')}={urllib.parse.quote(str(v), safe='')}"
        for k, v in sorted_params
    )
    base_string = "&".join([
        method.upper(),
        urllib.parse.quote(url, safe=""),
        urllib.parse.quote(param_string, safe=""),
    ])
    signing_key = f"{urllib.parse.quote(secret, safe='')}&"
    import base64
    digest = hmac.new(signing_key.encode(), base_string.encode(), hashlib.sha1).digest()
    return base64.b64encode(digest).decode()


def _build_lti_launch_params(
    tool: LtiTool,
    member_email: str,
    member_name: str,
    course_id: int,
    module_id: int,
    resource_title: str,
) -> dict:
    """Build LTI 1.1 launch parameters with OAuth signature."""
    timestamp = str(int(time.time()))
    import secrets as _secrets
    nonce = _secrets.token_hex(16)

    params = {
        "lti_message_type": "basic-lti-launch-request",
        "lti_version": "LTI-1p0",
        "oauth_callback": "about:blank",
        "oauth_consumer_key": tool.consumer_key or "",
        "oauth_nonce": nonce,
        "oauth_signature_method": "HMAC-SHA1",
        "oauth_timestamp": timestamp,
        "oauth_version": "1.0",
        "resource_link_id": f"course_{course_id}_module_{module_id}",
        "resource_link_title": resource_title,
        "roles": "Learner",
        "lis_person_contact_email_primary": member_email,
        "lis_person_name_full": member_name,
        "context_id": f"course_{course_id}",
        "context_label": f"Course {course_id}",
    }

    if tool.custom_params_json:
        try:
            custom = json.loads(tool.custom_params_json)
            params.update(custom)
        except Exception:
            pass

    params["oauth_signature"] = _lti_sign(
        "POST", tool.launch_url, params, tool.shared_secret or ""
    )
    return params


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


async def _get_org(me: CurrentUser, db: AsyncSession) -> Organization:
    res = await db.execute(select(Organization).where(Organization.user_id == me.id))
    org = res.scalar_one_or_none()
    if org is None:
        raise HTTPException(404, "Organizasyon bulunamadı.")
    return org


async def _get_org_from_request(request: Request, me: CurrentUser, db: AsyncSession) -> Organization:
    from .organization_access_api import get_organization_for_access, organization_id_from_request

    return await get_organization_for_access(
        db,
        me,
        "organization:view",
        organization_id_from_request(request),
    )


def _tool_out(t: LtiTool) -> dict:
    return {
        "id": t.id,
        "name": t.name,
        "launch_url": t.launch_url,
        "consumer_key": t.consumer_key,
        "provider": t.provider,
        "is_active": t.is_active,
        "has_secret": bool(t.shared_secret),
        "custom_params": json.loads(t.custom_params_json) if t.custom_params_json else None,
        "created_at": t.created_at.isoformat(),
    }


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.get(
    "/api/admin/lms/lti-tools",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def list_lti_tools(
    request: Request,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await _get_org_from_request(request, me, db)
    rows = (await db.execute(
        select(LtiTool).where(LtiTool.org_id == org.id).order_by(LtiTool.created_at.desc())
    )).scalars().all()
    return {"tools": [_tool_out(t) for t in rows]}


@router.post(
    "/api/admin/lms/lti-tools",
    status_code=201,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def create_lti_tool(
    body: LtiToolIn,
    request: Request,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await _get_org_from_request(request, me, db)
    tool = LtiTool(
        org_id=org.id,
        name=body.name,
        launch_url=body.launch_url,
        consumer_key=body.consumer_key,
        shared_secret=body.shared_secret,
        custom_params_json=json.dumps(body.custom_params) if body.custom_params else None,
        provider=body.provider,
    )
    db.add(tool)
    await db.commit()
    await db.refresh(tool)
    return _tool_out(tool)


@router.patch(
    "/api/admin/lms/lti-tools/{tool_id}",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def update_lti_tool(
    tool_id: int,
    body: LtiToolPatch,
    request: Request,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await _get_org_from_request(request, me, db)
    tool = (await db.execute(
        select(LtiTool).where(LtiTool.id == tool_id, LtiTool.org_id == org.id)
    )).scalar_one_or_none()
    if not tool:
        raise HTTPException(404, "LTI aracı bulunamadı.")
    if body.name is not None:
        tool.name = body.name
    if body.launch_url is not None:
        tool.launch_url = body.launch_url
    if body.consumer_key is not None:
        tool.consumer_key = body.consumer_key
    if body.shared_secret is not None:
        tool.shared_secret = body.shared_secret
    if body.custom_params is not None:
        tool.custom_params_json = json.dumps(body.custom_params)
    if body.is_active is not None:
        tool.is_active = body.is_active
    await db.commit()
    await db.refresh(tool)
    return _tool_out(tool)


@router.delete(
    "/api/admin/lms/lti-tools/{tool_id}",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def delete_lti_tool(
    tool_id: int,
    request: Request,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await _get_org_from_request(request, me, db)
    tool = (await db.execute(
        select(LtiTool).where(LtiTool.id == tool_id, LtiTool.org_id == org.id)
    )).scalar_one_or_none()
    if not tool:
        raise HTTPException(404, "LTI aracı bulunamadı.")
    await db.delete(tool)
    await db.commit()
    return {"ok": True}


@router.post("/api/public/courses/{course_id}/modules/{module_id}/lti-launch")
async def lti_launch(
    course_id: int,
    module_id: int,
    me_opt: Optional[CurrentUser] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Generate LTI 1.1 launch form parameters for a module."""
    from .lms_models import CourseModule

    mod = (await db.execute(
        select(CourseModule).where(
            CourseModule.id == module_id,
            CourseModule.course_id == course_id,
        )
    )).scalar_one_or_none()
    if not mod:
        raise HTTPException(404, "Modül bulunamadı.")

    lti_tool_id = getattr(mod, "lti_tool_id", None)
    if not lti_tool_id:
        raise HTTPException(400, "Bu modül için LTI aracı tanımlanmamış.")

    tool = (await db.execute(
        select(LtiTool).where(LtiTool.id == lti_tool_id, LtiTool.is_active.is_(True))
    )).scalar_one_or_none()
    if not tool:
        raise HTTPException(404, "LTI aracı etkin değil.")

    member_email = getattr(me_opt, "email", "anonymous@heptacert.com") if me_opt else "anonymous@heptacert.com"
    member_name = getattr(me_opt, "email", "Öğrenci") if me_opt else "Öğrenci"

    params = _build_lti_launch_params(
        tool=tool,
        member_email=member_email,
        member_name=member_name,
        course_id=course_id,
        module_id=module_id,
        resource_title=mod.title,
    )
    return {"launch_url": tool.launch_url, "params": params}
