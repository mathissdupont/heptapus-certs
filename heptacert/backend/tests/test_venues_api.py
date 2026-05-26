import pytest
from httpx import ASGITransport, AsyncClient

from src.main import Event, Role, SessionLocal, User, app, create_access_token, hash_password


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


@pytest.mark.asyncio
async def test_venue_manager_can_reserve_but_cannot_manage_organization_team():
    async with SessionLocal() as db:
        owner = User(email="org-owner@test.com", password_hash=hash_password("AdminPass123!"), role=Role.admin)
        employee = User(email="venue-manager@test.com", password_hash=hash_password("AdminPass123!"), role=Role.admin)
        db.add_all([owner, employee])
        await db.commit()
        await db.refresh(owner)
        await db.refresh(employee)
        owner_headers = {"Authorization": f"Bearer {create_access_token(user_id=owner.id, role=Role.admin)}"}
        employee_headers = {"Authorization": f"Bearer {create_access_token(user_id=employee.id, role=Role.admin)}"}

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        venue_response = await client.post(
            "/api/admin/organization/venues",
            headers=owner_headers,
            json={"name": "Reservation Hall", "capacity": 120, "location": "Floor 2", "notes": "", "is_active": True},
        )
        assert venue_response.status_code == 201
        venue_id = venue_response.json()["id"]

        member_response = await client.post(
            "/api/admin/organization/team",
            headers=owner_headers,
            json={"email": "venue-manager@test.com", "role": "venue_manager"},
        )
        assert member_response.status_code == 201
        assert "reservations:write" in member_response.json()["permissions"]

        employee_venues = await client.get("/api/admin/organization/venues", headers=employee_headers)
        assert employee_venues.status_code == 200
        assert employee_venues.json()[0]["id"] == venue_id

        forbidden_team = await client.get("/api/admin/organization/team", headers=employee_headers)
        assert forbidden_team.status_code == 403

        reservation_payload = {
            "venue_id": venue_id,
            "title": "Board Meeting",
            "start_at": "2026-06-01T09:00:00+03:00",
            "end_at": "2026-06-01T10:00:00+03:00",
            "description": "Quarterly planning",
        }
        reserved = await client.post(
            "/api/admin/organization/venue-reservations",
            headers=employee_headers,
            json=reservation_payload,
        )
        assert reserved.status_code == 201

        overlapping = await client.post(
            "/api/admin/organization/venue-reservations",
            headers=employee_headers,
            json={**reservation_payload, "title": "Overlapping Meeting", "start_at": "2026-06-01T09:30:00+03:00"},
        )
        assert overlapping.status_code == 409

        calendar = await client.get("/api/admin/organization/venue-reservations/calendar.ics", headers=employee_headers)
        assert calendar.status_code == 200
        assert "BEGIN:VCALENDAR" in calendar.text
        assert "SUMMARY:Board Meeting" in calendar.text


@pytest.mark.asyncio
async def test_profile_manager_can_update_profile_but_not_venues():
    async with SessionLocal() as db:
        owner = User(email="profile-owner@test.com", password_hash=hash_password("AdminPass123!"), role=Role.admin)
        employee = User(email="profile-manager@test.com", password_hash=hash_password("AdminPass123!"), role=Role.admin)
        db.add_all([owner, employee])
        await db.commit()
        await db.refresh(owner)
        await db.refresh(employee)
        owner_headers = {"Authorization": f"Bearer {create_access_token(user_id=owner.id, role=Role.admin)}"}
        employee_headers = {"Authorization": f"Bearer {create_access_token(user_id=employee.id, role=Role.admin)}"}

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        await client.get("/api/admin/organization/settings", headers=owner_headers)
        member_response = await client.post(
            "/api/admin/organization/team",
            headers=owner_headers,
            json={"email": "profile-manager@test.com", "role": "profile_manager"},
        )
        assert member_response.status_code == 201

        updated = await client.patch(
            "/api/admin/organization/settings",
            headers=employee_headers,
            json={"org_name": "Profile Managed Org", "brand_color": "#112233"},
        )
        assert updated.status_code == 200
        assert updated.json()["org_name"] == "Profile Managed Org"

        denied_venue = await client.post(
            "/api/admin/organization/venues",
            headers=employee_headers,
            json={"name": "Unauthorized Hall", "capacity": 20, "is_active": True},
        )
        assert denied_venue.status_code == 403


@pytest.mark.asyncio
async def test_event_manager_sees_and_updates_organization_events():
    async with SessionLocal() as db:
        owner = User(email="event-owner@test.com", password_hash=hash_password("AdminPass123!"), role=Role.admin)
        employee = User(email="event-manager@test.com", password_hash=hash_password("AdminPass123!"), role=Role.admin)
        db.add_all([owner, employee])
        await db.flush()
        event = Event(
            admin_id=owner.id,
            name="Organization Event",
            template_image_url="template.png",
            config={},
            gamification_enabled=True,
        )
        db.add(event)
        await db.commit()
        await db.refresh(owner)
        await db.refresh(employee)
        await db.refresh(event)
        event_id = event.id
        owner_headers = {"Authorization": f"Bearer {create_access_token(user_id=owner.id, role=Role.admin)}"}
        employee_headers = {"Authorization": f"Bearer {create_access_token(user_id=employee.id, role=Role.admin)}"}

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        await client.get("/api/admin/organization/settings", headers=owner_headers)
        member_response = await client.post(
            "/api/admin/organization/team",
            headers=owner_headers,
            json={"email": "event-manager@test.com", "role": "event_manager"},
        )
        assert member_response.status_code == 201

        listed = await client.get("/api/admin/events", headers=employee_headers)
        assert listed.status_code == 200
        assert any(item["id"] == event_id for item in listed.json())

        updated = await client.patch(
            f"/api/admin/events/{event_id}",
            headers=employee_headers,
            json={"name": "Organization Event Updated"},
        )
        assert updated.status_code == 200
        assert updated.json()["name"] == "Organization Event Updated"

        badge_rules = await client.get(f"/api/admin/events/{event_id}/badge-rules", headers=employee_headers)
        assert badge_rules.status_code == 200
