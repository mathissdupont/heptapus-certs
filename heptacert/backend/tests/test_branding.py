import pytest
from httpx import AsyncClient, ASGITransport

from src.main import app, SessionLocal, User, Organization


@pytest.mark.asyncio
async def test_branding_returns_org_for_host():
    # Insert a user and organization into the test DB
    async with SessionLocal() as sess:
        async with sess.begin():
            user = User(email="owner@example.com", password_hash="x", role="admin")
            sess.add(user)
            await sess.flush()
            org = Organization(user_id=user.id, org_name="TestOrg", custom_domain="example.test", brand_logo="https://cdn/test.png", brand_color="#112233")
            sess.add(org)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        resp = await ac.get("/api/branding", headers={"host": "example.test"})
    assert resp.status_code == 200
    data = resp.json()
    assert data.get("org_name") == "TestOrg"
    assert data.get("brand_logo") == "https://cdn/test.png"
    assert data.get("brand_color") == "#112233"


@pytest.mark.asyncio
async def test_branding_no_host_returns_nulls():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Explicitly send empty Host header
        resp = await ac.get("/api/branding", headers={"host": ""})
    assert resp.status_code == 200
    data = resp.json()
    assert data.get("org_name") is None
    assert data.get("brand_logo") is None
    assert data.get("brand_color") is None
