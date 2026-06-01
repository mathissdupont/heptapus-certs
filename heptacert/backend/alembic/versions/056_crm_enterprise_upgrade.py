"""Add CRM enterprise fields, snapshots, and audit logs.

Revision ID: 056_crm_enterprise_upgrade
Revises: 055_product_query_indexes
Create Date: 2026-06-01
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB


revision = "056_crm_enterprise_upgrade"
down_revision = "055_product_query_indexes"
branch_labels = None
depends_on = None


def _json_type():
    return sa.JSON().with_variant(JSONB(), "postgresql")


def _tables() -> set[str]:
    return set(sa.inspect(op.get_bind()).get_table_names())


def _columns(table_name: str) -> set[str]:
    return {item["name"] for item in sa.inspect(op.get_bind()).get_columns(table_name)}


def _indexes(table_name: str) -> set[str]:
    return {item["name"] for item in sa.inspect(op.get_bind()).get_indexes(table_name)}


def _add_column(table_name: str, column: sa.Column, tables: set[str]) -> None:
    if table_name in tables and column.name not in _columns(table_name):
        op.add_column(table_name, column)


def _create_index(name: str, table_name: str, columns: list[str], tables: set[str]) -> None:
    if table_name in tables and name not in _indexes(table_name):
        op.create_index(name, table_name, columns)


def upgrade() -> None:
    json_type = _json_type()
    tables = _tables()

    _add_column("participant_crm_profiles", sa.Column("owner_user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True), tables)
    _add_column("participant_crm_profiles", sa.Column("priority", sa.String(length=32), nullable=False, server_default="normal"), tables)
    _add_column("participant_crm_profiles", sa.Column("lead_score", sa.Integer(), nullable=False, server_default="0"), tables)
    _add_column("participant_crm_profiles", sa.Column("next_follow_up_at", sa.DateTime(timezone=True), nullable=True), tables)
    _add_column("participant_crm_profiles", sa.Column("custom_fields", json_type, nullable=False, server_default="{}"), tables)

    for name, columns in [
        ("ix_participant_crm_profiles_owner_user_id", ["owner_user_id"]),
        ("ix_participant_crm_profiles_priority", ["priority"]),
        ("ix_participant_crm_profiles_lead_score", ["lead_score"]),
        ("ix_participant_crm_profiles_next_follow_up_at", ["next_follow_up_at"]),
        ("ix_participant_crm_org_priority", ["organization_id", "priority"]),
        ("ix_participant_crm_org_follow_up", ["organization_id", "next_follow_up_at"]),
    ]:
        _create_index(name, "participant_crm_profiles", columns, tables)

    if "participant_crm_snapshots" not in tables:
        op.create_table(
            "participant_crm_snapshots",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False),
            sa.Column("email", sa.String(length=320), nullable=False),
            sa.Column("name", sa.String(length=200), nullable=True),
            sa.Column("event_count", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("certificate_count", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("attended_count", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("survey_count", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("ticket_count", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("latest_activity_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("computed_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.UniqueConstraint("organization_id", "email", name="uq_participant_crm_snapshot_org_email"),
        )
        tables.add("participant_crm_snapshots")
    for name, columns in [
        ("ix_participant_crm_snapshots_organization_id", ["organization_id"]),
        ("ix_participant_crm_snapshots_email", ["email"]),
        ("ix_participant_crm_snapshots_latest_activity_at", ["latest_activity_at"]),
        ("ix_participant_crm_snapshot_org_latest", ["organization_id", "latest_activity_at"]),
    ]:
        _create_index(name, "participant_crm_snapshots", columns, tables)

    if "participant_crm_audit_logs" not in tables:
        op.create_table(
            "participant_crm_audit_logs",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False),
            sa.Column("email", sa.String(length=320), nullable=False),
            sa.Column("actor_user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
            sa.Column("action", sa.String(length=64), nullable=False),
            sa.Column("before", json_type, nullable=True),
            sa.Column("after", json_type, nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        )
        tables.add("participant_crm_audit_logs")
    for name, columns in [
        ("ix_participant_crm_audit_logs_organization_id", ["organization_id"]),
        ("ix_participant_crm_audit_logs_email", ["email"]),
        ("ix_participant_crm_audit_logs_actor_user_id", ["actor_user_id"]),
        ("ix_participant_crm_audit_logs_action", ["action"]),
        ("ix_participant_crm_audit_logs_created_at", ["created_at"]),
        ("ix_participant_crm_audit_org_email_created", ["organization_id", "email", "created_at"]),
    ]:
        _create_index(name, "participant_crm_audit_logs", columns, tables)


def downgrade() -> None:
    tables = _tables()
    if "participant_crm_audit_logs" in tables:
        for name in [
            "ix_participant_crm_audit_org_email_created",
            "ix_participant_crm_audit_logs_created_at",
            "ix_participant_crm_audit_logs_action",
            "ix_participant_crm_audit_logs_actor_user_id",
            "ix_participant_crm_audit_logs_email",
            "ix_participant_crm_audit_logs_organization_id",
        ]:
            if name in _indexes("participant_crm_audit_logs"):
                op.drop_index(name, table_name="participant_crm_audit_logs")
        op.drop_table("participant_crm_audit_logs")

    if "participant_crm_snapshots" in tables:
        for name in [
            "ix_participant_crm_snapshot_org_latest",
            "ix_participant_crm_snapshots_latest_activity_at",
            "ix_participant_crm_snapshots_email",
            "ix_participant_crm_snapshots_organization_id",
        ]:
            if name in _indexes("participant_crm_snapshots"):
                op.drop_index(name, table_name="participant_crm_snapshots")
        op.drop_table("participant_crm_snapshots")

    if "participant_crm_profiles" in tables:
        for name in [
            "ix_participant_crm_org_follow_up",
            "ix_participant_crm_org_priority",
            "ix_participant_crm_profiles_next_follow_up_at",
            "ix_participant_crm_profiles_lead_score",
            "ix_participant_crm_profiles_priority",
            "ix_participant_crm_profiles_owner_user_id",
        ]:
            if name in _indexes("participant_crm_profiles"):
                op.drop_index(name, table_name="participant_crm_profiles")
        for column in reversed(["custom_fields", "next_follow_up_at", "lead_score", "priority", "owner_user_id"]):
            if column in _columns("participant_crm_profiles"):
                op.drop_column("participant_crm_profiles", column)
