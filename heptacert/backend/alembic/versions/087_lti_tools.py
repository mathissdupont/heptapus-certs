"""Add lti_tools table for LTI 1.1/1.3 external tool integration.

Revision ID: 087_lti_tools
Revises: 086_course_marketplace
Create Date: 2026-06-08
"""

from alembic import op
import sqlalchemy as sa

revision = "087_lti_tools"
down_revision = "086_course_marketplace"
branch_labels = None
depends_on = None


def _tables() -> set[str]:
    return set(sa.inspect(op.get_bind()).get_table_names())


def upgrade() -> None:
    if "lti_tools" not in _tables():
        op.create_table(
            "lti_tools",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("org_id", sa.Integer(), nullable=False),
            sa.Column("name", sa.String(200), nullable=False),
            sa.Column("launch_url", sa.Text(), nullable=False),
            sa.Column("consumer_key", sa.String(500), nullable=True),
            sa.Column("shared_secret", sa.String(500), nullable=True),
            sa.Column("custom_params_json", sa.Text(), nullable=True),
            sa.Column("provider", sa.String(20), nullable=False, server_default="lti_1_1"),
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.ForeignKeyConstraint(["org_id"], ["organizations.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_lti_tools_org_id", "lti_tools", ["org_id"])

    # Add lti_tool_id column to course_modules
    existing_cols = {c["name"] for c in sa.inspect(op.get_bind()).get_columns("course_modules")}
    if "lti_tool_id" not in existing_cols:
        with op.batch_alter_table("course_modules") as batch_op:
            batch_op.add_column(sa.Column("lti_tool_id", sa.Integer(), nullable=True))
            batch_op.add_column(sa.Column("lti_custom_params", sa.Text(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("course_modules") as batch_op:
        batch_op.drop_column("lti_custom_params")
        batch_op.drop_column("lti_tool_id")
    op.drop_index("ix_lti_tools_org_id", table_name="lti_tools")
    op.drop_table("lti_tools")
