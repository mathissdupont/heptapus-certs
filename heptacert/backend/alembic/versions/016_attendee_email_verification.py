"""Add attendee email verification fields.

Revision ID: 016_attendee_email_verification
Revises: 015_add_raffle_reserve_winner_count
Create Date: 2026-04-04
"""

from alembic import op
import sqlalchemy as sa


revision = "016_attendee_email_verification"
down_revision = "015_add_raffle_reserve_winner_count"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("attendees", sa.Column("email_verified", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("attendees", sa.Column("email_verification_token", sa.String(length=512), nullable=True))
    op.add_column("attendees", sa.Column("email_verified_at", sa.DateTime(timezone=True), nullable=True))

    op.execute("UPDATE attendees SET email_verified = TRUE, email_verified_at = NOW() WHERE email_verified = FALSE")
    op.alter_column("attendees", "email_verified", server_default=None)


def downgrade() -> None:
    op.drop_column("attendees", "email_verified_at")
    op.drop_column("attendees", "email_verification_token")
    op.drop_column("attendees", "email_verified")
