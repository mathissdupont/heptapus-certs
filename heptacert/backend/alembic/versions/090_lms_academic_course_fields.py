"""Add academic metadata fields to LMS courses.

Revision ID: 090_lms_academic_course_fields
Revises: 089_lms_schema_repair
Create Date: 2026-06-08
"""

from alembic import op
import sqlalchemy as sa


revision = "090_lms_academic_course_fields"
down_revision = "089_lms_schema_repair"
branch_labels = None
depends_on = None


def _columns(table_name: str) -> set[str]:
    return {c["name"] for c in sa.inspect(op.get_bind()).get_columns(table_name)}


def _indexes(table_name: str) -> set[str]:
    return {idx["name"] for idx in sa.inspect(op.get_bind()).get_indexes(table_name)}


def upgrade() -> None:
    existing_tables = set(sa.inspect(op.get_bind()).get_table_names())
    if "training_courses" not in existing_tables:
        return

    existing = _columns("training_courses")
    with op.batch_alter_table("training_courses") as batch_op:
        if "course_code" not in existing:
            batch_op.add_column(sa.Column("course_code", sa.String(length=50), nullable=True))
        if "department" not in existing:
            batch_op.add_column(sa.Column("department", sa.String(length=120), nullable=True))
        if "term" not in existing:
            batch_op.add_column(sa.Column("term", sa.String(length=80), nullable=True))
        if "section" not in existing:
            batch_op.add_column(sa.Column("section", sa.String(length=50), nullable=True))
        if "credits" not in existing:
            batch_op.add_column(sa.Column("credits", sa.Numeric(4, 1), nullable=True))
        if "capacity" not in existing:
            batch_op.add_column(sa.Column("capacity", sa.Integer(), nullable=True))
        if "enrollment_policy" not in existing:
            batch_op.add_column(
                sa.Column("enrollment_policy", sa.String(length=32), nullable=False, server_default="open")
            )
        if "starts_at" not in existing:
            batch_op.add_column(sa.Column("starts_at", sa.DateTime(timezone=True), nullable=True))
        if "ends_at" not in existing:
            batch_op.add_column(sa.Column("ends_at", sa.DateTime(timezone=True), nullable=True))

    indexes = _indexes("training_courses")
    if "ix_training_courses_org_code" not in indexes:
        op.create_index("ix_training_courses_org_code", "training_courses", ["org_id", "course_code"])
    if "ix_training_courses_org_term" not in indexes:
        op.create_index("ix_training_courses_org_term", "training_courses", ["org_id", "term"])


def downgrade() -> None:
    existing_tables = set(sa.inspect(op.get_bind()).get_table_names())
    if "training_courses" not in existing_tables:
        return

    indexes = _indexes("training_courses")
    if "ix_training_courses_org_term" in indexes:
        op.drop_index("ix_training_courses_org_term", table_name="training_courses")
    if "ix_training_courses_org_code" in indexes:
        op.drop_index("ix_training_courses_org_code", table_name="training_courses")

    existing = _columns("training_courses")
    with op.batch_alter_table("training_courses") as batch_op:
        for column in (
            "ends_at",
            "starts_at",
            "enrollment_policy",
            "capacity",
            "credits",
            "section",
            "term",
            "department",
            "course_code",
        ):
            if column in existing:
                batch_op.drop_column(column)
