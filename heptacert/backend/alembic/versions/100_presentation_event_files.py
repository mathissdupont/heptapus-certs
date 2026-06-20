"""Add event presentation file fields.

Revision ID: 100_presentation_event_files
Revises: 099_presentation_decks
Create Date: 2026-06-20
"""

from alembic import op
import sqlalchemy as sa


revision = "100_presentation_event_files"
down_revision = "099_presentation_decks"
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
    if "event_id" not in columns:
        op.add_column("presentation_decks", sa.Column("event_id", sa.Integer(), nullable=True))
        op.create_foreign_key(
            "fk_presentation_decks_event_id_events",
            "presentation_decks",
            "events",
            ["event_id"],
            ["id"],
            ondelete="CASCADE",
        )
    if "file_path" not in columns:
        op.add_column("presentation_decks", sa.Column("file_path", sa.Text(), nullable=True))
    if "file_filename" not in columns:
        op.add_column("presentation_decks", sa.Column("file_filename", sa.String(255), nullable=True))
    if "file_content_type" not in columns:
        op.add_column("presentation_decks", sa.Column("file_content_type", sa.String(160), nullable=True))
    if "file_size" not in columns:
        op.add_column("presentation_decks", sa.Column("file_size", sa.Integer(), nullable=True))

    indexes = _indexes("presentation_decks")
    if "ix_presentation_decks_event_id" not in indexes:
        op.create_index("ix_presentation_decks_event_id", "presentation_decks", ["event_id"])
    if "ix_presentation_decks_event_updated" not in indexes:
        op.create_index("ix_presentation_decks_event_updated", "presentation_decks", ["event_id", "updated_at"])


def downgrade() -> None:
    indexes = _indexes("presentation_decks")
    if "ix_presentation_decks_event_updated" in indexes:
        op.drop_index("ix_presentation_decks_event_updated", table_name="presentation_decks")
    if "ix_presentation_decks_event_id" in indexes:
        op.drop_index("ix_presentation_decks_event_id", table_name="presentation_decks")

    columns = _columns("presentation_decks")
    for name in ("file_size", "file_content_type", "file_filename", "file_path", "event_id"):
        if name in columns:
            op.drop_column("presentation_decks", name)
