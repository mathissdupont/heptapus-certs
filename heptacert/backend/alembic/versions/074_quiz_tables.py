"""Add quiz engine tables (quizzes, quiz_questions, quiz_choices, quiz_attempts, quiz_answers).

Revision ID: 074_quiz_tables
Revises: 073_api_key_rate_limit
Create Date: 2026-06-06
"""

from alembic import op
import sqlalchemy as sa

revision = "074_quiz_tables"
down_revision = "073_api_key_rate_limit"
branch_labels = None
depends_on = None


def _tables() -> set[str]:
    return set(sa.inspect(op.get_bind()).get_table_names())


def upgrade() -> None:
    existing = _tables()

    if "quizzes" not in existing:
        op.create_table(
            "quizzes",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("event_id", sa.Integer(), sa.ForeignKey("events.id", ondelete="CASCADE"), nullable=False, unique=True),
            sa.Column("title", sa.String(200), nullable=False, server_default="Sınav"),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("passing_score", sa.Integer(), nullable=False, server_default="70"),
            sa.Column("max_attempts", sa.Integer(), nullable=False, server_default="3"),
            sa.Column("time_limit_minutes", sa.Integer(), nullable=True),
            sa.Column("required_for_cert", sa.Boolean(), nullable=False, server_default="true"),
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        )
        op.create_index("ix_quizzes_event_id", "quizzes", ["event_id"])

    if "quiz_questions" not in existing:
        op.create_table(
            "quiz_questions",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("quiz_id", sa.Integer(), sa.ForeignKey("quizzes.id", ondelete="CASCADE"), nullable=False),
            sa.Column("question_text", sa.Text(), nullable=False),
            sa.Column("question_type", sa.String(20), nullable=False, server_default="mcq"),
            sa.Column("order", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("points", sa.Integer(), nullable=False, server_default="1"),
        )
        op.create_index("ix_quiz_questions_quiz_order", "quiz_questions", ["quiz_id", "order"])

    if "quiz_choices" not in existing:
        op.create_table(
            "quiz_choices",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("question_id", sa.Integer(), sa.ForeignKey("quiz_questions.id", ondelete="CASCADE"), nullable=False),
            sa.Column("choice_text", sa.Text(), nullable=False),
            sa.Column("is_correct", sa.Boolean(), nullable=False, server_default="false"),
            sa.Column("order", sa.Integer(), nullable=False, server_default="0"),
        )
        op.create_index("ix_quiz_choices_question_id", "quiz_choices", ["question_id"])

    if "quiz_attempts" not in existing:
        op.create_table(
            "quiz_attempts",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("quiz_id", sa.Integer(), sa.ForeignKey("quizzes.id", ondelete="CASCADE"), nullable=False),
            sa.Column("member_id", sa.Integer(), sa.ForeignKey("public_members.id", ondelete="SET NULL"), nullable=True),
            sa.Column("attendee_name", sa.String(200), nullable=False),
            sa.Column("attendee_email", sa.String(320), nullable=True),
            sa.Column("score", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("passed", sa.Boolean(), nullable=False, server_default="false"),
            sa.Column("attempt_number", sa.Integer(), nullable=False, server_default="1"),
            sa.Column("cert_issued", sa.Boolean(), nullable=False, server_default="false"),
            sa.Column("started_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        )
        op.create_index("ix_quiz_attempts_quiz_id", "quiz_attempts", ["quiz_id"])
        op.create_index("ix_quiz_attempts_quiz_member", "quiz_attempts", ["quiz_id", "member_id"])
        op.create_index("ix_quiz_attempts_quiz_email", "quiz_attempts", ["quiz_id", "attendee_email"])

    if "quiz_answers" not in existing:
        op.create_table(
            "quiz_answers",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("attempt_id", sa.Integer(), sa.ForeignKey("quiz_attempts.id", ondelete="CASCADE"), nullable=False),
            sa.Column("question_id", sa.Integer(), sa.ForeignKey("quiz_questions.id", ondelete="CASCADE"), nullable=False),
            sa.Column("selected_choice_id", sa.Integer(), sa.ForeignKey("quiz_choices.id", ondelete="SET NULL"), nullable=True),
            sa.Column("open_text_answer", sa.Text(), nullable=True),
        )
        op.create_index("ix_quiz_answers_attempt_id", "quiz_answers", ["attempt_id"])
        op.create_index("ix_quiz_answers_question_id", "quiz_answers", ["question_id"])


def downgrade() -> None:
    existing = _tables()
    for table in ("quiz_answers", "quiz_attempts", "quiz_choices", "quiz_questions", "quizzes"):
        if table in existing:
            op.drop_table(table)
