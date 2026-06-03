import pytest
from httpx import AsyncClient, ASGITransport

from src.main import app, SessionLocal, User, Organization, Role, create_access_token
from src.domains import Domain


async def _create_user(email: str) -> User:
    async with SessionLocal() as sess:
        async with sess.begin():
            user = User(email=email, password_hash="x", role=Role.admin)
            sess.add(user)
            await sess.flush()
            user_id = user.id
    async with SessionLocal() as sess:
        return await sess.get(User, user_id)


@pytest.mark.asyncio
async def test_create_domain_creates_organization_if_missing():
    user = await _create_user("domain-owner@example.com")
    token = create_access_token(user_id=user.id, role=Role.admin)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        resp = await ac.post(
            "/api/domains",
            json={"domain": "certs.example.test"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["domain"] == "certs.example.test"
        assert data["status"] == "pending"

        org_resp = await ac.get(
            "/api/admin/organization/domain",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert org_resp.status_code == 200
        assert org_resp.json()["custom_domain"] == "certs.example.test"


@pytest.mark.asyncio
async def test_get_domain_returns_owned_domain_details():
    user = await _create_user("domain-detail@example.com")
    token = create_access_token(user_id=user.id, role=Role.admin)

    async with SessionLocal() as sess:
        async with sess.begin():
            org = Organization(
                user_id=user.id,
                public_id="org_domain_detail",
                org_name="Acme",
                custom_domain="brand.example.test",
                brand_color="#123456",
            )
            sess.add(org)
            sess.add(Domain(domain="brand.example.test", owner=str(user.id), token="secret-token", status="pending"))

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        resp = await ac.get(
            "/api/domains/brand.example.test",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["domain"] == "brand.example.test"
        assert data["token"] == "secret-token"


@pytest.mark.asyncio
async def test_delete_domain_clears_custom_domain_and_blocks_other_users():
    owner = await _create_user("domain-delete-owner@example.com")
    other = await _create_user("domain-delete-other@example.com")
    owner_token = create_access_token(user_id=owner.id, role=Role.admin)
    other_token = create_access_token(user_id=other.id, role=Role.admin)

    async with SessionLocal() as sess:
        async with sess.begin():
            sess.add(Organization(
                user_id=owner.id,
                public_id="org_domain_delete",
                org_name="OwnerOrg",
                custom_domain="delete.example.test",
                brand_color="#654321",
            ))
            sess.add(Domain(domain="delete.example.test", owner=str(owner.id), token="delete-token", status="pending"))

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        forbidden = await ac.delete(
            "/api/domains/delete.example.test",
            headers={"Authorization": f"Bearer {other_token}"},
        )
        assert forbidden.status_code == 404

        deleted = await ac.delete(
            "/api/domains/delete.example.test",
            headers={"Authorization": f"Bearer {owner_token}"},
        )
        assert deleted.status_code == 200
        assert deleted.json()["deleted"] is True

        org_resp = await ac.get(
            "/api/admin/organization/domain",
            headers={"Authorization": f"Bearer {owner_token}"},
        )
        assert org_resp.status_code == 200
        assert org_resp.json()["custom_domain"] is None


@pytest.mark.asyncio
async def test_superadmin_approves_and_revokes_white_label_domain():
    owner = await _create_user("domain-org-owner@example.com")
    async with SessionLocal() as sess:
        async with sess.begin():
            superadmin = User(email="domain-superadmin@example.com", password_hash="x", role=Role.superadmin)
            sess.add(superadmin)
            await sess.flush()
            superadmin_id = superadmin.id
            org = Organization(
                user_id=owner.id,
                public_id="org_domain_approve",
                org_name="ApproveOrg",
                custom_domain="approve.example.test",
                brand_color="#123456",
            )
            sess.add(org)
            await sess.flush()
            org_id = org.id

    token = create_access_token(user_id=superadmin_id, role=Role.superadmin)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        before = await ac.get(
            "/.internal/caddy/authorize",
            params={"domain": "approve.example.test"},
        )
        assert before.status_code == 403

        approved = await ac.post(
            f"/api/superadmin/organizations/{org_id}/domain/approve",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert approved.status_code == 200
        approved_data = approved.json()
        assert approved_data["domain_status"] == "active"
        assert approved_data["caddy_authorized"] is True

        after = await ac.get(
            "/.internal/caddy/authorize",
            params={"domain": "approve.example.test"},
        )
        assert after.status_code == 200

        revoked = await ac.post(
            f"/api/superadmin/organizations/{org_id}/domain/revoke",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert revoked.status_code == 200
        assert revoked.json()["custom_domain"] is None

        blocked = await ac.get(
            "/.internal/caddy/authorize",
            params={"domain": "approve.example.test"},
        )
        assert blocked.status_code == 403
