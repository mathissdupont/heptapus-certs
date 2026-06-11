"""HeptaCert CLI — hc entrypoint"""

from __future__ import annotations

import typer
from rich import print as rprint

from .commands import auth, automations, attendees, certs, checkin, events, lms, logs, sessions

app = typer.Typer(
    name="hc",
    help="HeptaCert CLI — manage events, attendees, certificates and more.",
    no_args_is_help=True,
    rich_markup_mode="rich",
    add_completion=True,
)

app.add_typer(auth.app, name="auth", help="Authenticate (login / logout / status).")
app.add_typer(events.app, name="events", help="Manage events.")
app.add_typer(attendees.app, name="attendees", help="Manage attendees.")
app.add_typer(certs.app, name="certs", help="Manage certificates.")
app.add_typer(sessions.app, name="sessions", help="Manage event sessions.")
app.add_typer(checkin.app, name="checkin", help="Check-in operations.")
app.add_typer(lms.app, name="lms", help="LMS courses and enrollments.")
app.add_typer(automations.app, name="automations", help="Automation rules.")
app.add_typer(logs.app, name="logs", help="AI agent audit trail.")


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
