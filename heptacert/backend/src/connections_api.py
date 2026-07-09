"""User connections system for community networking.

Allows users to follow each other and manage connection requests.
Implements permission-based access control for profiles and activity.
"""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel
from sqlalchemy import and_, desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from .main import (
    CurrentPublicMember,
    PublicMember,
    SystemConfig,
    get_current_public_member,
    get_db,
    get_optional_public_member,
    limiter,
    Base,
)
from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship, Mapped, mapped_column

router = APIRouter()


# Database Models
class PublicMemberConnection(Base):
    """Represents a connection between two public members (follower/following)."""
    
    __tablename__ = "public_member_connections"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    follower_id: Mapped[int] = mapped_column(Integer, ForeignKey("public_members.id", ondelete="CASCADE"))
    following_id: Mapped[int] = mapped_column(Integer, ForeignKey("public_members.id", ondelete="CASCADE"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    follower: Mapped["PublicMember"] = relationship("PublicMember", foreign_keys=[follower_id], viewonly=True)
    following: Mapped["PublicMember"] = relationship("PublicMember", foreign_keys=[following_id], viewonly=True)


class PublicMemberConnectionRequest(Base):
    """Represents a pending connection request between two members."""
    
    __tablename__ = "public_member_connection_requests"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    requester_id: Mapped[int] = mapped_column(Integer, ForeignKey("public_members.id", ondelete="CASCADE"))
    recipient_id: Mapped[int] = mapped_column(Integer, ForeignKey("public_members.id", ondelete="CASCADE"))
    status: Mapped[str] = mapped_column(String(20), default="pending")  # pending, accepted, rejected
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    requester: Mapped["PublicMember"] = relationship("PublicMember", foreign_keys=[requester_id], viewonly=True)
    recipient: Mapped["PublicMember"] = relationship("PublicMember", foreign_keys=[recipient_id], viewonly=True)


class PublicMemberBlocklist(Base):
    """Represents blocked connections (mutual blocking)."""
    
    __tablename__ = "public_member_blocklist"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    blocker_id: Mapped[int] = mapped_column(Integer, ForeignKey("public_members.id", ondelete="CASCADE"))
    blocked_id: Mapped[int] = mapped_column(Integer, ForeignKey("public_members.id", ondelete="CASCADE"))
    reason: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    blocker: Mapped["PublicMember"] = relationship("PublicMember", foreign_keys=[blocker_id], viewonly=True)
    blocked: Mapped["PublicMember"] = relationship("PublicMember", foreign_keys=[blocked_id], viewonly=True)


# Pydantic Models
class ConnectionMemberOut(BaseModel):
    """Lightweight member info for connection endpoints."""
    id: int
    public_id: str
    display_name: str
    avatar_url: Optional[str] = None
    headline: Optional[str] = None
    
    class Config:
        from_attributes = True


class ConnectionOut(BaseModel):
    """Connection relationship info."""
    id: int
    follower: ConnectionMemberOut
    following: ConnectionMemberOut
    created_at: str
    
    class Config:
        from_attributes = True


class ConnectionRequestOut(BaseModel):
    """Connection request info."""
    id: int
    requester: ConnectionMemberOut
    recipient: ConnectionMemberOut
    status: str  # pending, accepted, rejected
    created_at: str
    
    class Config:
        from_attributes = True


class ConnectionStatsOut(BaseModel):
    """Connection statistics for a member."""
    follower_count: int
    following_count: int
    is_following: bool
    is_blocked: bool
    hide_followers: bool = False
    hide_following: bool = False


class ConnectionPrivacyIn(BaseModel):
    hide_followers: bool = False
    hide_following: bool = False


class ConnectionPrivacyOut(BaseModel):
    hide_followers: bool
    hide_following: bool


def _privacy_key(member_public_id: str) -> str:
    return f"member_privacy:{member_public_id}"


async def _get_member_privacy(db: AsyncSession, member_public_id: str) -> ConnectionPrivacyOut:
    row_res = await db.execute(select(SystemConfig).where(SystemConfig.key == _privacy_key(member_public_id)))
    row = row_res.scalar_one_or_none()
    if not row or not isinstance(row.value, dict):
        return ConnectionPrivacyOut(hide_followers=False, hide_following=False)

    return ConnectionPrivacyOut(
        hide_followers=bool(row.value.get("hide_followers", False)),
        hide_following=bool(row.value.get("hide_following", False)),
    )


def _can_view_private_list(target: PublicMember, viewer: Optional[CurrentPublicMember]) -> bool:
    return bool(viewer and viewer.public_id == target.public_id)


async def members_blocked(db: AsyncSession, member_a_id: int, member_b_id: int) -> bool:
    """Whether a block exists between two members in EITHER direction. Shared block
    check reused by connections and WP22 networking, so a blocked pair can never
    reach each other through any feature (ADR-0020)."""
    if member_a_id == member_b_id:
        return False
    res = await db.execute(
        select(PublicMemberBlocklist.id).where(
            PublicMemberBlocklist.blocker_id.in_([member_a_id, member_b_id]),
            PublicMemberBlocklist.blocked_id.in_([member_a_id, member_b_id]),
        )
    )
    return res.scalar_one_or_none() is not None


# API Endpoints
@router.post("/api/public/members/{member_public_id}/follow")
@limiter.limit("30/hour")
async def follow_member(
    request: Request,
    member_public_id: str,
    member: CurrentPublicMember = Depends(get_current_public_member),
    db: AsyncSession = Depends(get_db),
):
    """Follow a public member (create connection)."""
    
    # Prevent self-follow
    if member.public_id == member_public_id:
        raise HTTPException(status_code=400, detail="Cannot follow yourself")
    
    # Get target member
    target_res = await db.execute(
        select(PublicMember).where(PublicMember.public_id == member_public_id)
    )
    target = target_res.scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail="Member not found")
    
    # Check if blocked
    block_res = await db.execute(
        select(PublicMemberBlocklist).where(
            PublicMemberBlocklist.blocker_id.in_([member.id, target.id]),
            PublicMemberBlocklist.blocked_id.in_([member.id, target.id]),
        )
    )
    if block_res.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Cannot interact with this member")
    
    # Check if already following
    existing = await db.execute(
        select(PublicMemberConnection).where(
            PublicMemberConnection.follower_id == member.id,
            PublicMemberConnection.following_id == target.id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Already following this member")
    
    # Create connection
    connection = PublicMemberConnection(
        follower_id=member.id,
        following_id=target.id,
    )
    db.add(connection)
    await db.commit()
    await db.refresh(connection)
    
    return {
        "status": "following",
        "follower_id": member.id,
        "following_id": target.id,
        "created_at": connection.created_at.isoformat(),
    }


@router.delete("/api/public/members/{member_public_id}/follow")
@limiter.limit("30/hour")
async def unfollow_member(
    request: Request,
    member_public_id: str,
    member: CurrentPublicMember = Depends(get_current_public_member),
    db: AsyncSession = Depends(get_db),
):
    """Unfollow a public member."""
    
    # Get target member
    target_res = await db.execute(
        select(PublicMember).where(PublicMember.public_id == member_public_id)
    )
    target = target_res.scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail="Member not found")
    
    # Delete connection
    conn_res = await db.execute(
        select(PublicMemberConnection).where(
            PublicMemberConnection.follower_id == member.id,
            PublicMemberConnection.following_id == target.id,
        )
    )
    connection = conn_res.scalar_one_or_none()
    if connection:
        await db.delete(connection)
        await db.commit()
    
    return {"status": "unfollowed"}


@router.get("/api/public/members/{member_public_id}/followers", response_model=list[ConnectionMemberOut])
@limiter.limit("100/hour")
async def get_member_followers(
    request: Request,
    member_public_id: str,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    viewer: Optional[CurrentPublicMember] = Depends(get_optional_public_member),
    db: AsyncSession = Depends(get_db),
):
    """Get list of members following a user."""
    
    # Get target member
    target_res = await db.execute(
        select(PublicMember).where(PublicMember.public_id == member_public_id)
    )
    target = target_res.scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail="Member not found")

    privacy = await _get_member_privacy(db, target.public_id)
    if privacy.hide_followers and not _can_view_private_list(target, viewer):
        raise HTTPException(status_code=403, detail="This member hides followers list")
    
    # Get followers
    followers_res = await db.execute(
        select(PublicMember)
        .join(PublicMemberConnection, PublicMemberConnection.follower_id == PublicMember.id)
        .where(PublicMemberConnection.following_id == target.id)
        .order_by(desc(PublicMemberConnection.created_at))
        .limit(limit)
        .offset(offset)
    )
    followers = followers_res.scalars().all()
    
    return [
        ConnectionMemberOut.model_validate(f)
        for f in followers
    ]


@router.get("/api/public/members/{member_public_id}/following", response_model=list[ConnectionMemberOut])
@limiter.limit("100/hour")
async def get_member_following(
    request: Request,
    member_public_id: str,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    viewer: Optional[CurrentPublicMember] = Depends(get_optional_public_member),
    db: AsyncSession = Depends(get_db),
):
    """Get list of members a user is following."""
    
    # Get target member
    target_res = await db.execute(
        select(PublicMember).where(PublicMember.public_id == member_public_id)
    )
    target = target_res.scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail="Member not found")

    privacy = await _get_member_privacy(db, target.public_id)
    if privacy.hide_following and not _can_view_private_list(target, viewer):
        raise HTTPException(status_code=403, detail="This member hides following list")
    
    # Get following
    following_res = await db.execute(
        select(PublicMember)
        .join(PublicMemberConnection, PublicMemberConnection.following_id == PublicMember.id)
        .where(PublicMemberConnection.follower_id == target.id)
        .order_by(desc(PublicMemberConnection.created_at))
        .limit(limit)
        .offset(offset)
    )
    following = following_res.scalars().all()
    
    return [
        ConnectionMemberOut.model_validate(f)
        for f in following
    ]


@router.get("/api/public/members/{member_public_id}/connection-stats", response_model=ConnectionStatsOut)
@limiter.limit("100/hour")
async def get_connection_stats(
    request: Request,
    member_public_id: str,
    member: Optional[CurrentPublicMember] = Depends(get_optional_public_member),
    db: AsyncSession = Depends(get_db),
):
    """Get connection statistics for a member."""
    
    # Get target member
    target_res = await db.execute(
        select(PublicMember).where(PublicMember.public_id == member_public_id)
    )
    target = target_res.scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail="Member not found")

    privacy = await _get_member_privacy(db, target.public_id)
    can_view_private = _can_view_private_list(target, member)
    
    # Count followers
    follower_count_res = await db.execute(
        select(func.count(PublicMemberConnection.id)).where(
            PublicMemberConnection.following_id == target.id
        )
    )
    follower_count = follower_count_res.scalar() or 0
    
    # Count following
    following_count_res = await db.execute(
        select(func.count(PublicMemberConnection.id)).where(
            PublicMemberConnection.follower_id == target.id
        )
    )
    following_count = following_count_res.scalar() or 0
    
    # Check if current member is following target
    is_following = False
    is_blocked = False
    if member and member.id != target.id:
        follow_res = await db.execute(
            select(PublicMemberConnection).where(
                PublicMemberConnection.follower_id == member.id,
                PublicMemberConnection.following_id == target.id,
            )
        )
        is_following = follow_res.scalar_one_or_none() is not None
        
        # Check if blocked
        block_res = await db.execute(
            select(PublicMemberBlocklist).where(
                PublicMemberBlocklist.blocker_id.in_([member.id, target.id]),
                PublicMemberBlocklist.blocked_id.in_([member.id, target.id]),
            )
        )
        is_blocked = block_res.scalar_one_or_none() is not None
    
    return ConnectionStatsOut(
        follower_count=int(follower_count if (not privacy.hide_followers or can_view_private) else 0),
        following_count=int(following_count if (not privacy.hide_following or can_view_private) else 0),
        is_following=is_following,
        is_blocked=is_blocked,
        hide_followers=privacy.hide_followers,
        hide_following=privacy.hide_following,
    )


@router.post("/api/public/members/{member_public_id}/block")
@limiter.limit("30/hour")
async def block_member(
    request: Request,
    member_public_id: str,
    data: dict = None,
    member: CurrentPublicMember = Depends(get_current_public_member),
    db: AsyncSession = Depends(get_db),
):
    """Block a member (removes all connections and prevents interaction)."""
    
    # Prevent self-block
    if member.public_id == member_public_id:
        raise HTTPException(status_code=400, detail="Cannot block yourself")
    
    # Get target member
    target_res = await db.execute(
        select(PublicMember).where(PublicMember.public_id == member_public_id)
    )
    target = target_res.scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail="Member not found")
    
    # Check if already blocked
    existing_block = await db.execute(
        select(PublicMemberBlocklist).where(
            PublicMemberBlocklist.blocker_id == member.id,
            PublicMemberBlocklist.blocked_id == target.id,
        )
    )
    if existing_block.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Already blocking this member")
    
    # Remove existing connections
    await db.execute(
        select(PublicMemberConnection).where(
            (PublicMemberConnection.follower_id == member.id) & (PublicMemberConnection.following_id == target.id) |
            (PublicMemberConnection.follower_id == target.id) & (PublicMemberConnection.following_id == member.id)
        )
    )
    
    # Create block
    reason = data.get("reason") if data else None
    block = PublicMemberBlocklist(
        blocker_id=member.id,
        blocked_id=target.id,
        reason=reason,
    )
    db.add(block)
    await db.commit()
    
    return {"status": "blocked", "member_id": target.id}


@router.delete("/api/public/members/{member_public_id}/block")
@limiter.limit("30/hour")
async def unblock_member(
    request: Request,
    member_public_id: str,
    member: CurrentPublicMember = Depends(get_current_public_member),
    db: AsyncSession = Depends(get_db),
):
    """Unblock a member."""
    
    # Get target member
    target_res = await db.execute(
        select(PublicMember).where(PublicMember.public_id == member_public_id)
    )
    target = target_res.scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail="Member not found")
    
    # Delete block
    block_res = await db.execute(
        select(PublicMemberBlocklist).where(
            PublicMemberBlocklist.blocker_id == member.id,
            PublicMemberBlocklist.blocked_id == target.id,
        )
    )
    block = block_res.scalar_one_or_none()
    if block:
        await db.delete(block)
        await db.commit()
    
    return {"status": "unblocked"}


@router.get("/api/public/members/me/privacy", response_model=ConnectionPrivacyOut)
async def get_my_connection_privacy(
    member: CurrentPublicMember = Depends(get_current_public_member),
    db: AsyncSession = Depends(get_db),
):
    return await _get_member_privacy(db, member.public_id)


@router.patch("/api/public/members/me/privacy", response_model=ConnectionPrivacyOut)
async def update_my_connection_privacy(
    payload: ConnectionPrivacyIn,
    member: CurrentPublicMember = Depends(get_current_public_member),
    db: AsyncSession = Depends(get_db),
):
    key = _privacy_key(member.public_id)
    row_res = await db.execute(select(SystemConfig).where(SystemConfig.key == key))
    row = row_res.scalar_one_or_none()

    value = {
        "hide_followers": bool(payload.hide_followers),
        "hide_following": bool(payload.hide_following),
    }

    if row is None:
        row = SystemConfig(key=key, value=value)
        db.add(row)
    else:
        row.value = value

    await db.commit()
    return ConnectionPrivacyOut(**value)
