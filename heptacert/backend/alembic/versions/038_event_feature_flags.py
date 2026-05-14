"""Add event feature flags.

Revision ID: 038_event_feature_flags
Revises: 037_reg_option_capacities
Create Date: 2026-05-06
"""

from alembic import op
import sqlalchemy as sa


revision = "038_event_feature_flags"
down_revision = "037_reg_option_capacities"
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    event_columns = {column["name"] for column in inspector.get_columns("events")}

    if "event_type" not in event_columns:
        op.add_column("events", sa.Column("event_type", sa.String(length=64), nullable=False, server_default="certificate_event"))
    if "certificate_enabled" not in event_columns:
        op.add_column("events", sa.Column("certificate_enabled", sa.Boolean(), nullable=False, server_default=sa.true()))
    if "checkin_enabled" not in event_columns:
        op.add_column("events", sa.Column("checkin_enabled", sa.Boolean(), nullable=False, server_default=sa.true()))
    if "ticketing_enabled" not in event_columns:
        op.add_column("events", sa.Column("ticketing_enabled", sa.Boolean(), nullable=False, server_default=sa.false()))
    if "registration_enabled" not in event_columns:
        op.add_column("events", sa.Column("registration_enabled", sa.Boolean(), nullable=False, server_default=sa.true()))
    if "requires_approval" not in event_columns:
        op.add_column("events", sa.Column("requires_approval", sa.Boolean(), nullable=False, server_default=sa.false()))


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    event_columns = {column["name"] for column in inspector.get_columns("events")}

    for column_name in (
        "requires_approval",
        "registration_enabled",
        "ticketing_enabled",
        "checkin_enabled",
        "certificate_enabled",
        "event_type",
    ):
        if column_name in event_columns:
            op.drop_column("events", column_name)
