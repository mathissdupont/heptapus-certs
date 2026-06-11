"""hc config — show and update CLI configuration"""

from __future__ import annotations

import json
from typing import Optional

import typer

from ..config import CONFIG_FILE, get_api_base, get_api_key, set_credentials
from ..output import console, ok

app = typer.Typer(help="Manage CLI configuration.")


@app.command("show")
def show_config():
    """Show current CLI configuration (key is masked)."""
    key = get_api_key()
    base = get_api_base()

    if key:
        masked = key[:12] + "..." + key[-4:] if len(key) > 16 else "***"
    else:
        masked = "[red]not set[/red]"

    console.print(f"  API key:  [cyan]{masked}[/cyan]")
    console.print(f"  API base: [cyan]{base}[/cyan]")
    console.print(f"  Config:   [dim]{CONFIG_FILE}[/dim]")


@app.command("set")
def set_config(
    api_base: Optional[str] = typer.Option(None, "--api-base", help="Override API base URL"),
    api_key: Optional[str] = typer.Option(None, "--api-key", help="Set API key directly"),
):
    """Update configuration values without going through the full login flow."""
    current_key = api_key or get_api_key() or ""
    current_base = api_base or get_api_base()
    set_credentials(current_key, current_base if api_base else None)
    ok("Config updated.")
    show_config()


@app.command("path")
def config_path():
    """Print the path to the config file."""
    console.print(str(CONFIG_FILE))
