"""Add presentation speaker notes.

Revision ID: 102_presentation_speaker_notes
Revises: 101_presentation_conversion_fields
Create Date: 2026-06-20
"""

from alembic import op
import sqlalchemy as sa


revision = "102_presentation_speaker_notes"
down_revision = "101_presentation_conversion_fields"
branch_labels = None
depends_on = None


def _tables() -> set[str]:
    inspector = sa.inspect(op.get_bind())
    return set(inspector.get_table_names())


def _indexes(table_name: str) -> set[str]:
    inspector = sa.inspect(op.get_bind())
    return {index["name"] for index in inspector.get_indexes(table_name)}


def upgrade() -> None:
    if "presentation_speaker_notes" not in _tables():
        op.create_table(
            "presentation_speaker_notes",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("deck_id", sa.Integer(), sa.ForeignKey("presentation_decks.id", ondelete="CASCADE"), nullable=False),
            sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
            sa.Column("slide_index", sa.Integer(), nullable=False),
            sa.Column("note", sa.Text(), nullable=False, server_default=""),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
            sa.UniqueConstraint("deck_id", "user_id", "slide_index", name="uq_presentation_note_deck_user_slide"),
        )

    indexes = _indexes("presentation_speaker_notes")
    if "ix_presentation_speaker_notes_deck_id" not in indexes:
        op.create_index("ix_presentation_speaker_notes_deck_id", "presentation_speaker_notes", ["deck_id"])
    if "ix_presentation_speaker_notes_user_id" not in indexes:
        op.create_index("ix_presentation_speaker_notes_user_id", "presentation_speaker_notes", ["user_id"])
    if "ix_presentation_notes_deck_user" not in indexes:
        op.create_index("ix_presentation_notes_deck_user", "presentation_speaker_notes", ["deck_id", "user_id"])


def downgrade() -> None:
    if "presentation_speaker_notes" in _tables():
        op.drop_table("presentation_speaker_notes")
