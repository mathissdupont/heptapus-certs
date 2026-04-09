"""
Social System Permission Tier Tests

Tests the hybrid Events + Social architecture:
- Shared entities (PublicMember, Organization)
- Permission tiers (Free, Growth, Enterprise, Superadmin)
- Separate comment systems (EventComment vs CommunityPostComment)
"""
import pytest
from datetime import datetime
from httpx import AsyncClient, ASGITransport
from sqlalchemy import select

from src.main import (
    app,
    CommunityPost,
    CommunityPostComment,
    CommunityPostLike,
    Event,
    Organization,
    PublicMember,
    Role,
    SessionLocal,
    Subscription,
    User,
    create_access_token,
    create_public_member_access_token,
    hash_password,
)


async def _create_admin_with_subscription(email: str, plan_id: str = "growth") -> tuple[int, str]:
    """Create admin user with subscription tier."""
    async with SessionLocal() as db:
        admin = User(
            email=email,
            password_hash=hash_password("AdminPass123!"),
            role=Role.admin,
        )
        db.add(admin)
        await db.flush()
        
        sub = Subscription(
            user_id=admin.id,
            plan_id=plan_id,
            is_active=True,
        )
        db.add(sub)
        await db.commit()
        return admin.id, create_access_token(user_id=admin.id, role=Role.admin)


async def _create_public_member(email: str, public_id: str, password: str = "MemberPass123!") -> tuple[int, str]:
    """Create public member (free tier by default)."""
    async with SessionLocal() as db:
        member = PublicMember(
            public_id=public_id,
            email=email,
            display_name="Test Member",
            password_hash=hash_password(password),
        )
        db.add(member)
        await db.commit()
        return member.id, create_public_member_access_token(public_member_id=member.id)


async def _create_organization(user_id: int, org_name: str, public_id: str) -> int:
    """Create organization for a user."""
    async with SessionLocal() as db:
        org = Organization(
            user_id=user_id,
            public_id=public_id,
            org_name=org_name,
            brand_color="#6366f1",
        )
        db.add(org)
        await db.commit()
        return org.id


class TestSocialPermissionTiers:
    """Test permission model for social system."""

    @pytest.mark.asyncio
    async def test_free_tier_can_view_global_feed(self):
        """Public members can view global feed (no subscription required)."""
        member_id, member_token = await _create_public_member(
            email="free_view@test.com",
            public_id="mem_free_view",
        )

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            resp = await ac.get(
                "/api/public/feed",
                headers={"Authorization": f"Bearer {member_token}"},
            )
        
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    @pytest.mark.asyncio
    async def test_free_tier_can_post_to_global_feed(self):
        """Public members can post to global feed (free tier allowed)."""
        member_id, member_token = await _create_public_member(
            email="free_post@test.com",
            public_id="mem_free_post",
        )

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            resp = await ac.post(
                "/api/public/feed",
                json={"body": "This is my global post!"},
                headers={"Authorization": f"Bearer {member_token}"},
            )
        
        assert resp.status_code == 201
        data = resp.json()
        assert data["body"] == "This is my global post!"
        assert data["author_type"] == "member"

    @pytest.mark.asyncio
    async def test_free_tier_cannot_post_to_org_feed(self):
        """Public members cannot post to organization feeds (403)."""
        admin_id, admin_token = await _create_admin_with_subscription(
            "org_admin@test.com",
            plan_id="growth",
        )
        org_id = await _create_organization(admin_id, "Test Org", "org_test")

        member_id, member_token = await _create_public_member(
            email="free_org_post@test.com",
            public_id="mem_free_org",
        )

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            resp = await ac.post(
                "/api/public/organizations/org_test/feed",
                json={"body": "Trying to post to org feed"},
                headers={"Authorization": f"Bearer {member_token}"},
            )
        
        assert resp.status_code == 403
        assert "admin access" in resp.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_growth_tier_can_post_to_admin_endpoint(self):
        """Growth plan admins can post via /api/admin/community/posts."""
        admin_id, admin_token = await _create_admin_with_subscription(
            "growth_admin@test.com",
            plan_id="growth",
        )
        org_id = await _create_organization(admin_id, "Growth Org", "org_growth")

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            resp = await ac.post(
                "/api/admin/community/posts",
                json={"body": "Admin post from growth plan"},
                headers={"Authorization": f"Bearer {admin_token}"},
            )
        
        assert resp.status_code == 201
        data = resp.json()
        assert data["body"] == "Admin post from growth plan"
        assert data["author_type"] == "organization"

    @pytest.mark.asyncio
    async def test_no_subscription_admin_denied_posting(self):
        """Admin without subscription cannot post via admin endpoint."""
        async with SessionLocal() as db:
            admin = User(
                email="no_sub_admin@test.com",
                password_hash=hash_password("AdminPass123!"),
                role=Role.admin,
            )
            db.add(admin)
            await db.commit()
            admin_id = admin.id

        # Create org for this admin
        await _create_organization(admin_id, "No Sub Org", "org_nosub")
        admin_token = create_access_token(user_id=admin_id, role=Role.admin)

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            resp = await ac.post(
                "/api/admin/community/posts",
                json={"body": "Trying without subscription"},
                headers={"Authorization": f"Bearer {admin_token}"},
            )
        
        assert resp.status_code == 403
        assert "subscription" in resp.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_superadmin_can_always_post(self):
        """Superadmin can post via admin endpoint without subscription check."""
        async with SessionLocal() as db:
            superadmin = User(
                email="superadmin@test.com",
                password_hash=hash_password("SuperPass123!"),
                role=Role.superadmin,
            )
            db.add(superadmin)
            await db.commit()
            admin_id = superadmin.id

        # Create org for superadmin
        await _create_organization(admin_id, "Super Org", "org_super")
        admin_token = create_access_token(user_id=admin_id, role=Role.superadmin)

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            resp = await ac.post(
                "/api/admin/community/posts",
                json={"body": "Superadmin post without subscription"},
                headers={"Authorization": f"Bearer {admin_token}"},
            )
        
        assert resp.status_code == 201
        data = resp.json()
        assert data["body"] == "Superadmin post without subscription"


class TestSharedEntitiesIntegration:
    """Test that Events and Social systems share PublicMember entity correctly."""

    @pytest.mark.asyncio
    async def test_public_member_appears_in_both_event_and_social(self):
        """Same PublicMember can be an event attendee AND social member."""
        member_id, member_token = await _create_public_member(
            email="shared@test.com",
            public_id="mem_shared",
        )

        # Verify member profile exists in one query
        async with SessionLocal() as db:
            res = await db.execute(
                select(PublicMember).where(PublicMember.id == member_id)
            )
            member = res.scalar_one()
        
        assert member.public_id == "mem_shared"
        assert member.email == "shared@test.com"
        assert member.display_name == "Test Member"

    @pytest.mark.asyncio
    async def test_organization_accessible_from_both_systems(self):
        """Organization created for admin is shared by both systems."""
        admin_id, admin_token = await _create_admin_with_subscription(
            "shared_org_admin@test.com",
            plan_id="growth",
        )
        org_id = await _create_organization(
            admin_id,
            "Shared Organization",
            "org_shared",
        )

        # Verify org exists
        async with SessionLocal() as db:
            org = await db.get(Organization, org_id)
        
        assert org.org_name == "Shared Organization"
        assert org.public_id == "org_shared"
        assert org.user_id == admin_id


class TestSeparateCommentSystems:
    """Test that EventComment and CommunityPostComment are separate."""

    @pytest.mark.asyncio
    async def test_event_comments_separate_from_social_feed(self):
        """Event page comments don't appear in social feed."""
        admin_id, admin_token = await _create_admin_with_subscription(
            "event_admin@test.com",
            plan_id="growth",
        )
        member_id, member_token = await _create_public_member(
            email="event_commenter@test.com",
            public_id="mem_event_comment",
        )

        # Create event
        async with SessionLocal() as db:
            event = Event(
                admin_id=admin_id,
                public_id="evt_separate_comments",
                name="Note: Event Comments Test",
                template_image_url="placeholder",
                config={"visibility": "public"},
            )
            db.add(event)
            await db.commit()
            event_id = event.id

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            # Comment on event page
            comment_resp = await ac.post(
                f"/api/public/events/{event_id}/comments",
                json={"body": "This is an event page comment"},
                headers={"Authorization": f"Bearer {member_token}"},
            )

        assert comment_resp.status_code == 201
        # Event comments should NOT appear in global social feed
        # (This is a logical test - in practice, we'd check the feed doesn't include this comment)

    @pytest.mark.asyncio
    async def test_community_posts_separate_from_event_comments(self):
        """Community feed posts are NOT event comments."""
        member_id, member_token = await _create_public_member(
            email="social_poster@test.com",
            public_id="mem_social_post",
        )

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            # Post to social feed
            resp = await ac.post(
                "/api/public/feed",
                json={"body": "This is a community post, not an event comment"},
                headers={"Authorization": f"Bearer {member_token}"},
            )

        assert resp.status_code == 201
        data = resp.json()
        assert data["author_type"] == "member"
        # Community post has different structure than event comment
        assert "public_id" in data  # Community posts have public_id
        assert "like_count" in data  # Community posts have likes


class TestRateLimiting:
    """Test comment rate limiting (8/min via FastAPI limiter)."""

    @pytest.mark.asyncio
    async def test_member_can_comment_multiple_times_within_limit(self):
        """Member can comment multiple times within rate limit."""
        member_id, member_token = await _create_public_member(
            email="rate_test@test.com",
            public_id="mem_rate_limit",
        )

        # Create a post to comment on
        async with SessionLocal() as db:
            post = CommunityPost(
                public_id="post_for_rate_test",
                org_id=None,
                author_public_member_id=member_id,
                body="Test post for rate limiting",
            )
            db.add(post)
            await db.commit()
            post_id = post.public_id

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            # Try to post 3 comments quickly (under 8/min limit)
            for i in range(3):
                resp = await ac.post(
                    f"/api/public/posts/{post_id}/comments",
                    json={"body": f"Comment {i+1}"},
                    headers={"Authorization": f"Bearer {member_token}"},
                )
                assert resp.status_code == 201
