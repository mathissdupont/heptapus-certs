"""Read-only IEEE vTools Events preview.

No HeptaCert database writes, attendee/registration access, or vTools writes live here.
The caller must still select and authorize the target HeptaCert organization/event.
"""

from __future__ import annotations

import argparse
import asyncio
import json
from datetime import datetime
from html.parser import HTMLParser
from typing import Any
from urllib.parse import urlparse
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

import httpx


EVENTS_LIST_URL = "https://events.vtools.ieee.org/RST/events/api/public/v8/events/list"
EVENT_PAGE_ORIGIN = "https://events.vtools.ieee.org"


class VToolsPreviewError(ValueError):
    """The selected event cannot safely be previewed."""


class _PlainText(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.parts: list[str] = []
        self.skip_depth = 0

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag in {"script", "style"}:
            self.skip_depth += 1
        elif tag in {"p", "br", "li", "div"} and not self.skip_depth:
            self.parts.append("\n")

    def handle_endtag(self, tag: str) -> None:
        if tag in {"script", "style"} and self.skip_depth:
            self.skip_depth -= 1
        elif tag in {"p", "li", "div"} and not self.skip_depth:
            self.parts.append("\n")

    def handle_data(self, data: str) -> None:
        if not self.skip_depth:
            self.parts.append(data)


def _plain_text(value: Any) -> str:
    parser = _PlainText()
    parser.feed(value if isinstance(value, str) else "")
    return "\n".join(
        line.strip() for line in "".join(parser.parts).splitlines() if line.strip()
    )


def _https_url(value: Any) -> str | None:
    if not isinstance(value, str):
        return None
    candidate = value.strip()
    try:
        parsed = urlparse(candidate)
    except ValueError:
        return None
    return candidate if parsed.scheme == "https" and parsed.netloc and not parsed.username else None


def _local_event_date(start: Any, time_zone: Any) -> str | None:
    if not isinstance(start, str) or not isinstance(time_zone, str):
        return None
    try:
        instant = datetime.fromisoformat(start.replace("Z", "+00:00"))
        if instant.tzinfo is None:
            return None
        return instant.astimezone(ZoneInfo(time_zone)).date().isoformat()
    except (ValueError, ZoneInfoNotFoundError):
        return None


def preview_from_response(event_id: int, payload: Any) -> dict[str, Any]:
    """Validate the exact public event and map only non-PII event metadata."""
    if not isinstance(event_id, int) or isinstance(event_id, bool) or event_id < 1:
        raise VToolsPreviewError("event_id must be a positive integer")
    if not isinstance(payload, dict) or not isinstance(payload.get("data"), list):
        raise VToolsPreviewError("vTools returned an unexpected response")

    matches = [item for item in payload["data"] if isinstance(item, dict) and str(item.get("id")) == str(event_id)]
    if len(matches) != 1:
        raise VToolsPreviewError("published vTools event not found")
    attributes = matches[0].get("attributes")
    if not isinstance(attributes, dict) or attributes.get("publish") is not True:
        raise VToolsPreviewError("event is not published")
    if attributes.get("cancelled") is True:
        raise VToolsPreviewError("event is cancelled")

    title = attributes.get("title")
    if not isinstance(title, str) or not (2 <= len(title.strip()) <= 200):
        raise VToolsPreviewError("event title does not fit HeptaCert's 2–200 character limit")

    time_zone_obj = attributes.get("time-zone")
    time_zone = time_zone_obj.get("name") if isinstance(time_zone_obj, dict) else None
    start_utc = attributes.get("start-time")
    end_utc = attributes.get("end-time")
    event_date = _local_event_date(start_utc, time_zone)
    description = _plain_text(attributes.get("description"))
    host = attributes.get("primary-host")
    primary_host = host if isinstance(host, dict) else {}
    location_type = attributes.get("location-type")
    location_parts = [
        attributes.get("building"),
        attributes.get("room-number"),
        attributes.get("address1"),
        attributes.get("city"),
    ] if location_type in {"physical", "hybrid"} else []
    location = ", ".join(part.strip() for part in location_parts if isinstance(part, str) and part.strip())
    warnings: list[str] = []
    if not event_date:
        warnings.append("Local event date needs manual confirmation: start time or IANA time zone is unavailable.")
    if len(description) > 10000:
        warnings.append("Description was shortened to 10,000 characters for preview; review before import.")
        description = description[:10000]
    if len(location) > 300:
        warnings.append("Location was shortened to HeptaCert's 300-character limit; review before import.")
        location = location[:300]

    return {
        "source": "ieee_vtools",
        "external_event_id": event_id,
        "source_url": f"{EVENT_PAGE_ORIGIN}/m/{event_id}",
        "source_ou_spoid": primary_host.get("spoid"),
        "source_ou_name": primary_host.get("name"),
        "published": True,
        "location_type": location_type,
        "start_at_utc": start_utc,
        "end_at_utc": end_utc,
        "time_zone": time_zone,
        "registration_url": _https_url(attributes.get("registration-url")),
        "proposed_heptacert_fields": {
            "name": title.strip(),
            "event_date": event_date,
            "event_description": description or None,
            "event_location": location or None,
        },
        "warnings": warnings,
        "write_performed": False,
        "attendee_data_included": False,
    }


async def fetch_public_event_preview(event_id: int, *, client: httpx.AsyncClient | None = None) -> dict[str, Any]:
    """Fetch one published event from the fixed official host, without redirects."""
    if not isinstance(event_id, int) or isinstance(event_id, bool) or event_id < 1:
        raise VToolsPreviewError("event_id must be a positive integer")

    async def _fetch(active_client: httpx.AsyncClient) -> dict[str, Any]:
        response = await active_client.get(
            EVENTS_LIST_URL,
            params={"id": event_id, "published": "true", "limit": 1},
            headers={"Accept": "application/json"},
            follow_redirects=False,
        )
        response.raise_for_status()
        if len(response.content) > 1_000_000:
            raise VToolsPreviewError("vTools event response is too large")
        try:
            payload = response.json()
        except ValueError as exc:
            raise VToolsPreviewError("vTools returned invalid JSON") from exc
        return preview_from_response(event_id, payload)

    if client is not None:
        return await _fetch(client)
    async with httpx.AsyncClient(timeout=10.0) as active_client:
        return await _fetch(active_client)


def main() -> None:
    parser = argparse.ArgumentParser(description="Read-only IEEE vTools event preview; never writes to HeptaCert")
    parser.add_argument("event_id", type=int, help="numeric vTools event ID, e.g. from events.vtools.ieee.org/m/123456")
    args = parser.parse_args()
    try:
        preview = asyncio.run(fetch_public_event_preview(args.event_id))
    except (VToolsPreviewError, httpx.HTTPError) as exc:
        parser.exit(1, f"vTools preview failed: {exc}\n")
    print(json.dumps(preview, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
