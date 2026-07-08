"""WP21 Call-for-Papers: events.cfp_enabled + cfp_submissions + cfp_reviews.

Adds the CFP feature flag (default off = dormant, backward compatible) and the two
CFP tables. Speakers (PublicMember) submit abstracts; reviewers (Users) score them
against a rubric stored on Event.config; accepted submissions link to an EventSession.

Revision ID: 107_cfp_submissions
Revises: 106_agenda_sessions
Create Date: 2026-07-08
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "107_cfp_submissions"
down_revision = "106_agenda_sessions"
branch_labels = None
depends_on = None


def _tables() -> set[str]:
    return set(sa.inspect(op.get_bind()).get_table_names())


def _columns(table_name: str) -> set[str]:
    return {c["name"] for c in sa.inspect(op.get_bind()).get_columns(table_name)}


def _indexes(table_name: str) -> set[str]:
    return {i["name"] for i in sa.inspect(op.get_bind()).get_indexes(table_name)}


def upgrade() -> None:
    if "cfp_enabled" not in _columns("events"):
        op.add_column(
            "events",
            sa.Column("cfp_enabled", sa.Boolean(), nullable=False, server_default=sa.false()),
        )

    tables = _tables()
    if "cfp_submissions" not in tables:
        op.create_table(
            "cfp_submissions",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("event_id", sa.Integer(), sa.ForeignKey("events.id", ondelete="CASCADE"), nullable=False),
            sa.Column("member_id", sa.Integer(), sa.ForeignKey("public_members.id", ondelete="CASCADE"), nullable=False),
            sa.Column("title", sa.String(length=300), nullable=False),
            sa.Column("abstract", sa.Text(), nullable=False),
            sa.Column("speaker_name", sa.String(length=200), nullable=False),
            sa.Column("speaker_bio", sa.Text(), nullable=True),
            sa.Column("track", sa.String(length=120), nullable=True),
            sa.Column("status", sa.String(length=24), nullable=False, server_default="submitted"),
            sa.Column("decision_note", sa.String(length=2000), nullable=True),
            sa.Column("decided_by", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
            sa.Column("decided_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("session_id", sa.Integer(), sa.ForeignKey("event_sessions.id", ondelete="SET NULL"), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        )
    indexes = _indexes("cfp_submissions")
    if "ix_cfp_submissions_event_id" not in indexes:
        op.create_index("ix_cfp_submissions_event_id", "cfp_submissions", ["event_id"])
    if "ix_cfp_submissions_member_id" not in indexes:
        op.create_index("ix_cfp_submissions_member_id", "cfp_submissions", ["member_id"])
    if "ix_cfp_submissions_status" not in indexes:
        op.create_index("ix_cfp_submissions_status", "cfp_submissions", ["status"])

    if "cfp_reviews" not in tables:
        op.create_table(
            "cfp_reviews",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("submission_id", sa.Integer(), sa.ForeignKey("cfp_submissions.id", ondelete="CASCADE"), nullable=False),
            sa.Column("reviewer_user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
            sa.Column("scores", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
            sa.Column("overall_score", sa.Numeric(6, 2), nullable=True),
            sa.Column("comment", sa.Text(), nullable=True),
            sa.Column("status", sa.String(length=16), nullable=False, server_default="assigned"),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
            sa.UniqueConstraint("submission_id", "reviewer_user_id", name="uq_cfp_review_submission_reviewer"),
        )
    indexes = _indexes("cfp_reviews")
    if "ix_cfp_reviews_submission_id" not in indexes:
        op.create_index("ix_cfp_reviews_submission_id", "cfp_reviews", ["submission_id"])
    if "ix_cfp_reviews_reviewer_user_id" not in indexes:
        op.create_index("ix_cfp_reviews_reviewer_user_id", "cfp_reviews", ["reviewer_user_id"])


def downgrade() -> None:
    tables = _tables()
    if "cfp_reviews" in tables:
        op.drop_table("cfp_reviews")
    if "cfp_submissions" in tables:
        op.drop_table("cfp_submissions")
    if "cfp_enabled" in _columns("events"):
        op.drop_column("events", "cfp_enabled")
