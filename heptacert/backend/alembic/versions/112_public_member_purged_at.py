"""WP28 Phase C: public_members.purged_at for the post-deletion PII purge.

Adds the idempotency guard for the 30-day member-deletion purge job, which erases a
deleted member's remaining PII (email) and anonymizes their attendee rows. Nullable +
indexed so the daily job can cheaply find members whose deletion has matured.

Revision ID: 112_public_member_purged_at
Revises: 111_data_retention_anonymization
Create Date: 2026-07-17
"""

from alembic import op
import sqlalchemy as sa


revision = "112_public_member_purged_at"
down_revision = "111_data_retention_anonymization"
branch_labels = None
depends_on = None


def _columns(table_name: str) -> set[str]:
    return {c["name"] for c in sa.inspect(op.get_bind()).get_columns(table_name)}


def _indexes(table_name: str) -> set[str]:
    return {i["name"] for i in sa.inspect(op.get_bind()).get_indexes(table_name)}


def upgrade() -> None:
    if "purged_at" not in _columns("public_members"):
        op.add_column(
            "public_members",
            sa.Column("purged_at", sa.DateTime(timezone=True), nullable=True),
        )
    if "ix_public_members_purged_at" not in _indexes("public_members"):
        op.create_index("ix_public_members_purged_at", "public_members", ["purged_at"])


def downgrade() -> None:
    if "ix_public_members_purged_at" in _indexes("public_members"):
        op.drop_index("ix_public_members_purged_at", table_name="public_members")
    if "purged_at" in _columns("public_members"):
        op.drop_column("public_members", "purged_at")
