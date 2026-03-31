"""add reserve_winner_count to event raffles

Revision ID: 015_add_raffle_reserve_winner_count
Revises: 014_add_organization_allowlist
Create Date: 2026-03-31 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "015_add_raffle_reserve_winner_count"
down_revision = "014_add_organization_allowlist"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())
    if "event_raffles" not in tables:
        return

    columns = {column["name"] for column in inspector.get_columns("event_raffles")}
    if "reserve_winner_count" in columns:
        return

    op.add_column(
        "event_raffles",
        sa.Column("reserve_winner_count", sa.Integer(), nullable=False, server_default="1"),
    )
    op.alter_column("event_raffles", "reserve_winner_count", server_default=None)


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())
    if "event_raffles" not in tables:
        return

    columns = {column["name"] for column in inspector.get_columns("event_raffles")}
    if "reserve_winner_count" in columns:
        op.drop_column("event_raffles", "reserve_winner_count")
