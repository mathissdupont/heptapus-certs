from datetime import datetime, timedelta, timezone
from io import BytesIO
from pathlib import Path
from uuid import uuid4
from unittest.mock import patch
from zipfile import ZIP_DEFLATED, ZipFile

import pytest
from httpx import ASGITransport, AsyncClient

from src.main import Event, Organization, Role, SessionLocal, User, app, create_access_token, hash_password, settings
from src.presentation_models import PresentationDeck
from src.presentation_conversion_worker import _mark_conversion_failure, _recover_stale_decks


def _minimal_pptx() -> bytes:
    buffer = BytesIO()
    with ZipFile(buffer, "w", ZIP_DEFLATED) as archive:
        archive.writestr("[Content_Types].xml", "<Types/>")
        archive.writestr("ppt/presentation.xml", "<p:presentation xmlns:p='urn:test'/>")
    return buffer.getvalue()


async def _seed_upload_event() -> tuple[int, int, str]:
    unique = uuid4().hex[:12]
    async with SessionLocal() as db:
        admin = User(
            email=f"presentation-upload-{unique}@test.com",
            password_hash=hash_password("AdminPass123!"),
            role=Role.admin,
        )
        db.add(admin)
        await db.flush()
        organization = Organization(
            user_id=admin.id,
            public_id=f"org_upload_{unique}",
            org_name=f"Upload Org {unique}",
            brand_color="#111827",
            settings={},
        )
        db.add(organization)
        await db.flush()
        event = Event(
            admin_id=admin.id,
            public_id=f"evt_upload_{unique}",
            name=f"Upload Event {unique}",
            template_image_url="placeholder",
            config={},
        )
        db.add(event)
        await db.commit()
        return event.id, organization.id, create_access_token(user_id=admin.id, role=Role.admin)


class TestPresentationUpload:
    @pytest.mark.asyncio
    @pytest.mark.parametrize(
        ("filename", "content_type", "payload", "expected_conversion_status"),
        [
            ("deck.pdf", "application/pdf", b"%PDF-1.7\n%%EOF", "not_required"),
            ("deck.pptx", "application/octet-stream", _minimal_pptx(), "queued"),
        ],
    )
    async def test_event_presentation_upload_is_persisted(
        self,
        tmp_path: Path,
        filename: str,
        content_type: str,
        payload: bytes,
        expected_conversion_status: str,
    ):
        event_id, organization_id, token = await _seed_upload_event()
        transport = ASGITransport(app=app)

        with (
            patch.object(settings, "local_storage_dir", str(tmp_path)),
            patch.object(settings, "clamav_enabled", False),
        ):
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                response = await client.post(
                    f"/api/admin/presentations/events/{event_id}/upload",
                    headers={
                        "Authorization": f"Bearer {token}",
                        "X-Organization-Id": str(organization_id),
                    },
                    data={"title": "Quarterly deck", "language": "en"},
                    files={"file": (filename, payload, content_type)},
                )

        assert response.status_code == 201, response.text
        body = response.json()
        assert body["file_filename"] == filename
        assert body["file_size"] == len(payload)
        assert body["conversion_status"] == expected_conversion_status

        async with SessionLocal() as db:
            deck = await db.get(PresentationDeck, body["id"])
            assert deck is not None
            assert deck.file_path is not None
            assert (tmp_path / deck.file_path).read_bytes() == payload

    @pytest.mark.asyncio
    @pytest.mark.parametrize(
        ("filename", "content_type", "payload", "expected_detail"),
        [
            ("fake.pdf", "application/pdf", b"<html>not a pdf</html>", "valid PDF"),
            ("fake.pptx", "application/octet-stream", b"PK\x03\x04not-a-zip", "valid PowerPoint"),
            ("deck.pdf", "application/vnd.ms-powerpoint", b"%PDF-1.7\n%%EOF", "do not match"),
        ],
    )
    async def test_upload_rejects_disguised_or_mismatched_files(
        self,
        tmp_path: Path,
        filename: str,
        content_type: str,
        payload: bytes,
        expected_detail: str,
    ):
        event_id, organization_id, token = await _seed_upload_event()
        with (
            patch.object(settings, "local_storage_dir", str(tmp_path)),
            patch.object(settings, "clamav_enabled", False),
        ):
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                response = await client.post(
                    f"/api/admin/presentations/events/{event_id}/upload",
                    headers={"Authorization": f"Bearer {token}", "X-Organization-Id": str(organization_id)},
                    data={"title": "Disguised deck"},
                    files={"file": (filename, payload, content_type)},
                )

        assert response.status_code == 400
        assert expected_detail in response.json()["detail"]
        assert list(tmp_path.rglob("*.*")) == []

    @pytest.mark.asyncio
    async def test_upload_size_limit_is_enforced_before_validation(self, tmp_path: Path):
        event_id, organization_id, token = await _seed_upload_event()
        with (
            patch.object(settings, "local_storage_dir", str(tmp_path)),
            patch.object(settings, "presentation_max_upload_mb", 1),
            patch.object(settings, "clamav_enabled", False),
        ):
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                response = await client.post(
                    f"/api/admin/presentations/events/{event_id}/upload",
                    headers={"Authorization": f"Bearer {token}", "X-Organization-Id": str(organization_id)},
                    data={"title": "Too large"},
                    files={"file": ("large.pdf", b"%PDF-" + b"x" * (1024 * 1024), "application/pdf")},
                )

        assert response.status_code == 413
        assert list(tmp_path.rglob("*.*")) == []

    @pytest.mark.asyncio
    async def test_delete_removes_all_stored_deck_files(self, tmp_path: Path):
        event_id, organization_id, token = await _seed_upload_event()
        headers = {"Authorization": f"Bearer {token}", "X-Organization-Id": str(organization_id)}
        with (
            patch.object(settings, "local_storage_dir", str(tmp_path)),
            patch.object(settings, "clamav_enabled", False),
        ):
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                upload = await client.post(
                    f"/api/admin/presentations/events/{event_id}/upload",
                    headers=headers,
                    data={"title": "Delete me"},
                    files={"file": ("deck.pdf", b"%PDF-1.7\n%%EOF", "application/pdf")},
                )
                assert upload.status_code == 201, upload.text
                deck_id = upload.json()["id"]

                converted_path = f"presentations/tests/{deck_id}.converted.pdf"
                export_path = f"presentations/tests/{deck_id}.export.pptx"
                for relative_path in (converted_path, export_path):
                    path = tmp_path / relative_path
                    path.parent.mkdir(parents=True, exist_ok=True)
                    path.write_bytes(b"stored")
                async with SessionLocal() as db:
                    deck = await db.get(PresentationDeck, deck_id)
                    assert deck is not None
                    original_path = deck.file_path
                    deck.converted_file_path = converted_path
                    deck.last_export_path = export_path
                    await db.commit()

                response = await client.delete(f"/api/admin/presentations/{deck_id}", headers=headers)

        assert response.status_code == 204, response.text
        assert original_path is not None
        assert not (tmp_path / original_path).exists()
        assert not (tmp_path / converted_path).exists()
        assert not (tmp_path / export_path).exists()

    @pytest.mark.asyncio
    async def test_failed_powerpoint_conversion_can_be_retried(self, tmp_path: Path):
        event_id, organization_id, token = await _seed_upload_event()
        headers = {"Authorization": f"Bearer {token}", "X-Organization-Id": str(organization_id)}
        with (
            patch.object(settings, "local_storage_dir", str(tmp_path)),
            patch.object(settings, "clamav_enabled", False),
        ):
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                upload = await client.post(
                    f"/api/admin/presentations/events/{event_id}/upload",
                    headers=headers,
                    data={"title": "Retry deck"},
                    files={"file": ("deck.pptx", _minimal_pptx(), "application/octet-stream")},
                )
                assert upload.status_code == 201, upload.text
                deck_id = upload.json()["id"]
                async with SessionLocal() as db:
                    deck = await db.get(PresentationDeck, deck_id)
                    assert deck is not None
                    deck.conversion_status = "failed"
                    deck.conversion_error = "converter unavailable"
                    deck.conversion_attempts = 3
                    deck.status = "failed"
                    await db.commit()

                response = await client.post(f"/api/admin/presentations/{deck_id}/retry-conversion", headers=headers)

        assert response.status_code == 200, response.text
        assert response.json()["conversion_status"] == "queued"
        assert response.json()["conversion_attempts"] == 0
        assert response.json()["conversion_error"] is None

    @pytest.mark.asyncio
    async def test_stale_conversion_is_requeued_or_failed_after_max_attempts(self):
        event_id, organization_id, token = await _seed_upload_event()
        del token
        stale_at = datetime.now(timezone.utc) - timedelta(minutes=10)
        async with SessionLocal() as db:
            decks = []
            for attempts in (1, 3):
                deck = PresentationDeck(
                    organization_id=organization_id,
                    event_id=event_id,
                    title=f"Stale {attempts}",
                    theme={},
                    slides=[],
                    source="upload",
                    status="processing",
                    file_path=f"presentations/tests/stale-{uuid4().hex}.pptx",
                    file_filename="deck.pptx",
                    conversion_status="processing",
                    conversion_attempts=attempts,
                    updated_at=stale_at,
                )
                db.add(deck)
                decks.append(deck)
            await db.commit()
            deck_ids = [deck.id for deck in decks]

        with (
            patch.object(settings, "presentation_conversion_stale_seconds", 60),
            patch.object(settings, "presentation_conversion_max_attempts", 3),
        ):
            await _recover_stale_decks()

        async with SessionLocal() as db:
            retryable = await db.get(PresentationDeck, deck_ids[0])
            exhausted = await db.get(PresentationDeck, deck_ids[1])
            assert retryable is not None and retryable.conversion_status == "queued"
            assert retryable.status == "processing"
            assert exhausted is not None and exhausted.conversion_status == "failed"
            assert exhausted.status == "failed"

        with patch.object(settings, "presentation_conversion_max_attempts", 3):
            await _mark_conversion_failure(deck_ids[0], "converter unavailable")
        async with SessionLocal() as db:
            retryable = await db.get(PresentationDeck, deck_ids[0])
            assert retryable is not None and retryable.conversion_status == "queued"
            assert retryable.conversion_error == "converter unavailable"


class _FakeClamavReader:
    async def read(self, _size: int) -> bytes:
        return b"stream: INSTREAM size limit exceeded. ERROR\n"


class _FakeClamavWriter:
    def write(self, _data: bytes) -> None:
        pass

    async def drain(self) -> None:
        pass

    def close(self) -> None:
        pass

    async def wait_closed(self) -> None:
        pass


@pytest.mark.asyncio
async def test_clamav_stream_limit_has_an_actionable_error():
    from fastapi import HTTPException
    from src.upload_security import scan_upload_with_clamav

    async def fake_open_connection(_host: str, _port: int):
        return _FakeClamavReader(), _FakeClamavWriter()

    with (
        patch.object(settings, "clamav_enabled", True),
        patch("src.upload_security.asyncio.open_connection", side_effect=fake_open_connection),
    ):
        with pytest.raises(HTTPException) as exc_info:
            await scan_upload_with_clamav(b"deck")

    assert exc_info.value.status_code == 503
    assert "upload limit" in str(exc_info.value.detail).lower()
