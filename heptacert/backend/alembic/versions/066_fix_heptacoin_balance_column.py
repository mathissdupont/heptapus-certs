"""Fix legacy heptacoin balance column typo.

Revision ID: 066_fix_heptacoin_balance_column
Revises: 065_system_email_template_presets
Create Date: 2026-06-02
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "066_fix_heptacoin_balance_column"
down_revision: Union[str, None] = "065_system_email_template_presets"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {column["name"] for column in inspector.get_columns("users")}

    if "heptacoin_balaonce" in columns and "heptacoin_balance" not in columns:
        op.alter_column("users", "heptacoin_balaonce", new_column_name="heptacoin_balance")

    columns = {column["name"] for column in sa.inspect(bind).get_columns("users")}
    if "heptacoin_balance" not in columns:
        op.add_column("users", sa.Column("heptacoin_balance", sa.Integer(), nullable=True))
        op.execute("UPDATE users SET heptacoin_balance = 0 WHERE heptacoin_balance IS NULL")
        op.alter_column("users", "heptacoin_balance", nullable=False, server_default="0")


def downgrade() -> None:
    bind = op.get_bind()
    columns = {column["name"] for column in sa.inspect(bind).get_columns("users")}
    if "heptacoin_balance" in columns and "heptacoin_balaonce" not in columns:
        op.alter_column("users", "heptacoin_balance", new_column_name="heptacoin_balaonce")
