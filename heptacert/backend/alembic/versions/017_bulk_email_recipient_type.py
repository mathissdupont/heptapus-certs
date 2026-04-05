"""Add recipient_type to bulk email jobs.

Revision ID: 017_bulk_email_recipient_type
Revises: 016_attendee_email_verification
Create Date: 2026-04-05
"""

from alembic import op
import sqlalchemy as sa


revision = "017_bulk_email_recipient_type"
down_revision = "016_attendee_email_verification"
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [col["name"] for col in inspector.get_columns("bulk_email_jobs")]
    if "recipient_type" not in columns:
        op.add_column(
            "bulk_email_jobs",
            sa.Column("recipient_type", sa.String(length=32), nullable=False, server_default="attendees"),
        )
        op.alter_column("bulk_email_jobs", "recipient_type", server_default=None)


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [col["name"] for col in inspector.get_columns("bulk_email_jobs")]
    if "recipient_type" in columns:
        op.drop_column("bulk_email_jobs", "recipient_type")
