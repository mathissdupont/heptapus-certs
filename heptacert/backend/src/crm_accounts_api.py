"""CRM Company/Account layer API endpoints."""

from datetime import datetime, timezone
from decimal import Decimal
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
from .crm_accounts_models import CrmAccount, CrmAccountContact, CrmDeal, CrmDealActivity

router = APIRouter()

DEAL_STAGES = ["lead", "qualified", "proposal", "negotiation", "won", "lost"]


async def _admin_org(db: AsyncSession, me: CurrentUser, request: Request) -> Organization:
    org = await get_organization_for_access(
        db, me, "organization:view", organization_id_from_request(request)
    )
    if me.role != Role.superadmin:
        await ensure_organization_enterprise(db, org)
    return org


# ── Pydantic Schemas ──────────────────────────────────────────────────────────

class AccountIn(BaseModel):
    name: str = Field(..., min_length=1, max_length=300)
    domain: Optional[str] = Field(None, max_length=253)
    industry: Optional[str] = Field(None, max_length=100)
    size_bucket: Optional[str] = Field(None, max_length=50)
    owner_user_id: Optional[int] = None
    annual_value: Optional[Decimal] = None
    notes: str = ""
    tags: list[str] = []
    status: str = "active"


class AccountOut(BaseModel):
    id: int
    organization_id: int
    name: str
    domain: Optional[str]
    industry: Optional[str]
    size_bucket: Optional[str]
    owner_user_id: Optional[int]
    annual_value: Optional[Decimal]
    notes: str
    tags: list
    status: str
    contact_count: int
    deal_count: int
    created_at: datetime
    updated_at: datetime


class AccountContactIn(BaseModel):
    participant_crm_profile_id: int
    role: Optional[str] = Field(None, max_length=100)
    is_primary: bool = False


class AccountContactOut(BaseModel):
    id: int
    account_id: int
    participant_crm_profile_id: int
    email: str
    name: Optional[str]
    role: Optional[str]
    is_primary: bool
    created_at: datetime


class DealIn(BaseModel):
    name: str = Field(..., min_length=1, max_length=300)
    stage: str = "lead"
    amount: Optional[Decimal] = None
    expected_close_date: Optional[datetime] = None
    owner_user_id: Optional[int] = None


class DealOut(BaseModel):
    id: int
    account_id: int
    organization_id: int
    name: str
    stage: str
    amount: Optional[Decimal]
    expected_close_date: Optional[datetime]
    owner_user_id: Optional[int]
    activity_count: int
    created_at: datetime
    updated_at: datetime


class DealActivityIn(BaseModel):
    activity_type: str = Field(..., pattern="^(note|call|email|meeting|task)$")
    content: str = Field(..., min_length=1)
    activity_at: Optional[datetime] = None


class DealActivityOut(BaseModel):
    id: int
    deal_id: int
    activity_type: str
    content: str
    user_id: Optional[int]
    activity_at: datetime
    created_at: datetime


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _get_account(db: AsyncSession, account_id: int, org_id: int) -> CrmAccount:
    acct = await db.get(CrmAccount, account_id)
    if not acct or acct.organization_id != org_id:
        raise HTTPException(status_code=404, detail="Account not found")
    return acct


async def _account_counts(db: AsyncSession, account_id: int) -> tuple[int, int]:
    contact_count = int(
        (await db.execute(
            select(func.count(CrmAccountContact.id)).where(CrmAccountContact.account_id == account_id)
        )).scalar_one() or 0
    )
    deal_count = int(
        (await db.execute(
            select(func.count(CrmDeal.id)).where(CrmDeal.account_id == account_id)
        )).scalar_one() or 0
    )
    return contact_count, deal_count


async def _to_account_out(db: AsyncSession, acct: CrmAccount) -> AccountOut:
    contact_count, deal_count = await _account_counts(db, acct.id)
    return AccountOut(
        id=acct.id,
        organization_id=acct.organization_id,
        name=acct.name,
        domain=acct.domain,
        industry=acct.industry,
        size_bucket=acct.size_bucket,
        owner_user_id=acct.owner_user_id,
        annual_value=acct.annual_value,
        notes=acct.notes or "",
        tags=acct.tags or [],
        status=acct.status,
        contact_count=contact_count,
        deal_count=deal_count,
        created_at=acct.created_at,
        updated_at=acct.updated_at,
    )


async def _deal_activity_count(db: AsyncSession, deal_id: int) -> int:
    return int(
        (await db.execute(
            select(func.count(CrmDealActivity.id)).where(CrmDealActivity.deal_id == deal_id)
        )).scalar_one() or 0
    )


async def _to_deal_out(db: AsyncSession, deal: CrmDeal) -> DealOut:
    return DealOut(
        id=deal.id,
        account_id=deal.account_id,
        organization_id=deal.organization_id,
        name=deal.name,
        stage=deal.stage,
        amount=deal.amount,
        expected_close_date=deal.expected_close_date,
        owner_user_id=deal.owner_user_id,
        activity_count=await _deal_activity_count(db, deal.id),
        created_at=deal.created_at,
        updated_at=deal.updated_at,
    )


# ── Account Endpoints ─────────────────────────────────────────────────────────

@router.get(
    "/api/admin/crm/accounts",
    response_model=list[AccountOut],
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def list_accounts(
    request: Request,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
):
    org = await _admin_org(db, me, request)
    stmt = select(CrmAccount).where(CrmAccount.organization_id == org.id)
    if status:
        stmt = stmt.where(CrmAccount.status == status)
    if search:
        stmt = stmt.where(CrmAccount.name.ilike(f"%{search.strip()}%"))
    stmt = stmt.order_by(CrmAccount.updated_at.desc()).limit(limit).offset(offset)
    rows = (await db.execute(stmt)).scalars().all()
    return [await _to_account_out(db, a) for a in rows]


@router.post(
    "/api/admin/crm/accounts",
    response_model=AccountOut,
    status_code=201,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def create_account(
    request: Request,
    payload: AccountIn,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await _admin_org(db, me, request)
    acct = CrmAccount(
        organization_id=org.id,
        name=payload.name.strip(),
        domain=(payload.domain or "").strip() or None,
        industry=(payload.industry or "").strip() or None,
        size_bucket=(payload.size_bucket or "").strip() or None,
        owner_user_id=payload.owner_user_id,
        annual_value=payload.annual_value,
        notes=payload.notes or "",
        tags=payload.tags or [],
        status=payload.status or "active",
    )
    db.add(acct)
    await db.commit()
    await db.refresh(acct)
    return await _to_account_out(db, acct)


@router.get(
    "/api/admin/crm/accounts/{account_id}",
    response_model=AccountOut,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def get_account(
    request: Request,
    account_id: int,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await _admin_org(db, me, request)
    acct = await _get_account(db, account_id, org.id)
    return await _to_account_out(db, acct)


@router.patch(
    "/api/admin/crm/accounts/{account_id}",
    response_model=AccountOut,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def update_account(
    request: Request,
    account_id: int,
    payload: AccountIn,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await _admin_org(db, me, request)
    acct = await _get_account(db, account_id, org.id)
    acct.name = payload.name.strip()
    acct.domain = (payload.domain or "").strip() or None
    acct.industry = (payload.industry or "").strip() or None
    acct.size_bucket = (payload.size_bucket or "").strip() or None
    acct.owner_user_id = payload.owner_user_id
    acct.annual_value = payload.annual_value
    acct.notes = payload.notes or ""
    acct.tags = payload.tags or []
    acct.status = payload.status or "active"
    acct.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(acct)
    return await _to_account_out(db, acct)


@router.delete(
    "/api/admin/crm/accounts/{account_id}",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def delete_account(
    request: Request,
    account_id: int,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await _admin_org(db, me, request)
    acct = await _get_account(db, account_id, org.id)
    await db.delete(acct)
    await db.commit()
    return {"ok": True}


# ── Contact Endpoints ─────────────────────────────────────────────────────────

@router.get(
    "/api/admin/crm/accounts/{account_id}/contacts",
    response_model=list[AccountContactOut],
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def list_account_contacts(
    request: Request,
    account_id: int,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await _admin_org(db, me, request)
    await _get_account(db, account_id, org.id)
    rows = (
        await db.execute(
            select(CrmAccountContact, ParticipantCrmProfile)
            .join(ParticipantCrmProfile, CrmAccountContact.participant_crm_profile_id == ParticipantCrmProfile.id)
            .where(CrmAccountContact.account_id == account_id)
            .order_by(CrmAccountContact.is_primary.desc(), CrmAccountContact.created_at)
        )
    ).all()
    result = []
    for contact, profile in rows:
        name = profile.custom_fields.get("name") if profile.custom_fields else None
        result.append(AccountContactOut(
            id=contact.id,
            account_id=contact.account_id,
            participant_crm_profile_id=contact.participant_crm_profile_id,
            email=profile.email,
            name=name,
            role=contact.role,
            is_primary=contact.is_primary,
            created_at=contact.created_at,
        ))
    return result


@router.post(
    "/api/admin/crm/accounts/{account_id}/contacts",
    response_model=AccountContactOut,
    status_code=201,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def add_account_contact(
    request: Request,
    account_id: int,
    payload: AccountContactIn,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await _admin_org(db, me, request)
    await _get_account(db, account_id, org.id)
    profile = await db.get(ParticipantCrmProfile, payload.participant_crm_profile_id)
    if not profile or profile.organization_id != org.id:
        raise HTTPException(status_code=404, detail="CRM profile not found")
    existing = (await db.execute(
        select(CrmAccountContact).where(
            CrmAccountContact.account_id == account_id,
            CrmAccountContact.participant_crm_profile_id == payload.participant_crm_profile_id,
        )
    )).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=409, detail="Contact already linked")
    contact = CrmAccountContact(
        account_id=account_id,
        participant_crm_profile_id=payload.participant_crm_profile_id,
        role=payload.role,
        is_primary=payload.is_primary,
    )
    db.add(contact)
    await db.commit()
    await db.refresh(contact)
    name = profile.custom_fields.get("name") if profile.custom_fields else None
    return AccountContactOut(
        id=contact.id,
        account_id=contact.account_id,
        participant_crm_profile_id=contact.participant_crm_profile_id,
        email=profile.email,
        name=name,
        role=contact.role,
        is_primary=contact.is_primary,
        created_at=contact.created_at,
    )


@router.delete(
    "/api/admin/crm/accounts/{account_id}/contacts/{contact_id}",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def remove_account_contact(
    request: Request,
    account_id: int,
    contact_id: int,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await _admin_org(db, me, request)
    await _get_account(db, account_id, org.id)
    contact = await db.get(CrmAccountContact, contact_id)
    if not contact or contact.account_id != account_id:
        raise HTTPException(status_code=404, detail="Contact link not found")
    await db.delete(contact)
    await db.commit()
    return {"ok": True}


# ── Deal Endpoints ────────────────────────────────────────────────────────────

@router.get(
    "/api/admin/crm/accounts/{account_id}/deals",
    response_model=list[DealOut],
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def list_account_deals(
    request: Request,
    account_id: int,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await _admin_org(db, me, request)
    await _get_account(db, account_id, org.id)
    rows = (
        await db.execute(
            select(CrmDeal)
            .where(CrmDeal.account_id == account_id)
            .order_by(CrmDeal.created_at.desc())
        )
    ).scalars().all()
    return [await _to_deal_out(db, d) for d in rows]


@router.get(
    "/api/admin/crm/pipeline",
    response_model=dict,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def get_pipeline(
    request: Request,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await _admin_org(db, me, request)
    rows = (
        await db.execute(
            select(CrmDeal, CrmAccount.name)
            .join(CrmAccount, CrmDeal.account_id == CrmAccount.id)
            .where(CrmDeal.organization_id == org.id)
            .order_by(CrmDeal.updated_at.desc())
        )
    ).all()
    pipeline: dict[str, list] = {s: [] for s in DEAL_STAGES}
    for deal, account_name in rows:
        stage = deal.stage if deal.stage in pipeline else "lead"
        pipeline[stage].append({
            "id": deal.id,
            "name": deal.name,
            "account_id": deal.account_id,
            "account_name": account_name,
            "amount": float(deal.amount) if deal.amount else None,
            "expected_close_date": deal.expected_close_date.isoformat() if deal.expected_close_date else None,
            "owner_user_id": deal.owner_user_id,
            "updated_at": deal.updated_at.isoformat(),
        })
    return {"stages": DEAL_STAGES, "pipeline": pipeline}


@router.post(
    "/api/admin/crm/accounts/{account_id}/deals",
    response_model=DealOut,
    status_code=201,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def create_deal(
    request: Request,
    account_id: int,
    payload: DealIn,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await _admin_org(db, me, request)
    await _get_account(db, account_id, org.id)
    if payload.stage not in DEAL_STAGES:
        raise HTTPException(status_code=422, detail=f"stage must be one of {DEAL_STAGES}")
    deal = CrmDeal(
        account_id=account_id,
        organization_id=org.id,
        name=payload.name.strip(),
        stage=payload.stage,
        amount=payload.amount,
        expected_close_date=payload.expected_close_date,
        owner_user_id=payload.owner_user_id,
    )
    db.add(deal)
    await db.commit()
    await db.refresh(deal)
    return await _to_deal_out(db, deal)


@router.patch(
    "/api/admin/crm/deals/{deal_id}",
    response_model=DealOut,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def update_deal(
    request: Request,
    deal_id: int,
    payload: DealIn,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await _admin_org(db, me, request)
    deal = await db.get(CrmDeal, deal_id)
    if not deal or deal.organization_id != org.id:
        raise HTTPException(status_code=404, detail="Deal not found")
    if payload.stage not in DEAL_STAGES:
        raise HTTPException(status_code=422, detail=f"stage must be one of {DEAL_STAGES}")
    deal.name = payload.name.strip()
    deal.stage = payload.stage
    deal.amount = payload.amount
    deal.expected_close_date = payload.expected_close_date
    deal.owner_user_id = payload.owner_user_id
    deal.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(deal)
    return await _to_deal_out(db, deal)


@router.delete(
    "/api/admin/crm/deals/{deal_id}",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def delete_deal(
    request: Request,
    deal_id: int,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await _admin_org(db, me, request)
    deal = await db.get(CrmDeal, deal_id)
    if not deal or deal.organization_id != org.id:
        raise HTTPException(status_code=404, detail="Deal not found")
    await db.delete(deal)
    await db.commit()
    return {"ok": True}


# ── Deal Activity Endpoints ───────────────────────────────────────────────────

@router.get(
    "/api/admin/crm/deals/{deal_id}/activities",
    response_model=list[DealActivityOut],
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def list_deal_activities(
    request: Request,
    deal_id: int,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await _admin_org(db, me, request)
    deal = await db.get(CrmDeal, deal_id)
    if not deal or deal.organization_id != org.id:
        raise HTTPException(status_code=404, detail="Deal not found")
    rows = (
        await db.execute(
            select(CrmDealActivity)
            .where(CrmDealActivity.deal_id == deal_id)
            .order_by(CrmDealActivity.activity_at.desc())
        )
    ).scalars().all()
    return [
        DealActivityOut(
            id=r.id, deal_id=r.deal_id, activity_type=r.activity_type,
            content=r.content, user_id=r.user_id,
            activity_at=r.activity_at, created_at=r.created_at,
        )
        for r in rows
    ]


@router.post(
    "/api/admin/crm/deals/{deal_id}/activities",
    response_model=DealActivityOut,
    status_code=201,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def add_deal_activity(
    request: Request,
    deal_id: int,
    payload: DealActivityIn,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await _admin_org(db, me, request)
    deal = await db.get(CrmDeal, deal_id)
    if not deal or deal.organization_id != org.id:
        raise HTTPException(status_code=404, detail="Deal not found")
    activity = CrmDealActivity(
        deal_id=deal_id,
        activity_type=payload.activity_type,
        content=payload.content.strip(),
        user_id=me.id,
        activity_at=payload.activity_at or datetime.now(timezone.utc),
    )
    db.add(activity)
    await db.commit()
    await db.refresh(activity)
    return DealActivityOut(
        id=activity.id, deal_id=activity.deal_id, activity_type=activity.activity_type,
        content=activity.content, user_id=activity.user_id,
        activity_at=activity.activity_at, created_at=activity.created_at,
    )


@router.delete(
    "/api/admin/crm/deals/{deal_id}/activities/{activity_id}",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def delete_deal_activity(
    request: Request,
    deal_id: int,
    activity_id: int,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await _admin_org(db, me, request)
    deal = await db.get(CrmDeal, deal_id)
    if not deal or deal.organization_id != org.id:
        raise HTTPException(status_code=404, detail="Deal not found")
    activity = await db.get(CrmDealActivity, activity_id)
    if not activity or activity.deal_id != deal_id:
        raise HTTPException(status_code=404, detail="Activity not found")
    await db.delete(activity)
    await db.commit()
    return {"ok": True}
