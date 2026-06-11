"""Add agent_action_logs table for MCP agent audit trail.

Revision ID: 095_agent_action_logs
Revises: 094_event_quiz_cpd_toggles
Create Date: 2026-06-11
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision = "095_agent_action_logs"
down_revision = "094_event_quiz_cpd_toggles"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "agent_action_logs",
        sa.Column("id", sa.BigInteger(), autoincrement=True, primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("api_key_prefix", sa.String(12), nullable=True),
        sa.Column("tool_name", sa.String(100), nullable=False),
        sa.Column("event_id", sa.Integer(), nullable=True, index=True),
        sa.Column("payload", JSONB, nullable=True),
        sa.Column("result_summary", sa.String(500), nullable=True),
        sa.Column("ip_address", sa.String(64), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_agent_action_logs_user_created", "agent_action_logs", ["user_id", "created_at"])
    op.create_index("ix_agent_action_logs_tool", "agent_action_logs", ["tool_name"])


def downgrade() -> None:
    op.drop_index("ix_agent_action_logs_tool")
    op.drop_index("ix_agent_action_logs_user_created")
    op.drop_table("agent_action_logs")
