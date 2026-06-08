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


def upgrade() -> None:
    # Drop old FK pointing to events quizzes table
    if _fk_exists("course_modules", "course_modules_quiz_id_fkey"):
        op.drop_constraint("course_modules_quiz_id_fkey", "course_modules", type_="foreignkey")

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
