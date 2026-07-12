"""Make oauth_clients.client_secret_hash nullable for public (PKCE) DCR clients.

Dynamic Client Registration (RFC 7591) lets any OAuth/MCP client self-register.
MCP clients are typically PUBLIC clients: they authenticate with PKCE and hold
no client secret. The original oauth_clients table (096_oauth_server) required a
non-null client_secret_hash because every client was a hand-registered
confidential client. Relax that so public clients can be stored with a NULL
secret hash. Confidential clients (e.g. the ChatGPT GPT) are unaffected.

Revision ID: 110_oauth_dcr
Revises: 109_live_engagement
Create Date: 2026-07-11
"""

from alembic import op
import sqlalchemy as sa

revision = "110_oauth_dcr"
down_revision = "109_live_engagement"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column(
        "oauth_clients",
        "client_secret_hash",
        existing_type=sa.String(128),
        nullable=True,
    )


def downgrade() -> None:
    # Only reversible if no public (NULL-secret) clients exist. Backfill a
    # sentinel so the NOT NULL constraint can be re-applied without error.
    op.execute(
        "UPDATE oauth_clients SET client_secret_hash = '' "
        "WHERE client_secret_hash IS NULL"
    )
    op.alter_column(
        "oauth_clients",
        "client_secret_hash",
        existing_type=sa.String(128),
        nullable=False,
    )
