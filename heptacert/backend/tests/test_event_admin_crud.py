"""Admin event CRUD + org izolasyonu (IDOR) integration testleri.

main.py'daki cekirdek event route handler'larini calistirir (create/list/get/
update/delete) ve bir org'un baska org'un event'ine erisemedigini dogrular.
Bu handler'lar routers refactor'unde (Adim 4d) tasinacak -> regresyon kalkani.
"""
import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy import select

from src.main import (
    app, SessionLocal, User, Organization, Subscription, Role,
    create_access_token, hash_password,
)


def _client():
    return AsyncClient(transport=ASGITransport(app=app), base_url="http://test")


async def _admin(email: str, org_public_id: str):
    async with SessionLocal() as db:
        admin = User(email=email, password_hash=hash_password("AdminPass123!"), role=Role.admin)
        db.add(admin)
        await db.flush()
        db.add(Organization(user_id=admin.id, public_id=org_public_id, org_name="Org", brand_color="#111111", settings={}))
        db.add(Subscription(user_id=admin.id, plan_id="growth", is_active=True))
        await db.commit()
        await db.refresh(admin)
        return admin.id, {"Authorization": f"Bearer {create_access_token(user_id=admin.id, role=Role.admin)}"}


async def _create_event(ac, headers, name="Test Event"):
    resp = await ac.post("/api/admin/events", headers=headers, json={
        "name": name, "template_image_url": "placeholder"})
    assert resp.status_code == 201, resp.text
    return resp.json()


class TestEventAdminCrud:
    @pytest.mark.asyncio
    async def test_create_event_returns_201_with_id(self):
        _id, headers = await _admin("ev-create@test.com", "org_ev_create")
        async with _client() as ac:
            body = await _create_event(ac, headers, "Konferans 2026")
        assert body.get("id")
        assert body["name"] == "Konferans 2026"

    @pytest.mark.asyncio
    async def test_list_events_returns_created(self):
        _id, headers = await _admin("ev-list@test.com", "org_ev_list")
        async with _client() as ac:
            await _create_event(ac, headers, "Etkinlik A")
            await _create_event(ac, headers, "Etkinlik B")
            resp = await ac.get("/api/admin/events", headers=headers)
        assert resp.status_code == 200
        names = {e["name"] for e in resp.json()}
        assert {"Etkinlik A", "Etkinlik B"} <= names

    @pytest.mark.asyncio
    async def test_get_event_by_id(self):
        _id, headers = await _admin("ev-get@test.com", "org_ev_get")
        async with _client() as ac:
            ev = await _create_event(ac, headers, "Getir")
            resp = await ac.get(f"/api/admin/events/{ev['id']}", headers=headers)
        assert resp.status_code == 200
        assert resp.json()["id"] == ev["id"]

    @pytest.mark.asyncio
    async def test_update_event_name(self):
        _id, headers = await _admin("ev-update@test.com", "org_ev_update")
        async with _client() as ac:
            ev = await _create_event(ac, headers, "Eski Ad")
            patch = await ac.patch(f"/api/admin/events/{ev['id']}", headers=headers, json={"name": "Yeni Ad"})
            assert patch.status_code == 200, patch.text
            got = await ac.get(f"/api/admin/events/{ev['id']}", headers=headers)
        assert got.json()["name"] == "Yeni Ad"

    @pytest.mark.asyncio
    async def test_delete_event_then_404(self):
        _id, headers = await _admin("ev-delete@test.com", "org_ev_delete")
        async with _client() as ac:
            ev = await _create_event(ac, headers, "Silinecek")
            d = await ac.delete(f"/api/admin/events/{ev['id']}", headers=headers)
            assert d.status_code in (200, 204)
            got = await ac.get(f"/api/admin/events/{ev['id']}", headers=headers)
        assert got.status_code == 404

    @pytest.mark.asyncio
    async def test_create_event_requires_auth(self):
        async with _client() as ac:
            resp = await ac.post("/api/admin/events", json={"name": "NoAuth"})
        assert resp.status_code == 401


class TestEventOrgIsolation:
    @pytest.mark.asyncio
    async def test_admin_cannot_access_other_orgs_event(self):
        _a, headers_a = await _admin("ev-iso-a@test.com", "org_iso_a")
        _b, headers_b = await _admin("ev-iso-b@test.com", "org_iso_b")
        async with _client() as ac:
            ev = await _create_event(ac, headers_a, "A'nin Etkinligi")
            # B, A'nin event'ini gormeye/silmeye calisir
            got = await ac.get(f"/api/admin/events/{ev['id']}", headers=headers_b)
            assert got.status_code in (403, 404)
            deleted = await ac.delete(f"/api/admin/events/{ev['id']}", headers=headers_b)
            assert deleted.status_code in (403, 404)
            # A hala kendi event'ine erisebilir
            still = await ac.get(f"/api/admin/events/{ev['id']}", headers=headers_a)
        assert still.status_code == 200
