"""Add marketplace fields to events table.

Revision ID: 079_marketplace_fields
Revises: 078_scheduled_reports
Create Date: 2026-06-06
"""

from alembic import op
import sqlalchemy as sa

revision = "079_marketplace_fields"
down_revision = "078_scheduled_reports"
branch_labels = None
depends_on = None


def _columns() -> set[str]:
    inspector = sa.inspect(op.get_bind())
    return {c["name"] for c in inspector.get_columns("events")}


def upgrade() -> None:
    existing = _columns()

    if "is_marketplace_listed" not in existing:
        op.add_column("events", sa.Column("is_marketplace_listed", sa.Boolean(), nullable=False, server_default="false"))
    if "marketplace_category" not in existing:
        op.add_column("events", sa.Column("marketplace_category", sa.String(100), nullable=True))
    if "marketplace_description" not in existing:
        op.add_column("events", sa.Column("marketplace_description", sa.Text(), nullable=True))
    if "marketplace_price" not in existing:
        op.add_column("events", sa.Column("marketplace_price", sa.Numeric(10, 2), nullable=True))

    try:
        op.create_index("ix_events_marketplace", "events", ["is_marketplace_listed"])
    except Exception:
        pass


def downgrade() -> None:
    op.drop_index("ix_events_marketplace", table_name="events")
    op.drop_column("events", "marketplace_price")
    op.drop_column("events", "marketplace_description")
    op.drop_column("events", "marketplace_category")
    op.drop_column("events", "is_marketplace_listed")
