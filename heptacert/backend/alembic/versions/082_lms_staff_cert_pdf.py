"""Add OrgLmsStaff table and cert_pdf_url to LMS enrollment tables.

Revision ID: 082_lms_staff_cert_pdf
Revises: 081_lms_tables
Create Date: 2026-06-07
"""

from alembic import op
import sqlalchemy as sa

revision = "082_lms_staff_cert_pdf"
down_revision = "081_lms_tables"
branch_labels = None
depends_on = None


def _tables() -> set[str]:
    return set(sa.inspect(op.get_bind()).get_table_names())


def upgrade() -> None:
    existing = _tables()

    # cert_pdf_url on course_enrollments
    if "course_enrollments" in existing:
        cols = {c["name"] for c in sa.inspect(op.get_bind()).get_columns("course_enrollments")}
        if "cert_pdf_url" not in cols:
            with op.batch_alter_table("course_enrollments") as batch_op:
                batch_op.add_column(sa.Column("cert_pdf_url", sa.Text(), nullable=True))

    # cert_pdf_url on lms_journey_enrollments (only if the table was created by 081)
    if "lms_journey_enrollments" in existing:
        cols = {c["name"] for c in sa.inspect(op.get_bind()).get_columns("lms_journey_enrollments")}
        if "cert_pdf_url" not in cols:
            with op.batch_alter_table("lms_journey_enrollments") as batch_op:
                batch_op.add_column(sa.Column("cert_pdf_url", sa.Text(), nullable=True))

    # org_lms_staff table
    if "org_lms_staff" not in existing:
        op.create_table(
            "org_lms_staff",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("org_id", sa.Integer(), nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("role", sa.String(50), nullable=False, server_default="instructor"),
            sa.Column("course_id", sa.Integer(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.ForeignKeyConstraint(["org_id"], ["organizations.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["course_id"], ["training_courses.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("org_id", "user_id", "course_id", name="uq_org_lms_staff"),
        )
        op.create_index("ix_org_lms_staff_org", "org_lms_staff", ["org_id"])
        op.create_index("ix_org_lms_staff_user", "org_lms_staff", ["user_id"])


def downgrade() -> None:
    op.drop_table("org_lms_staff")
    with op.batch_alter_table("lms_journey_enrollments") as batch_op:
        batch_op.drop_column("cert_pdf_url")
    with op.batch_alter_table("course_enrollments") as batch_op:
        batch_op.drop_column("cert_pdf_url")
