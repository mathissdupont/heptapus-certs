"""Add accreditation and CPD tables.

Revision ID: 080_accreditation
Revises: 079_marketplace_fields
Create Date: 2026-06-06
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision = "080_accreditation"
down_revision = "079_marketplace_fields"
branch_labels = None
depends_on = None


def _tables() -> set[str]:
    return set(sa.inspect(op.get_bind()).get_table_names())


def upgrade() -> None:
    existing = _tables()

    if "accreditation_bodies" not in existing:
        op.create_table(
            "accreditation_bodies",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("short_code", sa.String(20), nullable=False, unique=True),
            sa.Column("name", sa.String(200), nullable=False),
            sa.Column("logo_url", sa.Text(), nullable=True),
            sa.Column("verification_url_pattern", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        )

    if "org_accreditations" not in existing:
        op.create_table(
            "org_accreditations",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False),
            sa.Column("body_id", sa.Integer(), sa.ForeignKey("accreditation_bodies.id", ondelete="CASCADE"), nullable=False),
            sa.Column("accreditation_number", sa.String(100), nullable=True),
            sa.Column("valid_from", sa.DateTime(timezone=True), nullable=True),
            sa.Column("valid_until", sa.DateTime(timezone=True), nullable=True),
            sa.Column("documents_json", JSONB, nullable=True),
            sa.Column("notes", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        )
        op.create_index("ix_org_accreditations_org", "org_accreditations", ["organization_id"])

    if "event_cpd_configs" not in existing:
        op.create_table(
            "event_cpd_configs",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("event_id", sa.Integer(), sa.ForeignKey("events.id", ondelete="CASCADE"), nullable=False, unique=True),
            sa.Column("body_id", sa.Integer(), sa.ForeignKey("accreditation_bodies.id", ondelete="RESTRICT"), nullable=False),
            sa.Column("cpd_hours", sa.Numeric(6, 2), nullable=False, server_default="0"),
            sa.Column("cpd_category", sa.String(100), nullable=True),
            sa.Column("cpd_unit_type", sa.String(50), nullable=False, server_default="hours"),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        )
        op.create_index("ix_event_cpd_event", "event_cpd_configs", ["event_id"])

    if "member_cpd_logs" not in existing:
        op.create_table(
            "member_cpd_logs",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("member_id", sa.Integer(), sa.ForeignKey("public_members.id", ondelete="CASCADE"), nullable=False),
            sa.Column("event_id", sa.Integer(), sa.ForeignKey("events.id", ondelete="CASCADE"), nullable=False),
            sa.Column("body_id", sa.Integer(), sa.ForeignKey("accreditation_bodies.id", ondelete="RESTRICT"), nullable=False),
            sa.Column("cpd_hours", sa.Numeric(6, 2), nullable=False),
            sa.Column("cpd_category", sa.String(100), nullable=True),
            sa.Column("certificate_id", sa.Integer(), sa.ForeignKey("certificates.id", ondelete="SET NULL"), nullable=True),
            sa.Column("earned_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        )
        op.create_index("ix_member_cpd_member", "member_cpd_logs", ["member_id"])
        op.create_index("ix_member_cpd_event", "member_cpd_logs", ["event_id"])

    # Seed common Turkish accreditation bodies
    op.execute("""
        INSERT INTO accreditation_bodies (short_code, name)
        VALUES
            ('MYK', 'Mesleki Yeterlilik Kurumu'),
            ('SMMM', 'Serbest Muhasebeci Mali Müşavirler Odası'),
            ('TMMOB', 'Türk Mühendis ve Mimar Odaları Birliği'),
            ('TUSIAD', 'Türk Sanayicileri ve İşinsanları Derneği'),
            ('PMI', 'Project Management Institute'),
            ('ISO', 'ISO / Belgelendirme Kuruluşu'),
            ('OTHER', 'Diğer')
        ON CONFLICT (short_code) DO NOTHING
    """)


def downgrade() -> None:
    op.drop_table("member_cpd_logs")
    op.drop_table("event_cpd_configs")
    op.drop_table("org_accreditations")
    op.drop_table("accreditation_bodies")
