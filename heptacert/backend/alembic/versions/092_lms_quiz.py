"""Add LMS quiz system (quizzes, questions, choices, attempts, answers).

Revision ID: 092_lms_quiz
Revises: 091_lms_attendance
Create Date: 2026-06-08
"""

from alembic import op
import sqlalchemy as sa


revision = "092_lms_quiz"
down_revision = "091_lms_attendance"
branch_labels = None
depends_on = None


def _tables() -> set[str]:
    return set(sa.inspect(op.get_bind()).get_table_names())


def upgrade() -> None:
    existing = _tables()

    if "quizzes" not in existing:
        op.create_table(
            "quizzes",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("course_id", sa.Integer(), nullable=False),
            sa.Column("title", sa.String(length=300), nullable=False),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("time_limit_minutes", sa.Integer(), nullable=True),
            sa.Column("attempts_allowed", sa.Integer(), nullable=False, server_default="1"),
            sa.Column("passing_score", sa.Integer(), nullable=False, server_default="60"),
            sa.Column("shuffle_questions", sa.Boolean(), nullable=False, server_default="false"),
            sa.Column("show_correct_answers", sa.Boolean(), nullable=False, server_default="true"),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.ForeignKeyConstraint(["course_id"], ["training_courses.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_quizzes_course", "quizzes", ["course_id"])

    if "quiz_questions" not in existing:
        op.create_table(
            "quiz_questions",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("quiz_id", sa.Integer(), nullable=False),
            sa.Column("question_text", sa.Text(), nullable=False),
            # multiple_choice | true_false | short_answer
            sa.Column("question_type", sa.String(length=50), nullable=False, server_default="multiple_choice"),
            sa.Column("points", sa.Integer(), nullable=False, server_default="1"),
            sa.Column("order", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("explanation", sa.Text(), nullable=True),
            sa.ForeignKeyConstraint(["quiz_id"], ["quizzes.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_quiz_questions_quiz", "quiz_questions", ["quiz_id"])

    if "quiz_choices" not in existing:
        op.create_table(
            "quiz_choices",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("question_id", sa.Integer(), nullable=False),
            sa.Column("choice_text", sa.String(length=1000), nullable=False),
            sa.Column("is_correct", sa.Boolean(), nullable=False, server_default="false"),
            sa.Column("order", sa.Integer(), nullable=False, server_default="0"),
            sa.ForeignKeyConstraint(["question_id"], ["quiz_questions.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_quiz_choices_question", "quiz_choices", ["question_id"])

    if "quiz_attempts" not in existing:
        op.create_table(
            "quiz_attempts",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("quiz_id", sa.Integer(), nullable=False),
            sa.Column("member_id", sa.Integer(), nullable=False),
            sa.Column("started_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("score", sa.Numeric(6, 2), nullable=True),
            sa.Column("passed", sa.Boolean(), nullable=True),
            sa.Column("attempt_number", sa.Integer(), nullable=False, server_default="1"),
            sa.ForeignKeyConstraint(["quiz_id"], ["quizzes.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["member_id"], ["public_members.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_quiz_attempts_quiz_member", "quiz_attempts", ["quiz_id", "member_id"])

    if "quiz_answers" not in existing:
        op.create_table(
            "quiz_answers",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("attempt_id", sa.Integer(), nullable=False),
            sa.Column("question_id", sa.Integer(), nullable=False),
            # JSON array of selected choice IDs (for multiple_choice / true_false)
            sa.Column("selected_choice_ids", sa.JSON(), nullable=True),
            sa.Column("text_answer", sa.Text(), nullable=True),
            sa.ForeignKeyConstraint(["attempt_id"], ["quiz_attempts.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["question_id"], ["quiz_questions.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("attempt_id", "question_id", name="uq_quiz_answer_attempt_question"),
        )
        op.create_index("ix_quiz_answers_attempt", "quiz_answers", ["attempt_id"])


def downgrade() -> None:
    existing = _tables()
    if "quiz_answers" in existing:
        op.drop_table("quiz_answers")
    if "quiz_attempts" in existing:
        op.drop_table("quiz_attempts")
    if "quiz_choices" in existing:
        op.drop_table("quiz_choices")
    if "quiz_questions" in existing:
        op.drop_table("quiz_questions")
    if "quizzes" in existing:
        op.drop_table("quizzes")
