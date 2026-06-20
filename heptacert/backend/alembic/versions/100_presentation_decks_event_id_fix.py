"""Ensure presentation decks event linkage exists.

Revision ID: 100_presentation_decks_event_id_fix
Revises: 099_presentation_decks
Create Date: 2026-06-20
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

revision = "100_presentation_decks_event_id_fix"
down_revision = "099_presentation_decks"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)

    columns = {column["name"] for column in inspector.get_columns("presentation_decks")}
    foreign_keys = {
        foreign_key["constrained_columns"][0]
        for foreign_key in inspector.get_foreign_keys("presentation_decks")
        if foreign_key.get("constrained_columns")
    }
    indexes = {index["name"] for index in inspector.get_indexes("presentation_decks")}

    if "event_id" not in columns:
        op.add_column("presentation_decks", sa.Column("event_id", sa.Integer(), nullable=True))

    if "event_id" not in foreign_keys:
        op.create_foreign_key(
            "fk_presentation_decks_event_id_events",
            "presentation_decks",
            "events",
            ["event_id"],
            ["id"],
            ondelete="CASCADE",
        )

    if "ix_presentation_decks_event_id" not in indexes:
        op.create_index("ix_presentation_decks_event_id", "presentation_decks", ["event_id"])

    if "ix_presentation_decks_event_updated" not in indexes:
        op.create_index("ix_presentation_decks_event_updated", "presentation_decks", ["event_id", "updated_at"])


def downgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)

    indexes = {index["name"] for index in inspector.get_indexes("presentation_decks")}
    foreign_keys = inspector.get_foreign_keys("presentation_decks")
    columns = {column["name"] for column in inspector.get_columns("presentation_decks")}

    if "ix_presentation_decks_event_updated" in indexes:
        op.drop_index("ix_presentation_decks_event_updated", table_name="presentation_decks")

    if "ix_presentation_decks_event_id" in indexes:
        op.drop_index("ix_presentation_decks_event_id", table_name="presentation_decks")

    if any(foreign_key.get("constrained_columns") == ["event_id"] for foreign_key in foreign_keys):
        constraint_name = next(
            (foreign_key["name"] for foreign_key in foreign_keys if foreign_key.get("constrained_columns") == ["event_id"]),
            None,
        )
        if constraint_name:
            op.drop_constraint(constraint_name, "presentation_decks", type_="foreignkey")

    if "event_id" in columns:
        op.drop_column("presentation_decks", "event_id")