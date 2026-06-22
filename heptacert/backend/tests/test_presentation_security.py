from datetime import datetime, timedelta, timezone
from pathlib import Path
from uuid import uuid4

import pytest
from httpx import ASGITransport, AsyncClient

from src.main import (
    Event,
    Organization,
    Role,
    SessionLocal,
    User,
    app,
    create_access_token,
    hash_password,
    settings,
)
from src.presentation_models import PresentationDeck


def _suffix() -> str:
    return uuid4().hex[:12]


async def _seed_presentation_deck(
    *,
    audience_enabled: bool = False,
    allow_download: bool = False,
    watermark_enabled: bool = False,
    audience_expires_at: datetime | None = None,
    file_path: str | None = None,
) -> tuple[int, str, str, str, str]:
    unique = _suffix()
    async with SessionLocal() as db:
        admin = User(
            email=f"presentation-admin-{unique}@test.com",
            password_hash=hash_password("AdminPass123!"),
            role=Role.admin,
        )
        db.add(admin)
        await db.flush()

        org = Organization(
            user_id=admin.id,
            public_id=f"org_presentation_{unique}",
            org_name=f"Presentation Org {unique}",
            brand_color="#111827",
            settings={},
        )
        db.add(org)
        await db.flush()

        event = Event(
            admin_id=admin.id,
            public_id=f"evt_presentation_{unique}",
            name=f"Presentation Event {unique}",
            template_image_url="placeholder",
            config={},
        )
        db.add(event)
        await db.flush()

        control_token = f"control-{unique}"
        audience_token = f"audience-{unique}"
        deck = PresentationDeck(
            organization_id=org.id,
            event_id=event.id,
            created_by=admin.id,
            title="Confidential Deck",
            description="Security-sensitive deck",
            language="tr",
            theme={},
            slides=[{"title": "Intro"}],
            presenter_token=f"legacy-{unique}",
            control_token=control_token,
            audience_token=audience_token,
            audience_enabled=audience_enabled,
            allow_download=allow_download,
            watermark_enabled=watermark_enabled,
            audience_expires_at=audience_expires_at,
            source="upload",
            status="ready",
            file_path=file_path,
            file_filename="confidential.pdf" if file_path else None,
            file_content_type="application/pdf" if file_path else None,
            file_size=128 if file_path else None,
        )
        db.add(deck)
        await db.commit()
        await db.refresh(admin)
        await db.refresh(deck)
        return deck.id, create_access_token(user_id=admin.id, role=Role.admin), control_token, audience_token, unique


class TestPresentationSecurityControls:
    @pytest.mark.asyncio
    async def test_admin_can_toggle_security_and_regenerate_control_token(self):
        deck_id, admin_token, _control_token, _audience_token, _unique = await _seed_presentation_deck()
        transport = ASGITransport(app=app)

        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            before = await ac.get(
                f"/api/admin/presentations/{deck_id}/security",
                headers={"Authorization": f"Bearer {admin_token}"},
            )
            assert before.status_code == 200
            before_payload = before.json()
            assert before_payload["audience_enabled"] is False
            assert before_payload["allow_download"] is False

            after = await ac.patch(
                f"/api/admin/presentations/{deck_id}/security",
                headers={"Authorization": f"Bearer {admin_token}"},
                json={
                    "audience_enabled": True,
                    "allow_download": True,
                    "watermark_enabled": True,
                    "regenerate_control_token": True,
                },
            )

        assert after.status_code == 200
        payload = after.json()
        assert payload["audience_enabled"] is True
        assert payload["allow_download"] is True
        assert payload["watermark_enabled"] is True
        assert payload["audience_url"].startswith("/audience/")
        assert payload["presenter_control_url"].startswith("/presenter/")
        assert payload["presenter_control_url"] != before_payload["presenter_control_url"]

    @pytest.mark.asyncio
    async def test_audience_token_is_unavailable_until_enabled(self):
        _deck_id, _admin_token, _control_token, audience_token, _unique = await _seed_presentation_deck(
            audience_enabled=False,
            watermark_enabled=True,
        )
        transport = ASGITransport(app=app)

        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            blocked = await ac.get(f"/api/public/presentations/audience/{audience_token}")

        assert blocked.status_code == 404

        async with SessionLocal() as db:
            result = await db.execute(
                PresentationDeck.__table__.update()
                .where(PresentationDeck.audience_token == audience_token)
                .values(audience_enabled=True)
            )
            assert result.rowcount == 1
            await db.commit()

        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            allowed = await ac.get(f"/api/public/presentations/audience/{audience_token}")

        assert allowed.status_code == 200
        payload = allowed.json()
        assert payload["title"] == "Confidential Deck"
        assert payload["audience_enabled"] is True
        assert payload["watermark_enabled"] is True

    @pytest.mark.asyncio
    async def test_expired_audience_token_returns_gone(self):
        _deck_id, _admin_token, _control_token, audience_token, _unique = await _seed_presentation_deck(
            audience_enabled=True,
            audience_expires_at=datetime.now(timezone.utc) - timedelta(minutes=1),
        )
        transport = ASGITransport(app=app)

        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            resp = await ac.get(f"/api/public/presentations/audience/{audience_token}")

        assert resp.status_code == 410

    @pytest.mark.asyncio
    async def test_public_control_token_updates_session_but_audience_cannot(self):
        _deck_id, _admin_token, control_token, audience_token, _unique = await _seed_presentation_deck(
            audience_enabled=True,
        )
        transport = ASGITransport(app=app)

        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            control_resp = await ac.patch(
                f"/api/public/presentations/control/{control_token}/session",
                json={
                    "slide_index": 3,
                    "pointer_active": True,
                    "pointer_x": 0.4,
                    "pointer_y": 0.6,
                },
            )
            audience_patch = await ac.patch(
                f"/api/public/presentations/audience/{audience_token}/session",
                json={"slide_index": 0},
            )
            audience_state = await ac.get(f"/api/public/presentations/audience/{audience_token}/session")

        assert control_resp.status_code == 200
        control_payload = control_resp.json()
        assert control_payload["slide_index"] == 3
        assert control_payload["pointer_active"] is True
        assert control_payload["pointer_x"] == 0.4
        assert control_payload["pointer_y"] == 0.6
        assert audience_patch.status_code == 405
        assert audience_state.status_code == 200
        assert audience_state.json()["slide_index"] == 3

    @pytest.mark.asyncio
    async def test_audience_file_response_respects_download_policy(self):
        rel_path = f"presentations/tests/{_suffix()}.pdf"
        abs_path = Path(settings.local_storage_dir) / rel_path
        abs_path.parent.mkdir(parents=True, exist_ok=True)
        abs_path.write_bytes(b"%PDF-1.4\n% test deck\n")

        _deck_id, _admin_token, _control_token, audience_token, _unique = await _seed_presentation_deck(
            audience_enabled=True,
            allow_download=False,
            file_path=rel_path,
        )
        transport = ASGITransport(app=app)

        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            inline_resp = await ac.get(f"/api/public/presentations/audience/{audience_token}/file")

        assert inline_resp.status_code == 200
        assert inline_resp.headers["content-disposition"].startswith("inline;")
        assert inline_resp.headers["cache-control"] == "private, no-store"

        async with SessionLocal() as db:
            result = await db.execute(
                PresentationDeck.__table__.update()
                .where(PresentationDeck.audience_token == audience_token)
                .values(allow_download=True)
            )
            assert result.rowcount == 1
            await db.commit()

        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            attachment_resp = await ac.get(f"/api/public/presentations/audience/{audience_token}/file")

        assert attachment_resp.status_code == 200
        assert attachment_resp.headers["content-disposition"].startswith("attachment;")
