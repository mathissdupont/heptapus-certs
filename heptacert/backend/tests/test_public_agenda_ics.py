"""Regression: public event endpoints must not be bounced to /admin/login.

The public agenda "Add to calendar" (.ics) link is a plain browser navigation to
/api/public/events/{id}/agenda.ics. The org middleware redirects unauthenticated
GET /api/... requests whose Accept is text/html to /admin/login; /api/public/events/
must be exempt so anonymous visitors can download the calendar file.
"""

import pytest
from httpx import ASGITransport, AsyncClient

from src.main import app

_HTML_HEADERS = {"Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"}


@pytest.mark.asyncio
async def test_public_event_ics_not_redirected_to_admin_login():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test", follow_redirects=False) as ac:
        res = await ac.get("/api/public/events/999999/agenda.ics", headers=_HTML_HEADERS)
    assert res.status_code != 302, "public event .ics must not be redirected by the middleware"
    assert "/admin/login" not in res.headers.get("location", "")


@pytest.mark.asyncio
async def test_admin_api_browser_nav_still_redirects_to_login():
    # Negative control: proves the middleware is active — an unauthenticated browser
    # navigation to a non-public admin API URL is still bounced to /admin/login.
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test", follow_redirects=False) as ac:
        res = await ac.get("/api/admin/jobs", headers=_HTML_HEADERS)
    assert res.status_code == 302
    assert "/admin/login" in res.headers.get("location", "")
