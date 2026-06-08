"""Add LMS attendance sessions and records.

Revision ID: 091_lms_attendance
Revises: 090_lms_academic_course_fields
Create Date: 2026-06-08
"""

from alembic import op
import sqlalchemy as sa


revision = "091_lms_attendance"
down_revision = "090_lms_academic_course_fields"
branch_labels = None
depends_on = None


def _tables() -> set[str]:
    return set(sa.inspect(op.get_bind()).get_table_names())


def upgrade() -> None:
    existing = _tables()

    if "course_attendance_sessions" not in existing:
        op.create_table(
            "course_attendance_sessions",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("course_id", sa.Integer(), nullable=False),
            sa.Column("title", sa.String(length=300), nullable=False),
            sa.Column("session_type", sa.String(length=50), nullable=False, server_default="lecture"),
            sa.Column("starts_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("ends_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("location", sa.String(length=300), nullable=True),
            sa.Column("required", sa.Boolean(), nullable=False, server_default="true"),
            sa.Column("notes", sa.Text(), nullable=True),
            sa.Column("created_by_user_id", sa.Integer(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.ForeignKeyConstraint(["course_id"], ["training_courses.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"], ondelete="SET NULL"),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index(
            "ix_attendance_sessions_course_start",
            "course_attendance_sessions",
            ["course_id", "starts_at"],
        )

    if "course_attendance_records" not in existing:
        op.create_table(
            "course_attendance_records",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("session_id", sa.Integer(), nullable=False),
            sa.Column("enrollment_id", sa.Integer(), nullable=False),
            sa.Column("member_id", sa.Integer(), nullable=False),
            sa.Column("status", sa.String(length=32), nullable=False, server_default="present"),
            sa.Column("minutes_attended", sa.Integer(), nullable=True),
            sa.Column("note", sa.Text(), nullable=True),
            sa.Column("recorded_by_user_id", sa.Integer(), nullable=True),
            sa.Column("recorded_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.ForeignKeyConstraint(["session_id"], ["course_attendance_sessions.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["enrollment_id"], ["course_enrollments.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["member_id"], ["public_members.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["recorded_by_user_id"], ["users.id"], ondelete="SET NULL"),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("session_id", "enrollment_id", name="uq_attendance_session_enrollment"),
        )
        op.create_index("ix_attendance_records_member", "course_attendance_records", ["member_id"])


def downgrade() -> None:
    existing = _tables()
    if "course_attendance_records" in existing:
        op.drop_table("course_attendance_records")
    if "course_attendance_sessions" in existing:
        op.drop_table("course_attendance_sessions")
