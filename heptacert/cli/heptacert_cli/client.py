"""Thin async HTTP wrapper around the HeptaCert API."""

from __future__ import annotations

from typing import Any, Optional

import httpx

from .config import get_api_base, require_api_key

_TIMEOUT = 30.0


def _headers(api_key: str) -> dict[str, str]:
    return {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }


class HeptaCertClient:
    def __init__(self, api_key: Optional[str] = None, api_base: Optional[str] = None):
        self.api_key = api_key or require_api_key()
        self.api_base = (api_base or get_api_base()).rstrip("/")

    def _url(self, path: str) -> str:
        return f"{self.api_base}{path}"

    def get(self, path: str, params: Optional[dict] = None) -> Any:
        with httpx.Client(timeout=_TIMEOUT) as c:
            r = c.get(self._url(path), headers=_headers(self.api_key), params=params or {})
            _raise(r)
            return r.json()

    def post(self, path: str, body: dict) -> Any:
        with httpx.Client(timeout=_TIMEOUT) as c:
            r = c.post(self._url(path), headers=_headers(self.api_key), json=body)
            _raise(r)
            return r.json()

    def patch(self, path: str, body: dict) -> Any:
        with httpx.Client(timeout=_TIMEOUT) as c:
            r = c.patch(self._url(path), headers=_headers(self.api_key), json=body)
            _raise(r)
            return r.json()

    def delete(self, path: str) -> Any:
        with httpx.Client(timeout=_TIMEOUT) as c:
            r = c.delete(self._url(path), headers=_headers(self.api_key))
            _raise(r)
            return r.json() if r.content else {"status": "deleted"}


def _raise(r: httpx.Response) -> None:
    if r.status_code >= 400:
        try:
            detail = r.json().get("detail", r.text[:300])
        except Exception:
            detail = r.text[:300]
        raise SystemExit(f"[red]API error {r.status_code}:[/red] {detail}")
