"""Add public_id to public members for non-sequential profile URLs.

Revision ID: 026_public_member_public_id
Revises: 025_pub_member_profile_enrich
Create Date: 2026-04-06
"""

from __future__ import annotations

import secrets

from alembic import op
import sqlalchemy as sa


revision = "026_public_member_public_id"
down_revision = "025_pub_member_profile_enrich"
branch_labels = None
depends_on = None


def _generate_public_member_id(existing_ids: set[str]) -> str:
    for _ in range(20):
        candidate = f"mem_{secrets.token_hex(8)}"
        if candidate not in existing_ids:
            existing_ids.add(candidate)
            return candidate
    raise RuntimeError("Unable to generate a unique public member id")


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = {column["name"] for column in inspector.get_columns("public_members")}

    if "public_id" not in columns:
        op.add_column("public_members", sa.Column("public_id", sa.String(length=64), nullable=True))

    rows = conn.execute(sa.text("SELECT id, public_id FROM public_members")).mappings().all()
    existing_ids = {str(row["public_id"]) for row in rows if row["public_id"]}
    for row in rows:
        if row["public_id"]:
            continue
        conn.execute(
            sa.text("UPDATE public_members SET public_id = :public_id WHERE id = :id"),
            {"id": row["id"], "public_id": _generate_public_member_id(existing_ids)},
        )

    indexes = {index["name"] for index in inspector.get_indexes("public_members")}
    if "ix_public_members_public_id" not in indexes:
        op.create_index("ix_public_members_public_id", "public_members", ["public_id"], unique=True)

    op.alter_column("public_members", "public_id", existing_type=sa.String(length=64), nullable=False)


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    indexes = {index["name"] for index in inspector.get_indexes("public_members")}
    columns = {column["name"] for column in inspector.get_columns("public_members")}

    if "ix_public_members_public_id" in indexes:
        op.drop_index("ix_public_members_public_id", table_name="public_members")
    if "public_id" in columns:
        op.drop_column("public_members", "public_id")
