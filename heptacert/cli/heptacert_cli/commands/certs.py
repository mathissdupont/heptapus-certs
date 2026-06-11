"""hc certs — list, issue, revoke"""

from __future__ import annotations

from typing import Optional

import typer

from ..client import HeptaCertClient
from ..output import console, format_output, ok, warn

app = typer.Typer(help="Manage certificates.")

_OUTPUT_HELP = "Output format: table (default), json, csv"
_COLS = ["id", "student_name", "status", "issued_at", "pdf_url"]


@app.command("list")
def list_certs(
    event_id: int = typer.Argument(..., help="Event ID"),
    search: Optional[str] = typer.Option(None, "--search", "-s", help="Filter by name"),
    status: Optional[str] = typer.Option(None, "--status", help="active | revoked | expired"),
    page: int = typer.Option(1, "--page"),
    limit: int = typer.Option(20, "--limit", "-n"),
    output: str = typer.Option("table", "--output", "-o", help=_OUTPUT_HELP),
):
    """List certificates for an event."""
    client = HeptaCertClient()
    params: dict = {"page": page, "limit": limit}
    if search:
        params["search"] = search
    if status:
        params["status"] = status
    data = client.get(f"/api/admin/events/{event_id}/certificates", params=params)
    rows = data.get("certificates", []) if isinstance(data, dict) else data
    total = data.get("total", len(rows)) if isinstance(data, dict) else len(rows)
    console.print(f"[dim]Total: {total}[/dim]")
    format_output(rows, output, columns=_COLS, title=f"Certificates — Event {event_id}")


@app.command("issue")
def issue_certs(
    event_id: int = typer.Argument(..., help="Event ID"),
    attendee_ids: Optional[str] = typer.Option(
        None, "--ids", help="Comma-separated attendee IDs. Omit to issue for all eligible."
    ),
    output: str = typer.Option("json", "--output", "-o", help=_OUTPUT_HELP),
):
    """Issue certificates for all eligible attendees (or specific ones)."""
    client = HeptaCertClient()
    body: dict = {}
    if attendee_ids:
        ids = [int(i.strip()) for i in attendee_ids.split(",") if i.strip()]
        body["attendee_ids"] = ids
    data = client.post(f"/api/admin/events/{event_id}/certificates", body)
    ok("Certificate issuance triggered.")
    format_output(data, output)


@app.command("revoke")
def revoke_cert(
    cert_id: int = typer.Argument(..., help="Certificate ID"),
    yes: bool = typer.Option(False, "--yes", "-y", help="Skip confirmation"),
):
    """Revoke a certificate — makes the PDF inaccessible permanently."""
    if not yes:
        warn(f"Revoke certificate {cert_id}? The PDF link will become inaccessible.")
        if not typer.confirm("Confirm?", default=False):
            console.print("[dim]Aborted.[/dim]")
            raise typer.Exit(0)
    client = HeptaCertClient()
    data = client.post(f"/api/admin/certificates/{cert_id}/revoke", {})
    ok(f"Certificate {cert_id} revoked.")


@app.command("tier-summary")
def tier_summary(
    event_id: int = typer.Argument(..., help="Event ID"),
    output: str = typer.Option("table", "--output", "-o", help=_OUTPUT_HELP),
):
    """Show certificate tier distribution for an event."""
    client = HeptaCertClient()
    data = client.get(f"/api/admin/events/{event_id}/certificates/tier-summary")
    format_output(data, output)
