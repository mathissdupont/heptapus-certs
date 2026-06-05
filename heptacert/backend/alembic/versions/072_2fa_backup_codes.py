"""Add 2FA backup codes table.

Revision ID: 072_2fa_backup_codes
Revises: 071_email_click_tracking
Create Date: 2026-06-05
"""

from alembic import op
import sqlalchemy as sa

revision = "072_2fa_backup_codes"
down_revision = "071_email_click_tracking"
branch_labels = None
depends_on = None


def _tables() -> set[str]:
    return set(sa.inspect(op.get_bind()).get_table_names())


def _indexes(table_name: str) -> set[str]:
    return {item["name"] for item in sa.inspect(op.get_bind()).get_indexes(table_name)}


def upgrade() -> None:
    tables = _tables()
    if "totp_backup_codes" not in tables:
        op.create_table(
            "totp_backup_codes",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
            sa.Column("code_hash", sa.String(length=64), nullable=False),
            sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        )
        op.create_index("ix_totp_backup_codes_user_id", "totp_backup_codes", ["user_id"])


def downgrade() -> None:
    tables = _tables()
    if "totp_backup_codes" in tables:
        if "ix_totp_backup_codes_user_id" in _indexes("totp_backup_codes"):
            op.drop_index("ix_totp_backup_codes_user_id", table_name="totp_backup_codes")
        op.drop_table("totp_backup_codes")
