"""Bind OAuth authorization codes and refresh tokens to an MCP resource.

Revision ID: 113_oauth_resource_binding
Revises: 112_public_member_purged_at
"""

from alembic import op
import sqlalchemy as sa


revision = "113_oauth_resource_binding"
down_revision = "112_public_member_purged_at"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("oauth_codes", sa.Column("resource", sa.String(500), nullable=True))
    op.add_column("oauth_refresh_tokens", sa.Column("resource", sa.String(500), nullable=True))


def downgrade() -> None:
    op.drop_column("oauth_refresh_tokens", "resource")
    op.drop_column("oauth_codes", "resource")
