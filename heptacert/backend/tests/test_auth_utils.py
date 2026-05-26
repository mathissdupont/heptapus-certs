"""
Unit tests for authentication & utility functions.
Tests pure logic — no database or network access needed.
"""
import hashlib
import time
from datetime import datetime, timedelta, timezone
from unittest.mock import patch

import pytest
import jwt
from itsdangerous import SignatureExpired, BadSignature


# ── Password hashing ─────────────────────────────────────────────────────────

class TestPasswordHashing:
    def test_hash_password_returns_bcrypt_hash(self):
        from src.main import hash_password
        h = hash_password("TestPassword123")
        assert h.startswith("$2b$") or h.startswith("$2a$")
        assert len(h) > 50

    def test_verify_password_correct(self):
        from src.main import hash_password, verify_password
        pw = "MySecurePass!99"
        h = hash_password(pw)
        assert verify_password(pw, h) is True

    def test_verify_password_incorrect(self):
        from src.main import hash_password, verify_password
        h = hash_password("correct_password")
        assert verify_password("wrong_password", h) is False

    def test_hash_password_different_each_time(self):
        from src.main import hash_password
        h1 = hash_password("same")
        h2 = hash_password("same")
        assert h1 != h2  # bcrypt salt differs


# ── Email tokens (itsdangerous) ──────────────────────────────────────────────

class TestEmailTokens:
    def test_make_and_verify_token(self):
        from src.main import make_email_token, verify_email_token
        payload = {"email": "test@example.com", "action": "verify"}
        token = make_email_token(payload)
        assert isinstance(token, str)
        result = verify_email_token(token, max_age=3600)
        assert result["email"] == "test@example.com"
        assert result["action"] == "verify"

    def test_verify_token_expired(self):
        from unittest.mock import patch
        from src.main import make_email_token, verify_email_token
        token = make_email_token({"email": "test@example.com"})
        # Patch time to simulate 2 hours in the future
        import time as _time
        future = _time.time() + 7200
        with patch("itsdangerous.timed.time.time", return_value=future):
            with pytest.raises(SignatureExpired):
                verify_email_token(token, max_age=3600)

    def test_verify_token_tampered(self):
        from src.main import verify_email_token
        with pytest.raises((BadSignature, Exception)):
            verify_email_token("tampered-invalid-token", max_age=3600)


# ── JWT creation ──────────────────────────────────────────────────────────────

class TestJWT:
    def test_create_access_token(self):
        from src.main import create_access_token, Role, settings
        token = create_access_token(user_id=42, role=Role.admin)
        payload = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
        assert payload["sub"] == "42"
        assert payload["role"] == "admin"
        assert "exp" in payload
        assert "iat" in payload

    def test_create_partial_token(self):
        from src.main import create_partial_token, settings
        token = create_partial_token(user_id=7)
        payload = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
        assert payload["sub"] == "7"
        assert payload["partial"] is True
        # Should expire in ~120 seconds
        exp_delta = payload["exp"] - payload["iat"]
        assert 115 <= exp_delta <= 125

    def test_access_token_has_correct_expiry(self):
        from src.main import create_access_token, Role, settings
        token = create_access_token(user_id=1, role=Role.superadmin)
        payload = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
        exp_delta_mins = (payload["exp"] - payload["iat"]) / 60
        assert abs(exp_delta_mins - settings.jwt_expires_minutes) < 2

    def test_different_users_get_different_tokens(self):
        from src.main import create_access_token, Role
        t1 = create_access_token(user_id=1, role=Role.admin)
        t2 = create_access_token(user_id=2, role=Role.admin)
        assert t1 != t2


# ── API Key hashing ──────────────────────────────────────────────────────────

class TestApiKeyHashing:
    def test_hash_api_key_is_sha256(self):
        from src.main import _hash_api_key
        key = "hc_live_abc123xyz"
        result = _hash_api_key(key)
        expected = hashlib.sha256(key.encode()).hexdigest()
        assert result == expected

    def test_hash_api_key_deterministic(self):
        from src.main import _hash_api_key
        assert _hash_api_key("test") == _hash_api_key("test")

    def test_hash_api_key_different_keys(self):
        from src.main import _hash_api_key
        assert _hash_api_key("key1") != _hash_api_key("key2")


# ── Hosting units / cost calculations ───────────────────────────────────────

class TestHostingUnits:
    def test_monthly_hosting_units_small_file(self):
        from src.main import monthly_hosting_units
        # Small file should return minimum (1)
        result = monthly_hosting_units(1000)
        assert result >= 1

    def test_monthly_hosting_units_large_file(self):
        from src.main import monthly_hosting_units
        # 10MB file
        result = monthly_hosting_units(10 * 1024 * 1024)
        assert result >= 1

    def test_hosting_units_monthly(self):
        from src.main import hosting_units
        m = hosting_units("monthly", 50000)
        assert isinstance(m, int)
        assert m >= 1

    def test_hosting_units_yearly_is_10x_monthly(self):
        from src.main import hosting_units, monthly_hosting_units
        size = 50000
        monthly = monthly_hosting_units(size)
        yearly = hosting_units("yearly", size)
        assert yearly == monthly * 10

    def test_compute_hosting_ends_monthly(self):
        from src.main import compute_hosting_ends
        dt = compute_hosting_ends("monthly")
        now = datetime.now(timezone.utc)
        delta = (dt - now).days
        assert 29 <= delta <= 31

    def test_compute_hosting_ends_yearly(self):
        from src.main import compute_hosting_ends
        dt = compute_hosting_ends("yearly")
        now = datetime.now(timezone.utc)
        delta = (dt - now).days
        assert 364 <= delta <= 366


# ── editor_config_to_template_config ─────────────────────────────────────────

class TestEditorConfigToTemplateConfig:
    def test_nested_format(self):
        from src.main import editor_config_to_template_config
        raw = {
            "name": {"x": 500, "y": 300, "font_size": 36, "font_color": "#000000"},
            "qr": {"x": 100, "y": 800, "size": 200, "show": True},
            "cert_id": {"x": 50, "y": 50, "font_size": 18, "font_color": "#94A3B8"},
            "show_hologram": True,
        }
        tc = editor_config_to_template_config(raw)
        assert tc.isim_x == 500
        assert tc.isim_y == 300
        assert tc.font_size == 36
        assert tc.font_color == "#000000"
        assert tc.qr_x == 100
        assert tc.qr_y == 800
        assert tc.qr_size == 200
        assert tc.show_qr is True
        assert tc.cert_id_x == 50
        assert tc.cert_id_y == 50
        assert tc.show_hologram is True

    def test_legacy_flat_format(self):
        from src.main import editor_config_to_template_config
        raw = {
            "isim_x": 600,
            "isim_y": 400,
            "font_size": 48,
            "font_color": "#FFFFFF",
            "qr_x": 80,
            "qr_y": 700,
        }
        tc = editor_config_to_template_config(raw)
        assert tc.isim_x == 600
        assert tc.isim_y == 400
        assert tc.font_size == 48

    def test_defaults_applied(self):
        from src.main import editor_config_to_template_config
        raw = {"name": {"x": 100, "y": 100}}
        tc = editor_config_to_template_config(raw)
        assert tc.font_size == 48  # default
        assert tc.font_color == "#FFFFFF"  # default
        assert tc.show_qr is True
        assert tc.show_cert_id is True

    def test_empty_config_flat_format(self):
        from src.main import editor_config_to_template_config
        raw = {}
        tc = editor_config_to_template_config(raw)
        assert tc.isim_x == 620
        assert tc.isim_y == 438


# ── Webhook signing ──────────────────────────────────────────────────────────

class TestWebhookSigning:
    def test_sign_payload(self):
        from src.webhooks import sign_payload
        sig = sign_payload("secret", b'{"event":"test"}')
        assert sig.startswith("sha256=")
        assert len(sig) == 7 + 64  # sha256= + 64 hex chars

    def test_sign_payload_deterministic(self):
        from src.webhooks import sign_payload
        s1 = sign_payload("key", b"data")
        s2 = sign_payload("key", b"data")
        assert s1 == s2

    def test_sign_payload_different_keys(self):
        from src.webhooks import sign_payload
        s1 = sign_payload("key1", b"data")
        s2 = sign_payload("key2", b"data")
        assert s1 != s2

    def test_generate_webhook_secret_length(self):
        from src.webhooks import generate_webhook_secret
        s = generate_webhook_secret()
        assert len(s) == 64  # 32 bytes = 64 hex chars


# ── WebhookEndpointIn URL validation (SSRF protection) ──────────────────────

class TestWebhookURLValidation:
    def test_valid_https_url(self):
        from src.main import WebhookEndpointIn
        wh = WebhookEndpointIn(url="https://example.com/webhook", events=["cert.issued"])
        assert wh.url == "https://example.com/webhook"

    def test_reject_plaintext_http_url(self):
        from src.main import WebhookEndpointIn
        from pydantic import ValidationError
        with pytest.raises(ValidationError):
            WebhookEndpointIn(url="http://example.com/webhook", events=["cert.issued"])

    def test_reject_localhost(self):
        from src.main import WebhookEndpointIn
        from pydantic import ValidationError
        with pytest.raises(ValidationError):
            WebhookEndpointIn(url="http://localhost:8080/hook", events=[])

    def test_reject_127_0_0_1(self):
        from src.main import WebhookEndpointIn
        from pydantic import ValidationError
        with pytest.raises(ValidationError):
            WebhookEndpointIn(url="http://127.0.0.1/hook", events=[])

    def test_reject_private_ip(self):
        from src.main import WebhookEndpointIn
        from pydantic import ValidationError
        with pytest.raises(ValidationError):
            WebhookEndpointIn(url="http://192.168.1.1/hook", events=[])

    def test_reject_metadata_service(self):
        from src.main import WebhookEndpointIn
        from pydantic import ValidationError
        with pytest.raises(ValidationError):
            WebhookEndpointIn(url="http://169.254.169.254/latest/meta-data", events=[])


# ── Role enum ────────────────────────────────────────────────────────────────

class TestEnums:
    def test_role_values(self):
        from src.main import Role
        assert Role.admin == "admin"
        assert Role.superadmin == "superadmin"

    def test_cert_status_values(self):
        from src.main import CertStatus
        assert CertStatus.active == "active"
        assert CertStatus.revoked == "revoked"
        assert CertStatus.expired == "expired"

    def test_tx_type_values(self):
        from src.main import TxType
        assert TxType.credit == "credit"
        assert TxType.spend == "spend"


# ── Path utilities ───────────────────────────────────────────────────────────

class TestPathUtils:
    def test_build_public_pdf_url(self):
        from src.main import build_public_pdf_url, settings
        url = build_public_pdf_url("pdfs/event_1/abc.pdf")
        assert url == f"{settings.public_base_url}/api/files/pdfs/event_1/abc.pdf"

    def test_bad_request_returns_400(self):
        from src.main import bad_request
        exc = bad_request("test error")
        assert exc.status_code == 400
        assert exc.detail == "test error"
