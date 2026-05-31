"""Add check-in activity logs.

Revision ID: 054_checkin_activity_logs
Revises: 053_product_config_tables
Create Date: 2026-05-31
"""

from alembic import op
import sqlalchemy as sa


revision = "054_checkin_activity_logs"
down_revision = "053_product_config_tables"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "checkin_activity_logs",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("event_id", sa.Integer(), sa.ForeignKey("events.id", ondelete="CASCADE"), nullable=False),
        sa.Column("session_id", sa.Integer(), sa.ForeignKey("event_sessions.id", ondelete="SET NULL"), nullable=True),
        sa.Column("attendee_id", sa.Integer(), sa.ForeignKey("attendees.id", ondelete="SET NULL"), nullable=True),
        sa.Column("ticket_id", sa.Integer(), sa.ForeignKey("event_tickets.id", ondelete="SET NULL"), nullable=True),
        sa.Column("actor_user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("method", sa.String(length=32), nullable=False, server_default="manual"),
        sa.Column("source", sa.String(length=32), nullable=False, server_default="admin"),
        sa.Column("success", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("message", sa.String(length=500), nullable=True),
        sa.Column("ip_address", sa.String(length=45), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    for column in ["event_id", "session_id", "attendee_id", "ticket_id", "actor_user_id", "method", "source", "success", "created_at"]:
        op.create_index(f"ix_checkin_activity_logs_{column}", "checkin_activity_logs", [column])
    op.create_index("ix_checkin_activity_event_created", "checkin_activity_logs", ["event_id", "created_at"])
    op.create_index("ix_checkin_activity_event_actor", "checkin_activity_logs", ["event_id", "actor_user_id"])


def downgrade() -> None:
    op.drop_index("ix_checkin_activity_event_actor", table_name="checkin_activity_logs")
    op.drop_index("ix_checkin_activity_event_created", table_name="checkin_activity_logs")
    for column in reversed(["event_id", "session_id", "attendee_id", "ticket_id", "actor_user_id", "method", "source", "success", "created_at"]):
        op.drop_index(f"ix_checkin_activity_logs_{column}", table_name="checkin_activity_logs")
    op.drop_table("checkin_activity_logs")
