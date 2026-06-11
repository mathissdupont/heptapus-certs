"""hc attendees — list, add, import (CSV), export, update, remove"""

from __future__ import annotations

import csv
import json
import sys
from pathlib import Path
from typing import Optional

import typer

from ..client import HeptaCertClient
from ..output import console, error, format_output, ok, warn

app = typer.Typer(help="Manage event attendees.")

_OUTPUT_HELP = "Output format: table (default), json, csv"
_COLS = ["id", "name", "email", "source", "registered_at", "has_certificate"]


@app.command("list")
def list_attendees(
    event_id: int = typer.Argument(..., help="Event ID"),
    search: Optional[str] = typer.Option(None, "--search", "-s"),
    page: int = typer.Option(1, "--page"),
    limit: int = typer.Option(50, "--limit", "-n"),
    output: str = typer.Option("table", "--output", "-o", help=_OUTPUT_HELP),
):
    """List attendees for an event."""
    client = HeptaCertClient()
    params: dict = {"page": page, "limit": limit}
    if search:
        params["search"] = search
    data = client.get(f"/api/admin/events/{event_id}/attendees", params=params)
    rows = data if isinstance(data, list) else data.get("attendees", data.get("items", []))
    format_output(rows, output, columns=_COLS, title=f"Attendees — Event {event_id}")


@app.command("add")
def add_attendee(
    event_id: int = typer.Argument(..., help="Event ID"),
    first_name: str = typer.Option(..., "--first-name", "-f"),
    last_name: str = typer.Option(..., "--last-name", "-l"),
    email: str = typer.Option(..., "--email", "-e"),
    output: str = typer.Option("table", "--output", "-o", help=_OUTPUT_HELP),
):
    """Add a single attendee to an event."""
    client = HeptaCertClient()
    data = client.post(f"/api/admin/events/{event_id}/attendees", {
        "first_name": first_name, "last_name": last_name, "email": email,
    })
    ok(f"Attendee [bold]{first_name} {last_name}[/bold] <{email}> added.")
    if output != "table":
        format_output(data, output)


@app.command("import")
def import_attendees(
    event_id: int = typer.Argument(..., help="Event ID"),
    file: Path = typer.Argument(..., help="CSV file with columns: first_name, last_name, email"),
    output: str = typer.Option("table", "--output", "-o", help=_OUTPUT_HELP),
):
    """Bulk import attendees from a CSV file.

    CSV format: first_name,last_name,email  (header row required)
    """
    if not file.exists():
        error(f"File not found: {file}")
    client = HeptaCertClient()
    attendees = []
    with open(file, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            email = (row.get("email") or "").strip()
            if not email:
                continue
            attendees.append({
                "first_name": (row.get("first_name") or row.get("first name") or "").strip(),
                "last_name": (row.get("last_name") or row.get("last name") or "").strip(),
                "email": email,
            })

    if not attendees:
        error("No valid rows found in CSV. Ensure columns: first_name, last_name, email")

    added = skipped = 0
    import httpx as _httpx
    for a in attendees:
        try:
            client.post(f"/api/admin/events/{event_id}/attendees", a)
            added += 1
        except SystemExit as e:
            if "409" in str(e):
                skipped += 1
            else:
                warn(f"Failed for {a['email']}: {e}")

    ok(f"Import complete: [bold]{added}[/bold] added, [dim]{skipped}[/dim] skipped (duplicates).")


@app.command("export")
def export_attendees(
    event_id: int = typer.Argument(..., help="Event ID"),
    output: str = typer.Option("csv", "--output", "-o", help=_OUTPUT_HELP),
):
    """Export all attendees to CSV or JSON."""
    client = HeptaCertClient()
    all_rows = []
    page = 1
    while True:
        data = client.get(f"/api/admin/events/{event_id}/attendees", params={"page": page, "limit": 200})
        rows = data if isinstance(data, list) else data.get("attendees", data.get("items", []))
        if not rows:
            break
        all_rows.extend(rows)
        if len(rows) < 200:
            break
        page += 1
    format_output(all_rows, output, columns=_COLS)


@app.command("update")
def update_attendee(
    event_id: int = typer.Argument(..., help="Event ID"),
    attendee_id: int = typer.Argument(..., help="Attendee ID"),
    first_name: Optional[str] = typer.Option(None, "--first-name"),
    last_name: Optional[str] = typer.Option(None, "--last-name"),
    email: Optional[str] = typer.Option(None, "--email"),
    output: str = typer.Option("json", "--output", "-o", help=_OUTPUT_HELP),
):
    """Update an attendee's details."""
    client = HeptaCertClient()
    body = {k: v for k, v in {
        "first_name": first_name, "last_name": last_name, "email": email,
    }.items() if v is not None}
    if not body:
        error("Provide at least one field to update.")
    data = client.patch(f"/api/admin/events/{event_id}/attendees/{attendee_id}", body)
    ok(f"Attendee {attendee_id} updated.")
    format_output(data, output)


@app.command("remove")
def remove_attendee(
    event_id: int = typer.Argument(..., help="Event ID"),
    attendee_id: int = typer.Argument(..., help="Attendee ID"),
    yes: bool = typer.Option(False, "--yes", "-y", help="Skip confirmation"),
):
    """Remove an attendee from an event permanently."""
    if not yes:
        warn(f"Remove attendee {attendee_id} from event {event_id}?")
        if not typer.confirm("Confirm?", default=False):
            console.print("[dim]Aborted.[/dim]")
            raise typer.Exit(0)
    client = HeptaCertClient()
    client.delete(f"/api/admin/events/{event_id}/attendees/{attendee_id}")
    ok(f"Attendee {attendee_id} removed from event {event_id}.")
