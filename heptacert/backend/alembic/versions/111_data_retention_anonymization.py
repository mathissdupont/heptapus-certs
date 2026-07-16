"""WP28 data retention & anonymization: attendee disposal columns + audit log.

Adds attendees.anonymize_after (resolved disposal date, indexed) and
attendees.anonymized_at (set once the pii-marked fields are irreversibly disposed,
idempotency guard), plus the anonymization_log table — an immutable, PII-free
accountability record of every disposal.

Retention policy settings themselves live in Event.config / Organization.settings
JSONB (no schema change), and the per-field ``pii`` flag lives inside the existing
registration_fields JSON, so this migration only adds the columns the daily sweep
and the audit trail need.

Revision ID: 111_data_retention_anonymization
Revises: 110_oauth_dcr
Create Date: 2026-07-16
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "111_data_retention_anonymization"
down_revision = "110_oauth_dcr"
branch_labels = None
depends_on = None


def _tables() -> set[str]:
    return set(sa.inspect(op.get_bind()).get_table_names())


def _columns(table_name: str) -> set[str]:
    return {c["name"] for c in sa.inspect(op.get_bind()).get_columns(table_name)}


def _indexes(table_name: str) -> set[str]:
    return {i["name"] for i in sa.inspect(op.get_bind()).get_indexes(table_name)}


def upgrade() -> None:
    cols = _columns("attendees")
    if "anonymize_after" not in cols:
        op.add_column(
            "attendees",
            sa.Column("anonymize_after", sa.DateTime(timezone=True), nullable=True),
        )
    if "anonymized_at" not in cols:
        op.add_column(
            "attendees",
            sa.Column("anonymized_at", sa.DateTime(timezone=True), nullable=True),
        )
    if "ix_attendees_anonymize_after" not in _indexes("attendees"):
        op.create_index(
            "ix_attendees_anonymize_after", "attendees", ["anonymize_after"]
        )

    if "anonymization_log" not in _tables():
        op.create_table(
            "anonymization_log",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("attendee_id", sa.Integer(), nullable=False),
            sa.Column("event_id", sa.Integer(), nullable=True),
            sa.Column("organization_id", sa.Integer(), nullable=True),
            sa.Column("field_ids", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
            sa.Column("method", sa.String(length=32), nullable=False, server_default="key_removal"),
            sa.Column("trigger", sa.String(length=24), nullable=False, server_default="auto"),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        )
    idx = _indexes("anonymization_log")
    for col in ("attendee_id", "event_id", "organization_id"):
        if f"ix_anonymization_log_{col}" not in idx:
            op.create_index(f"ix_anonymization_log_{col}", "anonymization_log", [col])


def downgrade() -> None:
    if "anonymization_log" in _tables():
        op.drop_table("anonymization_log")
    cols = _columns("attendees")
    if "ix_attendees_anonymize_after" in _indexes("attendees"):
        op.drop_index("ix_attendees_anonymize_after", table_name="attendees")
    if "anonymized_at" in cols:
        op.drop_column("attendees", "anonymized_at")
    if "anonymize_after" in cols:
        op.drop_column("attendees", "anonymize_after")
