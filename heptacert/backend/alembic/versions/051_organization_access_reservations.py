"""Add organization members and venue reservations.

Revision ID: 051_org_access_reservations
Revises: 050_organization_venues
Create Date: 2026-05-26
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB


revision = "051_org_access_reservations"
down_revision = "050_organization_venues"
branch_labels = None
depends_on = None


def _table_names() -> set[str]:
    return set(sa.inspect(op.get_bind()).get_table_names())


def upgrade() -> None:
    json_type = sa.JSON().with_variant(JSONB(), "postgresql")
    tables = _table_names()
    if "organization_members" not in tables:
        op.create_table(
            "organization_members",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False),
            sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
            sa.Column("email", sa.String(length=320), nullable=False),
            sa.Column("role", sa.String(length=32), nullable=False, server_default="viewer"),
            sa.Column("permissions", json_type, nullable=True),
            sa.Column("status", sa.String(length=24), nullable=False, server_default="active"),
            sa.Column("invited_by", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.UniqueConstraint("organization_id", "email", name="uq_organization_member_email"),
        )
        op.create_index("ix_organization_members_organization_id", "organization_members", ["organization_id"])
        op.create_index("ix_organization_members_user_id", "organization_members", ["user_id"])

    if "venue_reservations" not in tables:
        op.create_table(
            "venue_reservations",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False),
            sa.Column("venue_id", sa.Integer(), sa.ForeignKey("organization_venues.id", ondelete="CASCADE"), nullable=False),
            sa.Column("title", sa.String(length=200), nullable=False),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("start_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("end_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("status", sa.String(length=20), nullable=False, server_default="confirmed"),
            sa.Column("calendar_provider", sa.String(length=32), nullable=False, server_default="local"),
            sa.Column("external_event_id", sa.String(length=255), nullable=True),
            sa.Column("created_by", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
            sa.Column("updated_by", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        )
        op.create_index("ix_venue_reservations_organization_id", "venue_reservations", ["organization_id"])
        op.create_index("ix_venue_reservations_venue_id", "venue_reservations", ["venue_id"])
        op.create_index("ix_venue_reservations_start_at", "venue_reservations", ["start_at"])
        op.create_index("ix_venue_reservations_end_at", "venue_reservations", ["end_at"])
        op.create_index("ix_venue_reservations_status", "venue_reservations", ["status"])


def downgrade() -> None:
    tables = _table_names()
    if "venue_reservations" in tables:
        op.drop_table("venue_reservations")
    if "organization_members" in tables:
        op.drop_table("organization_members")
