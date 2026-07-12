"""Regression: every event feature flag must round-trip through PATCH -> GET.

The quiz_enabled / cpd_enabled flags used to persist to the DB but were omitted
from the EventOut serializer (_event_to_out), so the API always reported them as
False — the settings checkbox reverted on refresh and the module tab never
appeared. This test flips EACH flag to a non-default value and asserts the API
reflects it, so any future flag that is saved-but-not-serialized (or vice versa)
fails loudly.
"""
import pytest
from httpx import AsyncClient, ASGITransport

from src.main import (
    app, SessionLocal, User, Organization, Subscription, Role,
    create_access_token, hash_password,
)


@pytest.fixture(autouse=True)
def _disable_rate_limiter():
    from src.main import limiter
    prev = limiter.enabled
    limiter.enabled = False
    yield
    limiter.enabled = prev


def _client():
    return AsyncClient(transport=ASGITransport(app=app), base_url="http://test")


async def _admin(email: str, org_public_id: str):
    async with SessionLocal() as db:
        admin = User(email=email, password_hash=hash_password("AdminPass123!"), role=Role.admin)
        db.add(admin)
        await db.flush()
        db.add(Organization(user_id=admin.id, public_id=org_public_id, org_name="Org",
                            brand_color="#111111", settings={}))
        db.add(Subscription(user_id=admin.id, plan_id="growth", is_active=True))
        await db.commit()
        await db.refresh(admin)
        return {"Authorization": f"Bearer {create_access_token(user_id=admin.id, role=Role.admin)}"}


# Flags whose default is False -> flip to True and expect True back.
_FLAGS_ENABLE = [
    "raffles_enabled", "gamification_enabled", "requires_approval",
    "quiz_enabled", "cpd_enabled", "agenda_enabled", "cfp_enabled",
    "networking_meetings_enabled", "live_engagement_enabled",
    "ticketing_enabled",
]
# Flags whose default is True -> flip to False and expect False back.
_FLAGS_DISABLE = ["certificate_enabled", "checkin_enabled", "registration_enabled"]


@pytest.mark.asyncio
async def test_all_feature_flags_round_trip():
    headers = await _admin("feat-flags@test.com", "org_feat_flags")
    async with _client() as ac:
        created = await ac.post("/api/admin/events", headers=headers, json={
            "name": "Feature Flag Event", "template_image_url": "placeholder"})
        assert created.status_code == 201, created.text
        event_id = created.json()["id"]

        # Flip every flag away from its default in a single PATCH (name is required).
        body = {"name": "Feature Flag Event", **{f: True for f in _FLAGS_ENABLE}}
        body.update({f: False for f in _FLAGS_DISABLE})
        patched = await ac.patch(f"/api/admin/events/{event_id}", headers=headers, json=body)
        assert patched.status_code == 200, patched.text

        # The PATCH response itself must reflect the new values...
        pj = patched.json()
        for f in _FLAGS_ENABLE:
            assert pj[f] is True, f"PATCH response {f} should be True, got {pj[f]}"
        for f in _FLAGS_DISABLE:
            assert pj[f] is False, f"PATCH response {f} should be False, got {pj[f]}"

        # ...and a fresh GET (what the settings page reads on refresh) must too.
        got = await ac.get(f"/api/admin/events/{event_id}", headers=headers)
        assert got.status_code == 200, got.text
        gj = got.json()
        for f in _FLAGS_ENABLE:
            assert gj[f] is True, f"GET {f} should persist True, got {gj[f]}"
        for f in _FLAGS_DISABLE:
            assert gj[f] is False, f"GET {f} should persist False, got {gj[f]}"


@pytest.mark.asyncio
async def test_quiz_flag_specifically_persists():
    """Focused reproduction of the reported bug."""
    headers = await _admin("quiz-flag@test.com", "org_quiz_flag")
    async with _client() as ac:
        created = await ac.post("/api/admin/events", headers=headers, json={
            "name": "Quiz Event", "template_image_url": "placeholder"})
        event_id = created.json()["id"]
        await ac.patch(f"/api/admin/events/{event_id}", headers=headers,
                       json={"name": "Quiz Event", "quiz_enabled": True})
        got = await ac.get(f"/api/admin/events/{event_id}", headers=headers)
    assert got.json()["quiz_enabled"] is True
