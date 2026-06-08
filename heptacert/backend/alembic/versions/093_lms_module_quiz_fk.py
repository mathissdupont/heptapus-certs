"""Fix course_modules.quiz_id FK to point to lms_quizzes instead of events quizzes.

Revision ID: 093_lms_module_quiz_fk
Revises: 092_lms_quiz
Create Date: 2026-06-08
"""

from alembic import op
import sqlalchemy as sa


revision = "093_lms_module_quiz_fk"
down_revision = "092_lms_quiz"
branch_labels = None
depends_on = None


def _fk_exists(table: str, constraint: str) -> bool:
    bind = op.get_bind()
    result = bind.execute(
        sa.text(
            "SELECT 1 FROM information_schema.table_constraints "
            "WHERE table_name = :tbl AND constraint_name = :con AND constraint_type = 'FOREIGN KEY'"
        ),
        {"tbl": table, "con": constraint},
    )
    return result.fetchone() is not None


def _tables() -> set[str]:
    return set(sa.inspect(op.get_bind()).get_table_names())


def _ensure_lms_quiz_tables() -> None:
    """Repair databases that were stamped at 092 before the table create landed."""
    existing = _tables()

    if "lms_quizzes" not in existing:
        op.create_table(
            "lms_quizzes",
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
        op.create_index("ix_lms_quizzes_course", "lms_quizzes", ["course_id"])

    existing = _tables()
    if "lms_quiz_questions" not in existing:
        op.create_table(
            "lms_quiz_questions",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("quiz_id", sa.Integer(), nullable=False),
            sa.Column("question_text", sa.Text(), nullable=False),
            sa.Column("question_type", sa.String(length=50), nullable=False, server_default="multiple_choice"),
            sa.Column("points", sa.Integer(), nullable=False, server_default="1"),
            sa.Column("order", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("explanation", sa.Text(), nullable=True),
            sa.ForeignKeyConstraint(["quiz_id"], ["lms_quizzes.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_lms_quiz_questions_quiz", "lms_quiz_questions", ["quiz_id"])

    existing = _tables()
    if "lms_quiz_choices" not in existing:
        op.create_table(
            "lms_quiz_choices",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("question_id", sa.Integer(), nullable=False),
            sa.Column("choice_text", sa.String(length=1000), nullable=False),
            sa.Column("is_correct", sa.Boolean(), nullable=False, server_default="false"),
            sa.Column("order", sa.Integer(), nullable=False, server_default="0"),
            sa.ForeignKeyConstraint(["question_id"], ["lms_quiz_questions.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_lms_quiz_choices_question", "lms_quiz_choices", ["question_id"])

    existing = _tables()
    if "lms_quiz_attempts" not in existing:
        op.create_table(
            "lms_quiz_attempts",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("quiz_id", sa.Integer(), nullable=False),
            sa.Column("member_id", sa.Integer(), nullable=False),
            sa.Column("started_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("score", sa.Numeric(6, 2), nullable=True),
            sa.Column("passed", sa.Boolean(), nullable=True),
            sa.Column("attempt_number", sa.Integer(), nullable=False, server_default="1"),
            sa.ForeignKeyConstraint(["quiz_id"], ["lms_quizzes.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["member_id"], ["public_members.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_lms_quiz_attempts_quiz_member", "lms_quiz_attempts", ["quiz_id", "member_id"])

    existing = _tables()
    if "lms_quiz_answers" not in existing:
        op.create_table(
            "lms_quiz_answers",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("attempt_id", sa.Integer(), nullable=False),
            sa.Column("question_id", sa.Integer(), nullable=False),
            sa.Column("selected_choice_ids", sa.JSON(), nullable=True),
            sa.Column("text_answer", sa.Text(), nullable=True),
            sa.ForeignKeyConstraint(["attempt_id"], ["lms_quiz_attempts.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["question_id"], ["lms_quiz_questions.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("attempt_id", "question_id", name="uq_lms_quiz_answer_attempt_question"),
        )
        op.create_index("ix_lms_quiz_answers_attempt", "lms_quiz_answers", ["attempt_id"])


def upgrade() -> None:
    _ensure_lms_quiz_tables()

    # Drop old FKs pointing to the events quizzes table
    if _fk_exists("course_modules", "course_modules_quiz_id_fkey"):
        op.drop_constraint("course_modules_quiz_id_fkey", "course_modules", type_="foreignkey")
    if _fk_exists("course_modules", "fk_course_modules_quiz_id"):
        op.drop_constraint("fk_course_modules_quiz_id", "course_modules", type_="foreignkey")

    # Add new FK pointing to lms_quizzes
    if not _fk_exists("course_modules", "fk_course_modules_lms_quiz"):
        op.create_foreign_key(
            "fk_course_modules_lms_quiz",
            "course_modules",
            "lms_quizzes",
            ["quiz_id"],
            ["id"],
            ondelete="SET NULL",
        )


def downgrade() -> None:
    if _fk_exists("course_modules", "fk_course_modules_lms_quiz"):
        op.drop_constraint("fk_course_modules_lms_quiz", "course_modules", type_="foreignkey")

    if not _fk_exists("course_modules", "course_modules_quiz_id_fkey"):
        op.create_foreign_key(
            "course_modules_quiz_id_fkey",
            "course_modules",
            "quizzes",
            ["quiz_id"],
            ["id"],
            ondelete="SET NULL",
        )
