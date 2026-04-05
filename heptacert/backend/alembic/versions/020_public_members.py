"""Add public member accounts table.

Revision ID: 020_public_members
Revises: 019_reg_answers_guard
Create Date: 2026-04-05
"""

from alembic import op
import sqlalchemy as sa


revision = "020_public_members"
down_revision = "019_reg_answers_guard"
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = set(inspector.get_table_names())
    if "public_members" not in tables:
        op.create_table(
            "public_members",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("email", sa.String(length=320), nullable=False),
            sa.Column("display_name", sa.String(length=120), nullable=False),
            sa.Column("password_hash", sa.String(length=255), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.Column("is_verified", sa.Boolean(), nullable=False, server_default=sa.text("false")),
            sa.Column("verification_token", sa.String(length=256), nullable=True),
        )
        op.create_index("ix_public_members_email", "public_members", ["email"], unique=True)


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = set(inspector.get_table_names())
    if "public_members" in tables:
        indexes = {index["name"] for index in inspector.get_indexes("public_members")}
        if "ix_public_members_email" in indexes:
            op.drop_index("ix_public_members_email", table_name="public_members")
        op.drop_table("public_members")
