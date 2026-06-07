"""Add org_sso_configs table for SSO/OAuth2 configuration per organization.

Revision ID: 088_sso_config
Revises: 087_lti_tools
Create Date: 2026-06-08
"""

from alembic import op
import sqlalchemy as sa

revision = "088_sso_config"
down_revision = "087_lti_tools"
branch_labels = None
depends_on = None


def _tables() -> set[str]:
    return set(sa.inspect(op.get_bind()).get_table_names())


def upgrade() -> None:
    if "org_sso_configs" not in _tables():
        op.create_table(
            "org_sso_configs",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("org_id", sa.Integer(), nullable=False),
            sa.Column("provider", sa.String(50), nullable=False),
            sa.Column("client_id", sa.String(500), nullable=True),
            sa.Column("client_secret", sa.String(500), nullable=True),
            sa.Column("tenant_id", sa.String(200), nullable=True),
            sa.Column("redirect_uri", sa.Text(), nullable=True),
            sa.Column("extra_config_json", sa.Text(), nullable=True),
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default="false"),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.ForeignKeyConstraint(["org_id"], ["organizations.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("org_id", "provider", name="uq_org_sso_provider"),
        )
        op.create_index("ix_org_sso_configs_org_id", "org_sso_configs", ["org_id"])


def downgrade() -> None:
    op.drop_index("ix_org_sso_configs_org_id", table_name="org_sso_configs")
    op.drop_table("org_sso_configs")
