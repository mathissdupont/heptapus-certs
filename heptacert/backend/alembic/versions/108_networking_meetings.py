"""WP22 networking: events.networking_meetings_enabled + public_members.interests + meeting_requests.

Adds the networking feature flag (default off = dormant, backward compatible), a
free-text interests tag list on PublicMember (for meeting discovery), and the
meeting_requests table (1:1 meetings between two members, event-scoped).

Revision ID: 108_networking_meetings
Revises: 107_cfp_submissions
Create Date: 2026-07-09
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "108_networking_meetings"
down_revision = "107_cfp_submissions"
branch_labels = None
depends_on = None


def _tables() -> set[str]:
    return set(sa.inspect(op.get_bind()).get_table_names())


def _columns(table_name: str) -> set[str]:
    return {c["name"] for c in sa.inspect(op.get_bind()).get_columns(table_name)}


def _indexes(table_name: str) -> set[str]:
    return {i["name"] for i in sa.inspect(op.get_bind()).get_indexes(table_name)}


def upgrade() -> None:
    if "networking_meetings_enabled" not in _columns("events"):
        op.add_column(
            "events",
            sa.Column("networking_meetings_enabled", sa.Boolean(), nullable=False, server_default=sa.false()),
        )
    if "interests" not in _columns("public_members"):
        op.add_column("public_members", sa.Column("interests", postgresql.JSONB(astext_type=sa.Text()), nullable=True))

    if "meeting_requests" not in _tables():
        op.create_table(
            "meeting_requests",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("event_id", sa.Integer(), sa.ForeignKey("events.id", ondelete="CASCADE"), nullable=False),
            sa.Column("requester_id", sa.Integer(), sa.ForeignKey("public_members.id", ondelete="CASCADE"), nullable=False),
            sa.Column("target_id", sa.Integer(), sa.ForeignKey("public_members.id", ondelete="CASCADE"), nullable=False),
            sa.Column("proposed_start", sa.DateTime(timezone=True), nullable=True),
            sa.Column("duration_minutes", sa.Integer(), nullable=False, server_default="30"),
            sa.Column("location", sa.String(length=300), nullable=True),
            sa.Column("message", sa.String(length=1000), nullable=True),
            sa.Column("status", sa.String(length=16), nullable=False, server_default="pending"),
            sa.Column("response_note", sa.String(length=1000), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        )
    indexes = _indexes("meeting_requests")
    if "ix_meeting_requests_event_id" not in indexes:
        op.create_index("ix_meeting_requests_event_id", "meeting_requests", ["event_id"])
    if "ix_meeting_requests_requester_id" not in indexes:
        op.create_index("ix_meeting_requests_requester_id", "meeting_requests", ["requester_id"])
    if "ix_meeting_requests_target_id" not in indexes:
        op.create_index("ix_meeting_requests_target_id", "meeting_requests", ["target_id"])
    if "ix_meeting_requests_status" not in indexes:
        op.create_index("ix_meeting_requests_status", "meeting_requests", ["status"])


def downgrade() -> None:
    if "meeting_requests" in _tables():
        op.drop_table("meeting_requests")
    if "interests" in _columns("public_members"):
        op.drop_column("public_members", "interests")
    if "networking_meetings_enabled" in _columns("events"):
        op.drop_column("events", "networking_meetings_enabled")
