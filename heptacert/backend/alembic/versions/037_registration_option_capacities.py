"""Add registration option capacities table.

Revision ID: 037_reg_option_capacities
Revises: 036_superadmin_bulk_email_jobs
Create Date: 2026-04-30
"""

from alembic import op
import sqlalchemy as sa


revision = "037_reg_option_capacities"
down_revision = "036_superadmin_bulk_email_jobs"
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = inspector.get_table_names()

    if "registration_option_capacities" not in existing_tables:
        op.create_table(
            "registration_option_capacities",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("event_id", sa.Integer(), sa.ForeignKey("events.id", ondelete="CASCADE"), nullable=False),
            sa.Column("field_id", sa.String(length=128), nullable=False),
            sa.Column("option_label", sa.String(length=255), nullable=False),
            sa.Column("capacity", sa.Integer(), nullable=True),
            sa.Column("reserved_count", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        )

        op.create_index(
            "ix_regopt_event_id", "registration_option_capacities", ["event_id"]
        )
        op.create_index(
            "ix_regopt_field_id", "registration_option_capacities", ["field_id"]
        )
        op.create_unique_constraint(
            "uq_regopt_event_field_option",
            "registration_option_capacities",
            ["event_id", "field_id", "option_label"],
        )


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = inspector.get_table_names()

    if "registration_option_capacities" in existing_tables:
        try:
            op.drop_constraint("uq_regopt_event_field_option", "registration_option_capacities", type_="unique")
        except Exception:
            pass
        try:
            op.drop_index("ix_regopt_field_id", table_name="registration_option_capacities")
        except Exception:
            pass
        try:
            op.drop_index("ix_regopt_event_id", table_name="registration_option_capacities")
        except Exception:
            pass
        op.drop_table("registration_option_capacities")
