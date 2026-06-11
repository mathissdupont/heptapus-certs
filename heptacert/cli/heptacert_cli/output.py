"""Table, JSON, and CSV output helpers using Rich."""

from __future__ import annotations

import csv
import json
import sys
from typing import Any, Optional

from rich.console import Console
from rich.table import Table

console = Console()
err_console = Console(stderr=True)


def print_json(data: Any) -> None:
    console.print_json(json.dumps(data, default=str, ensure_ascii=False))


def print_csv(rows: list[dict], columns: Optional[list[str]] = None) -> None:
    if not rows:
        return
    cols = columns or list(rows[0].keys())
    writer = csv.DictWriter(sys.stdout, fieldnames=cols, extrasaction="ignore")
    writer.writeheader()
    writer.writerows(rows)


def print_table(
    rows: list[dict],
    columns: Optional[list[str]] = None,
    title: Optional[str] = None,
) -> None:
    if not rows:
        console.print("[dim]No results.[/dim]")
        return
    cols = columns or list(rows[0].keys())
    tbl = Table(title=title, show_header=True, header_style="bold cyan")
    for col in cols:
        tbl.add_column(col)
    for row in rows:
        tbl.add_row(*[str(row.get(c, "")) for c in cols])
    console.print(tbl)


def ok(msg: str) -> None:
    console.print(f"[green]✓[/green] {msg}")


def warn(msg: str) -> None:
    console.print(f"[yellow]⚠[/yellow]  {msg}")


def error(msg: str) -> None:
    err_console.print(f"[red]✗[/red] {msg}")
    raise SystemExit(1)


def format_output(
    data: Any,
    fmt: str,
    rows_key: Optional[str] = None,
    columns: Optional[list[str]] = None,
    title: Optional[str] = None,
) -> None:
    """Dispatch to json/csv/table based on --output flag."""
    if fmt == "json":
        print_json(data)
        return

    rows: list[dict]
    if isinstance(data, list):
        rows = data
    elif rows_key and isinstance(data, dict):
        rows = data.get(rows_key, [])
    elif isinstance(data, dict):
        rows = [data]
    else:
        rows = [{"value": str(data)}]

    if fmt == "csv":
        print_csv(rows, columns)
    else:
        print_table(rows, columns, title)
