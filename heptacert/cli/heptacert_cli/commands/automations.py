"""hc automations — list, create"""

from __future__ import annotations

import json
from typing import Optional

import typer

from ..client import HeptaCertClient
from ..output import console, format_output, ok

app = typer.Typer(help="Manage event automation rules.")

_OUTPUT_HELP = "Output format: table (default), json, csv"

TRIGGER_TYPES = [
    "attended_event", "registered_no_show", "certificate_issued",
    "survey_not_completed", "badge_earned", "audience_segment",
    "lms_course_enrolled", "lms_course_completed", "lms_module_completed",
    "lms_assignment_graded", "lms_journey_completed", "compliance_overdue",
]


@app.command("list")
def list_automations(
    event_id: int = typer.Argument(..., help="Event ID"),
    output: str = typer.Option("table", "--output", "-o", help=_OUTPUT_HELP),
):
    """List automation rules for an event."""
    client = HeptaCertClient()
    data = client.get(f"/api/admin/events/{event_id}/automations")
    rules = data.get("rules", []) if isinstance(data, dict) else data
    format_output(
        rules, output,
        columns=["id", "name", "trigger", "enabled", "execution_count"],
        title=f"Automation Rules — Event {event_id}",
    )


@app.command("create")
def create_automation(
    event_id: int = typer.Argument(..., help="Event ID"),
    name: str = typer.Option(..., "--name", "-n", help="Rule name"),
    trigger: str = typer.Option(..., "--trigger", "-t",
                                help=f"Trigger type. Options: {', '.join(TRIGGER_TYPES)}"),
    actions_json: str = typer.Option(
        ..., "--actions", "-a",
        help='JSON array of actions. Example: \'[{"type":"send_email","template_id":1}]\''
    ),
    enabled: bool = typer.Option(True, "--enabled/--disabled"),
    output: str = typer.Option("json", "--output", "-o", help=_OUTPUT_HELP),
):
    """Create an automation rule.

    \b
    Trigger types:
      attended_event, registered_no_show, certificate_issued, survey_not_completed,
      badge_earned, lms_course_enrolled, lms_course_completed, compliance_overdue, ...

    \b
    Action examples:
      Send email:    [{"type": "send_email", "template_id": 123, "delay_hours": 0}]
      Reminder:      [{"type": "create_reminder", "message": "Follow up", "delay_hours": 24}]
      Webhook:       [{"type": "webhook_dispatch", "url": "https://...", "method": "POST"}]
    """
    if trigger not in TRIGGER_TYPES:
        console.print(f"[yellow]Warning: '{trigger}' is not a known trigger type.[/yellow]")
    try:
        actions = json.loads(actions_json)
    except json.JSONDecodeError as e:
        console.print(f"[red]Invalid JSON for --actions: {e}[/red]")
        raise typer.Exit(1)

    client = HeptaCertClient()
    data = client.post(f"/api/admin/events/{event_id}/automations", {
        "name": name, "trigger": trigger, "actions": actions,
        "trigger_config": {}, "enabled": enabled,
    })
    ok(f"Automation rule [bold]{name}[/bold] created.")
    if output != "table":
        format_output(data, output)
