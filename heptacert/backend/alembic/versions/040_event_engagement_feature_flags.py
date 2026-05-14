"""Add raffle and gamification feature flags to events.

Revision ID: 040_engage_flags
Revises: 039_event_tickets
Create Date: 2026-05-14
"""

from alembic import op
import sqlalchemy as sa


revision = "040_engage_flags"
down_revision = "039_event_tickets"
branch_labels = None
depends_on = None


def _has_column(inspector, table_name: str, column_name: str) -> bool:
    return any(column["name"] == column_name for column in inspector.get_columns(table_name))


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if not _has_column(inspector, "events", "raffles_enabled"):
        op.add_column(
            "events",
            sa.Column("raffles_enabled", sa.Boolean(), nullable=False, server_default=sa.false()),
        )

    if not _has_column(inspector, "events", "gamification_enabled"):
        op.add_column(
            "events",
            sa.Column("gamification_enabled", sa.Boolean(), nullable=False, server_default=sa.false()),
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if _has_column(inspector, "events", "gamification_enabled"):
        op.drop_column("events", "gamification_enabled")

    if _has_column(inspector, "events", "raffles_enabled"):
        op.drop_column("events", "raffles_enabled")
