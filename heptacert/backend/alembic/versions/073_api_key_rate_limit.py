"""Add rate_limit_per_min to api_keys.

Revision ID: 073_api_key_rate_limit
Revises: 072_2fa_backup_codes
Create Date: 2026-06-05
"""

from alembic import op
import sqlalchemy as sa

revision = "073_api_key_rate_limit"
down_revision = "072_2fa_backup_codes"
branch_labels = None
depends_on = None


def _columns(table_name: str) -> set[str]:
    return {c["name"] for c in sa.inspect(op.get_bind()).get_columns(table_name)}


def upgrade() -> None:
    cols = _columns("api_keys")
    if "rate_limit_per_min" not in cols:
        op.add_column("api_keys", sa.Column("rate_limit_per_min", sa.Integer(), nullable=True))


def downgrade() -> None:
    cols = _columns("api_keys")
    if "rate_limit_per_min" in cols:
        op.drop_column("api_keys", "rate_limit_per_min")
