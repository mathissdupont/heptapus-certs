"""Dependency readiness probes and shared-process heartbeats."""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone
from typing import Any

from redis.asyncio import Redis
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from .config import settings

logger = logging.getLogger("heptacert.operational_health")

PRESENTATION_WORKER_HEARTBEAT = "heptacert:heartbeat:presentation-worker"
SCHEDULER_HEARTBEAT = "heptacert:heartbeat:scheduler"


async def publish_heartbeat(key: str, *, ttl_seconds: int | None = None) -> bool:
    """Publish a short-lived heartbeat without crashing the owning process."""

    if not settings.redis_url:
        return False
    client = Redis.from_url(
        settings.redis_url,
        decode_responses=True,
        socket_connect_timeout=settings.health_probe_timeout_seconds,
        socket_timeout=settings.health_probe_timeout_seconds,
    )
    try:
        ttl = ttl_seconds or settings.health_heartbeat_ttl_seconds
        await client.set(key, datetime.now(timezone.utc).isoformat(), ex=ttl)
        return True
    except Exception as exc:
        logger.warning("Could not publish %s heartbeat: %s", key, type(exc).__name__)
        return False
    finally:
        await client.aclose()


def _probe(ok: bool, *, required: bool, detail: str, checked_at: str | None = None) -> dict[str, Any]:
    result: dict[str, Any] = {
        "ok": ok,
        "required": required,
        "status": "ok" if ok else "unavailable",
        "detail": detail,
    }
    if checked_at:
        result["last_heartbeat"] = checked_at
    return result


async def _probe_clamav() -> dict[str, Any]:
    if not settings.clamav_enabled:
        return _probe(True, required=False, detail="disabled")
    writer = None
    try:
        reader, writer = await asyncio.wait_for(
            asyncio.open_connection(settings.clamav_host, settings.clamav_port),
            timeout=settings.health_probe_timeout_seconds,
        )
        writer.write(b"zPING\0")
        await writer.drain()
        reply = await asyncio.wait_for(
            reader.read(32), timeout=settings.health_probe_timeout_seconds
        )
        ok = reply.rstrip(b"\0\r\n") == b"PONG"
        return _probe(
            ok,
            required=settings.require_clamav,
            detail="reachable" if ok else "invalid response",
        )
    except Exception as exc:
        return _probe(
            False,
            required=settings.require_clamav,
            detail=f"unreachable ({type(exc).__name__})",
        )
    finally:
        if writer is not None:
            writer.close()
            try:
                await writer.wait_closed()
            except Exception:
                pass


async def _probe_database(db: AsyncSession) -> dict[str, Any]:
    try:
        await asyncio.wait_for(
            db.execute(text("SELECT 1")), timeout=settings.health_probe_timeout_seconds
        )
        return _probe(True, required=True, detail="reachable")
    except Exception as exc:
        return _probe(False, required=True, detail=f"unreachable ({type(exc).__name__})")


async def _probe_redis() -> tuple[dict[str, Any], dict[str, str | None]]:
    heartbeat_values: dict[str, str | None] = {
        PRESENTATION_WORKER_HEARTBEAT: None,
        SCHEDULER_HEARTBEAT: None,
    }
    if not settings.redis_url:
        return _probe(True, required=False, detail="not configured"), heartbeat_values

    client = Redis.from_url(
        settings.redis_url,
        decode_responses=True,
        socket_connect_timeout=settings.health_probe_timeout_seconds,
        socket_timeout=settings.health_probe_timeout_seconds,
    )
    try:
        await client.ping()
        values = await client.mget(list(heartbeat_values))
        return (
            _probe(True, required=True, detail="reachable"),
            dict(zip(heartbeat_values, values)),
        )
    except Exception as exc:
        return (
            _probe(False, required=True, detail=f"unreachable ({type(exc).__name__})"),
            heartbeat_values,
        )
    finally:
        await client.aclose()


async def collect_readiness(db: AsyncSession) -> dict[str, Any]:
    """Probe required dependencies and return an HTTP-ready payload."""

    database_probe, redis_result, clamav_probe = await asyncio.gather(
        _probe_database(db),
        _probe_redis(),
        _probe_clamav(),
    )
    redis_probe, heartbeat_values = redis_result
    probes: dict[str, dict[str, Any]] = {
        "database": database_probe,
        "redis": redis_probe,
    }

    component_requirements = {
        "presentation_worker": (
            PRESENTATION_WORKER_HEARTBEAT,
            settings.health_require_presentation_worker,
        ),
        "scheduler": (SCHEDULER_HEARTBEAT, settings.health_require_scheduler),
    }
    for component, (key, required) in component_requirements.items():
        heartbeat = heartbeat_values[key]
        if not settings.redis_url and not required:
            probes[component] = _probe(True, required=False, detail="monitoring disabled")
        else:
            probes[component] = _probe(
                heartbeat is not None,
                required=required,
                detail="heartbeat current" if heartbeat else "heartbeat missing or stale",
                checked_at=heartbeat,
            )

    probes["clamav"] = clamav_probe
    ready = all(probe["ok"] for probe in probes.values() if probe["required"])
    return {
        "status": "ready" if ready else "not_ready",
        "ready": ready,
        "checked_at": datetime.now(timezone.utc).isoformat(),
        "probes": probes,
    }
