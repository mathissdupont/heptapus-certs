"""Rate limiting altyapisi: limiter + ip/key cozumleyiciler + 429 handler.

main.py'dan ayiklandi (god-dosya bolme / routers-prep, Adim 4d). Router
modulleri `@limiter.limit(...)` icin 'limiter'i buradan import eder (main'den
DEGIL -> dongusel import yok). main.py hepsini re-export eder; mevcut
`from .main import limiter / _client_ip_for_rate_limit` kullanimlari calisir.

Bagimliliklar: config (settings), db (SessionLocal), services (write_audit_log).
services bu modulu import etmez -> cycle yok.
"""

import ipaddress
import logging
from typing import Optional

from fastapi import Request
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded

from .config import settings
from .db import SessionLocal
from .services import write_audit_log

logger = logging.getLogger("heptacert")


def _is_trusted_proxy_peer(peer_host: Optional[str]) -> bool:
    if not peer_host:
        return False
    try:
        ip = ipaddress.ip_address(peer_host)
    except ValueError:
        return False
    for raw_network in (settings.trusted_proxy_networks or "").split(","):
        network = raw_network.strip()
        if not network:
            continue
        try:
            if ip in ipaddress.ip_network(network, strict=False):
                return True
        except ValueError:
            logger.warning("Ignoring invalid TRUSTED_PROXY_NETWORKS entry: %s", network)
    return False


def _client_ip_for_rate_limit(request: Request) -> str:
    peer_host = request.client.host if request.client and request.client.host else None
    xff = request.headers.get("X-Forwarded-For")
    if xff and _is_trusted_proxy_peer(peer_host):
        first_ip = xff.split(",", 1)[0].strip()
        if first_ip:
            return first_ip
    if peer_host:
        return peer_host
    return "unknown"


# Rate limiter — uses IP for anonymous, user_id for authenticated requests
def _rate_limit_key(request: Request) -> str:
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        token = auth[7:]
        try:
            import jose.jwt as _jwt
            payload = _jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
            uid = payload.get("sub")
            if uid:
                return f"user:{uid}"
        except Exception:
            pass
    return f"ip:{_client_ip_for_rate_limit(request)}"


async def _heptacert_rate_limit_handler(request: Request, exc: RateLimitExceeded):
    detail = str(exc.detail or "Too many requests")
    try:
        async with SessionLocal() as db:
            await write_audit_log(
                db,
                user_id=None,
                action="security.rate_limit",
                resource_type="request",
                resource_id=request.url.path,
                ip_address=_client_ip_for_rate_limit(request),
                user_agent=request.headers.get("User-Agent"),
                extra={"detail": detail, "method": request.method},
            )
            await db.commit()
    except Exception as audit_error:
        logger.debug("Rate-limit audit log write failed: %s", audit_error)
    # Preserve legacy `error` key while adding standard `detail` for frontend handlers.
    return JSONResponse(
        status_code=429,
        content={
            "detail": f"Rate limit exceeded: {detail}",
            "error": f"Rate limit exceeded: {detail}",
        },
    )


rate_limit_storage_uri = settings.rate_limit_storage_uri or settings.redis_url or "memory://"
limiter = Limiter(
    key_func=_rate_limit_key,
    # No global default limit: only endpoints with an explicit @limiter.limit (login,
    # register, forgot/reset-password, 2fa, magic-link) are throttled. A global cap
    # would throttle the public listing + admin dashboard per IP and undo the perf
    # work. Add a coarse abuse backstop at the reverse proxy (Caddy) instead.
    default_limits=[],
    storage_uri=rate_limit_storage_uri,
)

__all__ = [
    "limiter",
    "rate_limit_storage_uri",
    "_rate_limit_key",
    "_client_ip_for_rate_limit",
    "_is_trusted_proxy_peer",
    "_heptacert_rate_limit_handler",
]
