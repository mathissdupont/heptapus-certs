"""Add missing performance-critical indexes.

Based on query profiling: attendee email searches, certificate name lookups,
CRM profile filtering, training assignment filtering, and delivery log scans
are performed without dedicated indexes causing full table scans.

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


def upgrade() -> None:
    # Attendee email lookup — most frequent query pattern in bulk ops and CRM
    op.create_index("ix_attendees_event_email", "attendees", ["event_id", "email"])
    op.create_index("ix_attendees_email_lower", "attendees", ["email"])

    # Certificate student_name — searched in _infer_certificate and CRM snapshot hooks
    op.create_index("ix_certificates_event_student", "certificates", ["event_id", "student_name"])

    # Email delivery log scans — bulk job progress queries
    op.create_index("ix_email_delivery_logs_job_status", "email_delivery_logs", ["bulk_email_job_id", "status"])

    # CRM profile filtering — list endpoint filters by lifecycle_status
    op.create_index("ix_crm_profiles_org_status", "participant_crm_profiles", ["organization_id", "lifecycle_status"])
    op.create_index("ix_crm_profiles_org_score", "participant_crm_profiles", ["organization_id", "lead_score"])

    # Training assignment filtering — list + report queries
    op.create_index("ix_training_assignments_org_status", "training_assignments", ["organization_id", "status"])
    op.create_index("ix_training_assignments_org_due", "training_assignments", ["organization_id", "due_at"])

    # Attendance records — frequent join in CRM and analytics
    op.create_index("ix_attendance_records_attendee", "attendance_records", ["attendee_id"])

    # Event ticket check-in status — CRM snapshot and analytics
    op.create_index("ix_event_tickets_attendee_checkin", "event_tickets", ["attendee_id", "checked_in_at"])

    # Survey responses — per attendee lookup
    op.create_index("ix_survey_responses_attendee", "survey_responses", ["attendee_id"])

    # CRM audit log per-email lookup
    op.create_index("ix_crm_audit_org_email", "participant_crm_audit_logs", ["organization_id", "email"])

    # Automation execution logs — rule dispatch filtering
    op.create_index("ix_automation_exec_created", "event_automation_executions", ["created_at"])

    # Bulk email jobs — admin event list
    op.create_index("ix_bulk_email_jobs_event_status", "bulk_email_jobs", ["event_id", "status"])


def downgrade() -> None:
    op.drop_index("ix_bulk_email_jobs_event_status", table_name="bulk_email_jobs")
    op.drop_index("ix_automation_exec_created", table_name="event_automation_executions")
    op.drop_index("ix_crm_audit_org_email", table_name="participant_crm_audit_logs")
    op.drop_index("ix_survey_responses_attendee", table_name="survey_responses")
    op.drop_index("ix_event_tickets_attendee_checkin", table_name="event_tickets")
    op.drop_index("ix_attendance_records_attendee", table_name="attendance_records")
    op.drop_index("ix_training_assignments_org_due", table_name="training_assignments")
    op.drop_index("ix_training_assignments_org_status", table_name="training_assignments")
    op.drop_index("ix_crm_profiles_org_score", table_name="participant_crm_profiles")
    op.drop_index("ix_crm_profiles_org_status", table_name="participant_crm_profiles")
    op.drop_index("ix_email_delivery_logs_job_status", table_name="email_delivery_logs")
    op.drop_index("ix_certificates_event_student", table_name="certificates")
    op.drop_index("ix_attendees_email_lower", table_name="attendees")
    op.drop_index("ix_attendees_event_email", table_name="attendees")
