"""hc checkin — lookup, manual check-in, attendance summary"""

from __future__ import annotations

import typer

from ..client import HeptaCertClient
from ..output import format_output, ok

app = typer.Typer(help="Check-in operations.")

_OUTPUT_HELP = "Output format: table (default), json, csv"


@app.command("lookup")
def lookup(
    event_id: int = typer.Argument(..., help="Event ID"),
    query: str = typer.Argument(..., help="Name or email to search"),
    output: str = typer.Option("table", "--output", "-o", help=_OUTPUT_HELP),
):
    """Search attendees by name or email for manual check-in verification."""
    client = HeptaCertClient()
    data = client.get(
        f"/api/admin/events/{event_id}/checkin-lookup",
        params={"query": query},
    )
    rows = data if isinstance(data, list) else [data]
    format_output(
        rows, output,
        columns=["attendee_id", "name", "email", "ticket_status", "checked_in_at"],
        title=f"Check-in lookup: '{query}'",
    )


@app.command("manual")
def manual_checkin(
    event_id: int = typer.Argument(..., help="Event ID"),
    session_id: int = typer.Argument(..., help="Session ID"),
    email: str = typer.Argument(..., help="Attendee email to check in"),
    output: str = typer.Option("json", "--output", "-o", help=_OUTPUT_HELP),
):
    """Manually check in an attendee for a specific session."""
    client = HeptaCertClient()
    data = client.post(
        f"/api/admin/events/{event_id}/sessions/{session_id}/checkin",
        {"email": email},
    )
    ok(f"[bold]{email}[/bold] checked in to session {session_id}.")
    if output != "table":
        format_output(data, output)


@app.command("summary")
def attendance_summary(
    event_id: int = typer.Argument(..., help="Event ID"),
    output: str = typer.Option("json", "--output", "-o", help=_OUTPUT_HELP),
):
    """Show attendance summary: total registered, checked-in, rate, per-session breakdown."""
    client = HeptaCertClient()
    data = client.get(f"/api/admin/events/{event_id}/attendance")
    format_output(data, output)
