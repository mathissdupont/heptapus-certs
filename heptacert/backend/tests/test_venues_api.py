import pytest
from httpx import ASGITransport, AsyncClient

from src.main import Event, Role, SessionLocal, Subscription, User, app, create_access_token, hash_password


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
        # team_manage (calisan yonetimi) Enterprise plan gerektirir
        db.add(Subscription(user_id=owner.id, plan_id="enterprise"))
        await db.commit()
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

        contexts = await client.get("/api/admin/organization/contexts", headers=employee_headers)
        assert contexts.status_code == 200
        context_items = contexts.json()
        # Calisan baska bir org'a uye; kendi org'u yoksa yalnizca uyelik context'i
        # doner (kendi org'u sadece hic context yoksa lazy olusur). En az 1 (uye) yeter.
        assert len(context_items) >= 1
        owner_context = next(item for item in context_items if not item["owned"])
        employee_headers = {**employee_headers, "X-Organization-Id": str(owner_context["id"])}

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
async def test_event_creation_can_auto_reserve_selected_organization_venue():
    async with SessionLocal() as db:
        owner = User(email="event-reserve-owner@test.com", password_hash=hash_password("AdminPass123!"), role=Role.admin)
        db.add(owner)
        await db.commit()
        await db.refresh(owner)
        headers = {"Authorization": f"Bearer {create_access_token(user_id=owner.id, role=Role.admin)}"}

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        contexts = await client.get("/api/admin/organization/contexts", headers=headers)
        assert contexts.status_code == 200
        organization_id = contexts.json()[0]["id"]
        headers = {**headers, "X-Organization-Id": str(organization_id)}

        venue_response = await client.post(
            "/api/admin/organization/venues",
            headers=headers,
            json={"name": "Launch Hall", "capacity": 180, "location": "HQ", "notes": "", "is_active": True},
        )
        assert venue_response.status_code == 201
        venue_id = venue_response.json()["id"]

        created = await client.post(
            "/api/admin/events",
            headers=headers,
            json={
                "name": "Launch Day",
                "template_image_url": "placeholder",
                "config": {"visibility": "unlisted"},
                "organization_venue_id": venue_id,
                "auto_reserve_venue": True,
                "venue_reservation_start_at": "2026-06-03T09:00:00+03:00",
                "venue_reservation_end_at": "2026-06-03T11:00:00+03:00",
            },
        )
        assert created.status_code == 201
        created_body = created.json()
        assert created_body["organization_venue_id"] == venue_id
        assert created_body["venue_reservation_id"]

        reservations = await client.get("/api/admin/organization/venue-reservations", headers=headers)
        assert reservations.status_code == 200
        assert reservations.json()[0]["title"] == "Launch Day"

        overlapping = await client.post(
            "/api/admin/events",
            headers=headers,
            json={
                "name": "Overlapping Launch",
                "template_image_url": "placeholder",
                "config": {"visibility": "unlisted"},
                "organization_venue_id": venue_id,
                "auto_reserve_venue": True,
                "venue_reservation_start_at": "2026-06-03T10:00:00+03:00",
                "venue_reservation_end_at": "2026-06-03T12:00:00+03:00",
            },
        )
        assert overlapping.status_code == 409


@pytest.mark.asyncio
async def test_profile_manager_can_update_profile_but_not_venues():
    async with SessionLocal() as db:
        owner = User(email="profile-owner@test.com", password_hash=hash_password("AdminPass123!"), role=Role.admin)
        employee = User(email="profile-manager@test.com", password_hash=hash_password("AdminPass123!"), role=Role.admin)
        db.add_all([owner, employee])
        await db.commit()
        await db.refresh(owner)
        await db.refresh(employee)
        # team_manage (calisan yonetimi) Enterprise plan gerektirir
        db.add(Subscription(user_id=owner.id, plan_id="enterprise"))
        await db.commit()
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

        # Calisan, izin sinirini test etmek icin OWNER'in org'unu hedeflemeli
        # (X-Organization-Id'siz istek kendi org'una gider ve 201 doner).
        contexts = await client.get("/api/admin/organization/contexts", headers=employee_headers)
        assert contexts.status_code == 200
        owner_context = next(item for item in contexts.json() if not item["owned"])
        employee_headers = {**employee_headers, "X-Organization-Id": str(owner_context["id"])}

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
        # team_manage (calisan yonetimi) Enterprise plan gerektirir
        db.add(Subscription(user_id=owner.id, plan_id="enterprise"))
        await db.commit()
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
