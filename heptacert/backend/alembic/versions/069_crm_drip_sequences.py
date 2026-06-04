"""CRM email drip sequences.

Allows admins to define multi-step email sequences with time delays.
Participants enrolled in a sequence receive emails at configured intervals.

Revision ID: 069_crm_drip_sequences
Revises: 068_soft_delete_users
Create Date: 2026-06-04
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "069_crm_drip_sequences"
down_revision: Union[str, None] = "068_soft_delete_users"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "crm_email_sequences",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("name", sa.String(160), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("active", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("created_by", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "crm_sequence_steps",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("sequence_id", sa.Integer(), sa.ForeignKey("crm_email_sequences.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("step_order", sa.Integer(), nullable=False),
        sa.Column("delay_days", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("email_template_id", sa.Integer(), sa.ForeignKey("email_templates.id", ondelete="SET NULL"), nullable=True),
        sa.Column("subject_override", sa.String(320), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "crm_sequence_enrollments",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("sequence_id", sa.Integer(), sa.ForeignKey("crm_email_sequences.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("email", sa.String(320), nullable=False, index=True),
        sa.Column("enrolled_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("current_step", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("next_send_at", sa.DateTime(timezone=True), nullable=True, index=True),
        sa.Column("status", sa.String(24), nullable=False, server_default="active"),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("unenrolled_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint("sequence_id", "email", name="uq_crm_enrollment_sequence_email"),
    )


def downgrade() -> None:
    op.drop_table("crm_sequence_enrollments")
    op.drop_table("crm_sequence_steps")
    op.drop_table("crm_email_sequences")
