"""Add click tracking to email delivery logs.

Adds clicked_at column so we can record when a recipient clicked
a tracked link in a bulk email.

Revision ID: 071_email_click_tracking
Revises: 070_performance_indexes
Create Date: 2026-06-04
"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = "071_email_click_tracking"
down_revision: Union[str, None] = "070_performance_indexes"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("email_delivery_logs", sa.Column("clicked_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("email_delivery_logs", sa.Column("click_count", sa.Integer(), server_default="0", nullable=False))
    op.add_column("email_delivery_logs", sa.Column("open_count", sa.Integer(), server_default="0", nullable=False))


def downgrade() -> None:
    op.drop_column("email_delivery_logs", "open_count")
    op.drop_column("email_delivery_logs", "click_count")
    op.drop_column("email_delivery_logs", "clicked_at")
