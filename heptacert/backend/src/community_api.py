from __future__ import annotations

from typing import Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from .main import (
    CurrentPublicMember,
    Event,
    EventSession,
    Organization,
    OrganizationFollower,
    PublicEventListItemOut,
    PublicOrganizationDetailOut,
    PublicOrganizationListItemOut,
    SessionLocal,
    Subscription,
    User,
    _build_public_org_summary,
    _get_event_visibility,
    _get_organization_public_settings,
    _get_public_event_identifier,
    _is_event_registration_closed,
    get_current_public_member,
    get_db,
    get_optional_public_member,
    sanitize_event_description_html,
)

router = APIRouter()


async def _load_community_enabled_user_ids(db: AsyncSession, user_ids: list[int]) -> set[int]:
    if not user_ids:
        return set()

    user_rows = await db.execute(select(User.id, User.role).where(User.id.in_(user_ids)))
    enabled_user_ids = {int(row.id) for row in user_rows.all() if str(row.role) == "superadmin"}

    sub_rows = await db.execute(
        select(Subscription.user_id).where(
            Subscription.user_id.in_(user_ids),
            Subscription.is_active == True,
            Subscription.plan_id.in_(["growth", "enterprise"]),
        )
    )
    enabled_user_ids.update(int(row.user_id) for row in sub_rows.all())
    return enabled_user_ids


@router.get("/api/public/organizations", response_model=list[PublicOrganizationListItemOut])
async def list_public_organizations(
    limit: int = Query(default=24, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    orgs_res = await db.execute(select(Organization).order_by(Organization.created_at.desc()))
    organizations = orgs_res.scalars().all()
    if not organizations:
        return []

    enabled_user_ids = await _load_community_enabled_user_ids(db, [org.user_id for org in organizations])

    public_events_res = await db.execute(select(Event).order_by(Event.created_at.desc()))
    public_events = [event for event in public_events_res.scalars().all() if _get_event_visibility(event) == "public"]
    public_event_counts: Dict[int, int] = {}
    for event in public_events:
        public_event_counts[event.admin_id] = public_event_counts.get(event.admin_id, 0) + 1

    follower_counts_res = await db.execute(
        select(OrganizationFollower.org_id, func.count(OrganizationFollower.id).label("cnt"))
        .group_by(OrganizationFollower.org_id)
    )
    follower_counts = {int(row.org_id): int(row.cnt or 0) for row in follower_counts_res.all()}

    visible_orgs = [
        _build_public_org_summary(
            org,
            event_count=public_event_counts.get(org.user_id, 0),
            follower_count=follower_counts.get(org.id, 0),
        )
        for org in organizations
        if org.user_id in enabled_user_ids and (org.org_name.strip() or public_event_counts.get(org.user_id, 0) > 0)
    ]
    return visible_orgs[offset : offset + limit]


@router.get("/api/public/organizations/{org_public_id}", response_model=PublicOrganizationDetailOut)
async def get_public_organization_detail(
    org_public_id: str,
    db: AsyncSession = Depends(get_db),
    member: Optional[CurrentPublicMember] = Depends(get_optional_public_member),
):
    org_res = await db.execute(select(Organization).where(Organization.public_id == org_public_id))
    org = org_res.scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found.")

    enabled_user_ids = await _load_community_enabled_user_ids(db, [org.user_id])
    if org.user_id not in enabled_user_ids:
        raise HTTPException(status_code=404, detail="Organization not found.")

    events_res = await db.execute(select(Event).where(Event.admin_id == org.user_id).order_by(Event.created_at.desc()))
    visible_events = [event for event in events_res.scalars().all() if _get_event_visibility(event) == "public"]

    event_ids = [event.id for event in visible_events]
    session_counts: Dict[int, int] = {}
    if event_ids:
        session_counts_res = await db.execute(
            select(EventSession.event_id, func.count(EventSession.id).label("cnt"))
            .where(EventSession.event_id.in_(event_ids))
            .group_by(EventSession.event_id)
        )
        session_counts = {int(row.event_id): int(row.cnt or 0) for row in session_counts_res.all()}

    follower_count_res = await db.execute(select(func.count(OrganizationFollower.id)).where(OrganizationFollower.org_id == org.id))
    follower_count = int(follower_count_res.scalar_one() or 0)

    is_following = False
    if member:
        following_res = await db.execute(
            select(OrganizationFollower.id).where(
                OrganizationFollower.org_id == org.id,
                OrganizationFollower.public_member_id == member.id,
            )
        )
        is_following = following_res.scalar_one_or_none() is not None

    settings_map = _get_organization_public_settings(org)
    return PublicOrganizationDetailOut(
        public_id=org.public_id,
        org_name=org.org_name,
        brand_logo=org.brand_logo,
        brand_color=org.brand_color,
        bio=settings_map.get("public_bio"),
        website_url=settings_map.get("public_website_url"),
        linkedin_url=settings_map.get("public_linkedin_url"),
        github_url=settings_map.get("public_github_url"),
        x_url=settings_map.get("public_x_url"),
        instagram_url=settings_map.get("public_instagram_url"),
        follower_count=follower_count,
        event_count=len(visible_events),
        is_following=is_following,
        events=[
            PublicEventListItemOut(
                id=event.id,
                public_id=_get_public_event_identifier(event),
                name=event.name,
                organization_public_id=org.public_id,
                organization_name=org.org_name,
                organization_logo=org.brand_logo,
                event_date=event.event_date.isoformat() if event.event_date else None,
                event_description=sanitize_event_description_html(event.event_description),
                event_location=event.event_location,
                event_banner_url=event.event_banner_url,
                min_sessions_required=int(event.min_sessions_required or 1),
                registration_closed=_is_event_registration_closed(event),
                visibility=_get_event_visibility(event),
                session_count=session_counts.get(event.id, 0),
            )
            for event in visible_events[:24]
        ],
    )


@router.post("/api/public/organizations/{org_public_id}/follow")
async def follow_public_organization(
    org_public_id: str,
    member: CurrentPublicMember = Depends(get_current_public_member),
    db: AsyncSession = Depends(get_db),
):
    org_res = await db.execute(select(Organization).where(Organization.public_id == org_public_id))
    org = org_res.scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found.")

    enabled_user_ids = await _load_community_enabled_user_ids(db, [org.user_id])
    if org.user_id not in enabled_user_ids:
        raise HTTPException(status_code=404, detail="Organization not found.")

    existing_res = await db.execute(
        select(OrganizationFollower).where(
            OrganizationFollower.org_id == org.id,
            OrganizationFollower.public_member_id == member.id,
        )
    )
    if existing_res.scalar_one_or_none() is None:
        db.add(OrganizationFollower(org_id=org.id, public_member_id=member.id))
        await db.commit()
    return {"ok": True}


@router.delete("/api/public/organizations/{org_public_id}/follow")
async def unfollow_public_organization(
    org_public_id: str,
    member: CurrentPublicMember = Depends(get_current_public_member),
    db: AsyncSession = Depends(get_db),
):
    org_res = await db.execute(select(Organization).where(Organization.public_id == org_public_id))
    org = org_res.scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found.")

    enabled_user_ids = await _load_community_enabled_user_ids(db, [org.user_id])
    if org.user_id not in enabled_user_ids:
        raise HTTPException(status_code=404, detail="Organization not found.")

    follow_res = await db.execute(
        select(OrganizationFollower).where(
            OrganizationFollower.org_id == org.id,
            OrganizationFollower.public_member_id == member.id,
        )
    )
    follow_row = follow_res.scalar_one_or_none()
    if follow_row:
        await db.delete(follow_row)
        await db.commit()
    return {"ok": True}
