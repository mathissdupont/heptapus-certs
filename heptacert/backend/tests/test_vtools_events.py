"""The IEEE vTools pilot stays read-only and maps exact published event IDs only."""

import httpx
import pytest

from src.vtools_events import (
    EVENTS_LIST_URL,
    VToolsPreviewError,
    fetch_public_event_preview,
    preview_from_response,
)


def _payload(event_id=579175, *, published=True, cancelled=False):
    return {
        "data": [{
            "id": str(event_id),
            "type": "events",
            "attributes": {
                "title": "IEEE Workshop",
                "description": "<p>Learn <strong>AI</strong>.</p><script>alert(1)</script>",
                "start-time": "2026-09-23T20:30:00.000Z",
                "end-time": "2026-09-23T21:30:00.000Z",
                "time-zone": {"name": "Asia/Kolkata"},
                "primary-host": {"spoid": "SBC20461A", "name": "IEEE Student Branch"},
                "location-type": "virtual",
                "registration-url": "https://events.vtools.ieee.org/m/579175/register",
                "publish": published,
                "cancelled": cancelled,
                "attendees": [{"email": "not-for-import@example.com"}],
            },
        }],
        "meta": {"paging": {"page": 1, "limit": 1, "total_pages": 1}},
    }


def test_preview_maps_local_date_without_attendee_data_or_writes():
    result = preview_from_response(579175, _payload())
    assert result["source"] == "ieee_vtools"
    assert result["external_event_id"] == 579175
    assert result["source_url"] == "https://events.vtools.ieee.org/m/579175"
    assert result["source_ou_spoid"] == "SBC20461A"
    assert result["proposed_heptacert_fields"] == {
        "name": "IEEE Workshop",
        "event_date": "2026-09-24",  # UTC date would be wrong for this event.
        "event_description": "Learn AI.",
        "event_location": None,
    }
    assert result["write_performed"] is False
    assert result["attendee_data_included"] is False
    assert "not-for-import@example.com" not in str(result)


@pytest.mark.parametrize("event_id,payload", [
    (0, _payload()),
    (True, _payload()),
    (579176, _payload()),
    (579175, _payload(published=False)),
    (579175, _payload(cancelled=True)),
    (579175, {"data": "invalid"}),
])
def test_preview_fails_closed_for_invalid_or_unavailable_events(event_id, payload):
    with pytest.raises(VToolsPreviewError):
        preview_from_response(event_id, payload)


def test_bad_time_zone_and_unsafe_registration_url_are_not_guessed():
    payload = _payload()
    attrs = payload["data"][0]["attributes"]
    attrs["time-zone"] = {"name": "Not/A_Real_Zone"}
    attrs["registration-url"] = "javascript:alert(1)"
    result = preview_from_response(579175, payload)
    assert result["proposed_heptacert_fields"]["event_date"] is None
    assert result["registration_url"] is None
    assert result["warnings"]


@pytest.mark.asyncio
async def test_fetch_uses_fixed_official_host_and_exact_published_id():
    def handler(request: httpx.Request) -> httpx.Response:
        assert str(request.url).startswith(EVENTS_LIST_URL)
        assert request.url.params["id"] == "579175"
        assert request.url.params["published"] == "true"
        assert request.url.params["limit"] == "1"
        return httpx.Response(200, json=_payload())

    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
        result = await fetch_public_event_preview(579175, client=client)
    assert result["external_event_id"] == 579175


@pytest.mark.asyncio
async def test_invalid_id_does_not_issue_any_request():
    def handler(request: httpx.Request) -> httpx.Response:
        pytest.fail(f"unexpected request: {request.url}")

    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
        with pytest.raises(VToolsPreviewError):
            await fetch_public_event_preview(-1, client=client)
