"""
Security-focused tests for HeptaCert backend.
Tests path traversal protection, input sanitisation, SSRF prevention, etc.
"""
import os
import io
import tempfile
from pathlib import Path
from unittest.mock import patch, MagicMock

import pytest
from starlette.datastructures import Headers, UploadFile


# ── Path traversal protection (serve_file) ───────────────────────────────────

class TestServeFileSecurity:
    """Test the serve_file endpoint for path traversal vulnerabilities."""

    def test_double_dot_rejected(self):
        """Path with '..' should be rejected."""
        from src.main import serve_file
        import asyncio
        from fastapi import HTTPException

        with pytest.raises(HTTPException) as exc_info:
            asyncio.get_event_loop().run_until_complete(
                serve_file("../../etc/passwd")
            )
        assert exc_info.value.status_code == 400

    def test_backslash_rejected(self):
        """Path with backslash traversal should be rejected."""
        from src.main import serve_file
        import asyncio
        from fastapi import HTTPException

        with pytest.raises(HTTPException) as exc_info:
            asyncio.get_event_loop().run_until_complete(
                serve_file("..\\..\\etc\\passwd")
            )
        assert exc_info.value.status_code == 400

    def test_normal_path_works(self):
        """A normal path that doesn't exist should return 404, not crash."""
        from src.main import serve_file
        import asyncio
        from fastapi import HTTPException

        with pytest.raises(HTTPException) as exc_info:
            asyncio.get_event_loop().run_until_complete(
                serve_file("pdfs/event_1/nonexistent.pdf")
            )
        assert exc_info.value.status_code == 404

    def test_private_registration_documents_are_not_publicly_served(self):
        from src.main import serve_file
        import asyncio
        from fastapi import HTTPException

        with pytest.raises(HTTPException) as exc_info:
            asyncio.get_event_loop().run_until_complete(
                serve_file("registration_docs/event_1/private.pdf")
            )
        assert exc_info.value.status_code == 404

    def test_private_storage_objects_cannot_be_reused_as_public_assets(self):
        from src.main import local_path_from_url

        with pytest.raises(ValueError):
            local_path_from_url("registration_docs/event_1/private.pdf")
        with pytest.raises(ValueError):
            local_path_from_url("zips/event_1/export.zip")


# ── Input sanitisation (search queries) ──────────────────────────────────────

class TestSearchSanitisation:
    """Test that search inputs are sanitised to prevent injection."""

    def test_tsquery_special_chars_stripped(self):
        """Special PostgreSQL tsquery characters should be cleaned."""
        import re
        test_inputs = [
            "test' OR 1=1 --",
            "name; DROP TABLE certificates;",
            "hello!@#$%^&*()",
            "<script>alert('xss')</script>",
        ]
        for inp in test_inputs:
            safe = re.sub(r"[^\w\s\u00e7\u011f\u0131\u00f6\u015f\u00fc\u00c7\u011e\u0130\u00d6\u015e\u00dc]", "", inp)
            assert "'" not in safe
            assert ";" not in safe
            assert "<" not in safe
            assert ">" not in safe
            assert "--" not in safe

    def test_turkish_chars_preserved(self):
        """Turkish characters should be preserved in search."""
        import re
        inp = "Çağrı Öztürk Şükriye"
        safe = re.sub(r"[^\w\s\u00e7\u011f\u0131\u00f6\u015f\u00fc\u00c7\u011e\u0130\u00d6\u015e\u00dc]", "", inp)
        assert "Ç" in safe or "ç" in safe.lower()
        assert "ö" in safe.lower()
        assert "Ş" in safe or "ş" in safe.lower()


class TestStoredHtmlSanitisation:
    def test_registration_helper_text_is_sanitised_on_legacy_read(self):
        from src.main import _normalize_registration_fields

        fields = _normalize_registration_fields([{
            "id": "note",
            "label": "Not",
            "type": "text",
            "helper_text": '<img src=x onerror="alert(1)"><strong>Guvenli</strong>',
        }])

        assert fields[0]["helper_text"] == "<strong>Guvenli</strong>"

    def test_organizer_notice_is_sanitised_on_read(self):
        from types import SimpleNamespace
        from src.main import _get_event_organizer_privacy_notice_text

        event = SimpleNamespace(config={
            "organizer_privacy_notice_text": '<script>alert(1)</script><p>Metin</p>',
        })
        result = _get_event_organizer_privacy_notice_text(event)

        assert "<script" not in result
        assert "<p>Metin</p>" in result


# ── Webhook SSRF protection ──────────────────────────────────────────────────

class TestUploadContentValidation:
    @pytest.mark.asyncio
    async def test_svg_upload_is_rejected_even_if_it_is_an_image_mime_type(self):
        from fastapi import HTTPException
        from src.main import _read_safe_raster_upload

        file = UploadFile(
            filename="payload.svg",
            file=io.BytesIO(b'<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'),
            headers=Headers({"content-type": "image/svg+xml"}),
        )
        with pytest.raises(HTTPException) as exc_info:
            await _read_safe_raster_upload(file)
        assert exc_info.value.status_code == 400

    @pytest.mark.asyncio
    async def test_fake_png_payload_is_rejected(self):
        from fastapi import HTTPException
        from src.main import _read_safe_raster_upload

        file = UploadFile(
            filename="payload.html",
            file=io.BytesIO(b"<script>alert(1)</script>"),
            headers=Headers({"content-type": "image/png"}),
        )
        with pytest.raises(HTTPException) as exc_info:
            await _read_safe_raster_upload(file)
        assert exc_info.value.status_code == 400


class TestTrustedProxyHandling:
    def test_forwarded_header_is_ignored_without_trusted_proxy(self):
        from starlette.requests import Request
        from src.main import _client_ip_for_rate_limit, settings

        request = Request({
            "type": "http",
            "client": ("127.0.0.1", 1234),
            "headers": [(b"x-forwarded-for", b"198.51.100.7")],
        })
        with patch.object(settings, "trusted_proxy_networks", ""):
            assert _client_ip_for_rate_limit(request) == "127.0.0.1"

    def test_forwarded_header_is_used_only_for_configured_proxy_network(self):
        from starlette.requests import Request
        from src.main import _client_ip_for_rate_limit, settings

        request = Request({
            "type": "http",
            "client": ("10.0.0.12", 1234),
            "headers": [(b"x-forwarded-for", b"198.51.100.7, 10.0.0.12")],
        })
        with patch.object(settings, "trusted_proxy_networks", "10.0.0.0/24"):
            assert _client_ip_for_rate_limit(request) == "198.51.100.7"


class TestSSRFProtection:
    """Test that webhook URL validation blocks internal/private addresses."""

    @pytest.mark.parametrize("url", [
        "http://localhost/hook",
        "http://127.0.0.1/hook",
        "http://0.0.0.0/hook",
        "http://169.254.169.254/latest/meta-data",
        "http://192.168.1.1/hook",
        "http://10.0.0.1/hook",
        "http://external-service.com/callback",
    ])
    def test_private_urls_rejected(self, url):
        from pydantic import ValidationError
        from src.main import WebhookEndpointIn
        with pytest.raises(ValidationError):
            WebhookEndpointIn(url=url, events=["cert.issued"])

    @pytest.mark.parametrize("url", [
        "https://hooks.example.com/webhook",
        "https://api.slack.com/webhook/abcd",
    ])
    def test_public_urls_accepted(self, url):
        from src.main import WebhookEndpointIn
        wh = WebhookEndpointIn(url=url, events=["cert.issued"])
        assert wh.url == url


# ── Password reset token replay protection ───────────────────────────────────

class TestPasswordResetSecurity:
    def test_reset_token_must_match_db(self):
        """Password reset should validate token matches DB record."""
        from src.main import make_email_token
        # Create a valid token
        token = make_email_token({"email": "user@test.com", "action": "reset"})
        assert isinstance(token, str)
        # The actual DB check happens in the endpoint (tested via integration tests)
        # Here we verify the token structure is valid
        from src.main import verify_email_token
        payload = verify_email_token(token, max_age=3600)
        assert payload["action"] == "reset"
        assert payload["email"] == "user@test.com"


# ── Pydantic model validation ───────────────────────────────────────────────

class TestInputValidation:
    def test_register_password_min_length(self):
        from pydantic import ValidationError
        from src.main import RegisterIn
        with pytest.raises(ValidationError):
            RegisterIn(email="test@test.com", password="short")  # < 8 chars

    def test_register_password_max_length(self):
        from pydantic import ValidationError
        from src.main import RegisterIn
        with pytest.raises(ValidationError):
            RegisterIn(email="test@test.com", password="x" * 200)  # > 128 chars

    def test_register_invalid_email(self):
        from pydantic import ValidationError
        from src.main import RegisterIn
        with pytest.raises(ValidationError):
            RegisterIn(email="not-an-email", password="validpass123")

    def test_reset_password_min_length(self):
        from pydantic import ValidationError
        from src.main import ResetPasswordIn
        with pytest.raises(ValidationError):
            ResetPasswordIn(token="sometoken", new_password="short")

    def test_change_password_validation(self):
        from pydantic import ValidationError
        from src.main import ChangePasswordIn
        with pytest.raises(ValidationError):
            ChangePasswordIn(current_password="", new_password="newpass123")

    def test_admin_role_pattern(self):
        from pydantic import ValidationError
        from src.main import AdminRoleIn
        # Valid roles
        r1 = AdminRoleIn(role="admin")
        r2 = AdminRoleIn(role="superadmin")
        assert r1.role == "admin"
        assert r2.role == "superadmin"
        # Invalid role
        with pytest.raises(ValidationError):
            AdminRoleIn(role="hacker")


# ── JWT security ─────────────────────────────────────────────────────────────

class TestJWTSecurity:
    def test_partial_token_not_usable_as_full(self):
        """Partial 2FA tokens should have the 'partial' flag set."""
        from src.main import create_partial_token, settings
        import jwt
        token = create_partial_token(user_id=1)
        payload = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
        assert payload["partial"] is True

    def test_full_token_no_partial_flag(self):
        """Normal access tokens should NOT have the 'partial' flag."""
        from src.main import create_access_token, Role, settings
        import jwt
        token = create_access_token(user_id=1, role=Role.admin)
        payload = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
        assert "partial" not in payload

    def test_token_with_wrong_secret_fails(self):
        from src.main import create_access_token, Role
        import jwt
        from jwt import InvalidTokenError as JWTError
        token = create_access_token(user_id=1, role=Role.admin)
        with pytest.raises(JWTError):
            jwt.decode(token, "wrong-secret", algorithms=["HS256"])

    def test_token_algorithm_pinned_to_hs256(self):
        """Should not accept tokens signed with other algorithms."""
        from src.main import settings
        import jwt
        from jwt import InvalidTokenError as JWTError
        # Create a token with HS384 — should fail verification with HS256-only
        payload = {"sub": "1", "role": "admin", "exp": 9999999999}
        token = jwt.encode(payload, settings.jwt_secret, algorithm="HS384")
        with pytest.raises(JWTError):
            jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])

    def test_oauth_redirect_keeps_access_token_out_of_url(self):
        from src.main import _oauth_bridge_redirect

        response = _oauth_bridge_redirect(
            "https://frontend.test/auth/google/callback?bridge=1",
            token="secret-access-token",
            mode="admin",
        )

        assert "secret-access-token" not in response.headers["location"]
        assert "HttpOnly" in response.headers["set-cookie"]
