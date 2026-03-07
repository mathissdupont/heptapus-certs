"""Gamification, surveys, and sponsor integration

Revision ID: 011
Revises: 010smtpcreds
Create Date: 2026-03-03 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '011'
down_revision = '010smtpcreds'
branch_labels = None
depends_on = None


def _table_exists(inspector, table_name: str) -> bool:
    return table_name in inspector.get_table_names()


def _column_exists(inspector, table_name: str, column_name: str) -> bool:
    if not _table_exists(inspector, table_name):
        return False
    return any(col.get("name") == column_name for col in inspector.get_columns(table_name))


def _index_exists(inspector, table_name: str, index_name: str) -> bool:
    if not _table_exists(inspector, table_name):
        return False
    return any(idx.get("name") == index_name for idx in inspector.get_indexes(table_name))


def _fk_exists(inspector, table_name: str, fk_name: str) -> bool:
    if not _table_exists(inspector, table_name):
        return False
    return any(fk.get("name") == fk_name for fk in inspector.get_foreign_keys(table_name))


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    # Create badge_rules table
    if not _table_exists(inspector, 'badge_rules'):
        op.create_table(
            'badge_rules',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('event_id', sa.Integer(), nullable=False),
            sa.Column('badge_definitions', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
            sa.Column('enabled', sa.Boolean(), server_default='true', nullable=False),
            sa.Column('created_by', sa.Integer(), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.ForeignKeyConstraint(['created_by'], ['users.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['event_id'], ['events.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('event_id', name='uq_badge_rules_event_id')
        )
        inspector = sa.inspect(bind)
    if not _index_exists(inspector, 'badge_rules', 'ix_badge_rules_event_id'):
        op.create_index('ix_badge_rules_event_id', 'badge_rules', ['event_id'])

    # Create participant_badges table
    if not _table_exists(inspector, 'participant_badges'):
        op.create_table(
            'participant_badges',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('event_id', sa.Integer(), nullable=False),
            sa.Column('attendee_id', sa.Integer(), nullable=False),
            sa.Column('badge_type', sa.String(100), nullable=False),
            sa.Column('criteria_met', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
            sa.Column('awarded_by', sa.Integer(), nullable=True),
            sa.Column('awarded_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column('is_automatic', sa.Boolean(), server_default='true', nullable=False),
            sa.Column('metadata', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
            sa.ForeignKeyConstraint(['attendee_id'], ['attendees.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['awarded_by'], ['users.id'], ondelete='SET NULL'),
            sa.ForeignKeyConstraint(['event_id'], ['events.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('event_id', 'attendee_id', 'badge_type', name='uq_participant_badge')
        )
        inspector = sa.inspect(bind)
    if not _index_exists(inspector, 'participant_badges', 'ix_participant_badges_event_id'):
        op.create_index('ix_participant_badges_event_id', 'participant_badges', ['event_id'])
    if not _index_exists(inspector, 'participant_badges', 'ix_participant_badges_attendee_id'):
        op.create_index('ix_participant_badges_attendee_id', 'participant_badges', ['attendee_id'])

    # Create certificate_tier_rules table
    if not _table_exists(inspector, 'certificate_tier_rules'):
        op.create_table(
            'certificate_tier_rules',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('event_id', sa.Integer(), nullable=False),
            sa.Column('tier_definitions', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
            sa.Column('created_by', sa.Integer(), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.ForeignKeyConstraint(['created_by'], ['users.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['event_id'], ['events.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('event_id', name='uq_cert_tier_rules_event_id')
        )
        inspector = sa.inspect(bind)
    if not _index_exists(inspector, 'certificate_tier_rules', 'ix_cert_tier_rules_event_id'):
        op.create_index('ix_cert_tier_rules_event_id', 'certificate_tier_rules', ['event_id'])

    # Create event_surveys table
    if not _table_exists(inspector, 'event_surveys'):
        op.create_table(
            'event_surveys',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('event_id', sa.Integer(), nullable=False),
            sa.Column('is_required', sa.Boolean(), server_default='true', nullable=False),
            sa.Column('survey_type', sa.String(50), server_default='builtin', nullable=False),
            sa.Column('builtin_questions', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
            sa.Column('external_provider', sa.String(50), nullable=True),
            sa.Column('external_url', sa.Text(), nullable=True),
            sa.Column('external_webhook_key', sa.String(255), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.ForeignKeyConstraint(['event_id'], ['events.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('event_id', name='uq_event_surveys_event_id')
        )
        inspector = sa.inspect(bind)
    if not _index_exists(inspector, 'event_surveys', 'ix_event_surveys_event_id'):
        op.create_index('ix_event_surveys_event_id', 'event_surveys', ['event_id'])

    # Create survey_responses table
    if not _table_exists(inspector, 'survey_responses'):
        op.create_table(
            'survey_responses',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('event_id', sa.Integer(), nullable=False),
            sa.Column('attendee_id', sa.Integer(), nullable=False),
            sa.Column('survey_type', sa.String(50), nullable=False),
            sa.Column('answers', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
            sa.Column('external_response_id', sa.String(255), nullable=True),
            sa.Column('completed_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column('completion_proof', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
            sa.ForeignKeyConstraint(['attendee_id'], ['attendees.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['event_id'], ['events.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('event_id', 'attendee_id', 'survey_type', name='uq_survey_response')
        )
        inspector = sa.inspect(bind)
    if not _index_exists(inspector, 'survey_responses', 'ix_survey_responses_event_id'):
        op.create_index('ix_survey_responses_event_id', 'survey_responses', ['event_id'])
    if not _index_exists(inspector, 'survey_responses', 'ix_survey_responses_attendee_id'):
        op.create_index('ix_survey_responses_attendee_id', 'survey_responses', ['attendee_id'])

    # Create sponsor_slots table
    if not _table_exists(inspector, 'sponsor_slots'):
        op.create_table(
            'sponsor_slots',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('event_id', sa.Integer(), nullable=False),
            sa.Column('slot_position', sa.String(100), nullable=False),
            sa.Column('sponsor_name', sa.String(200), nullable=False),
            sa.Column('sponsor_logo_url', sa.Text(), nullable=False),
            sa.Column('sponsor_website_url', sa.Text(), nullable=False),
            sa.Column('sponsor_color_hex', sa.String(7), server_default='#000000', nullable=False),
            sa.Column('enabled', sa.Boolean(), server_default='true', nullable=False),
            sa.Column('order_index', sa.Integer(), server_default='0', nullable=False),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.ForeignKeyConstraint(['event_id'], ['events.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id')
        )
        inspector = sa.inspect(bind)
    if not _index_exists(inspector, 'sponsor_slots', 'ix_sponsor_slots_event_id'):
        op.create_index('ix_sponsor_slots_event_id', 'sponsor_slots', ['event_id'])

    # Alter attendees table to add survey tracking
    if not _column_exists(inspector, 'attendees', 'survey_completed_at'):
        op.add_column('attendees', sa.Column('survey_completed_at', sa.DateTime(timezone=True), nullable=True))
        inspector = sa.inspect(bind)
    if not _column_exists(inspector, 'attendees', 'survey_required'):
        op.add_column('attendees', sa.Column('survey_required', sa.Boolean(), server_default='true', nullable=False))
        inspector = sa.inspect(bind)
    if not _column_exists(inspector, 'attendees', 'can_download_cert'):
        op.add_column('attendees', sa.Column('can_download_cert', sa.Boolean(), server_default='false', nullable=False))
        inspector = sa.inspect(bind)

    # Alter event_sessions table
    if not _column_exists(inspector, 'event_sessions', 'enable_participation_test'):
        op.add_column('event_sessions', sa.Column('enable_participation_test', sa.Boolean(), server_default='false', nullable=False))
        inspector = sa.inspect(bind)
    if not _column_exists(inspector, 'event_sessions', 'test_score_max'):
        op.add_column('event_sessions', sa.Column('test_score_max', sa.Integer(), server_default='100', nullable=False))
        inspector = sa.inspect(bind)

    # Alter certificates table
    if not _column_exists(inspector, 'certificates', 'certificate_tier'):
        op.add_column('certificates', sa.Column('certificate_tier', sa.String(100), nullable=True))
        inspector = sa.inspect(bind)
    if not _column_exists(inspector, 'certificates', 'tier_template_id'):
        op.add_column('certificates', sa.Column('tier_template_id', sa.Integer(), nullable=True))
        inspector = sa.inspect(bind)
    if not _column_exists(inspector, 'certificates', 'survey_required'):
        op.add_column('certificates', sa.Column('survey_required', sa.Boolean(), server_default='false', nullable=False))
        inspector = sa.inspect(bind)
    if not _column_exists(inspector, 'certificates', 'worldpass_anchor_id'):
        op.add_column('certificates', sa.Column('worldpass_anchor_id', sa.String(255), nullable=True))
        inspector = sa.inspect(bind)
    if _column_exists(inspector, 'certificates', 'tier_template_id') and not _fk_exists(inspector, 'certificates', 'fk_cert_tier_template_id'):
        op.create_foreign_key('fk_cert_tier_template_id', 'certificates', 'certificate_templates', ['tier_template_id'], ['id'], ondelete='SET NULL')


def downgrade() -> None:
    # Drop foreign keys and columns from certificates
    op.drop_constraint('fk_cert_tier_template_id', 'certificates', type_='foreignkey')
    op.drop_column('certificates', 'worldpass_anchor_id')
    op.drop_column('certificates', 'survey_required')
    op.drop_column('certificates', 'tier_template_id')
    op.drop_column('certificates', 'certificate_tier')

    # Drop columns from event_sessions
    op.drop_column('event_sessions', 'test_score_max')
    op.drop_column('event_sessions', 'enable_participation_test')

    # Drop columns from attendees
    op.drop_column('attendees', 'can_download_cert')
    op.drop_column('attendees', 'survey_required')
    op.drop_column('attendees', 'survey_completed_at')

    # Drop tables
    op.drop_index('ix_sponsor_slots_event_id', table_name='sponsor_slots')
    op.drop_table('sponsor_slots')

    op.drop_index('ix_survey_responses_attendee_id', table_name='survey_responses')
    op.drop_index('ix_survey_responses_event_id', table_name='survey_responses')
    op.drop_table('survey_responses')

    op.drop_index('ix_event_surveys_event_id', table_name='event_surveys')
    op.drop_table('event_surveys')

    op.drop_index('ix_cert_tier_rules_event_id', table_name='certificate_tier_rules')
    op.drop_table('certificate_tier_rules')

    op.drop_index('ix_participant_badges_attendee_id', table_name='participant_badges')
    op.drop_index('ix_participant_badges_event_id', table_name='participant_badges')
    op.drop_table('participant_badges')

    op.drop_index('ix_badge_rules_event_id', table_name='badge_rules')
    op.drop_table('badge_rules')
