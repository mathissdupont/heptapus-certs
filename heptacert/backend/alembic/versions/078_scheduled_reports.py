"""Add scheduled reports table.

Revision ID: 078_scheduled_reports
Revises: 077_lead_capture_forms
Create Date: 2026-06-06
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision = "078_scheduled_reports"
down_revision = "077_lead_capture_forms"
branch_labels = None
depends_on = None


def _tables() -> set[str]:
    return set(sa.inspect(op.get_bind()).get_table_names())


def upgrade() -> None:
    existing = _tables()

    if "scheduled_reports" not in existing:
        op.create_table(
            "scheduled_reports",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False),
            sa.Column("name", sa.String(200), nullable=False),
            sa.Column("report_type", sa.String(64), nullable=False),
            sa.Column("filters_json", JSONB, nullable=False, server_default="{}"),
            sa.Column("frequency", sa.String(20), nullable=False, server_default="weekly"),
            sa.Column("recipients_json", JSONB, nullable=False, server_default="[]"),
            sa.Column("active", sa.Integer(), nullable=False, server_default="1"),
            sa.Column("last_run_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("next_run_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("created_by", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        )
        op.create_index("ix_scheduled_reports_org_id", "scheduled_reports", ["organization_id"])
        op.create_index("ix_scheduled_reports_next_run", "scheduled_reports", ["next_run_at"])


def downgrade() -> None:
    op.drop_table("scheduled_reports")
