"""Create email system tables for templates and bulk operations.

Revision ID: 008emailsystem
Revises: 007txdesc
Create Date: 2026-03-02
"""
from __future__ import annotations
from alembic import op
import sqlalchemy as sa

revision: str = "008emailsystem"
down_revision = "007txdesc"
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = inspector.get_table_names()

    # Create user_email_configs table - User's SMTP settings
    if "user_email_configs" not in existing_tables:
        op.create_table(
            "user_email_configs",
            sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
            sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True),
            sa.Column("smtp_enabled", sa.Boolean, default=False),
            sa.Column("from_name", sa.String(100), nullable=True),
            sa.Column("reply_to", sa.String(255), nullable=True),
            sa.Column("auto_cc", sa.String(255), nullable=True),
            sa.Column("enable_tracking_pixel", sa.Boolean, default=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
        )
        op.create_index("ix_user_email_user_id", "user_email_configs", ["user_id"])

    # Create certificate_templates table - Predefined cert design templates
    if "certificate_templates" not in existing_tables:
        op.create_table(
            "certificate_templates",
            sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
            sa.Column("name", sa.String(200), nullable=False),
            sa.Column("template_image_url", sa.Text, nullable=False),
            sa.Column("config", sa.JSON, default=dict),
            sa.Column("is_default", sa.Boolean, default=True),
            sa.Column("order_index", sa.Integer, default=0),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        )
        op.create_index("ix_cert_template_default", "certificate_templates", ["is_default"])

    # Create email_templates table - Email template library
    if "email_templates" not in existing_tables:
        op.create_table(
            "email_templates",
            sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
            sa.Column("event_id", sa.Integer, sa.ForeignKey("events.id", ondelete="CASCADE"), nullable=True),
            sa.Column("created_by", sa.Integer, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
            sa.Column("name", sa.String(200), nullable=False),
            sa.Column("subject_tr", sa.String(255), nullable=False),
            sa.Column("subject_en", sa.String(255), nullable=False),
            sa.Column("body_html", sa.Text, nullable=False),
            sa.Column("template_type", sa.String(50), default="custom"),  # system or custom
            sa.Column("is_default", sa.Boolean, default=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
        )
        op.create_index("ix_email_template_event", "email_templates", ["event_id"])
        op.create_index("ix_email_template_creator", "email_templates", ["created_by"])

    # Create bulk_email_jobs table - Track bulk email operations
    if "bulk_email_jobs" not in existing_tables:
        op.create_table(
            "bulk_email_jobs",
            sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
            sa.Column("event_id", sa.Integer, sa.ForeignKey("events.id", ondelete="CASCADE"), nullable=False),
            sa.Column("created_by", sa.Integer, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
            sa.Column("email_template_id", sa.Integer, sa.ForeignKey("email_templates.id", ondelete="SET NULL"), nullable=True),
            sa.Column("recipients_count", sa.Integer, default=0),
            sa.Column("sent_count", sa.Integer, default=0),
            sa.Column("failed_count", sa.Integer, default=0),
            sa.Column("status", sa.String(50), default="pending"),  # pending | sending | completed | failed
            sa.Column("error_message", sa.Text, nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        )
        op.create_index("ix_bulk_email_event", "bulk_email_jobs", ["event_id"])
        op.create_index("ix_bulk_email_creator", "bulk_email_jobs", ["created_by"])

    # Add columns to events table for email settings
    if "events" in existing_tables:
        columns = [col["name"] for col in inspector.get_columns("events")]
        if "auto_email_on_cert" not in columns:
            op.add_column("events", sa.Column("auto_email_on_cert", sa.Boolean, default=False))
        if "cert_email_template_id" not in columns:
            op.add_column("events", sa.Column("cert_email_template_id", sa.Integer, nullable=True))


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    # Drop new tables
    if "bulk_email_jobs" in inspector.get_table_names():
        op.drop_table("bulk_email_jobs")

    if "email_templates" in inspector.get_table_names():
        op.drop_table("email_templates")

    if "certificate_templates" in inspector.get_table_names():
        op.drop_table("certificate_templates")

    if "user_email_configs" in inspector.get_table_names():
        op.drop_table("user_email_configs")

    # Drop columns from events table
    if "events" in inspector.get_table_names():
        columns = [col["name"] for col in inspector.get_columns("events")]
        if "auto_email_on_cert" in columns:
            op.drop_column("events", "auto_email_on_cert")
        if "cert_email_template_id" in columns:
            op.drop_column("events", "cert_email_template_id")
