"""event_crm_api integration testleri (en buyuk soguk modul -> derin kapsam).

Org-seviyesi katilimci CRM'i: summary, kaydedilmis view CRUD ve 3 saglayicinin
(HubSpot/Salesforce/Mailchimp) entegrasyon CRUD'u. Tum CRM Enterprise plan
gerektirir; non-enterprise admin 403 alir.
"""
import pytest
from httpx import AsyncClient, ASGITransport

from src.main import (
    app, SessionLocal, User, Organization, Subscription, Role,
    create_access_token, hash_password,
)


def _client():
    return AsyncClient(transport=ASGITransport(app=app), base_url="http://test")


async def _admin(email, org_public_id, plan="enterprise"):
    async with SessionLocal() as db:
        admin = User(email=email, password_hash=hash_password("AdminPass123!"), role=Role.admin)
        db.add(admin)
        await db.flush()
        db.add(Organization(user_id=admin.id, public_id=org_public_id, org_name="CRM Org", brand_color="#111111", settings={}))
        if plan:
            db.add(Subscription(user_id=admin.id, plan_id=plan, is_active=True))
        await db.commit()
        await db.refresh(admin)
        return admin.id, {"Authorization": f"Bearer {create_access_token(user_id=admin.id, role=Role.admin)}"}


class TestCrmSummaryAndViews:
    @pytest.mark.asyncio
    async def test_summary_returns_200(self):
        _id, h = await _admin("crm-sum@test.com", "org_crm_sum")
        async with _client() as ac:
            resp = await ac.get("/api/admin/crm/summary", headers=h)
        assert resp.status_code == 200, resp.text
        body = resp.json()
        assert "total_participants" in body and "by_status" in body

    @pytest.mark.asyncio
    async def test_saved_view_full_crud(self):
        _id, h = await _admin("crm-views@test.com", "org_crm_views")
        async with _client() as ac:
            created = await ac.post("/api/admin/crm/views", headers=h, json={
                "name": "VIP Katilimcilar", "filters": {"lifecycle_status": "customer"}, "visibility": "private"})
            assert created.status_code == 201, created.text
            vid = created.json()["id"]

            listed = await ac.get("/api/admin/crm/views", headers=h)
            assert listed.status_code == 200
            assert any(v["id"] == vid for v in listed.json())

            patched = await ac.patch(f"/api/admin/crm/views/{vid}", headers=h, json={
                "name": "Guncel Ad", "filters": {}, "visibility": "organization"})
            assert patched.status_code == 200
            assert patched.json()["name"] == "Guncel Ad"

            deleted = await ac.delete(f"/api/admin/crm/views/{vid}", headers=h)
            assert deleted.status_code in (200, 204)

            again = await ac.patch(f"/api/admin/crm/views/{vid}", headers=h, json={
                "name": "x", "filters": {}, "visibility": "private"})
            assert again.status_code == 404

    @pytest.mark.asyncio
    async def test_view_isolation_between_orgs(self):
        _a, ha = await _admin("crm-viso-a@test.com", "org_crm_viso_a")
        _b, hb = await _admin("crm-viso-b@test.com", "org_crm_viso_b")
        async with _client() as ac:
            created = await ac.post("/api/admin/crm/views", headers=ha, json={
                "name": "A view", "filters": {}, "visibility": "private"})
            vid = created.json()["id"]
            # B, A'nin (private) view'ini guncelleyemez
            resp = await ac.patch(f"/api/admin/crm/views/{vid}", headers=hb, json={
                "name": "hack", "filters": {}, "visibility": "private"})
        assert resp.status_code == 404


class TestCrmIntegrations:
    @pytest.mark.asyncio
    async def test_hubspot_crud(self):
        _id, h = await _admin("crm-hub@test.com", "org_crm_hub")
        async with _client() as ac:
            assert (await ac.get("/api/admin/crm/integrations/hubspot", headers=h)).json()["configured"] is False
            up = await ac.patch("/api/admin/crm/integrations/hubspot", headers=h, json={
                "private_app_token": "pat-12345678", "enabled": True})
            assert up.status_code == 200
            assert up.json()["configured"] is True
            assert (await ac.get("/api/admin/crm/integrations/hubspot", headers=h)).json()["configured"] is True
            assert (await ac.delete("/api/admin/crm/integrations/hubspot", headers=h)).status_code == 200
            # DELETE artik kalici siliyor (JSONB deep-copy fix'i)
            assert (await ac.get("/api/admin/crm/integrations/hubspot", headers=h)).json()["configured"] is False

    @pytest.mark.asyncio
    async def test_salesforce_crud(self):
        _id, h = await _admin("crm-sf@test.com", "org_crm_sf")
        async with _client() as ac:
            up = await ac.patch("/api/admin/crm/integrations/salesforce", headers=h, json={
                "access_token": "sf-token-123", "instance_url": "https://x.my.salesforce.com", "enabled": True})
            assert up.status_code == 200, up.text
            assert up.json()["configured"] is True
            assert (await ac.delete("/api/admin/crm/integrations/salesforce", headers=h)).status_code == 200
            assert (await ac.get("/api/admin/crm/integrations/salesforce", headers=h)).json()["configured"] is False

    @pytest.mark.asyncio
    async def test_mailchimp_crud(self):
        _id, h = await _admin("crm-mc@test.com", "org_crm_mc")
        async with _client() as ac:
            up = await ac.patch("/api/admin/crm/integrations/mailchimp", headers=h, json={
                "api_key": "mc-key-12345", "list_id": "abc123", "provider": "mailchimp", "enabled": True})
            assert up.status_code == 200, up.text
            assert up.json()["configured"] is True
            assert (await ac.delete("/api/admin/crm/integrations/mailchimp", headers=h)).status_code == 200
            assert (await ac.get("/api/admin/crm/integrations/mailchimp", headers=h)).json()["configured"] is False


class TestCrmEnterpriseGate:
    @pytest.mark.asyncio
    async def test_non_enterprise_admin_blocked(self):
        _id, h = await _admin("crm-nonent@test.com", "org_crm_nonent", plan="growth")
        async with _client() as ac:
            resp = await ac.get("/api/admin/crm/summary", headers=h)
        assert resp.status_code == 403  # CRM yalnizca Enterprise

    @pytest.mark.asyncio
    async def test_crm_requires_auth(self):
        async with _client() as ac:
            resp = await ac.get("/api/admin/crm/summary")
        assert resp.status_code == 401
