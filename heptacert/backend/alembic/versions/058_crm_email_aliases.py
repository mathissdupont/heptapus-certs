"""Add CRM email aliases for duplicate merge flow.

Revision ID: 058_crm_email_aliases
Revises: 057_crm_saved_views
Create Date: 2026-06-01
"""

from alembic import op
import sqlalchemy as sa


revision = "058_crm_email_aliases"
down_revision = "057_crm_saved_views"
branch_labels = None
depends_on = None


def _tables() -> set[str]:
    return set(sa.inspect(op.get_bind()).get_table_names())


def _indexes(table_name: str) -> set[str]:
    return {item["name"] for item in sa.inspect(op.get_bind()).get_indexes(table_name)}


def _create_index(name: str, table_name: str, columns: list[str], tables: set[str]) -> None:
    if table_name in tables and name not in _indexes(table_name):
        op.create_index(name, table_name, columns)


def upgrade() -> None:
    tables = _tables()
    if "participant_crm_email_aliases" not in tables:
        op.create_table(
            "participant_crm_email_aliases",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False),
            sa.Column("source_email", sa.String(length=320), nullable=False),
            sa.Column("target_email", sa.String(length=320), nullable=False),
            sa.Column("created_by", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.UniqueConstraint("organization_id", "source_email", name="uq_participant_crm_alias_org_source"),
        )
        tables.add("participant_crm_email_aliases")
    for name, columns in [
        ("ix_participant_crm_email_aliases_organization_id", ["organization_id"]),
        ("ix_participant_crm_email_aliases_source_email", ["source_email"]),
        ("ix_participant_crm_email_aliases_target_email", ["target_email"]),
        ("ix_participant_crm_alias_org_target", ["organization_id", "target_email"]),
    ]:
        _create_index(name, "participant_crm_email_aliases", columns, tables)


def downgrade() -> None:
    tables = _tables()
    if "participant_crm_email_aliases" not in tables:
        return
    for name in [
        "ix_participant_crm_alias_org_target",
        "ix_participant_crm_email_aliases_target_email",
        "ix_participant_crm_email_aliases_source_email",
        "ix_participant_crm_email_aliases_organization_id",
    ]:
        if name in _indexes("participant_crm_email_aliases"):
            op.drop_index(name, table_name="participant_crm_email_aliases")
    op.drop_table("participant_crm_email_aliases")
