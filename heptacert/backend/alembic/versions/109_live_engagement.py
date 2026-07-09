"""WP23 live engagement: events.live_engagement_enabled + live Q&A + live polls.

Adds the feature flag (default off) and four tables: live_questions +
live_question_votes (audience Q&A with upvotes) and live_polls + live_poll_votes.
All member-scoped and event/session-scoped.

Revision ID: 109_live_engagement
Revises: 108_networking_meetings
Create Date: 2026-07-09
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "109_live_engagement"
down_revision = "108_networking_meetings"
branch_labels = None
depends_on = None


def _tables() -> set[str]:
    return set(sa.inspect(op.get_bind()).get_table_names())


def _columns(table_name: str) -> set[str]:
    return {c["name"] for c in sa.inspect(op.get_bind()).get_columns(table_name)}


def _indexes(table_name: str) -> set[str]:
    return {i["name"] for i in sa.inspect(op.get_bind()).get_indexes(table_name)}


def upgrade() -> None:
    if "live_engagement_enabled" not in _columns("events"):
        op.add_column(
            "events",
            sa.Column("live_engagement_enabled", sa.Boolean(), nullable=False, server_default=sa.false()),
        )

    tables = _tables()
    if "live_questions" not in tables:
        op.create_table(
            "live_questions",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("event_id", sa.Integer(), sa.ForeignKey("events.id", ondelete="CASCADE"), nullable=False),
            sa.Column("session_id", sa.Integer(), sa.ForeignKey("event_sessions.id", ondelete="SET NULL"), nullable=True),
            sa.Column("member_id", sa.Integer(), sa.ForeignKey("public_members.id", ondelete="CASCADE"), nullable=False),
            sa.Column("text", sa.String(length=1000), nullable=False),
            sa.Column("status", sa.String(length=16), nullable=False, server_default="visible"),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
            sa.Column("answered_at", sa.DateTime(timezone=True), nullable=True),
        )
    idx = _indexes("live_questions")
    for col in ("event_id", "session_id", "member_id", "status"):
        if f"ix_live_questions_{col}" not in idx:
            op.create_index(f"ix_live_questions_{col}", "live_questions", [col])

    if "live_question_votes" not in tables:
        op.create_table(
            "live_question_votes",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("question_id", sa.Integer(), sa.ForeignKey("live_questions.id", ondelete="CASCADE"), nullable=False),
            sa.Column("member_id", sa.Integer(), sa.ForeignKey("public_members.id", ondelete="CASCADE"), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
            sa.UniqueConstraint("question_id", "member_id", name="uq_live_question_vote"),
        )
    idx = _indexes("live_question_votes")
    for col in ("question_id", "member_id"):
        if f"ix_live_question_votes_{col}" not in idx:
            op.create_index(f"ix_live_question_votes_{col}", "live_question_votes", [col])

    if "live_polls" not in tables:
        op.create_table(
            "live_polls",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("event_id", sa.Integer(), sa.ForeignKey("events.id", ondelete="CASCADE"), nullable=False),
            sa.Column("session_id", sa.Integer(), sa.ForeignKey("event_sessions.id", ondelete="SET NULL"), nullable=True),
            sa.Column("prompt", sa.String(length=500), nullable=False),
            sa.Column("options", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
            sa.Column("status", sa.String(length=16), nullable=False, server_default="open"),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        )
    idx = _indexes("live_polls")
    for col in ("event_id", "session_id", "status"):
        if f"ix_live_polls_{col}" not in idx:
            op.create_index(f"ix_live_polls_{col}", "live_polls", [col])

    if "live_poll_votes" not in tables:
        op.create_table(
            "live_poll_votes",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("poll_id", sa.Integer(), sa.ForeignKey("live_polls.id", ondelete="CASCADE"), nullable=False),
            sa.Column("member_id", sa.Integer(), sa.ForeignKey("public_members.id", ondelete="CASCADE"), nullable=False),
            sa.Column("option_id", sa.String(length=40), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
            sa.UniqueConstraint("poll_id", "member_id", name="uq_live_poll_vote"),
        )
    idx = _indexes("live_poll_votes")
    for col in ("poll_id", "member_id"):
        if f"ix_live_poll_votes_{col}" not in idx:
            op.create_index(f"ix_live_poll_votes_{col}", "live_poll_votes", [col])


def downgrade() -> None:
    tables = _tables()
    for tbl in ("live_poll_votes", "live_polls", "live_question_votes", "live_questions"):
        if tbl in tables:
            op.drop_table(tbl)
    if "live_engagement_enabled" in _columns("events"):
        op.drop_column("events", "live_engagement_enabled")
