"""Check-in operations and wallet/template phase 14-15 controls.

Revision ID: 063_checkin_wallet_template_phase14_15
Revises: 062_departments_training_phase13
Create Date: 2026-06-02
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "063_checkin_wallet_template_phase14_15"
down_revision = "062_departments_training_phase13"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("event_sessions", sa.Column("capacity", sa.Integer(), nullable=True))
    op.add_column("event_sessions", sa.Column("capacity_alert_threshold", sa.Integer(), nullable=False, server_default="90"))

    op.add_column("checkin_activity_logs", sa.Column("entry_point", sa.String(length=48), nullable=False, server_default="admin"))
    op.add_column("checkin_activity_logs", sa.Column("duplicate", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("checkin_activity_logs", sa.Column("invalid_reason", sa.String(length=120), nullable=True))
    op.create_index("ix_checkin_activity_logs_entry_point", "checkin_activity_logs", ["entry_point"])
    op.create_index("ix_checkin_activity_logs_duplicate", "checkin_activity_logs", ["duplicate"])
    op.create_index("ix_checkin_activity_logs_invalid_reason", "checkin_activity_logs", ["invalid_reason"])

    op.create_table(
        "checkin_kiosk_sessions",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("event_id", sa.Integer(), sa.ForeignKey("events.id", ondelete="CASCADE"), nullable=False),
        sa.Column("session_id", sa.Integer(), sa.ForeignKey("event_sessions.id", ondelete="SET NULL"), nullable=True),
        sa.Column("token_hash", sa.String(length=128), nullable=False, unique=True),
        sa.Column("label", sa.String(length=120), nullable=False, server_default="Kiosk"),
        sa.Column("created_by", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_checkin_kiosk_sessions_event_id", "checkin_kiosk_sessions", ["event_id"])
    op.create_index("ix_checkin_kiosk_sessions_session_id", "checkin_kiosk_sessions", ["session_id"])
    op.create_index("ix_checkin_kiosk_sessions_token_hash", "checkin_kiosk_sessions", ["token_hash"], unique=True)
    op.create_index("ix_checkin_kiosk_sessions_expires_at", "checkin_kiosk_sessions", ["expires_at"])
    op.create_index("ix_checkin_kiosk_sessions_revoked_at", "checkin_kiosk_sessions", ["revoked_at"])

    op.create_table(
        "checkin_nonces",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("event_id", sa.Integer(), sa.ForeignKey("events.id", ondelete="CASCADE"), nullable=False),
        sa.Column("nonce", sa.String(length=96), nullable=False, unique=True),
        sa.Column("actor_user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("kiosk_session_id", sa.Integer(), sa.ForeignKey("checkin_kiosk_sessions.id", ondelete="SET NULL"), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_checkin_nonces_event_id", "checkin_nonces", ["event_id"])
    op.create_index("ix_checkin_nonces_nonce", "checkin_nonces", ["nonce"], unique=True)
    op.create_index("ix_checkin_nonces_actor_user_id", "checkin_nonces", ["actor_user_id"])
    op.create_index("ix_checkin_nonces_kiosk_session_id", "checkin_nonces", ["kiosk_session_id"])
    op.create_index("ix_checkin_nonces_expires_at", "checkin_nonces", ["expires_at"])
    op.create_index("ix_checkin_nonces_used_at", "checkin_nonces", ["used_at"])

    op.create_table(
        "wallet_analytics_events",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("public_member_id", sa.Integer(), sa.ForeignKey("public_members.id", ondelete="SET NULL"), nullable=True),
        sa.Column("certificate_id", sa.Integer(), sa.ForeignKey("certificates.id", ondelete="SET NULL"), nullable=True),
        sa.Column("event_type", sa.String(length=48), nullable=False),
        sa.Column("source", sa.String(length=48), nullable=False, server_default="public"),
        sa.Column("ip_address", sa.String(length=45), nullable=True),
        sa.Column("user_agent", sa.Text(), nullable=True),
        sa.Column("metadata_json", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_wallet_analytics_events_public_member_id", "wallet_analytics_events", ["public_member_id"])
    op.create_index("ix_wallet_analytics_events_certificate_id", "wallet_analytics_events", ["certificate_id"])
    op.create_index("ix_wallet_analytics_events_event_type", "wallet_analytics_events", ["event_type"])
    op.create_index("ix_wallet_analytics_events_source", "wallet_analytics_events", ["source"])
    op.create_index("ix_wallet_analytics_events_created_at", "wallet_analytics_events", ["created_at"])
    op.create_index("ix_wallet_analytics_member_event_created", "wallet_analytics_events", ["public_member_id", "event_type", "created_at"])

    op.create_table(
        "wallet_privacy_audit_logs",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("public_member_id", sa.Integer(), sa.ForeignKey("public_members.id", ondelete="CASCADE"), nullable=False),
        sa.Column("actor_public_member_id", sa.Integer(), sa.ForeignKey("public_members.id", ondelete="SET NULL"), nullable=True),
        sa.Column("action", sa.String(length=64), nullable=False),
        sa.Column("before", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("after", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("ip_address", sa.String(length=45), nullable=True),
        sa.Column("user_agent", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_wallet_privacy_audit_logs_public_member_id", "wallet_privacy_audit_logs", ["public_member_id"])
    op.create_index("ix_wallet_privacy_audit_logs_actor_public_member_id", "wallet_privacy_audit_logs", ["actor_public_member_id"])
    op.create_index("ix_wallet_privacy_audit_logs_action", "wallet_privacy_audit_logs", ["action"])
    op.create_index("ix_wallet_privacy_audit_logs_created_at", "wallet_privacy_audit_logs", ["created_at"])

    op.create_table(
        "certificate_share_caches",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("certificate_id", sa.Integer(), sa.ForeignKey("certificates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("cache_key", sa.String(length=160), nullable=False, unique=True),
        sa.Column("image_path", sa.Text(), nullable=True),
        sa.Column("version_hash", sa.String(length=128), nullable=False),
        sa.Column("invalidated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_certificate_share_caches_certificate_id", "certificate_share_caches", ["certificate_id"])
    op.create_index("ix_certificate_share_caches_cache_key", "certificate_share_caches", ["cache_key"], unique=True)
    op.create_index("ix_certificate_share_caches_version_hash", "certificate_share_caches", ["version_hash"])

    op.add_column("certificate_template_presets", sa.Column("min_plan", sa.String(length=32), nullable=False, server_default="growth"))
    op.add_column("certificate_template_presets", sa.Column("enterprise_locked", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("certificate_template_presets", sa.Column("version", sa.Integer(), nullable=False, server_default="1"))
    op.add_column("certificate_template_presets", sa.Column("locked_by", sa.Integer(), nullable=True))
    op.create_foreign_key("fk_template_presets_locked_by", "certificate_template_presets", "users", ["locked_by"], ["id"], ondelete="SET NULL")
    op.create_index("ix_certificate_template_presets_min_plan", "certificate_template_presets", ["min_plan"])
    op.create_index("ix_certificate_template_presets_enterprise_locked", "certificate_template_presets", ["enterprise_locked"])

    op.create_table(
        "certificate_template_preset_versions",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("preset_id", sa.String(length=64), sa.ForeignKey("certificate_template_presets.id", ondelete="CASCADE"), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("template_image_url", sa.Text(), nullable=True),
        sa.Column("config", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("created_by", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("preset_id", "version", name="uq_template_preset_version"),
    )
    op.create_index("ix_certificate_template_preset_versions_preset_id", "certificate_template_preset_versions", ["preset_id"])
    op.create_index("ix_certificate_template_preset_versions_version", "certificate_template_preset_versions", ["version"])

    op.create_table(
        "certificate_template_regression_snapshots",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("preset_id", sa.String(length=64), sa.ForeignKey("certificate_template_presets.id", ondelete="CASCADE"), nullable=False),
        sa.Column("scenario", sa.String(length=80), nullable=False),
        sa.Column("render_hash", sa.String(length=128), nullable=False),
        sa.Column("payload", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_certificate_template_regression_snapshots_preset_id", "certificate_template_regression_snapshots", ["preset_id"])
    op.create_index("ix_certificate_template_regression_snapshots_scenario", "certificate_template_regression_snapshots", ["scenario"])


def downgrade() -> None:
    op.drop_table("certificate_template_regression_snapshots")
    op.drop_table("certificate_template_preset_versions")
    op.drop_index("ix_certificate_template_presets_enterprise_locked", table_name="certificate_template_presets")
    op.drop_index("ix_certificate_template_presets_min_plan", table_name="certificate_template_presets")
    op.drop_constraint("fk_template_presets_locked_by", "certificate_template_presets", type_="foreignkey")
    for column in ("locked_by", "version", "enterprise_locked", "min_plan"):
        op.drop_column("certificate_template_presets", column)
    op.drop_table("certificate_share_caches")
    op.drop_table("wallet_privacy_audit_logs")
    op.drop_table("wallet_analytics_events")
    op.drop_table("checkin_nonces")
    op.drop_table("checkin_kiosk_sessions")
    op.drop_index("ix_checkin_activity_logs_invalid_reason", table_name="checkin_activity_logs")
    op.drop_index("ix_checkin_activity_logs_duplicate", table_name="checkin_activity_logs")
    op.drop_index("ix_checkin_activity_logs_entry_point", table_name="checkin_activity_logs")
    for column in ("invalid_reason", "duplicate", "entry_point"):
        op.drop_column("checkin_activity_logs", column)
    op.drop_column("event_sessions", "capacity_alert_threshold")
    op.drop_column("event_sessions", "capacity")
