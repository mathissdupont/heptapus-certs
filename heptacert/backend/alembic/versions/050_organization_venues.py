"""Add organization venues.

Revision ID: 050_organization_venues
Revises: 049_drop_pub_member_subs
Create Date: 2026-05-26
"""

from alembic import op
import sqlalchemy as sa


revision = "050_organization_venues"
down_revision = "049_drop_pub_member_subs"
branch_labels = None
depends_on = None


def _table_names() -> set[str]:
    return set(sa.inspect(op.get_bind()).get_table_names())


def upgrade() -> None:
    if "organization_venues" not in _table_names():
        op.create_table(
            "organization_venues",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False),
            sa.Column("name", sa.String(length=150), nullable=False),
            sa.Column("capacity", sa.Integer(), nullable=False),
            sa.Column("location", sa.String(length=300), nullable=True),
            sa.Column("notes", sa.Text(), nullable=True),
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.UniqueConstraint("organization_id", "name", name="uq_organization_venue_name"),
        )
        op.create_index("ix_organization_venues_organization_id", "organization_venues", ["organization_id"])


def downgrade() -> None:
    if "organization_venues" in _table_names():
        op.drop_index("ix_organization_venues_organization_id", table_name="organization_venues")
        op.drop_table("organization_venues")
