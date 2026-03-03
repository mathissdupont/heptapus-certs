"""Add SMTP credential columns to user_email_configs table.

Revision ID: 010smtpcreds
Revises: 009emailcomplete
Create Date: 2026-03-02
"""
from __future__ import annotations
from alembic import op
import sqlalchemy as sa

revision: str = "010smtpcreds"
down_revision = "009emailcomplete"
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = inspector.get_table_names()

    if "user_email_configs" in existing_tables:
        columns = [col["name"] for col in inspector.get_columns("user_email_configs")]
        if "smtp_host" not in columns:
            op.add_column("user_email_configs", sa.Column("smtp_host", sa.String(255), nullable=True))
        if "smtp_port" not in columns:
            op.add_column("user_email_configs", sa.Column("smtp_port", sa.Integer, nullable=True))
        if "smtp_user" not in columns:
            op.add_column("user_email_configs", sa.Column("smtp_user", sa.String(255), nullable=True))
        if "smtp_password" not in columns:
            op.add_column("user_email_configs", sa.Column("smtp_password", sa.String(512), nullable=True))


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = inspector.get_table_names()

    if "user_email_configs" in existing_tables:
        columns = [col["name"] for col in inspector.get_columns("user_email_configs")]
        if "smtp_password" in columns:
            op.drop_column("user_email_configs", "smtp_password")
        if "smtp_user" in columns:
            op.drop_column("user_email_configs", "smtp_user")
        if "smtp_port" in columns:
            op.drop_column("user_email_configs", "smtp_port")
        if "smtp_host" in columns:
            op.drop_column("user_email_configs", "smtp_host")
