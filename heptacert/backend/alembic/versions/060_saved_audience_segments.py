"""Add saved audience segments.

Revision ID: 060_saved_audience_segments
Revises: 059_automation_execution_logs
Create Date: 2026-06-01
"""

from alembic import op
import sqlalchemy as sa


revision = "060_saved_audience_segments"
down_revision = "059_automation_execution_logs"
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
    if "event_saved_audience_segments" not in tables:
        op.create_table(
            "event_saved_audience_segments",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("event_id", sa.Integer(), sa.ForeignKey("events.id", ondelete="CASCADE"), nullable=False),
            sa.Column("created_by", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
            sa.Column("name", sa.String(length=120), nullable=False),
            sa.Column("segment_key", sa.String(length=64), nullable=False),
            sa.Column("filters", sa.JSON(), nullable=False, server_default=sa.text("'{}'")),
            sa.Column("visibility", sa.String(length=24), nullable=False, server_default="private"),
            sa.Column("last_count", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("last_computed_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        )
        tables.add("event_saved_audience_segments")

    for name, columns in [
        ("ix_event_saved_audience_segments_event_id", ["event_id"]),
        ("ix_event_saved_audience_segments_created_by", ["created_by"]),
        ("ix_event_saved_audience_segments_segment_key", ["segment_key"]),
        ("ix_event_saved_segments_event_visibility", ["event_id", "visibility"]),
    ]:
        _create_index(name, "event_saved_audience_segments", columns, tables)


def downgrade() -> None:
    tables = _tables()
    if "event_saved_audience_segments" not in tables:
        return
    for name in [
        "ix_event_saved_segments_event_visibility",
        "ix_event_saved_audience_segments_segment_key",
        "ix_event_saved_audience_segments_created_by",
        "ix_event_saved_audience_segments_event_id",
    ]:
        if name in _indexes("event_saved_audience_segments"):
            op.drop_index(name, table_name="event_saved_audience_segments")
    op.drop_table("event_saved_audience_segments")
