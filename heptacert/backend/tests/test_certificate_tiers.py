from datetime import datetime, timezone
from uuid import uuid4

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select

from src.certificate_tier_rules import select_certificate_tier
from src.main import (
    AttendaonceRecord,
    Attendee,
    Certificate,
    CertificateTemplate,
    CertStatus,
    Event,
    EventSession,
    Role,
    SessionLocal,
    User,
    app,
    create_access_token,
)


def test_tier_evaluator_uses_order_logic_and_fails_closed():
    definitions = [
        {
            "tier_name": "Gold",
            "conditions": [
                {"field": "attendance_rate", "operator": "gte", "value": 80},
                {"field": "survey_completed", "operator": "eq", "value": True},
            ],
            "condition_logic": "AND",
        },
        {
            "tier_name": "Silver",
            "conditions": [
                {"field": "attendance_rate", "operator": "gte", "value": 50},
                {"field": "email_verified", "operator": "eq", "value": True},
            ],
            "condition_logic": "OR",
        },
        {"tier_name": "Bronze", "conditions": [], "condition_logic": "AND"},
    ]

    assert select_certificate_tier(
        definitions,
        {"attendance_rate": 90, "survey_completed": True, "email_verified": True},
    )["tier_name"] == "Gold"
    assert select_certificate_tier(
        definitions,
        {"attendance_rate": 60, "survey_completed": False, "email_verified": False},
    )["tier_name"] == "Silver"
    assert select_certificate_tier(definitions, {})["tier_name"] == "Bronze"
    assert select_certificate_tier(
        [{"tier_name": "Bad", "conditions": [{"field": "unknown", "value": 1}]}],
        {"attendance_rate": 100},
    ) is None


async def _seed_tier_event() -> tuple[int, int, list[int], str]:
    seed_id = uuid4().hex
    async with SessionLocal() as session:
        async with session.begin():
            owner = User(email=f"tier-owner-{seed_id}@example.com", password_hash="x", role=Role.admin)
            session.add(owner)
            await session.flush()
            event = Event(
                admin_id=owner.id,
                name="Tier Evaluation Event",
                template_image_url="template.png",
                config={},
            )
            template = CertificateTemplate(
                name="Gold template",
                template_image_url="gold.png",
                config={},
            )
            session.add_all([event, template])
            await session.flush()

            sessions = [
                EventSession(event_id=event.id, name=f"Session {number}", checkin_token=f"tier-{seed_id}-{number}")
                for number in (1, 2)
            ]
            session.add_all(sessions)
            await session.flush()

            attendees = [
                Attendee(
                    event_id=event.id,
                    name="Gold Attendee",
                    email="gold-tier@example.com",
                    source="import",
                    email_verified=True,
                    survey_completed_at=datetime.now(timezone.utc),
                ),
                Attendee(
                    event_id=event.id,
                    name="Silver Attendee",
                    email="silver-tier@example.com",
                    source="self_register",
                    email_verified=True,
                ),
                Attendee(
                    event_id=event.id,
                    name="Bronze Attendee",
                    email="bronze-tier@example.com",
                    source="import",
                    email_verified=False,
                ),
            ]
            session.add_all(attendees)
            await session.flush()

            session.add_all(
                [
                    AttendaonceRecord(attendee_id=attendees[0].id, session_id=sessions[0].id),
                    AttendaonceRecord(attendee_id=attendees[0].id, session_id=sessions[1].id),
                    AttendaonceRecord(attendee_id=attendees[1].id, session_id=sessions[0].id),
                ]
            )
            certificates = [
                Certificate(
                    uuid=str(uuid4()),
                    student_name=attendee.name,
                    event_id=event.id,
                    attendee_id=attendee.id,
                    pdf_url=f"certificate-{index}.pdf",
                    status=CertStatus.active,
                )
                for index, attendee in enumerate(attendees, start=1)
            ]
            session.add_all(certificates)
            await session.flush()
            return (
                event.id,
                template.id,
                [certificate.id for certificate in certificates],
                create_access_token(user_id=owner.id, role=Role.admin),
            )


@pytest.mark.asyncio
async def test_assign_certificate_tiers_evaluates_metrics_and_template():
    event_id, template_id, certificate_ids, token = await _seed_tier_event()
    headers = {"Authorization": f"Bearer {token}"}
    rules = {
        "tier_definitions": [
            {
                "tier_name": "Gold",
                "template_id": template_id,
                "conditions": [
                    {"field": "attendance_rate", "operator": "gte", "value": 80},
                    {"field": "survey_completed", "operator": "eq", "value": True},
                ],
                "condition_logic": "AND",
            },
            {
                "tier_name": "Silver",
                "conditions": [
                    {"field": "attendance_rate", "operator": "gte", "value": 50}
                ],
            },
            {"tier_name": "Bronze", "conditions": []},
        ]
    }

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        saved = await client.post(
            f"/api/admin/events/{event_id}/certificate-tiers", json=rules, headers=headers
        )
        assert saved.status_code == 200, saved.text

        assigned = await client.post(
            f"/api/admin/events/{event_id}/certificates/assign-tiers", headers=headers
        )
        assert assigned.status_code == 200, assigned.text
        assert assigned.json()["certificates_assigned"] == 3
        assert assigned.json()["certificates_unmatched"] == 0

    async with SessionLocal() as session:
        certificates = (
            await session.execute(
                select(Certificate)
                .where(Certificate.id.in_(certificate_ids))
                .order_by(Certificate.id)
            )
        ).scalars().all()
        assert [certificate.certificate_tier for certificate in certificates] == [
            "Gold",
            "Silver",
            "Bronze",
        ]
        assert certificates[0].tier_template_id == template_id
        assert certificates[1].tier_template_id is None


@pytest.mark.asyncio
async def test_tier_rule_contract_rejects_unknown_fields_and_shadowed_fallback():
    event_id, _, _, token = await _seed_tier_event()
    headers = {"Authorization": f"Bearer {token}"}

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        unknown = await client.post(
            f"/api/admin/events/{event_id}/certificate-tiers",
            json={
                "tier_definitions": [
                    {
                        "tier_name": "Gold",
                        "conditions": [{"field": "made_up", "operator": "gte", "value": 1}],
                    }
                ]
            },
            headers=headers,
        )
        assert unknown.status_code == 422

        shadowed = await client.post(
            f"/api/admin/events/{event_id}/certificate-tiers",
            json={
                "tier_definitions": [
                    {"tier_name": "Fallback", "conditions": []},
                    {
                        "tier_name": "Gold",
                        "conditions": [
                            {"field": "attendance_rate", "operator": "gte", "value": 80}
                        ],
                    },
                ]
            },
            headers=headers,
        )
        assert shadowed.status_code == 422
