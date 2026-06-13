"""Add event_ticket_types table for named/priced ticket tiers.

Revision ID: 098_event_ticket_types
Revises: 097_ai_digest_jobs
Create Date: 2026-06-14
"""

from alembic import op
import sqlalchemy as sa

revision = "098_event_ticket_types"
down_revision = "097_ai_digest_jobs"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "event_ticket_types",
        sa.Column("id", sa.Integer(), autoincrement=True, primary_key=True),
        sa.Column("event_id", sa.Integer(), sa.ForeignKey("events.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("price", sa.Numeric(10, 2), nullable=False, server_default="0"),
        sa.Column("currency", sa.String(3), nullable=False, server_default="TRY"),
        sa.Column("capacity", sa.Integer(), nullable=True),
        sa.Column("sold_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
    )
    op.create_index("ix_event_ticket_types_event_id", "event_ticket_types", ["event_id"])


def downgrade() -> None:
    op.drop_index("ix_event_ticket_types_event_id")
    op.drop_table("event_ticket_types")
