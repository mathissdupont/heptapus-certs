"""Add sender fields to user_email_configs.

Revision ID: 023usersmtpsender
Revises: 022_event_public_id
Create Date: 2026-04-06
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision: str = "023usersmtpsender"
down_revision = "022_event_public_id"
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = inspector.get_table_names()

    if "user_email_configs" not in existing_tables:
        return

    columns = [col["name"] for col in inspector.get_columns("user_email_configs")]
    if "smtp_use_tls" not in columns:
        op.add_column(
            "user_email_configs",
            sa.Column("smtp_use_tls", sa.Boolean(), nullable=False, server_default=sa.true()),
        )
    if "from_email" not in columns:
        op.add_column(
            "user_email_configs",
            sa.Column("from_email", sa.String(length=255), nullable=True),
        )


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = inspector.get_table_names()

    if "user_email_configs" not in existing_tables:
        return

    columns = [col["name"] for col in inspector.get_columns("user_email_configs")]
    if "from_email" in columns:
        op.drop_column("user_email_configs", "from_email")
    if "smtp_use_tls" in columns:
        op.drop_column("user_email_configs", "smtp_use_tls")
