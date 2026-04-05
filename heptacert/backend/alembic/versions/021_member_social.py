"""Add attendee member link and event comments.

Revision ID: 021_member_social
Revises: 020_public_members
Create Date: 2026-04-05
"""

from alembic import op
import sqlalchemy as sa


revision = "021_member_social"
down_revision = "020_public_members"
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    attendee_columns = {column["name"] for column in inspector.get_columns("attendees")}
    if "public_member_id" not in attendee_columns:
        op.add_column(
            "attendees",
            sa.Column("public_member_id", sa.Integer(), nullable=True),
        )
        op.create_foreign_key(
            "fk_attendees_public_member_id",
            "attendees",
            "public_members",
            ["public_member_id"],
            ["id"],
            ondelete="SET NULL",
        )
        op.create_index("ix_attendees_public_member_id", "attendees", ["public_member_id"], unique=False)

    tables = set(inspector.get_table_names())
    if "event_comments" not in tables:
        op.create_table(
            "event_comments",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("event_id", sa.Integer(), sa.ForeignKey("events.id", ondelete="CASCADE"), nullable=False),
            sa.Column("public_member_id", sa.Integer(), sa.ForeignKey("public_members.id", ondelete="CASCADE"), nullable=False),
            sa.Column("body", sa.Text(), nullable=False),
            sa.Column("status", sa.String(length=20), nullable=False, server_default="visible"),
            sa.Column("report_count", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        )
        op.create_index("ix_event_comments_event_id", "event_comments", ["event_id"], unique=False)
        op.create_index("ix_event_comments_public_member_id", "event_comments", ["public_member_id"], unique=False)
        op.create_index("ix_event_comments_status", "event_comments", ["status"], unique=False)


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    tables = set(inspector.get_table_names())
    if "event_comments" in tables:
        indexes = {index["name"] for index in inspector.get_indexes("event_comments")}
        for index_name in ("ix_event_comments_status", "ix_event_comments_public_member_id", "ix_event_comments_event_id"):
            if index_name in indexes:
                op.drop_index(index_name, table_name="event_comments")
        op.drop_table("event_comments")

    attendee_columns = {column["name"] for column in inspector.get_columns("attendees")}
    if "public_member_id" in attendee_columns:
        indexes = {index["name"] for index in inspector.get_indexes("attendees")}
        if "ix_attendees_public_member_id" in indexes:
            op.drop_index("ix_attendees_public_member_id", table_name="attendees")
        op.drop_constraint("fk_attendees_public_member_id", "attendees", type_="foreignkey")
        op.drop_column("attendees", "public_member_id")
