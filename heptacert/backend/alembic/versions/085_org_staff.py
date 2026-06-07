"""Add org_staff table for org-wide role management and invites.

Revision ID: 085_org_staff
Revises: 084_course_enrollment_status
Create Date: 2026-06-08
"""

from alembic import op
import sqlalchemy as sa

revision = "085_org_staff"
down_revision = "084_course_enrollment_status"
branch_labels = None
depends_on = None


def _tables() -> set[str]:
    return set(sa.inspect(op.get_bind()).get_table_names())


def upgrade() -> None:
    if "org_staff" in _tables():
        return

    op.create_table(
        "org_staff",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("org_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("email", sa.String(320), nullable=False),
        sa.Column("display_name", sa.String(200), nullable=True),
        sa.Column("role", sa.String(50), nullable=False, server_default="viewer"),
        sa.Column("department", sa.String(200), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column(
            "invited_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("joined_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["org_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_org_staff_org_id", "org_staff", ["org_id"])
    op.create_index("ix_org_staff_user_id", "org_staff", ["user_id"])
    op.create_index("ix_org_staff_email", "org_staff", ["email"])


def downgrade() -> None:
    op.drop_index("ix_org_staff_email", table_name="org_staff")
    op.drop_index("ix_org_staff_user_id", table_name="org_staff")
    op.drop_index("ix_org_staff_org_id", table_name="org_staff")
    op.drop_table("org_staff")
