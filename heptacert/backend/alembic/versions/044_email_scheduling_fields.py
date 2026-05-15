"""Add missing email scheduling fields.

Revision ID: 044_email_scheduling_fields
Revises: 043_system_digest_emails
Create Date: 2026-05-15
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "044_email_scheduling_fields"
down_revision = "043_system_digest_emails"
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = inspector.get_table_names()

    if "attendees" in existing_tables:
        columns = [col["name"] for col in inspector.get_columns("attendees")]
        if "unsubscribed_at" not in columns:
            op.add_column("attendees", sa.Column("unsubscribed_at", sa.DateTime(timezone=True), nullable=True))

    if "bulk_email_jobs" in existing_tables:
        columns = [col["name"] for col in inspector.get_columns("bulk_email_jobs")]
        if "scheduled_at" not in columns:
            op.add_column("bulk_email_jobs", sa.Column("scheduled_at", sa.DateTime(timezone=True), nullable=True))
        if "cron_expression" not in columns:
            op.add_column("bulk_email_jobs", sa.Column("cron_expression", sa.String(length=120), nullable=True))


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = inspector.get_table_names()

    if "bulk_email_jobs" in existing_tables:
        columns = [col["name"] for col in inspector.get_columns("bulk_email_jobs")]
        if "cron_expression" in columns:
            op.drop_column("bulk_email_jobs", "cron_expression")

