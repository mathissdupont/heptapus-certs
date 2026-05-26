"""
Unit tests for payment provider abstraction.
Tests factory pattern, signature verification, and data models.
"""
import hashlib
import hmac
import json
import time
import base64
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import pytest

from src.payments import (
    PaymentRequest,
    PaymentResult,
    IyzicoProvider,
    PayTRProvider,
    StripeProvider,
    get_provider,
)


# ── Data models ──────────────────────────────────────────────────────────────

class TestPaymentModels:
    def test_payment_request_defaults(self):
        req = PaymentRequest(
            order_id="ORD-001",
            amount_cents=9900,
            description="Test",
            customer_email="test@test.com",
            customer_name="Test User",
            customer_ip="1.2.3.4",
            success_url="https://ok",
            cancel_url="https://cancel",
            webhook_url="https://hook",
        )
        assert req.currency == "TRY"
        assert req.amount_cents == 9900

    def test_payment_result_success(self):
        r = PaymentResult(success=True, checkout_url="https://pay.example.com")
        assert r.success is True
        assert r.error is None

    def test_payment_result_failure(self):
        r = PaymentResult(success=False, error="Card declined")
        assert r.success is False
        assert r.error == "Card declined"


# ── Provider factory ─────────────────────────────────────────────────────────

class TestGetProvider:
    def test_returns_none_when_disabled(self):
        settings = SimpleNamespace(payment_enabled=False)
        assert get_provider(settings) is None

    def test_returns_iyzico(self):
        settings = SimpleNamespace(
            payment_enabled=True,
            active_payment_provider="iyzico",
            iyzico_api_key="key",
            iyzico_secret_key="secret",
            iyzico_base_url="https://sandbox-api.iyzipay.com",
        )
        p = get_provider(settings)
        assert isinstance(p, IyzicoProvider)
        assert p.name == "iyzico"

    def test_returns_paytr(self):
        settings = SimpleNamespace(
            payment_enabled=True,
            active_payment_provider="paytr",
            paytr_merchant_id="mid",
            paytr_merchant_key="mkey",
            paytr_merchant_salt="msalt",
        )
        p = get_provider(settings)
        assert isinstance(p, PayTRProvider)
        assert p.name == "paytr"

    def test_returns_stripe(self):
        settings = SimpleNamespace(
            payment_enabled=True,
            active_payment_provider="stripe",
            stripe_secret_key="sk_test_xxx",
            stripe_webhook_secret="whsec_xxx",
        )
        p = get_provider(settings)
        assert isinstance(p, StripeProvider)
        assert p.name == "stripe"

    def test_unknown_provider_raises(self):
        settings = SimpleNamespace(
            payment_enabled=True,
            active_payment_provider="unknown",
        )
        with pytest.raises(ValueError, match="Unknown payment provider"):
            get_provider(settings)

    def test_case_insensitive(self):
        settings = SimpleNamespace(
            payment_enabled=True,
            active_payment_provider="STRIPE",
            stripe_secret_key="sk",
            stripe_webhook_secret="wh",
        )
        p = get_provider(settings)
        assert isinstance(p, StripeProvider)


# ── iyzico signature ─────────────────────────────────────────────────────────

class TestIyzicoProvider:
    def test_sign_method(self):
        p = IyzicoProvider(api_key="api_key", secret_key="secret_key", base_url="https://sandbox")
        sig = p._sign("random123", "/payment/detail", '{"test":"body"}')
        raw = 'random123/payment/detail{"test":"body"}'
        expected = hmac.new(b"secret_key", raw.encode("utf-8"), hashlib.sha256).hexdigest()
        assert sig == expected

    def test_auth_header_uses_iyzwsv2_base64_format(self):
        p = IyzicoProvider(api_key="api_key", secret_key="secret_key", base_url="https://sandbox")
        header = p._auth_header("random123", "signature123")
        encoded = header.removeprefix("IYZWSv2 ")
        assert base64.b64decode(encoded).decode() == "apiKey:api_key&randomKey:random123&signature:signature123"

    @pytest.mark.asyncio
    async def test_callback_is_verified_by_retrieving_provider_result(self):
        p = IyzicoProvider(api_key="api_key", secret_key="secret_key", base_url="https://sandbox")
        response = SimpleNamespace(
            status_code=200,
            json=lambda: {
                "status": "success",
                "paymentStatus": "SUCCESS",
                "fraudStatus": 1,
                "basketId": "12",
                "token": "provider-token",
                "price": 99.0,
                "currency": "TRY",
            },
        )
        client = AsyncMock()
        client.post.return_value = response
        context = AsyncMock()
        context.__aenter__.return_value = client
        with patch("src.payments.httpx.AsyncClient", return_value=context):
            result = await p.verify_webhook(b"token=provider-token", {})
        assert result == {
            "order_id": "12",
            "provider_ref": "provider-token",
            "amount_cents": 9900,
            "currency": "TRY",
            "status": "paid",
        }


# ── Stripe webhook verification ──────────────────────────────────────────────

class TestStripeWebhook:
    @pytest.mark.asyncio
    async def test_valid_signature(self):
        webhook_secret = "whsec_test123"
        p = StripeProvider(secret_key="sk_test", webhook_secret=webhook_secret)

        payload = json.dumps({
            "type": "checkout.session.completed",
            "data": {"object": {"id": "cs_123", "client_reference_id": "ORD-001"}},
        }).encode()

        timestamp = str(int(time.time()))
        signed = f"{timestamp}.{payload.decode('utf-8')}"
        v1 = hmac.new(
            webhook_secret.encode("utf-8"),
            signed.encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()

        headers = {"stripe-signature": f"t={timestamp},v1={v1}"}
        result = await p.verify_webhook(payload, headers)
        assert result["status"] == "paid"
        assert result["order_id"] == "ORD-001"
        assert result["provider_ref"] == "cs_123"

    @pytest.mark.asyncio
    async def test_invalid_signature_raises(self):
        p = StripeProvider(secret_key="sk_test", webhook_secret="whsec_real")
        payload = b'{"type":"checkout.session.completed"}'
        headers = {"stripe-signature": f"t={int(time.time())},v1=fakesignature"}
        with pytest.raises(ValueError, match="signature mismatch"):
            await p.verify_webhook(payload, headers)

    @pytest.mark.asyncio
    async def test_expired_signature_raises(self):
        p = StripeProvider(secret_key="sk_test", webhook_secret="whsec_real")
        with pytest.raises(ValueError, match="timestamp expired"):
            await p.verify_webhook(
                b'{"type":"checkout.session.completed"}',
                {"stripe-signature": "t=123,v1=fakesignature"},
            )


# ── PayTR webhook verification ───────────────────────────────────────────────

class TestPayTRWebhook:
    @pytest.mark.asyncio
    async def test_valid_hash(self):
        p = PayTRProvider(merchant_id="mid", merchant_key="mkey", merchant_salt="msalt")

        order_id = "ORD-001"
        status = "success"
        total = "9900"
        msg = (order_id + "msalt" + status + total).encode("utf-8")
        expected_hash = hmac.new("mkey".encode("utf-8"), msg, hashlib.sha256).digest().hex()

        payload = f"merchant_oid={order_id}&status={status}&total_amount={total}&hash={expected_hash}".encode()
        result = await p.verify_webhook(payload, {})
        assert result["status"] == "paid"
        assert result["order_id"] == order_id

    @pytest.mark.asyncio
    async def test_invalid_hash_raises(self):
        p = PayTRProvider(merchant_id="mid", merchant_key="mkey", merchant_salt="msalt")
        payload = b"merchant_oid=ORD-001&status=success&total_amount=100&hash=fakehash"
        with pytest.raises(ValueError, match="signature mismatch"):
            await p.verify_webhook(payload, {})
