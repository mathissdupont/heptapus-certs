"""Add Attendee approval/offline-payment gate columns.

Adds approval_status (default "not_required" = auto-confirmed, backward compatible),
approved_by, approved_at, approval_note. When an event has requires_approval enabled,
new public registrations become "pending" until an admin approves them (e.g. after
confirming an offline/bank payment). "approved" gates check-in and certificate access.

Revision ID: 105_attendee_approval_status
Revises: 104_certificate_attendee_id
Create Date: 2026-07-01
"""

from alembic import op
import sqlalchemy as sa


revision = "105_attendee_approval_status"
down_revision = "104_certificate_attendee_id"
branch_labels = None
depends_on = None


def _columns(table_name: str) -> set[str]:
    inspector = sa.inspect(op.get_bind())
    return {column["name"] for column in inspector.get_columns(table_name)}


def _indexes(table_name: str) -> set[str]:
    inspector = sa.inspect(op.get_bind())
    return {index["name"] for index in inspector.get_indexes(table_name)}


def _fkeys(table_name: str) -> set[str]:
    inspector = sa.inspect(op.get_bind())
    return {fk["name"] for fk in inspector.get_foreign_keys(table_name) if fk.get("name")}


def upgrade() -> None:
    columns = _columns("attendees")
    if "approval_status" not in columns:
        op.add_column(
            "attendees",
            sa.Column("approval_status", sa.String(length=24), nullable=False, server_default="not_required"),
        )
    if "approved_by" not in columns:
        op.add_column("attendees", sa.Column("approved_by", sa.Integer(), nullable=True))
    if "approved_at" not in columns:
        op.add_column("attendees", sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True))
    if "approval_note" not in columns:
        op.add_column("attendees", sa.Column("approval_note", sa.String(length=500), nullable=True))

    indexes = _indexes("attendees")
    if "ix_attendees_approval_status" not in indexes:
        op.create_index("ix_attendees_approval_status", "attendees", ["approval_status"])

    fkeys = _fkeys("attendees")
    if "fk_attendees_approved_by" not in fkeys:
        op.create_foreign_key(
            "fk_attendees_approved_by",
            "attendees",
            "users",
            ["approved_by"],
            ["id"],
            ondelete="SET NULL",
        )


def downgrade() -> None:
    fkeys = _fkeys("attendees")
    if "fk_attendees_approved_by" in fkeys:
        op.drop_constraint("fk_attendees_approved_by", "attendees", type_="foreignkey")

    indexes = _indexes("attendees")
    if "ix_attendees_approval_status" in indexes:
        op.drop_index("ix_attendees_approval_status", table_name="attendees")

    for col in ("approval_note", "approved_at", "approved_by", "approval_status"):
        if col in _columns("attendees"):
            op.drop_column("attendees", col)
