"""Add missing performance-critical indexes.

Based on query profiling: attendee email searches, certificate name lookups,
CRM profile filtering, training assignment filtering, and delivery log scans
are performed without dedicated indexes causing full table scans.

Uses IF NOT EXISTS on all indexes so repeated runs are safe.

Revision ID: 070_performance_indexes
Revises: 069_crm_drip_sequences
Create Date: 2026-06-04
"""

from typing import Sequence, Union
from alembic import op


revision: str = "070_performance_indexes"
down_revision: Union[str, None] = "069_crm_drip_sequences"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_INDEXES = [
    ("ix_attendees_event_email",           "attendees",                      ["event_id", "email"]),
    ("ix_attendees_email_lower",           "attendees",                      ["email"]),
    ("ix_certificates_event_student",      "certificates",                   ["event_id", "student_name"]),
    ("ix_email_delivery_logs_job_status",  "email_delivery_logs",            ["bulk_job_id", "status"]),
    ("ix_crm_profiles_org_status",         "participant_crm_profiles",       ["organization_id", "lifecycle_status"]),
    ("ix_crm_profiles_org_score",          "participant_crm_profiles",       ["organization_id", "lead_score"]),
    ("ix_training_assignments_org_status", "training_assignments",           ["organization_id", "status"]),
    ("ix_training_assignments_org_due",    "training_assignments",           ["organization_id", "due_at"]),
    ("ix_attendance_records_attendee",     "attendance_records",             ["attendee_id"]),
    ("ix_event_tickets_attendee_checkin",  "event_tickets",                  ["attendee_id", "checked_in_at"]),
    ("ix_survey_responses_attendee",       "survey_responses",               ["attendee_id"]),
    ("ix_automation_exec_created",         "event_automation_execution_logs",["created_at"]),
    ("ix_bulk_email_jobs_event_status",    "bulk_email_jobs",                ["event_id", "status"]),
]


def upgrade() -> None:
    for index_name, table_name, columns in _INDEXES:
        op.create_index(index_name, table_name, columns, if_not_exists=True)


def downgrade() -> None:
    for index_name, table_name, _columns in reversed(_INDEXES):
        op.drop_index(index_name, table_name=table_name, if_exists=True)
