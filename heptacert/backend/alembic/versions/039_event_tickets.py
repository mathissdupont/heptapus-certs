"""Add event tickets for ticket/pass enabled events.

Revision ID: 039_event_tickets
Revises: 038_event_feature_flags
Create Date: 2026-05-06
"""

from alembic import op
import sqlalchemy as sa


revision = "039_event_tickets"
down_revision = "038_event_feature_flags"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "event_tickets",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("event_id", sa.Integer(), sa.ForeignKey("events.id", ondelete="CASCADE"), nullable=False),
        sa.Column("attendee_id", sa.Integer(), sa.ForeignKey("attendees.id", ondelete="CASCADE"), nullable=False),
        sa.Column("token", sa.String(length=96), nullable=False),
        sa.Column("qr_payload", sa.Text(), nullable=False),
        sa.Column("status", sa.String(length=24), nullable=False, server_default="issued"),
        sa.Column("issued_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("checked_in_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("event_id", "attendee_id", name="uq_event_ticket_event_attendee"),
        sa.UniqueConstraint("token", name="uq_event_tickets_token"),
    )
    op.create_index("ix_event_tickets_event_id", "event_tickets", ["event_id"])
    op.create_index("ix_event_tickets_attendee_id", "event_tickets", ["attendee_id"])
    op.create_index("ix_event_tickets_token", "event_tickets", ["token"])
    op.create_index("ix_event_tickets_status", "event_tickets", ["status"])
    op.create_index("ix_event_tickets_event_status", "event_tickets", ["event_id", "status"])


def downgrade() -> None:
    op.drop_index("ix_event_tickets_event_status", table_name="event_tickets")
    op.drop_index("ix_event_tickets_status", table_name="event_tickets")
    op.drop_index("ix_event_tickets_token", table_name="event_tickets")
    op.drop_index("ix_event_tickets_attendee_id", table_name="event_tickets")
    op.drop_index("ix_event_tickets_event_id", table_name="event_tickets")
    op.drop_table("event_tickets")
