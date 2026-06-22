"""Add presentation security controls.

Revision ID: 103_presentation_security_controls
Revises: 102_presentation_speaker_notes
Create Date: 2026-06-22
"""

from alembic import op
import sqlalchemy as sa


revision = "103_presentation_security_controls"
down_revision = "102_presentation_speaker_notes"
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
    if "control_token" not in columns:
        op.add_column("presentation_decks", sa.Column("control_token", sa.String(length=96), nullable=True))
    if "audience_token" not in columns:
        op.add_column("presentation_decks", sa.Column("audience_token", sa.String(length=96), nullable=True))
    if "audience_enabled" not in columns:
        op.add_column(
            "presentation_decks",
            sa.Column("audience_enabled", sa.Boolean(), nullable=False, server_default=sa.false()),
        )
    if "allow_download" not in columns:
        op.add_column(
            "presentation_decks",
            sa.Column("allow_download", sa.Boolean(), nullable=False, server_default=sa.false()),
        )
    if "watermark_enabled" not in columns:
        op.add_column(
            "presentation_decks",
            sa.Column("watermark_enabled", sa.Boolean(), nullable=False, server_default=sa.false()),
        )
    if "audience_expires_at" not in columns:
        op.add_column("presentation_decks", sa.Column("audience_expires_at", sa.DateTime(timezone=True), nullable=True))

    indexes = _indexes("presentation_decks")
    if "ix_presentation_decks_control_token" not in indexes:
        op.create_index("ix_presentation_decks_control_token", "presentation_decks", ["control_token"], unique=True)
    if "ix_presentation_decks_audience_token" not in indexes:
        op.create_index("ix_presentation_decks_audience_token", "presentation_decks", ["audience_token"], unique=True)
    if "ix_presentation_decks_audience_enabled" not in indexes:
        op.create_index("ix_presentation_decks_audience_enabled", "presentation_decks", ["audience_enabled"])


def downgrade() -> None:
    indexes = _indexes("presentation_decks")
    if "ix_presentation_decks_audience_enabled" in indexes:
        op.drop_index("ix_presentation_decks_audience_enabled", table_name="presentation_decks")
    if "ix_presentation_decks_audience_token" in indexes:
        op.drop_index("ix_presentation_decks_audience_token", table_name="presentation_decks")
    if "ix_presentation_decks_control_token" in indexes:
        op.drop_index("ix_presentation_decks_control_token", table_name="presentation_decks")

    columns = _columns("presentation_decks")
    for column_name in (
        "audience_expires_at",
        "watermark_enabled",
        "allow_download",
        "audience_enabled",
        "audience_token",
        "control_token",
    ):
        if column_name in columns:
            op.drop_column("presentation_decks", column_name)
