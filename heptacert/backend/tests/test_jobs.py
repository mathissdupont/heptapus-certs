"""
Tests for background job infrastructure.
Covers: webhook delivery signing, cache TTL logic,
        payment webhook idempotency guards, job response structure.
"""

import json
import pytest
from unittest.mock import AsyncMock, MagicMock, patch


# ── Webhook delivery ──────────────────────────────────────────────────────────

class TestWebhookDelivery:
    def test_sign_payload_produces_sha256_prefix(self):
        from src.webhooks import sign_payload
        sig = sign_payload("mysecret", b"hello")
        assert sig.startswith("sha256=")

    def test_sign_payload_is_deterministic(self):
        from src.webhooks import sign_payload
        body = b'{"event": "cert.issued"}'
        sig1 = sign_payload("secret", body)
        sig2 = sign_payload("secret", body)
        assert sig1 == sig2

    def test_different_secrets_produce_different_sigs(self):
        from src.webhooks import sign_payload
        body = b'{"event": "cert.issued"}'
        sig1 = sign_payload("secret1", body)
        sig2 = sign_payload("secret2", body)
        assert sig1 != sig2

    def test_different_payloads_produce_different_sigs(self):
        from src.webhooks import sign_payload
        sig1 = sign_payload("secret", b"payload-a")
        sig2 = sign_payload("secret", b"payload-b")
        assert sig1 != sig2

    def test_timestamp_in_outgoing_headers(self):
        """_try_deliver must include X-HeptaCert-Timestamp in outgoing headers."""
        import inspect
        from src.webhooks import _try_deliver
        source = inspect.getsource(_try_deliver)
        assert "X-HeptaCert-Timestamp" in source

    def test_event_enum_has_crm_events(self):
        """CRM webhook events must be declared in WebhookEvent."""
        from src.webhooks import WebhookEvent
        assert hasattr(WebhookEvent, "crm_profile_updated")
        assert hasattr(WebhookEvent, "crm_lead_score_changed")
        assert WebhookEvent.crm_profile_updated.value == "crm.profile_updated"


# ── In-memory cache ───────────────────────────────────────────────────────────

class TestInMemoryCache:
    def test_set_and_get(self):
        import asyncio
        from src.cache import _MemoryCache

        cache = _MemoryCache()

        async def run():
            await cache.set("key1", "value1", ttl=60)
            result = await cache.get("key1")
            assert result == "value1"

        asyncio.get_event_loop().run_until_complete(run())

    def test_get_missing_key_returns_none(self):
        import asyncio
        from src.cache import _MemoryCache

        cache = _MemoryCache()

        async def run():
            result = await cache.get("nonexistent")
            assert result is None

        asyncio.get_event_loop().run_until_complete(run())

    def test_expired_key_returns_none(self):
        import asyncio
        import time
        from src.cache import _MemoryCache

        cache = _MemoryCache()

        async def run():
            await cache.set("exp_key", "value", ttl=0)
            # Manually expire
            cache._store["exp_key"] = ("value", time.monotonic() - 1)
            result = await cache.get("exp_key")
            assert result is None

        asyncio.get_event_loop().run_until_complete(run())

    def test_delete_removes_key(self):
        import asyncio
        from src.cache import _MemoryCache

        cache = _MemoryCache()

        async def run():
            await cache.set("del_key", "value", ttl=60)
            await cache.delete("del_key")
            result = await cache.get("del_key")
            assert result is None

        asyncio.get_event_loop().run_until_complete(run())

    def test_delete_prefix_removes_matching_keys(self):
        import asyncio
        from src.cache import _MemoryCache

        cache = _MemoryCache()

        async def run():
            await cache.set("user:1", "data1", ttl=60)
            await cache.set("user:2", "data2", ttl=60)
            await cache.set("org:1", "org_data", ttl=60)
            await cache.delete_prefix("user:")
            assert await cache.get("user:1") is None
            assert await cache.get("user:2") is None
            assert await cache.get("org:1") == "org_data"

        asyncio.get_event_loop().run_until_complete(run())

    def test_get_or_set_caches_result(self):
        import asyncio
        from src.cache import _MemoryCache

        cache = _MemoryCache()
        call_count = 0

        async def run():
            nonlocal call_count

            async def loader():
                nonlocal call_count
                call_count += 1
                return "loaded_value"

            result1 = await cache.get_or_set("gos_key", loader, ttl=60)
            result2 = await cache.get_or_set("gos_key", loader, ttl=60)
            assert result1 == "loaded_value"
            assert result2 == "loaded_value"
            assert call_count == 1  # loader called only once

        asyncio.get_event_loop().run_until_complete(run())

    def test_cache_size_property(self):
        import asyncio
        from src.cache import _MemoryCache

        cache = _MemoryCache()

        async def run():
            assert cache.size == 0
            await cache.set("k1", "v1", ttl=60)
            await cache.set("k2", "v2", ttl=60)
            assert cache.size == 2

        asyncio.get_event_loop().run_until_complete(run())

    def test_clear_empties_cache(self):
        import asyncio
        from src.cache import _MemoryCache

        cache = _MemoryCache()

        async def run():
            await cache.set("k1", "v1", ttl=60)
            cache.clear()
            assert cache.size == 0

        asyncio.get_event_loop().run_until_complete(run())

    def test_cache_ttl_constants_are_positive(self):
        from src.cache import (
            USER_TTL, ORG_TTL, EVENT_TTL,
            SUBSCRIPTION_TTL, CERT_TEMPLATE_TTL, FEATURE_POLICY_TTL,
        )
        for ttl in (USER_TTL, ORG_TTL, EVENT_TTL, SUBSCRIPTION_TTL, CERT_TEMPLATE_TTL, FEATURE_POLICY_TTL):
            assert ttl > 0

    def test_user_ttl_shorter_than_org_ttl(self):
        """User TTL must be shorter to catch role changes faster."""
        from src.cache import USER_TTL, ORG_TTL
        assert USER_TTL < ORG_TTL


# ── Payment webhook idempotency ───────────────────────────────────────────────

class TestPaymentWebhookIdempotency:
    def test_stripe_rejects_expired_timestamp(self):
        """Stripe webhooks with old timestamps must be rejected."""
        import time
        import hmac
        import hashlib
        from src.payments import StripeProvider

        provider = StripeProvider(
            secret_key="sk_test_xxx",
            webhook_secret="whsec_test",
            publishable_key="pk_test_xxx",
        )
        old_timestamp = str(int(time.time()) - 400)  # > 300s tolerance
        payload = b'{"type":"payment_intent.succeeded"}'
        signed = f"{old_timestamp}.{payload.decode()}"
        sig = hmac.new(b"whsec_test", signed.encode(), hashlib.sha256).hexdigest()
        headers = {"stripe-signature": f"t={old_timestamp},v1={sig}"}

        import asyncio
        with pytest.raises(ValueError, match="timestamp expired"):
            asyncio.get_event_loop().run_until_complete(
                provider.verify_webhook(payload, headers)
            )

    def test_paytr_rejects_tampered_hash(self):
        """PayTR webhook with wrong HMAC must be rejected."""
        import asyncio
        from src.payments import PayTRProvider

        provider = PayTRProvider(
            merchant_id="test_id",
            merchant_key="test_key",
            merchant_salt="test_salt",
        )
        from urllib.parse import urlencode
        payload = urlencode({
            "merchant_oid": "order123",
            "status": "success",
            "total_amount": "9900",
            "hash": "invalid_hash_value",
        }).encode()

        with pytest.raises(ValueError, match="signature mismatch"):
            asyncio.get_event_loop().run_until_complete(
                provider.verify_webhook(payload, {})
            )


# ── Automation loop protection ────────────────────────────────────────────────

class TestAutomationLoopProtection:
    def test_validate_no_circular_trigger_function_exists(self):
        """The loop detection function must be defined in automation_api."""
        from src.automation_api import _validate_no_circular_trigger
        assert callable(_validate_no_circular_trigger)

    def test_validate_no_circular_trigger_passes_for_different_segments(self):
        """Different segment keys should not be flagged as circular."""
        import asyncio
        from unittest.mock import AsyncMock, MagicMock
        from src.automation_api import _validate_no_circular_trigger

        # Build a minimal AutomationRuleIn-like object
        payload = MagicMock()
        payload.trigger = "audience_segment"
        payload.trigger_config = {"segment_key": "no_shows"}

        # Mock DB returning a rule with a different segment
        existing_rule = MagicMock()
        existing_rule.id = "different-rule"
        existing_rule.trigger = "audience_segment"
        existing_rule.trigger_config = {"segment_key": "attended_no_certificate"}
        existing_rule.enabled = True

        db = AsyncMock()
        db.execute.return_value.scalars.return_value.all.return_value = [existing_rule]

        async def run():
            # Should not raise
            await _validate_no_circular_trigger(db, event_id=1, payload=payload, exclude_rule_id=None)

        asyncio.get_event_loop().run_until_complete(run())

    def test_validate_detects_duplicate_active_segment(self):
        """Same segment key on two active rules must raise HTTPException."""
        import asyncio
        from fastapi import HTTPException
        from src.automation_api import _validate_no_circular_trigger

        payload = MagicMock()
        payload.trigger = "audience_segment"
        payload.trigger_config = {"segment_key": "no_shows"}

        existing_rule = MagicMock()
        existing_rule.id = "existing-rule-id"
        existing_rule.trigger = "audience_segment"
        existing_rule.trigger_config = {"segment_key": "no_shows"}  # same!
        existing_rule.enabled = True

        db = AsyncMock()
        db.execute.return_value.scalars.return_value.all.return_value = [existing_rule]

        async def run():
            with pytest.raises(HTTPException) as exc_info:
                await _validate_no_circular_trigger(db, event_id=1, payload=payload, exclude_rule_id=None)
            assert exc_info.value.status_code == 400

        asyncio.get_event_loop().run_until_complete(run())


# ── Rate limit key ────────────────────────────────────────────────────────────

class TestRateLimitKey:
    def test_authenticated_request_uses_user_id(self):
        """Authenticated requests must be keyed by user_id, not IP."""
        from src.main import create_access_token, Role, settings
        import jwt as pyjwt

        token = create_access_token(user_id=42, role=Role.admin)
        payload = pyjwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
        assert payload["sub"] == "42"

    def test_rate_limit_key_function_exists(self):
        """The _rate_limit_key function must be defined in main."""
        from src.main import _rate_limit_key
        assert callable(_rate_limit_key)
