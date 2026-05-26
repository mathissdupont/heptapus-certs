import pytest
from httpx import ASGITransport, AsyncClient

from src.main import Role, SessionLocal, User, app, create_access_token, hash_password


@pytest.mark.asyncio
async def test_admin_can_manage_organization_venues():
    async with SessionLocal() as db:
        admin = User(email="venue-admin@test.com", password_hash=hash_password("AdminPass123!"), role=Role.admin)
        db.add(admin)
        await db.commit()
        await db.refresh(admin)
        token = create_access_token(user_id=admin.id, role=Role.admin)

    headers = {"Authorization": f"Bearer {token}"}
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        created = await client.post(
            "/api/admin/organization/venues",
            headers=headers,
            json={"name": "Main Hall", "capacity": 450, "location": "Floor 1", "notes": "", "is_active": True},
        )
        assert created.status_code == 201
        venue_id = created.json()["id"]

        listed = await client.get("/api/admin/organization/venues", headers=headers)
        assert listed.status_code == 200
        assert listed.json()[0]["capacity"] == 450

        updated = await client.patch(
            f"/api/admin/organization/venues/{venue_id}",
            headers=headers,
            json={"name": "Main Hall", "capacity": 500, "location": "Floor 1", "notes": "Stage", "is_active": True},
        )
        assert updated.status_code == 200
        assert updated.json()["capacity"] == 500

        deleted = await client.delete(f"/api/admin/organization/venues/{venue_id}", headers=headers)
        assert deleted.status_code == 200

        empty = await client.get("/api/admin/organization/venues", headers=headers)
        assert empty.json() == []
