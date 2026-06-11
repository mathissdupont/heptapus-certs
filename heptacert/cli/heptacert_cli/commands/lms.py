"""hc lms — courses, enrollments, analytics"""

from __future__ import annotations

from typing import Optional

import typer

from ..client import HeptaCertClient
from ..output import format_output, ok

app = typer.Typer(help="LMS (Learning Management System) operations.")

_OUTPUT_HELP = "Output format: table (default), json, csv"


@app.command("courses")
def list_courses(
    search: Optional[str] = typer.Option(None, "--search", "-s"),
    output: str = typer.Option("table", "--output", "-o", help=_OUTPUT_HELP),
):
    """List LMS courses."""
    client = HeptaCertClient()
    data = client.get("/api/admin/lms/courses")
    rows = data if isinstance(data, list) else data.get("courses", data.get("items", []))
    if search:
        kw = search.lower()
        rows = [c for c in rows if kw in (c.get("title") or "").lower()]
    format_output(
        rows, output,
        columns=["id", "title", "status", "enrollment_count", "module_count"],
        title="LMS Courses",
    )


@app.command("course")
def get_course(
    course_id: int = typer.Argument(..., help="Course ID"),
    output: str = typer.Option("json", "--output", "-o", help=_OUTPUT_HELP),
):
    """Show full details of an LMS course."""
    client = HeptaCertClient()
    data = client.get(f"/api/admin/lms/courses/{course_id}")
    format_output(data, output)


@app.command("enrollments")
def list_enrollments(
    course_id: int = typer.Argument(..., help="Course ID"),
    search: Optional[str] = typer.Option(None, "--search", "-s"),
    page: int = typer.Option(1, "--page"),
    limit: int = typer.Option(50, "--limit", "-n"),
    output: str = typer.Option("table", "--output", "-o", help=_OUTPUT_HELP),
):
    """List learner enrollments for an LMS course."""
    client = HeptaCertClient()
    params: dict = {"page": page, "limit": limit}
    if search:
        params["search"] = search
    data = client.get(f"/api/admin/lms/courses/{course_id}/enrollments", params=params)
    rows = data if isinstance(data, list) else data.get("enrollments", data.get("items", []))
    format_output(
        rows, output,
        columns=["id", "learner_name", "email", "enrolled_at", "progress_pct", "completed_at"],
        title=f"Enrollments — Course {course_id}",
    )


@app.command("enroll")
def enroll(
    course_id: int = typer.Argument(..., help="Course ID"),
    email: str = typer.Option(..., "--email", "-e"),
    first_name: str = typer.Option(..., "--first-name", "-f"),
    last_name: str = typer.Option(..., "--last-name", "-l"),
    output: str = typer.Option("json", "--output", "-o", help=_OUTPUT_HELP),
):
    """Enroll a learner in an LMS course."""
    client = HeptaCertClient()
    body = {"enrollments": [{"email": email, "first_name": first_name, "last_name": last_name}]}
    data = client.post(f"/api/admin/lms/courses/{course_id}/enrollments/import", body)
    ok(f"[bold]{email}[/bold] enrolled in course {course_id}.")
    if output != "table":
        format_output(data, output)


@app.command("analytics")
def analytics(
    course_id: Optional[int] = typer.Argument(None, help="Course ID (omit for org-wide analytics)"),
    output: str = typer.Option("json", "--output", "-o", help=_OUTPUT_HELP),
):
    """Show LMS analytics. Pass a course ID for course-level, or omit for org-wide."""
    client = HeptaCertClient()
    if course_id:
        data = client.get(f"/api/admin/lms/courses/{course_id}/analytics")
    else:
        data = client.get("/api/admin/lms/analytics")
    format_output(data, output)
