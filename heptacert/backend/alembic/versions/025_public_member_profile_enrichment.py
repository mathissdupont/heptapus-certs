"""Add richer public member profile fields.

Revision ID: 025_pub_member_profile_enrich
Revises: 024_public_member_profile_fields
Create Date: 2026-04-06
"""

from alembic import op
import sqlalchemy as sa


revision = "025_pub_member_profile_enrich"
down_revision = "024_public_member_profile_fields"
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = {column["name"] for column in inspector.get_columns("public_members")}

    if "avatar_url" not in columns:
        op.add_column("public_members", sa.Column("avatar_url", sa.Text(), nullable=True))
    if "headline" not in columns:
        op.add_column("public_members", sa.Column("headline", sa.String(length=160), nullable=True))
    if "location" not in columns:
        op.add_column("public_members", sa.Column("location", sa.String(length=160), nullable=True))
    if "website_url" not in columns:
        op.add_column("public_members", sa.Column("website_url", sa.String(length=2000), nullable=True))


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = {column["name"] for column in inspector.get_columns("public_members")}

    if "website_url" in columns:
        op.drop_column("public_members", "website_url")
    if "location" in columns:
        op.drop_column("public_members", "location")
    if "headline" in columns:
        op.drop_column("public_members", "headline")
    if "avatar_url" in columns:
        op.drop_column("public_members", "avatar_url")
