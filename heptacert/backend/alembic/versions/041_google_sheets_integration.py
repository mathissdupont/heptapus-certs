"""Add per-user Google Sheets integration tokens.

Revision ID: 041_google_sheets
Revises: 040_engage_flags
Create Date: 2026-05-14
"""

from alembic import op
import sqlalchemy as sa


revision = "041_google_sheets"
down_revision = "040_engage_flags"
branch_labels = None
depends_on = None


def _has_table(inspector, table_name: str) -> bool:
    return table_name in inspector.get_table_names()


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if _has_table(inspector, "user_google_integrations"):
        return

    op.create_table(
        "user_google_integrations",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("google_email", sa.String(length=320), nullable=True),
        sa.Column("access_token", sa.Text(), nullable=True),
        sa.Column("refresh_token", sa.Text(), nullable=True),
        sa.Column("token_expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("scopes", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_user_google_integrations_user_id", "user_google_integrations", ["user_id"], unique=True)


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if not _has_table(inspector, "user_google_integrations"):
        return
    op.drop_index("ix_user_google_integrations_user_id", table_name="user_google_integrations")
    op.drop_table("user_google_integrations")
