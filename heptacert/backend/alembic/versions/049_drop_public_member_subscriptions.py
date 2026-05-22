"""Drop public member subscriptions.

Revision ID: 049_drop_public_member_subscriptions
Revises: 048_certificate_auto_renew
Create Date: 2026-05-22
"""

from alembic import op
import sqlalchemy as sa


revision = "049_drop_public_member_subscriptions"
down_revision = "048_certificate_auto_renew"
branch_labels = None
depends_on = None


def _table_names() -> set[str]:
    return set(sa.inspect(op.get_bind()).get_table_names())


def upgrade() -> None:
    if "public_member_subscriptions" in _table_names():
        op.drop_table("public_member_subscriptions")


def downgrade() -> None:
    if "public_member_subscriptions" not in _table_names():
        op.create_table(
            "public_member_subscriptions",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("public_member_id", sa.Integer(), sa.ForeignKey("public_members.id", ondelete="CASCADE"), nullable=False),
            sa.Column("plan_id", sa.String(length=64), nullable=False),
            sa.Column("started_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        )
        op.create_index("ix_public_member_sub_member", "public_member_subscriptions", ["public_member_id"])
