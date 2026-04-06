"""Add public member bio and password reset token.

Revision ID: 024_public_member_profile_fields
Revises: 023usersmtpsender
Create Date: 2026-04-06
"""

from alembic import op
import sqlalchemy as sa


revision = "024_public_member_profile_fields"
down_revision = "023usersmtpsender"
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = {column["name"] for column in inspector.get_columns("public_members")}

    if "bio" not in columns:
        op.add_column("public_members", sa.Column("bio", sa.Text(), nullable=True))
    if "password_reset_token" not in columns:
        op.add_column("public_members", sa.Column("password_reset_token", sa.String(length=256), nullable=True))


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = {column["name"] for column in inspector.get_columns("public_members")}

    if "password_reset_token" in columns:
        op.drop_column("public_members", "password_reset_token")
    if "bio" in columns:
        op.drop_column("public_members", "bio")
