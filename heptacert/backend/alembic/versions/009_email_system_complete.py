"""Complete email system with SMTP config, scheduling, tracking, webhooks.

Revision ID: 009emailcomplete
Revises: 008emailsystem
Create Date: 2026-03-02
"""
from __future__ import annotations
from alembic import op
import sqlalchemy as sa

revision: str = "009emailcomplete"
down_revision = "008emailsystem"
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = inspector.get_table_names()
    
    # ─ Enhance existing tables ─────────────────────────────────────────────
    
    if "user_email_configs" in existing_tables:
        columns = [col["name"] for col in inspector.get_columns("user_email_configs")]
        if "smtp_last_tested_at" not in columns:
            op.add_column("user_email_configs", sa.Column("smtp_last_tested_at", sa.DateTime(timezone=True), nullable=True))
        if "auto_retry_failed" not in columns:
            op.add_column("user_email_configs", sa.Column("auto_retry_failed", sa.Boolean, default=True))
    
    if "email_templates" in existing_tables:
        columns = [col["name"] for col in inspector.get_columns("email_templates")]
        if "subject_es" not in columns:
            op.add_column("email_templates", sa.Column("subject_es", sa.String(255), nullable=True))
        if "body_html_es" not in columns:
            op.add_column("email_templates", sa.Column("body_html_es", sa.Text, nullable=True))
        if "subject_fr" not in columns:
            op.add_column("email_templates", sa.Column("subject_fr", sa.String(255), nullable=True))
        if "body_html_fr" not in columns:
            op.add_column("email_templates", sa.Column("body_html_fr", sa.Text, nullable=True))
        if "template_category" not in columns:
            op.add_column("email_templates", sa.Column("template_category", sa.String(50), default="custom"))
        if "version" not in columns:
            op.add_column("email_templates", sa.Column("version", sa.Integer, default=1))
        if "parent_template_id" not in columns:
            op.add_column("email_templates", sa.Column("parent_template_id", sa.Integer, nullable=True))
    
    if "attendees" in existing_tables:
        columns = [col["name"] for col in inspector.get_columns("attendees")]
        if "unsubscribed_at" not in columns:
            op.add_column("attendees", sa.Column("unsubscribed_at", sa.DateTime(timezone=True), nullable=True))
        if "preferred_language" not in columns:
            op.add_column("attendees", sa.Column("preferred_language", sa.String(10), default="tr"))
    
    if "bulk_email_jobs" in existing_tables:
        columns = [col["name"] for col in inspector.get_columns("bulk_email_jobs")]
        if "scheduled_at" not in columns:
            op.add_column("bulk_email_jobs", sa.Column("scheduled_at", sa.DateTime(timezone=True), nullable=True))
        if "scheduled_send_status" not in columns:
            op.add_column("bulk_email_jobs", sa.Column("scheduled_send_status", sa.String(50), default="pending"))
        if "total_recipients" not in columns:
            op.add_column("bulk_email_jobs", sa.Column("total_recipients", sa.Integer, default=0))
        if "bounced_count" not in columns:
            op.add_column("bulk_email_jobs", sa.Column("bounced_count", sa.Integer, default=0))
        if "failed_count" not in columns:
            op.add_column("bulk_email_jobs", sa.Column("failed_count", sa.Integer, default=0))
        if "opened_count" not in columns:
            op.add_column("bulk_email_jobs", sa.Column("opened_count", sa.Integer, default=0))
    
    # ─ Create new tables ─────────────────────────────────────────────────
    
    if "email_delivery_logs" not in existing_tables:
        op.create_table(
            "email_delivery_logs",
            sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
            sa.Column("bulk_job_id", sa.Integer, sa.ForeignKey("bulk_email_jobs.id", ondelete="CASCADE"), nullable=False),
            sa.Column("attendee_id", sa.Integer, sa.ForeignKey("attendees.id", ondelete="CASCADE"), nullable=False),
            sa.Column("recipient_email", sa.String(255), nullable=False),
            sa.Column("status", sa.String(50), default="pending"),  # pending, sent, bounced, failed, opened
            sa.Column("reason", sa.Text, nullable=True),
            sa.Column("sent_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.Column("opened_at", sa.DateTime(timezone=True), nullable=True),
        )
        op.create_index("ix_delivery_log_bulk_job", "email_delivery_logs", ["bulk_job_id"])
        op.create_index("ix_delivery_log_attendee", "email_delivery_logs", ["attendee_id"])
        op.create_index("ix_delivery_log_status", "email_delivery_logs", ["status"])
    
    if "webhook_subscriptions" not in existing_tables:
        op.create_table(
            "webhook_subscriptions",
            sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
            sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
            sa.Column("event_type", sa.String(50), nullable=False),  # email.sent, email.failed, email.bounced, email.opened
            sa.Column("url", sa.Text, nullable=False),
            sa.Column("secret", sa.String(255), nullable=True),
            sa.Column("is_active", sa.Boolean, default=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        )
        op.create_index("ix_webhook_user", "webhook_subscriptions", ["user_id"])
        op.create_index("ix_webhook_event", "webhook_subscriptions", ["event_type"])
    
    if "webhook_logs" not in existing_tables:
        op.create_table(
            "webhook_logs",
            sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
            sa.Column("webhook_id", sa.Integer, sa.ForeignKey("webhook_subscriptions.id", ondelete="CASCADE"), nullable=False),
            sa.Column("event_type", sa.String(50), nullable=False),
            sa.Column("payload", sa.JSON, nullable=True),
            sa.Column("http_status", sa.Integer, nullable=True),
            sa.Column("error_message", sa.Text, nullable=True),
            sa.Column("sent_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        )
        op.create_index("ix_webhook_log_webhook", "webhook_logs", ["webhook_id"])
        op.create_index("ix_webhook_log_sent", "webhook_logs", ["sent_at"])


def downgrade() -> None:
    op.drop_index("ix_webhook_log_sent")
    op.drop_index("ix_webhook_log_webhook")
    op.drop_table("webhook_logs")
    
    op.drop_index("ix_webhook_event")
    op.drop_index("ix_webhook_user")
    op.drop_table("webhook_subscriptions")
    
    op.drop_index("ix_delivery_log_status")
    op.drop_index("ix_delivery_log_attendee")
    op.drop_index("ix_delivery_log_bulk_job")
    op.drop_table("email_delivery_logs")
    
    # Remove columns from existing tables
    inspector = sa.inspect(sa.text("SELECT 1"))
    
    op.drop_column("bulk_email_jobs", "opened_count", if_exists=True)
    op.drop_column("bulk_email_jobs", "failed_count", if_exists=True)
    op.drop_column("bulk_email_jobs", "bounced_count", if_exists=True)
    op.drop_column("bulk_email_jobs", "total_recipients", if_exists=True)
    op.drop_column("bulk_email_jobs", "scheduled_send_status", if_exists=True)
    op.drop_column("bulk_email_jobs", "scheduled_at", if_exists=True)
    
    op.drop_column("attendees", "preferred_language", if_exists=True)
    op.drop_column("attendees", "unsubscribed_at", if_exists=True)
    
    op.drop_column("email_templates", "parent_template_id", if_exists=True)
    op.drop_column("email_templates", "version", if_exists=True)
    op.drop_column("email_templates", "template_category", if_exists=True)
    op.drop_column("email_templates", "body_html_fr", if_exists=True)
    op.drop_column("email_templates", "subject_fr", if_exists=True)
    op.drop_column("email_templates", "body_html_es", if_exists=True)
    op.drop_column("email_templates", "subject_es", if_exists=True)
    
    op.drop_column("user_email_configs", "auto_retry_failed", if_exists=True)
    op.drop_column("user_email_configs", "smtp_last_tested_at", if_exists=True)
