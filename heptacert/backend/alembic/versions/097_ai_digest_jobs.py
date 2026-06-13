"""Add ai_digest_jobs table for weekly AI digest scheduling and delivery tracking.

Revision ID: 097_ai_digest_jobs
Revises: 096_oauth_server
Create Date: 2026-06-14
"""

from alembic import op
import sqlalchemy as sa

revision = "097_ai_digest_jobs"
down_revision = "096_oauth_server"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "ai_digest_jobs",
        sa.Column("id", sa.Integer(), autoincrement=True, primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("week_start", sa.Date(), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("digest_html", sa.Text(), nullable=True),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("error", sa.String(500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_ai_digest_jobs_user_week", "ai_digest_jobs", ["user_id", "week_start"], unique=True)
    op.create_index("ix_ai_digest_jobs_status", "ai_digest_jobs", ["status"])


def downgrade() -> None:
    op.drop_index("ix_ai_digest_jobs_status")
    op.drop_index("ix_ai_digest_jobs_user_week")
    op.drop_table("ai_digest_jobs")
