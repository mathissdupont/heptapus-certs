"""
HeptaCert Payment Provider Abstraction
---------------------------------------
Three providers are implemented: iyzico, PayTR, Stripe.
Only one is active at a time (controlled by ACTIVE_PAYMENT_PROVIDER env var).
All feature-flagged behind PAYMENT_ENABLED=false — set to true when you have
your vergi levhası (tax registration) ready.

Usage:
    from .payments import get_provider
    provider = get_provider(settings)
    result = await provider.create_payment(order, request_ip, callback_url)
"""
from __future__ import annotations

import hashlib
import hmac
import base64
import json
import logging
import random
import string
import time
from abc import ABC, abstractmethod
from typing import Any, Dict, Optional

import httpx
from pydantic import BaseModel

logger = logging.getLogger("heptacert.payments")


# ── Data models ───────────────────────────────────────────────────────────────

class PaymentRequest(BaseModel):
    order_id: str                  # your internal order ID
    amount_cents: int              # e.g. 9900 = 99.00 TRY or USD
    currency: str = "TRY"         # ISO 4217
    description: str
    customer_email: str
    customer_name: str
    customer_ip: str
    success_url: str               # redirect after payment
    cancel_url: str                # redirect on cancel
    webhook_url: str               # server-to-server notification


class PaymentResult(BaseModel):
    success: bool
    checkout_url: Optional[str] = None   # redirect user here
    checkout_html: Optional[str] = None  # for iFrame providers (PayTR)
    provider_ref: Optional[str] = None   # provider transaction/token ID
    error: Optional[str] = None


# ── Abstract base ─────────────────────────────────────────────────────────────

class PaymentProvider(ABC):
    @abstractmethod
    async def create_payment(self, req: PaymentRequest) -> PaymentResult:
        """Initiate a payment. Returns checkout URL or HTML."""
        ...

    @abstractmethod
    async def verify_webhook(self, payload: bytes, headers: Dict[str, str]) -> Dict[str, Any]:
        """
        Verify and parse an incoming webhook notification.
        Returns dict with at least: { "order_id", "status": "paid"|"failed"|"refunded" }
        Raises ValueError if signature is invalid.
        """
        ...

    @property
    @abstractmethod
    def name(self) -> str:
        ...


# ── iyzico ────────────────────────────────────────────────────────────────────

class IyzicoProvider(PaymentProvider):
    """
    iyzico REST API v2 — Checkout Form
    Docs: https://dev.iyzipay.com/en/api/checkout-form
    Sandbox base URL: https://sandbox-api.iyzipay.com
    Production:       https://api.iyzipay.com
    """

    def __init__(self, api_key: str, secret_key: str, base_url: str):
        self.api_key = api_key
        self.secret_key = secret_key
        self.base_url = base_url.rstrip("/")

    @property
    def name(self) -> str:
        return "iyzico"

    def _sign(self, random_str: str, uri_path: str, body_str: str) -> str:
        raw = f"{random_str}{uri_path}{body_str}"
        return hmac.new(
            self.secret_key.encode("utf-8"),
            raw.encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()

    def _auth_header(self, random_str: str, sig: str) -> str:
        raw = f"apiKey:{self.api_key}&randomKey:{random_str}&signature:{sig}"
        encoded = base64.b64encode(raw.encode("utf-8")).decode("ascii")
        return f"IYZWSv2 {encoded}"

    async def create_payment(self, req: PaymentRequest) -> PaymentResult:
        random_str = "".join(random.choices(string.ascii_letters + string.digits, k=8))
        amount_decimal = f"{req.amount_cents / 100:.2f}"

        body = {
            "locale": "tr",
            "conversationId": req.order_id,
            "price": amount_decimal,
            "paidPrice": amount_decimal,
            "currency": req.currency,
            "basketId": req.order_id,
            "paymentGroup": "PRODUCT",
            "callbackUrl": req.webhook_url,
            "enabledInstallments": [1, 2, 3, 6, 9, 12],
            "buyer": {
                "id": req.order_id,
                "name": req.customer_name.split()[0] if req.customer_name else "Customer",
                "surname": req.customer_name.split()[-1] if " " in req.customer_name else "User",
                "gsmNumber": "+905350000000",
                "email": req.customer_email,
                "identityNumber": "11111111111",
                "registrationAddress": "Turkey",
                "ip": req.customer_ip,
                "city": "Istanbul",
                "country": "Turkey",
            },
            "shippingAddress": {"contactName": req.customer_name, "city": "Istanbul", "country": "Turkey", "address": "Turkey"},
            "billingAddress":  {"contactName": req.customer_name, "city": "Istanbul", "country": "Turkey", "address": "Turkey"},
            "basketItems": [{
                "id": "HEPTACERT_PLAN",
                "name": req.description,
                "category1": "SaaS",
                "itemType": "VIRTUAL",
                "price": amount_decimal,
            }],
        }
        body_str = json.dumps(body, ensure_ascii=False, separators=(",", ":"))
        uri_path = "/payment/iyzipos/checkoutform/initialize/auth/ecom"
        sig = self._sign(random_str, uri_path, body_str)

        try:
            async with httpx.AsyncClient(timeout=15) as client:
                resp = await client.post(
                    f"{self.base_url}{uri_path}",
                    content=body_str,
                    headers={
                        "Content-Type": "application/json",
                        "Authorization": self._auth_header(random_str, sig),
                        "x-iyzi-rnd": random_str,
                    },
                )
            data = resp.json()
            if data.get("status") == "success":
                return PaymentResult(
                    success=True,
                    checkout_html=data.get("checkoutFormContent"),
                    provider_ref=data.get("token"),
                )
            return PaymentResult(success=False, error=data.get("errorMessage", "iyzico error"))
        except Exception as e:
            logger.exception("iyzico create_payment error")
            return PaymentResult(success=False, error=str(e))

    async def verify_webhook(self, payload: bytes, headers: Dict[str, str]) -> Dict[str, Any]:
        """Retrieve the checkout result from iyzico before accepting a callback."""
        from urllib.parse import parse_qs
        data = parse_qs(payload.decode("utf-8"))
        token = data.get("token", [None])[0]
        if not token:
            raise ValueError("iyzico callback token missing")

        callback_order_id = data.get("conversationId", [None])[0]
        request_body: Dict[str, str] = {"locale": "tr", "token": token}
        if callback_order_id:
            request_body["conversationId"] = callback_order_id
        body_str = json.dumps(request_body, ensure_ascii=False, separators=(",", ":"))
        uri_path = "/payment/iyzipos/checkoutform/auth/ecom/detail"
        random_str = "".join(random.choices(string.ascii_letters + string.digits, k=16))
        sig = self._sign(random_str, uri_path, body_str)

        try:
            async with httpx.AsyncClient(timeout=15) as client:
                resp = await client.post(
                    f"{self.base_url}{uri_path}",
                    content=body_str,
                    headers={
                        "Content-Type": "application/json",
                        "Authorization": self._auth_header(random_str, sig),
                        "x-iyzi-rnd": random_str,
                    },
                )
        except Exception as exc:
            logger.exception("iyzico payment verification request failed")
            raise ValueError("iyzico payment verification failed") from exc

        if resp.status_code >= 400:
            raise ValueError("iyzico payment verification rejected")
        details = resp.json()
        if details.get("token") and not hmac.compare_digest(str(details["token"]), token):
            raise ValueError("iyzico token mismatch")

        provider_status = str(details.get("paymentStatus") or "").upper()
        fraud_status = details.get("fraudStatus")
        paid = (
            details.get("status") == "success"
            and provider_status == "SUCCESS"
            and str(fraud_status) == "1"
        )
        return {
            "order_id": details.get("basketId") or details.get("conversationId") or callback_order_id,
            "provider_ref": token,
            "amount_cents": int(round(float(details.get("price", 0)) * 100)) if details.get("price") is not None else None,
            "currency": details.get("currency"),
            "status": "paid" if paid else "failed",
        }


# ── PayTR ─────────────────────────────────────────────────────────────────────

class PayTRProvider(PaymentProvider):
    """
    PayTR API — iFrame integration
    Docs: https://dev.paytr.com/iframe-api
    """

    ENDPOINT = "https://www.paytr.com/odeme/api/get-token"

    def __init__(self, merchant_id: str, merchant_key: str, merchant_salt: str):
        self.merchant_id = merchant_id
        self.merchant_key = merchant_key
        self.merchant_salt = merchant_salt

    @property
    def name(self) -> str:
        return "paytr"

    def _token(self, fields: Dict[str, str]) -> str:
        concat = "".join(str(v) for v in fields.values())
        msg = (concat + self.merchant_salt).encode("utf-8")
        return hmac.new(self.merchant_key.encode("utf-8"), msg, hashlib.sha256).digest().hex()

    async def create_payment(self, req: PaymentRequest) -> PaymentResult:
        basket = json.dumps([[req.description, str(req.amount_cents / 100), 1]])
        amount_str = str(req.amount_cents)  # PayTR uses kuruş for TRY

        fields = {
            "merchant_id":    self.merchant_id,
            "user_ip":        req.customer_ip,
            "merchant_oid":   req.order_id,
            "email":          req.customer_email,
            "payment_amount": amount_str,
            "payment_type":   "card",
            "installment_count": "0",
            "currency":       "TL",
            "test_mode":      "1",   # change to "0" in production
            "non_3d":         "0",
            "merchant_ok_url": req.success_url,
            "merchant_fail_url": req.cancel_url,
            "user_name":      req.customer_name,
            "user_address":   "Turkey",
            "user_phone":     "05350000000",
            "user_basket":    basket,
            "debug_on":       "0",
            "client_lang":    "tr",
        }
        fields["paytr_token"] = self._token(fields)

        try:
            async with httpx.AsyncClient(timeout=15) as client:
                resp = await client.post(self.ENDPOINT, data=fields)
            data = resp.json()
            if data.get("status") == "success":
                iframe_token = data["token"]
                checkout_html = (
                    f'<iframe src="https://www.paytr.com/odeme/guvenli/{iframe_token}" '
                    f'id="paytriframe" frameborder="0" scrolling="no" style="width:100%;height:600px;"></iframe>'
                )
                return PaymentResult(success=True, checkout_html=checkout_html, provider_ref=iframe_token)
            return PaymentResult(success=False, error=data.get("reason", "PayTR error"))
        except Exception as e:
            logger.exception("PayTR create_payment error")
            return PaymentResult(success=False, error=str(e))

    async def verify_webhook(self, payload: bytes, headers: Dict[str, str]) -> Dict[str, Any]:
        from urllib.parse import parse_qs
        data = parse_qs(payload.decode("utf-8"))
        order_id  = data.get("merchant_oid", [None])[0]
        status    = data.get("status", ["failed"])[0]
        token_raw = data.get("hash", [None])[0]

        # Verify HMAC
        total     = data.get("total_amount", ["0"])[0]
        msg       = (order_id + self.merchant_salt + status + total).encode("utf-8")
        expected  = hmac.new(self.merchant_key.encode("utf-8"), msg, hashlib.sha256).digest().hex()
        if token_raw != expected:
            raise ValueError("PayTR webhook signature mismatch")

        return {
            "order_id":     order_id,
            "provider_ref": order_id,
            "amount_cents": int(total),
            "currency": "TRY",
            "status": "paid" if status == "success" else "failed",
        }


# ── Stripe ────────────────────────────────────────────────────────────────────

class StripeProvider(PaymentProvider):
    """
    Stripe Checkout Sessions
    Docs: https://stripe.com/docs/api/checkout/sessions
    """

    ENDPOINT = "https://api.stripe.com/v1/checkout/sessions"

    def __init__(self, secret_key: str, webhook_secret: str):
        self.secret_key = secret_key
        self.webhook_secret = webhook_secret

    @property
    def name(self) -> str:
        return "stripe"

    async def create_payment(self, req: PaymentRequest) -> PaymentResult:
        params = {
            "payment_method_types[]": "card",
            "mode": "payment",
            "client_reference_id": req.order_id,
            "customer_email": req.customer_email,
            "success_url": req.success_url + "?session_id={CHECKOUT_SESSION_ID}",
            "cancel_url": req.cancel_url,
            "line_items[0][price_data][currency]": req.currency.lower(),
            "line_items[0][price_data][product_data][name]": req.description,
            "line_items[0][price_data][unit_amount]": str(req.amount_cents),
            "line_items[0][quantity]": "1",
        }
        try:
            async with httpx.AsyncClient(
                timeout=15,
                auth=(self.secret_key, ""),
            ) as client:
                resp = await client.post(self.ENDPOINT, data=params)
            data = resp.json()
            if resp.status_code == 200:
                return PaymentResult(
                    success=True,
                    checkout_url=data["url"],
                    provider_ref=data["id"],
                )
            return PaymentResult(success=False, error=data.get("error", {}).get("message", "Stripe error"))
        except Exception as e:
            logger.exception("Stripe create_payment error")
            return PaymentResult(success=False, error=str(e))

    async def verify_webhook(self, payload: bytes, headers: Dict[str, str]) -> Dict[str, Any]:
        sig_header = headers.get("stripe-signature", "")
        # Parse t= and v1= from sig header
        parts = {k: v for k, v in (p.split("=", 1) for p in sig_header.split(",") if "=" in p)}
        timestamp = parts.get("t", "")
        v1 = parts.get("v1", "")
        try:
            signed_at = int(timestamp)
        except ValueError as exc:
            raise ValueError("Stripe webhook timestamp invalid") from exc
        if abs(int(time.time()) - signed_at) > 300:
            raise ValueError("Stripe webhook timestamp expired")

        signed = f"{timestamp}.{payload.decode('utf-8')}"
        expected = hmac.new(
            self.webhook_secret.encode("utf-8"),
            signed.encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()
        if not hmac.compare_digest(v1, expected):
            raise ValueError("Stripe webhook signature mismatch")

        event = json.loads(payload)
        etype = event.get("type", "")
        session = event.get("data", {}).get("object", {})
        order_id = session.get("client_reference_id")
        provider_ref = session.get("id")

        if etype == "checkout.session.completed":
            status = "paid"
        elif etype in ("payment_intent.payment_failed",):
            status = "failed"
        else:
            status = "unknown"

        return {
            "order_id": order_id,
            "provider_ref": provider_ref,
            "amount_cents": session.get("amount_total"),
            "currency": str(session.get("currency") or "").upper() or None,
            "status": status,
        }


# ── Factory ───────────────────────────────────────────────────────────────────

def get_provider(settings: Any) -> Optional[PaymentProvider]:
    """
    Returns the configured PaymentProvider, or None if PAYMENT_ENABLED is false.
    'settings' should be the app Settings instance.
    """
    if not getattr(settings, "payment_enabled", False):
        return None

    provider_name = getattr(settings, "active_payment_provider", "iyzico").lower()

    if provider_name == "iyzico":
        return IyzicoProvider(
            api_key=settings.iyzico_api_key,
            secret_key=settings.iyzico_secret_key,
            base_url=getattr(settings, "iyzico_base_url", "https://sandbox-api.iyzipay.com"),
        )
    if provider_name == "paytr":
        return PayTRProvider(
            merchant_id=settings.paytr_merchant_id,
            merchant_key=settings.paytr_merchant_key,
            merchant_salt=settings.paytr_merchant_salt,
        )
    if provider_name == "stripe":
        return StripeProvider(
            secret_key=settings.stripe_secret_key,
            webhook_secret=settings.stripe_webhook_secret,
        )
    raise ValueError(f"Unknown payment provider: {provider_name}")
