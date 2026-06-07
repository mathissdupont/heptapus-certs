"""Repair LMS columns for databases that already had partial LMS tables.

Revision ID: 089_lms_schema_repair
Revises: 088_sso_config
Create Date: 2026-06-08
"""

from alembic import op
import sqlalchemy as sa

revision = "089_lms_schema_repair"
down_revision = "088_sso_config"
branch_labels = None
depends_on = None


def _tables() -> set[str]:
    return set(sa.inspect(op.get_bind()).get_table_names())


def _columns(table_name: str) -> set[str]:
    return {c["name"] for c in sa.inspect(op.get_bind()).get_columns(table_name)}


def _indexes(table_name: str) -> set[str]:
    return {idx["name"] for idx in sa.inspect(op.get_bind()).get_indexes(table_name)}


def upgrade() -> None:
    existing_tables = _tables()

    if "training_courses" in existing_tables:
        existing = _columns("training_courses")
        with op.batch_alter_table("training_courses") as batch_op:
            if "is_marketplace_listed" not in existing:
                batch_op.add_column(sa.Column("is_marketplace_listed", sa.Boolean(), nullable=False, server_default="false"))
            if "marketplace_price" not in existing:
                batch_op.add_column(sa.Column("marketplace_price", sa.Numeric(10, 2), nullable=True))
            if "marketplace_description" not in existing:
                batch_op.add_column(sa.Column("marketplace_description", sa.Text(), nullable=True))
            if "preview_video_url" not in existing:
                batch_op.add_column(sa.Column("preview_video_url", sa.Text(), nullable=True))

    if "course_modules" in existing_tables:
        existing = _columns("course_modules")
        with op.batch_alter_table("course_modules") as batch_op:
            if "quiz_id" not in existing:
                batch_op.add_column(sa.Column("quiz_id", sa.Integer(), nullable=True))
                batch_op.create_foreign_key("fk_course_modules_quiz_id", "quizzes", ["quiz_id"], ["id"], ondelete="SET NULL")
            if "lti_tool_id" not in existing:
                batch_op.add_column(sa.Column("lti_tool_id", sa.Integer(), nullable=True))
            if "lti_custom_params" not in existing:
                batch_op.add_column(sa.Column("lti_custom_params", sa.Text(), nullable=True))

    if "course_enrollments" in existing_tables:
        existing = _columns("course_enrollments")
        indexes = _indexes("course_enrollments")
        with op.batch_alter_table("course_enrollments") as batch_op:
            if "final_grade" not in existing:
                batch_op.add_column(sa.Column("final_grade", sa.Integer(), nullable=True))
            if "cert_pdf_url" not in existing:
                batch_op.add_column(sa.Column("cert_pdf_url", sa.Text(), nullable=True))
            if "status" not in existing:
                batch_op.add_column(sa.Column("status", sa.String(32), nullable=False, server_default="enrolled"))
            if "ix_course_enrollments_status" not in indexes:
                batch_op.create_index("ix_course_enrollments_status", ["status"])

    if "lms_journey_enrollments" in existing_tables:
        existing = _columns("lms_journey_enrollments")
        with op.batch_alter_table("lms_journey_enrollments") as batch_op:
            if "cert_pdf_url" not in existing:
                batch_op.add_column(sa.Column("cert_pdf_url", sa.Text(), nullable=True))


def downgrade() -> None:
    # Intentionally no-op: this migration repairs drift between model metadata
    # and already-existing production tables.
    pass
