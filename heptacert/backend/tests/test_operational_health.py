from datetime import datetime, timezone

import pytest
from httpx import ASGITransport, AsyncClient

from src import operational_health
from src.config import settings
from src.main import app


@pytest.mark.asyncio
async def test_readiness_checks_database_and_keeps_liveness_separate(monkeypatch):
    monkeypatch.setattr(settings, "redis_url", "")
    monkeypatch.setattr(settings, "clamav_enabled", False)
    monkeypatch.setattr(settings, "health_require_presentation_worker", False)
    monkeypatch.setattr(settings, "health_require_scheduler", False)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        live = await client.get("/api/health")
        ready = await client.get("/api/ready")

    assert live.status_code == 200
    assert live.json() == {"status": "ok"}
    assert ready.status_code == 200
    payload = ready.json()
    assert payload["ready"] is True
    assert payload["probes"]["database"]["ok"] is True
    assert payload["probes"]["redis"]["required"] is False


@pytest.mark.asyncio
async def test_required_worker_without_heartbeat_makes_service_not_ready(monkeypatch):
    monkeypatch.setattr(settings, "redis_url", "")
    monkeypatch.setattr(settings, "clamav_enabled", False)
    monkeypatch.setattr(settings, "health_require_presentation_worker", True)
    monkeypatch.setattr(settings, "health_require_scheduler", False)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/ready")

    assert response.status_code == 503
    payload = response.json()
    assert payload["ready"] is False
    assert payload["probes"]["presentation_worker"]["ok"] is False
    assert payload["probes"]["presentation_worker"]["required"] is True


@pytest.mark.asyncio
async def test_current_redis_heartbeats_satisfy_required_components(monkeypatch):
    heartbeat = datetime.now(timezone.utc).isoformat()

    class FakeRedis:
        async def ping(self):
            return True

        async def mget(self, keys):
            return [heartbeat for _ in keys]

        async def aclose(self):
            return None

    monkeypatch.setattr(
        operational_health.Redis,
        "from_url",
        lambda *args, **kwargs: FakeRedis(),
    )
    monkeypatch.setattr(settings, "redis_url", "redis://example.invalid/0")
    monkeypatch.setattr(settings, "clamav_enabled", False)
    monkeypatch.setattr(settings, "health_require_presentation_worker", True)
    monkeypatch.setattr(settings, "health_require_scheduler", True)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/ready")

    assert response.status_code == 200
    payload = response.json()
    assert payload["ready"] is True
    assert payload["probes"]["redis"]["ok"] is True
    assert payload["probes"]["presentation_worker"]["last_heartbeat"] == heartbeat
    assert payload["probes"]["scheduler"]["last_heartbeat"] == heartbeat
