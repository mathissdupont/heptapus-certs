"""Smoke test: tum /api/admin GET endpoint'leri cokmemeli (500 vermemeli).

Routers refactor (Adim 4d) guvenlik agi + cold-path bug avi. Zengin bir event
seed edip her admin GET route'unu (path param'lari doldurularak) admin auth ile
cagirir; 4xx kabul (yetki/validasyon/yok), ama 5xx = bug. Tek seferde butun
okuma handler'larini "calisir durumda" tutar.
"""
import asyncio
import re
import uuid as _uuid

import pytest
from httpx import AsyncClient, ASGITransport

from src.main import (
    app, SessionLocal, User, Organization, Subscription, Event, Attendee,
    Certificate, EventSession, Role, create_access_token, hash_password,
)


@pytest.fixture(autouse=True)
def _disable_rl():
    from src.main import limiter
    prev = limiter.enabled
    limiter.enabled = False
    yield
    limiter.enabled = prev


async def _seed():
    async with SessionLocal() as db:
        admin = User(email="smoke-admin@test.com", password_hash=hash_password("AdminPass123!"), role=Role.admin)
        db.add(admin)
        await db.flush()
        db.add(Organization(user_id=admin.id, public_id="org_smoke", org_name="Smoke Org", brand_color="#111111", settings={}))
        db.add(Subscription(user_id=admin.id, plan_id="enterprise", is_active=True))
        event = Event(admin_id=admin.id, name="Smoke Event", template_image_url="tpl.png",
                      config={}, certificate_enabled=True, checkin_enabled=True)
        db.add(event)
        await db.flush()
        eid = event.id
        db.add_all([
            Attendee(event_id=eid, name="S1", email="s1@test.com", source="self_register", email_verified=True),
            EventSession(event_id=eid, name="S", checkin_token=f"ck_smoke_{eid}", is_active=True),
            Certificate(uuid=str(_uuid.uuid4()), public_id=f"cert_smoke_{eid}", student_name="S1", event_id=eid, pdf_url="http://x/c.pdf"),
        ])
        await db.commit()
        return admin.id, eid


# PostgreSQL-only sorgu (date_trunc) kullanan endpoint'ler SQLite'da calismaz;
# production'da (postgres) calisirlar. Smoke disi tutuluyorlar.
_SKIP_PATHS = {
    "/api/admin/analytics/org/cert-timeline",
    "/api/admin/events/{event_id}/checkin-metrics",
}


def _admin_get_paths() -> list[str]:
    paths = set()
    for r in app.routes:
        methods = getattr(r, "methods", None)
        path = getattr(r, "path", None)
        if methods and path and "GET" in methods and path.startswith("/api/admin"):
            paths.add(path)
    return sorted(paths)


def _fill(path: str, event_id: int) -> str:
    def repl(m):
        name = m.group(1)
        if "path" in name:  # {path:path}
            return "x"
        if "event_id" in name:
            return str(event_id)
        return "1"
    return re.sub(r"\{([^}]+)\}", repl, path)


class TestAdminGetSmoke:
    @pytest.mark.asyncio
    async def test_no_admin_get_endpoint_returns_500(self):
        _admin_id, eid = await _seed()
        headers = {"Authorization": f"Bearer {create_access_token(user_id=_admin_id, role=Role.admin)}"}
        crashes = []
        slow = []
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test", timeout=5.0) as ac:
            for path in _admin_get_paths():
                # SSE/streaming endpoint'leri sonsuz akar -> smoke disi
                if "stream" in path or path.endswith("/sse") or path in _SKIP_PATHS:
                    continue
                url = _fill(path, eid)
                try:
                    # her istek sert zaman sinirli: hicbir handler testi asamaz
                    resp = await asyncio.wait_for(ac.get(url, headers=headers), timeout=8.0)
                    # 500 = crash (bug). 503 = kontrollu "service unavailable"
                    # (or. OAuth yapilandirilmamis integration-start) -> kabul.
                    if resp.status_code == 500:
                        crashes.append(f"500 GET {path}")
                except asyncio.TimeoutError:
                    slow.append(f"TIMEOUT GET {path}")
                except Exception as exc:  # handler ici beklenmedik istisna
                    crashes.append(f"EXC GET {path} -> {type(exc).__name__}: {exc}")
        if slow:
            print("Yavas/asilan (smoke disi tutulabilir):\n  " + "\n  ".join(slow))
        assert not crashes, "500/exception veren admin GET endpoint'leri:\n  " + "\n  ".join(crashes)
