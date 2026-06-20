"""Add presentation conversion fields.

Revision ID: 101_presentation_conversion_fields
Revises: 100_presentation_event_files
Create Date: 2026-06-20
"""

from alembic import op
import sqlalchemy as sa


revision = "101_presentation_conversion_fields"
down_revision = "100_presentation_event_files"
branch_labels = None
depends_on = None


def _columns(table_name: str) -> set[str]:
    inspector = sa.inspect(op.get_bind())
    return {column["name"] for column in inspector.get_columns(table_name)}


def _indexes(table_name: str) -> set[str]:
    inspector = sa.inspect(op.get_bind())
    return {index["name"] for index in inspector.get_indexes(table_name)}


def upgrade() -> None:
    columns = _columns("presentation_decks")
    if "converted_file_path" not in columns:
        op.add_column("presentation_decks", sa.Column("converted_file_path", sa.Text(), nullable=True))
    if "converted_file_filename" not in columns:
        op.add_column("presentation_decks", sa.Column("converted_file_filename", sa.String(255), nullable=True))
    if "conversion_status" not in columns:
        op.add_column(
            "presentation_decks",
            sa.Column("conversion_status", sa.String(24), nullable=False, server_default="not_required"),
        )
    if "conversion_error" not in columns:
        op.add_column("presentation_decks", sa.Column("conversion_error", sa.Text(), nullable=True))
    if "conversion_attempts" not in columns:
        op.add_column("presentation_decks", sa.Column("conversion_attempts", sa.Integer(), nullable=False, server_default="0"))

    indexes = _indexes("presentation_decks")
    if "ix_presentation_decks_conversion_status" not in indexes:
        op.create_index("ix_presentation_decks_conversion_status", "presentation_decks", ["conversion_status"])


def downgrade() -> None:
    indexes = _indexes("presentation_decks")
    if "ix_presentation_decks_conversion_status" in indexes:
        op.drop_index("ix_presentation_decks_conversion_status", table_name="presentation_decks")

    columns = _columns("presentation_decks")
    for name in ("conversion_attempts", "conversion_error", "conversion_status", "converted_file_filename", "converted_file_path"):
        if name in columns:
            op.drop_column("presentation_decks", name)
