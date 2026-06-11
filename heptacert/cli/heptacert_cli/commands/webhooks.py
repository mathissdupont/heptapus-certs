"""hc webhooks — list, create, delete"""

from __future__ import annotations

from typing import Optional

import typer

from ..client import HeptaCertClient
from ..output import console, format_output, ok, warn

app = typer.Typer(help="Manage webhook endpoints.")

_OUTPUT_HELP = "Output format: table (default), json, csv"
_COLS = ["id", "url", "events", "is_active", "created_at"]

WEBHOOK_EVENTS = [
    "attendee.registered",
    "attendee.checkin",
    "certificate.issued",
    "certificate.revoked",
    "event.created",
    "event.updated",
    "payment.completed",
]


@app.command("list")
def list_webhooks(
    output: str = typer.Option("table", "--output", "-o", help=_OUTPUT_HELP),
):
    """List all configured webhook endpoints."""
    client = HeptaCertClient()
    data = client.get("/api/admin/webhooks")
    rows = data if isinstance(data, list) else data.get("webhooks", [])
    format_output(rows, output, columns=_COLS, title="Webhooks")


@app.command("create")
def create_webhook(
    url: str = typer.Argument(..., help="Target HTTPS URL"),
    events: Optional[str] = typer.Option(
        None, "--events", "-e",
        help=f"Comma-separated event types. All if omitted. Options: {', '.join(WEBHOOK_EVENTS)}",
    ),
    secret: Optional[str] = typer.Option(None, "--secret", "-s", help="HMAC signing secret"),
    output: str = typer.Option("json", "--output", "-o", help=_OUTPUT_HELP),
):
    """Create a new webhook endpoint.

    \b
    Available event types:
      attendee.registered   attendee.checkin
      certificate.issued    certificate.revoked
      event.created         event.updated
      payment.completed
    """
    if not url.startswith("https://"):
        warn("URL should use HTTPS for security.")

    event_list = [e.strip() for e in events.split(",")] if events else WEBHOOK_EVENTS
    body: dict = {"url": url, "events": event_list}
    if secret:
        body["secret"] = secret

    client = HeptaCertClient()
    data = client.post("/api/admin/webhooks", body)
    ok(f"Webhook created (id={data.get('id')}) → [bold]{url}[/bold]")
    format_output(data, output)


@app.command("delete")
def delete_webhook(
    webhook_id: int = typer.Argument(..., help="Webhook ID"),
    yes: bool = typer.Option(False, "--yes", "-y", help="Skip confirmation"),
):
    """Delete a webhook endpoint permanently."""
    if not yes:
        warn(f"Delete webhook {webhook_id}?")
        if not typer.confirm("Confirm?", default=False):
            console.print("[dim]Aborted.[/dim]")
            raise typer.Exit(0)
    client = HeptaCertClient()
    client.delete(f"/api/admin/webhooks/{webhook_id}")
    ok(f"Webhook {webhook_id} deleted.")


@app.command("test")
def test_webhook(
    webhook_id: int = typer.Argument(..., help="Webhook ID"),
    event_type: str = typer.Option("certificate.issued", "--event", "-e", help="Event type to simulate"),
):
    """Send a test payload to a webhook endpoint."""
    client = HeptaCertClient()
    data = client.post(f"/api/admin/webhooks/{webhook_id}/test", {"event": event_type})
    ok(f"Test payload sent to webhook {webhook_id}.")
    console.print(f"  Response status: [cyan]{data.get('response_status', 'N/A')}[/cyan]")
    console.print(f"  Delivery:        [cyan]{data.get('delivery_status', 'N/A')}[/cyan]")
