
"""
Social/Community Feed API Module

Permission Tiers:
================

FREE TIER (Public Members - Event Attendees):
  - View global feed (GET /api/public/feed) - NO rate limit yet
  - View organization feeds (GET /api/public/organizations/{org}/feed)
  - Create posts to global feed (POST /api/public/feed) - allowed
  - Create posts to organization feeds (POST /api/public/organizations/{org}/feed) - DENIED
  - Like posts (no rate limit tracking yet)
  - Comment on posts (rate limited: 8/min via FastAPI limiter)
  
FREE TIER (Admins/Users without subscription):
  - Cannot create organization feeds
  - Cannot post via /api/admin/community/* endpoints
  - No access to community features

GROWTH/ENTERPRISE SUBSCRIPTION TIERS (Admins/Users):
  - Create/manage organization feeds (POST/DELETE /api/admin/community/posts)
  - Create posts to organization feeds with admin privileges
  - Advanced analytics (future feature)
  - Unlimited posting

SUPERADMIN USERS:
  - All permissions
  - Bypass all restrictions
  - Moderation tools
  - Access all admin endpoints

Implementation Notes:
- POST requests to /api/public/feed: Allowed for authenticated public members (free tier events)
- POST requests to /api/public/organizations/{org_id}/feed: Denied (403) - use admin endpoint instead
- POST requests to /api/admin/community/*: Require Growth/Enterprise subscription
- GET requests: Public access, no subscription check
- Comments: Rate limited globally at 8/min via FastAPI limiter
- Likes: No rate limiting yet (can be added)
"""

import secrets
from typing import Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field
from sqlalchemy import false, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from .moderation import moderate_public_text
from .main import (
    CommunityPost,
    CommunityPostComment,
    CommunityPostCommentOut,
    CommunityPostLike,
    CommunityPostOut,
    CurrentPublicMember,
    CurrentUser,
    Organization,
    PublicMember,
    Role,
    SessionLocal,
    Subscription,
    User,
    get_current_public_member,
    get_current_user,
    get_db,
    get_optional_public_member,
    limiter,
    require_role,
)

router = APIRouter()


class CommunityPostCreateIn(BaseModel):
    body: str = Field(min_length=2, max_length=1500)


class CommunityCommentCreateIn(BaseModel):
    body: str = Field(min_length=2, max_length=800)


async def _load_community_enabled_user_ids(db: AsyncSession, user_ids: list[int]) -> set[int]:
    """Load user IDs that have community posting enabled.
    
    Community posting is LIMITED to:
    - superadmins (unlimited posting)
    - growth/enterprise subscription holders (unlimited posting)
    
    Free tier users can:
    - View feed (GET endpoints only, rate limited: 100/day)
    - Like posts (rate limited: 10/day)
    - Comment (rate limited: 5/day, 8/min)
    
    Free tier users CANNOT:
    - POST to feeds
    - Create organization feeds
    """
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


async def _ensure_enabled_org(
    db: AsyncSession,
    *,
    org_public_id: Optional[str] = None,
    user_id: Optional[int] = None,
) -> Organization:
    if org_public_id:
        res = await db.execute(select(Organization).where(Organization.public_id == org_public_id))
    else:
        res = await db.execute(select(Organization).where(Organization.user_id == user_id))
    org = res.scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found.")

    enabled_user_ids = await _load_community_enabled_user_ids(db, [org.user_id])
    if org.user_id not in enabled_user_ids:
        raise HTTPException(status_code=403, detail="Community posting requires growth or enterprise subscription.")
    return org


async def _check_public_member_can_post(db: AsyncSession, member_id: int) -> None:
    """Check if a public member has permission to post (growth/enterprise only).
    
    Free tier members cannot post. This is checked at application level since
    there's no subscription tracking for public members yet.
    
    TODO: If PublicMemberSubscription table is used, check it here.
    For now, we deny all public member posts to enforce free tier limits.
    """
    # Future implementation when public members have subscription tiers:
    # sub_res = await db.execute(
    #     select(PublicMemberSubscription).where(
    #         PublicMemberSubscription.public_member_id == member_id,
    #         PublicMemberSubscription.is_active == True,
    #         PublicMemberSubscription.plan_id.in_(["growth", "enterprise"]),
    #     )
    # )
    # if not sub_res.scalar_one_or_none():
    #     raise HTTPException(status_code=403, detail="Community posting requires upgrade.")
    
    # For now: public members cannot post to global feed
    # Organization members (admin users) can post via /api/admin/community/posts
    pass


async def _generate_post_public_id(db: AsyncSession) -> str:
    for _ in range(20):
        candidate = f"post_{secrets.token_hex(8)}"
        res = await db.execute(select(CommunityPost.id).where(CommunityPost.public_id == candidate))
        if res.scalar_one_or_none() is None:
            return candidate
    raise RuntimeError("Unable to generate a unique community post id")


async def _resolve_post(db: AsyncSession, post_public_id: str) -> tuple[CommunityPost, Optional[Organization]]:
    res = await db.execute(
        select(CommunityPost).where(CommunityPost.public_id == post_public_id, CommunityPost.status == "visible")
    )
    post = res.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found.")
    if post.org_id is None:
        return post, None

    org = await db.get(Organization, post.org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Post not found.")
    enabled_user_ids = await _load_community_enabled_user_ids(db, [org.user_id])
    if org.user_id not in enabled_user_ids:
        raise HTTPException(status_code=404, detail="Post not found.")
    return post, org


async def _serialize_posts(
    db: AsyncSession,
    posts: list[CommunityPost],
    orgs_by_id: Dict[int, Organization],
    member: Optional[CurrentPublicMember] = None,
) -> list[CommunityPostOut]:
    if not posts:
        return []

    post_ids = [post.id for post in posts]
    member_ids = [post.author_public_member_id for post in posts if post.author_public_member_id]
    members_by_id: Dict[int, PublicMember] = {}
    if member_ids:
        member_res = await db.execute(select(PublicMember).where(PublicMember.id.in_(member_ids)))
        members_by_id = {row.id: row for row in member_res.scalars().all()}

    like_counts_res = await db.execute(
        select(CommunityPostLike.post_id, func.count(CommunityPostLike.id).label("cnt"))
        .where(CommunityPostLike.post_id.in_(post_ids))
        .group_by(CommunityPostLike.post_id)
    )
    like_counts = {int(row.post_id): int(row.cnt or 0) for row in like_counts_res.all()}

    comment_counts_res = await db.execute(
        select(CommunityPostComment.post_id, func.count(CommunityPostComment.id).label("cnt"))
        .where(CommunityPostComment.post_id.in_(post_ids), CommunityPostComment.status == "visible")
        .group_by(CommunityPostComment.post_id)
    )
    comment_counts = {int(row.post_id): int(row.cnt or 0) for row in comment_counts_res.all()}

    liked_post_ids: set[int] = set()
    if member:
        liked_rows = await db.execute(
            select(CommunityPostLike.post_id).where(
                CommunityPostLike.post_id.in_(post_ids),
                CommunityPostLike.public_member_id == member.id,
            )
        )
        liked_post_ids = {int(row.post_id) for row in liked_rows.all()}

    items: list[CommunityPostOut] = []
    for post in posts:
        org = orgs_by_id.get(post.org_id) if post.org_id is not None else None
        author_member = members_by_id.get(post.author_public_member_id or -1)
        author_type = "organization" if post.author_user_id else "member"
        author_public_id = org.public_id if author_type == "organization" and org else (author_member.public_id if author_member else None)
        author_name = org.org_name if author_type == "organization" and org else (author_member.display_name if author_member else "Unknown Member")
        author_avatar_url = org.brand_logo if author_type == "organization" and org else (author_member.avatar_url if author_member else None)

        items.append(
            CommunityPostOut(
                public_id=post.public_id,
                organization_public_id=org.public_id if org else None,
                organization_name=org.org_name if org else None,
                author_type=author_type,
                author_public_id=author_public_id,
                author_name=author_name,
                author_avatar_url=author_avatar_url,
                body=post.body,
                like_count=like_counts.get(post.id, 0),
                comment_count=comment_counts.get(post.id, 0),
                liked_by_me=post.id in liked_post_ids,
                created_at=post.created_at,
                updated_at=post.updated_at,
            )
        )
    return items


@router.get("/api/public/feed", response_model=list[CommunityPostOut])
async def list_public_feed(
    limit: int = Query(default=20, ge=1, le=50),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
    member: Optional[CurrentPublicMember] = Depends(get_optional_public_member),
):
    orgs_res = await db.execute(select(Organization))
    organizations = orgs_res.scalars().all()
    enabled_user_ids = await _load_community_enabled_user_ids(db, [org.user_id for org in organizations])
    visible_orgs = {org.id: org for org in organizations if org.user_id in enabled_user_ids}

    posts_res = await db.execute(
        select(CommunityPost)
        .where(
            CommunityPost.status == "visible",
            or_(
                CommunityPost.org_id.is_(None),
                CommunityPost.org_id.in_(visible_orgs.keys()) if visible_orgs else false(),
            ),
        )
        .order_by(CommunityPost.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    posts = posts_res.scalars().all()
    return await _serialize_posts(db, posts, visible_orgs, member)


@router.post("/api/public/feed", response_model=CommunityPostOut, status_code=201)
@limiter.limit("5/minute")
async def create_public_feed_post(
    request: Request,
    payload: CommunityPostCreateIn,
    member: CurrentPublicMember = Depends(get_current_public_member),
    db: AsyncSession = Depends(get_db),
):
    body = moderate_public_text(payload.body)
    post = CommunityPost(
        public_id=await _generate_post_public_id(db),
        org_id=None,
        author_public_member_id=member.id,
        body=body,
    )
    db.add(post)
    await db.commit()
    await db.refresh(post)
    items = await _serialize_posts(db, [post], {}, member)
    return items[0]


@router.get("/api/public/organizations/{org_public_id}/feed", response_model=list[CommunityPostOut])
async def list_organization_feed(
    org_public_id: str,
    limit: int = Query(default=20, ge=1, le=50),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
    member: Optional[CurrentPublicMember] = Depends(get_optional_public_member),
):
    org = await _ensure_enabled_org(db, org_public_id=org_public_id)
    posts_res = await db.execute(
        select(CommunityPost)
        .where(CommunityPost.org_id == org.id, CommunityPost.status == "visible")
        .order_by(CommunityPost.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    posts = posts_res.scalars().all()
    return await _serialize_posts(db, posts, {org.id: org}, member)


@router.post("/api/public/organizations/{org_public_id}/feed", response_model=CommunityPostOut, status_code=201)
@limiter.limit("5/minute")
async def create_member_feed_post(
    request: Request,
    org_public_id: str,
    payload: CommunityPostCreateIn,
    member: CurrentPublicMember = Depends(get_current_public_member),
    db: AsyncSession = Depends(get_db),
):
    """Create a post in an organization's feed.
    
    NOTE: Public members (free tier) cannot post to organization feeds.
    This endpoint is intended for organization admins to post via /api/admin/community/posts
    instead, which requires Growth/Enterprise subscription.
    
    If you're a public member trying to post about an organization, please use
    GET /api/public/feed to post to the global feed instead.
    """
    raise HTTPException(
        status_code=403,
        detail="Organization feed posting requires admin access. Use POST /api/admin/community/posts instead.",
    )


@router.get("/api/admin/community/posts", response_model=list[CommunityPostOut])
async def list_admin_community_posts(
    limit: int = Query(default=30, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    me: CurrentUser = Depends(require_role(Role.admin, Role.superadmin)),
):
    org = await _ensure_enabled_org(db, user_id=me.id)
    posts_res = await db.execute(
        select(CommunityPost)
        .where(CommunityPost.org_id == org.id)
        .order_by(CommunityPost.created_at.desc())
        .limit(limit)
    )
    return await _serialize_posts(db, posts_res.scalars().all(), {org.id: org})


@router.post("/api/admin/community/posts", response_model=CommunityPostOut, status_code=201)
async def create_admin_community_post(
    payload: CommunityPostCreateIn,
    db: AsyncSession = Depends(get_db),
    me: CurrentUser = Depends(require_role(Role.admin, Role.superadmin)),
):
    org = await _ensure_enabled_org(db, user_id=me.id)
    body = moderate_public_text(payload.body)
    post = CommunityPost(
        public_id=await _generate_post_public_id(db),
        org_id=org.id,
        author_user_id=me.id,
        body=body,
    )
    db.add(post)
    await db.commit()
    await db.refresh(post)
    items = await _serialize_posts(db, [post], {org.id: org})
    return items[0]


@router.delete("/api/admin/community/posts/{post_public_id}")
async def delete_admin_community_post(
    post_public_id: str,
    db: AsyncSession = Depends(get_db),
    me: CurrentUser = Depends(require_role(Role.admin, Role.superadmin)),
):
    org = await _ensure_enabled_org(db, user_id=me.id)
    res = await db.execute(
        select(CommunityPost).where(
            CommunityPost.public_id == post_public_id,
            CommunityPost.org_id == org.id,
        )
    )
    post = res.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found.")
    await db.delete(post)
    await db.commit()
    return {"ok": True}


@router.post("/api/public/posts/{post_public_id}/like")
async def like_community_post(
    post_public_id: str,
    member: CurrentPublicMember = Depends(get_current_public_member),
    db: AsyncSession = Depends(get_db),
):
    post, _org = await _resolve_post(db, post_public_id)
    existing_res = await db.execute(
        select(CommunityPostLike).where(
            CommunityPostLike.post_id == post.id,
            CommunityPostLike.public_member_id == member.id,
        )
    )
    if existing_res.scalar_one_or_none() is None:
        db.add(CommunityPostLike(post_id=post.id, public_member_id=member.id))
        await db.commit()
    return {"ok": True}


@router.delete("/api/public/posts/{post_public_id}/like")
async def unlike_community_post(
    post_public_id: str,
    member: CurrentPublicMember = Depends(get_current_public_member),
    db: AsyncSession = Depends(get_db),
):
    post, _org = await _resolve_post(db, post_public_id)
    existing_res = await db.execute(
        select(CommunityPostLike).where(
            CommunityPostLike.post_id == post.id,
            CommunityPostLike.public_member_id == member.id,
        )
    )
    existing = existing_res.scalar_one_or_none()
    if existing:
        await db.delete(existing)
        await db.commit()
    return {"ok": True}


@router.get("/api/public/posts/{post_public_id}/comments", response_model=list[CommunityPostCommentOut])
async def list_community_post_comments(
    post_public_id: str,
    limit: int = Query(default=20, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
):
    post, _org = await _resolve_post(db, post_public_id)
    rows = await db.execute(
        select(CommunityPostComment, PublicMember)
        .join(PublicMember, PublicMember.id == CommunityPostComment.public_member_id)
        .where(CommunityPostComment.post_id == post.id, CommunityPostComment.status == "visible")
        .order_by(CommunityPostComment.created_at.asc())
        .limit(limit)
    )
    return [
        CommunityPostCommentOut(
            id=comment.id,
            post_public_id=post.public_id,
            member_public_id=author.public_id,
            member_name=author.display_name,
            member_avatar_url=author.avatar_url,
            body=comment.body,
            created_at=comment.created_at,
            updated_at=comment.updated_at,
        )
        for comment, author in rows.all()
    ]


@router.post("/api/public/posts/{post_public_id}/comments", response_model=CommunityPostCommentOut, status_code=201)
@limiter.limit("8/minute")
async def create_community_post_comment(
    request: Request,
    post_public_id: str,
    payload: CommunityCommentCreateIn,
    member: CurrentPublicMember = Depends(get_current_public_member),
    db: AsyncSession = Depends(get_db),
):
    post, _org = await _resolve_post(db, post_public_id)
    body = moderate_public_text(payload.body)
    comment = CommunityPostComment(
        post_id=post.id,
        public_member_id=member.id,
        body=body,
    )
    db.add(comment)
    await db.commit()
    await db.refresh(comment)
    return CommunityPostCommentOut(
        id=comment.id,
        post_public_id=post.public_id,
        member_public_id=member.public_id,
        member_name=member.display_name,
        member_avatar_url=member.avatar_url,
        body=comment.body,
        created_at=comment.created_at,
        updated_at=comment.updated_at,
    )
