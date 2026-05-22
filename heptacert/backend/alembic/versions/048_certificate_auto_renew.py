"""Add certificate auto renew flag.

Revision ID: 048_certificate_auto_renew
Revises: 047_fix_attendance_table_name
Create Date: 2026-05-22
"""

from alembic import op
import sqlalchemy as sa


revision = "048_certificate_auto_renew"
down_revision = "047_fix_attendance_table_name"
branch_labels = None
depends_on = None


def _column_names(table_name: str) -> set[str]:
    inspector = sa.inspect(op.get_bind())
    return {column["name"] for column in inspector.get_columns(table_name)}


def upgrade() -> None:
    if "auto_renew_enabled" not in _column_names("certificates"):
        op.add_column(
            "certificates",
            sa.Column("auto_renew_enabled", sa.Boolean(), nullable=False, server_default=sa.false()),
        )


def downgrade() -> None:
    if "auto_renew_enabled" in _column_names("certificates"):
        op.drop_column("certificates", "auto_renew_enabled")
