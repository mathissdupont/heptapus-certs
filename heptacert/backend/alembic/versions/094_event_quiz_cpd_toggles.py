"""Add quiz_enabled and cpd_enabled feature flags to events table.

Revision ID: 094_event_quiz_cpd_toggles
Revises: 093_lms_module_quiz_fk
Create Date: 2026-06-10
"""

from alembic import op
import sqlalchemy as sa


revision = "094_event_quiz_cpd_toggles"
down_revision = "093_lms_module_quiz_fk"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("events", sa.Column("quiz_enabled", sa.Boolean(), nullable=False, server_default="false"))
    op.add_column("events", sa.Column("cpd_enabled", sa.Boolean(), nullable=False, server_default="false"))


def downgrade() -> None:
    op.drop_column("events", "cpd_enabled")
    op.drop_column("events", "quiz_enabled")
