"""Fix attendance table name typo.

Revision ID: 047_fix_attendance_table_name
Revises: 046_event_team_perms
Create Date: 2026-05-21
"""

from alembic import op
import sqlalchemy as sa


revision = "047_fix_attendance_table_name"
down_revision = "046_event_team_perms"
branch_labels = None
depends_on = None


def _table_names() -> set[str]:
    return set(sa.inspect(op.get_bind()).get_table_names())


def upgrade() -> None:
    tables = _table_names()

    if "attendance_records" not in tables and "attendaonce_records" in tables:
        op.rename_table("attendaonce_records", "attendance_records")
        return

    if "attendance_records" not in tables:
        op.create_table(
            "attendance_records",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("attendee_id", sa.Integer(), sa.ForeignKey("attendees.id", ondelete="CASCADE"), nullable=False),
            sa.Column("session_id", sa.Integer(), sa.ForeignKey("event_sessions.id", ondelete="CASCADE"), nullable=False),
            sa.Column("checked_in_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("ip_address", sa.String(45), nullable=True),
            sa.UniqueConstraint("attendee_id", "session_id", name="uq_attendance_attendee_session"),
        )
        op.create_index("ix_attendance_records_attendee_id", "attendance_records", ["attendee_id"])
        op.create_index("ix_attendance_records_session_id", "attendance_records", ["session_id"])

    if "attendaonce_records" in tables:
        op.execute(
            """
            INSERT INTO attendance_records (attendee_id, session_id, checked_in_at, ip_address)
            SELECT attendee_id, session_id, checked_in_at, ip_address
            FROM attendaonce_records
            ON CONFLICT (attendee_id, session_id) DO NOTHING
            """
        )


def downgrade() -> None:
    pass
