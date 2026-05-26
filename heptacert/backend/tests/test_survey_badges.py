from httpx import ASGITransport, AsyncClient
import pytest
from sqlalchemy import select

from src.main import (
    app,
    Attendee,
    CertificateTemplate,
    Event,
    Role,
    SessionLocal,
    User,
    create_access_token,
    make_survey_access_token,
)


async def _create_admin(email: str) -> User:
    async with SessionLocal() as sess:
        async with sess.begin():
            user = User(email=email, password_hash="x", role=Role.admin)
            sess.add(user)
            await sess.flush()
            user_id = user.id
    async with SessionLocal() as sess:
        return await sess.get(User, user_id)


async def _seed_event_with_attendee(owner: User, attendee_email: str = "attendee@example.com") -> dict:
    async with SessionLocal() as sess:
        async with sess.begin():
            event = Event(
                admin_id=owner.id,
                name="Survey Badge Event",
                template_image_url="template.png",
                config={},
            )
            sess.add(event)
            await sess.flush()

            attendee = Attendee(
                event_id=event.id,
                name="Attendee One",
                email=attendee_email,
                source="self_register",
                email_verified=True,
            )
            sess.add(attendee)
            await sess.flush()

            event_id = event.id
            attendee_id = attendee.id

    return {"event_id": event_id, "attendee_id": attendee_id}


@pytest.mark.asyncio
async def test_optional_builtin_survey_can_be_submitted_and_unlocks_attendee():
    owner = await _create_admin("survey-owner@example.com")
    token = create_access_token(user_id=owner.id, role=Role.admin)
    seeded = await _seed_event_with_attendee(owner)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        configured = await ac.post(
            f"/api/admin/events/{seeded['event_id']}/survey-config",
            json={
                "is_required": False,
                "survey_type": "builtin",
                "builtin_questions": [
                    {
                        "id": "satisfaction",
                        "type": "text",
                        "question": "How was the event?",
                        "required": True,
                    }
                ],
            },
            headers={"Authorization": f"Bearer {token}"},
        )
        assert configured.status_code == 200

        submitted = await ac.post(
            f"/api/surveys/{seeded['event_id']}/submit",
            json={
                "attendee_id": seeded["attendee_id"],
                "survey_type": "builtin",
                "answers": {"satisfaction": "Great"},
            },
        )
        assert submitted.status_code == 200

    async with SessionLocal() as sess:
        attendee = await sess.get(Attendee, seeded["attendee_id"])
        assert attendee is not None
        assert attendee.survey_required is False
        assert attendee.can_download_cert is True
        assert attendee.survey_completed_at is not None


@pytest.mark.asyncio
async def test_public_register_requires_email_verification_before_survey_access():
    owner = await _create_admin("survey-link-owner@example.com")
    token = create_access_token(user_id=owner.id, role=Role.admin)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        async with SessionLocal() as sess:
            async with sess.begin():
                event = Event(
                    admin_id=owner.id,
                    name="Survey Token Event",
                    template_image_url="template.png",
                    config={"visibility": "public"},
                )
                sess.add(event)
                await sess.flush()
                event_id = event.id

        configured = await ac.post(
            f"/api/admin/events/{event_id}/survey-config",
            json={
                "is_required": True,
                "survey_type": "builtin",
                "builtin_questions": [
                    {
                        "id": "satisfaction",
                        "type": "text",
                        "question": "How was the event?",
                        "required": True,
                    }
                ],
            },
            headers={"Authorization": f"Bearer {token}"},
        )
        assert configured.status_code == 200

        registered = await ac.post(
            f"/api/events/{event_id}/register",
            json={
                "name": "Token User",
                "email": "token-user@example.com",
                "kvkk_accepted": True,
                "cross_border_notice_read": True,
                "cross_border_transfer_consent": True,
            },
        )
        assert registered.status_code == 201, registered.text
        registration_payload = registered.json()
        assert registration_payload["verification_required"] is True
        assert registration_payload["email_verified"] is False

        async with SessionLocal() as sess:
            attendee = (await sess.execute(select(Attendee).where(Attendee.event_id == event_id))).scalar_one()
            verify_token = attendee.email_verification_token
            survey_token = make_survey_access_token(
                attendee_id=attendee.id,
                event_id=event_id,
                email=attendee.email,
            )

        verified = await ac.get(f"/api/events/{event_id}/verify-email", params={"token": verify_token})
        assert verified.status_code == 200

        resolved = await ac.get(
            f"/api/events/{event_id}/survey-access",
            params={"token": survey_token},
        )
        assert resolved.status_code == 200
        resolved_payload = resolved.json()
        assert resolved_payload["attendee_email"] == "token-user@example.com"

        submitted = await ac.post(
            f"/api/surveys/{event_id}/submit",
            json={
                "survey_token": survey_token,
                "survey_type": "builtin",
                "answers": {"satisfaction": "Great"},
            },
        )
        assert submitted.status_code == 200


@pytest.mark.asyncio
async def test_public_register_can_skip_email_verification_per_event():
    owner = await _create_admin("survey-skip-verify@example.com")

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        async with SessionLocal() as sess:
            async with sess.begin():
                event = Event(
                    admin_id=owner.id,
                    name="No Verification Event",
                    template_image_url="template.png",
                    config={"require_email_verification": False},
                )
                sess.add(event)
                await sess.flush()
                event_id = event.id

        registered = await ac.post(
            f"/api/events/{event_id}/register",
            json={"name": "Direct User", "email": "direct-user@example.com"},
        )
        assert registered.status_code == 201
        payload = registered.json()
        assert payload["verification_required"] is False
        assert payload["email_verified"] is True
        assert payload["status_url"]
        assert payload["survey_url"]

    async with SessionLocal() as sess:
        attendee = (await sess.execute(select(Attendee).where(Attendee.event_id == event_id))).scalar_one()
        assert attendee.email_verified is True
        assert attendee.email_verification_token is None


@pytest.mark.asyncio
async def test_email_verified_events_defer_capacity_consumption_until_confirmation():
    owner = await _create_admin("capacity-deferral-owner@example.com")

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        async with SessionLocal() as sess:
            async with sess.begin():
                event = Event(
                    admin_id=owner.id,
                    name="Capacity Deferral Event",
                    template_image_url="template.png",
                    config={
                        "require_email_verification": True,
                        "registration_quota_enabled": True,
                        "registration_quota": 1,
                        "registration_fields": [
                            {
                                "id": "meal",
                                "label": "Yemek Tercihi",
                                "type": "select",
                                "required": True,
                                "selection_mode": "single",
                                "options": [
                                    {"label": "Vegetarian", "capacity": 2},
                                ],
                            }
                        ],
                    },
                )
                sess.add(event)
                await sess.flush()
                event_id = event.id

        first_registered = await ac.post(
            f"/api/events/{event_id}/register",
            json={
                "name": "Pending One",
                "email": "pending-one@example.com",
                "registration_answers": {"meal": "Vegetarian"},
            },
        )
        assert first_registered.status_code == 201
        first_payload = first_registered.json()
        assert first_payload["verification_required"] is True

        second_registered = await ac.post(
            f"/api/events/{event_id}/register",
            json={
                "name": "Pending Two",
                "email": "pending-two@example.com",
                "registration_answers": {"meal": "Vegetarian"},
            },
        )
        assert second_registered.status_code == 201

        capacities_before = await ac.get(f"/api/events/{event_id}/capacities")
        assert capacities_before.status_code == 200
        capacities_before_payload = capacities_before.json()
        assert capacities_before_payload["meal"][0]["remaining"] == 2

        async with SessionLocal() as sess:
            attendee = (
                await sess.execute(
                    select(Attendee).where(Attendee.event_id == event_id, Attendee.email == "pending-one@example.com")
                )
            ).scalar_one()
            verify_token = attendee.email_verification_token

        verified = await ac.get(f"/api/events/{event_id}/verify-email", params={"token": verify_token})
        assert verified.status_code == 200

        capacities_after = await ac.get(f"/api/events/{event_id}/capacities")
        assert capacities_after.status_code == 200
        capacities_after_payload = capacities_after.json()
        assert capacities_after_payload["meal"][0]["remaining"] == 1

        async with SessionLocal() as sess:
            second = (
                await sess.execute(
                    select(Attendee).where(Attendee.event_id == event_id, Attendee.email == "pending-two@example.com")
                )
            ).scalar_one()
            second_verify_token = second.email_verification_token

        second_verified = await ac.get(f"/api/events/{event_id}/verify-email", params={"token": second_verify_token})
        assert second_verified.status_code == 403


@pytest.mark.asyncio
async def test_admin_can_change_registration_option_capacity_without_old_values_returning():
    owner = await _create_admin("capacity-update-owner@example.com")
    token = create_access_token(user_id=owner.id, role=Role.admin)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        async with SessionLocal() as sess:
            async with sess.begin():
                event = Event(
                    admin_id=owner.id,
                    name="Capacity Update Event",
                    template_image_url="template.png",
                    config={
                        "registration_fields": [
                            {
                                "id": "meal",
                                "label": "Yemek Tercihi",
                                "type": "select",
                                "required": True,
                                "selection_mode": "single",
                                "options": [
                                    {"label": "Vegetarian", "capacity": 20},
                                ],
                            }
                        ]
                    },
                )
                sess.add(event)
                await sess.flush()
                event_id = event.id

        initial_caps = await ac.get(f"/api/events/{event_id}/capacities")
        assert initial_caps.status_code == 200
        assert initial_caps.json()["meal"][0]["capacity"] == 20

        no_quota_update = await ac.patch(
            f"/api/admin/events/{event_id}",
            json={
                "registration_fields": [
                    {
                        "id": "meal",
                        "label": "Yemek Tercihi",
                        "type": "select",
                        "required": True,
                        "selection_mode": "single",
                        "options": [
                            {"label": "Vegetarian", "capacity": None},
                        ],
                    }
                ]
            },
            headers={"Authorization": f"Bearer {token}"},
        )
        assert no_quota_update.status_code == 200

        no_quota_caps = await ac.get(f"/api/events/{event_id}/capacities")
        assert no_quota_caps.status_code == 200
        assert no_quota_caps.json()["meal"][0]["capacity"] is None
        assert no_quota_caps.json()["meal"][0]["remaining"] is None

        quota_update = await ac.patch(
            f"/api/admin/events/{event_id}",
            json={
                "registration_fields": [
                    {
                        "id": "meal",
                        "label": "Yemek Tercihi",
                        "type": "select",
                        "required": True,
                        "selection_mode": "single",
                        "options": [
                            {"label": "Vegetarian", "capacity": 100},
                        ],
                    }
                ]
            },
            headers={"Authorization": f"Bearer {token}"},
        )
        assert quota_update.status_code == 200

        quota_caps = await ac.get(f"/api/events/{event_id}/capacities")
        assert quota_caps.status_code == 200
        assert quota_caps.json()["meal"][0]["capacity"] == 100


@pytest.mark.asyncio
async def test_admin_cannot_accidentally_clear_registration_fields():
    owner = await _create_admin("clear-guard-owner@example.com")
    token = create_access_token(user_id=owner.id, role=Role.admin)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        async with SessionLocal() as sess:
            async with sess.begin():
                event = Event(
                    admin_id=owner.id,
                    name="Clear Guard Event",
                    template_image_url="template.png",
                    config={
                        "registration_fields": [
                            {
                                "id": "phone",
                                "label": "Telefon Numarası",
                                "type": "text",
                                "required": True,
                            }
                        ]
                    },
                )
                sess.add(event)
                await sess.flush()
                event_id = event.id

        rejected = await ac.patch(
            f"/api/admin/events/{event_id}",
            json={"registration_fields": []},
            headers={"Authorization": f"Bearer {token}"},
        )

        assert rejected.status_code == 400

        async with SessionLocal() as sess:
            refreshed = (
                await sess.execute(select(Event).where(Event.id == event_id))
            ).scalar_one()
            fields = _get_event_registration_fields(refreshed)

        assert len(fields) == 1
        assert fields[0]["id"] == "phone"


@pytest.mark.asyncio
async def test_admin_rejects_invalid_registration_field_shapes():
    owner = await _create_admin("invalid-shape-owner@example.com")
    token = create_access_token(user_id=owner.id, role=Role.admin)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        async with SessionLocal() as sess:
            async with sess.begin():
                event = Event(
                    admin_id=owner.id,
                    name="Invalid Shape Event",
                    template_image_url="template.png",
                    config={
                        "registration_fields": [
                            {
                                "id": "contact",
                                "label": "İletişim",
                                "type": "text",
                                "required": True,
                            }
                        ]
                    },
                )
                sess.add(event)
                await sess.flush()
                event_id = event.id

        bad_select = await ac.patch(
            f"/api/admin/events/{event_id}",
            json={
                "registration_fields": [
                    {
                        "id": "meal",
                        "label": "Yemek Tercihi",
                        "type": "select",
                        "required": True,
                        "options": [],
                    }
                ]
            },
            headers={"Authorization": f"Bearer {token}"},
        )
        assert bad_select.status_code == 400

        bad_conditional = await ac.patch(
            f"/api/admin/events/{event_id}",
            json={
                "registration_fields": [
                    {
                        "id": "meal",
                        "label": "Yemek Tercihi",
                        "type": "select",
                        "required": True,
                        "options": ["Vegetarian", "Meat"],
                    },
                    {
                        "id": "notes",
                        "label": "Notlar",
                        "type": "text",
                        "required": False,
                        "required_when_field_id": "missing_field",
                        "required_when_equals": "Vegetarian",
                    },
                ]
            },
            headers={"Authorization": f"Bearer {token}"},
        )
        assert bad_conditional.status_code == 400

        async with SessionLocal() as sess:
            refreshed = (
                await sess.execute(select(Event).where(Event.id == event_id))
            ).scalar_one()
            fields = _get_event_registration_fields(refreshed)

        assert len(fields) == 1
        assert fields[0]["id"] == "contact"


@pytest.mark.asyncio
async def test_public_register_persists_custom_registration_answers():
    owner = await _create_admin("custom-form-owner@example.com")

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        async with SessionLocal() as sess:
            async with sess.begin():
                event = Event(
                    admin_id=owner.id,
                    name="Custom Form Event",
                    template_image_url="template.png",
                    config={
                        "registration_fields": [
                            {
                                "id": "tc_identity",
                                "label": "T.C. Kimlik No",
                                "type": "text",
                                "required": True,
                                "placeholder": "11 haneli numara",
                            },
                            {
                                "id": "department",
                                "label": "Departman",
                                "type": "select",
                                "required": False,
                                "options": ["Yazılım", "Pazarlama"],
                            },
                            {
                                "id": "interests",
                                "label": "Ilgi Alanlari",
                                "type": "select",
                                "required": True,
                                "selection_mode": "multiple",
                                "options": ["AI", "Cloud", "Security"],
                            },
                        ]
                    },
                )
                sess.add(event)
                await sess.flush()
                event_id = event.id

        info = await ac.get(f"/api/events/{event_id}/info")
        assert info.status_code == 200
        info_payload = info.json()
        assert len(info_payload["registration_fields"]) == 3
        assert info_payload["registration_fields"][0]["id"] == "tc_identity"
        assert info_payload["registration_fields"][2]["selection_mode"] == "multiple"

        invalid = await ac.post(
            f"/api/events/{event_id}/register",
            json={"name": "Missing Field", "email": "missing@example.com", "registration_answers": {}},
        )
        assert invalid.status_code == 400

        invalid_multi = await ac.post(
            f"/api/events/{event_id}/register",
            json={
                "name": "Bad Multi",
                "email": "bad-multi@example.com",
                "registration_answers": {
                    "tc_identity": "12345678901",
                    "interests": ["Unknown"],
                },
            },
        )
        assert invalid_multi.status_code == 400

        registered = await ac.post(
            f"/api/events/{event_id}/register",
            json={
                "name": "Custom User",
                "email": "custom-user@example.com",
                "registration_answers": {
                    "tc_identity": "12345678901",
                    "department": "Pazarlama",
                    "interests": ["AI", "Security"],
                },
            },
        )
        assert registered.status_code == 201

    async with SessionLocal() as sess:
        attendee = (
            await sess.execute(
                select(Attendee).where(Attendee.event_id == event_id, Attendee.email == "custom-user@example.com")
            )
        ).scalar_one()
        assert attendee.registration_answers == {
            "tc_identity": "12345678901",
            "department": "Pazarlama",
            "interests": ["AI", "Security"],
        }


@pytest.mark.asyncio
async def test_event_description_rich_text_is_sanitized_and_preserved():
    owner = await _create_admin("richtext-owner@example.com")
    token = create_access_token(user_id=owner.id, role=Role.admin)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        async with SessionLocal() as sess:
            async with sess.begin():
                event = Event(
                    admin_id=owner.id,
                    name="Rich Text Event",
                    template_image_url="template.png",
                    config={},
                )
                sess.add(event)
                await sess.flush()
                event_id = event.id

        updated = await ac.patch(
            f"/api/admin/events/{event_id}",
            json={
                "name": "Rich Text Event",
                "event_description": '<div><strong>Kalin</strong><br><font size="5" face="Georgia" color="#112233">Buyuk yazi</font><script>alert(1)</script></div>',
            },
            headers={"Authorization": f"Bearer {token}"},
        )
        assert updated.status_code == 200
        payload = updated.json()
        assert "<strong>Kalin</strong>" in payload["event_description"]
        assert "font-size: 24px" in payload["event_description"]
        assert "font-family: Georgia" in payload["event_description"]
        assert "<script" not in payload["event_description"]


@pytest.mark.asyncio
async def test_new_events_use_public_id_for_public_routes_while_legacy_numeric_ids_still_work():
    owner = await _create_admin("public-id-owner@example.com")
    token = create_access_token(user_id=owner.id, role=Role.admin)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        created = await ac.post(
            "/api/admin/events",
            json={
                "name": "Public Id Event",
                "template_image_url": "template.png",
                "config": {"visibility": "public"},
            },
            headers={"Authorization": f"Bearer {token}"},
        )
        assert created.status_code == 201
        created_payload = created.json()
        assert created_payload["public_id"].startswith("evt_")

        public_info = await ac.get(f"/api/events/{created_payload['public_id']}/info")
        assert public_info.status_code == 200
        assert public_info.json()["public_id"] == created_payload["public_id"]

        numeric_info = await ac.get(f"/api/events/{created_payload['id']}/info")
        assert numeric_info.status_code == 404

        async with SessionLocal() as sess:
            async with sess.begin():
                legacy_event = Event(
                    admin_id=owner.id,
                    name="Legacy Public Event",
                    template_image_url="template.png",
                    config={"visibility": "public"},
                )
                sess.add(legacy_event)
                await sess.flush()
                legacy_event_id = legacy_event.id

        legacy_info = await ac.get(f"/api/events/{legacy_event_id}/info")
        assert legacy_info.status_code == 200
        assert legacy_info.json()["public_id"] == str(legacy_event_id)


@pytest.mark.asyncio
async def test_admin_can_generate_attendee_specific_survey_link():
    owner = await _create_admin("survey-admin-link@example.com")
    token = create_access_token(user_id=owner.id, role=Role.admin)
    seeded = await _seed_event_with_attendee(owner, attendee_email="owner-link@example.com")

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get(
            f"/api/admin/events/{seeded['event_id']}/attendees/{seeded['attendee_id']}/survey-link",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 200
        payload = response.json()
        assert payload["attendee_email"] == "owner-link@example.com"
        assert payload["survey_token"]
        assert f"/events/{seeded['event_id']}/survey?token=" in payload["survey_url"]


@pytest.mark.asyncio
async def test_survey_config_toggle_unlocks_attendees_and_generates_webhook_key():
    owner = await _create_admin("survey-toggle@example.com")
    token = create_access_token(user_id=owner.id, role=Role.admin)
    seeded = await _seed_event_with_attendee(owner, attendee_email="toggle@example.com")

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        external_config = await ac.post(
            f"/api/admin/events/{seeded['event_id']}/survey-config",
            json={
                "is_required": True,
                "survey_type": "external",
                "builtin_questions": [],
                "external_provider": "typeform",
                "external_url": "https://example.com/typeform",
            },
            headers={"Authorization": f"Bearer {token}"},
        )
        assert external_config.status_code == 200
        assert external_config.json()["external_webhook_key"]

        builtin_required = await ac.post(
            f"/api/admin/events/{seeded['event_id']}/survey-config",
            json={
                "is_required": True,
                "survey_type": "builtin",
                "builtin_questions": [
                    {
                        "id": "q1",
                        "type": "text",
                        "question": "Question 1",
                        "required": True,
                    }
                ],
            },
            headers={"Authorization": f"Bearer {token}"},
        )
        assert builtin_required.status_code == 200

    async with SessionLocal() as sess:
        attendee = await sess.get(Attendee, seeded["attendee_id"])
        assert attendee is not None
        assert attendee.survey_required is True
        assert attendee.can_download_cert is False

    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        builtin_optional = await ac.post(
            f"/api/admin/events/{seeded['event_id']}/survey-config",
            json={
                "is_required": False,
                "survey_type": "builtin",
                "builtin_questions": [
                    {
                        "id": "q1",
                        "type": "text",
                        "question": "Question 1",
                        "required": True,
                    }
                ],
            },
            headers={"Authorization": f"Bearer {token}"},
        )
        assert builtin_optional.status_code == 200

    async with SessionLocal() as sess:
        attendee = await sess.get(Attendee, seeded["attendee_id"])
        assert attendee is not None
        assert attendee.survey_required is False
        assert attendee.can_download_cert is True


@pytest.mark.asyncio
async def test_disabled_survey_hides_public_survey_info_and_status_cta_signal():
    owner = await _create_admin("survey-disabled@example.com")
    token = create_access_token(user_id=owner.id, role=Role.admin)
    seeded = await _seed_event_with_attendee(owner, attendee_email="disabled@example.com")
    survey_token = make_survey_access_token(
        attendee_id=seeded["attendee_id"],
        event_id=seeded["event_id"],
        email="disabled@example.com",
    )

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        configured = await ac.post(
            f"/api/admin/events/{seeded['event_id']}/survey-config",
            json={
                "is_required": False,
                "survey_type": "disabled",
                "builtin_questions": [],
            },
            headers={"Authorization": f"Bearer {token}"},
        )
        assert configured.status_code == 200
        assert configured.json()["survey_type"] == "disabled"

        public_info = await ac.get(f"/api/events/{seeded['event_id']}/info")
        assert public_info.status_code == 200
        assert public_info.json()["survey"] is None

        participant_status = await ac.get(
            f"/api/events/{seeded['event_id']}/participant-status",
            params={"token": survey_token},
        )
        assert participant_status.status_code == 200
        status_payload = participant_status.json()
        assert status_payload["survey_enabled"] is False
        assert status_payload["survey_required"] is False

    async with SessionLocal() as sess:
        attendee = await sess.get(Attendee, seeded["attendee_id"])
        assert attendee is not None
        assert attendee.survey_required is False
        assert attendee.can_download_cert is True


@pytest.mark.asyncio
async def test_badge_list_returns_enriched_badge_metadata():
    owner = await _create_admin("badge-owner@example.com")
    token = create_access_token(user_id=owner.id, role=Role.admin)
    seeded = await _seed_event_with_attendee(owner, attendee_email="badge@example.com")

    async with SessionLocal() as sess:
        async with sess.begin():
            attendee = await sess.get(Attendee, seeded["attendee_id"])
            attendee.survey_completed_at = attendee.registered_at

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        configured = await ac.post(
            f"/api/admin/events/{seeded['event_id']}/badge-rules",
            json={
                "enabled": True,
                "badge_definitions": [
                    {
                        "type": "survey_star",
                        "name": "Survey Star",
                        "description": "Completed the survey",
                        "criteria": {"survey_completed": True},
                        "color_hex": "#F59E0B",
                    }
                ],
            },
            headers={"Authorization": f"Bearer {token}"},
        )
        assert configured.status_code == 200

        calculated = await ac.post(
            f"/api/admin/events/{seeded['event_id']}/badges/calculate",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert calculated.status_code == 200
        assert calculated.json()["badges_created"] == 1

        listed = await ac.get(
            f"/api/admin/events/{seeded['event_id']}/badges",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert listed.status_code == 200
        payload = listed.json()
        assert payload["total_badges"] == 1
        assert payload["badge_summary"]["by_type"]["survey_star"] == 1
        assert payload["badge_summary"]["automatic_vs_manual"]["automatic"] == 1

        badge = payload["badges"][0]
        assert badge["badge_name"] == "Survey Star"
        assert badge["badge_description"] == "Completed the survey"
        assert badge["badge_color_hex"] == "#F59E0B"
        assert badge["attendee_name"] == "Attendee One"
        assert badge["attendee_email"] == "badge@example.com"

        public_listed = await ac.get(
            f"/api/events/{seeded['event_id']}/attendees/{seeded['attendee_id']}/badges",
            params={"email": "badge@example.com"},
        )
        assert public_listed.status_code == 200
        public_payload = public_listed.json()
        assert public_payload["total_badges"] == 1
        assert public_payload["badges"][0]["badge_name"] == "Survey Star"


@pytest.mark.asyncio
async def test_apply_cert_template_preserves_event_registration_config():
    owner = await _create_admin("template-merge-owner@example.com")
    token = create_access_token(user_id=owner.id, role=Role.admin)

    async with SessionLocal() as sess:
        async with sess.begin():
            event = Event(
                admin_id=owner.id,
                name="Template Merge Event",
                template_image_url="old-template.png",
                config={
                    "visibility": "public",
                    "registration_fields": [
                        {
                            "id": "meal",
                            "label": "Yemek Tercihi",
                            "type": "select",
                            "required": True,
                            "selection_mode": "single",
                            "options": [{"label": "Vegetarian", "capacity": 2}],
                        }
                    ],
                    "font_color": "#111111",
                },
            )
            sess.add(event)
            await sess.flush()

            template = CertificateTemplate(
                name="Safe Template",
                template_image_url="new-template.png",
                config={
                    "font_color": "#222222",
                    "qr_x": 123,
                    "registration_fields": [],
                },
                is_default=True,
                order_index=999,
            )
            sess.add(template)
            await sess.flush()

            event_id = event.id
            template_id = template.id

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.post(
            f"/api/admin/events/{event_id}/apply-cert-template",
            json={"cert_template_id": template_id},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 200

    async with SessionLocal() as sess:
        event = await sess.get(Event, event_id)
        assert event is not None
        assert event.template_image_url == "new-template.png"
        assert event.config["visibility"] == "public"
        assert event.config["font_color"] == "#222222"
        assert event.config["qr_x"] == 123
        assert event.config["registration_fields"][0]["id"] == "meal"
        assert event.config["registration_fields"][0]["label"] == "Yemek Tercihi"


@pytest.mark.asyncio
async def test_save_event_config_preserves_existing_registration_fields():
    owner = await _create_admin("config-merge-owner@example.com")
    token = create_access_token(user_id=owner.id, role=Role.admin)

    async with SessionLocal() as sess:
        async with sess.begin():
            event = Event(
                admin_id=owner.id,
                name="Config Merge Event",
                template_image_url="template.png",
                config={
                    "font_size": 48,
                    "registration_fields": [
                        {
                            "id": "phone",
                            "label": "Telefon Numarası",
                            "type": "text",
                            "required": True,
                        }
                    ],
                },
            )
            sess.add(event)
            await sess.flush()
            event_id = event.id

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        saved = await ac.put(
            f"/api/admin/events/{event_id}/config",
            json={"font_size": 72},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert saved.status_code == 200

        rejected = await ac.put(
            f"/api/admin/events/{event_id}/config",
            json={"registration_fields": []},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert rejected.status_code == 400

    async with SessionLocal() as sess:
        event = await sess.get(Event, event_id)
        assert event is not None
        assert event.config["font_size"] == 72
        assert event.config["registration_fields"][0]["id"] == "phone"
        assert event.config["registration_fields"][0]["label"] == "Telefon Numarası"
