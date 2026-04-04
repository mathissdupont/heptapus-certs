from datetime import datetime, timedelta, timezone

import pytest
from httpx import ASGITransport, AsyncClient

from src.main import (
    app,
    SessionLocal,
    User,
    Event,
    EventSession,
    Attendee,
    AttendanceRecord,
    Subscription,
    Role,
    create_access_token,
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


async def _grant_paid_plan(user: User) -> None:
    async with SessionLocal() as sess:
        async with sess.begin():
            sess.add(
                Subscription(
                    user_id=user.id,
                    plan_id="pro",
                    is_active=True,
                    started_at=datetime.now(timezone.utc),
                    expires_at=datetime.now(timezone.utc) + timedelta(days=30),
                )
            )


async def _seed_event_for_raffles(owner: User) -> dict:
    async with SessionLocal() as sess:
        async with sess.begin():
            event = Event(
                admin_id=owner.id,
                name="Raffle Event",
                template_image_url="template.png",
                config={},
            )
            sess.add(event)
            await sess.flush()

            sessions = []
            for idx in range(3):
                session = EventSession(
                    event_id=event.id,
                    name=f"Session {idx + 1}",
                    checkin_token=f"token-{owner.id}-{idx}",
                    is_active=True,
                )
                sess.add(session)
                sessions.append(session)
            await sess.flush()

            attendees = []
            for idx in range(3):
                attendee = Attendee(
                    event_id=event.id,
                    name=f"Attendee {idx + 1}",
                    email=f"attendee{idx + 1}@example.com",
                    source="import",
                    email_verified=True,
                )
                sess.add(attendee)
                attendees.append(attendee)
            await sess.flush()

            # attendee1 -> 3 sessions, attendee2 -> 2 sessions, attendee3 -> 1 session
            for session in sessions:
                sess.add(AttendanceRecord(attendee_id=attendees[0].id, session_id=session.id))
            for session in sessions[:2]:
                sess.add(AttendanceRecord(attendee_id=attendees[1].id, session_id=session.id))
            sess.add(AttendanceRecord(attendee_id=attendees[2].id, session_id=sessions[0].id))

            event_id = event.id
            attendee_ids = [attendee.id for attendee in attendees]

    return {"event_id": event_id, "attendee_ids": attendee_ids}


@pytest.mark.asyncio
async def test_event_raffle_draws_only_eligible_attendees():
    owner = await _create_admin("raffle-owner@example.com")
    await _grant_paid_plan(owner)
    token = create_access_token(user_id=owner.id, role=Role.admin)
    seeded = await _seed_event_for_raffles(owner)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        created = await ac.post(
            f"/api/admin/events/{seeded['event_id']}/raffles",
            json={
                "title": "VIP Draw",
                "prize_name": "Wireless Headset",
                "description": "At least two sessions",
                "min_sessions_required": 2,
                "winner_count": 2,
                "reserve_winner_count": 0,
            },
            headers={"Authorization": f"Bearer {token}"},
        )
        assert created.status_code == 200
        raffle = created.json()
        assert raffle["eligible_count"] == 2
        assert len(raffle["eligible_attendees"]) == 2
        assert raffle["winner_count"] == 2
        assert raffle["reserve_winner_count"] == 0

        drawn = await ac.post(
            f"/api/admin/events/{seeded['event_id']}/raffles/{raffle['id']}/draw",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert drawn.status_code == 200
        drawn_payload = drawn.json()
        assert drawn_payload["status"] == "drawn"
        assert len(drawn_payload["winners"]) == 2
        assert {winner["attendee_id"] for winner in drawn_payload["winners"]}.issubset(
            set(seeded["attendee_ids"][:2])
        )
        assert all(winner["sessions_attended"] >= 2 for winner in drawn_payload["winners"])

        listed = await ac.get(
            f"/api/admin/events/{seeded['event_id']}/raffles",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert listed.status_code == 200
        listed_payload = listed.json()
        assert len(listed_payload) == 1
        assert listed_payload[0]["eligible_count"] == 2
        assert len(listed_payload[0]["eligible_attendees"]) == 2
        assert len(listed_payload[0]["winners"]) == 2


@pytest.mark.asyncio
async def test_updating_threshold_resets_existing_raffle_results():
    owner = await _create_admin("raffle-reset@example.com")
    await _grant_paid_plan(owner)
    token = create_access_token(user_id=owner.id, role=Role.admin)
    seeded = await _seed_event_for_raffles(owner)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        created = await ac.post(
            f"/api/admin/events/{seeded['event_id']}/raffles",
            json={
                "title": "Tablet Draw",
                "prize_name": "Tablet",
                "min_sessions_required": 1,
                "winner_count": 1,
                "reserve_winner_count": 0,
            },
            headers={"Authorization": f"Bearer {token}"},
        )
        assert created.status_code == 200
        raffle_id = created.json()["id"]

        drawn = await ac.post(
            f"/api/admin/events/{seeded['event_id']}/raffles/{raffle_id}/draw",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert drawn.status_code == 200
        assert drawn.json()["status"] == "drawn"
        assert len(drawn.json()["winners"]) == 1

        updated = await ac.patch(
            f"/api/admin/events/{seeded['event_id']}/raffles/{raffle_id}",
            json={"min_sessions_required": 3},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert updated.status_code == 200
        updated_payload = updated.json()
        assert updated_payload["status"] == "draft"
        assert updated_payload["eligible_count"] == 1
        assert updated_payload["winners"] == []

        reset = await ac.post(
            f"/api/admin/events/{seeded['event_id']}/raffles/{raffle_id}/reset",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert reset.status_code == 200
        assert reset.json()["status"] == "draft"
        assert reset.json()["winners"] == []


@pytest.mark.asyncio
async def test_redraw_excludes_previous_winners_and_export_returns_csv():
    owner = await _create_admin("raffle-redraw@example.com")
    await _grant_paid_plan(owner)
    token = create_access_token(user_id=owner.id, role=Role.admin)
    seeded = await _seed_event_for_raffles(owner)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        created = await ac.post(
            f"/api/admin/events/{seeded['event_id']}/raffles",
            json={
                "title": "Gift Box Draw",
                "prize_name": "Gift Box",
                "min_sessions_required": 1,
                "winner_count": 1,
                "reserve_winner_count": 1,
            },
            headers={"Authorization": f"Bearer {token}"},
        )
        assert created.status_code == 200
        created_payload = created.json()
        raffle_id = created_payload["id"]
        assert created_payload["reserve_winner_count"] == 1

        first_draw = await ac.post(
            f"/api/admin/events/{seeded['event_id']}/raffles/{raffle_id}/draw",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert first_draw.status_code == 200
        first_draw_payload = first_draw.json()
        first_winner_ids = {winner["attendee_id"] for winner in first_draw_payload["winners"]}
        assert len(first_winner_ids) == 2

        redraw = await ac.post(
            f"/api/admin/events/{seeded['event_id']}/raffles/{raffle_id}/redraw",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert redraw.status_code == 200
        redraw_payload = redraw.json()
        redraw_winner_ids = {winner["attendee_id"] for winner in redraw_payload["winners"]}
        assert len(redraw_winner_ids) == 3
        assert redraw_winner_ids.issuperset(first_winner_ids)

        export_resp = await ac.get(
            f"/api/admin/events/{seeded['event_id']}/raffles/{raffle_id}/export",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert export_resp.status_code == 200
        csv_text = export_resp.text
        assert "cekilis_basligi" in csv_text
        assert "kazanan_tipi" in csv_text
        assert "Gift Box Draw" in csv_text
        assert "asil" in csv_text
        assert "yedek" in csv_text
        assert len([line for line in csv_text.splitlines() if line.strip()]) == 4


@pytest.mark.asyncio
async def test_unverified_attendees_are_excluded_from_raffle_pool():
    owner = await _create_admin("raffle-verified@example.com")
    await _grant_paid_plan(owner)
    token = create_access_token(user_id=owner.id, role=Role.admin)
    seeded = await _seed_event_for_raffles(owner)

    async with SessionLocal() as sess:
        async with sess.begin():
            attendee = await sess.get(Attendee, seeded["attendee_ids"][2])
            attendee.email_verified = False

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        created = await ac.post(
            f"/api/admin/events/{seeded['event_id']}/raffles",
            json={
                "title": "Verified Only",
                "prize_name": "Badge",
                "min_sessions_required": 1,
                "winner_count": 1,
                "reserve_winner_count": 0,
            },
            headers={"Authorization": f"Bearer {token}"},
        )
        assert created.status_code == 200
        payload = created.json()
        assert payload["eligible_count"] == 2
        assert {row["attendee_id"] for row in payload["eligible_attendees"]} == set(seeded["attendee_ids"][:2])
