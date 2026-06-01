"""Add product query performance indexes.

Revision ID: 055_product_query_indexes
Revises: 054_checkin_activity_logs
Create Date: 2026-06-01
"""

from alembic import op
import sqlalchemy as sa


revision = "055_product_query_indexes"
down_revision = "054_checkin_activity_logs"
branch_labels = None
depends_on = None


INDEXES = [
    ("ix_attendees_event_registered", "attendees", ["event_id", "registered_at"]),
    ("ix_attendees_email_registered", "attendees", ["email", "registered_at"]),
    ("ix_attendees_event_survey_completed", "attendees", ["event_id", "survey_completed_at"]),
    ("ix_certificates_event_student_deleted", "certificates", ["event_id", "student_name", "deleted_at"]),
    ("ix_certificates_event_issued", "certificates", ["event_id", "issued_at"]),
    ("ix_attendance_records_attendee_checked", "attendance_records", ["attendee_id", "checked_in_at"]),
    ("ix_attendance_records_session_checked", "attendance_records", ["session_id", "checked_in_at"]),
    ("ix_event_tickets_attendee_checked", "event_tickets", ["attendee_id", "checked_in_at"]),
    ("ix_event_tickets_event_checked", "event_tickets", ["event_id", "checked_in_at"]),
    ("ix_survey_responses_event_completed", "survey_responses", ["event_id", "completed_at"]),
    ("ix_survey_responses_attendee_completed", "survey_responses", ["attendee_id", "completed_at"]),
    ("ix_training_assignments_org_created", "training_assignments", ["organization_id", "created_at"]),
    ("ix_training_assignments_org_status_created", "training_assignments", ["organization_id", "status", "created_at"]),
    ("ix_training_assignments_org_due_status", "training_assignments", ["organization_id", "due_at", "status"]),
    ("ix_event_automation_rules_event_trigger_enabled", "event_automation_rules", ["event_id", "trigger", "enabled"]),
    ("ix_event_automation_rules_enabled_updated", "event_automation_rules", ["enabled", "updated_at"]),
    ("ix_event_automation_dispatch_event_updated", "event_automation_dispatch_states", ["event_id", "updated_at"]),
    ("ix_event_automation_dispatch_rule_updated", "event_automation_dispatch_states", ["rule_id", "updated_at"]),
    ("ix_participant_crm_org_updated", "participant_crm_profiles", ["organization_id", "updated_at"]),
    ("ix_participant_crm_org_status_updated", "participant_crm_profiles", ["organization_id", "lifecycle_status", "updated_at"]),
    ("ix_participant_crm_org_email_status", "participant_crm_profiles", ["organization_id", "email", "lifecycle_status"]),
    ("ix_checkin_activity_event_success_created", "checkin_activity_logs", ["event_id", "success", "created_at"]),
    ("ix_checkin_activity_event_method_created", "checkin_activity_logs", ["event_id", "method", "created_at"]),
    ("ix_checkin_activity_event_source_created", "checkin_activity_logs", ["event_id", "source", "created_at"]),
    ("ix_certificate_template_presets_scope_updated", "certificate_template_presets", ["scope_type", "scope_id", "updated_at"]),
    ("ix_member_certificate_preferences_visibility_updated", "member_certificate_preferences", ["certificate_visibility", "updated_at"]),
    ("ix_public_members_created", "public_members", ["created_at"]),
]


FUNCTIONAL_INDEXES = [
    (
        "ix_attendees_lower_email_registered",
        "attendees",
        "CREATE INDEX IF NOT EXISTS ix_attendees_lower_email_registered ON attendees (lower(email), registered_at)",
    ),
    (
        "ix_attendees_event_lower_email",
        "attendees",
        "CREATE INDEX IF NOT EXISTS ix_attendees_event_lower_email ON attendees (event_id, lower(email))",
    ),
    (
        "ix_certificates_event_lower_student_active",
        "certificates",
        "CREATE INDEX IF NOT EXISTS ix_certificates_event_lower_student_active ON certificates (event_id, lower(trim(student_name))) WHERE deleted_at IS NULL",
    ),
]


def _tables() -> set[str]:
    return set(sa.inspect(op.get_bind()).get_table_names())


def _indexes(table_name: str) -> set[str]:
    return {item["name"] for item in sa.inspect(op.get_bind()).get_indexes(table_name)}


def _create_index(name: str, table_name: str, columns: list[str], tables: set[str]) -> None:
    if table_name not in tables or name in _indexes(table_name):
        return
    op.create_index(name, table_name, columns)


def _drop_index(name: str, table_name: str, tables: set[str]) -> None:
    if table_name not in tables or name not in _indexes(table_name):
        return
    op.drop_index(name, table_name=table_name)


def upgrade() -> None:
    tables = _tables()
    for name, table_name, columns in INDEXES:
        _create_index(name, table_name, columns, tables)

    if op.get_bind().dialect.name == "postgresql":
        for name, table_name, sql in FUNCTIONAL_INDEXES:
            if table_name in tables and name not in _indexes(table_name):
                op.execute(sa.text(sql))


def downgrade() -> None:
    tables = _tables()
    if op.get_bind().dialect.name == "postgresql":
        for name, table_name, _sql in reversed(FUNCTIONAL_INDEXES):
            if table_name in tables:
                op.execute(sa.text(f"DROP INDEX IF EXISTS {name}"))

    for name, table_name, _columns in reversed(INDEXES):
        _drop_index(name, table_name, tables)
