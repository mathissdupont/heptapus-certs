"""create domains table

Revision ID: 012_add_domains_table
Revises: 011_gamification_surveys_sponsors
Create Date: 2026-03-28 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '012_add_domains_table'
down_revision = '011'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'domains',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('domain', sa.String(length=255), nullable=False, unique=True, index=True),
        sa.Column('owner', sa.String(length=255), nullable=True),
        sa.Column('token', sa.String(length=64), nullable=False, unique=True, index=True),
        sa.Column('status', sa.String(length=20), nullable=False, server_default='pending'),
        sa.Column('created_at', sa.DateTime(), nullable=True),
    )


def downgrade() -> None:
    op.drop_table('domains')
