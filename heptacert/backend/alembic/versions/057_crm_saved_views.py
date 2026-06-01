"""Add CRM saved views.

Revision ID: 057_crm_saved_views
Revises: 056_crm_enterprise_upgrade
Create Date: 2026-06-01
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB


revision = "057_crm_saved_views"
down_revision = "056_crm_enterprise_upgrade"
branch_labels = None
depends_on = None


def _json_type():
    return sa.JSON().with_variant(JSONB(), "postgresql")


def _tables() -> set[str]:
    return set(sa.inspect(op.get_bind()).get_table_names())


def _indexes(table_name: str) -> set[str]:
    return {item["name"] for item in sa.inspect(op.get_bind()).get_indexes(table_name)}


def _create_index(name: str, table_name: str, columns: list[str], tables: set[str]) -> None:
    if table_name in tables and name not in _indexes(table_name):
        op.create_index(name, table_name, columns)


def upgrade() -> None:
    tables = _tables()
    if "participant_crm_saved_views" not in tables:
        op.create_table(
            "participant_crm_saved_views",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False),
            sa.Column("created_by", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
            sa.Column("name", sa.String(length=120), nullable=False),
            sa.Column("filters", _json_type(), nullable=False, server_default="{}"),
            sa.Column("visibility", sa.String(length=24), nullable=False, server_default="private"),
            sa.Column("last_count", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("last_computed_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        )
        tables.add("participant_crm_saved_views")
    for name, columns in [
        ("ix_participant_crm_saved_views_organization_id", ["organization_id"]),
        ("ix_participant_crm_saved_views_created_by", ["created_by"]),
        ("ix_participant_crm_saved_views_visibility", ["visibility"]),
        ("ix_participant_crm_saved_views_org_visibility", ["organization_id", "visibility"]),
    ]:
        _create_index(name, "participant_crm_saved_views", columns, tables)


def downgrade() -> None:
    tables = _tables()
    if "participant_crm_saved_views" not in tables:
        return
    for name in [
        "ix_participant_crm_saved_views_org_visibility",
        "ix_participant_crm_saved_views_visibility",
        "ix_participant_crm_saved_views_created_by",
        "ix_participant_crm_saved_views_organization_id",
    ]:
        if name in _indexes("participant_crm_saved_views"):
            op.drop_index(name, table_name="participant_crm_saved_views")
    op.drop_table("participant_crm_saved_views")
