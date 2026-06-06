"""Add CRM account/company layer tables.

Revision ID: 076_crm_accounts
Revises: 075_learning_paths
Create Date: 2026-06-06
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision = "076_crm_accounts"
down_revision = "075_learning_paths"
branch_labels = None
depends_on = None


def _tables() -> set[str]:
    return set(sa.inspect(op.get_bind()).get_table_names())


def upgrade() -> None:
    existing = _tables()

    if "crm_accounts" not in existing:
        op.create_table(
            "crm_accounts",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False),
            sa.Column("name", sa.String(300), nullable=False),
            sa.Column("domain", sa.String(253), nullable=True),
            sa.Column("industry", sa.String(100), nullable=True),
            sa.Column("size_bucket", sa.String(50), nullable=True),
            sa.Column("owner_user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
            sa.Column("annual_value", sa.Numeric(14, 2), nullable=True),
            sa.Column("notes", sa.Text(), nullable=False, server_default=""),
            sa.Column("tags", JSONB, nullable=False, server_default="[]"),
            sa.Column("status", sa.String(64), nullable=False, server_default="active"),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        )
        op.create_index("ix_crm_accounts_org_id", "crm_accounts", ["organization_id"])
        op.create_index("ix_crm_accounts_status", "crm_accounts", ["status"])
        op.create_index("ix_crm_accounts_org_status", "crm_accounts", ["organization_id", "status"])

    if "crm_account_contacts" not in existing:
        op.create_table(
            "crm_account_contacts",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("account_id", sa.Integer(), sa.ForeignKey("crm_accounts.id", ondelete="CASCADE"), nullable=False),
            sa.Column("participant_crm_profile_id", sa.Integer(), sa.ForeignKey("participant_crm_profiles.id", ondelete="CASCADE"), nullable=False),
            sa.Column("role", sa.String(100), nullable=True),
            sa.Column("is_primary", sa.Boolean(), nullable=False, server_default="false"),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        )
        op.create_index("ix_crm_account_contacts_account_id", "crm_account_contacts", ["account_id"])
        op.create_index("ix_crm_account_contacts_profile_id", "crm_account_contacts", ["participant_crm_profile_id"])
        op.create_unique_constraint(
            "uq_crm_account_contact",
            "crm_account_contacts",
            ["account_id", "participant_crm_profile_id"],
        )

    if "crm_deals" not in existing:
        op.create_table(
            "crm_deals",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("account_id", sa.Integer(), sa.ForeignKey("crm_accounts.id", ondelete="CASCADE"), nullable=False),
            sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False),
            sa.Column("name", sa.String(300), nullable=False),
            sa.Column("stage", sa.String(64), nullable=False, server_default="lead"),
            sa.Column("amount", sa.Numeric(14, 2), nullable=True),
            sa.Column("expected_close_date", sa.DateTime(timezone=True), nullable=True),
            sa.Column("owner_user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        )
        op.create_index("ix_crm_deals_account_id", "crm_deals", ["account_id"])
        op.create_index("ix_crm_deals_org_id", "crm_deals", ["organization_id"])
        op.create_index("ix_crm_deals_stage", "crm_deals", ["stage"])
        op.create_index("ix_crm_deals_org_stage", "crm_deals", ["organization_id", "stage"])

    if "crm_deal_activities" not in existing:
        op.create_table(
            "crm_deal_activities",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("deal_id", sa.Integer(), sa.ForeignKey("crm_deals.id", ondelete="CASCADE"), nullable=False),
            sa.Column("activity_type", sa.String(50), nullable=False),
            sa.Column("content", sa.Text(), nullable=False, server_default=""),
            sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
            sa.Column("activity_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        )
        op.create_index("ix_crm_deal_activities_deal_id", "crm_deal_activities", ["deal_id"])
        op.create_index("ix_crm_deal_activities_activity_at", "crm_deal_activities", ["activity_at"])


def downgrade() -> None:
    op.drop_table("crm_deal_activities")
    op.drop_table("crm_deals")
    op.drop_table("crm_account_contacts")
    op.drop_table("crm_accounts")
