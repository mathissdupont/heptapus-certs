"""Move product config JSON into durable tables.

Revision ID: 053_product_config_tables
Revises: 052_training_assignments
Create Date: 2026-05-31
"""

from datetime import datetime
from uuid import uuid4

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB


revision = "053_product_config_tables"
down_revision = "052_training_assignments"
branch_labels = None
depends_on = None


def _json_type():
    return sa.JSON().with_variant(JSONB(), "postgresql")


def _table_names() -> set[str]:
    return set(sa.inspect(op.get_bind()).get_table_names())


def _parse_dt(value):
    if isinstance(value, datetime):
        return value
    if isinstance(value, str):
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return None
    return None


def upgrade() -> None:
    json_type = _json_type()
    tables = _table_names()
    if "certificate_template_presets" not in tables:
        op.create_table(
            "certificate_template_presets",
            sa.Column("id", sa.String(length=64), primary_key=True),
            sa.Column("scope_type", sa.String(length=16), nullable=False),
            sa.Column("scope_id", sa.Integer(), nullable=False),
            sa.Column("name", sa.String(length=80), nullable=False),
            sa.Column("template_image_url", sa.Text(), nullable=True),
            sa.Column("config", json_type, nullable=False, server_default="{}"),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        )
        op.create_index("ix_certificate_template_presets_scope", "certificate_template_presets", ["scope_type", "scope_id"])
        op.create_index("ix_certificate_template_presets_scope_type", "certificate_template_presets", ["scope_type"])
        op.create_index("ix_certificate_template_presets_scope_id", "certificate_template_presets", ["scope_id"])

    if "event_automation_rules" not in tables:
        op.create_table(
            "event_automation_rules",
            sa.Column("id", sa.String(length=64), primary_key=True),
            sa.Column("event_id", sa.Integer(), sa.ForeignKey("events.id", ondelete="CASCADE"), nullable=False),
            sa.Column("name", sa.String(length=120), nullable=False),
            sa.Column("trigger", sa.String(length=64), nullable=False),
            sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.text("true")),
            sa.Column("actions", json_type, nullable=False, server_default="[]"),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        )
        op.create_index("ix_event_automation_rules_event_id", "event_automation_rules", ["event_id"])
        op.create_index("ix_event_automation_rules_trigger", "event_automation_rules", ["trigger"])
        op.create_index("ix_event_automation_rules_enabled", "event_automation_rules", ["enabled"])
        op.create_index("ix_event_automation_rules_event_enabled", "event_automation_rules", ["event_id", "enabled"])

    if "event_automation_dispatch_states" not in tables:
        op.create_table(
            "event_automation_dispatch_states",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("event_id", sa.Integer(), sa.ForeignKey("events.id", ondelete="CASCADE"), nullable=False),
            sa.Column("rule_id", sa.String(length=64), nullable=False),
            sa.Column("state", json_type, nullable=False, server_default="{}"),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.UniqueConstraint("event_id", "rule_id", name="uq_event_automation_dispatch_event_rule"),
        )
        op.create_index("ix_event_automation_dispatch_states_event_id", "event_automation_dispatch_states", ["event_id"])
        op.create_index("ix_event_automation_dispatch_states_rule_id", "event_automation_dispatch_states", ["rule_id"])

    if "participant_crm_profiles" not in tables:
        op.create_table(
            "participant_crm_profiles",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False),
            sa.Column("email", sa.String(length=320), nullable=False),
            sa.Column("notes", sa.Text(), nullable=False, server_default=""),
            sa.Column("tags", json_type, nullable=False, server_default="[]"),
            sa.Column("lifecycle_status", sa.String(length=64), nullable=False, server_default="lead"),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.UniqueConstraint("organization_id", "email", name="uq_participant_crm_org_email"),
        )
        op.create_index("ix_participant_crm_profiles_organization_id", "participant_crm_profiles", ["organization_id"])
        op.create_index("ix_participant_crm_profiles_email", "participant_crm_profiles", ["email"])
        op.create_index("ix_participant_crm_profiles_lifecycle_status", "participant_crm_profiles", ["lifecycle_status"])
        op.create_index("ix_participant_crm_org_status", "participant_crm_profiles", ["organization_id", "lifecycle_status"])

    if "member_certificate_preferences" not in tables:
        op.create_table(
            "member_certificate_preferences",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("public_member_id", sa.Integer(), sa.ForeignKey("public_members.id", ondelete="CASCADE"), nullable=False),
            sa.Column("certificate_visibility", sa.String(length=32), nullable=False, server_default="public"),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.UniqueConstraint("public_member_id", name="uq_member_certificate_preferences_member"),
        )
        op.create_index("ix_member_certificate_preferences_public_member_id", "member_certificate_preferences", ["public_member_id"])
        op.create_index("ix_member_certificate_preferences_certificate_visibility", "member_certificate_preferences", ["certificate_visibility"])

    _migrate_system_configs()


def _migrate_system_configs() -> None:
    bind = op.get_bind()
    metadata = sa.MetaData()
    system_configs = sa.Table("system_configs", metadata, autoload_with=bind)
    template_presets = sa.Table("certificate_template_presets", metadata, autoload_with=bind)
    automation_rules = sa.Table("event_automation_rules", metadata, autoload_with=bind)
    dispatch_states = sa.Table("event_automation_dispatch_states", metadata, autoload_with=bind)
    crm_profiles = sa.Table("participant_crm_profiles", metadata, autoload_with=bind)
    member_preferences = sa.Table("member_certificate_preferences", metadata, autoload_with=bind)
    public_members = sa.Table("public_members", metadata, autoload_with=bind)

    for key, value in bind.execute(sa.select(system_configs.c.key, system_configs.c.value)).all():
        value = value if isinstance(value, dict) else {}
        if key.startswith("certificate_template_presets:"):
            _, scope_type, raw_scope_id = key.split(":", 2)
            try:
                scope_id = int(raw_scope_id)
            except ValueError:
                continue
            for item in value.get("presets") or []:
                if not isinstance(item, dict):
                    continue
                preset_id = str(item.get("id") or uuid4().hex)
                exists = bind.execute(sa.select(template_presets.c.id).where(template_presets.c.id == preset_id)).first()
                if exists:
                    continue
                bind.execute(
                    template_presets.insert().values(
                        id=preset_id,
                        scope_type=scope_type,
                        scope_id=scope_id,
                        name=str(item.get("name") or "Preset")[:80],
                        template_image_url=item.get("template_image_url"),
                        config=item.get("config") or {},
                        created_at=_parse_dt(item.get("created_at")) or datetime.utcnow(),
                        updated_at=_parse_dt(item.get("updated_at")) or datetime.utcnow(),
                    )
                )
        elif key.startswith("event_automation_rules:"):
            try:
                event_id = int(key.rsplit(":", 1)[1])
            except ValueError:
                continue
            for item in value.get("rules") or []:
                if not isinstance(item, dict):
                    continue
                rule_id = str(item.get("id") or uuid4().hex)
                exists = bind.execute(sa.select(automation_rules.c.id).where(automation_rules.c.id == rule_id)).first()
                if exists:
                    continue
                bind.execute(
                    automation_rules.insert().values(
                        id=rule_id,
                        event_id=event_id,
                        name=str(item.get("name") or "Automation")[:120],
                        trigger=str(item.get("trigger") or "attended_event")[:64],
                        enabled=bool(item.get("enabled", True)),
                        actions=item.get("actions") or [],
                        created_at=_parse_dt(item.get("created_at")) or datetime.utcnow(),
                        updated_at=_parse_dt(item.get("updated_at")) or datetime.utcnow(),
                    )
                )
        elif key.startswith("event_automation_dispatch:"):
            parts = key.split(":", 2)
            if len(parts) != 3:
                continue
            try:
                event_id = int(parts[1])
            except ValueError:
                continue
            rule_id = parts[2]
            exists = bind.execute(
                sa.select(dispatch_states.c.id).where(dispatch_states.c.event_id == event_id, dispatch_states.c.rule_id == rule_id)
            ).first()
            if exists:
                continue
            bind.execute(
                dispatch_states.insert().values(
                    event_id=event_id,
                    rule_id=rule_id,
                    state=value,
                    updated_at=_parse_dt(value.get("updated_at")) or datetime.utcnow(),
                )
            )
        elif key.startswith("event_crm:"):
            parts = key.split(":", 2)
            if len(parts) != 3:
                continue
            try:
                org_id = int(parts[1])
            except ValueError:
                continue
            email = parts[2].strip().lower()
            if not email:
                continue
            exists = bind.execute(
                sa.select(crm_profiles.c.id).where(crm_profiles.c.organization_id == org_id, crm_profiles.c.email == email)
            ).first()
            if exists:
                continue
            bind.execute(
                crm_profiles.insert().values(
                    organization_id=org_id,
                    email=email,
                    notes=str(value.get("notes") or ""),
                    tags=value.get("tags") or [],
                    lifecycle_status=str(value.get("lifecycle_status") or "lead")[:64],
                    created_at=_parse_dt(value.get("updated_at")) or datetime.utcnow(),
                    updated_at=_parse_dt(value.get("updated_at")) or datetime.utcnow(),
                )
            )
        elif key.startswith("member_privacy:"):
            public_id = key.split(":", 1)[1]
            member = bind.execute(sa.select(public_members.c.id).where(public_members.c.public_id == public_id)).first()
            if not member:
                continue
            visibility = str(value.get("certificate_visibility") or "").strip()
            if visibility not in {"public", "connections_only", "private"}:
                visibility = "private" if bool(value.get("hide_certificates", False)) else "public"
            exists = bind.execute(
                sa.select(member_preferences.c.id).where(member_preferences.c.public_member_id == member.id)
            ).first()
            if exists:
                continue
            bind.execute(
                member_preferences.insert().values(
                    public_member_id=member.id,
                    certificate_visibility=visibility,
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow(),
                )
            )


def downgrade() -> None:
    op.drop_index("ix_member_certificate_preferences_certificate_visibility", table_name="member_certificate_preferences")
    op.drop_index("ix_member_certificate_preferences_public_member_id", table_name="member_certificate_preferences")
    op.drop_table("member_certificate_preferences")
    op.drop_index("ix_participant_crm_org_status", table_name="participant_crm_profiles")
    op.drop_index("ix_participant_crm_profiles_lifecycle_status", table_name="participant_crm_profiles")
    op.drop_index("ix_participant_crm_profiles_email", table_name="participant_crm_profiles")
    op.drop_index("ix_participant_crm_profiles_organization_id", table_name="participant_crm_profiles")
    op.drop_table("participant_crm_profiles")
    op.drop_index("ix_event_automation_dispatch_states_rule_id", table_name="event_automation_dispatch_states")
    op.drop_index("ix_event_automation_dispatch_states_event_id", table_name="event_automation_dispatch_states")
    op.drop_table("event_automation_dispatch_states")
    op.drop_index("ix_event_automation_rules_event_enabled", table_name="event_automation_rules")
    op.drop_index("ix_event_automation_rules_enabled", table_name="event_automation_rules")
    op.drop_index("ix_event_automation_rules_trigger", table_name="event_automation_rules")
    op.drop_index("ix_event_automation_rules_event_id", table_name="event_automation_rules")
    op.drop_table("event_automation_rules")
    op.drop_index("ix_certificate_template_presets_scope_id", table_name="certificate_template_presets")
    op.drop_index("ix_certificate_template_presets_scope_type", table_name="certificate_template_presets")
    op.drop_index("ix_certificate_template_presets_scope", table_name="certificate_template_presets")
    op.drop_table("certificate_template_presets")
