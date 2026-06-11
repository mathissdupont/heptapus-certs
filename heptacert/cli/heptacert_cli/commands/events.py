"""hc events — list, get, create, update, delete, open/close registration"""

from __future__ import annotations

from typing import Optional

import typer

from ..client import HeptaCertClient
from ..output import console, format_output, ok, warn

app = typer.Typer(help="Manage HeptaCert events.")

_OUTPUT_HELP = "Output format: table (default), json, csv"
_COLS = ["id", "name", "event_date", "event_type", "visibility", "registration_enabled", "certificate_enabled"]


@app.command("list")
def list_events(
    search: Optional[str] = typer.Option(None, "--search", "-s", help="Filter by name"),
    limit: int = typer.Option(20, "--limit", "-n", help="Max results"),
    output: str = typer.Option("table", "--output", "-o", help=_OUTPUT_HELP),
):
    """List events in your account."""
    client = HeptaCertClient()
    data = client.get("/api/admin/events")
    events: list = data if isinstance(data, list) else data.get("events", [])
    if search:
        kw = search.lower()
        events = [e for e in events if kw in (e.get("name") or "").lower()]
    events = events[:limit]
    format_output(events, output, columns=_COLS, title="Events")


@app.command("get")
def get_event(
    event_id: int = typer.Argument(..., help="Numeric event ID"),
    output: str = typer.Option("json", "--output", "-o", help=_OUTPUT_HELP),
):
    """Show full details of a single event."""
    client = HeptaCertClient()
    data = client.get(f"/api/admin/events/{event_id}")
    format_output(data, output)


@app.command("stats")
def event_stats(
    event_id: int = typer.Argument(..., help="Numeric event ID"),
    output: str = typer.Option("table", "--output", "-o", help=_OUTPUT_HELP),
):
    """Show event statistics (attendees, certs, sessions, check-ins)."""
    client = HeptaCertClient()
    data = client.get(f"/api/admin/events/{event_id}/health")
    format_output(data, output)


@app.command("create")
def create_event(
    name: str = typer.Argument(..., help="Event name"),
    date: Optional[str] = typer.Option(None, "--date", "-d", help="Date YYYY-MM-DD"),
    description: Optional[str] = typer.Option(None, "--description", help="Event description"),
    location: Optional[str] = typer.Option(None, "--location", "-l", help="Location or URL"),
    event_type: str = typer.Option("certificate_event", "--type", "-t",
                                   help="certificate_event, seminar, workshop, conference, training, ..."),
    public: bool = typer.Option(False, "--public", help="Make event publicly listed"),
    no_cert: bool = typer.Option(False, "--no-cert", help="Disable certificates"),
    no_checkin: bool = typer.Option(False, "--no-checkin", help="Disable check-in"),
    tickets: bool = typer.Option(False, "--tickets", help="Enable ticketing"),
    output: str = typer.Option("json", "--output", "-o", help=_OUTPUT_HELP),
):
    """Create a new event."""
    client = HeptaCertClient()
    body: dict = {
        "name": name,
        "template_image_url": "placeholder",
        "event_type": event_type,
        "certificate_enabled": not no_cert,
        "registration_enabled": True,
        "checkin_enabled": not no_checkin,
        "ticketing_enabled": tickets,
        "config": {},
    }
    created = client.post("/api/admin/events", body)
    event_id = created.get("id")

    patch: dict = {}
    if date:
        patch["event_date"] = date
    if description:
        patch["event_description"] = description
    if location:
        patch["event_location"] = location
    if public:
        patch["visibility"] = "public"
    if patch:
        created = client.patch(f"/api/admin/events/{event_id}", patch)

    ok(f"Event created: [bold]{name}[/bold] (id={event_id})")
    if output != "table":
        format_output(created, output)


@app.command("update")
def update_event(
    event_id: int = typer.Argument(..., help="Numeric event ID"),
    name: Optional[str] = typer.Option(None, "--name"),
    date: Optional[str] = typer.Option(None, "--date", help="YYYY-MM-DD"),
    description: Optional[str] = typer.Option(None, "--description"),
    location: Optional[str] = typer.Option(None, "--location"),
    event_type: Optional[str] = typer.Option(None, "--type"),
    visibility: Optional[str] = typer.Option(None, "--visibility", help="private or public"),
    registration_closed: Optional[bool] = typer.Option(None, "--registration-closed/--registration-open"),
    quota: Optional[int] = typer.Option(None, "--quota", help="Registration quota"),
    output: str = typer.Option("json", "--output", "-o", help=_OUTPUT_HELP),
):
    """Update event metadata or settings."""
    client = HeptaCertClient()
    fields = {
        "name": name, "event_date": date, "event_description": description,
        "event_location": location, "event_type": event_type, "visibility": visibility,
        "registration_closed": registration_closed, "registration_quota": quota,
    }
    patch_body = {k: v for k, v in fields.items() if v is not None}
    if not patch_body:
        console.print("[yellow]Nothing to update — provide at least one option.[/yellow]")
        raise typer.Exit(1)
    updated = client.patch(f"/api/admin/events/{event_id}", patch_body)
    ok(f"Event {event_id} updated")
    if output != "table":
        format_output(updated, output)


@app.command("delete")
def delete_event(
    event_id: int = typer.Argument(..., help="Numeric event ID"),
    yes: bool = typer.Option(False, "--yes", "-y", help="Skip confirmation prompt"),
):
    """Delete an event permanently. Asks for confirmation unless --yes is passed."""
    client = HeptaCertClient()
    event_data = client.get(f"/api/admin/events/{event_id}")
    event_name = event_data.get("name", f"ID {event_id}")

    if not yes:
        warn(f"You are about to permanently delete [bold]{event_name}[/bold] (id={event_id}).")
        confirm = typer.confirm("Are you sure?", default=False)
        if not confirm:
            console.print("[dim]Aborted.[/dim]")
            raise typer.Exit(0)

    client.delete(f"/api/admin/events/{event_id}")
    ok(f"Event [bold]{event_name}[/bold] (id={event_id}) deleted.")


@app.command("close-registration")
def close_registration(
    event_id: int = typer.Argument(..., help="Numeric event ID"),
):
    """Close registrations — no new attendees can sign up."""
    client = HeptaCertClient()
    client.patch(f"/api/admin/events/{event_id}", {"registration_closed": True})
    ok(f"Registration closed for event {event_id}.")


@app.command("open-registration")
def open_registration(
    event_id: int = typer.Argument(..., help="Numeric event ID"),
):
    """Reopen registrations for an event."""
    client = HeptaCertClient()
    client.patch(f"/api/admin/events/{event_id}", {"registration_closed": False})
    ok(f"Registration opened for event {event_id}.")
