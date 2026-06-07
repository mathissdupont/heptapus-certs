"""Extended LMS tables: Gradebook, Discussions, Rubrics, Outcomes, Groups, Badges, Calendar, Bridge + TrainingAssignment course_id.

Revision ID: 083_lms_extended
Revises: 082_lms_staff_cert_pdf
Create Date: 2026-06-07
"""

from alembic import op
import sqlalchemy as sa

revision = "083_lms_extended"
down_revision = "082_lms_staff_cert_pdf"
branch_labels = None
depends_on = None


def _tables() -> set[str]:
    return set(sa.inspect(op.get_bind()).get_table_names())


def upgrade() -> None:
    existing = _tables()

    # 1B: TrainingAssignment → course_id
    with op.batch_alter_table("training_assignments") as batch_op:
        batch_op.add_column(sa.Column("course_id", sa.Integer(), nullable=True))
        batch_op.create_foreign_key("fk_training_assignment_course", "training_courses", ["course_id"], ["id"], ondelete="SET NULL")

    # 2A: Gradebook
    if "course_grade_items" not in existing:
        op.create_table(
            "course_grade_items",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("course_id", sa.Integer(), nullable=False),
            sa.Column("item_type", sa.String(50), nullable=False, server_default="assignment"),
            sa.Column("item_ref_id", sa.Integer(), nullable=True),
            sa.Column("title", sa.String(300), nullable=False),
            sa.Column("max_points", sa.Integer(), nullable=False, server_default="100"),
            sa.Column("weight_pct", sa.Numeric(5, 2), nullable=False, server_default="0"),
            sa.Column("order", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.ForeignKeyConstraint(["course_id"], ["training_courses.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_grade_items_course", "course_grade_items", ["course_id"])

    if "course_grade_summaries" not in existing:
        op.create_table(
            "course_grade_summaries",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("enrollment_id", sa.Integer(), nullable=False),
            sa.Column("weighted_avg", sa.Numeric(6, 2), nullable=True),
            sa.Column("letter_grade", sa.String(5), nullable=True),
            sa.Column("passed", sa.Boolean(), nullable=False, server_default="false"),
            sa.Column("computed_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.ForeignKeyConstraint(["enrollment_id"], ["course_enrollments.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("enrollment_id"),
        )

    # 2B: Discussions
    if "course_discussions" not in existing:
        op.create_table(
            "course_discussions",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("course_id", sa.Integer(), nullable=False),
            sa.Column("module_id", sa.Integer(), nullable=True),
            sa.Column("author_member_id", sa.Integer(), nullable=True),
            sa.Column("title", sa.String(300), nullable=False),
            sa.Column("body", sa.Text(), nullable=False),
            sa.Column("is_pinned", sa.Boolean(), nullable=False, server_default="false"),
            sa.Column("is_locked", sa.Boolean(), nullable=False, server_default="false"),
            sa.Column("reply_count", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.ForeignKeyConstraint(["course_id"], ["training_courses.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["module_id"], ["course_modules.id"], ondelete="SET NULL"),
            sa.ForeignKeyConstraint(["author_member_id"], ["public_members.id"], ondelete="SET NULL"),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_course_discussions_course", "course_discussions", ["course_id"])

    if "discussion_replies" not in existing:
        op.create_table(
            "discussion_replies",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("discussion_id", sa.Integer(), nullable=False),
            sa.Column("parent_reply_id", sa.Integer(), nullable=True),
            sa.Column("author_member_id", sa.Integer(), nullable=True),
            sa.Column("body", sa.Text(), nullable=False),
            sa.Column("is_instructor_reply", sa.Boolean(), nullable=False, server_default="false"),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.ForeignKeyConstraint(["discussion_id"], ["course_discussions.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["parent_reply_id"], ["discussion_replies.id"], ondelete="SET NULL"),
            sa.ForeignKeyConstraint(["author_member_id"], ["public_members.id"], ondelete="SET NULL"),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_discussion_replies_discussion", "discussion_replies", ["discussion_id"])

    # 2C: Rubrics
    if "rubrics" not in existing:
        op.create_table(
            "rubrics",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("course_id", sa.Integer(), nullable=False),
            sa.Column("title", sa.String(300), nullable=False),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.ForeignKeyConstraint(["course_id"], ["training_courses.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_rubrics_course", "rubrics", ["course_id"])

    if "rubric_criteria" not in existing:
        op.create_table(
            "rubric_criteria",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("rubric_id", sa.Integer(), nullable=False),
            sa.Column("title", sa.String(300), nullable=False),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("points", sa.Integer(), nullable=False, server_default="10"),
            sa.Column("order", sa.Integer(), nullable=False, server_default="0"),
            sa.ForeignKeyConstraint(["rubric_id"], ["rubrics.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
        )

    if "rubric_ratings" not in existing:
        op.create_table(
            "rubric_ratings",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("criterion_id", sa.Integer(), nullable=False),
            sa.Column("description", sa.String(300), nullable=False),
            sa.Column("points", sa.Integer(), nullable=False, server_default="0"),
            sa.ForeignKeyConstraint(["criterion_id"], ["rubric_criteria.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
        )

    if "submission_rubric_scores" not in existing:
        op.create_table(
            "submission_rubric_scores",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("submission_id", sa.Integer(), nullable=False),
            sa.Column("criterion_id", sa.Integer(), nullable=False),
            sa.Column("rating_id", sa.Integer(), nullable=True),
            sa.Column("points_earned", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("comment", sa.Text(), nullable=True),
            sa.ForeignKeyConstraint(["submission_id"], ["assignment_submissions.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["criterion_id"], ["rubric_criteria.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["rating_id"], ["rubric_ratings.id"], ondelete="SET NULL"),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("submission_id", "criterion_id", name="uq_submission_rubric_criterion"),
        )

    # 2D: Learning Outcomes
    if "learning_outcomes" not in existing:
        op.create_table(
            "learning_outcomes",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("org_id", sa.Integer(), nullable=False),
            sa.Column("title", sa.String(300), nullable=False),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("mastery_points", sa.Integer(), nullable=False, server_default="70"),
            sa.Column("display_name", sa.String(100), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.ForeignKeyConstraint(["org_id"], ["organizations.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_learning_outcomes_org", "learning_outcomes", ["org_id"])

    if "course_outcome_alignments" not in existing:
        op.create_table(
            "course_outcome_alignments",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("course_id", sa.Integer(), nullable=False),
            sa.Column("outcome_id", sa.Integer(), nullable=False),
            sa.Column("module_id", sa.Integer(), nullable=True),
            sa.ForeignKeyConstraint(["course_id"], ["training_courses.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["outcome_id"], ["learning_outcomes.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["module_id"], ["course_modules.id"], ondelete="SET NULL"),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("course_id", "outcome_id", "module_id", name="uq_course_outcome_module"),
        )

    if "outcome_masteries" not in existing:
        op.create_table(
            "outcome_masteries",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("member_id", sa.Integer(), nullable=False),
            sa.Column("outcome_id", sa.Integer(), nullable=False),
            sa.Column("score", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("mastered_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("evidence_type", sa.String(50), nullable=True),
            sa.Column("evidence_id", sa.Integer(), nullable=True),
            sa.ForeignKeyConstraint(["member_id"], ["public_members.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["outcome_id"], ["learning_outcomes.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("member_id", "outcome_id", name="uq_member_outcome"),
        )

    # 2E: Groups
    if "course_groups" not in existing:
        op.create_table(
            "course_groups",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("course_id", sa.Integer(), nullable=False),
            sa.Column("name", sa.String(200), nullable=False),
            sa.Column("max_members", sa.Integer(), nullable=True),
            sa.Column("created_by_user_id", sa.Integer(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.ForeignKeyConstraint(["course_id"], ["training_courses.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"], ondelete="SET NULL"),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_course_groups_course", "course_groups", ["course_id"])

    if "course_group_members" not in existing:
        op.create_table(
            "course_group_members",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("group_id", sa.Integer(), nullable=False),
            sa.Column("member_id", sa.Integer(), nullable=False),
            sa.Column("joined_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.ForeignKeyConstraint(["group_id"], ["course_groups.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["member_id"], ["public_members.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("group_id", "member_id", name="uq_group_member"),
        )

    # 2G: Badges
    if "badges" not in existing:
        op.create_table(
            "badges",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("org_id", sa.Integer(), nullable=False),
            sa.Column("name", sa.String(200), nullable=False),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("image_url", sa.Text(), nullable=True),
            sa.Column("criteria_text", sa.Text(), nullable=True),
            sa.Column("trigger_type", sa.String(50), nullable=False, server_default="manual"),
            sa.Column("trigger_ref_id", sa.Integer(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.ForeignKeyConstraint(["org_id"], ["organizations.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_badges_org", "badges", ["org_id"])

    if "badge_awards" not in existing:
        op.create_table(
            "badge_awards",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("badge_id", sa.Integer(), nullable=False),
            sa.Column("member_id", sa.Integer(), nullable=False),
            sa.Column("issued_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("evidence_url", sa.Text(), nullable=True),
            sa.Column("issued_by_user_id", sa.Integer(), nullable=True),
            sa.ForeignKeyConstraint(["badge_id"], ["badges.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["member_id"], ["public_members.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["issued_by_user_id"], ["users.id"], ondelete="SET NULL"),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("badge_id", "member_id", name="uq_badge_award"),
        )
        op.create_index("ix_badge_awards_member", "badge_awards", ["member_id"])

    # 2H: Calendar + Syllabus
    if "course_calendar_events" not in existing:
        op.create_table(
            "course_calendar_events",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("course_id", sa.Integer(), nullable=False),
            sa.Column("title", sa.String(300), nullable=False),
            sa.Column("event_type", sa.String(50), nullable=False, server_default="other"),
            sa.Column("starts_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("ends_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("module_id", sa.Integer(), nullable=True),
            sa.Column("conference_url", sa.Text(), nullable=True),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.ForeignKeyConstraint(["course_id"], ["training_courses.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["module_id"], ["course_modules.id"], ondelete="SET NULL"),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_course_calendar_course", "course_calendar_events", ["course_id"])

    if "course_syllabuses" not in existing:
        op.create_table(
            "course_syllabuses",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("course_id", sa.Integer(), nullable=False),
            sa.Column("content_html", sa.Text(), nullable=False, server_default=""),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.ForeignKeyConstraint(["course_id"], ["training_courses.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("course_id"),
        )

    # 3A: Events ↔ LMS Bridge
    if "event_lms_bridges" not in existing:
        op.create_table(
            "event_lms_bridges",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("event_id", sa.Integer(), nullable=False),
            sa.Column("course_id", sa.Integer(), nullable=True),
            sa.Column("trigger_on", sa.String(50), nullable=False, server_default="attendance"),
            sa.Column("action", sa.String(50), nullable=False, server_default="enroll_in_course"),
            sa.Column("action_ref_id", sa.Integer(), nullable=True),
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.ForeignKeyConstraint(["event_id"], ["events.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["course_id"], ["training_courses.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_event_lms_bridges_event", "event_lms_bridges", ["event_id"])


def downgrade() -> None:
    for tbl in [
        "event_lms_bridges", "course_syllabuses", "course_calendar_events",
        "badge_awards", "badges", "course_group_members", "course_groups",
        "outcome_masteries", "course_outcome_alignments", "learning_outcomes",
        "submission_rubric_scores", "rubric_ratings", "rubric_criteria", "rubrics",
        "discussion_replies", "course_discussions",
        "course_grade_summaries", "course_grade_items",
    ]:
        op.drop_table(tbl)
    with op.batch_alter_table("training_assignments") as batch_op:
        batch_op.drop_constraint("fk_training_assignment_course", type_="foreignkey")
        batch_op.drop_column("course_id")
