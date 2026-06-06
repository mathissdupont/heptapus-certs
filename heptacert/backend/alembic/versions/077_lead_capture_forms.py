"""Add lead capture form tables.

Revision ID: 077_lead_capture_forms
Revises: 076_crm_accounts
Create Date: 2026-06-06
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision = "077_lead_capture_forms"
down_revision = "076_crm_accounts"
branch_labels = None
depends_on = None


def _tables() -> set[str]:
    return set(sa.inspect(op.get_bind()).get_table_names())


def upgrade() -> None:
    existing = _tables()

    if "lead_capture_forms" not in existing:
        op.create_table(
            "lead_capture_forms",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False),
            sa.Column("name", sa.String(200), nullable=False),
            sa.Column("slug", sa.String(100), nullable=False, unique=True),
            sa.Column("fields_json", JSONB, nullable=False, server_default="[]"),
            sa.Column("destination", sa.String(50), nullable=False, server_default="crm"),
            sa.Column("auto_tag", sa.String(100), nullable=True),
            sa.Column("redirect_url", sa.Text(), nullable=True),
            sa.Column("active", sa.Integer(), nullable=False, server_default="1"),
            sa.Column("submission_count", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        )
        op.create_index("ix_lead_capture_forms_org_id", "lead_capture_forms", ["organization_id"])
        op.create_index("ix_lead_capture_forms_slug", "lead_capture_forms", ["slug"])

    if "lead_capture_submissions" not in existing:
        op.create_table(
            "lead_capture_submissions",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("form_id", sa.Integer(), sa.ForeignKey("lead_capture_forms.id", ondelete="CASCADE"), nullable=False),
            sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False),
            sa.Column("data_json", JSONB, nullable=False, server_default="{}"),
            sa.Column("source_url", sa.Text(), nullable=True),
            sa.Column("utm_source", sa.String(100), nullable=True),
            sa.Column("utm_medium", sa.String(100), nullable=True),
            sa.Column("utm_campaign", sa.String(100), nullable=True),
            sa.Column("ip_addr", sa.String(45), nullable=True),
            sa.Column("submitted_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        )
        op.create_index("ix_lead_capture_submissions_form_id", "lead_capture_submissions", ["form_id"])
        op.create_index("ix_lead_capture_submissions_org_id", "lead_capture_submissions", ["organization_id"])
        op.create_index("ix_lead_capture_submissions_submitted_at", "lead_capture_submissions", ["submitted_at"])


def downgrade() -> None:
    op.drop_table("lead_capture_submissions")
    op.drop_table("lead_capture_forms")
