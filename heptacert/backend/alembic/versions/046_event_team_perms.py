"""Add configurable event team permissions.

Revision ID: 046_event_team_perms
Revises: 045_event_team_members
Create Date: 2026-05-19
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import JSON
from sqlalchemy.dialects.postgresql import JSONB


revision = "046_event_team_perms"
down_revision = "045_event_team_members"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = inspector.get_table_names()
    if "event_team_members" not in existing_tables:
        return

    columns = [column["name"] for column in inspector.get_columns("event_team_members")]
    if "permissions" not in columns:
        op.add_column(
            "event_team_members",
            sa.Column("permissions", JSON().with_variant(JSONB(), "postgresql"), nullable=True),
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = inspector.get_table_names()
    if "event_team_members" not in existing_tables:
        return

    columns = [column["name"] for column in inspector.get_columns("event_team_members")]
    if "permissions" in columns:
        op.drop_column("event_team_members", "permissions")
