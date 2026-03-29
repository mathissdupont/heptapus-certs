"""create organization_allowlists table

Revision ID: 014_add_organization_allowlist
Revises: 013_add_org_settings
Create Date: 2026-03-29 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '014_add_organization_allowlist'
down_revision = '013_add_org_settings'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'organization_allowlists',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('org_id', sa.Integer(), sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('email', sa.String(length=320), nullable=False, index=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
    )


def downgrade() -> None:
    op.drop_table('organization_allowlists')
