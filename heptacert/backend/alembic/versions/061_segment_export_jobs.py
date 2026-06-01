"""Add segment export jobs.

Revision ID: 061_segment_export_jobs
Revises: 060_saved_audience_segments
Create Date: 2026-06-01
"""

from alembic import op
import sqlalchemy as sa


revision = "061_segment_export_jobs"
down_revision = "060_saved_audience_segments"
branch_labels = None
depends_on = None


def _tables() -> set[str]:
    return set(sa.inspect(op.get_bind()).get_table_names())


def _indexes(table_name: str) -> set[str]:
    return {item["name"] for item in sa.inspect(op.get_bind()).get_indexes(table_name)}


def _create_index(name: str, table_name: str, columns: list[str], tables: set[str]) -> None:
    if table_name in tables and name not in _indexes(table_name):
        op.create_index(name, table_name, columns)


def upgrade() -> None:
    tables = _tables()
    if "segment_export_jobs" not in tables:
        op.create_table(
            "segment_export_jobs",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("event_id", sa.Integer(), sa.ForeignKey("events.id", ondelete="CASCADE"), nullable=False),
            sa.Column("created_by", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
            sa.Column("segment_key", sa.String(length=64), nullable=False),
            sa.Column("filters", sa.JSON(), nullable=False, server_default=sa.text("'{}'")),
            sa.Column("status", sa.String(length=32), nullable=False, server_default="pending"),
            sa.Column("row_count", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("file_path", sa.Text(), nullable=True),
            sa.Column("file_name", sa.String(length=240), nullable=True),
            sa.Column("sync_google_sheets", sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column("google_spreadsheet_id", sa.String(length=160), nullable=True),
            sa.Column("google_spreadsheet_url", sa.Text(), nullable=True),
            sa.Column("google_sheet_name", sa.String(length=120), nullable=True),
            sa.Column("error_message", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        )
        tables.add("segment_export_jobs")

    for name, columns in [
        ("ix_segment_export_jobs_event_id", ["event_id"]),
        ("ix_segment_export_jobs_created_by", ["created_by"]),
        ("ix_segment_export_jobs_status", ["status"]),
        ("ix_segment_export_jobs_event_status", ["event_id", "status"]),
    ]:
        _create_index(name, "segment_export_jobs", columns, tables)


def downgrade() -> None:
    tables = _tables()
    if "segment_export_jobs" not in tables:
        return
    for name in [
        "ix_segment_export_jobs_event_status",
        "ix_segment_export_jobs_status",
        "ix_segment_export_jobs_created_by",
        "ix_segment_export_jobs_event_id",
    ]:
        if name in _indexes("segment_export_jobs"):
            op.drop_index(name, table_name="segment_export_jobs")
    op.drop_table("segment_export_jobs")
