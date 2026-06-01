"""Add durable automation execution logs.

Revision ID: 059_automation_execution_logs
Revises: 058_crm_email_aliases
Create Date: 2026-06-01
"""

from alembic import op
import sqlalchemy as sa


revision = "059_automation_execution_logs"
down_revision = "058_crm_email_aliases"
branch_labels = None
depends_on = None


def _tables() -> set[str]:
    return set(sa.inspect(op.get_bind()).get_table_names())


def _indexes(table_name: str) -> set[str]:
    return {item["name"] for item in sa.inspect(op.get_bind()).get_indexes(table_name)}


def _create_index(name: str, table_name: str, columns: list[str], tables: set[str]) -> None:
    if table_name in tables and name not in _indexes(table_name):
        op.create_index(name, table_name, columns)


def upgrade() -> None:
    tables = _tables()
    if "event_automation_execution_logs" not in tables:
        op.create_table(
            "event_automation_execution_logs",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("event_id", sa.Integer(), sa.ForeignKey("events.id", ondelete="CASCADE"), nullable=False),
            sa.Column("rule_id", sa.String(length=64), nullable=False),
            sa.Column("attendee_id", sa.Integer(), sa.ForeignKey("attendees.id", ondelete="SET NULL"), nullable=True),
            sa.Column("recipient_email", sa.String(length=320), nullable=True),
            sa.Column("action_index", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("action_type", sa.String(length=48), nullable=False),
            sa.Column("idempotency_key", sa.String(length=160), nullable=False),
            sa.Column("status", sa.String(length=32), nullable=False, server_default="pending"),
            sa.Column("attempts", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("next_attempt_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("error_message", sa.Text(), nullable=True),
            sa.Column("response_status", sa.Integer(), nullable=True),
            sa.Column("payload", sa.JSON(), nullable=False, server_default=sa.text("'{}'")),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.Column("dispatched_at", sa.DateTime(timezone=True), nullable=True),
            sa.UniqueConstraint("event_id", "idempotency_key", name="uq_event_automation_exec_event_key"),
        )
        tables.add("event_automation_execution_logs")

    for name, columns in [
        ("ix_event_automation_execution_logs_event_id", ["event_id"]),
        ("ix_event_automation_execution_logs_rule_id", ["rule_id"]),
        ("ix_event_automation_execution_logs_status", ["status"]),
        ("ix_event_automation_execution_logs_next_attempt_at", ["next_attempt_at"]),
        ("ix_event_automation_exec_event_rule_status", ["event_id", "rule_id", "status"]),
    ]:
        _create_index(name, "event_automation_execution_logs", columns, tables)


def downgrade() -> None:
    tables = _tables()
    if "event_automation_execution_logs" not in tables:
        return
    for name in [
        "ix_event_automation_exec_event_rule_status",
        "ix_event_automation_execution_logs_next_attempt_at",
        "ix_event_automation_execution_logs_status",
        "ix_event_automation_execution_logs_rule_id",
        "ix_event_automation_execution_logs_event_id",
    ]:
        if name in _indexes("event_automation_execution_logs"):
            op.drop_index(name, table_name="event_automation_execution_logs")
    op.drop_table("event_automation_execution_logs")
