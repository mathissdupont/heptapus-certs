"""Add full LMS tables: courses, modules, journeys, assignments, announcements, CPD.

Revision ID: 081_lms_tables
Revises: 080_accreditation
Create Date: 2026-06-07
"""

from alembic import op
import sqlalchemy as sa

revision = "081_lms_tables"
down_revision = "080_accreditation"
branch_labels = None
depends_on = None


def _tables() -> set[str]:
    return set(sa.inspect(op.get_bind()).get_table_names())


def upgrade():
    existing = _tables()

    if "training_courses" not in existing:
        op.create_table(
            "training_courses",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("org_id", sa.Integer(), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False),
            sa.Column("title", sa.String(300), nullable=False),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("thumbnail_url", sa.Text(), nullable=True),
            sa.Column("category", sa.String(100), nullable=True),
            sa.Column("level", sa.String(50), nullable=False, server_default="beginner"),
            sa.Column("language", sa.String(10), nullable=False, server_default="tr"),
            sa.Column("is_published", sa.Boolean(), nullable=False, server_default="false"),
            sa.Column("is_featured", sa.Boolean(), nullable=False, server_default="false"),
            sa.Column("price", sa.Numeric(10, 2), nullable=True),
            sa.Column("cert_template_url", sa.Text(), nullable=True),
            sa.Column("passing_score", sa.Integer(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        )
        op.create_index("ix_training_courses_org_id", "training_courses", ["org_id"])

    if "course_modules" not in existing:
        op.create_table(
            "course_modules",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("course_id", sa.Integer(), sa.ForeignKey("training_courses.id", ondelete="CASCADE"), nullable=False),
            sa.Column("title", sa.String(300), nullable=False),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("order", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("content_type", sa.String(50), nullable=False, server_default="article"),
            sa.Column("content_url", sa.Text(), nullable=True),
            sa.Column("content_text", sa.Text(), nullable=True),
            sa.Column("duration_minutes", sa.Integer(), nullable=True),
            sa.Column("is_required", sa.Boolean(), nullable=False, server_default="true"),
            sa.Column("quiz_id", sa.Integer(), sa.ForeignKey("quizzes.id", ondelete="SET NULL"), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        )
        op.create_index("ix_course_modules_course_order", "course_modules", ["course_id", "order"])

    if "course_enrollments" not in existing:
        op.create_table(
            "course_enrollments",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("course_id", sa.Integer(), sa.ForeignKey("training_courses.id", ondelete="CASCADE"), nullable=False),
            sa.Column("member_id", sa.Integer(), sa.ForeignKey("public_members.id", ondelete="CASCADE"), nullable=False),
            sa.Column("enrolled_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("progress_pct", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("final_grade", sa.Integer(), nullable=True),
            sa.Column("certificate_id", sa.Integer(), sa.ForeignKey("certificates.id", ondelete="SET NULL"), nullable=True),
            sa.UniqueConstraint("course_id", "member_id", name="uq_course_enrollment"),
        )
        op.create_index("ix_course_enrollments_member", "course_enrollments", ["member_id"])

    if "module_progress" not in existing:
        op.create_table(
            "module_progress",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("enrollment_id", sa.Integer(), sa.ForeignKey("course_enrollments.id", ondelete="CASCADE"), nullable=False),
            sa.Column("module_id", sa.Integer(), sa.ForeignKey("course_modules.id", ondelete="CASCADE"), nullable=False),
            sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("time_spent_seconds", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("quiz_score", sa.Integer(), nullable=True),
            sa.UniqueConstraint("enrollment_id", "module_id", name="uq_module_progress"),
        )

    if "course_assignments" not in existing:
        op.create_table(
            "course_assignments",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("module_id", sa.Integer(), sa.ForeignKey("course_modules.id", ondelete="CASCADE"), nullable=False, unique=True),
            sa.Column("instructions", sa.Text(), nullable=True),
            sa.Column("due_date", sa.DateTime(timezone=True), nullable=True),
            sa.Column("max_points", sa.Integer(), nullable=False, server_default="100"),
            sa.Column("submission_type", sa.String(50), nullable=False, server_default="text"),
        )

    if "assignment_submissions" not in existing:
        op.create_table(
            "assignment_submissions",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("assignment_id", sa.Integer(), sa.ForeignKey("course_assignments.id", ondelete="CASCADE"), nullable=False),
            sa.Column("member_id", sa.Integer(), sa.ForeignKey("public_members.id", ondelete="CASCADE"), nullable=False),
            sa.Column("submitted_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.Column("submission_text", sa.Text(), nullable=True),
            sa.Column("submission_url", sa.Text(), nullable=True),
            sa.Column("file_url", sa.Text(), nullable=True),
            sa.Column("grade", sa.Integer(), nullable=True),
            sa.Column("feedback", sa.Text(), nullable=True),
            sa.Column("graded_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("graded_by_user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
            sa.UniqueConstraint("assignment_id", "member_id", name="uq_assignment_submission"),
        )
        op.create_index("ix_assignment_submissions_member", "assignment_submissions", ["member_id"])

    if "lms_journeys" not in existing:
        op.create_table(
            "lms_journeys",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("org_id", sa.Integer(), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False),
            sa.Column("title", sa.String(300), nullable=False),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("thumbnail_url", sa.Text(), nullable=True),
            sa.Column("is_published", sa.Boolean(), nullable=False, server_default="false"),
            sa.Column("cert_template_url", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        )
        op.create_index("ix_lms_journeys_org_id", "lms_journeys", ["org_id"])

    if "lms_journey_steps" not in existing:
        op.create_table(
            "lms_journey_steps",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("journey_id", sa.Integer(), sa.ForeignKey("lms_journeys.id", ondelete="CASCADE"), nullable=False),
            sa.Column("course_id", sa.Integer(), sa.ForeignKey("training_courses.id", ondelete="CASCADE"), nullable=False),
            sa.Column("order", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("is_required", sa.Boolean(), nullable=False, server_default="true"),
            sa.UniqueConstraint("journey_id", "course_id", name="uq_journey_course"),
        )
        op.create_index("ix_lms_journey_steps_order", "lms_journey_steps", ["journey_id", "order"])

    if "lms_journey_enrollments" not in existing:
        op.create_table(
            "lms_journey_enrollments",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("journey_id", sa.Integer(), sa.ForeignKey("lms_journeys.id", ondelete="CASCADE"), nullable=False),
            sa.Column("member_id", sa.Integer(), sa.ForeignKey("public_members.id", ondelete="CASCADE"), nullable=False),
            sa.Column("enrolled_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("progress_pct", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("certificate_id", sa.Integer(), sa.ForeignKey("certificates.id", ondelete="SET NULL"), nullable=True),
            sa.UniqueConstraint("journey_id", "member_id", name="uq_journey_enrollment"),
        )
        op.create_index("ix_lms_journey_enrollments_member", "lms_journey_enrollments", ["member_id"])

    if "course_announcements" not in existing:
        op.create_table(
            "course_announcements",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("course_id", sa.Integer(), sa.ForeignKey("training_courses.id", ondelete="CASCADE"), nullable=False),
            sa.Column("author_user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
            sa.Column("title", sa.String(300), nullable=False),
            sa.Column("body", sa.Text(), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        )
        op.create_index("ix_course_announcements_course", "course_announcements", ["course_id"])

    if "course_cpd_configs" not in existing:
        op.create_table(
            "course_cpd_configs",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("course_id", sa.Integer(), sa.ForeignKey("training_courses.id", ondelete="CASCADE"), nullable=False),
            sa.Column("accreditation_body_id", sa.Integer(), nullable=True),
            sa.Column("cpd_hours", sa.Numeric(6, 2), nullable=False, server_default="0"),
            sa.Column("cpd_category", sa.String(100), nullable=True),
            sa.UniqueConstraint("course_id", "accreditation_body_id", name="uq_course_cpd"),
        )


def downgrade():
    for t in [
        "course_cpd_configs", "course_announcements",
        "lms_journey_enrollments", "lms_journey_steps", "lms_journeys",
        "assignment_submissions", "course_assignments",
        "module_progress", "course_enrollments", "course_modules", "training_courses",
    ]:
        try:
            op.drop_table(t)
        except Exception:
            pass
