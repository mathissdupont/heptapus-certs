"""Add queued document export jobs.

Revision ID: 067_document_export_jobs
Revises: 066_fix_heptacoin_balance_column
Create Date: 2026-06-03
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "067_document_export_jobs"
down_revision: Union[str, None] = "066_fix_heptacoin_balance_column"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "document_export_jobs" in inspector.get_table_names():
        return

    json_type = postgresql.JSONB(astext_type=sa.Text()) if bind.dialect.name == "postgresql" else sa.JSON()
    op.create_table(
        "document_export_jobs",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("export_type", sa.String(length=64), nullable=False),
        sa.Column("export_format", sa.String(length=12), nullable=False, server_default="pdf"),
        sa.Column("requested_by", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id", ondelete="SET NULL"), nullable=True),
        sa.Column("filters", json_type, nullable=False, server_default=sa.text("'{}'::jsonb") if bind.dialect.name == "postgresql" else None),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="pending"),
        sa.Column("row_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("output_file_path", sa.Text(), nullable=True),
        sa.Column("output_filename", sa.String(length=255), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("email_sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_document_export_jobs_export_type", "document_export_jobs", ["export_type"])
    op.create_index("ix_document_export_jobs_requested_by", "document_export_jobs", ["requested_by"])
    op.create_index("ix_document_export_jobs_organization_id", "document_export_jobs", ["organization_id"])
    op.create_index("ix_document_export_jobs_status", "document_export_jobs", ["status"])


def downgrade() -> None:
    bind = op.get_bind()
    if "document_export_jobs" not in sa.inspect(bind).get_table_names():
        return
    op.drop_index("ix_document_export_jobs_status", table_name="document_export_jobs")
    op.drop_index("ix_document_export_jobs_organization_id", table_name="document_export_jobs")
    op.drop_index("ix_document_export_jobs_requested_by", table_name="document_export_jobs")
    op.drop_index("ix_document_export_jobs_export_type", table_name="document_export_jobs")
    op.drop_table("document_export_jobs")

