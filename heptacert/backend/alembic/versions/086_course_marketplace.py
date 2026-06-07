"""Add marketplace columns to training_courses.

Revision ID: 086_course_marketplace
Revises: 085_org_staff
Create Date: 2026-06-08
"""

from alembic import op
import sqlalchemy as sa

revision = "086_course_marketplace"
down_revision = "085_org_staff"
branch_labels = None
depends_on = None


def _columns(table: str) -> set[str]:
    return {c["name"] for c in sa.inspect(op.get_bind()).get_columns(table)}


def upgrade() -> None:
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


def downgrade() -> None:
    with op.batch_alter_table("training_courses") as batch_op:
        batch_op.drop_column("preview_video_url")
        batch_op.drop_column("marketplace_description")
        batch_op.drop_column("marketplace_price")
        batch_op.drop_column("is_marketplace_listed")
