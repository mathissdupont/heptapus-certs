"""add settings JSONB to organizations

Revision ID: 013_add_org_settings
Revises: 012_add_domains_table
Create Date: 2026-03-28 00:10:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '013_add_org_settings'
down_revision = '012_add_domains_table'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add a JSON/JSONB `settings` column to organizations with default {}
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    if 'organizations' in inspector.get_table_names():
        cols = [c['name'] for c in inspector.get_columns('organizations')]
        if 'settings' not in cols:
            # Use native JSONB on Postgres when available.
            op.add_column('organizations', sa.Column('settings', sa.JSON(), nullable=False, server_default=sa.text("'{}'::jsonb")))


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    if 'organizations' in inspector.get_table_names():
        cols = [c['name'] for c in inspector.get_columns('organizations')]
        if 'settings' in cols:
            op.drop_column('organizations', 'settings')
