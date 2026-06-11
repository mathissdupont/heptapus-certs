"""HeptaCert CLI — hc entrypoint"""

from __future__ import annotations

import typer
from rich import print as rprint

from .commands import (
    auth, automations, attendees, certs, checkin,
    config, events, lms, logs, sessions, webhooks,
)
from .client import HeptaCertClient
from .config import get_api_key
from .output import console

app = typer.Typer(
    name="hc",
    help="HeptaCert CLI — manage events, attendees, certificates and more.",
    no_args_is_help=True,
    rich_markup_mode="rich",
    add_completion=True,
)

app.add_typer(auth.app,        name="auth",        help="Authenticate (login / logout / status).")
app.add_typer(events.app,      name="events",      help="Manage events.")
app.add_typer(attendees.app,   name="attendees",   help="Manage attendees.")
app.add_typer(certs.app,       name="certs",       help="Manage certificates.")
app.add_typer(sessions.app,    name="sessions",    help="Manage event sessions.")
app.add_typer(checkin.app,     name="checkin",     help="Check-in operations.")
app.add_typer(lms.app,         name="lms",         help="LMS courses and enrollments.")
app.add_typer(automations.app, name="automations", help="Automation rules.")
app.add_typer(webhooks.app,    name="webhooks",    help="Webhook endpoints.")
app.add_typer(logs.app,        name="logs",        help="AI agent audit trail.")
app.add_typer(config.app,      name="config",      help="CLI configuration.")


@app.command()
def ping():
    """Check connectivity and authentication. Shows API version and account info."""
    key = get_api_key()
    if not key:
        console.print("[yellow]Not authenticated.[/yellow]  Run [bold]hc auth login[/bold]")
        raise typer.Exit(1)
    try:
        client = HeptaCertClient(api_key=key)
        health = client.get("/api/health")
        me = client.get("/api/admin/mcp/me")
        console.print(f"[green]✓ Connected[/green] to [bold]{client.api_base}[/bold]")
        console.print(f"  API:     [cyan]{health.get('status', 'ok')}[/cyan]  v{health.get('version', '—')}")
        console.print(f"  Account: [bold]{me.get('email')}[/bold]")
        scopes = me.get("scopes") or []
        console.print(f"  Scopes:  [dim]{', '.join(scopes) if scopes else 'all (unscoped)'}[/dim]")
    except SystemExit as e:
        console.print(f"[red]✗ Connection failed:[/red] {e}")
        raise typer.Exit(1)


@app.callback(invoke_without_command=True)
def main(
    ctx: typer.Context,
    version: bool = typer.Option(False, "--version", "-V", help="Show CLI version and exit.", is_eager=True),
):
    if version:
        rprint("[bold cyan]hc[/bold cyan] v1.0.0 — HeptaCert CLI")
        raise typer.Exit()
    if ctx.invoked_subcommand is None:
        rprint(ctx.get_help())


if __name__ == "__main__":
    app()
