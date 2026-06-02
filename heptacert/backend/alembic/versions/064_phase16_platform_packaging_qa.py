"""Phase 16 platform packaging and QA telemetry.

Revision ID: 064_phase16_platform_packaging_qa
Revises: 063_checkin_wallet_template_phase14_15
Create Date: 2026-06-02
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "064_phase16_platform_packaging_qa"
down_revision = "063_checkin_wallet_template_phase14_15"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "product_telemetry_events",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("event_name", sa.String(length=80), nullable=False),
        sa.Column("feature_key", sa.String(length=80), nullable=False),
        sa.Column("resource_type", sa.String(length=64), nullable=True),
        sa.Column("resource_id", sa.String(length=80), nullable=True),
        sa.Column("metadata_json", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("user_agent", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_product_telemetry_events_user_id", "product_telemetry_events", ["user_id"])
    op.create_index("ix_product_telemetry_events_event_name", "product_telemetry_events", ["event_name"])
    op.create_index("ix_product_telemetry_events_feature_key", "product_telemetry_events", ["feature_key"])
    op.create_index("ix_product_telemetry_events_resource_type", "product_telemetry_events", ["resource_type"])
    op.create_index("ix_product_telemetry_events_created_at", "product_telemetry_events", ["created_at"])
    op.create_index("ix_product_telemetry_feature_event_created", "product_telemetry_events", ["feature_key", "event_name", "created_at"])


def downgrade() -> None:
    op.drop_index("ix_product_telemetry_feature_event_created", table_name="product_telemetry_events")
    op.drop_index("ix_product_telemetry_events_created_at", table_name="product_telemetry_events")
    op.drop_index("ix_product_telemetry_events_resource_type", table_name="product_telemetry_events")
    op.drop_index("ix_product_telemetry_events_feature_key", table_name="product_telemetry_events")
    op.drop_index("ix_product_telemetry_events_event_name", table_name="product_telemetry_events")
    op.drop_index("ix_product_telemetry_events_user_id", table_name="product_telemetry_events")
    op.drop_table("product_telemetry_events")
