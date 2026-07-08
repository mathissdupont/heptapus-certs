"""WP20 agenda: event agenda toggle + structured session fields.

Adds events.agenda_enabled (default false = dormant, backward compatible) and
extends event_sessions with session_end, track, speaker_name, description so the
existing session primitive can back a full conference agenda (tracks/rooms, timed
cards, speakers). The capacity column already exists (migration that introduced
event_sessions). All new columns are nullable / default-off — existing events and
sessions are unaffected until an organizer opts in.

Revision ID: 106_agenda_sessions
Revises: 105_attendee_approval_status
Create Date: 2026-07-08
"""

from alembic import op
import sqlalchemy as sa


revision = "106_agenda_sessions"
down_revision = "105_attendee_approval_status"
branch_labels = None
depends_on = None


def _columns(table_name: str) -> set[str]:
    inspector = sa.inspect(op.get_bind())
    return {column["name"] for column in inspector.get_columns(table_name)}


def upgrade() -> None:
    event_columns = _columns("events")
    if "agenda_enabled" not in event_columns:
        op.add_column(
            "events",
            sa.Column("agenda_enabled", sa.Boolean(), nullable=False, server_default=sa.false()),
        )

    session_columns = _columns("event_sessions")
    if "session_end" not in session_columns:
        op.add_column("event_sessions", sa.Column("session_end", sa.Time(), nullable=True))
    if "track" not in session_columns:
        op.add_column("event_sessions", sa.Column("track", sa.String(length=120), nullable=True))
    if "speaker_name" not in session_columns:
        op.add_column("event_sessions", sa.Column("speaker_name", sa.String(length=200), nullable=True))
    if "description" not in session_columns:
        op.add_column("event_sessions", sa.Column("description", sa.Text(), nullable=True))


def downgrade() -> None:
    for col in ("description", "speaker_name", "track", "session_end"):
        if col in _columns("event_sessions"):
            op.drop_column("event_sessions", col)
    if "agenda_enabled" in _columns("events"):
        op.drop_column("events", "agenda_enabled")
