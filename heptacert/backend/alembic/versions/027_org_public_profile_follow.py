"""Add organization public profile ids and followers.

Revision ID: 027_org_public_profile_follow
Revises: 026_public_member_public_id
Create Date: 2026-04-06
"""

from __future__ import annotations

import secrets

from alembic import op
import sqlalchemy as sa


revision = "027_org_public_profile_follow"
down_revision = "026_public_member_public_id"
branch_labels = None
depends_on = None


def _generate_org_public_id(existing_ids: set[str]) -> str:
    for _ in range(20):
        candidate = f"org_{secrets.token_hex(8)}"
        if candidate not in existing_ids:
            existing_ids.add(candidate)
            return candidate
    raise RuntimeError("Unable to generate a unique organization public id")


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    if "organizations" in inspector.get_table_names():
        columns = {column["name"] for column in inspector.get_columns("organizations")}
        if "public_id" not in columns:
            op.add_column("organizations", sa.Column("public_id", sa.String(length=64), nullable=True))

        rows = conn.execute(sa.text("SELECT id, public_id FROM organizations")).mappings().all()
        existing_ids = {str(row["public_id"]) for row in rows if row["public_id"]}
        for row in rows:
            if row["public_id"]:
                continue
            conn.execute(
                sa.text("UPDATE organizations SET public_id = :public_id WHERE id = :id"),
                {"id": row["id"], "public_id": _generate_org_public_id(existing_ids)},
            )

        indexes = {index["name"] for index in inspector.get_indexes("organizations")}
        if "ix_organizations_public_id" not in indexes:
            op.create_index("ix_organizations_public_id", "organizations", ["public_id"], unique=True)

        op.alter_column("organizations", "public_id", existing_type=sa.String(length=64), nullable=False)

    if "organization_followers" not in inspector.get_table_names():
        op.create_table(
            "organization_followers",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("org_id", sa.Integer(), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False),
            sa.Column("public_member_id", sa.Integer(), sa.ForeignKey("public_members.id", ondelete="CASCADE"), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.UniqueConstraint("org_id", "public_member_id", name="uq_org_follow_member"),
        )
        op.create_index("ix_organization_followers_org_id", "organization_followers", ["org_id"], unique=False)
        op.create_index("ix_organization_followers_public_member_id", "organization_followers", ["public_member_id"], unique=False)


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    if "organization_followers" in inspector.get_table_names():
        indexes = {index["name"] for index in inspector.get_indexes("organization_followers")}
        if "ix_organization_followers_public_member_id" in indexes:
            op.drop_index("ix_organization_followers_public_member_id", table_name="organization_followers")
        if "ix_organization_followers_org_id" in indexes:
            op.drop_index("ix_organization_followers_org_id", table_name="organization_followers")
        op.drop_table("organization_followers")

    if "organizations" in inspector.get_table_names():
        indexes = {index["name"] for index in inspector.get_indexes("organizations")}
        columns = {column["name"] for column in inspector.get_columns("organizations")}
        if "ix_organizations_public_id" in indexes:
            op.drop_index("ix_organizations_public_id", table_name="organizations")
        if "public_id" in columns:
            op.drop_column("organizations", "public_id")
