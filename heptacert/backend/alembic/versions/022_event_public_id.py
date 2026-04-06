"""Add public_id to events for non-sequential public URLs.

Revision ID: 022_event_public_id
Revises: 021_member_social
Create Date: 2026-04-06
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "022_event_public_id"
down_revision = "021_member_social"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("events", sa.Column("public_id", sa.String(length=64), nullable=True))
    op.create_index("ix_events_public_id", "events", ["public_id"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_events_public_id", table_name="events")
    op.drop_column("events", "public_id")
