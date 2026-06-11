"""Config and auth management — stores API key and base URL in ~/.heptacert/config.json"""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Optional

CONFIG_DIR = Path.home() / ".heptacert"
CONFIG_FILE = CONFIG_DIR / "config.json"
DEFAULT_API_BASE = "https://app.heptacert.com"


def _load() -> dict:
    if CONFIG_FILE.exists():
        try:
            return json.loads(CONFIG_FILE.read_text())
        except Exception:
            pass
    return {}


def _save(data: dict) -> None:
    CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    CONFIG_FILE.write_text(json.dumps(data, indent=2))
    CONFIG_FILE.chmod(0o600)


def get_api_key() -> Optional[str]:
    return os.getenv("HEPTACERT_API_KEY") or _load().get("api_key")


def get_api_base() -> str:
    return (
        os.getenv("HEPTACERT_API_BASE")
        or _load().get("api_base")
        or DEFAULT_API_BASE
    ).rstrip("/")


def set_credentials(api_key: str, api_base: Optional[str] = None) -> None:
    data = _load()
    data["api_key"] = api_key
    if api_base:
        data["api_base"] = api_base.rstrip("/")
    _save(data)


def clear_credentials() -> None:
    data = _load()
    data.pop("api_key", None)
    _save(data)


def require_api_key() -> str:
    key = get_api_key()
    if not key:
        raise SystemExit(
            "[red]Not authenticated.[/red]\n"
            "Run [bold]hc auth login[/bold] or set the "
            "[bold]HEPTACERT_API_KEY[/bold] environment variable."
        )
    return key
