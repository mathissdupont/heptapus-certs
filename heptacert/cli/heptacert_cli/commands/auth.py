"""hc auth — login, logout, status"""

from __future__ import annotations

from typing import Optional

import typer

from ..client import HeptaCertClient
from ..config import (
    clear_credentials,
    get_api_base,
    get_api_key,
    set_credentials,
)
from ..output import console, error, ok

app = typer.Typer(help="Authenticate with your HeptaCert account.")


@app.command()
def login(
    api_key: Optional[str] = typer.Option(
        None, "--key", "-k",
        help="API key (hc_live_...). Prompted if omitted.",
        envvar="HEPTACERT_API_KEY",
    ),
    api_base: Optional[str] = typer.Option(
        None, "--url", "-u",
        help="API base URL. Default: https://app.heptacert.com",
        envvar="HEPTACERT_API_BASE",
    ),
):
    """Save your API key. Generate one at Admin → Settings → API Keys."""
    if not api_key:
        api_key = typer.prompt("API key (hc_live_...)", hide_input=True)
    if not api_key.startswith("hc_live_"):
        error("API key must start with hc_live_")

    # Validate by calling /api/admin/mcp/me
    try:
        client = HeptaCertClient(api_key=api_key, api_base=api_base)
        info = client.get("/api/admin/mcp/me")
    except SystemExit as e:
        error(f"Authentication failed: {e}")
        return

    set_credentials(api_key, api_base)
    scopes = info.get("scopes") or []
    scope_str = ", ".join(scopes) if scopes else "all (unscoped)"
    ok(f"Logged in as [bold]{info.get('email')}[/bold]")
    console.print(f"  Scopes: [cyan]{scope_str}[/cyan]")
    console.print(f"  API:    [dim]{get_api_base()}[/dim]")


@app.command()
def logout():
    """Remove saved credentials."""
    clear_credentials()
    ok("Credentials removed.")


@app.command()
def status():
    """Show current authentication status."""
    key = get_api_key()
    if not key:
        console.print("[yellow]Not authenticated.[/yellow]  Run [bold]hc auth login[/bold]")
        raise typer.Exit(1)
    try:
        client = HeptaCertClient(api_key=key)
        info = client.get("/api/admin/mcp/me")
    except SystemExit:
        console.print("[red]API key saved but request failed.[/red]  Check your key and network.")
        raise typer.Exit(1)

    scopes = info.get("scopes") or []
    prefix = info.get("api_key_prefix", "")
    console.print(f"[green]Authenticated[/green] as [bold]{info.get('email')}[/bold]")
    console.print(f"  Key prefix: [dim]{prefix}...[/dim]")
    console.print(f"  Scopes:     [cyan]{', '.join(scopes) if scopes else 'all (unscoped)'}[/cyan]")
    console.print(f"  API:        [dim]{get_api_base()}[/dim]")
