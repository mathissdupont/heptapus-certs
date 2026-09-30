"""Lead-form access follows the central Growth+ feature policy."""

import pytest
from httpx import ASGITransport, AsyncClient

from src.main import (
    Organization,
    Role,
    SessionLocal,
    Subscription,
    User,
    app,
    create_access_token,
    hash_password,
)


async def _admin_with_plan(email: str, public_id: str, plan_id: str):
    async with SessionLocal() as db:
        user = User(email=email, password_hash=hash_password("AdminPass123!"), role=Role.admin)
        db.add(user)
        await db.flush()
        db.add(
            Organization(
                user_id=user.id,
                public_id=public_id,
                org_name="Lead Forms Org",
                brand_color="#111111",
                settings={},
            )
        )
        db.add(Subscription(user_id=user.id, plan_id=plan_id, is_active=True))
        await db.commit()
        token = create_access_token(user_id=user.id, role=Role.admin)
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("plan_id", "expected_status"),
    [("pro", 403), ("growth", 200), ("enterprise", 200)],
)
async def test_lead_forms_follow_growth_policy(plan_id: str, expected_status: int):
    headers = await _admin_with_plan(
        f"lead-forms-{plan_id}@example.com",
        f"lead_forms_{plan_id}",
        plan_id,
    )
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/admin/lead-forms", headers=headers)

    assert response.status_code == expected_status, response.text
