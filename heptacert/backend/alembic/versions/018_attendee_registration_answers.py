"""Add registration_answers to attendees.

Revision ID: 018_attendee_registration_answers
Revises: 017_bulk_email_recipient_type
Create Date: 2026-04-05
"""

from alembic import op
import sqlalchemy as sa


revision = "018_attendee_registration_answers"
down_revision = "017_bulk_email_recipient_type"
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [col["name"] for col in inspector.get_columns("attendees")]
    if "registration_answers" not in columns:
        op.add_column(
            "attendees",
            sa.Column("registration_answers", sa.JSON(), nullable=True),
        )


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [col["name"] for col in inspector.get_columns("attendees")]
    if "registration_answers" in columns:
        op.drop_column("attendees", "registration_answers")
