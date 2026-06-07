"""Add status column to course_enrollments

Revision ID: 084_course_enrollment_status
Revises: 083_lms_extended
Create Date: 2026-06-07
"""
from alembic import op
import sqlalchemy as sa

revision = "084_course_enrollment_status"
down_revision = "083_lms_extended"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "course_enrollments",
        sa.Column("status", sa.String(32), nullable=False, server_default="enrolled"),
    )
    op.create_index(
        "ix_course_enrollments_status", "course_enrollments", ["status"]
    )


def downgrade():
    op.drop_index("ix_course_enrollments_status", table_name="course_enrollments")
    op.drop_column("course_enrollments", "status")
