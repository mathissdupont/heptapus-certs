"""Add system digest email config and opt-in flag.

Revision ID: 043_system_digest_emails
Revises: 042_ms365_excel
Create Date: 2026-05-15
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "043_system_digest_emails"
down_revision = "042_ms365_excel"
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = inspector.get_table_names()

    if "public_members" in existing_tables:
        columns = [col["name"] for col in inspector.get_columns("public_members")]
        if "digest_opt_in" not in columns:
            op.add_column(
                "public_members",
                sa.Column("digest_opt_in", sa.Boolean(), nullable=False, server_default=sa.true()),
            )
            op.create_index("ix_public_members_digest_opt_in", "public_members", ["digest_opt_in"])

    if "superadmin_bulk_email_jobs" in existing_tables:
        columns = [col["name"] for col in inspector.get_columns("superadmin_bulk_email_jobs")]
        if "job_kind" not in columns:
            op.add_column(
                "superadmin_bulk_email_jobs",
                sa.Column("job_kind", sa.String(length=32), nullable=False, server_default="manual"),
            )
            op.create_index("ix_superadmin_bulk_email_jobs_job_kind", "superadmin_bulk_email_jobs", ["job_kind"])

    if "system_email_digest_configs" not in existing_tables:
        op.create_table(
            "system_email_digest_configs",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column("frequency", sa.String(length=16), nullable=False, server_default="weekly"),
            sa.Column("send_weekday", sa.Integer(), nullable=False, server_default="1"),
            sa.Column("send_hour", sa.Integer(), nullable=False, server_default="8"),
            sa.Column("max_events", sa.Integer(), nullable=False, server_default="3"),
            sa.Column("max_posts", sa.Integer(), nullable=False, server_default="3"),
            sa.Column("last_sent_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("updated_by", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = inspector.get_table_names()

    if "system_email_digest_configs" in existing_tables:
        op.drop_table("system_email_digest_configs")

    if "superadmin_bulk_email_jobs" in existing_tables:
        columns = [col["name"] for col in inspector.get_columns("superadmin_bulk_email_jobs")]
        if "job_kind" in columns:
            op.drop_index("ix_superadmin_bulk_email_jobs_job_kind", table_name="superadmin_bulk_email_jobs")
            op.drop_column("superadmin_bulk_email_jobs", "job_kind")

    if "public_members" in existing_tables:
        columns = [col["name"] for col in inspector.get_columns("public_members")]
        if "digest_opt_in" in columns:
            op.drop_index("ix_public_members_digest_opt_in", table_name="public_members")
            op.drop_column("public_members", "digest_opt_in")