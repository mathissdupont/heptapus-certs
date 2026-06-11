"""hc logs — view agent action audit trail"""

from __future__ import annotations

from typing import Optional

import typer

from ..client import HeptaCertClient
from ..output import format_output

app = typer.Typer(help="View the AI agent action audit trail.")

_OUTPUT_HELP = "Output format: table (default), json, csv"
_COLS = ["id", "tool_name", "event_id", "api_key_prefix", "result_summary", "created_at"]


@app.command("list")
def list_logs(
    event_id: Optional[int] = typer.Option(None, "--event", "-e", help="Filter by event ID"),
    tool: Optional[str] = typer.Option(None, "--tool", "-t", help="Filter by tool name"),
    limit: int = typer.Option(20, "--limit", "-n"),
    output: str = typer.Option("table", "--output", "-o", help=_OUTPUT_HELP),
):
    """Show recent AI agent actions logged from MCP tool calls."""
    client = HeptaCertClient()
    params: dict = {"limit": limit}
    if event_id:
        params["event_id"] = event_id
    if tool:
        params["tool_name"] = tool
    data = client.get("/api/admin/mcp/agent-logs", params=params)
    rows = data if isinstance(data, list) else data.get("logs", [])
    format_output(rows, output, columns=_COLS, title="Agent Action Logs")
