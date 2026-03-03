"""Add description column to transactions table.

Revision ID: 007txdesc
Revises: 006waitlist
Create Date: 2026-03-02
"""
from __future__ import annotations
from alembic import op
import sqlalchemy as sa

revision: str = "007txdesc"
down_revision = "006waitlist"
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    
    # Add description column to transactions table if it doesn't exist
    if "transactions" in inspector.get_table_names():
        columns = [col["name"] for col in inspector.get_columns("transactions")]
        if "description" not in columns:
            op.add_column(
                "transactions",
                sa.Column("description", sa.String(256), nullable=True)
            )


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    
    if "transactions" in inspector.get_table_names():
        columns = [col["name"] for col in inspector.get_columns("transactions")]
        if "description" in columns:
            op.drop_column("transactions", "description")
