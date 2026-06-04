"""Soft delete for users and public_members.

GDPR Art. 17 / KVKK md. 11 — account deletion requests now set deleted_at
instead of issuing a hard DELETE. Hard purge can be scheduled after the
legal retention period expires.

Revision ID: 068_soft_delete_users
Revises: 067_document_export_jobs
Create Date: 2026-06-04
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "068_soft_delete_users"
down_revision: Union[str, None] = "067_document_export_jobs"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("public_members", sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True))

    op.create_index("ix_users_deleted_at", "users", ["deleted_at"])
    op.create_index("ix_public_members_deleted_at", "public_members", ["deleted_at"])


def downgrade() -> None:
    op.drop_index("ix_public_members_deleted_at", table_name="public_members")
    op.drop_index("ix_users_deleted_at", table_name="users")
    op.drop_column("public_members", "deleted_at")
    op.drop_column("users", "deleted_at")
