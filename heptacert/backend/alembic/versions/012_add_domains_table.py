"""create domains table

Revision ID: 012_add_domains_table
Revises: 011
Create Date: 2026-03-28 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "012_add_domains_table"
down_revision = "011"
branch_labels = None
depends_on = None


def _table_exists(inspector, table_name: str) -> bool:
    return table_name in inspector.get_table_names()


def _index_exists(inspector, table_name: str, index_name: str) -> bool:
    if table_name not in inspector.get_table_names():
        return False

    return any(index.get("name") == index_name for index in inspector.get_indexes(table_name))


def _unique_constraint_exists(inspector, table_name: str, constraint_name: str) -> bool:
    if table_name not in inspector.get_table_names():
        return False

    return any(
        constraint.get("name") == constraint_name
        for constraint in inspector.get_unique_constraints(table_name)
    )


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if not _table_exists(inspector, "domains"):
        op.create_table(
            "domains",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("domain", sa.String(length=255), nullable=False),
            sa.Column("owner", sa.String(length=255), nullable=True),
            sa.Column("token", sa.String(length=64), nullable=False),
            sa.Column("status", sa.String(length=20), nullable=False, server_default="pending"),
            sa.Column("created_at", sa.DateTime(), nullable=True),
        )

    inspector = sa.inspect(bind)

    if not _index_exists(inspector, "domains", "ix_domains_domain"):
        op.create_index(
            "ix_domains_domain",
            "domains",
            ["domain"],
            unique=True,
        )

    inspector = sa.inspect(bind)

    if not _index_exists(inspector, "domains", "ix_domains_token"):
        op.create_index(
            "ix_domains_token",
            "domains",
            ["token"],
            unique=True,
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if _table_exists(inspector, "domains"):
        if _index_exists(inspector, "domains", "ix_domains_token"):
            op.drop_index("ix_domains_token", table_name="domains")

        inspector = sa.inspect(bind)

        if _index_exists(inspector, "domains", "ix_domains_domain"):
            op.drop_index("ix_domains_domain", table_name="domains")

        op.drop_table("domains")