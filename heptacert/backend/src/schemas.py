"""Pydantic request/response semalari (main.py'dan ayiklandi).

main.py `from .schemas import *` ile bunlari tekrar export eder; mevcut
`from .main import <Schema>` kullanimlari (72 dosya) etkilenmez. Bagimliliklar
ayri modullerde: enums.py, event_team.py.
"""

from __future__ import annotations

import ipaddress
import re
from datetime import datetime, date, time, timezone, timedelta
from datetime import date as date_type
from decimal import Decimal
from typing import Any, Dict, List, Literal, Optional, Tuple, Union
from urllib.parse import urlparse

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator

from .enums import Role, CertStatus, TxType, OrderStatus, AttendeeSource
from .event_team import (
    EVENT_TEAM_ROLES,
    EVENT_TEAM_STATUSES,
    _normalize_event_team_permissions,
)

__all__ = [
    "TokenOut",
    "LoginIn",
    "RegisterIn",
    "PublicMemberRegisterIn",
    "PublicMemberLoginIn",
    "PublicMemberProfileUpdateIn",
    "PublicMemberEmailPrefereoncesIn",
    "PublicMemberEmailPrefereoncesOut",
    "PublicMemberChangePasswordIn",
    "DeleteAccountIn",
    "ForgotPasswordIn",
    "ResetPasswordIn",
    "ChangePasswordIn",
    "ChangeEmailIn",
    "CreateAdminIn",
    "EventRenameIn",
    "CreditCoinsIn",
    "EventCreateIn",
    "EventConfigIn",
    "AIAssistantMessage",
    "AIAssistantIn",
    "AIAssistantOut",
    "EventOut",
    "EventTeamMemberIn",
    "EventTeamMemberUpdateIn",
    "EventTeamInviteAcceptIn",
    "EventTeamInviteAcceptOut",
    "EventTeamMemberOut",
    "EventAccessOut",
    "EventTeamActivityOut",
    "PublicMemberMeOut",
    "PublicMemberBadgeOut",
    "PublicMemberProfileOut",
    "PublicMemberTokenOut",
    "PublicEventListItemOut",
    "PublicEventDetailOut",
    "EventTicketOut",
    "TicketCheckInIn",
    "TicketStatusUpdateIn",
    "PublicTicketOut",
    "PublicParticipantTicketOut",
    "PublicMemberEventOut",
    "PublicEventCommentOut",
    "PublicOrganizationListItemOut",
    "PublicOrganizationDetailOut",
    "CommunityPostCommentOut",
    "CommunityPostOut",
    "PublicEventCommentCreateIn",
    "AdminEventCommentUpdateIn",
    "BulkGenerateOut",
    "BulkCertificateJobOut",
    "CertificateOut",
    "CertificateListOut",
    "IssueCertificateIn",
    "UpdateCertificateStatusIn",
    "BulkActionIn",
    "MagicLinkIn",
    "TemplateSnapshotOut",
    "DashboardStatsOut",
    "VerifyOut",
    "ApiKeyCreateIn",
    "ApiKeyScopePatchIn",
    "ApiKeyOut",
    "ApiKeyCreateOut",
    "TotpSetupOut",
    "TotpConfirmIn",
    "BadgeDefinition",
    "BadgeRulesIn",
    "BadgeRulesOut",
    "ParticipantBadgeOut",
    "AwardBadgeIn",
    "CertificateTierDefinition",
    "CertificateTierRulesIn",
    "CertificateTierRulesOut",
    "SurveyQuestion",
    "EventSurveyIn",
    "EventSurveyOut",
    "SupportTicketMessageIn",
    "SupportTicketCreateIn",
    "SupportTicketUpdateIn",
    "SupportTicketOut",
    "SurveyResponseIn",
    "SurveyResponseOut",
    "SponsorSlotIn",
    "SponsorSlotOut",
    "TotpValidateIn",
    "LoginWith2FAOut",
    "WebhookEndpointIn",
    "WebhookEndpointOut",
    "WebhookDeliveryOut",
    "OrgIn",
    "OrgOut",
    "AuditLogOut",
    "PublicParticipantStatusOut",
    "PricingTier",
    "PricingConfigOut",
    "WaitlistIn",
    "WaitlistEntryOut",
    "EmailTemplateIn",
    "EmailTemplateOut",
    "CertificateTemplateOut",
    "BulkEmailJobIn",
    "BulkEmailJobOut",
    "UserEmailConfigOut",
    "EmailConfigUpdateIn",
    "EmailConfigTestRequest",
    "EmailConfigTestResponse",
    "SavedSMTPAccountOut",
    "GoogleSheetsStatusOut",
    "GoogleSheetsAuthStartOut",
    "EventSheetsStatusOut",
    "MicrosoftExcelStatusOut",
    "MicrosoftExcelAuthStartOut",
    "EventMicrosoftExcelStatusOut",
    "WebhookSubscriptionOut",
    "WebhookSubscriptionIn",
    "EmailDeliveryLogOut",
    "ScheduledEmailIn",
    "ScheduledEmailOut",
    "CurrentUser",
    "CurrentPublicMember",
    "AdminListItem",
    "TxListItem",
    "TxListOut",
    "AdminRowOut",
    "SuperadminAudieonceItemOut",
    "SuperadminAudieonceOut",
    "SuperadminBulkEmailIn",
    "SuperadminBulkEmailOut",
    "SuperadminBulkEmailJobIn",
    "SuperadminBulkEmailJobOut",
    "SuperadminAudienceItemOut",
    "SuperadminAudienceOut",
    "SystemEmailDigestConfigIn",
    "SystemEmailDigestConfigOut",
    "SuperadminEmailActivityItemOut",
    "SuperadminEmailActivityOut",
    "AdminRoleIn",
    "StatsOut",
    "StatsIn",
    "CreatePaymentIn",
    "OrderOut",
    "PaymentConfigOut",
    "MeOut",
    "AgentMeOut",
    "AgentLogIn",
    "AttendeeUpdateIn",
    "WatermarkVerifyOut",
    "GrantSubscriptionIn",
    "SessionCreateIn",
    "SessionOut",
    "AttendeeImportRow",
    "ManualAttendeeCreateIn",
    "AttendeeOut",
    "SelfRegisterIn",
    "LegalDocumentEventIn",
    "CheckinIn",
    "CheckinOut",
    "BulkCertifyOut",
    "EventRaffleCreateIn",
    "EventRaffleUpdateIn",
    "EventRaffleWinnerOut",
    "EventRaffleEligibleOut",
    "EventRaffleOut",
    "EventRaffleExportOut",
    "BulkCertifyIn",
]


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


class LoginIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    terms_accepted: bool = False


class PublicMemberRegisterIn(BaseModel):
    display_name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    terms_accepted: bool = False


class PublicMemberLoginIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class PublicMemberProfileUpdateIn(BaseModel):
    display_name: str = Field(min_length=2, max_length=120)
    bio: Optional[str] = Field(default=None, max_length=1000)
    headline: Optional[str] = Field(default=None, max_length=160)
    location: Optional[str] = Field(default=None, max_length=160)
    website_url: Optional[str] = Field(default=None, max_length=2000)
    contact_email: Optional[EmailStr] = None


class PublicMemberEmailPrefereoncesIn(BaseModel):
    digest_opt_in: bool = True


class PublicMemberEmailPrefereoncesOut(BaseModel):
    digest_opt_in: bool


class PublicMemberChangePasswordIn(BaseModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)


class DeleteAccountIn(BaseModel):
    current_password: str = Field(min_length=1, max_length=128)


class ForgotPasswordIn(BaseModel):
    email: EmailStr


class ResetPasswordIn(BaseModel):
    token: str
    new_password: str = Field(min_length=8, max_length=128)


class ChangePasswordIn(BaseModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)


class ChangeEmailIn(BaseModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_email: EmailStr


class CreateAdminIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=10, max_length=128)


class EventRenameIn(BaseModel):
    name: str = Field(min_length=2, max_length=200)
    event_date: Optional[str] = Field(default=None)  # ISO date string YYYY-MM-DD
    event_description: Optional[str] = Field(default=None, max_length=20000)
    event_location: Optional[str] = Field(default=None, max_length=300)
    min_sessions_required: Optional[int] = Field(default=None, ge=1, le=1000)
    event_banner_url: Optional[str] = Field(default=None, max_length=2000)
    auto_email_on_cert: Optional[bool] = Field(default=None)
    cert_email_template_id: Optional[int] = Field(default=None, ge=1)
    registration_fields: Optional[List[Dict[str, Any]]] = None
    visibility: Optional[str] = Field(default=None, max_length=32)
    require_email_verification: Optional[bool] = Field(default=None)
    registration_closed: Optional[bool] = Field(default=None)
    registration_quota: Optional[int] = Field(default=None, ge=1, le=1_000_000)
    registration_quota_enabled: Optional[bool] = Field(default=None)
    event_type: Optional[str] = Field(default=None, max_length=64)
    certificate_enabled: Optional[bool] = Field(default=None)
    checkin_enabled: Optional[bool] = Field(default=None)
    ticketing_enabled: Optional[bool] = Field(default=None)
    registration_enabled: Optional[bool] = Field(default=None)
    raffles_enabled: Optional[bool] = Field(default=None)
    gamification_enabled: Optional[bool] = Field(default=None)
    requires_approval: Optional[bool] = Field(default=None)
    quiz_enabled: Optional[bool] = Field(default=None)
    cpd_enabled: Optional[bool] = Field(default=None)
    organizer_privacy_notice_enabled: Optional[bool] = Field(default=None)
    organizer_privacy_notice_text: Optional[str] = Field(default=None, max_length=20000)
    show_cross_border_transfer_notice: Optional[bool] = Field(default=None)
    require_cross_border_transfer_consent: Optional[bool] = Field(default=None)
    data_controller_name: Optional[str] = Field(default=None, max_length=255)
    data_controller_contact_email: Optional[EmailStr] = Field(default=None)
    data_retention_note: Optional[str] = Field(default=None, max_length=4000)
    organization_venue_id: Optional[int] = Field(default=None, ge=1)
    auto_reserve_venue: Optional[bool] = Field(default=None)
    venue_reservation_start_at: Optional[datetime] = None
    venue_reservation_end_at: Optional[datetime] = None


class CreditCoinsIn(BaseModel):
    admin_user_id: int
    amount: int = Field(gt=0, le=1_000_000)


class EventCreateIn(BaseModel):
    name: str = Field(min_length=2, max_length=200)
    template_image_url: str = Field(min_length=1, max_length=2000)
    config: Dict[str, Any] = Field(default_factory=dict)
    event_type: Optional[str] = Field(default=None, max_length=64)
    certificate_enabled: Optional[bool] = Field(default=None)
    checkin_enabled: Optional[bool] = Field(default=None)
    ticketing_enabled: Optional[bool] = Field(default=None)
    registration_enabled: Optional[bool] = Field(default=None)
    raffles_enabled: Optional[bool] = Field(default=None)
    gamification_enabled: Optional[bool] = Field(default=None)
    requires_approval: Optional[bool] = Field(default=None)
    quiz_enabled: Optional[bool] = Field(default=None)
    cpd_enabled: Optional[bool] = Field(default=None)
    organization_venue_id: Optional[int] = Field(default=None, ge=1)
    auto_reserve_venue: Optional[bool] = Field(default=None)
    venue_reservation_start_at: Optional[datetime] = None
    venue_reservation_end_at: Optional[datetime] = None


class EventConfigIn(BaseModel):
    isim_x: int = Field(ge=0, le=20000)
    isim_y: int = Field(ge=0, le=20000)
    qr_x: int = Field(ge=0, le=20000)
    qr_y: int = Field(ge=0, le=20000)
    font_size: int = Field(ge=8, le=200)
    font_color: str = Field(default="#FFFFFF", min_length=4, max_length=16)

    @field_validator("font_color")
    @classmethod
    def validate_color(cls, v: str) -> str:
        v = v.strip()
        if not v.startswith("#"):
            raise ValueError("font_color must be hex like #FFFFFF")
        return v
    
    cert_id_x: int = Field(ge=0, le=20000, default=60)
    cert_id_y: int = Field(ge=0, le=20000, default=60)
    cert_id_font_size: int = Field(ge=8, le=200, default=18)
    cert_id_color: str = Field(default="#94A3B8", min_length=4, max_length=16)
    show_hologram: bool = Field(default=True)

    @field_validator("cert_id_color")
    @classmethod
    def validate_cert_color(cls, v: str) -> str:
        v = v.strip()
        if not v.startswith("#"):
            raise ValueError("cert_id_color must be hex like #94A3B8")
        return v


class AIAssistantMessage(BaseModel):
    role: str = Field(max_length=20)
    message: str = Field(max_length=4000)


class AIAssistantIn(BaseModel):
    message: str = Field(min_length=2, max_length=4000)
    language: str = Field(default="tr", max_length=8)
    event_id: Optional[int] = Field(default=None, ge=1)
    history: List[AIAssistantMessage] = Field(default_factory=list, max_length=8)


class AIAssistantOut(BaseModel):
    answer: str
    mode: str = "suggestion"
    provider: str = "local"
    suggestions: Dict[str, Any] = Field(default_factory=dict)


class EventOut(BaseModel):
    id: int
    public_id: Optional[str] = None
    name: str
    template_image_url: str
    config: Dict[str, Any]
    event_date: Optional[str] = None
    event_description: Optional[str] = None
    event_location: Optional[str] = None
    min_sessions_required: int = 1
    event_banner_url: Optional[str] = None
    auto_email_on_cert: bool = False
    cert_email_template_id: Optional[int] = None
    registration_closed: bool = False
    visibility: str = "private"
    require_email_verification: bool = True
    registration_quota: Optional[int] = None
    registration_quota_enabled: bool = False
    event_type: str = "certificate_event"
    certificate_enabled: bool = True
    checkin_enabled: bool = True
    ticketing_enabled: bool = False
    registration_enabled: bool = True
    raffles_enabled: bool = False
    gamification_enabled: bool = False
    requires_approval: bool = False
    quiz_enabled: bool = False
    cpd_enabled: bool = False
    organization_venue_id: Optional[int] = None
    venue_reservation_id: Optional[int] = None
    venue_reservation_start_at: Optional[str] = None
    venue_reservation_end_at: Optional[str] = None


class EventTeamMemberIn(BaseModel):
    email: EmailStr
    role: str = Field(default="checkin", max_length=32)
    permissions: Optional[List[str]] = None

    @field_validator("role")
    @classmethod
    def validate_role(cls, value: str) -> str:
        role = (value or "").strip().lower()
        if role not in EVENT_TEAM_ROLES:
            raise ValueError(f"role must be one of: {', '.join(sorted(EVENT_TEAM_ROLES))}")
        return role

    @field_validator("permissions")
    @classmethod
    def validate_permissions(cls, value: Optional[List[str]]) -> Optional[List[str]]:
        return _normalize_event_team_permissions(value)


class EventTeamMemberUpdateIn(BaseModel):
    role: Optional[str] = Field(default=None, max_length=32)
    permissions: Optional[List[str]] = None
    status: Optional[str] = Field(default=None, max_length=24)

    @field_validator("role")
    @classmethod
    def validate_role(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        role = value.strip().lower()
        if role not in EVENT_TEAM_ROLES:
            raise ValueError(f"role must be one of: {', '.join(sorted(EVENT_TEAM_ROLES))}")
        return role

    @field_validator("permissions")
    @classmethod
    def validate_permissions(cls, value: Optional[List[str]]) -> Optional[List[str]]:
        return _normalize_event_team_permissions(value)

    @field_validator("status")
    @classmethod
    def validate_status(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        status = value.strip().lower()
        if status not in EVENT_TEAM_STATUSES:
            raise ValueError(f"status must be one of: {', '.join(sorted(EVENT_TEAM_STATUSES))}")
        return status


class EventTeamInviteAcceptIn(BaseModel):
    token: str


class EventTeamInviteAcceptOut(BaseModel):
    ok: bool
    event_id: int
    event_name: str
    email: EmailStr
    status: str
    message: str


class EventTeamMemberOut(BaseModel):
    id: int
    event_id: int
    user_id: Optional[int] = None
    email: EmailStr
    role: str
    permissions: Optional[List[str]] = None
    effective_permissions: List[str] = Field(default_factory=list)
    status: str
    invited_by: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


class EventAccessOut(BaseModel):
    event_id: int
    is_owner: bool = False
    role: str
    permissions: List[str]
    permission_labels: Dict[str, str]


class EventTeamActivityOut(BaseModel):
    id: int
    actor_email: Optional[str] = None
    actor_label: str
    action: str
    action_label: str
    detail: str
    created_at: datetime


class PublicMemberMeOut(BaseModel):
    id: int
    public_id: str
    email: EmailStr
    display_name: str
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    headline: Optional[str] = None
    location: Optional[str] = None
    website_url: Optional[str] = None
    contact_email: Optional[EmailStr] = None
    created_at: datetime


class PublicMemberBadgeOut(BaseModel):
    badge_id: str
    name: str
    icon: Optional[str] = None
    color: Optional[str] = None
    event_id: int
    event_name: Optional[str] = None
    awarded_at: Optional[datetime] = None


class PublicMemberProfileOut(BaseModel):
    public_id: str
    display_name: str
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    headline: Optional[str] = None
    location: Optional[str] = None
    website_url: Optional[str] = None
    contact_email: Optional[EmailStr] = None
    created_at: datetime
    event_count: int = 0
    comment_count: int = 0
    certificates: List[Dict[str, Any]] = Field(default_factory=list)
    certificates_hidden: bool = False
    badges: List[PublicMemberBadgeOut] = Field(default_factory=list)


class PublicMemberTokenOut(TokenOut):
    member: PublicMemberMeOut


class PublicEventListItemOut(BaseModel):
    id: int
    public_id: str
    name: str
    organization_public_id: Optional[str] = None
    organization_name: Optional[str] = None
    organization_logo: Optional[str] = None
    event_date: Optional[str] = None
    event_description: Optional[str] = None
    event_location: Optional[str] = None
    event_banner_url: Optional[str] = None
    min_sessions_required: int = 1
    registration_closed: bool = False
    visibility: str = "public"
    session_count: int = 0
    event_type: str = "certificate_event"
    certificate_enabled: bool = True
    checkin_enabled: bool = True
    ticketing_enabled: bool = False
    registration_enabled: bool = True
    raffles_enabled: bool = False
    gamification_enabled: bool = False
    quiz_enabled: bool = False
    cpd_enabled: bool = False


class PublicEventDetailOut(BaseModel):
    id: int
    public_id: str
    name: str
    organization_public_id: Optional[str] = None
    organization_name: Optional[str] = None
    organization_logo: Optional[str] = None
    event_date: Optional[str] = None
    event_description: Optional[str] = None
    event_location: Optional[str] = None
    min_sessions_required: int = 1
    registration_closed: bool = False
    event_banner_url: Optional[str] = None
    registration_fields: List[Dict[str, Any]] = Field(default_factory=list)
    survey: Optional[Dict[str, Any]] = None
    sessions: List[Dict[str, Any]] = Field(default_factory=list)
    visibility: str = "private"
    require_email_verification: bool = True
    registration_quota: Optional[int] = None
    registration_quota_enabled: bool = False
    event_type: str = "certificate_event"
    certificate_enabled: bool = True
    checkin_enabled: bool = True
    ticketing_enabled: bool = False
    registration_enabled: bool = True
    raffles_enabled: bool = False
    gamification_enabled: bool = False
    requires_approval: bool = False
    kvkk_consent_required: bool = True
    kvkk_consent_text: Optional[str] = None
    organizer_privacy_notice_enabled: bool = False
    organizer_privacy_notice_text: Optional[str] = None
    show_cross_border_transfer_notice: bool = False
    require_cross_border_transfer_consent: bool = False
    data_controller_name: Optional[str] = None
    data_controller_contact_email: Optional[str] = None
    data_retention_note: Optional[str] = None
    has_active_quiz: bool = False


class EventTicketOut(BaseModel):
    id: int
    event_id: int
    attendee_id: int
    attendee_name: str
    attendee_email: str
    token: str
    qr_payload: str
    status: str
    issued_at: datetime
    checked_in_at: Optional[datetime] = None


class TicketCheckInIn(BaseModel):
    token: str = Field(min_length=12, max_length=512)


class TicketStatusUpdateIn(BaseModel):
    status: str = Field(pattern="^(issued|cancelled|revoked)$")


class PublicTicketOut(BaseModel):
    event_id: int
    event_public_id: str
    event_name: str
    attendee_name: str
    attendee_email: str
    status: str
    issued_at: datetime
    checked_in_at: Optional[datetime] = None


class PublicParticipantTicketOut(BaseModel):
    id: int
    token: str
    qr_payload: str
    status: str
    ticket_url: str
    issued_at: Optional[datetime] = None
    checked_in_at: Optional[datetime] = None


class PublicMemberEventOut(BaseModel):
    attendee_id: int
    event_id: int
    event_name: str
    event_date: Optional[str] = None
    event_location: Optional[str] = None
    event_banner_url: Optional[str] = None
    registered_at: datetime
    email_verified: bool = False
    sessions_attended: int = 0
    min_sessions_required: int = 1
    status_url: Optional[str] = None


class PublicEventCommentOut(BaseModel):
    id: int
    event_id: int
    member_public_id: str
    member_name: str
    member_email: Optional[str] = None
    member_avatar_url: Optional[str] = None
    body: str
    status: str
    report_count: int = 0
    created_at: datetime
    updated_at: datetime


class PublicOrganizationListItemOut(BaseModel):
    public_id: str
    org_name: str
    brand_logo: Optional[str] = None
    brand_color: str
    bio: Optional[str] = None
    website_url: Optional[str] = None
    event_count: int = 0
    follower_count: int = 0


class PublicOrganizationDetailOut(BaseModel):
    public_id: str
    org_name: str
    brand_logo: Optional[str] = None
    brand_color: str
    bio: Optional[str] = None
    website_url: Optional[str] = None
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    x_url: Optional[str] = None
    instagram_url: Optional[str] = None
    follower_count: int = 0
    event_count: int = 0
    is_following: bool = False
    events: List[PublicEventListItemOut] = Field(default_factory=list)


class CommunityPostCommentOut(BaseModel):
    id: int
    post_public_id: str
    member_public_id: str
    member_name: str
    member_avatar_url: Optional[str] = None
    body: str
    created_at: datetime
    updated_at: datetime


class CommunityPostOut(BaseModel):
    public_id: str
    organization_public_id: Optional[str] = None
    organization_name: Optional[str] = None
    author_type: str
    author_public_id: Optional[str] = None
    author_name: str
    author_avatar_url: Optional[str] = None
    body: str
    like_count: int = 0
    comment_count: int = 0
    liked_by_me: bool = False
    created_at: datetime
    updated_at: datetime


class PublicEventCommentCreateIn(BaseModel):
    body: str = Field(min_length=2, max_length=1500)

    @field_validator("body")
    @classmethod
    def validate_body(cls, value: str) -> str:
        cleaned = " ".join(value.split())
        if len(cleaned) < 2:
            raise ValueError("Comment is too short.")
        return cleaned


class AdminEventCommentUpdateIn(BaseModel):
    status: str = Field(pattern="^(visible|hidden|reported)$")


class BulkGenerateOut(BaseModel):
    event_id: int
    created: int
    spent_heptacoin: int
    certificates: List[Dict[str, Any]]


class BulkCertificateJobOut(BaseModel):
    id: int
    event_id: int
    created_by: int
    chunk_size: int
    total_count: int
    current_index: int
    created_count: int
    failed_count: int
    already_exists_count: int
    spent_heptacoin: int
    status: str
    error_message: Optional[str]
    zip_file_path: Optional[str]
    created_at: datetime
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    model_config = ConfigDict(from_attributes=True)


class CertificateOut(BaseModel):
    id: int
    uuid: str
    public_id: Optional[str] = None
    student_name: str
    event_id: int
    status: CertStatus
    issued_at: Optional[datetime] = None
    hosting_term: Optional[str] = None
    hosting_ends_at: Optional[datetime] = None
    days_remaining: Optional[int] = None
    asset_size_bytes: int = 0
    issue_cost_units: int = 10
    hosting_cost_units: int = 0
    total_cost_units: int = 10
    monthly_cost_units: int = 0
    yearly_cost_units: int = 0
    auto_renew_enabled: bool = False
    pdf_url: Optional[str] = None
    png_url: Optional[str] = None


class CertificateListOut(BaseModel):
    items: List[CertificateOut]
    total: int
    page: int
    limit: int


class IssueCertificateIn(BaseModel):
    student_name: str = Field(min_length=2, max_length=200)
    hosting_term: str = Field(default="yearly", pattern="^(monthly|yearly)$")


class UpdateCertificateStatusIn(BaseModel):
    status: Optional[CertStatus] = None
    auto_renew_enabled: Optional[bool] = None


class BulkActionIn(BaseModel):
    cert_ids: List[int] = Field(min_length=1, max_length=500)
    action: str = Field(pattern="^(revoke|expire|delete|enable_auto_renew|disable_auto_renew)$")


class MagicLinkIn(BaseModel):
    email: EmailStr


class TemplateSnapshotOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    event_id: int
    template_image_url: Optional[str] = None
    config: Optional[Dict[str, Any]] = None
    created_by: Optional[int] = None
    created_at: datetime


class DashboardStatsOut(BaseModel):
    total_events: int
    total_certs: int
    active_certs: int
    revoked_certs: int
    expired_certs: int
    total_spent_hc: int
    events_with_stats: List[Dict[str, Any]]


class VerifyOut(BaseModel):
    uuid: str
    public_id: Optional[str] = None
    student_name: str
    event_name: str
    event_date: Optional[str] = None
    organizer_name: Optional[str] = None
    organizer_logo: Optional[str] = None
    organizer_public_id: Optional[str] = None
    status: CertStatus
    pdf_url: Optional[str] = None
    png_url: Optional[str] = None
    issued_at: Optional[datetime] = None
    hosting_ends_at: Optional[datetime] = None
    view_count: int = 0
    linkedin_url: Optional[str] = None
    linkedin_share_url: Optional[str] = None
    linkedin_add_url: Optional[str] = None
    branding: Optional[Dict[str, Any]] = None


class ApiKeyCreateIn(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    scopes: List[str] = Field(default=[])
    expires_days: Optional[int] = Field(default=None, ge=1, le=3650)
    rate_limit_per_min: Optional[int] = Field(default=None, ge=10, le=10000)


class ApiKeyScopePatchIn(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=200)
    scopes: Optional[List[str]] = None
    is_active: Optional[bool] = None


class ApiKeyOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    key_prefix: str
    rate_limit_per_min: Optional[int] = None
    is_active: bool
    scopes: List[str]
    last_used_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    created_at: datetime


class ApiKeyCreateOut(ApiKeyOut):
    full_key: str  # only returned oonce at creation


class TotpSetupOut(BaseModel):
    otpauth_url: str
    secret: str  # for manual entry; show oonce


class TotpConfirmIn(BaseModel):
    code: str = Field(min_length=6, max_length=6)


class BadgeDefinition(BaseModel):
    """Definition of a badge type"""
    type: str = Field(min_length=1, max_length=50)
    name: str = Field(min_length=1, max_length=200)
    description: Optional[str] = Field(default=None, max_length=1000)
    criteria: Dict[str, Any] = Field(default_factory=dict)
    icon_url: Optional[str] = Field(default=None, max_length=2000)
    color_hex: Optional[str] = Field(default="#4CAF50", max_length=7)


class BadgeRulesIn(BaseModel):
    """Request to create/update badge rules for an event"""
    badge_definitions: List[BadgeDefinition] = Field(default_factory=list)
    enabled: bool = Field(default=True)


class BadgeRulesOut(BaseModel):
    """Response with badge rules"""
    model_config = ConfigDict(from_attributes=True)
    id: int
    event_id: int
    badge_definitions: List[Dict[str, Any]]
    enabled: bool
    created_at: Optional[datetime] = None
    updated_at: datetime


class ParticipantBadgeOut(BaseModel):
    """Response with awarded badge details"""
    model_config = ConfigDict(from_attributes=True)
    id: int
    event_id: int
    attendee_id: int
    badge_type: str
    badge_name: Optional[str] = None
    badge_description: Optional[str] = None
    badge_icon_url: Optional[str] = None
    badge_color_hex: Optional[str] = None
    attendee_name: Optional[str] = None
    attendee_email: Optional[str] = None
    criteria_met: Dict[str, Any]
    awarded_by: Optional[int] = None
    awarded_at: datetime
    is_automatic: bool
    badge_metadata: Optional[Dict[str, Any]] = None


class AwardBadgeIn(BaseModel):
    """Request to manually award a badge"""
    attendee_id: int = Field(gt=0)
    badge_type: str = Field(min_length=1, max_length=50)
    criteria_met: Dict[str, Any] = Field(default_factory=dict)
    badge_metadata: Optional[Dict[str, Any]] = Field(default=None)


class CertificateTierDefinition(BaseModel):
    """Definition of a certificate tier"""
    tier_name: str = Field(min_length=1, max_length=100)
    template_id: Optional[int] = Field(default=None, gt=0)
    conditions: List[Dict[str, Any]] = Field(default_factory=list)
    condition_logic: str = Field(default="AND")  # AND or OR


class CertificateTierRulesIn(BaseModel):
    """Request to define certificate tier rules for an event"""
    tier_definitions: List[CertificateTierDefinition] = Field(default_factory=list)


class CertificateTierRulesOut(BaseModel):
    """Response with certificate tier rules"""
    model_config = ConfigDict(from_attributes=True)
    id: int
    event_id: int
    tier_definitions: List[Dict[str, Any]]
    created_at: datetime
    updated_at: datetime


class SurveyQuestion(BaseModel):
    """A survey question"""
    id: str = Field(min_length=1, max_length=100)
    type: str = Field(min_length=1, max_length=50)  # text, multiple_choice, rating, etc.
    question: str = Field(min_length=1, max_length=1000)
    required: bool = Field(default=True)
    options: Optional[List[str]] = Field(default=None)


class EventSurveyIn(BaseModel):
    """Request to configure survey for an event"""
    is_required: bool = Field(default=True)
    survey_type: str = Field(default="builtin")  # disabled, builtin, external, both
    builtin_questions: List[SurveyQuestion] = Field(default_factory=list)
    external_provider: Optional[str] = Field(default=None, max_length=100)  # typeform, qualtrics, etc.
    external_url: Optional[str] = Field(default=None, max_length=2000)
    external_webhook_key: Optional[str] = Field(default=None, max_length=256)


class EventSurveyOut(BaseModel):
    """Response with survey configuration"""
    model_config = ConfigDict(from_attributes=True)
    id: int
    event_id: int
    is_required: bool
    survey_type: str
    builtin_questions: List[Dict[str, Any]]
    external_provider: Optional[str] = None
    external_url: Optional[str] = None
    external_webhook_key: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class SupportTicketMessageIn(BaseModel):
    """A single message in support ticket"""
    role: str  # 'user' or 'admin'
    message: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class SupportTicketCreateIn(BaseModel):
    """Request to create a support ticket"""
    subject: str = Field(min_length=5, max_length=255)
    message: str = Field(min_length=10, max_length=5000)


class SupportTicketUpdateIn(BaseModel):
    """Request to update a support ticket (admin reply or status change)"""
    status: Optional[str] = None  # open, in_progress, resolved, closed
    admin_reply: Optional[str] = None  # Admin's response message


class SupportTicketOut(BaseModel):
    """Response with support ticket details"""
    model_config = ConfigDict(from_attributes=True)
    id: int
    organization_id: int
    user_id: int
    subject: str
    messages: List[Dict[str, Any]]
    status: str
    created_at: datetime
    updated_at: datetime


class SurveyResponseIn(BaseModel):
    """Request to submit survey response"""
    attendee_id: Optional[int] = Field(default=None, ge=1)
    survey_token: Optional[str] = Field(default=None, min_length=8, max_length=1000)
    survey_type: str = Field(min_length=1, max_length=50)
    answers: Optional[Dict[str, Any]] = Field(default=None)  # For builtin surveys
    external_response_id: Optional[str] = Field(default=None, max_length=500)  # For external surveys


class SurveyResponseOut(BaseModel):
    """Response with survey submission confirmation"""
    model_config = ConfigDict(from_attributes=True)
    id: int
    event_id: int
    attendee_id: int
    attendee_name: Optional[str] = None
    attendee_email: Optional[str] = None
    survey_type: str
    answers: Optional[Dict[str, Any]] = None
    external_response_id: Optional[str] = None
    completed_at: datetime
    completion_proof: Optional[Dict[str, Any]] = None


class SponsorSlotIn(BaseModel):
    """Request to create sponsor slot"""
    slot_position: str = Field(min_length=1, max_length=100)  # email_header, email_footer, verification_page
    sponsor_name: str = Field(min_length=1, max_length=200)
    sponsor_logo_url: str = Field(max_length=2000)
    sponsor_website_url: str = Field(max_length=2000)
    sponsor_color_hex: Optional[str] = Field(default="#000000", max_length=7)
    enabled: bool = Field(default=True)
    order_index: int = Field(default=0, ge=0)


class SponsorSlotOut(BaseModel):
    """Response with sponsor slot details"""
    model_config = ConfigDict(from_attributes=True)
    id: int
    event_id: int
    slot_position: str
    sponsor_name: str
    sponsor_logo_url: str
    sponsor_website_url: str
    sponsor_color_hex: str
    enabled: bool
    order_index: int
    created_at: datetime


class TotpValidateIn(BaseModel):
    partial_token: str
    code: str = Field(min_length=6, max_length=6)


class LoginWith2FAOut(BaseModel):
    requires_2fa: bool
    partial_token: Optional[str] = None
    access_token: Optional[str] = None
    token_type: str = "bearer"


class WebhookEndpointIn(BaseModel):
    url: str = Field(min_length=10, max_length=2000)
    events: List[str] = Field(default=["cert.issued"])

    @field_validator("url")
    @classmethod
    def validate_webhook_url(cls, v: str) -> str:
        """Prevent SSRF and plaintext delivery for outbound webhook targets."""
        import ipaddress
        from urllib.parse import urlparse
        parsed = urlparse(v)
        if parsed.scheme != "https":
            raise ValueError("Webhook URL must use HTTPS")
        hostname = parsed.hostname or ""
        # Block private/reserved IP ranges
        try:
            ip = ipaddress.ip_address(hostname)
            if ip.is_private or ip.is_loopback or ip.is_reserved or ip.is_link_local:
                raise ValueError("Webhook URL must not point to private/internal addresses")
        except ValueError as exc:
            if "private" in str(exc) or "internal" in str(exc):
                raise
            # hostname is a domain name Ã¢â‚¬â€ block known internal hostnames
            blocked = ("localhost", "127.0.0.1", "0.0.0.0", "[::1]", "metadata.google", "169.254.169.254")
            if any(hostname.lower().startswith(b) for b in blocked):
                raise ValueError("Webhook URL must not point to localhost or metadata services")
        return v


class WebhookEndpointOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    url: str
    events: List[str]
    secret: Optional[str] = None
    is_active: bool
    created_at: datetime
    last_fired_at: Optional[datetime] = None


class WebhookDeliveryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    event_type: str
    status: str
    http_status: Optional[int] = None
    attempt: int
    delivered_at: datetime


class OrgIn(BaseModel):
    user_id: Optional[int] = None
    org_name: str = Field(min_length=2, max_length=200)
    custom_domain: Optional[str] = Field(default=None, max_length=253)
    brand_logo: Optional[str] = None
    brand_color: str = Field(default="#6366f1", pattern=r"^#[0-9a-fA-F]{6}$")

    @field_validator("custom_domain")
    @classmethod
    def validate_custom_domain(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        domain = value.strip().lower().rstrip(".")
        if not re.fullmatch(r"(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?", domain):
            raise ValueError("Custom domain must be a valid hostname")
        return domain


class OrgOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: int
    public_id: str
    org_name: str
    custom_domain: Optional[str] = None
    brand_logo: Optional[str] = None
    brand_color: str
    created_at: datetime
    domain_status: Optional[str] = None
    domain_token: Optional[str] = None
    verification_host: Optional[str] = None
    dns_target: Optional[str] = None
    caddy_authorized: bool = False


class AuditLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: Optional[int] = None
    action: str
    resource_type: Optional[str] = None
    resource_id: Optional[str] = None
    ip_address: Optional[str] = None
    extra: Optional[Dict[str, Any]] = None
    created_at: datetime


class PublicParticipantStatusOut(BaseModel):
    attendee_id: int
    attendee_name: str
    attendee_email: str
    email_verified: bool = False
    event_id: int
    event_name: str
    event_type: str = "certificate_event"
    certificate_enabled: bool = True
    checkin_enabled: bool = True
    ticketing_enabled: bool = False
    raffles_enabled: bool = False
    gamification_enabled: bool = False
    sessions_attended: int
    total_sessions: int
    sessions_required: int
    survey_enabled: bool = False
    survey_required: bool
    survey_completed: bool
    can_download_cert: bool
    certificate_ready: bool
    certificate_count: int
    latest_certificate_uuid: Optional[str] = None
    latest_certificate_verify_url: Optional[str] = None
    ticket: Optional[PublicParticipantTicketOut] = None
    badge_count: int
    badges: List[ParticipantBadgeOut] = []
    eligible_raffles: List[Dict[str, Any]] = []


class PricingTier(BaseModel):
    id: str
    name_tr: str
    name_en: str
    price_monthly: Optional[int] = None  # None = custom/contact
    price_annual: Optional[int] = None
    hc_quota: Optional[int] = None
    features_tr: List[str] = []
    features_en: List[str] = []
    is_free: bool = False
    is_enterprise: bool = False


class PricingConfigOut(BaseModel):
    tiers: List[PricingTier]


class WaitlistIn(BaseModel):
    name: str = Field(min_length=2, max_length=200)
    email: EmailStr
    phone: Optional[str] = Field(default=None, max_length=30)
    plan_interest: Optional[str] = Field(default=None, max_length=50)
    note: Optional[str] = Field(default=None, max_length=500)


class WaitlistEntryOut(BaseModel):
    id: int
    name: str
    email: str
    phone: Optional[str]
    plan_interest: Optional[str]
    note: Optional[str]
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class EmailTemplateIn(BaseModel):
    name: str = Field(min_length=2, max_length=200)
    subject_tr: str = Field(min_length=2, max_length=255)
    subject_en: str = Field(min_length=2, max_length=255)
    body_html: str = Field(min_length=5)


class EmailTemplateOut(BaseModel):
    id: int
    event_id: Optional[int]
    created_by: int
    name: str
    subject_tr: str
    subject_en: str
    body_html: str
    template_type: str
    is_default: bool
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


class CertificateTemplateOut(BaseModel):
    id: int
    name: str
    template_image_url: str
    config: Dict[str, Any]
    is_default: bool
    order_index: int
    model_config = ConfigDict(from_attributes=True)


class BulkEmailJobIn(BaseModel):
    email_template_id: int
    recipient_type: str = "attendees"  # attendees | certified
    scheduled_at: Optional[datetime] = None  # If set, job is queued as "scheduled" until this time
    cron_expression: Optional[str] = Field(default=None, max_length=120)  # e.g. "0 9 * * 1" for every Monday 9am


class BulkEmailJobOut(BaseModel):
    id: int
    event_id: int
    created_by: int
    email_template_id: Optional[int]
    recipient_type: str
    recipients_count: int
    sent_count: int
    failed_count: int
    status: str
    error_message: Optional[str]
    created_at: datetime
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    scheduled_at: Optional[datetime] = None
    cron_expression: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)


class UserEmailConfigOut(BaseModel):
    id: int
    user_id: int
    smtp_enabled: bool
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = None
    smtp_use_tls: bool = True
    smtp_user: Optional[str] = None
    from_email: Optional[str] = None
    from_name: Optional[str]
    reply_to: Optional[str]
    auto_cc: Optional[str]
    enable_tracking_pixel: bool
    model_config = ConfigDict(from_attributes=True)


class EmailConfigUpdateIn(BaseModel):
    smtp_enabled: bool
    smtp_use_tls: bool = True
    from_email: Optional[EmailStr] = None
    from_name: Optional[str] = None
    reply_to: Optional[str] = None
    auto_cc: Optional[str] = None
    enable_tracking_pixel: bool = False
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = None
    smtp_user: Optional[str] = None
    smtp_password: Optional[str] = None


class EmailConfigTestRequest(BaseModel):
    smtp_host: str
    smtp_port: int
    smtp_use_tls: bool = True
    smtp_user: str
    smtp_password: str
    from_email: EmailStr
    test_email: EmailStr


class EmailConfigTestResponse(BaseModel):
    status: str  # "success" or "error"
    message: str
    verified_at: Optional[datetime] = None


class SavedSMTPAccountOut(BaseModel):
    id: int
    smtp_enabled: bool
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = None
    smtp_use_tls: bool = True
    smtp_user: Optional[str] = None
    from_email: Optional[str] = None
    from_name: Optional[str] = None
    updated_at: datetime
    has_password: bool = False


class GoogleSheetsStatusOut(BaseModel):
    configured: bool
    connected: bool
    google_email: Optional[str] = None
    scopes: List[str] = Field(default_factory=list)
    missing_scopes: List[str] = Field(default_factory=list)


class GoogleSheetsAuthStartOut(BaseModel):
    authorization_url: str


class EventSheetsStatusOut(BaseModel):
    google_configured: bool
    google_connected: bool
    google_email: Optional[str] = None
    spreadsheet_id: Optional[str] = None
    spreadsheet_url: Optional[str] = None
    sheet_name: Optional[str] = None
    enabled: bool = False
    last_synced_at: Optional[str] = None
    missing_scopes: List[str] = Field(default_factory=list)


class MicrosoftExcelStatusOut(BaseModel):
    configured: bool
    connected: bool
    microsoft_email: Optional[str] = None
    scopes: List[str] = Field(default_factory=list)
    missing_scopes: List[str] = Field(default_factory=list)


class MicrosoftExcelAuthStartOut(BaseModel):
    authorization_url: str


class EventMicrosoftExcelStatusOut(BaseModel):
    ms365_configured: bool
    ms365_connected: bool
    microsoft_email: Optional[str] = None
    workbook_id: Optional[str] = None
    workbook_url: Optional[str] = None
    workbook_name: Optional[str] = None
    sheet_name: Optional[str] = None
    enabled: bool = False
    last_synced_at: Optional[str] = None
    missing_scopes: List[str] = Field(default_factory=list)


class WebhookSubscriptionOut(BaseModel):
    id: int
    user_id: int
    event_type: str
    url: str
    is_active: bool
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class WebhookSubscriptionIn(BaseModel):
    event_type: str
    url: str
    secret: Optional[str] = None

    @field_validator("url")
    @classmethod
    def validate_url(cls, value: str) -> str:
        return WebhookEndpointIn(url=value, events=[]).url


class EmailDeliveryLogOut(BaseModel):
    id: int
    bulk_job_id: int
    attendee_id: int
    status: str  # sent, bouonced, failed, opened
    reason: Optional[str]
    sent_at: datetime
    opened_at: Optional[datetime]
    model_config = ConfigDict(from_attributes=True)


class ScheduledEmailIn(BaseModel):
    email_template_id: int
    recipient_type: str = "attendees"  # attendees | certified
    schedule_type: str = "immediate"  # immediate | datetime | cron
    scheduled_datetime: Optional[datetime] = None  # For datetime scheduling
    cron_expression: Optional[str] = None  # For cron scheduling (e.g., "0 9 * * MON")
    description: Optional[str] = None


class ScheduledEmailOut(BaseModel):
    id: int
    event_id: int
    email_template_id: int
    schedule_type: str
    scheduled_at: Optional[datetime]
    cron_expression: Optional[str]
    status: str  # pending | scheduled | completed | failed | cancelled
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class CurrentUser(BaseModel):
    id: int
    role: Role
    email: EmailStr


class CurrentPublicMember(BaseModel):
    id: int
    email: EmailStr
    display_name: str
    public_id: str
    avatar_url: Optional[str] = None


class AdminListItem(BaseModel):
    id: int
    email: EmailStr
    heptacoin_balance: int
    created_at: datetime


class TxListItem(BaseModel):
    id: int
    user_id: int
    amount: int
    type: TxType
    timestamp: datetime


class TxListOut(BaseModel):
    items: List[TxListItem]
    total: int
    page: int
    limit: int


class AdminRowOut(BaseModel):
    id: int
    email: EmailStr
    role: Role
    heptacoin_balance: int


class SuperadminAudieonceItemOut(BaseModel):
    email: EmailStr
    public_member_count: int
    attendee_count: int


class SuperadminAudieonceOut(BaseModel):
    items: List[SuperadminAudieonceItemOut]
    total: int
    limit: int
    offset: int
    source: str
    unique_public_member_emails: int
    unique_attendee_emails: int
    unique_organizer_emails: int


class SuperadminBulkEmailIn(BaseModel):
    subject: str = Field(min_length=3, max_length=240)
    body_html: str = Field(min_length=10, max_length=100_000)
    source: str = Field(default="all", pattern="^(all|public_members|attendees|organizers)$")
    dry_run: bool = False


class SuperadminBulkEmailOut(BaseModel):
    dry_run: bool
    source: str
    targeted: int
    sent: int
    failed: int
    message: str


class SuperadminBulkEmailJobIn(BaseModel):
    subject: str = Field(min_length=3, max_length=240)
    body_html: str = Field(min_length=10, max_length=100_000)
    source: str = Field(default="all", pattern="^(all|public_members|attendees|organizers)$")


class SuperadminBulkEmailJobOut(BaseModel):
    id: int
    created_by: int
    source: str
    job_kind: str
    subject: str
    total_targets: int
    sent_count: int
    failed_count: int
    status: str
    cancel_requested: bool
    error_message: Optional[str]
    created_at: datetime
    started_at: Optional[datetime]
    completed_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)


class SuperadminAudienceItemOut(BaseModel):
    email: str
    public_member_count: int
    attendee_count: int


class SuperadminAudienceOut(BaseModel):
    items: List[SuperadminAudienceItemOut]
    total: int
    limit: int
    offset: int
    source: str
    unique_public_member_emails: int
    unique_attendee_emails: int
    unique_organizer_emails: int


class SystemEmailDigestConfigIn(BaseModel):
    enabled: bool = False
    frequency: str = Field(default="weekly", pattern="^(daily|weekly)$")
    send_weekday: int = Field(default=1, ge=0, le=6)
    send_hour: int = Field(default=8, ge=0, le=23)
    max_events: int = Field(default=3, ge=1, le=10)
    max_posts: int = Field(default=3, ge=1, le=10)


class SystemEmailDigestConfigOut(BaseModel):
    id: int
    enabled: bool
    frequency: str
    send_weekday: int
    send_hour: int
    max_events: int
    max_posts: int
    last_sent_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


class SuperadminEmailActivityItemOut(BaseModel):
    channel: str
    job_id: int
    sender_user_id: int
    sender_email: EmailStr
    event_id: Optional[int] = None
    event_name: Optional[str] = None
    recipient_group: str
    subject: str
    status: str
    total_targets: int
    sent_count: int
    failed_count: int
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    error_message: Optional[str] = None


class SuperadminEmailActivityOut(BaseModel):
    items: List[SuperadminEmailActivityItemOut]
    total: int
    limit: int
    offset: int


class AdminRoleIn(BaseModel):
    role: str = Field(pattern="^(admin|superadmin)$")


class StatsOut(BaseModel):
    active_members: str
    hosted_events: str
    issued_certificates: str
    active_orgs: str
    certs_issued: str
    uptime_pct: str
    availability: str


class StatsIn(BaseModel):
    active_members: Optional[str] = None
    hosted_events: Optional[str] = None
    issued_certificates: Optional[str] = None
    active_orgs: Optional[str] = None
    certs_issued: Optional[str] = None
    uptime_pct: Optional[str] = None
    availability: Optional[str] = None
    use_real_counts: bool = True


class CreatePaymentIn(BaseModel):
    plan_id: str
    billing_period: str = "monthly"   # "monthly" | "annual"


class OrderOut(BaseModel):
    id: int
    plan_id: str
    amount_cents: int
    currency: str
    provider: str
    status: str
    created_at: datetime
    paid_at: Optional[datetime]


class PaymentConfigOut(BaseModel):
    enabled: bool
    active_provider: str
    iyzico_api_key: str
    iyzico_secret_key: str
    iyzico_base_url: str
    paytr_merchant_id: str
    paytr_merchant_key: str
    paytr_merchant_salt: str
    stripe_secret_key: str
    stripe_webhook_secret: str
    stripe_publishable_key: str


class MeOut(BaseModel):
    id: int
    email: EmailStr
    role: Role
    heptacoin_balance: int


class AgentMeOut(BaseModel):
    user_id: int
    email: str
    api_key_prefix: Optional[str] = None
    scopes: List[str] = Field(default_factory=list)


class AgentLogIn(BaseModel):
    tool_name: str = Field(max_length=100)
    event_id: Optional[int] = None
    payload: Optional[Dict[str, Any]] = None
    result_summary: Optional[str] = Field(default=None, max_length=500)
    api_key_prefix: Optional[str] = Field(default=None, max_length=12)


class AttendeeUpdateIn(BaseModel):
    first_name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    last_name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    email: Optional[EmailStr] = None


class WatermarkVerifyOut(BaseModel):
    valid: bool
    message: str
    public_id: Optional[str] = None
    cert_uuid: Optional[str] = None
    student_name: Optional[str] = None
    event_name: Optional[str] = None
    issued_at: Optional[str] = None
    status: Optional[str] = None


class GrantSubscriptionIn(BaseModel):
    target_type: str = Field(default="admin", pattern="^admin$")
    user_email: str
    plan_id: str
    days: int = 365


class SessionCreateIn(BaseModel):
    name: str = Field(min_length=2, max_length=200)
    session_date: Optional[str] = None  # YYYY-MM-DD
    session_start: Optional[str] = None  # HH:MM
    session_location: Optional[str] = Field(default=None, max_length=300)


class SessionOut(BaseModel):
    id: int
    event_id: int
    name: str
    session_date: Optional[str] = None
    session_start: Optional[str] = None
    session_location: Optional[str] = None
    checkin_token: str
    is_active: bool
    created_at: datetime
    attendaonce_count: int = 0


class AttendeeImportRow(BaseModel):
    name: str
    email: EmailStr


class ManualAttendeeCreateIn(BaseModel):
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    email: EmailStr


class AttendeeOut(BaseModel):
    id: int
    event_id: int
    name: str
    email: str
    source: str
    registered_at: datetime
    sessions_attended: int = 0
    has_certificate: bool = False
    public_member_id: Optional[int] = None
    public_member_name: Optional[str] = None
    public_member_email: Optional[str] = None
    registration_answers: Dict[str, Any] = Field(default_factory=dict)


class SelfRegisterIn(BaseModel):
    name: str = Field(min_length=2, max_length=200)
    email: EmailStr
    registration_answers: Dict[str, Any] = Field(default_factory=dict)
    kvkk_accepted: bool = False
    organizer_notice_accepted: bool = False
    cross_border_notice_read: bool = False
    cross_border_transfer_consent: bool = False
    registration_documents: List[Dict[str, Any]] = Field(default_factory=list)


class LegalDocumentEventIn(BaseModel):
    document: Literal["kvkk", "privacy", "explicit_consent", "organizer_notice", "cross_border_notice"]
    event_type: Literal["click", "view"] = "click"
    event_id: Optional[str] = Field(default=None, max_length=128)
    context: Optional[str] = Field(default=None, max_length=128)
    source_path: Optional[str] = Field(default=None, max_length=512)


class CheckinIn(BaseModel):
    email: EmailStr


class CheckinOut(BaseModel):
    success: bool
    message: str
    attendee_name: str = ""
    sessions_attended: int = 0
    sessions_required: int = 1
    total_sessions: int = 0


class BulkCertifyOut(BaseModel):
    created: int
    already_had_cert: int
    below_threshold: int
    total_attendees: int
    spent_heptacoin: int


class EventRaffleCreateIn(BaseModel):
    title: str = Field(min_length=2, max_length=200)
    prize_name: str = Field(min_length=2, max_length=200)
    description: Optional[str] = Field(default=None, max_length=4000)
    min_sessions_required: int = Field(default=1, ge=1, le=1000)
    winner_count: int = Field(default=1, ge=1, le=100)
    reserve_winner_count: int = Field(default=1, ge=0, le=100)


class EventRaffleUpdateIn(BaseModel):
    title: Optional[str] = Field(default=None, min_length=2, max_length=200)
    prize_name: Optional[str] = Field(default=None, min_length=2, max_length=200)
    description: Optional[str] = Field(default=None, max_length=4000)
    min_sessions_required: Optional[int] = Field(default=None, ge=1, le=1000)
    winner_count: Optional[int] = Field(default=None, ge=1, le=100)
    reserve_winner_count: Optional[int] = Field(default=None, ge=0, le=100)


class EventRaffleWinnerOut(BaseModel):
    attendee_id: int
    attendee_name: str
    attendee_email: str
    sessions_attended: int
    drawn_at: datetime


class EventRaffleEligibleOut(BaseModel):
    attendee_id: int
    attendee_name: str
    attendee_email: str
    sessions_attended: int


class EventRaffleOut(BaseModel):
    id: int
    event_id: int
    title: str
    prize_name: str
    description: Optional[str] = None
    min_sessions_required: int
    winner_count: int
    reserve_winner_count: int
    status: str
    created_at: datetime
    updated_at: datetime
    drawn_at: Optional[datetime] = None
    eligible_count: int = 0
    total_attendees: int = 0
    eligible_attendees: List[EventRaffleEligibleOut] = Field(default_factory=list)
    winners: List[EventRaffleWinnerOut] = Field(default_factory=list)


class EventRaffleExportOut(BaseModel):
    ok: bool
    exported_count: int


class BulkCertifyIn(BaseModel):
    hosting_term: str = Field(default="yearly", pattern="^(monthly|yearly)$")
