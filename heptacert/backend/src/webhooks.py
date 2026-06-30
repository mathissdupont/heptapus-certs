"""
HeptaCert Outbound Webhook Delivery
Delivers signed POST requests to user-registered webhook endpoints.
"""

from __future__ import annotations

import asyncio
import hashlib
import hmac
import ipaddress
import json
import logging
import secrets
import socket
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List
from urllib.parse import urlparse

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger("heptacert.webhooks")


class WebhookEvent(str, Enum):
    cert_issued          = "cert.issued"
    cert_revoked         = "cert.revoked"
    cert_bulk_completed  = "cert.bulk_completed"
    cert_expiring_soon   = "cert.expiring_soon"
    crm_profile_updated  = "crm.profile_updated"
    crm_lead_score_changed = "crm.lead_score_changed"


def generate_webhook_secret() -> str:
    """Generate a 32-byte hex secret for a webhook endpoint."""
    return secrets.token_hex(32)


def sign_payload(secret: str, body: bytes) -> str:
    """HMAC-SHA256 signature — return as 'sha256=<hex>'."""
    sig = hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
    return f"sha256={sig}"


def _is_private_address(host: str) -> bool:
    """Return true when a hostname resolves to a private/internal address.

    Resolves ALL A/AAAA records (IPv4 + IPv6) via getaddrinfo — not just the first
    IPv4 — so an attacker can't hide an internal IP behind extra records. Called both
    at config time and at delivery time to blunt DNS-rebinding (a host that was public
    when saved but later points at an internal address)."""
    parsed = urlparse(host if "://" in host else f"//{host}", scheme="https")
    hostname = parsed.hostname or host
    if not hostname:
        return True
    normalized = hostname.strip().lower().rstrip(".")
    if normalized in {"localhost", "localhost.localdomain"}:
        return True

    addresses: set[str] = set()
    try:
        for info in socket.getaddrinfo(normalized, None):
            addresses.add(info[4][0])
    except Exception:
        addresses = {normalized}
    if not addresses:
        return True

    for address in addresses:
        try:
            ip = ipaddress.ip_address(address)
        except ValueError:
            continue
        if (ip.is_private or ip.is_loopback or ip.is_link_local
                or ip.is_reserved or ip.is_multicast or ip.is_unspecified):
            return True
    return False


async def _try_deliver(
    url: str,
    secret: str,
    event_type: str,
    payload: Dict[str, Any],
    attempt: int,
) -> tuple[int | None, str]:
    """Single delivery attempt. Returns (http_status, response_body_truncated)."""
    # Re-check at delivery time (not just at save time) to blunt DNS rebinding: a host
    # that resolved to a public IP when the endpoint was saved may now point inside.
    delivery_host = urlparse(url).hostname or ""
    if _is_private_address(delivery_host):
        logger.warning("Webhook delivery blocked (internal address) url=%s", url)
        return None, "blocked: resolves to internal address"
    body = json.dumps(payload, default=str).encode()
    signature = sign_payload(secret, body)
    ts = payload.get("timestamp", "") if isinstance(payload, dict) else ""
    headers = {
        "Content-Type": "application/json",
        "X-HeptaCert-Event": event_type,
        "X-HeptaCert-Signature": signature,
        "X-HeptaCert-Timestamp": str(ts),
        "X-HeptaCert-Attempt": str(attempt),
    }
    try:
        # follow_redirects=False so a 3xx to an internal address can't bypass the check.
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=False) as client:
            resp = await client.post(url, content=body, headers=headers)
            return resp.status_code, resp.text[:500]
    except Exception as exc:
        logger.warning("Webhook delivery failed url=%s err=%s", url, exc)
        return None, str(exc)[:500]


async def deliver_webhook(
    db: AsyncSession,
    user_id: int,
    event_type: WebhookEvent | str,
    payload: Dict[str, Any],
) -> None:
    """
    Fetch active endpoints for user that subscribe to event_type,
    then deliver with up to 3 retries (exponential backoff).
    Writes delivery records to webhook_deliveries.
    Import done inline to avoid circular deps.
    """
    from .main import WebhookEndpoint, WebhookDelivery, WebhookEndpointIn  # noqa: PLC0415

    event_str = event_type.value if isinstance(event_type, WebhookEvent) else event_type

    result = await db.execute(
        select(WebhookEndpoint).where(
            WebhookEndpoint.user_id == user_id,
            WebhookEndpoint.is_active.is_(True),
        )
    )
    endpoints: List[WebhookEndpoint] = result.scalars().all()

    if not endpoints:
        return

    full_payload = {
        "event": event_str,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "data": payload,
    }

    for endpoint in endpoints:
        # Check if endpoint subscribes to this event
        subscribed = endpoint.events  # list
        if event_str not in subscribed and "*" not in subscribed:
            continue

        http_status = None
        response_body = ""
        last_attempt = 1

        try:
            WebhookEndpointIn(url=endpoint.url, events=[])
        except ValueError:
            response_body = "Webhook target rejected by outbound URL policy"
            delivery = WebhookDelivery(
                endpoint_id=endpoint.id,
                event_type=event_str,
                payload=full_payload,
                status="failed",
                http_status=None,
                response_body=response_body,
                attempt=0,
            )
            db.add(delivery)
            continue

        for attempt in range(1, 4):  # max 3 attempts
            last_attempt = attempt
            http_status, response_body = await _try_deliver(
                endpoint.url, endpoint.secret, event_str, full_payload, attempt
            )
            if http_status and 200 <= http_status < 300:
                break
            if attempt < 3:
                await asyncio.sleep(2 ** attempt)  # 2s, 4s backoff

        # Record delivery
        status = "success" if (http_status and 200 <= http_status < 300) else "failed"
        delivery = WebhookDelivery(
            endpoint_id=endpoint.id,
            event_type=event_str,
            payload=full_payload,
            status=status,
            http_status=http_status,
            response_body=response_body,
            attempt=last_attempt,
        )
        db.add(delivery)

        # Update last_fired_at on endpoint
        endpoint.last_fired_at = datetime.now(timezone.utc)
        db.add(endpoint)

    await db.commit()
