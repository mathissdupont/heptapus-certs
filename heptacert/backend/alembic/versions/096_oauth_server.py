"""Add OAuth 2.0 server tables (clients, auth codes, refresh tokens).

Revision ID: 096_oauth_server
Revises: 095_agent_action_logs
Create Date: 2026-06-14
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision = "096_oauth_server"
down_revision = "095_agent_action_logs"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "oauth_clients",
        sa.Column("id", sa.Integer(), autoincrement=True, primary_key=True),
        sa.Column("client_id", sa.String(64), nullable=False, unique=True),
        sa.Column("client_secret_hash", sa.String(128), nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("redirect_uris", JSONB, nullable=False, server_default="[]"),
        sa.Column("allowed_scopes", JSONB, nullable=False, server_default="[]"),
        sa.Column("logo_url", sa.String(500), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_oauth_clients_client_id", "oauth_clients", ["client_id"])

    op.create_table(
        "oauth_codes",
        sa.Column("id", sa.Integer(), autoincrement=True, primary_key=True),
        sa.Column("code_hash", sa.String(128), nullable=False, unique=True),
        sa.Column("client_id", sa.String(64), nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("redirect_uri", sa.Text(), nullable=False),
        sa.Column("scopes", JSONB, nullable=False, server_default="[]"),
        sa.Column("code_challenge", sa.String(128), nullable=True),
        sa.Column("code_challenge_method", sa.String(10), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_oauth_codes_code_hash", "oauth_codes", ["code_hash"])
    op.create_index("ix_oauth_codes_expires_used", "oauth_codes", ["expires_at", "used"])

    op.create_table(
        "oauth_refresh_tokens",
        sa.Column("id", sa.Integer(), autoincrement=True, primary_key=True),
        sa.Column("token_hash", sa.String(128), nullable=False, unique=True),
        sa.Column("client_id", sa.String(64), nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("scopes", JSONB, nullable=False, server_default="[]"),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_oauth_refresh_tokens_token_hash", "oauth_refresh_tokens", ["token_hash"])
    op.create_index("ix_oauth_refresh_tokens_user_id", "oauth_refresh_tokens", ["user_id"])
    op.create_index("ix_oauth_refresh_tokens_client_expires", "oauth_refresh_tokens", ["client_id", "expires_at", "revoked"])


def downgrade() -> None:
    op.drop_index("ix_oauth_refresh_tokens_client_expires")
    op.drop_index("ix_oauth_refresh_tokens_user_id")
    op.drop_index("ix_oauth_refresh_tokens_token_hash")
    op.drop_table("oauth_refresh_tokens")

    op.drop_index("ix_oauth_codes_expires_used")
    op.drop_index("ix_oauth_codes_code_hash")
    op.drop_table("oauth_codes")

    op.drop_index("ix_oauth_clients_client_id")
    op.drop_table("oauth_clients")
