"""Add learning path tables.

Revision ID: 075_learning_paths
Revises: 074_quiz_tables
Create Date: 2026-06-06
"""

from alembic import op
import sqlalchemy as sa

revision = "075_learning_paths"
down_revision = "074_quiz_tables"
branch_labels = None
depends_on = None


def _tables() -> set[str]:
    return set(sa.inspect(op.get_bind()).get_table_names())


def upgrade() -> None:
    existing = _tables()

    if "learning_paths" not in existing:
        op.create_table(
            "learning_paths",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("org_id", sa.Integer(), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False),
            sa.Column("name", sa.String(200), nullable=False),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("thumbnail_url", sa.Text(), nullable=True),
            sa.Column("published", sa.Boolean(), nullable=False, server_default="false"),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        )
        op.create_index("ix_learning_paths_org_id", "learning_paths", ["org_id"])

    if "learning_path_steps" not in existing:
        op.create_table(
            "learning_path_steps",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("path_id", sa.Integer(), sa.ForeignKey("learning_paths.id", ondelete="CASCADE"), nullable=False),
            sa.Column("event_id", sa.Integer(), sa.ForeignKey("events.id", ondelete="CASCADE"), nullable=False),
            sa.Column("order", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("required", sa.Boolean(), nullable=False, server_default="true"),
            sa.Column("min_score_override", sa.Integer(), nullable=True),
            sa.UniqueConstraint("path_id", "event_id", name="uq_lp_step_path_event"),
        )
        op.create_index("ix_lp_steps_path_order", "learning_path_steps", ["path_id", "order"])
        op.create_index("ix_lp_steps_event_id", "learning_path_steps", ["event_id"])

    if "learning_path_enrollments" not in existing:
        op.create_table(
            "learning_path_enrollments",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("path_id", sa.Integer(), sa.ForeignKey("learning_paths.id", ondelete="CASCADE"), nullable=False),
            sa.Column("member_id", sa.Integer(), sa.ForeignKey("public_members.id", ondelete="CASCADE"), nullable=False),
            sa.Column("enrolled_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("progress_pct", sa.Integer(), nullable=False, server_default="0"),
            sa.UniqueConstraint("path_id", "member_id", name="uq_lp_enrollment_path_member"),
        )
        op.create_index("ix_lp_enrollments_path_member", "learning_path_enrollments", ["path_id", "member_id"])

    if "learning_path_step_completions" not in existing:
        op.create_table(
            "learning_path_step_completions",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("enrollment_id", sa.Integer(), sa.ForeignKey("learning_path_enrollments.id", ondelete="CASCADE"), nullable=False),
            sa.Column("step_id", sa.Integer(), sa.ForeignKey("learning_path_steps.id", ondelete="CASCADE"), nullable=False),
            sa.Column("certificate_id", sa.Integer(), sa.ForeignKey("certificates.id", ondelete="SET NULL"), nullable=True),
            sa.Column("completed_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.UniqueConstraint("enrollment_id", "step_id", name="uq_lp_step_completion"),
        )
        op.create_index("ix_lp_step_completions_enrollment_id", "learning_path_step_completions", ["enrollment_id"])


def downgrade() -> None:
    existing = _tables()
    for table in (
        "learning_path_step_completions",
        "learning_path_enrollments",
        "learning_path_steps",
        "learning_paths",
    ):
        if table in existing:
            op.drop_table(table)
