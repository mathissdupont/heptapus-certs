"""Add Certificate.attendee_id (canonical attendee link) + backfill.

Replaces fragile student_name based attendance<->certificate matching with a
real foreign key. The column is nullable: single-issue certificates can be
created from a free-text name with no attendee, and matching falls back to
student_name when attendee_id is null.

Backfill only links certificates whose (event_id, student_name) maps to exactly
ONE attendee, to avoid binding the wrong person when names collide.

Revision ID: 104_certificate_attendee_id
Revises: 103_presentation_security_controls
Create Date: 2026-06-28
"""

from alembic import op
import sqlalchemy as sa


revision = "104_certificate_attendee_id"
down_revision = "103_presentation_security_controls"
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
    columns = _columns("certificates")
    if "attendee_id" not in columns:
        op.add_column("certificates", sa.Column("attendee_id", sa.Integer(), nullable=True))

    indexes = _indexes("certificates")
    if "ix_certificates_attendee_id" not in indexes:
        op.create_index("ix_certificates_attendee_id", "certificates", ["attendee_id"])

    fkeys = _fkeys("certificates")
    if "fk_certificates_attendee_id" not in fkeys:
        op.create_foreign_key(
            "fk_certificates_attendee_id",
            "certificates",
            "attendees",
            ["attendee_id"],
            ["id"],
            ondelete="SET NULL",
        )

    # Backfill: only certificates whose (event_id, student_name) resolves to a
    # single attendee, so we never bind the wrong person when names collide.
    op.execute(
        """
        UPDATE certificates c
        SET attendee_id = a.id
        FROM attendees a
        WHERE a.event_id = c.event_id
          AND a.name = c.student_name
          AND c.attendee_id IS NULL
          AND c.deleted_at IS NULL
          AND (
            SELECT count(*) FROM attendees a2
            WHERE a2.event_id = c.event_id AND a2.name = c.student_name
          ) = 1
        """
    )


def downgrade() -> None:
    fkeys = _fkeys("certificates")
    if "fk_certificates_attendee_id" in fkeys:
        op.drop_constraint("fk_certificates_attendee_id", "certificates", type_="foreignkey")

    indexes = _indexes("certificates")
    if "ix_certificates_attendee_id" in indexes:
        op.drop_index("ix_certificates_attendee_id", table_name="certificates")

    columns = _columns("certificates")
    if "attendee_id" in columns:
        op.drop_column("certificates", "attendee_id")
