"""Add organization training assignments.

Revision ID: 052_training_assignments
Revises: 051_org_access_reservations
Create Date: 2026-05-31
"""

from alembic import op
import sqlalchemy as sa


revision = "052_training_assignments"
down_revision = "051_org_access_reservations"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "training_assignments",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("event_id", sa.Integer(), sa.ForeignKey("events.id", ondelete="SET NULL"), nullable=True),
        sa.Column("renewal_event_id", sa.Integer(), sa.ForeignKey("events.id", ondelete="SET NULL"), nullable=True),
        sa.Column("certificate_id", sa.Integer(), sa.ForeignKey("certificates.id", ondelete="SET NULL"), nullable=True),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("assignee_name", sa.String(length=200), nullable=False),
        sa.Column("assignee_email", sa.String(length=320), nullable=False),
        sa.Column("department", sa.String(length=160), nullable=True),
        sa.Column("required", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="assigned"),
        sa.Column("due_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("renewal_due_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("notify_before_days", sa.Integer(), nullable=False, server_default="30"),
        sa.Column("last_notified_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_training_assignments_organization_id", "training_assignments", ["organization_id"])
    op.create_index("ix_training_assignments_event_id", "training_assignments", ["event_id"])
    op.create_index("ix_training_assignments_renewal_event_id", "training_assignments", ["renewal_event_id"])
    op.create_index("ix_training_assignments_certificate_id", "training_assignments", ["certificate_id"])
    op.create_index("ix_training_assignments_assignee_email", "training_assignments", ["assignee_email"])
    op.create_index("ix_training_assignments_department", "training_assignments", ["department"])
    op.create_index("ix_training_assignments_required", "training_assignments", ["required"])
    op.create_index("ix_training_assignments_status", "training_assignments", ["status"])
    op.create_index("ix_training_assignments_due_at", "training_assignments", ["due_at"])
    op.create_index("ix_training_assignments_renewal_due_at", "training_assignments", ["renewal_due_at"])
    op.create_index("ix_training_assignments_org_status", "training_assignments", ["organization_id", "status"])
    op.create_index("ix_training_assignments_org_department", "training_assignments", ["organization_id", "department"])
    op.create_index("ix_training_assignments_org_renewal", "training_assignments", ["organization_id", "renewal_due_at"])


def downgrade() -> None:
    op.drop_index("ix_training_assignments_org_renewal", table_name="training_assignments")
    op.drop_index("ix_training_assignments_org_department", table_name="training_assignments")
    op.drop_index("ix_training_assignments_org_status", table_name="training_assignments")
    op.drop_index("ix_training_assignments_renewal_due_at", table_name="training_assignments")
    op.drop_index("ix_training_assignments_due_at", table_name="training_assignments")
    op.drop_index("ix_training_assignments_status", table_name="training_assignments")
    op.drop_index("ix_training_assignments_required", table_name="training_assignments")
    op.drop_index("ix_training_assignments_department", table_name="training_assignments")
    op.drop_index("ix_training_assignments_assignee_email", table_name="training_assignments")
    op.drop_index("ix_training_assignments_certificate_id", table_name="training_assignments")
    op.drop_index("ix_training_assignments_renewal_event_id", table_name="training_assignments")
    op.drop_index("ix_training_assignments_event_id", table_name="training_assignments")
    op.drop_index("ix_training_assignments_organization_id", table_name="training_assignments")
    op.drop_table("training_assignments")
