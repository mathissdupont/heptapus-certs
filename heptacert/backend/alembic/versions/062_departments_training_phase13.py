"""Departments and training phase 13 controls.

Revision ID: 062_departments_training_phase13
Revises: 061_segment_export_jobs
Create Date: 2026-06-01
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "062_departments_training_phase13"
down_revision = "061_segment_export_jobs"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "organization_departments",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(length=160), nullable=False),
        sa.Column("code", sa.String(length=80), nullable=True),
        sa.Column("manager_name", sa.String(length=200), nullable=True),
        sa.Column("manager_email", sa.String(length=320), nullable=True),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_by", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("organization_id", "name", name="uq_org_department_name"),
    )
    op.create_index("ix_organization_departments_organization_id", "organization_departments", ["organization_id"])
    op.create_index("ix_organization_departments_active", "organization_departments", ["active"])
    op.create_index("ix_org_departments_org_active", "organization_departments", ["organization_id", "active"])

    op.create_table(
        "training_assignment_templates",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("department_id", sa.Integer(), sa.ForeignKey("organization_departments.id", ondelete="SET NULL"), nullable=True),
        sa.Column("name", sa.String(length=160), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("required", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("default_due_days", sa.Integer(), nullable=False, server_default="30"),
        sa.Column("renewal_interval_days", sa.Integer(), nullable=True),
        sa.Column("notify_before_days", sa.Integer(), nullable=False, server_default="30"),
        sa.Column("approval_required", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_by", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_training_assignment_templates_organization_id", "training_assignment_templates", ["organization_id"])
    op.create_index("ix_training_assignment_templates_department_id", "training_assignment_templates", ["department_id"])
    op.create_index("ix_training_assignment_templates_active", "training_assignment_templates", ["active"])
    op.create_index("ix_training_templates_org_department", "training_assignment_templates", ["organization_id", "department_id"])

    op.create_table(
        "training_recurring_rules",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("template_id", sa.Integer(), sa.ForeignKey("training_assignment_templates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("department_id", sa.Integer(), sa.ForeignKey("organization_departments.id", ondelete="SET NULL"), nullable=True),
        sa.Column("source", sa.String(length=48), nullable=False, server_default="manual"),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("lookback_days", sa.Integer(), nullable=False, server_default="30"),
        sa.Column("last_run_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_training_recurring_rules_organization_id", "training_recurring_rules", ["organization_id"])
    op.create_index("ix_training_recurring_rules_template_id", "training_recurring_rules", ["template_id"])
    op.create_index("ix_training_recurring_rules_department_id", "training_recurring_rules", ["department_id"])
    op.create_index("ix_training_recurring_rules_enabled", "training_recurring_rules", ["enabled"])
    op.create_index("ix_training_recurring_org_enabled", "training_recurring_rules", ["organization_id", "enabled"])

    op.create_table(
        "training_renewal_notification_logs",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("assignment_id", sa.Integer(), sa.ForeignKey("training_assignments.id", ondelete="CASCADE"), nullable=False),
        sa.Column("recipient_email", sa.String(length=320), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="pending"),
        sa.Column("attempts", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("target_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_training_renewal_notification_logs_organization_id", "training_renewal_notification_logs", ["organization_id"])
    op.create_index("ix_training_renewal_notification_logs_assignment_id", "training_renewal_notification_logs", ["assignment_id"])
    op.create_index("ix_training_renewal_notification_logs_recipient_email", "training_renewal_notification_logs", ["recipient_email"])
    op.create_index("ix_training_renewal_notification_logs_status", "training_renewal_notification_logs", ["status"])
    op.create_index("ix_training_notification_assignment_status", "training_renewal_notification_logs", ["assignment_id", "status"])

    op.add_column("training_assignments", sa.Column("department_id", sa.Integer(), nullable=True))
    op.add_column("training_assignments", sa.Column("manager_email", sa.String(length=320), nullable=True))
    op.add_column("training_assignments", sa.Column("approval_status", sa.String(length=32), nullable=False, server_default="not_required"))
    op.add_column("training_assignments", sa.Column("approved_by", sa.Integer(), nullable=True))
    op.add_column("training_assignments", sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("training_assignments", sa.Column("evidence_url", sa.Text(), nullable=True))
    op.add_column("training_assignments", sa.Column("evidence_label", sa.String(length=160), nullable=True))
    op.add_column("training_assignments", sa.Column("template_id", sa.Integer(), nullable=True))
    op.add_column("training_assignments", sa.Column("recurring_rule_id", sa.Integer(), nullable=True))
    op.create_foreign_key("fk_training_assignments_department_id", "training_assignments", "organization_departments", ["department_id"], ["id"], ondelete="SET NULL")
    op.create_foreign_key("fk_training_assignments_approved_by", "training_assignments", "users", ["approved_by"], ["id"], ondelete="SET NULL")
    op.create_foreign_key("fk_training_assignments_template_id", "training_assignments", "training_assignment_templates", ["template_id"], ["id"], ondelete="SET NULL")
    op.create_foreign_key("fk_training_assignments_recurring_rule_id", "training_assignments", "training_recurring_rules", ["recurring_rule_id"], ["id"], ondelete="SET NULL")
    op.create_index("ix_training_assignments_department_id", "training_assignments", ["department_id"])
    op.create_index("ix_training_assignments_manager_email", "training_assignments", ["manager_email"])
    op.create_index("ix_training_assignments_approval_status", "training_assignments", ["approval_status"])
    op.create_index("ix_training_assignments_template_id", "training_assignments", ["template_id"])
    op.create_index("ix_training_assignments_recurring_rule_id", "training_assignments", ["recurring_rule_id"])

    op.add_column("event_automation_rules", sa.Column("trigger_config", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")))


def downgrade() -> None:
    op.drop_column("event_automation_rules", "trigger_config")
    op.drop_index("ix_training_assignments_recurring_rule_id", table_name="training_assignments")
    op.drop_index("ix_training_assignments_template_id", table_name="training_assignments")
    op.drop_index("ix_training_assignments_approval_status", table_name="training_assignments")
    op.drop_index("ix_training_assignments_manager_email", table_name="training_assignments")
    op.drop_index("ix_training_assignments_department_id", table_name="training_assignments")
    op.drop_constraint("fk_training_assignments_recurring_rule_id", "training_assignments", type_="foreignkey")
    op.drop_constraint("fk_training_assignments_template_id", "training_assignments", type_="foreignkey")
    op.drop_constraint("fk_training_assignments_approved_by", "training_assignments", type_="foreignkey")
    op.drop_constraint("fk_training_assignments_department_id", "training_assignments", type_="foreignkey")
    for column in (
        "recurring_rule_id",
        "template_id",
        "evidence_label",
        "evidence_url",
        "approved_at",
        "approved_by",
        "approval_status",
        "manager_email",
        "department_id",
    ):
        op.drop_column("training_assignments", column)
    op.drop_table("training_renewal_notification_logs")
    op.drop_table("training_recurring_rules")
    op.drop_table("training_assignment_templates")
    op.drop_table("organization_departments")
