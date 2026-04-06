"""Allow global member feed posts.

Revision ID: 029_glob_feed
Revises: 028_soc_feed
Create Date: 2026-04-06
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "029_glob_feed"
down_revision = "028_soc_feed"
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    if "community_posts" not in inspector.get_table_names():
        return

    columns = {col["name"]: col for col in inspector.get_columns("community_posts")}
    org_col = columns.get("org_id")
    if org_col and not org_col.get("nullable", False):
        op.alter_column("community_posts", "org_id", existing_type=sa.Integer(), nullable=True)


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    if "community_posts" not in inspector.get_table_names():
        return

    columns = {col["name"]: col for col in inspector.get_columns("community_posts")}
    org_col = columns.get("org_id")
    if org_col and org_col.get("nullable", False):
        # Keep downgrade non-destructive for existing global posts.
        pass
