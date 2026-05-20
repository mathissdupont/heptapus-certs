"""Add event team members.

Revision ID: 045_event_team_members
Revises: 044_email_scheduling_fields
Create Date: 2026-05-19
"""

from alembic import op
import sqlalchemy as sa


revision = "045_event_team_members"
down_revision = "044_email_scheduling_fields"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = inspector.get_table_names()

    if "event_team_members" not in existing_tables:
        op.create_table(
            "event_team_members",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("event_id", sa.Integer(), nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=True),
            sa.Column("email", sa.String(length=320), nullable=False),
            sa.Column("role", sa.String(length=32), nullable=False, server_default="checkin"),
            sa.Column("status", sa.String(length=24), nullable=False, server_default="active"),
            sa.Column("invited_by", sa.Integer(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.ForeignKeyConstraint(["event_id"], ["events.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="SET NULL"),
            sa.ForeignKeyConstraint(["invited_by"], ["users.id"], ondelete="SET NULL"),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("event_id", "email", name="uq_event_team_members_event_email"),
        )
        op.create_index("ix_event_team_members_event_id", "event_team_members", ["event_id"], unique=False)
        op.create_index("ix_event_team_members_user_id", "event_team_members", ["user_id"], unique=False)
        op.create_index("ix_event_team_members_email", "event_team_members", ["email"], unique=False)
        op.create_index("ix_event_team_members_role", "event_team_members", ["role"], unique=False)
        op.create_index("ix_event_team_members_status", "event_team_members", ["status"], unique=False)
        op.create_index("ix_event_team_members_event_status", "event_team_members", ["event_id", "status"], unique=False)


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = inspector.get_table_names()

    if "event_team_members" in existing_tables:
        op.drop_index("ix_event_team_members_event_status", table_name="event_team_members")
        op.drop_index("ix_event_team_members_status", table_name="event_team_members")
        op.drop_index("ix_event_team_members_role", table_name="event_team_members")
        op.drop_index("ix_event_team_members_email", table_name="event_team_members")
        op.drop_index("ix_event_team_members_user_id", table_name="event_team_members")
        op.drop_index("ix_event_team_members_event_id", table_name="event_team_members")
        op.drop_table("event_team_members")
