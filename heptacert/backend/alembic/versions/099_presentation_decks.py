"""Add presentation decks.

Revision ID: 099_presentation_decks
Revises: 098_event_ticket_types
Create Date: 2026-06-20
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "099_presentation_decks"
down_revision = "098_event_ticket_types"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    json_type = postgresql.JSONB(astext_type=sa.Text()) if bind.dialect.name == "postgresql" else sa.JSON()
    json_default = sa.text("'{}'::jsonb") if bind.dialect.name == "postgresql" else None
    list_default = sa.text("'[]'::jsonb") if bind.dialect.name == "postgresql" else None
    op.create_table(
        "presentation_decks",
        sa.Column("id", sa.Integer(), autoincrement=True, primary_key=True),
        sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("event_id", sa.Integer(), sa.ForeignKey("events.id", ondelete="CASCADE"), nullable=True),
        sa.Column("created_by", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("title", sa.String(220), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("language", sa.String(8), nullable=False, server_default="tr"),
        sa.Column("theme", json_type, nullable=False, server_default=json_default),
        sa.Column("slides", json_type, nullable=False, server_default=list_default),
        sa.Column("presenter_token", sa.String(96), nullable=True),
        sa.Column("source", sa.String(32), nullable=False, server_default="manual"),
        sa.Column("status", sa.String(24), nullable=False, server_default="draft"),
        sa.Column("file_path", sa.Text(), nullable=True),
        sa.Column("file_filename", sa.String(255), nullable=True),
        sa.Column("file_content_type", sa.String(160), nullable=True),
        sa.Column("file_size", sa.Integer(), nullable=True),
        sa.Column("converted_file_path", sa.Text(), nullable=True),
        sa.Column("converted_file_filename", sa.String(255), nullable=True),
        sa.Column("conversion_status", sa.String(24), nullable=False, server_default="not_required"),
        sa.Column("conversion_error", sa.Text(), nullable=True),
        sa.Column("conversion_attempts", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("last_export_path", sa.Text(), nullable=True),
        sa.Column("last_export_filename", sa.String(255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_presentation_decks_organization_id", "presentation_decks", ["organization_id"])
    op.create_index("ix_presentation_decks_event_id", "presentation_decks", ["event_id"])
    op.create_index("ix_presentation_decks_created_by", "presentation_decks", ["created_by"])
    op.create_index("ix_presentation_decks_presenter_token", "presentation_decks", ["presenter_token"], unique=True)
    op.create_index("ix_presentation_decks_status", "presentation_decks", ["status"])
    op.create_index("ix_presentation_decks_conversion_status", "presentation_decks", ["conversion_status"])
    op.create_index("ix_presentation_decks_org_updated", "presentation_decks", ["organization_id", "updated_at"])
    op.create_index("ix_presentation_decks_event_updated", "presentation_decks", ["event_id", "updated_at"])


def downgrade() -> None:
    op.drop_index("ix_presentation_decks_event_updated", table_name="presentation_decks")
    op.drop_index("ix_presentation_decks_org_updated", table_name="presentation_decks")
    op.drop_index("ix_presentation_decks_status", table_name="presentation_decks")
    op.drop_index("ix_presentation_decks_conversion_status", table_name="presentation_decks")
    op.drop_index("ix_presentation_decks_presenter_token", table_name="presentation_decks")
    op.drop_index("ix_presentation_decks_created_by", table_name="presentation_decks")
    op.drop_index("ix_presentation_decks_event_id", table_name="presentation_decks")
    op.drop_index("ix_presentation_decks_organization_id", table_name="presentation_decks")
    op.drop_table("presentation_decks")
