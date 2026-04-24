"""Add superadmin bulk email jobs table.

Revision ID: 036_superadmin_bulk_email_jobs
Revises: 035_support_tickets
Create Date: 2026-04-24
"""

from alembic import op
import sqlalchemy as sa


revision = "036_superadmin_bulk_email_jobs"
down_revision = "035_support_tickets"
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = inspector.get_table_names()

    if "superadmin_bulk_email_jobs" not in existing_tables:
        op.create_table(
            "superadmin_bulk_email_jobs",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("created_by", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
            sa.Column("source", sa.String(length=32), nullable=False, server_default="all"),
            sa.Column("subject", sa.String(length=240), nullable=False),
            sa.Column("body_html", sa.Text(), nullable=False),
            sa.Column("total_targets", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("sent_count", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("failed_count", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("status", sa.String(length=32), nullable=False, server_default="pending"),
            sa.Column("cancel_requested", sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column("error_message", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        )
        op.create_index("ix_superadmin_bulk_email_jobs_created_by", "superadmin_bulk_email_jobs", ["created_by"])
        op.create_index("ix_superadmin_bulk_email_jobs_status", "superadmin_bulk_email_jobs", ["status"])
        op.create_index("ix_superadmin_bulk_email_jobs_source", "superadmin_bulk_email_jobs", ["source"])


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = inspector.get_table_names()

    if "superadmin_bulk_email_jobs" in existing_tables:
        op.drop_index("ix_superadmin_bulk_email_jobs_source", table_name="superadmin_bulk_email_jobs")
        op.drop_index("ix_superadmin_bulk_email_jobs_status", table_name="superadmin_bulk_email_jobs")
        op.drop_index("ix_superadmin_bulk_email_jobs_created_by", table_name="superadmin_bulk_email_jobs")
        op.drop_table("superadmin_bulk_email_jobs")
