"""analytics_api integration testleri (soguk modul -> kapsam artisi).

Event sahibi admin icin 7 analitik GET endpoint'ini gercek veriyle calistirir,
ayrica 404 (yok) ve 403 (baska org) yollarini dogrular.
"""
import uuid as _uuid

import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy import select

from src.main import (
    app, SessionLocal, User, Organization, Subscription, Event, Attendee,
    Certificate, EventSession, Role, create_access_token, hash_password,
)


def _client():
    return AsyncClient(transport=ASGITransport(app=app), base_url="http://test")


async def _admin(email, org_public_id):
    async with SessionLocal() as db:
        admin = User(email=email, password_hash=hash_password("AdminPass123!"), role=Role.admin)
        db.add(admin)
        await db.flush()
        db.add(Organization(user_id=admin.id, public_id=org_public_id, org_name="Org", brand_color="#111111", settings={}))
        db.add(Subscription(user_id=admin.id, plan_id="growth", is_active=True))
        await db.commit()
        await db.refresh(admin)
        return admin.id, {"Authorization": f"Bearer {create_access_token(user_id=admin.id, role=Role.admin)}"}


async def _seed_event(admin_id, *, with_data=True):
    async with SessionLocal() as db:
        event = Event(admin_id=admin_id, name="Analytics Event", template_image_url="tpl.png",
                      config={}, certificate_enabled=True, checkin_enabled=True)
        db.add(event)
        await db.flush()
        eid = event.id
        if with_data:
            db.add_all([
                Attendee(event_id=eid, name="A1", email="a1@test.com", source="self_register", email_verified=True),
                Attendee(event_id=eid, name="A2", email="a2@test.com", source="import", email_verified=False),
            ])
            db.add(EventSession(event_id=eid, name="Oturum 1", checkin_token=f"ck_{eid}", is_active=True))
            db.add(Certificate(uuid=str(_uuid.uuid4()), public_id=f"cert_{eid}",
                               student_name="A1", event_id=eid, pdf_url="http://x/cert.pdf"))
        await db.commit()
        return eid


ANALYTICS_PATHS = [
    "",
    "/engagement",
    "/badges",
    "/tiers",
    "/timeline",
    "/export.csv",
    "/export.xlsx",
]


class TestAnalyticsEndpoints:
    @pytest.mark.asyncio
    @pytest.mark.parametrize("suffix", ANALYTICS_PATHS)
    async def test_analytics_endpoint_returns_200_for_owner(self, suffix):
        admin_id, headers = await _admin(f"an-owner{suffix.replace('/','-').replace('.','-') or 'base'}@test.com",
                                         f"org_an{abs(hash(suffix))%99999}")
        eid = await _seed_event(admin_id)
        async with _client() as ac:
            resp = await ac.get(f"/api/admin/events/{eid}/analytics{suffix}", headers=headers)
        assert resp.status_code == 200, resp.text

    @pytest.mark.asyncio
    async def test_analytics_404_for_missing_event(self):
        admin_id, headers = await _admin("an-404@test.com", "org_an_404")
        async with _client() as ac:
            resp = await ac.get("/api/admin/events/99999999/analytics", headers=headers)
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_analytics_403_for_other_admins_event(self):
        a_id, _ha = await _admin("an-iso-a@test.com", "org_an_iso_a")
        _b_id, hb = await _admin("an-iso-b@test.com", "org_an_iso_b")
        eid = await _seed_event(a_id)
        async with _client() as ac:
            resp = await ac.get(f"/api/admin/events/{eid}/analytics", headers=hb)
        assert resp.status_code == 403

    @pytest.mark.asyncio
    async def test_analytics_requires_auth(self):
        async with _client() as ac:
            resp = await ac.get("/api/admin/events/1/analytics")
        assert resp.status_code == 401
