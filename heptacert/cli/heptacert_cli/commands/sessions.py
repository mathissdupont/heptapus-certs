"""hc sessions — list, create, update, delete"""

from __future__ import annotations

from typing import Optional

import typer

from ..client import HeptaCertClient
from ..output import console, format_output, ok, warn

app = typer.Typer(help="Manage event sessions (agenda items).")

_OUTPUT_HELP = "Output format: table (default), json, csv"
_COLS = ["id", "title", "start_time", "end_time", "location", "speaker", "capacity", "is_active"]


@app.command("list")
def list_sessions(
    event_id: int = typer.Argument(..., help="Event ID"),
    output: str = typer.Option("table", "--output", "-o", help=_OUTPUT_HELP),
):
    """List all sessions for an event."""
    client = HeptaCertClient()
    data = client.get(f"/api/admin/events/{event_id}/sessions")
    rows = data if isinstance(data, list) else data.get("sessions", [])
    format_output(rows, output, columns=_COLS, title=f"Sessions — Event {event_id}")


@app.command("create")
def create_session(
    event_id: int = typer.Argument(..., help="Event ID"),
    title: str = typer.Option(..., "--title", "-t"),
    description: Optional[str] = typer.Option(None, "--description"),
    start: Optional[str] = typer.Option(None, "--start", help="ISO 8601 datetime"),
    end: Optional[str] = typer.Option(None, "--end", help="ISO 8601 datetime"),
    location: Optional[str] = typer.Option(None, "--location", "-l"),
    speaker: Optional[str] = typer.Option(None, "--speaker"),
    capacity: Optional[int] = typer.Option(None, "--capacity"),
    output: str = typer.Option("json", "--output", "-o", help=_OUTPUT_HELP),
):
    """Add a new session to an event."""
    client = HeptaCertClient()
    body: dict = {"title": title}
    for key, val in [
        ("description", description), ("start_time", start),
        ("end_time", end), ("location", location), ("speaker", speaker), ("capacity", capacity),
    ]:
        if val is not None:
            body[key] = val
    data = client.post(f"/api/admin/events/{event_id}/sessions", body)
    ok(f"Session [bold]{title}[/bold] created (id={data.get('id')}).")
    if output != "table":
        format_output(data, output)


@app.command("update")
def update_session(
    event_id: int = typer.Argument(..., help="Event ID"),
    session_id: int = typer.Argument(..., help="Session ID"),
    title: Optional[str] = typer.Option(None, "--title"),
    description: Optional[str] = typer.Option(None, "--description"),
    start: Optional[str] = typer.Option(None, "--start"),
    end: Optional[str] = typer.Option(None, "--end"),
    location: Optional[str] = typer.Option(None, "--location"),
    speaker: Optional[str] = typer.Option(None, "--speaker"),
    capacity: Optional[int] = typer.Option(None, "--capacity"),
    active: Optional[bool] = typer.Option(None, "--active/--inactive"),
    output: str = typer.Option("json", "--output", "-o", help=_OUTPUT_HELP),
):
    """Update a session's details."""
    client = HeptaCertClient()
    fields = {
        "title": title, "description": description, "start_time": start,
        "end_time": end, "location": location, "speaker": speaker,
        "capacity": capacity, "is_active": active,
    }
    body = {k: v for k, v in fields.items() if v is not None}
    if not body:
        console.print("[yellow]Nothing to update.[/yellow]")
        raise typer.Exit(1)
    data = client.patch(f"/api/admin/events/{event_id}/sessions/{session_id}", body)
    ok(f"Session {session_id} updated.")
    format_output(data, output)


@app.command("delete")
def delete_session(
    event_id: int = typer.Argument(..., help="Event ID"),
    session_id: int = typer.Argument(..., help="Session ID"),
    yes: bool = typer.Option(False, "--yes", "-y"),
):
    """Delete a session permanently."""
    if not yes:
        warn(f"Delete session {session_id} from event {event_id}?")
        if not typer.confirm("Confirm?", default=False):
            console.print("[dim]Aborted.[/dim]")
            raise typer.Exit(0)
    client = HeptaCertClient()
    client.delete(f"/api/admin/events/{event_id}/sessions/{session_id}")
    ok(f"Session {session_id} deleted.")
