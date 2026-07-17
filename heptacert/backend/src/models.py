"""SQLAlchemy ORM modelleri (main.py'dan ayiklandi, god-dosya bolme Adim 4b).

main.py `from .models import *` ile bunlari tekrar export eder; mevcut
`from .main import <Model>` kullanimlari (18+ dosya) etkilenmez. TUM modeller
db.Base.registry'sini paylasir (iliskiler string forward-ref ile cozulur).

NOT: `from __future__ import annotations` BILEREK yok — main.py'daki gibi
Mapped[...] annotation'lari eager degerlendirilir ( or. Mapped[Role]).
"""

from datetime import datetime, date, time, timezone, timedelta
from datetime import date as date_type
from typing import Any, Dict, List, Optional, Tuple

import sqlalchemy as sa
from sqlalchemy import (
    Boolean, String, Integer, BigInteger, SmallInteger, DateTime, ForeignKey, Text,
    Enum as SAEnum, UniqueConstraint, Index, CheckConstraint, func, Numeric, Float,
    LargeBinary, Date as sa_Date, Time as sa_Time,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship, selectinload

from .db import Base
from .db_types import JSONB, INET, BIGINT_PK
from .enums import Role, CertStatus, TxType, OrderStatus, AttendeeSource

__all__ = [
    "User",
    "PublicMember",
    "Event",
    "EventTeamMember",
    "Certificate",
    "TrainingAssignment",
    "OrganizationDepartment",
    "TrainingAssignmentTemplate",
    "TrainingRecurringRule",
    "TrainingRenewalNotificationLog",
    "CertificateTemplatePreset",
    "CertificateTemplatePresetVersion",
    "CertificateTemplateRegressionSnapshot",
    "EventAutomationRule",
    "EventAutomationDispatchState",
    "EventAutomationExecutionLog",
    "EventSavedAudienceSegment",
    "SegmentExportJob",
    "ParticipantCrmProfile",
    "ParticipantCrmSnapshot",
    "ParticipantCrmAuditLog",
    "ParticipantCrmSavedView",
    "ParticipantCrmEmailAlias",
    "MemberCertificatePreference",
    "WalletAnalyticsEvent",
    "WalletPrivacyAuditLog",
    "ProductTelemetryEvent",
    "CertificateShareCache",
    "Transaction",
    "SystemConfig",
    "RegistrationOptionCapacity",
    "Order",
    "Subscription",
    "ApiKey",
    "TotpSecret",
    "TotpBackupCode",
    "AuditLog",
    "WebhookEndpoint",
    "WebhookDelivery",
    "Organization",
    "OrganizationAllowlist",
    "OrganizationFollower",
    "CommunityPost",
    "CommunityPostLike",
    "CommunityPostComment",
    "CommunityCommentVote",
    "SupportTicket",
    "WaitlistEntry",
    "VerificationHit",
    "EventTemplateSnapshot",
    "UserEmailConfig",
    "UserGoogleIntegration",
    "UserMicrosoftIntegration",
    "CertificateTemplate",
    "EmailTemplate",
    "BulkEmailJob",
    "SuperadminBulkEmailJob",
    "SystemEmailDigestConfig",
    "BulkCertificateJob",
    "EmailDeliveryLog",
    "WebhookSubscription",
    "WebhookLog",
    "EventSession",
    "Attendee",
    "EventTicket",
    "EventComment",
    "AttendaonceRecord",
    "CfpSubmission",
    "CfpReview",
    "MeetingRequest",
    "LiveQuestion",
    "LiveQuestionVote",
    "LivePoll",
    "LivePollVote",
    "CheckinActivityLog",
    "AgentActionLog",
    "CheckinKioskSession",
    "CheckinNonce",
    "BadgeRule",
    "ParticipantBadge",
    "EventRaffle",
    "EventRaffleWinner",
    "CertificateTierRule",
    "EventSurvey",
    "SurveyResponse",
    "SponsorSlot",
]


class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[Role] = mapped_column(SAEnum(Role, name="role_enum"), index=True)
    heptacoin_balaonce: Mapped[int] = mapped_column("heptacoin_balance", Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True, index=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    verification_token: Mapped[Optional[str]] = mapped_column(String(256), nullable=True)
    password_reset_token: Mapped[Optional[str]] = mapped_column(String(256), nullable=True)
    magic_link_token: Mapped[Optional[str]] = mapped_column(String(256), nullable=True)

    events: Mapped[List["Event"]] = relationship(back_populates="admin")
    transactions: Mapped[List["Transaction"]] = relationship(back_populates="user")
    email_config: Mapped[Optional["UserEmailConfig"]] = relationship(back_populates="user", uselist=False)
    google_integration: Mapped[Optional["UserGoogleIntegration"]] = relationship(back_populates="user", uselist=False)
    ms365_integration: Mapped[Optional["UserMicrosoftIntegration"]] = relationship(back_populates="user", uselist=False)


class PublicMember(Base):
    """Public member profiles - SHARED between Events and Social systems.
    
    Used by:
    - Social/Community Feed System: Member profiles, post authors, commenters, likers
    - Events System: Event attendees with public profiles
    
    A public member can be:
    1. An event attendee who also participates in social (comments, likes, posts to global feed)
    2. A non-attendee who only participates in social (view, comment, like)
    
    Fields:
    - public_id: Shareable profile identifier
    - email: Unique email, used for both event and social authentication
    - display_name: Public name shown in both systems
    - bio, avatar_url, headline, location, website_url: Social profile data
    - password_hash: Authentication for social platform
    - attendees: Event registrations (one PublicMember -> many Attendees)
    - comments: Event comments (comments on specific events)
    
    ** When a public member registers for an event, a new Attendee record is created
       with a foreign key to public_member_id. This allows events to track member data
       while social system tracks the same person's profile and activity.
    """
    __tablename__ = "public_members"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    public_id: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    display_name: Mapped[str] = mapped_column(String(120))
    bio: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    avatar_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    headline: Mapped[Optional[str]] = mapped_column(String(160), nullable=True)
    location: Mapped[Optional[str]] = mapped_column(String(160), nullable=True)
    website_url: Mapped[Optional[str]] = mapped_column(String(2000), nullable=True)
    contact_email: Mapped[Optional[str]] = mapped_column(String(320), nullable=True)
    # WP22 networking: free-text interest/skill tags for meeting discovery (list[str]).
    interests: Mapped[Optional[list]] = mapped_column(JSONB, nullable=True, default=list)
    digest_opt_in: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True, index=True)
    # WP28 Phase C: set once the post-deletion purge has erased this member's remaining
    # PII (email) and anonymized their attendee rows. Idempotency guard for the purge job.
    purged_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True, index=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    verification_token: Mapped[Optional[str]] = mapped_column(String(256), nullable=True)
    password_reset_token: Mapped[Optional[str]] = mapped_column(String(256), nullable=True)

    attendees: Mapped[List["Attendee"]] = relationship(back_populates="public_member")
    comments: Mapped[List["EventComment"]] = relationship(back_populates="public_member", cascade="all, delete-orphan")


class Event(Base):
    __tablename__ = "events"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    public_id: Mapped[Optional[str]] = mapped_column(String(64), unique=True, index=True, nullable=True)
    admin_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(200))
    template_image_url: Mapped[str] = mapped_column(Text)
    config: Mapped[dict] = mapped_column(JSONB, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    cert_seq: Mapped[int] = mapped_column(Integer, default=0)
    # Attendaonce management fields (migration 003)
    event_date: Mapped[Optional[date_type]] = mapped_column(sa_Date, nullable=True)
    event_description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    event_location: Mapped[Optional[str]] = mapped_column(String(300), nullable=True)
    min_sessions_required: Mapped[int] = mapped_column(Integer, default=1)
    # Banner/hero image (migration 004)
    event_banner_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    # Email settings (migration 008)
    auto_email_on_cert: Mapped[bool] = mapped_column(Boolean, default=False)
    cert_email_template_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    # Generalized event feature flags (migration 038)
    event_type: Mapped[str] = mapped_column(String(64), default="certificate_event")
    certificate_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    checkin_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    ticketing_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    registration_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    raffles_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    gamification_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    requires_approval: Mapped[bool] = mapped_column(Boolean, default=False)
    quiz_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    cpd_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    agenda_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    cfp_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    networking_meetings_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    live_engagement_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    # Marketplace fields (migration 079)
    is_marketplace_listed: Mapped[bool] = mapped_column(Boolean, default=False)
    marketplace_category: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    marketplace_description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    marketplace_price: Mapped[Optional[float]] = mapped_column(sa.Numeric(10, 2), nullable=True)

    admin: Mapped["User"] = relationship(back_populates="events")
    certificates: Mapped[List["Certificate"]] = relationship(back_populates="event", cascade="all, delete-orphan", passive_deletes=True)
    sessions: Mapped[List["EventSession"]] = relationship(back_populates="event", cascade="all, delete-orphan", passive_deletes=True)
    attendees: Mapped[List["Attendee"]] = relationship(back_populates="event", cascade="all, delete-orphan", passive_deletes=True)
    tickets: Mapped[List["EventTicket"]] = relationship(back_populates="event", cascade="all, delete-orphan", passive_deletes=True)
    comments: Mapped[List["EventComment"]] = relationship(back_populates="event", cascade="all, delete-orphan", passive_deletes=True)
    raffles: Mapped[List["EventRaffle"]] = relationship(back_populates="event", cascade="all, delete-orphan", passive_deletes=True)
    template_snapshots: Mapped[List["EventTemplateSnapshot"]] = relationship(back_populates="event", cascade="all, delete-orphan", passive_deletes=True)
    email_templates: Mapped[List["EmailTemplate"]] = relationship(back_populates="event", cascade="all, delete-orphan", passive_deletes=True)
    bulk_email_jobs: Mapped[List["BulkEmailJob"]] = relationship(back_populates="event", cascade="all, delete-orphan", passive_deletes=True)
    bulk_certificate_jobs: Mapped[List["BulkCertificateJob"]] = relationship(back_populates="event", cascade="all, delete-orphan", passive_deletes=True)
    team_members: Mapped[List["EventTeamMember"]] = relationship(back_populates="event", cascade="all, delete-orphan", passive_deletes=True)

    __table_args__ = (Index("ix_events_admin_id_created", "admin_id", "created_at"),)


class EventTeamMember(Base):
    __tablename__ = "event_team_members"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    event_id: Mapped[int] = mapped_column(Integer, ForeignKey("events.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    email: Mapped[str] = mapped_column(String(320), index=True)
    role: Mapped[str] = mapped_column(String(32), default="checkin", index=True)
    permissions: Mapped[Optional[list]] = mapped_column(JSONB, nullable=True)
    status: Mapped[str] = mapped_column(String(24), default="active", index=True)
    invited_by: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    event: Mapped["Event"] = relationship(back_populates="team_members")
    user: Mapped[Optional["User"]] = relationship(foreign_keys=[user_id])
    inviter: Mapped[Optional["User"]] = relationship(foreign_keys=[invited_by])

    __table_args__ = (
        UniqueConstraint("event_id", "email", name="uq_event_team_members_event_email"),
        Index("ix_event_team_members_event_status", "event_id", "status"),
    )


class Certificate(Base):
    __tablename__ = "certificates"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    uuid: Mapped[str] = mapped_column(String(36), unique=True, index=True)
    student_name: Mapped[str] = mapped_column(String(200))
    event_id: Mapped[int] = mapped_column(ForeignKey("events.id", ondelete="CASCADE"), index=True)
    # Canonical link to the attendee this certificate was issued for. Nullable
    # because single-issue certs can be created from a free-text name with no
    # attendee. Matching prefers this id and falls back to student_name when null.
    attendee_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("attendees.id", ondelete="SET NULL"), nullable=True, index=True
    )
    pdf_url: Mapped[str] = mapped_column(Text)
    status: Mapped[CertStatus] = mapped_column(SAEnum(CertStatus, name="cert_status_enum"), default=CertStatus.active)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    public_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    issued_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    hosting_term: Mapped[str] = mapped_column(String(16), default="yearly")
    hosting_ends_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    auto_renew_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    asset_size_bytes: Mapped[int] = mapped_column(Integer, default=0)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    certificate_tier: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    tier_template_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    survey_required: Mapped[bool] = mapped_column(Boolean, default=False)
    worldpass_anchor_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)

    event: Mapped["Event"] = relationship(back_populates="certificates")

    __table_args__ = (
        UniqueConstraint("event_id", "student_name", "uuid", name="uq_cert_event_student_uuid"),
        Index("ix_cert_event_status", "event_id", "status"),
    )


class TrainingAssignment(Base):
    __tablename__ = "training_assignments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    organization_id: Mapped[int] = mapped_column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), index=True)
    event_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("events.id", ondelete="SET NULL"), nullable=True, index=True)
    course_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("training_courses.id", ondelete="SET NULL"), nullable=True, index=True)
    renewal_event_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("events.id", ondelete="SET NULL"), nullable=True, index=True)
    certificate_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("certificates.id", ondelete="SET NULL"), nullable=True, index=True)
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    assignee_name: Mapped[str] = mapped_column(String(200))
    assignee_email: Mapped[str] = mapped_column(String(320), index=True)
    department_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("organization_departments.id", ondelete="SET NULL"), nullable=True, index=True)
    department: Mapped[Optional[str]] = mapped_column(String(160), nullable=True, index=True)
    manager_email: Mapped[Optional[str]] = mapped_column(String(320), nullable=True, index=True)
    approval_status: Mapped[str] = mapped_column(String(32), default="not_required", index=True)
    approved_by: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    approved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    evidence_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    evidence_label: Mapped[Optional[str]] = mapped_column(String(160), nullable=True)
    template_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("training_assignment_templates.id", ondelete="SET NULL"), nullable=True, index=True)
    recurring_rule_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("training_recurring_rules.id", ondelete="SET NULL"), nullable=True, index=True)
    required: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    status: Mapped[str] = mapped_column(String(32), default="assigned", index=True)
    due_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True, index=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    renewal_due_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True, index=True)
    notify_before_days: Mapped[int] = mapped_column(Integer, default=30)
    last_notified_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_by: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        Index("ix_training_assignments_org_status", "organization_id", "status"),
        Index("ix_training_assignments_org_department", "organization_id", "department"),
        Index("ix_training_assignments_org_renewal", "organization_id", "renewal_due_at"),
    )


class OrganizationDepartment(Base):
    __tablename__ = "organization_departments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    organization_id: Mapped[int] = mapped_column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(160))
    code: Mapped[Optional[str]] = mapped_column(String(80), nullable=True)
    manager_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    manager_email: Mapped[Optional[str]] = mapped_column(String(320), nullable=True)
    active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    created_by: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        UniqueConstraint("organization_id", "name", name="uq_org_department_name"),
        Index("ix_org_departments_org_active", "organization_id", "active"),
    )


class TrainingAssignmentTemplate(Base):
    __tablename__ = "training_assignment_templates"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    organization_id: Mapped[int] = mapped_column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), index=True)
    department_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("organization_departments.id", ondelete="SET NULL"), nullable=True, index=True)
    name: Mapped[str] = mapped_column(String(160))
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    required: Mapped[bool] = mapped_column(Boolean, default=True)
    default_due_days: Mapped[int] = mapped_column(Integer, default=30)
    renewal_interval_days: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    notify_before_days: Mapped[int] = mapped_column(Integer, default=30)
    approval_required: Mapped[bool] = mapped_column(Boolean, default=False)
    active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    created_by: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        Index("ix_training_templates_org_department", "organization_id", "department_id"),
    )


class TrainingRecurringRule(Base):
    __tablename__ = "training_recurring_rules"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    organization_id: Mapped[int] = mapped_column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), index=True)
    template_id: Mapped[int] = mapped_column(Integer, ForeignKey("training_assignment_templates.id", ondelete="CASCADE"), index=True)
    department_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("organization_departments.id", ondelete="SET NULL"), nullable=True, index=True)
    source: Mapped[str] = mapped_column(String(48), default="manual")
    enabled: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    lookback_days: Mapped[int] = mapped_column(Integer, default=30)
    last_run_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_by: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        Index("ix_training_recurring_org_enabled", "organization_id", "enabled"),
    )


class TrainingRenewalNotificationLog(Base):
    __tablename__ = "training_renewal_notification_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    organization_id: Mapped[int] = mapped_column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), index=True)
    assignment_id: Mapped[int] = mapped_column(Integer, ForeignKey("training_assignments.id", ondelete="CASCADE"), index=True)
    recipient_email: Mapped[str] = mapped_column(String(320), index=True)
    status: Mapped[str] = mapped_column(String(32), default="pending", index=True)
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    target_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    sent_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("ix_training_notification_assignment_status", "assignment_id", "status"),
    )


class CertificateTemplatePreset(Base):
    __tablename__ = "certificate_template_presets"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    scope_type: Mapped[str] = mapped_column(String(16), index=True)
    scope_id: Mapped[int] = mapped_column(Integer, index=True)
    name: Mapped[str] = mapped_column(String(80))
    template_image_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    config: Mapped[dict] = mapped_column(JSONB, default=dict)
    min_plan: Mapped[str] = mapped_column(String(32), default="growth", index=True)
    enterprise_locked: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    version: Mapped[int] = mapped_column(Integer, default=1)
    locked_by: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        Index("ix_certificate_template_presets_scope", "scope_type", "scope_id"),
    )


class CertificateTemplatePresetVersion(Base):
    __tablename__ = "certificate_template_preset_versions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    preset_id: Mapped[str] = mapped_column(String(64), ForeignKey("certificate_template_presets.id", ondelete="CASCADE"), index=True)
    version: Mapped[int] = mapped_column(Integer, index=True)
    template_image_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    config: Mapped[dict] = mapped_column(JSONB, default=dict)
    created_by: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint("preset_id", "version", name="uq_template_preset_version"),
    )


class CertificateTemplateRegressionSnapshot(Base):
    __tablename__ = "certificate_template_regression_snapshots"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    preset_id: Mapped[str] = mapped_column(String(64), ForeignKey("certificate_template_presets.id", ondelete="CASCADE"), index=True)
    scenario: Mapped[str] = mapped_column(String(80), index=True)
    render_hash: Mapped[str] = mapped_column(String(128))
    payload: Mapped[dict] = mapped_column(JSONB, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class EventAutomationRule(Base):
    __tablename__ = "event_automation_rules"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    event_id: Mapped[int] = mapped_column(Integer, ForeignKey("events.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(120))
    trigger: Mapped[str] = mapped_column(String(64), index=True)
    trigger_config: Mapped[dict] = mapped_column(JSONB, default=dict)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    actions: Mapped[list] = mapped_column(JSONB, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        Index("ix_event_automation_rules_event_enabled", "event_id", "enabled"),
    )


class EventAutomationDispatchState(Base):
    __tablename__ = "event_automation_dispatch_states"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    event_id: Mapped[int] = mapped_column(Integer, ForeignKey("events.id", ondelete="CASCADE"), index=True)
    rule_id: Mapped[str] = mapped_column(String(64), index=True)
    state: Mapped[dict] = mapped_column(JSONB, default=dict)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        UniqueConstraint("event_id", "rule_id", name="uq_event_automation_dispatch_event_rule"),
    )


class EventAutomationExecutionLog(Base):
    __tablename__ = "event_automation_execution_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    event_id: Mapped[int] = mapped_column(Integer, ForeignKey("events.id", ondelete="CASCADE"), index=True)
    rule_id: Mapped[str] = mapped_column(String(64), index=True)
    attendee_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("attendees.id", ondelete="SET NULL"), nullable=True, index=True)
    recipient_email: Mapped[Optional[str]] = mapped_column(String(320), nullable=True)
    action_index: Mapped[int] = mapped_column(Integer, default=0)
    action_type: Mapped[str] = mapped_column(String(48), index=True)
    idempotency_key: Mapped[str] = mapped_column(String(160))
    status: Mapped[str] = mapped_column(String(32), default="pending", index=True)
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    next_attempt_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True, index=True)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    response_status: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    payload: Mapped[dict] = mapped_column(JSONB, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    dispatched_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        UniqueConstraint("event_id", "idempotency_key", name="uq_event_automation_exec_event_key"),
        Index("ix_event_automation_exec_event_rule_status", "event_id", "rule_id", "status"),
    )


class EventSavedAudienceSegment(Base):
    __tablename__ = "event_saved_audience_segments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    event_id: Mapped[int] = mapped_column(Integer, ForeignKey("events.id", ondelete="CASCADE"), index=True)
    created_by: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    name: Mapped[str] = mapped_column(String(120))
    segment_key: Mapped[str] = mapped_column(String(64), index=True)
    filters: Mapped[dict] = mapped_column(JSONB, default=dict)
    visibility: Mapped[str] = mapped_column(String(24), default="private", index=True)
    last_count: Mapped[int] = mapped_column(Integer, default=0)
    last_computed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        Index("ix_event_saved_segments_event_visibility", "event_id", "visibility"),
    )


class SegmentExportJob(Base):
    __tablename__ = "segment_export_jobs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    event_id: Mapped[int] = mapped_column(Integer, ForeignKey("events.id", ondelete="CASCADE"), index=True)
    created_by: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    segment_key: Mapped[str] = mapped_column(String(64), index=True)
    filters: Mapped[dict] = mapped_column(JSONB, default=dict)
    status: Mapped[str] = mapped_column(String(32), default="pending", index=True)
    row_count: Mapped[int] = mapped_column(Integer, default=0)
    file_path: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    file_name: Mapped[Optional[str]] = mapped_column(String(240), nullable=True)
    sync_google_sheets: Mapped[bool] = mapped_column(Boolean, default=False)
    google_spreadsheet_id: Mapped[Optional[str]] = mapped_column(String(160), nullable=True)
    google_spreadsheet_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    google_sheet_name: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        Index("ix_segment_export_jobs_event_status", "event_id", "status"),
    )


class ParticipantCrmProfile(Base):
    __tablename__ = "participant_crm_profiles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    organization_id: Mapped[int] = mapped_column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), index=True)
    email: Mapped[str] = mapped_column(String(320), index=True)
    notes: Mapped[str] = mapped_column(Text, default="")
    tags: Mapped[list] = mapped_column(JSONB, default=list)
    lifecycle_status: Mapped[str] = mapped_column(String(64), default="lead", index=True)
    owner_user_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    priority: Mapped[str] = mapped_column(String(32), default="normal", index=True)
    lead_score: Mapped[int] = mapped_column(Integer, default=0, index=True)
    next_follow_up_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True, index=True)
    custom_fields: Mapped[dict] = mapped_column(JSONB, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        UniqueConstraint("organization_id", "email", name="uq_participant_crm_org_email"),
        Index("ix_participant_crm_org_status", "organization_id", "lifecycle_status"),
    )


class ParticipantCrmSnapshot(Base):
    __tablename__ = "participant_crm_snapshots"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    organization_id: Mapped[int] = mapped_column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), index=True)
    email: Mapped[str] = mapped_column(String(320), index=True)
    name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    event_count: Mapped[int] = mapped_column(Integer, default=0)
    certificate_count: Mapped[int] = mapped_column(Integer, default=0)
    attended_count: Mapped[int] = mapped_column(Integer, default=0)
    survey_count: Mapped[int] = mapped_column(Integer, default=0)
    ticket_count: Mapped[int] = mapped_column(Integer, default=0)
    latest_activity_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True, index=True)
    computed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        UniqueConstraint("organization_id", "email", name="uq_participant_crm_snapshot_org_email"),
        Index("ix_participant_crm_snapshot_org_latest", "organization_id", "latest_activity_at"),
    )


class ParticipantCrmAuditLog(Base):
    __tablename__ = "participant_crm_audit_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    organization_id: Mapped[int] = mapped_column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), index=True)
    email: Mapped[str] = mapped_column(String(320), index=True)
    actor_user_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    action: Mapped[str] = mapped_column(String(64), index=True)
    before: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    after: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)

    __table_args__ = (
        Index("ix_participant_crm_audit_org_email_created", "organization_id", "email", "created_at"),
    )


class ParticipantCrmSavedView(Base):
    __tablename__ = "participant_crm_saved_views"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    organization_id: Mapped[int] = mapped_column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), index=True)
    created_by: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    name: Mapped[str] = mapped_column(String(120))
    filters: Mapped[dict] = mapped_column(JSONB, default=dict)
    visibility: Mapped[str] = mapped_column(String(24), default="private", index=True)
    last_count: Mapped[int] = mapped_column(Integer, default=0)
    last_computed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        Index("ix_participant_crm_saved_views_org_visibility", "organization_id", "visibility"),
    )


class ParticipantCrmEmailAlias(Base):
    __tablename__ = "participant_crm_email_aliases"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    organization_id: Mapped[int] = mapped_column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), index=True)
    source_email: Mapped[str] = mapped_column(String(320), index=True)
    target_email: Mapped[str] = mapped_column(String(320), index=True)
    created_by: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint("organization_id", "source_email", name="uq_participant_crm_alias_org_source"),
        Index("ix_participant_crm_alias_org_target", "organization_id", "target_email"),
    )


class MemberCertificatePreference(Base):
    __tablename__ = "member_certificate_preferences"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    public_member_id: Mapped[int] = mapped_column(Integer, ForeignKey("public_members.id", ondelete="CASCADE"), unique=True, index=True)
    certificate_visibility: Mapped[str] = mapped_column(String(32), default="public", index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class WalletAnalyticsEvent(Base):
    __tablename__ = "wallet_analytics_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    public_member_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("public_members.id", ondelete="SET NULL"), nullable=True, index=True)
    certificate_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("certificates.id", ondelete="SET NULL"), nullable=True, index=True)
    event_type: Mapped[str] = mapped_column(String(48), index=True)
    source: Mapped[str] = mapped_column(String(48), default="public", index=True)
    ip_address: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)
    user_agent: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    metadata_json: Mapped[dict] = mapped_column(JSONB, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)

    __table_args__ = (
        Index("ix_wallet_analytics_member_event_created", "public_member_id", "event_type", "created_at"),
    )


class WalletPrivacyAuditLog(Base):
    __tablename__ = "wallet_privacy_audit_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    public_member_id: Mapped[int] = mapped_column(Integer, ForeignKey("public_members.id", ondelete="CASCADE"), index=True)
    actor_public_member_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("public_members.id", ondelete="SET NULL"), nullable=True, index=True)
    action: Mapped[str] = mapped_column(String(64), index=True)
    before: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    after: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    ip_address: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)
    user_agent: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)


class ProductTelemetryEvent(Base):
    __tablename__ = "product_telemetry_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    event_name: Mapped[str] = mapped_column(String(80), index=True)
    feature_key: Mapped[str] = mapped_column(String(80), index=True)
    resource_type: Mapped[Optional[str]] = mapped_column(String(64), nullable=True, index=True)
    resource_id: Mapped[Optional[str]] = mapped_column(String(80), nullable=True)
    metadata_json: Mapped[dict] = mapped_column(JSONB, default=dict)
    user_agent: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)

    __table_args__ = (
        Index("ix_product_telemetry_feature_event_created", "feature_key", "event_name", "created_at"),
    )


class CertificateShareCache(Base):
    __tablename__ = "certificate_share_caches"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    certificate_id: Mapped[int] = mapped_column(Integer, ForeignKey("certificates.id", ondelete="CASCADE"), index=True)
    cache_key: Mapped[str] = mapped_column(String(160), unique=True, index=True)
    image_path: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    version_hash: Mapped[str] = mapped_column(String(128), index=True)
    invalidated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class Transaction(Base):
    __tablename__ = "transactions"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    amount: Mapped[int] = mapped_column(Integer)
    type: Mapped[TxType] = mapped_column(SAEnum(TxType, name="tx_type_enum"), index=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    description: Mapped[Optional[str]] = mapped_column(String(256), nullable=True)

    user: Mapped["User"] = relationship(back_populates="transactions")

    __table_args__ = (Index("ix_tx_user_time", "user_id", "timestamp"),)


class SystemConfig(Base):
    __tablename__ = "system_configs"
    key: Mapped[str] = mapped_column(String(128), primary_key=True)
    value: Mapped[dict] = mapped_column(JSONB, default=dict)


class RegistrationOptionCapacity(Base):
    __tablename__ = "registration_option_capacities"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    event_id: Mapped[int] = mapped_column(ForeignKey("events.id", ondelete="CASCADE"), index=True)
    field_id: Mapped[str] = mapped_column(String(64), index=True)
    option_label: Mapped[str] = mapped_column(String(200))
    capacity: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    reserved_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (UniqueConstraint("event_id", "field_id", "option_label", name="uq_regopt_event_field_option"),)


class Order(Base):
    __tablename__ = "orders"
    id:           Mapped[int]      = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id:      Mapped[int]      = mapped_column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    plan_id:      Mapped[str]      = mapped_column(String(64))
    amount_cents: Mapped[int]      = mapped_column(Integer)
    currency:     Mapped[str]      = mapped_column(String(8), default="TRY")
    provider:     Mapped[str]      = mapped_column(String(32))   # iyzico | paytr | stripe
    provider_ref: Mapped[Optional[str]] = mapped_column(String(256), nullable=True)
    status:       Mapped[str]      = mapped_column(String(32), default=OrderStatus.pending)
    created_at:   Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    paid_at:      Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    meta:         Mapped[dict]     = mapped_column(JSONB, default=dict)  # extra info

    __table_args__ = (Index("ix_order_user", "user_id"), Index("ix_order_status", "status"))


class Subscription(Base):
    __tablename__ = "subscriptions"
    id:         Mapped[int]      = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id:    Mapped[int]      = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    plan_id:    Mapped[str]      = mapped_column(String(64))
    order_id:   Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("orders.id", ondelete="SET NULL"), nullable=True)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    is_active:  Mapped[bool]     = mapped_column(Boolean, default=True)
    last_hc_credited_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    __table_args__ = (Index("ix_sub_user", "user_id"),)


class ApiKey(Base):
    __tablename__ = "api_keys"
    id:                  Mapped[int]              = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id:             Mapped[int]              = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    name:                Mapped[str]              = mapped_column(String(200))
    key_prefix:          Mapped[str]              = mapped_column(String(8))
    key_hash:            Mapped[str]              = mapped_column(String(128), unique=True)
    scopes:              Mapped[list]             = mapped_column(JSONB, default=list)
    is_active:           Mapped[bool]             = mapped_column(Boolean, default=True)
    last_used_at:        Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    expires_at:          Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at:          Mapped[datetime]         = mapped_column(DateTime(timezone=True), server_default=func.now())
    rate_limit_per_min:  Mapped[Optional[int]]    = mapped_column(Integer, nullable=True)


class TotpSecret(Base):
    __tablename__ = "totp_secrets"
    user_id:    Mapped[int]     = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    secret:     Mapped[str]     = mapped_column(String(64))
    enabled:    Mapped[bool]    = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class TotpBackupCode(Base):
    __tablename__ = "totp_backup_codes"
    id:         Mapped[int]              = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id:    Mapped[int]              = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    code_hash:  Mapped[str]              = mapped_column(String(64))
    used_at:    Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime]         = mapped_column(DateTime(timezone=True), server_default=func.now())


class AuditLog(Base):
    __tablename__ = "audit_logs"
    id:            Mapped[int]           = mapped_column(BIGINT_PK, primary_key=True, autoincrement=True)
    user_id:       Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    action:        Mapped[str]           = mapped_column(String(128))
    resource_type: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    resource_id:   Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    ip_address:    Mapped[Optional[str]] = mapped_column(INET, nullable=True)
    user_agent:    Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    extra:         Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    created_at:    Mapped[datetime]      = mapped_column(DateTime(timezone=True), server_default=func.now())


class WebhookEndpoint(Base):
    __tablename__ = "webhook_endpoints"
    id:           Mapped[int]           = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id:      Mapped[int]           = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    url:          Mapped[str]           = mapped_column(Text)
    events:       Mapped[list]          = mapped_column(JSONB, default=list)
    secret:       Mapped[str]           = mapped_column(String(64))
    is_active:    Mapped[bool]          = mapped_column(Boolean, default=True)
    created_at:   Mapped[datetime]      = mapped_column(DateTime(timezone=True), server_default=func.now())
    last_fired_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)


class WebhookDelivery(Base):
    __tablename__ = "webhook_deliveries"
    id:           Mapped[int]           = mapped_column(BIGINT_PK, primary_key=True, autoincrement=True)
    endpoint_id:  Mapped[int]           = mapped_column(Integer, ForeignKey("webhook_endpoints.id", ondelete="CASCADE"))
    event_type:   Mapped[str]           = mapped_column(String(64))
    payload:      Mapped[dict]          = mapped_column(JSONB, default=dict)
    status:       Mapped[str]           = mapped_column(String(16), default="pending")
    http_status:  Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    response_body: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    attempt:      Mapped[int]           = mapped_column(Integer, default=1)
    delivered_at: Mapped[datetime]      = mapped_column(DateTime(timezone=True), server_default=func.now())


class Organization(Base):
    """Organization profiles - SHARED between Events and Social systems.
    
    Used by:
    - Social/Community Feed System: Organization profiles, organization-specific feeds
    - Events System: Admin's organization context (future - for org-specific event management)
    
    Fields:
    - user_id: Foreign key to Users table (admin who owns this organization)
    - public_id: Shareable identifier for public-facing URLs
    - org_name: Organization display name
    - custom_domain: Optional custom domain for branded experieonce
    - brand_logo: Organization logo URL
    - brand_color: Primary color (hex) for branding
    - settings: JSON config for organization-specific settings
    
    Relationships:
    - CommunityPost: Organization can have organization-specific feeds
    - OrganizationFollower: Social followers on this organization
    
    Permissions:
    - Admin (user_id) can create posts via /api/admin/community/posts if they have Growth/Enterprise subscription
    - Public members can view organization feeds via GET /api/public/organizations/{org_id}/feed
    - Public members can comment/like on organization posts
    - Public members cannot create posts to organization feeds (use global feed instead)
    """
    __tablename__ = "organizations"
    id:            Mapped[int]           = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id:       Mapped[int]           = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    public_id:     Mapped[str]           = mapped_column(String(64), unique=True, index=True)
    org_name:      Mapped[str]           = mapped_column(String(200))
    custom_domain: Mapped[Optional[str]] = mapped_column(String(253), unique=True, nullable=True)
    brand_logo:    Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    brand_color:   Mapped[str]           = mapped_column(String(7), default="#6366f1")
    settings:      Mapped[dict]          = mapped_column(JSONB, default=dict)
    created_at:    Mapped[datetime]      = mapped_column(DateTime(timezone=True), server_default=func.now())


class OrganizationAllowlist(Base):
    __tablename__ = "organization_allowlists"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    org_id: Mapped[int] = mapped_column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), index=True)
    email: Mapped[str] = mapped_column(String(320), nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class OrganizationFollower(Base):
    __tablename__ = "organization_followers"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    org_id: Mapped[int] = mapped_column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), index=True)
    public_member_id: Mapped[int] = mapped_column(Integer, ForeignKey("public_members.id", ondelete="CASCADE"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint("org_id", "public_member_id", name="uq_org_follow_member"),
    )


class CommunityPost(Base):
    __tablename__ = "community_posts"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    public_id: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    org_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), index=True, nullable=True)
    author_user_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id", ondelete="SET NULL"), index=True, nullable=True)
    author_public_member_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("public_members.id", ondelete="SET NULL"), index=True, nullable=True)
    body: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), default="visible", index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class CommunityPostLike(Base):
    __tablename__ = "community_post_likes"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    post_id: Mapped[int] = mapped_column(Integer, ForeignKey("community_posts.id", ondelete="CASCADE"), index=True)
    public_member_id: Mapped[int] = mapped_column(Integer, ForeignKey("public_members.id", ondelete="CASCADE"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint("post_id", "public_member_id", name="uq_comm_post_like_member"),
    )


class CommunityPostComment(Base):
    """Comment on a community post. Supports nested replies (max 2-3 levels deep).
    
    - parent_comment_id: If set, this comment is a reply to another comment
    - upvote_count/downvote_count: Vote tracking
    - status: 'visible' or 'hidden' for moderation
    """
    __tablename__ = "community_post_comments"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    post_id: Mapped[int] = mapped_column(Integer, ForeignKey("community_posts.id", ondelete="CASCADE"), index=True)
    public_member_id: Mapped[int] = mapped_column(Integer, ForeignKey("public_members.id", ondelete="CASCADE"), index=True)
    parent_comment_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("community_post_comments.id", ondelete="CASCADE"), nullable=True, index=True)
    body: Mapped[str] = mapped_column(Text)
    upvote_count: Mapped[int] = mapped_column(Integer, default=0)
    downvote_count: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(20), default="visible", index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class CommunityCommentVote(Base):
    """Vote tracking for community post comments (upvote/downvote).
    
    Stores which member voted on which comment and the vote type.
    vote_type: 'upvote', 'downvote', or 'none' (to track undo)
    """
    __tablename__ = "community_comment_votes"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    comment_id: Mapped[int] = mapped_column(Integer, ForeignKey("community_post_comments.id", ondelete="CASCADE"), index=True)
    member_id: Mapped[int] = mapped_column(Integer, ForeignKey("public_members.id", ondelete="CASCADE"), index=True)
    vote_type: Mapped[str] = mapped_column(String(20))  # 'upvote', 'downvote', 'none'
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    __table_args__ = (
        UniqueConstraint('comment_id', 'member_id', name='uq_comment_member_vote'),
    )


class SupportTicket(Base):
    """Support tickets created when AI assistant can't help organizationally.
    
    Used for escalation when users need human support.
    Superadmins can view and respond to these tickets.
    """
    __tablename__ = "support_tickets"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    organization_id: Mapped[int] = mapped_column(Integer, ForeignKey("organizations.id"), index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), index=True)
    subject: Mapped[str] = mapped_column(String(255))
    messages: Mapped[list] = mapped_column(JSONB, default=list)  # [{role: 'user'|'admin', message: str, timestamp: str}, ...]
    status: Mapped[str] = mapped_column(String(20), default="open", index=True)  # open, in_progress, resolved, closed
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class WaitlistEntry(Base):
    __tablename__ = "waitlist_entries"
    id:            Mapped[int]           = mapped_column(Integer, primary_key=True, autoincrement=True)
    name:          Mapped[str]           = mapped_column(String(200))
    email:         Mapped[str]           = mapped_column(String(255), unique=True)
    phone:         Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    plan_interest: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    note:          Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at:    Mapped[datetime]      = mapped_column(DateTime(timezone=True), server_default=func.now())


class VerificationHit(Base):
    __tablename__ = "verification_hits"
    id:         Mapped[int]           = mapped_column(BIGINT_PK, primary_key=True, autoincrement=True)
    cert_uuid:  Mapped[str]           = mapped_column(String(36))
    viewed_at:  Mapped[datetime]      = mapped_column(DateTime(timezone=True), server_default=func.now())
    ip_address: Mapped[Optional[str]] = mapped_column(INET, nullable=True)
    user_agent: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    referer:    Mapped[Optional[str]] = mapped_column(Text, nullable=True)


class EventTemplateSnapshot(Base):
    __tablename__ = "event_template_snapshots"
    id:                 Mapped[int]           = mapped_column(Integer, primary_key=True, autoincrement=True)
    event_id:           Mapped[int]           = mapped_column(Integer, ForeignKey("events.id", ondelete="CASCADE"), index=True)
    template_image_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    config:             Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    created_by:         Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at:         Mapped[datetime]      = mapped_column(DateTime(timezone=True), server_default=func.now())

    event: Mapped["Event"] = relationship(back_populates="template_snapshots")


class UserEmailConfig(Base):
    __tablename__ = "user_email_configs"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, index=True)
    smtp_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    smtp_host: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    smtp_port: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    smtp_use_tls: Mapped[bool] = mapped_column(Boolean, default=True)
    smtp_user: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    smtp_password: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    from_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    from_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    reply_to: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    auto_cc: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    enable_tracking_pixel: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user: Mapped["User"] = relationship(back_populates="email_config")


class UserGoogleIntegration(Base):
    __tablename__ = "user_google_integrations"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, index=True)
    google_email: Mapped[Optional[str]] = mapped_column(String(320), nullable=True)
    access_token: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    refresh_token: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    token_expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    scopes: Mapped[list] = mapped_column(JSONB, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user: Mapped["User"] = relationship(back_populates="google_integration")


class UserMicrosoftIntegration(Base):
    __tablename__ = "user_microsoft_integrations"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, index=True)
    microsoft_email: Mapped[Optional[str]] = mapped_column(String(320), nullable=True)
    access_token: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    refresh_token: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    token_expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    scopes: Mapped[list] = mapped_column(JSONB, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user: Mapped["User"] = relationship(back_populates="ms365_integration")


class CertificateTemplate(Base):
    __tablename__ = "certificate_templates"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(200))
    template_image_url: Mapped[str] = mapped_column(Text)
    config: Mapped[dict] = mapped_column(JSONB, default=dict)
    is_default: Mapped[bool] = mapped_column(Boolean, default=True)
    order_index: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class EmailTemplate(Base):
    __tablename__ = "email_templates"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    event_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("events.id", ondelete="CASCADE"), index=True, nullable=True)
    created_by: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(200))
    subject_tr: Mapped[str] = mapped_column(String(255))
    subject_en: Mapped[str] = mapped_column(String(255))
    body_html: Mapped[str] = mapped_column(Text)
    template_type: Mapped[str] = mapped_column(String(50), default="custom")  # system or custom
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    event: Mapped[Optional["Event"]] = relationship(back_populates="email_templates")
    creator: Mapped["User"] = relationship(foreign_keys=[created_by])


class BulkEmailJob(Base):
    __tablename__ = "bulk_email_jobs"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    event_id: Mapped[int] = mapped_column(Integer, ForeignKey("events.id", ondelete="CASCADE"), index=True)
    created_by: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    email_template_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("email_templates.id", ondelete="SET NULL"), nullable=True)
    recipient_type: Mapped[str] = mapped_column(String(32), default="attendees")
    recipients_count: Mapped[int] = mapped_column(Integer, default=0)
    sent_count: Mapped[int] = mapped_column(Integer, default=0)
    failed_count: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(50), default="pending")  # pending | sending | completed | failed
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    scheduled_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    cron_expression: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    event: Mapped["Event"] = relationship(back_populates="bulk_email_jobs")
    creator: Mapped["User"] = relationship(foreign_keys=[created_by])
    email_template: Mapped[Optional["EmailTemplate"]] = relationship()


class SuperadminBulkEmailJob(Base):
    __tablename__ = "superadmin_bulk_email_jobs"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    created_by: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    source: Mapped[str] = mapped_column(String(32), default="all", index=True)
    job_kind: Mapped[str] = mapped_column(String(32), default="manual", index=True)
    subject: Mapped[str] = mapped_column(String(240))
    body_html: Mapped[str] = mapped_column(Text)
    total_targets: Mapped[int] = mapped_column(Integer, default=0)
    sent_count: Mapped[int] = mapped_column(Integer, default=0)
    failed_count: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(32), default="pending", index=True)
    cancel_requested: Mapped[bool] = mapped_column(Boolean, default=False)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    creator: Mapped["User"] = relationship(foreign_keys=[created_by])


class SystemEmailDigestConfig(Base):
    __tablename__ = "system_email_digest_configs"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    frequency: Mapped[str] = mapped_column(String(16), default="weekly")
    send_weekday: Mapped[int] = mapped_column(Integer, default=1)
    send_hour: Mapped[int] = mapped_column(Integer, default=8)
    max_events: Mapped[int] = mapped_column(Integer, default=3)
    max_posts: Mapped[int] = mapped_column(Integer, default=3)
    last_sent_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    updated_by: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    updater: Mapped[Optional["User"]] = relationship(foreign_keys=[updated_by])


class BulkCertificateJob(Base):
    __tablename__ = "bulk_certificate_jobs"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    event_id: Mapped[int] = mapped_column(Integer, ForeignKey("events.id", ondelete="CASCADE"), index=True)
    created_by: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    names: Mapped[list] = mapped_column(JSONB, default=list)
    chunk_size: Mapped[int] = mapped_column(Integer, default=10)
    total_count: Mapped[int] = mapped_column(Integer, default=0)
    current_index: Mapped[int] = mapped_column(Integer, default=0)
    created_count: Mapped[int] = mapped_column(Integer, default=0)
    failed_count: Mapped[int] = mapped_column(Integer, default=0)
    already_exists_count: Mapped[int] = mapped_column(Integer, default=0)
    spent_heptacoin: Mapped[int] = mapped_column(Integer, default=0)
    generated_files: Mapped[list] = mapped_column(JSONB, default=list)
    zip_file_path: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="pending")  # pending | processing | completed | failed | cancelled
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    event: Mapped["Event"] = relationship(back_populates="bulk_certificate_jobs")
    creator: Mapped["User"] = relationship(foreign_keys=[created_by])


class EmailDeliveryLog(Base):
    __tablename__ = "email_delivery_logs"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    bulk_job_id: Mapped[int] = mapped_column(Integer, ForeignKey("bulk_email_jobs.id", ondelete="CASCADE"), index=True)
    attendee_id: Mapped[int] = mapped_column(Integer, ForeignKey("attendees.id", ondelete="CASCADE"), index=True)
    recipient_email: Mapped[str] = mapped_column(String(255))
    status: Mapped[str] = mapped_column(String(50), default="pending")  # pending, sent, bouonced, failed, opened
    reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    sent_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    opened_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    clicked_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    click_count: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    open_count: Mapped[int] = mapped_column(Integer, default=0, server_default="0")

    bulk_job: Mapped["BulkEmailJob"] = relationship()
    attendee: Mapped["Attendee"] = relationship()


class WebhookSubscription(Base):
    __tablename__ = "webhook_subscriptions"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    event_type: Mapped[str] = mapped_column(String(50), index=True)  # email.sent, email.failed, email.bouonced, email.opened
    url: Mapped[str] = mapped_column(Text)
    secret: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped["User"] = relationship()


class WebhookLog(Base):
    __tablename__ = "webhook_logs"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    webhook_id: Mapped[int] = mapped_column(Integer, ForeignKey("webhook_subscriptions.id", ondelete="CASCADE"), index=True)
    event_type: Mapped[str] = mapped_column(String(50))
    payload: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    http_status: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    sent_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)

    webhook: Mapped["WebhookSubscription"] = relationship()


class EventSession(Base):
    __tablename__ = "event_sessions"
    id:                      Mapped[int]            = mapped_column(Integer, primary_key=True, autoincrement=True)
    event_id:                Mapped[int]            = mapped_column(Integer, ForeignKey("events.id", ondelete="CASCADE"), index=True)
    name:                    Mapped[str]            = mapped_column(String(200))
    session_date:            Mapped[Optional[date_type]] = mapped_column(sa_Date, nullable=True)
    session_start:           Mapped[Optional[Any]]  = mapped_column(sa_Time, nullable=True)
    session_end:             Mapped[Optional[Any]]  = mapped_column(sa_Time, nullable=True)
    session_location:        Mapped[Optional[str]]  = mapped_column(String(300), nullable=True)
    # WP20 agenda fields: track groups sessions into parallel streams; speaker/description
    # populate the public agenda card. All nullable / backward compatible.
    track:                   Mapped[Optional[str]]  = mapped_column(String(120), nullable=True)
    speaker_name:            Mapped[Optional[str]]  = mapped_column(String(200), nullable=True)
    description:             Mapped[Optional[str]]  = mapped_column(Text, nullable=True)
    checkin_token:           Mapped[str]            = mapped_column(String(64), unique=True)
    is_active:               Mapped[bool]           = mapped_column(Boolean, default=False)
    enable_participation_test: Mapped[bool]         = mapped_column(Boolean, default=False)
    test_score_max:          Mapped[int]            = mapped_column(Integer, default=100)
    capacity:                Mapped[Optional[int]]  = mapped_column(Integer, nullable=True)
    capacity_alert_threshold: Mapped[int]            = mapped_column(Integer, default=90)
    created_at:              Mapped[datetime]       = mapped_column(DateTime(timezone=True), server_default=func.now())

    event: Mapped["Event"] = relationship(back_populates="sessions")
    attendaonce_records: Mapped[List["AttendaonceRecord"]] = relationship(back_populates="session", cascade="all, delete-orphan")


class Attendee(Base):
    __tablename__ = "attendees"
    id:                   Mapped[int]                   = mapped_column(Integer, primary_key=True, autoincrement=True)
    event_id:             Mapped[int]                   = mapped_column(Integer, ForeignKey("events.id", ondelete="CASCADE"), index=True)
    name:                 Mapped[str]                   = mapped_column(String(200))
    email:                Mapped[str]                   = mapped_column(String(320))
    source:               Mapped[str]                   = mapped_column(
        SAEnum("import", "self_register", name="attendee_source_enum", create_type=False),
        default="import",
    )
    registered_at:        Mapped[datetime]              = mapped_column(DateTime(timezone=True), server_default=func.now())
    email_verified:       Mapped[bool]                  = mapped_column(Boolean, default=False)
    email_verification_token: Mapped[Optional[str]]     = mapped_column(String(512), nullable=True)
    email_verified_at:    Mapped[Optional[datetime]]    = mapped_column(DateTime(timezone=True), nullable=True)
    survey_completed_at:  Mapped[Optional[datetime]]    = mapped_column(DateTime(timezone=True), nullable=True)
    survey_required:      Mapped[bool]                  = mapped_column(Boolean, default=False)
    can_download_cert:    Mapped[bool]                  = mapped_column(Boolean, default=True)
    public_member_id:     Mapped[Optional[int]]         = mapped_column(Integer, ForeignKey("public_members.id", ondelete="SET NULL"), index=True, nullable=True)
    registration_answers: Mapped[Optional[dict]]        = mapped_column(JSONB, nullable=True, default=dict)
    unsubscribed_at:      Mapped[Optional[datetime]]    = mapped_column(DateTime(timezone=True), nullable=True)
    # Manual approval / offline-payment gate (migration 105). "not_required" = auto-confirmed
    # (default, backward compatible). When the event requires approval, new registrations are
    # "pending" until an admin approves (e.g. after confirming an offline payment); "approved"
    # confirms the attendee, "rejected" declines them. Gates check-in and certificate.
    approval_status:      Mapped[str]                   = mapped_column(String(24), default="not_required", index=True)
    approved_by:          Mapped[Optional[int]]         = mapped_column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    approved_at:          Mapped[Optional[datetime]]    = mapped_column(DateTime(timezone=True), nullable=True)
    approval_note:        Mapped[Optional[str]]         = mapped_column(String(500), nullable=True)
    # KVKK data retention / anonymization (WP28, migration 111). anonymize_after is the
    # resolved disposal date (relative mode: registered_at + retention days; fixed mode:
    # the configured date); anonymized_at is set once the pii-marked fields have been
    # irreversibly disposed and acts as the idempotency guard. Both NULL = feature off /
    # not yet due / already handled.
    anonymize_after:      Mapped[Optional[datetime]]    = mapped_column(DateTime(timezone=True), nullable=True, index=True)
    anonymized_at:        Mapped[Optional[datetime]]    = mapped_column(DateTime(timezone=True), nullable=True)

    event: Mapped["Event"] = relationship(back_populates="attendees")
    public_member: Mapped[Optional["PublicMember"]] = relationship(back_populates="attendees")
    attendaonce_records: Mapped[List["AttendaonceRecord"]] = relationship(back_populates="attendee", cascade="all, delete-orphan")
    tickets: Mapped[List["EventTicket"]] = relationship(back_populates="attendee", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("event_id", "email", name="uq_attendee_event_email"),
    )


class AnonymizationLog(Base):
    """Immutable, PII-free audit trail for KVKK data anonymization (WP28).

    One row per attendee disposal. Deliberately decoupled from attendees/events
    (plain integer ids, no ForeignKey) so the record survives attendee/event
    deletion and can never be cascade-removed — it is the accountability proof that
    disposal happened. It records WHICH field ids were disposed and WHEN, and never
    stores the original values.
    """
    __tablename__ = "anonymization_log"

    id:              Mapped[int]                = mapped_column(Integer, primary_key=True, autoincrement=True)
    attendee_id:     Mapped[int]                = mapped_column(Integer, index=True)
    event_id:        Mapped[Optional[int]]      = mapped_column(Integer, index=True, nullable=True)
    organization_id: Mapped[Optional[int]]      = mapped_column(Integer, index=True, nullable=True)
    field_ids:       Mapped[Optional[list]]     = mapped_column(JSONB, nullable=True)
    method:          Mapped[str]                = mapped_column(String(32), default="key_removal")
    trigger:         Mapped[str]                = mapped_column(String(24), default="auto")
    created_at:      Mapped[datetime]           = mapped_column(DateTime(timezone=True), server_default=func.now())


class EventTicket(Base):
    __tablename__ = "event_tickets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    event_id: Mapped[int] = mapped_column(Integer, ForeignKey("events.id", ondelete="CASCADE"), index=True)
    attendee_id: Mapped[int] = mapped_column(Integer, ForeignKey("attendees.id", ondelete="CASCADE"), index=True)
    token: Mapped[str] = mapped_column(String(96), unique=True, index=True)
    qr_payload: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(24), default="issued", index=True)
    issued_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    checked_in_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    event: Mapped["Event"] = relationship(back_populates="tickets")
    attendee: Mapped["Attendee"] = relationship(back_populates="tickets")

    __table_args__ = (
        UniqueConstraint("event_id", "attendee_id", name="uq_event_ticket_event_attendee"),
        Index("ix_event_tickets_event_status", "event_id", "status"),
    )


class EventComment(Base):
    """Event-specific comments - SEPARATE from Social Community Feed system.
    
    This model is for comments on EVENT pages, NOT for community posts.
    
    Completely separate from:
    - CommunityPost: Global feed posts by members and organizations
    - CommunityPostComment: Comments on community feed posts
    
    Event comments are:
    - Specific to a single event page
    - Visible only on that event's detail page
    - Free for all authenticated public members (no subscription restriction)
    - NOT shared in global community feed
    
    Endpoints (Events system):
    - GET /api/public/events/{event_id}/comments - List event page comments
    - POST /api/public/events/{event_id}/comments - Add comment (free tier allowed)
    
    Endpoints (Social system for comparison):
    - GET/POST /api/public/feed - Global community feed
    - GET/POST /api/public/posts/{post_id}/comments - Comments on community posts
    """
    __tablename__ = "event_comments"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    event_id: Mapped[int] = mapped_column(Integer, ForeignKey("events.id", ondelete="CASCADE"), index=True)
    public_member_id: Mapped[int] = mapped_column(Integer, ForeignKey("public_members.id", ondelete="CASCADE"), index=True)
    body: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), default="visible", index=True)
    report_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    event: Mapped["Event"] = relationship(back_populates="comments")
    public_member: Mapped["PublicMember"] = relationship(back_populates="comments")


class AttendaonceRecord(Base):
    __tablename__ = "attendance_records"
    id:            Mapped[int]           = mapped_column(Integer, primary_key=True, autoincrement=True)
    attendee_id:   Mapped[int]           = mapped_column(Integer, ForeignKey("attendees.id", ondelete="CASCADE"), index=True)
    session_id:    Mapped[int]           = mapped_column(Integer, ForeignKey("event_sessions.id", ondelete="CASCADE"), index=True)
    checked_in_at: Mapped[datetime]      = mapped_column(DateTime(timezone=True), server_default=func.now())
    ip_address:    Mapped[Optional[str]] = mapped_column(String(45), nullable=True)

    attendee: Mapped["Attendee"] = relationship(back_populates="attendaonce_records")
    session:  Mapped["EventSession"] = relationship(back_populates="attendaonce_records")

    __table_args__ = (
        UniqueConstraint("attendee_id", "session_id", name="uq_attendance_attendee_session"),
    )


class CfpSubmission(Base):
    """WP21 Call-for-Papers abstract submission. Submitted by a PublicMember
    (reused portal identity). When accepted, materialized into an EventSession
    (session_id) so the talk appears on the WP20 agenda."""
    __tablename__ = "cfp_submissions"
    id:            Mapped[int]           = mapped_column(Integer, primary_key=True, autoincrement=True)
    event_id:      Mapped[int]           = mapped_column(Integer, ForeignKey("events.id", ondelete="CASCADE"), index=True)
    member_id:     Mapped[int]           = mapped_column(Integer, ForeignKey("public_members.id", ondelete="CASCADE"), index=True)
    title:         Mapped[str]           = mapped_column(String(300))
    abstract:      Mapped[str]           = mapped_column(Text)
    speaker_name:  Mapped[str]           = mapped_column(String(200))
    speaker_bio:   Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    track:         Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    # submitted -> under_review -> accepted | rejected ; withdrawn (by speaker)
    status:        Mapped[str]           = mapped_column(String(24), default="submitted", index=True)
    decision_note: Mapped[Optional[str]] = mapped_column(String(2000), nullable=True)
    decided_by:    Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    decided_at:    Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    session_id:    Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("event_sessions.id", ondelete="SET NULL"), nullable=True)
    created_at:    Mapped[datetime]      = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at:    Mapped[datetime]      = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    member:  Mapped["PublicMember"] = relationship()
    reviews: Mapped[List["CfpReview"]] = relationship(back_populates="submission", cascade="all, delete-orphan")


class CfpReview(Base):
    """One reviewer's rubric scoring of a CFP submission. A row is created on
    assignment (status="assigned") and filled when the reviewer submits. Per-criterion
    scores live in `scores` JSONB keyed by the rubric criterion id (rubric definition
    is stored on Event.config.cfp.criteria)."""
    __tablename__ = "cfp_reviews"
    id:               Mapped[int]           = mapped_column(Integer, primary_key=True, autoincrement=True)
    submission_id:    Mapped[int]           = mapped_column(Integer, ForeignKey("cfp_submissions.id", ondelete="CASCADE"), index=True)
    reviewer_user_id: Mapped[int]           = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    scores:           Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True, default=dict)
    overall_score:    Mapped[Optional[float]] = mapped_column(Numeric(6, 2), nullable=True)
    comment:          Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status:           Mapped[str]           = mapped_column(String(16), default="assigned")  # assigned | submitted
    created_at:       Mapped[datetime]      = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at:       Mapped[datetime]      = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    submission: Mapped["CfpSubmission"] = relationship(back_populates="reviews")
    reviewer:   Mapped["User"] = relationship()

    __table_args__ = (
        UniqueConstraint("submission_id", "reviewer_user_id", name="uq_cfp_review_submission_reviewer"),
    )


class MeetingRequest(Base):
    """WP22 1:1 networking meeting between two PublicMembers, scoped to an event.
    The requester proposes a time; the target accepts/declines. Blocked pairs can
    never create one (enforced via connections_api.members_blocked, ADR-0020)."""
    __tablename__ = "meeting_requests"
    id:            Mapped[int]           = mapped_column(Integer, primary_key=True, autoincrement=True)
    event_id:      Mapped[int]           = mapped_column(Integer, ForeignKey("events.id", ondelete="CASCADE"), index=True)
    requester_id:  Mapped[int]           = mapped_column(Integer, ForeignKey("public_members.id", ondelete="CASCADE"), index=True)
    target_id:     Mapped[int]           = mapped_column(Integer, ForeignKey("public_members.id", ondelete="CASCADE"), index=True)
    proposed_start: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    duration_minutes: Mapped[int]        = mapped_column(Integer, default=30)
    location:      Mapped[Optional[str]] = mapped_column(String(300), nullable=True)
    message:       Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)
    # pending -> accepted | declined ; cancelled (by requester)
    status:        Mapped[str]           = mapped_column(String(16), default="pending", index=True)
    response_note: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)
    created_at:    Mapped[datetime]      = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at:    Mapped[datetime]      = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    requester: Mapped["PublicMember"] = relationship(foreign_keys=[requester_id])
    target:    Mapped["PublicMember"] = relationship(foreign_keys=[target_id])


class LiveQuestion(Base):
    """WP23 live audience Q&A entry. Member-submitted, optionally session-scoped.
    Moderators mark answered / hide. Upvotes tracked in LiveQuestionVote."""
    __tablename__ = "live_questions"
    id:         Mapped[int]           = mapped_column(Integer, primary_key=True, autoincrement=True)
    event_id:   Mapped[int]           = mapped_column(Integer, ForeignKey("events.id", ondelete="CASCADE"), index=True)
    session_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("event_sessions.id", ondelete="SET NULL"), index=True, nullable=True)
    member_id:  Mapped[int]           = mapped_column(Integer, ForeignKey("public_members.id", ondelete="CASCADE"), index=True)
    text:       Mapped[str]           = mapped_column(String(1000))
    # visible (default) | answered | hidden
    status:     Mapped[str]           = mapped_column(String(16), default="visible", index=True)
    created_at: Mapped[datetime]      = mapped_column(DateTime(timezone=True), server_default=func.now())
    answered_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    member: Mapped["PublicMember"] = relationship()
    votes:  Mapped[List["LiveQuestionVote"]] = relationship(back_populates="question", cascade="all, delete-orphan")


class LiveQuestionVote(Base):
    __tablename__ = "live_question_votes"
    id:          Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    question_id: Mapped[int] = mapped_column(Integer, ForeignKey("live_questions.id", ondelete="CASCADE"), index=True)
    member_id:   Mapped[int] = mapped_column(Integer, ForeignKey("public_members.id", ondelete="CASCADE"), index=True)
    created_at:  Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    question: Mapped["LiveQuestion"] = relationship(back_populates="votes")

    __table_args__ = (
        UniqueConstraint("question_id", "member_id", name="uq_live_question_vote"),
    )


class LivePoll(Base):
    """WP23 live poll. options = JSONB list of {id, label}. Single-choice in Phase A."""
    __tablename__ = "live_polls"
    id:         Mapped[int]           = mapped_column(Integer, primary_key=True, autoincrement=True)
    event_id:   Mapped[int]           = mapped_column(Integer, ForeignKey("events.id", ondelete="CASCADE"), index=True)
    session_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("event_sessions.id", ondelete="SET NULL"), index=True, nullable=True)
    prompt:     Mapped[str]           = mapped_column(String(500))
    options:    Mapped[list]          = mapped_column(JSONB, default=list)
    # draft | open | closed
    status:     Mapped[str]           = mapped_column(String(16), default="open", index=True)
    created_at: Mapped[datetime]      = mapped_column(DateTime(timezone=True), server_default=func.now())

    votes: Mapped[List["LivePollVote"]] = relationship(back_populates="poll", cascade="all, delete-orphan")


class LivePollVote(Base):
    __tablename__ = "live_poll_votes"
    id:        Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    poll_id:   Mapped[int] = mapped_column(Integer, ForeignKey("live_polls.id", ondelete="CASCADE"), index=True)
    member_id: Mapped[int] = mapped_column(Integer, ForeignKey("public_members.id", ondelete="CASCADE"), index=True)
    option_id: Mapped[str] = mapped_column(String(40))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    poll: Mapped["LivePoll"] = relationship(back_populates="votes")

    __table_args__ = (
        UniqueConstraint("poll_id", "member_id", name="uq_live_poll_vote"),
    )


class CheckinActivityLog(Base):
    __tablename__ = "checkin_activity_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    event_id: Mapped[int] = mapped_column(Integer, ForeignKey("events.id", ondelete="CASCADE"), index=True)
    session_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("event_sessions.id", ondelete="SET NULL"), nullable=True, index=True)
    attendee_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("attendees.id", ondelete="SET NULL"), nullable=True, index=True)
    ticket_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("event_tickets.id", ondelete="SET NULL"), nullable=True, index=True)
    actor_user_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    method: Mapped[str] = mapped_column(String(32), default="manual", index=True)
    source: Mapped[str] = mapped_column(String(32), default="admin", index=True)
    entry_point: Mapped[str] = mapped_column(String(48), default="admin", index=True)
    success: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    duplicate: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    invalid_reason: Mapped[Optional[str]] = mapped_column(String(120), nullable=True, index=True)
    message: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    ip_address: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)

    __table_args__ = (
        Index("ix_checkin_activity_event_created", "event_id", "created_at"),
        Index("ix_checkin_activity_event_actor", "event_id", "actor_user_id"),
    )


class AgentActionLog(Base):
    __tablename__ = "agent_action_logs"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    api_key_prefix: Mapped[Optional[str]] = mapped_column(String(12), nullable=True)
    tool_name: Mapped[str] = mapped_column(String(100))
    event_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True, index=True)
    payload: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    result_summary: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    ip_address: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("ix_agent_action_logs_user_created", "user_id", "created_at"),
        Index("ix_agent_action_logs_tool", "tool_name"),
    )


class CheckinKioskSession(Base):
    __tablename__ = "checkin_kiosk_sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    event_id: Mapped[int] = mapped_column(Integer, ForeignKey("events.id", ondelete="CASCADE"), index=True)
    session_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("event_sessions.id", ondelete="SET NULL"), nullable=True, index=True)
    token_hash: Mapped[str] = mapped_column(String(128), unique=True, index=True)
    label: Mapped[str] = mapped_column(String(120), default="Kiosk")
    created_by: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    revoked_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True, index=True)
    last_seen_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class CheckinNonce(Base):
    __tablename__ = "checkin_nonces"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    event_id: Mapped[int] = mapped_column(Integer, ForeignKey("events.id", ondelete="CASCADE"), index=True)
    nonce: Mapped[str] = mapped_column(String(96), unique=True, index=True)
    actor_user_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    kiosk_session_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("checkin_kiosk_sessions.id", ondelete="SET NULL"), nullable=True, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    used_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class BadgeRule(Base):
    __tablename__ = "badge_rules"
    id:                Mapped[int]      = mapped_column(Integer, primary_key=True, autoincrement=True)
    event_id:          Mapped[int]      = mapped_column(Integer, ForeignKey("events.id", ondelete="CASCADE"), index=True, unique=True)
    badge_definitions: Mapped[dict]     = mapped_column(JSONB, default=dict)  # Array of badge type definitions
    enabled:           Mapped[bool]     = mapped_column(Boolean, default=True)
    created_by:        Mapped[int]      = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    updated_at:        Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    event: Mapped["Event"] = relationship()
    creator: Mapped["User"] = relationship(foreign_keys=[created_by])


class ParticipantBadge(Base):
    __tablename__ = "participant_badges"
    id:           Mapped[int]           = mapped_column(Integer, primary_key=True, autoincrement=True)
    event_id:     Mapped[int]           = mapped_column(Integer, ForeignKey("events.id", ondelete="CASCADE"), index=True)
    attendee_id:  Mapped[int]           = mapped_column(Integer, ForeignKey("attendees.id", ondelete="CASCADE"), index=True)
    badge_type:   Mapped[str]           = mapped_column(String(100))
    criteria_met: Mapped[Optional[dict]]= mapped_column(JSONB, nullable=True)
    awarded_by:   Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    awarded_at:   Mapped[datetime]      = mapped_column(DateTime(timezone=True), server_default=func.now())
    is_automatic: Mapped[bool]          = mapped_column(Boolean, default=True)
    badge_metadata: Mapped[Optional[dict]]= mapped_column("metadata", JSONB, nullable=True)

    event:     Mapped["Event"]   = relationship()
    attendee:  Mapped["Attendee"] = relationship()
    awardedby: Mapped[Optional["User"]] = relationship(foreign_keys=[awarded_by])

    __table_args__ = (
        UniqueConstraint("event_id", "attendee_id", "badge_type", name="uq_participant_badge"),
    )


class EventRaffle(Base):
    __tablename__ = "event_raffles"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    event_id: Mapped[int] = mapped_column(Integer, ForeignKey("events.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(200))
    prize_name: Mapped[str] = mapped_column(String(200))
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    min_sessions_required: Mapped[int] = mapped_column(Integer, default=1)
    winner_count: Mapped[int] = mapped_column(Integer, default=1)
    reserve_winner_count: Mapped[int] = mapped_column(Integer, default=1)
    status: Mapped[str] = mapped_column(String(32), default="draft")
    created_by: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    drawn_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    event: Mapped["Event"] = relationship(back_populates="raffles")
    creator: Mapped["User"] = relationship(foreign_keys=[created_by])
    winners: Mapped[List["EventRaffleWinner"]] = relationship(
        back_populates="raffle", cascade="all, delete-orphan", passive_deletes=True
    )


class EventRaffleWinner(Base):
    __tablename__ = "event_raffle_winners"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    raffle_id: Mapped[int] = mapped_column(Integer, ForeignKey("event_raffles.id", ondelete="CASCADE"), index=True)
    attendee_id: Mapped[int] = mapped_column(Integer, ForeignKey("attendees.id", ondelete="CASCADE"), index=True)
    drawn_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    raffle: Mapped["EventRaffle"] = relationship(back_populates="winners")
    attendee: Mapped["Attendee"] = relationship()

    __table_args__ = (
        UniqueConstraint("raffle_id", "attendee_id", name="uq_raffle_winner_attendee"),
    )


class CertificateTierRule(Base):
    __tablename__ = "certificate_tier_rules"
    id:               Mapped[int]      = mapped_column(Integer, primary_key=True, autoincrement=True)
    event_id:         Mapped[int]      = mapped_column(Integer, ForeignKey("events.id", ondelete="CASCADE"), index=True, unique=True)
    tier_definitions: Mapped[dict]     = mapped_column(JSONB, default=dict)  # Array of tier definitions
    created_by:       Mapped[int]      = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    updated_at:       Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    event: Mapped["Event"] = relationship()
    creator: Mapped["User"] = relationship(foreign_keys=[created_by])


class EventSurvey(Base):
    __tablename__ = "event_surveys"
    id:                     Mapped[int]           = mapped_column(Integer, primary_key=True, autoincrement=True)
    event_id:               Mapped[int]           = mapped_column(Integer, ForeignKey("events.id", ondelete="CASCADE"), index=True, unique=True)
    is_required:            Mapped[bool]          = mapped_column(Boolean, default=True)
    survey_type:            Mapped[str]           = mapped_column(String(50), default="builtin")  # "builtin", "external", "both"
    builtin_questions:      Mapped[Optional[dict]]= mapped_column(JSONB, nullable=True)  # Array of questions
    external_provider:      Mapped[Optional[str]] = mapped_column(String(50), nullable=True)  # typeform, qualtrics, etc
    external_url:           Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    external_webhook_key:   Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    created_at:             Mapped[datetime]      = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at:             Mapped[datetime]      = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    event: Mapped["Event"] = relationship()


class SurveyResponse(Base):
    __tablename__ = "survey_responses"
    id:                   Mapped[int]           = mapped_column(Integer, primary_key=True, autoincrement=True)
    event_id:             Mapped[int]           = mapped_column(Integer, ForeignKey("events.id", ondelete="CASCADE"), index=True)
    attendee_id:          Mapped[int]           = mapped_column(Integer, ForeignKey("attendees.id", ondelete="CASCADE"), index=True)
    survey_type:          Mapped[str]           = mapped_column(String(50))  # "builtin" or "external"
    answers:              Mapped[Optional[dict]]= mapped_column(JSONB, nullable=True)  # For built-in: {question_id: answer}
    external_response_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)  # For external
    completed_at:         Mapped[datetime]      = mapped_column(DateTime(timezone=True), server_default=func.now())
    completion_proof:     Mapped[Optional[dict]]= mapped_column(JSONB, nullable=True)  # Webhook data

    event:    Mapped["Event"]    = relationship()
    attendee: Mapped["Attendee"] = relationship()

    __table_args__ = (
        UniqueConstraint("event_id", "attendee_id", "survey_type", name="uq_survey_response"),
    )


class SponsorSlot(Base):
    __tablename__ = "sponsor_slots"
    id:                   Mapped[int]      = mapped_column(Integer, primary_key=True, autoincrement=True)
    event_id:             Mapped[int]      = mapped_column(Integer, ForeignKey("events.id", ondelete="CASCADE"), index=True)
    slot_position:        Mapped[str]      = mapped_column(String(100))  # email_header, email_footer, verification_page
    sponsor_name:         Mapped[str]      = mapped_column(String(200))
    sponsor_logo_url:     Mapped[str]      = mapped_column(Text)
    sponsor_website_url:  Mapped[str]      = mapped_column(Text)
    sponsor_color_hex:    Mapped[str]      = mapped_column(String(7), default="#000000")
    enabled:              Mapped[bool]     = mapped_column(Boolean, default=True)
    order_index:          Mapped[int]      = mapped_column(Integer, default=0)
    created_at:           Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    event: Mapped["Event"] = relationship()
