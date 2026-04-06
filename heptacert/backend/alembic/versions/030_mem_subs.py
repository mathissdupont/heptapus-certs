"""add public member subscriptions

Revision ID: 030_mem_subs
Revises: 029_glob_feed
Create Date: 2026-04-06
"""

from alembic import op
import sqlalchemy as sa


revision = "030_mem_subs"
down_revision = "029_glob_feed"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())

    if "public_member_subscriptions" not in tables:
        op.create_table(
            "public_member_subscriptions",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("public_member_id", sa.Integer(), sa.ForeignKey("public_members.id", ondelete="CASCADE"), nullable=False),
            sa.Column("plan_id", sa.String(length=64), nullable=False),
            sa.Column("started_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
            sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        )
        op.create_index("ix_public_member_sub_member", "public_member_subscriptions", ["public_member_id"])


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())
    if "public_member_subscriptions" in tables:
        op.drop_index("ix_public_member_sub_member", table_name="public_member_subscriptions")
        op.drop_table("public_member_subscriptions")
