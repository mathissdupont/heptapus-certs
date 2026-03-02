import csv
import hashlib
import hmac
import io
import json
import math
import os
import secrets
import logging
import time
import zipfile
import asyncio
from datetime import datetime, timedelta, timezone
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from enum import Enum
from pathlib import Path
from typing import Any, Dict, Optional, List
import uuid as _uuid_module
import aiosmtplib
from itsdangerous import URLSafeTimedSerializer, SignatureExpired, BadSignature
import pandas as pd
import pyotp
from fastapi import FastAPI, Body, Depends, HTTPException, UploadFile, File, Query, Request, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
try:
    from PIL import Image as PILImage
except ImportError:
    PILImage = None  # type: ignore
try:
    import qrcode
    import qrcode.image.pil
except ImportError:
    qrcode = None  # type: ignore
from jose import jwt, JWTError
from passlib.context import CryptContext
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator
from pydantic_settings import BaseSettings
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from datetime import date as date_type
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.date import DateTrigger
from sqlalchemy import (
    Boolean, String, Integer, BigInteger, DateTime, ForeignKey, Text,
    Enum as SAEnum, UniqueConstraint, Index, select, func, update, Date as sa_Date, Time as sa_Time
)
from sqlalchemy import JSON as _JSON
from sqlalchemy.dialects.postgresql import JSONB as _PgJSONB, INET as _PgINET

# Use native PostgreSQL JSONB/INET on PostgreSQL, fall back to JSON/String on SQLite
JSONB = _JSON().with_variant(_PgJSONB(), "postgresql")
INET = String(45).with_variant(_PgINET(), "postgresql")
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

from .generator import TemplateConfig, render_certificate_pdf, new_certificate_uuid

logger = logging.getLogger("heptacert")


class Settings(BaseSettings):
    database_url: str = Field(alias="DATABASE_URL")
    jwt_secret: str = Field(alias="JWT_SECRET")
    jwt_expires_minutes: int = Field(default=1440, alias="JWT_EXPIRES_MINUTES")

    bootstrap_superadmin_email: EmailStr = Field(alias="BOOTSTRAP_SUPERADMIN_EMAIL")
    bootstrap_superadmin_password: str = Field(alias="BOOTSTRAP_SUPERADMIN_PASSWORD")

    public_base_url: str = Field(default="http://localhost:8000", alias="PUBLIC_BASE_URL")
    frontend_base_url: str = Field(default="http://localhost:3000", alias="FRONTEND_BASE_URL")
    cors_origins: str = Field(default="*", alias="CORS_ORIGINS")

    storage_mode: str = Field(default="local", alias="STORAGE_MODE")
    local_storage_dir: str = Field(default="/data", alias="LOCAL_STORAGE_DIR")

    # SMTP (optional — if not set, verification tokens are printed to logs)
    smtp_host: str = Field(default="", alias="SMTP_HOST")
    smtp_port: int = Field(default=587, alias="SMTP_PORT")
    smtp_user: str = Field(default="", alias="SMTP_USER")
    smtp_password: str = Field(default="", alias="SMTP_PASSWORD")
    smtp_from: str = Field(default="noreply@heptapus.com", alias="SMTP_FROM")

    email_token_secret: str = Field(alias="EMAIL_TOKEN_SECRET")

    # ── Payment (feature-flagged — off by default until vergi levhası) ────────
    payment_enabled: bool = Field(default=False, alias="PAYMENT_ENABLED")
    active_payment_provider: str = Field(default="iyzico", alias="ACTIVE_PAYMENT_PROVIDER")
    # iyzico
    iyzico_api_key: str = Field(default="", alias="IYZICO_API_KEY")
    iyzico_secret_key: str = Field(default="", alias="IYZICO_SECRET_KEY")
    iyzico_base_url: str = Field(default="https://sandbox-api.iyzipay.com", alias="IYZICO_BASE_URL")
    # PayTR
    paytr_merchant_id: str = Field(default="", alias="PAYTR_MERCHANT_ID")
    paytr_merchant_key: str = Field(default="", alias="PAYTR_MERCHANT_KEY")
    paytr_merchant_salt: str = Field(default="", alias="PAYTR_MERCHANT_SALT")
    # Stripe
    stripe_secret_key: str = Field(default="", alias="STRIPE_SECRET_KEY")
    stripe_webhook_secret: str = Field(default="", alias="STRIPE_WEBHOOK_SECRET")
    stripe_publishable_key: str = Field(default="", alias="STRIPE_PUBLISHABLE_KEY")


settings = Settings()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
_startup_time: float = time.time()

engine = create_async_engine(settings.database_url, pool_pre_ping=True)
SessionLocal = async_sessionmaker(engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


class Role(str, Enum):
    superadmin = "superadmin"
    admin = "admin"


class CertStatus(str, Enum):
    active = "active"
    revoked = "revoked"
    expired = "expired"


class TxType(str, Enum):
    credit = "credit"
    spend = "spend"


class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[Role] = mapped_column(SAEnum(Role, name="role_enum"), index=True)
    heptacoin_balance: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    verification_token: Mapped[Optional[str]] = mapped_column(String(256), nullable=True)
    password_reset_token: Mapped[Optional[str]] = mapped_column(String(256), nullable=True)
    magic_link_token: Mapped[Optional[str]] = mapped_column(String(256), nullable=True)

    events: Mapped[List["Event"]] = relationship(back_populates="admin")
    transactions: Mapped[List["Transaction"]] = relationship(back_populates="user")
    email_config: Mapped[Optional["UserEmailConfig"]] = relationship(back_populates="user", uselist=False)


class Event(Base):
    __tablename__ = "events"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    admin_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(200))
    template_image_url: Mapped[str] = mapped_column(Text)
    config: Mapped[dict] = mapped_column(JSONB, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    cert_seq: Mapped[int] = mapped_column(Integer, default=0)
    # Attendance management fields (migration 003)
    event_date: Mapped[Optional[date_type]] = mapped_column(sa_Date, nullable=True)
    event_description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    event_location: Mapped[Optional[str]] = mapped_column(String(300), nullable=True)
    min_sessions_required: Mapped[int] = mapped_column(Integer, default=1)
    # Banner/hero image (migration 004)
    event_banner_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    # Email settings (migration 008)
    auto_email_on_cert: Mapped[bool] = mapped_column(Boolean, default=False)
    cert_email_template_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    admin: Mapped["User"] = relationship(back_populates="events")
    certificates: Mapped[List["Certificate"]] = relationship(back_populates="event", cascade="all, delete-orphan", passive_deletes=True)
    sessions: Mapped[List["EventSession"]] = relationship(back_populates="event", cascade="all, delete-orphan", passive_deletes=True)
    attendees: Mapped[List["Attendee"]] = relationship(back_populates="event", cascade="all, delete-orphan", passive_deletes=True)
    template_snapshots: Mapped[List["EventTemplateSnapshot"]] = relationship(back_populates="event", cascade="all, delete-orphan", passive_deletes=True)
    email_templates: Mapped[List["EmailTemplate"]] = relationship(back_populates="event", cascade="all, delete-orphan", passive_deletes=True)
    bulk_email_jobs: Mapped[List["BulkEmailJob"]] = relationship(back_populates="event", cascade="all, delete-orphan", passive_deletes=True)

    __table_args__ = (Index("ix_events_admin_id_created", "admin_id", "created_at"),)


class Certificate(Base):
    __tablename__ = "certificates"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    uuid: Mapped[str] = mapped_column(String(36), unique=True, index=True)
    student_name: Mapped[str] = mapped_column(String(200))
    event_id: Mapped[int] = mapped_column(ForeignKey("events.id", ondelete="CASCADE"), index=True)
    pdf_url: Mapped[str] = mapped_column(Text)
    status: Mapped[CertStatus] = mapped_column(SAEnum(CertStatus, name="cert_status_enum"), default=CertStatus.active)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    public_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    issued_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    hosting_term: Mapped[str] = mapped_column(String(16), default="yearly")
    hosting_ends_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    asset_size_bytes: Mapped[int] = mapped_column(Integer, default=0)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)


    event: Mapped["Event"] = relationship(back_populates="certificates")

    __table_args__ = (
        UniqueConstraint("event_id", "student_name", "uuid", name="uq_cert_event_student_uuid"),
        Index("ix_cert_event_status", "event_id", "status"),
    )


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
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


# ── Payment DB models (created by migration 002) ─────────────────────────────

class OrderStatus(str, Enum):
    pending  = "pending"
    paid     = "paid"
    failed   = "failed"
    refunded = "refunded"


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


# ── Enterprise DB models (created by migration 003) ──────────────────────────

class ApiKey(Base):
    __tablename__ = "api_keys"
    id:           Mapped[int]           = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id:      Mapped[int]           = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    name:         Mapped[str]           = mapped_column(String(200))
    key_prefix:   Mapped[str]           = mapped_column(String(8))
    key_hash:     Mapped[str]           = mapped_column(String(128), unique=True)
    scopes:       Mapped[list]          = mapped_column(JSONB, default=list)
    is_active:    Mapped[bool]          = mapped_column(Boolean, default=True)
    last_used_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    expires_at:   Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at:   Mapped[datetime]      = mapped_column(DateTime(timezone=True), server_default=func.now())


class TotpSecret(Base):
    __tablename__ = "totp_secrets"
    user_id:    Mapped[int]     = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    secret:     Mapped[str]     = mapped_column(String(64))
    enabled:    Mapped[bool]    = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class AuditLog(Base):
    __tablename__ = "audit_logs"
    id:            Mapped[int]           = mapped_column(BigInteger, primary_key=True, autoincrement=True)
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
    id:           Mapped[int]           = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    endpoint_id:  Mapped[int]           = mapped_column(Integer, ForeignKey("webhook_endpoints.id", ondelete="CASCADE"))
    event_type:   Mapped[str]           = mapped_column(String(64))
    payload:      Mapped[dict]          = mapped_column(JSONB, default=dict)
    status:       Mapped[str]           = mapped_column(String(16), default="pending")
    http_status:  Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    response_body: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    attempt:      Mapped[int]           = mapped_column(Integer, default=1)
    delivered_at: Mapped[datetime]      = mapped_column(DateTime(timezone=True), server_default=func.now())


class Organization(Base):
    __tablename__ = "organizations"
    id:            Mapped[int]           = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id:       Mapped[int]           = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    org_name:      Mapped[str]           = mapped_column(String(200))
    custom_domain: Mapped[Optional[str]] = mapped_column(String(253), unique=True, nullable=True)
    brand_logo:    Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    brand_color:   Mapped[str]           = mapped_column(String(7), default="#6366f1")
    created_at:    Mapped[datetime]      = mapped_column(DateTime(timezone=True), server_default=func.now())


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
    id:         Mapped[int]           = mapped_column(BigInteger, primary_key=True, autoincrement=True)
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


# ── Email System Models (created by migration 008) ───────────────────────────

class UserEmailConfig(Base):
    __tablename__ = "user_email_configs"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, index=True)
    smtp_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    from_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    reply_to: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    auto_cc: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    enable_tracking_pixel: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user: Mapped["User"] = relationship(back_populates="email_config")


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
    recipients_count: Mapped[int] = mapped_column(Integer, default=0)
    sent_count: Mapped[int] = mapped_column(Integer, default=0)
    failed_count: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(50), default="pending")  # pending | sending | completed | failed
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    event: Mapped["Event"] = relationship(back_populates="bulk_email_jobs")
    creator: Mapped["User"] = relationship(foreign_keys=[created_by])
    email_template: Mapped[Optional["EmailTemplate"]] = relationship()


class EmailDeliveryLog(Base):
    __tablename__ = "email_delivery_logs"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    bulk_job_id: Mapped[int] = mapped_column(Integer, ForeignKey("bulk_email_jobs.id", ondelete="CASCADE"), index=True)
    attendee_id: Mapped[int] = mapped_column(Integer, ForeignKey("attendees.id", ondelete="CASCADE"), index=True)
    recipient_email: Mapped[str] = mapped_column(String(255))
    status: Mapped[str] = mapped_column(String(50), default="pending")  # pending, sent, bounced, failed, opened
    reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    sent_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    opened_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    bulk_job: Mapped["BulkEmailJob"] = relationship()
    attendee: Mapped["Attendee"] = relationship()


class WebhookSubscription(Base):
    __tablename__ = "webhook_subscriptions"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    event_type: Mapped[str] = mapped_column(String(50), index=True)  # email.sent, email.failed, email.bounced, email.opened
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


# ── Attendance management models (migration 003) ──────────────────────────────

class AttendeeSource(str, Enum):
    import_ = "import"
    self_register = "self_register"


class EventSession(Base):
    __tablename__ = "event_sessions"
    id:               Mapped[int]            = mapped_column(Integer, primary_key=True, autoincrement=True)
    event_id:         Mapped[int]            = mapped_column(Integer, ForeignKey("events.id", ondelete="CASCADE"), index=True)
    name:             Mapped[str]            = mapped_column(String(200))
    session_date:     Mapped[Optional[date_type]] = mapped_column(sa_Date, nullable=True)
    session_start:    Mapped[Optional[Any]]  = mapped_column(sa_Time, nullable=True)
    session_location: Mapped[Optional[str]]  = mapped_column(String(300), nullable=True)
    checkin_token:    Mapped[str]            = mapped_column(String(64), unique=True)
    is_active:        Mapped[bool]           = mapped_column(Boolean, default=False)
    created_at:       Mapped[datetime]       = mapped_column(DateTime(timezone=True), server_default=func.now())

    event: Mapped["Event"] = relationship(back_populates="sessions")
    attendance_records: Mapped[List["AttendanceRecord"]] = relationship(back_populates="session", cascade="all, delete-orphan")


class Attendee(Base):
    __tablename__ = "attendees"
    id:            Mapped[int]      = mapped_column(Integer, primary_key=True, autoincrement=True)
    event_id:      Mapped[int]      = mapped_column(Integer, ForeignKey("events.id", ondelete="CASCADE"), index=True)
    name:          Mapped[str]      = mapped_column(String(200))
    email:         Mapped[str]      = mapped_column(String(320))
    source:        Mapped[str]      = mapped_column(
        SAEnum("import", "self_register", name="attendee_source_enum", create_type=False),
        default="import",
    )
    registered_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    event: Mapped["Event"] = relationship(back_populates="attendees")
    attendance_records: Mapped[List["AttendanceRecord"]] = relationship(back_populates="attendee", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("event_id", "email", name="uq_attendee_event_email"),
    )


class AttendanceRecord(Base):
    __tablename__ = "attendance_records"
    id:            Mapped[int]           = mapped_column(Integer, primary_key=True, autoincrement=True)
    attendee_id:   Mapped[int]           = mapped_column(Integer, ForeignKey("attendees.id", ondelete="CASCADE"), index=True)
    session_id:    Mapped[int]           = mapped_column(Integer, ForeignKey("event_sessions.id", ondelete="CASCADE"), index=True)
    checked_in_at: Mapped[datetime]      = mapped_column(DateTime(timezone=True), server_default=func.now())
    ip_address:    Mapped[Optional[str]] = mapped_column(String(45), nullable=True)

    attendee: Mapped["Attendee"] = relationship(back_populates="attendance_records")
    session:  Mapped["EventSession"] = relationship(back_populates="attendance_records")

    __table_args__ = (
        UniqueConstraint("attendee_id", "session_id", name="uq_attendance_attendee_session"),
    )


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


class LoginIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


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
    event_description: Optional[str] = Field(default=None, max_length=4000)
    event_location: Optional[str] = Field(default=None, max_length=300)
    min_sessions_required: Optional[int] = Field(default=None, ge=1, le=1000)
    event_banner_url: Optional[str] = Field(default=None, max_length=2000)


class CreditCoinsIn(BaseModel):
    admin_user_id: int
    amount: int = Field(gt=0, le=1_000_000)


class EventCreateIn(BaseModel):
    name: str = Field(min_length=2, max_length=200)
    template_image_url: str = Field(min_length=1, max_length=2000)
    config: Dict[str, Any] = Field(default_factory=dict)


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


class EventOut(BaseModel):
    id: int
    name: str
    template_image_url: str
    config: Dict[str, Any]
    event_date: Optional[str] = None
    event_description: Optional[str] = None
    event_location: Optional[str] = None
    min_sessions_required: int = 1
    event_banner_url: Optional[str] = None


class BulkGenerateOut(BaseModel):
    event_id: int
    created: int
    spent_heptacoin: int
    certificates: List[Dict[str, Any]]


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
    pdf_url: Optional[str] = None

class CertificateListOut(BaseModel):
    items: List[CertificateOut]
    total: int
    page: int
    limit: int

class IssueCertificateIn(BaseModel):
    student_name: str = Field(min_length=2, max_length=200)
    hosting_term: str = Field(default="yearly", pattern="^(monthly|yearly)$")

class UpdateCertificateStatusIn(BaseModel):
    status: CertStatus


class BulkActionIn(BaseModel):
    cert_ids: List[int] = Field(min_length=1, max_length=500)
    action: str = Field(pattern="^(revoke|expire|delete)$")


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
    status: CertStatus
    pdf_url: Optional[str] = None
    issued_at: Optional[datetime] = None
    hosting_ends_at: Optional[datetime] = None
    view_count: int = 0
    linkedin_url: Optional[str] = None
    branding: Optional[Dict[str, Any]] = None


# ── Enterprise Pydantic models ────────────────────────────────────────────────

class ApiKeyCreateIn(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    expires_days: Optional[int] = Field(default=None, ge=1, le=3650)


class ApiKeyOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    key_prefix: str
    is_active: bool
    scopes: List[str]
    last_used_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    created_at: datetime


class ApiKeyCreateOut(ApiKeyOut):
    full_key: str  # only returned once at creation


class TotpSetupOut(BaseModel):
    otpauth_url: str
    secret: str  # for manual entry; show once


class TotpConfirmIn(BaseModel):
    code: str = Field(min_length=6, max_length=6)


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
        """Prevent SSRF: reject private/internal IPs and require HTTPS."""
        import ipaddress
        from urllib.parse import urlparse
        parsed = urlparse(v)
        if parsed.scheme not in ("https", "http"):
            raise ValueError("Webhook URL must use HTTPS or HTTP scheme")
        hostname = parsed.hostname or ""
        # Block private/reserved IP ranges
        try:
            ip = ipaddress.ip_address(hostname)
            if ip.is_private or ip.is_loopback or ip.is_reserved or ip.is_link_local:
                raise ValueError("Webhook URL must not point to private/internal addresses")
        except ValueError as exc:
            if "private" in str(exc) or "internal" in str(exc):
                raise
            # hostname is a domain name — block known internal hostnames
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


class OrgOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: int
    org_name: str
    custom_domain: Optional[str] = None
    brand_logo: Optional[str] = None
    brand_color: str
    created_at: datetime


class AuditLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: Optional[int] = None
    action: str
    resource_type: Optional[str] = None
    resource_id: Optional[str] = None
    ip_address: Optional[str] = None
    created_at: datetime


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


# ── Email System Schemas ──────────────────────────────────────────────────────

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


class BulkEmailJobOut(BaseModel):
    id: int
    event_id: int
    created_by: int
    email_template_id: Optional[int]
    recipients_count: int
    sent_count: int
    failed_count: int
    status: str
    error_message: Optional[str]
    created_at: datetime
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    model_config = ConfigDict(from_attributes=True)


class UserEmailConfigOut(BaseModel):
    id: int
    user_id: int
    smtp_enabled: bool
    from_name: Optional[str]
    reply_to: Optional[str]
    auto_cc: Optional[str]
    enable_tracking_pixel: bool
    model_config = ConfigDict(from_attributes=True)


class EmailConfigUpdateIn(BaseModel):
    smtp_enabled: bool
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
    smtp_user: str
    smtp_password: str
    from_email: str


class EmailConfigTestResponse(BaseModel):
    status: str  # "success" or "error"
    message: str
    verified_at: Optional[datetime] = None


class WebhookSubscriptionOut(BaseModel):
    id: int
    user_id: int
    event_type: str
    url: str
    is_active: bool
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class EmailDeliveryLogOut(BaseModel):
    id: int
    bulk_job_id: int
    attendee_id: int
    status: str  # sent, bounced, failed, opened
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


DEFAULT_PRICING: List[dict] = [
    {
        "id": "starter",
        "name_tr": "Başlangıç",
        "name_en": "Starter",
        "price_monthly": 0,
        "price_annual": 0,
        "hc_quota": 50,
        "features_tr": [
            "50 HC hoş geldin bonusu (tek seferlik)",
            "QR kod doğrulama",
            "Sertifika arşivi (1 yıl)",
            "Temel şablon editörü",
            "HeptaCert watermark",
        ],
        "features_en": [
            "50 HC welcome bonus (one-time)",
            "QR code verification",
            "Certificate archive (1 year)",
            "Basic template editor",
            "HeptaCert watermark",
        ],
        "is_free": True,
        "is_enterprise": False,
    },
    {
        "id": "pro",
        "name_tr": "Profesyonel",
        "name_en": "Professional",
        "price_monthly": 499,
        "price_annual": 399,
        "hc_quota": 500,
        "features_tr": [
            "Aylık 500 HC",
            "Sınırsız etkinlik",
            "Excel toplu basım",
            "Sertifika arşivi (3 yıl)",
            "Etkinlik kayıt ve check-in sistemi",
            "QR ile yoklama takibi",
            "Öncelikli destek",
        ],
        "features_en": [
            "500 HC per month",
            "Unlimited events",
            "Excel bulk generation",
            "Certificate archive (3 years)",
            "Event registration & check-in system",
            "QR attendance tracking",
            "Priority support",
        ],
        "is_free": False,
        "is_enterprise": False,
    },
    {
        "id": "growth",
        "name_tr": "Büyüme",
        "name_en": "Growth",
        "price_monthly": 1299,
        "price_annual": 1099,
        "hc_quota": 2000,
        "features_tr": [
            "Aylık 2.000 HC",
            "Sınırsız etkinlik",
            "Excel toplu basım",
            "Sertifika arşivi (3 yıl)",
            "Etkinlik kayıt ve check-in sistemi",
            "QR ile yoklama takibi",
            "API erişimi (tam)",
            "Özel alan adı doğrulama",
            "Marka watermark kaldırma",
            "Otomatik email sistemi (bulk mail + şablonlar)",
            "5-7 hazır sertifika şablonu",
            "Custom event açıklaması ve banneri",
            "Webhook API desteği",
            "Advanced analytics dashboard",
            "Custom form alanları",
            "Katılımcı self-service sertifika indirme",
        ],
        "features_en": [
            "2,000 HC per month",
            "Unlimited events",
            "Excel bulk generation",
            "Certificate archive (3 years)",
            "Event registration & check-in system",
            "QR attendance tracking",
            "Full API access",
            "Custom domain verification",
            "Remove branding watermark",
            "Automated email system (bulk mail + templates)",
            "5-7 pre-built certificate templates",
            "Custom event description & banner",
            "Webhook API support",
            "Advanced analytics dashboard",
            "Custom form fields",
            "Attendee self-service certificate download",
        ],
        "is_free": False,
        "is_enterprise": False,
    },
    {
        "id": "enterprise",
        "name_tr": "Kurumsal",
        "name_en": "Enterprise",
        "price_monthly": None,
        "price_annual": None,
        "hc_quota": None,
        "features_tr": [
            "Sınırsız HC kotası",
            "Özel SLA anlaşması",
            "API entegrasyonu",
            "Özel alan adı desteği",
            "Etkinlik kayıt ve check-in sistemi",
            "QR ile yoklama takibi",
            "Toplu sertifika üretimi",
            "7/24 kurumsal destek",
        ],
        "features_en": [
            "Unlimited HC quota",
            "Custom SLA agreement",
            "API integration",
            "Custom domain support",
            "Event registration & check-in system",
            "QR attendance tracking",
            "Bulk certificate generation",
            "24/7 enterprise support",
        ],
        "is_free": False,
        "is_enterprise": True,
    },
]



#helpers
# 1 coin = 10 unit (0.1 coin)
COIN_UNIT = 10
MB_PER_COIN_MONTH = 100.0
MIN_MONTHLY_UNITS = 2   # 0.2 coin
STEP_UNITS = 1          # 0.1 coin

def monthly_hosting_units(asset_size_bytes: int) -> int:
    mb = asset_size_bytes / (1024 * 1024)
    units_mult = max(1, math.ceil(mb / MB_PER_COIN_MONTH))
    raw = units_mult * STEP_UNITS
    return max(MIN_MONTHLY_UNITS, raw)

def hosting_units(term: str, asset_size_bytes: int) -> int:
    m = monthly_hosting_units(asset_size_bytes)
    if term == "monthly":
        return m
    return m * 10  # yearly: 10 ay ücret

def compute_hosting_ends(term: str) -> datetime:
    now = datetime.now(timezone.utc)
    if term == "monthly":
        return now + timedelta(days=30)
    return now + timedelta(days=365)

#helpers

def hash_password(pw: str) -> str:
    return pwd_context.hash(pw)


def verify_password(pw: str, pw_hash: str) -> bool:
    return pwd_context.verify(pw, pw_hash)


# ── Email token helpers ────────────────────────────────────────────────────────
_email_signer: Optional[URLSafeTimedSerializer] = None

def get_signer() -> URLSafeTimedSerializer:
    global _email_signer
    if _email_signer is None:
        _email_signer = URLSafeTimedSerializer(settings.email_token_secret)
    return _email_signer


def make_email_token(payload: dict) -> str:
    return get_signer().dumps(payload)


def verify_email_token(token: str, max_age: int = 86400) -> dict:
    """Raises on expired / invalid."""
    return get_signer().loads(token, max_age=max_age)


async def send_email_async(
    to: str,
    subject: str,
    html_body: str,
    template_vars: Optional[Dict[str, Any]] = None,
    attachments: Optional[List[tuple[str, bytes, str]]] = None,  # [(filename, bytes, mimetype),...]
) -> None:
    """
    Send email asynchronously.
    
    Args:
        to: Recipient email address
        subject: Email subject
        html_body: HTML body or Jinja2 template string
        template_vars: Variables to render in Jinja2 template
        attachments: Optional list of (filename, bytes_content, mimetype) tuples
    """
    if not settings.smtp_host:
        logger.warning(
            "[EMAIL — no SMTP configured] To: %s | Subject: %s\nBody: %s",
            to, subject, html_body
        )
        return
    
    # Render Jinja2 template if template_vars provided
    if template_vars:
        try:
            from jinja2 import Template
            template = Template(html_body)
            html_body = template.render(**template_vars)
            subject = Template(subject).render(**template_vars)
        except Exception as exc:
            logger.error("Jinja2 template rendering failed: %s", exc)
            return
    
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = settings.smtp_from
    msg["To"] = to
    # Add unsubscribe header (RFC 2369)
    msg["List-Unsubscribe"] = f"<mailto:{settings.smtp_from}?subject=unsubscribe>"
    
    msg.attach(MIMEText(html_body, "html"))
    
    # Attach files if provided
    if attachments:
        for filename, file_bytes, mimetype in attachments:
            from email.mime.base import MIMEBase
            from email import encoders
            
            maintype, subtype = mimetype.split("/", 1)
            if maintype == "text":
                from email.mime.text import MIMEText
                attachment = MIMEText(file_bytes.decode(), _subtype=subtype)
            elif maintype == "image":
                from email.mime.image import MIMEImage
                attachment = MIMEImage(file_bytes, _subtype=subtype)
            elif maintype == "application":
                attachment = MIMEBase(maintype, subtype)
                attachment.set_payload(file_bytes)
                encoders.encode_base64(attachment)
            else:
                attachment = MIMEBase(maintype, subtype)
                attachment.set_payload(file_bytes)
                encoders.encode_base64(attachment)
            
            attachment.add_header("Content-Disposition", "attachment", filename=filename)
            msg.attach(attachment)
    
    try:
        await aiosmtplib.send(
            msg,
            hostname=settings.smtp_host,
            port=settings.smtp_port,
            username=settings.smtp_user or None,
            password=settings.smtp_password or None,
            start_tls=True,
        )
        logger.info("Email sent successfully to %s", to)
    except Exception as exc:
        logger.error("SMTP send failed to %s: %s", to, exc)
        # Retry logic could be added here with exponential backoff


async def trigger_webhooks(
    user_id: int,
    event_type: str,
    payload: Dict[str, Any],
    db_session: Optional[Any] = None,
) -> None:
    """
    Trigger all active webhook subscriptions for a given event type.
    
    Args:
        user_id: User ID to filter webhooks
        event_type: Event type (e.g., "email.sent", "email.failed", "email.opened")
        payload: Data to send in webhook payload
        db_session: Optional database session (creates one if not provided)
    """
    import hmac
    import hashlib
    import aiohttp
    
    # Get webhooks from database
    from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
    
    async with SessionLocal() as db:
        res = await db.execute(
            select(WebhookSubscription).where(
                (WebhookSubscription.user_id == user_id) &
                (WebhookSubscription.event_type == event_type) &
                (WebhookSubscription.is_active == True)
            )
        )
        webhooks = res.scalars().all()
    
    if not webhooks:
        return
    
    # Send to each webhook
    async with aiohttp.ClientSession() as session:
        for webhook in webhooks:
            try:
                # Create HMAC signature
                signature = ""
                if webhook.secret:
                    payload_json = json.dumps(payload)
                    signature = hmac.new(
                        webhook.secret.encode(),
                        payload_json.encode(),
                        hashlib.sha256
                    ).hexdigest()
                else:
                    payload_json = json.dumps(payload)
                
                # Send POST request
                headers = {
                    "Content-Type": "application/json",
                    "X-Webhook-Event": event_type,
                    "X-Webhook-Timestamp": datetime.now(timezone.utc).isoformat(),
                }
                
                if signature:
                    headers["X-Webhook-Signature"] = f"sha256={signature}"
                
                async with session.post(
                    webhook.url,
                    json=payload,
                    headers=headers,
                    timeout=aiohttp.ClientTimeout(total=10),
                ) as resp:
                    response_body = await resp.text() if resp.status < 300 else None
                    
                    # Log the delivery
                    await log_webhook_delivery(
                        webhook_id=webhook.id,
                        event_type=event_type,
                        payload=payload,
                        http_status=resp.status,
                        error_message=response_body if resp.status >= 400 else None,
                    )
                    
                    if resp.status >= 400:
                        logger.warning(
                            "Webhook delivery failed for webhook %d: HTTP %d",
                            webhook.id, resp.status
                        )
                    else:
                        logger.info(
                            "Webhook delivered successfully for webhook %d",
                            webhook.id
                        )
            
            except asyncio.TimeoutError:
                await log_webhook_delivery(
                    webhook_id=webhook.id,
                    event_type=event_type,
                    payload=payload,
                    http_status=None,
                    error_message="Request timeout (10s)",
                )
                logger.warning("Webhook request timeout for webhook %d", webhook.id)
            
            except Exception as e:
                await log_webhook_delivery(
                    webhook_id=webhook.id,
                    event_type=event_type,
                    payload=payload,
                    http_status=None,
                    error_message=str(e),
                )
                logger.error("Webhook trigger failed for webhook %d: %s", webhook.id, e)


async def log_webhook_delivery(
    webhook_id: int,
    event_type: str,
    payload: Dict[str, Any],
    http_status: Optional[int] = None,
    error_message: Optional[str] = None,
) -> None:
    """Log a webhook delivery attempt."""
    async with SessionLocal() as db:
        log_entry = WebhookLog(
            webhook_id=webhook_id,
            event_type=event_type,
            payload=payload,
            http_status=http_status,
            error_message=error_message,
        )
        db.add(log_entry)
        await db.commit()


# ──────────────────────────────────────────────────────────────────────────────


def create_access_token(*, user_id: int, role: Role) -> str:
    now = datetime.now(timezone.utc)
    exp = now + timedelta(minutes=settings.jwt_expires_minutes)
    payload = {"sub": str(user_id), "role": role.value, "iat": int(now.timestamp()), "exp": exp}
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")


def create_partial_token(*, user_id: int) -> str:
    """Short-lived token issued after password check when 2FA is required."""
    now = datetime.now(timezone.utc)
    exp = now + timedelta(seconds=120)
    payload = {"sub": str(user_id), "partial": True, "iat": int(now.timestamp()), "exp": exp}
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")


async def get_db() -> AsyncSession:
    async with SessionLocal() as session:
        yield session


class CurrentUser(BaseModel):
    id: int
    role: Role
    email: EmailStr


from fastapi import Header


def _hash_api_key(key: str) -> str:
    return hashlib.sha256(key.encode()).hexdigest()


async def get_current_user(db: AsyncSession = Depends(get_db), Authorization: Optional[str] = Header(default=None)) -> CurrentUser:
    if not Authorization or not Authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")
    token = Authorization.split(" ", 1)[1].strip()

    # API key path: tokens start with "hc_live_"
    if token.startswith("hc_live_"):
        key_hash = _hash_api_key(token)
        res = await db.execute(
            select(ApiKey).where(
                ApiKey.key_hash == key_hash,
                ApiKey.is_active.is_(True),
            )
        )
        api_key = res.scalar_one_or_none()
        if not api_key:
            raise HTTPException(status_code=401, detail="Invalid API key")
        if api_key.expires_at and api_key.expires_at < datetime.now(timezone.utc):
            raise HTTPException(status_code=401, detail="API key expired")
        # Update last_used_at (fire-and-forget style)
        api_key.last_used_at = datetime.now(timezone.utc)
        await db.commit()
        # Load user
        user_res = await db.execute(select(User).where(User.id == api_key.user_id))
        user = user_res.scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return CurrentUser(id=user.id, role=user.role, email=user.email)

    # JWT path
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
        user_id = int(payload.get("sub"))
        role = Role(payload.get("role"))
        # Reject partial tokens (2FA pending)
        if payload.get("partial"):
            raise HTTPException(status_code=401, detail="2FA verification required")
    except (JWTError, ValueError, TypeError):
        raise HTTPException(status_code=401, detail="Invalid token")

    res = await db.execute(select(User).where(User.id == user_id))
    user = res.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return CurrentUser(id=user.id, role=user.role, email=user.email)


def require_role(*allowed: Role):
    async def _guard(u: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if u.role not in allowed:
            raise HTTPException(status_code=403, detail="Forbidden")
        return u
    return _guard


async def require_paid_plan(
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Attendance/check-in features require Pro or Enterprise plan. Superadmins bypass."""
    if me.role == Role.superadmin:
        return me
    res = await db.execute(
        select(Subscription)
        .where(Subscription.user_id == me.id, Subscription.is_active == True)
        .order_by(Subscription.expires_at.desc())
        .limit(1)
    )
    sub = res.scalar_one_or_none()
    if not sub or sub.plan_id not in ("pro", "growth", "enterprise"):
        raise HTTPException(
            status_code=403,
            detail="Bu özellik sadece Pro, Growth ve Enterprise planlarında kullanılabilir.",
        )
    now = datetime.now(timezone.utc)
    if sub.expires_at and sub.expires_at < now:
        raise HTTPException(
            status_code=403,
            detail="Aboneliğiniz sona ermiş. Lütfen planınızı yenileyin.",
        )
    return me


async def require_email_system_access(
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Email system features (bulk mail, templates, etc) require Growth or Enterprise plan. Superadmins bypass."""
    if me.role == Role.superadmin:
        return me
    res = await db.execute(
        select(Subscription)
        .where(Subscription.user_id == me.id, Subscription.is_active == True)
        .order_by(Subscription.expires_at.desc())
        .limit(1)
    )
    sub = res.scalar_one_or_none()
    if not sub or sub.plan_id not in ("growth", "enterprise"):
        raise HTTPException(
            status_code=403,
            detail="Oto-mail sistemi Growth ve Enterprise planlarında kullanılabilir.",
        )
    now = datetime.now(timezone.utc)
    if sub.expires_at and sub.expires_at < now:
        raise HTTPException(
            status_code=403,
            detail="Aboneliğiniz sona ermiş. Lütfen planınızı yenileyin.",
        )
    return me


def ensure_dirs():
    base = Path(settings.local_storage_dir)
    (base / "templates").mkdir(parents=True, exist_ok=True)
    (base / "pdfs").mkdir(parents=True, exist_ok=True)


def local_path_from_url(url_or_path: str) -> Path:
    """Convert a stored URL or relative path → absolute local filesystem path."""
    if url_or_path.startswith(("http://", "https://")):
        # Extract relative part after /api/files/
        marker = "/api/files/"
        idx = url_or_path.find(marker)
        if idx != -1:
            rel = url_or_path[idx + len(marker):]
            return Path(settings.local_storage_dir) / rel
        # fallback: use everything after last /
        return Path(settings.local_storage_dir) / url_or_path.rsplit("/", 1)[-1]
    p = Path(url_or_path)
    if p.is_absolute():
        return p
    return Path(settings.local_storage_dir) / p


def build_public_pdf_url(rel_path: str) -> str:
    return f"{settings.public_base_url}/api/files/{rel_path}"


app = FastAPI(title="HeptaCert API", version="2.0.0")

# Rate limiter
limiter = Limiter(key_func=get_remote_address, default_limits=["200/minute"])
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

origins = [o.strip() for o in settings.cors_origins.split(",")] if settings.cors_origins else ["*"]
# When wildcard, allow_credentials must be False (browser blocks credentials+wildcard per CORS spec).
# JWT auth uses Authorization header — no cookies — so credentials=False is fine.
if origins == ["*"]:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


# ── Audit log middleware ──────────────────────────────────────────────────────
_AUDIT_SKIP_PREFIXES = (
    "/api/auth/", "/api/billing/webhook/", "/api/files/",
    "/api/verify/", "/api/pricing/", "/api/stats", "/api/billing/status",
    "/api/waitlist",
    "/docs", "/openapi", "/redoc",
)

@app.middleware("http")
async def audit_middleware(request: Request, call_next):
    response = await call_next(request)
    method = request.method
    path = request.url.path

    if method in ("POST", "PATCH", "PUT", "DELETE") and not any(
        path.startswith(p) for p in _AUDIT_SKIP_PREFIXES
    ):
        # Extract user from JWT without raising
        user_id: Optional[int] = None
        auth = request.headers.get("Authorization", "")
        if auth.lower().startswith("bearer "):
            token = auth.split(" ", 1)[1]
            try:
                if not token.startswith("hc_live_"):
                    payload = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
                    user_id = int(payload.get("sub", 0)) or None
            except Exception:
                pass

        # Determine resource type/id from path
        parts = [p for p in path.split("/") if p]
        resource_type: Optional[str] = None
        resource_id: Optional[str] = None
        if len(parts) >= 3:
            resource_type = parts[2]  # e.g. "events", "certificates"
        if len(parts) >= 4:
            resource_id = parts[3]

        ip = request.headers.get("X-Forwarded-For", request.client.host if request.client else None)
        if ip and "," in ip:
            ip = ip.split(",")[0].strip()

        async with SessionLocal() as db:
            db.add(AuditLog(
                user_id=user_id,
                action=f"{method} {path}",
                resource_type=resource_type,
                resource_id=resource_id,
                ip_address=ip,
                user_agent=request.headers.get("User-Agent", "")[:512],
                extra={"status_code": response.status_code},
            ))
            await db.commit()

    return response


@app.on_event("startup")
async def startup():
    ensure_dirs()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with SessionLocal() as db:
        res = await db.execute(select(User).where(User.email == str(settings.bootstrap_superadmin_email)))
        exists = res.scalar_one_or_none()
        if not exists:
            u = User(
                email=str(settings.bootstrap_superadmin_email),
                password_hash=hash_password(settings.bootstrap_superadmin_password),
                role=Role.superadmin,
                heptacoin_balance=0,
                is_verified=True,
            )
            db.add(u)
            await db.commit()

    # Fix any stored URLs that still reference old ports/hosts
    # (e.g. localhost:8000 from before port change to 8765)
    old_prefixes = ["http://localhost:8000", "http://localhost:3000"]
    new_base = settings.public_base_url  # e.g. http://localhost:8765
    async with SessionLocal() as db:
        from sqlalchemy import text as sa_text
        for old in old_prefixes:
            if old != new_base:
                await db.execute(sa_text(
                    "UPDATE events SET template_image_url = replace(template_image_url, :old, :new) "
                    "WHERE template_image_url LIKE :pattern"
                ), {"old": old, "new": new_base, "pattern": f"{old}%"})
                await db.execute(sa_text(
                    "UPDATE certificates SET pdf_url = replace(pdf_url, :old, :new) "
                    "WHERE pdf_url LIKE :pattern"
                ), {"old": old, "new": new_base, "pattern": f"{old}%"})
        await db.commit()
        logger.info("Startup URL migration complete.")

    # Seed default certificate templates
    async with SessionLocal() as db:
        cert_temp_count = await db.execute(select(func.count(CertificateTemplate.id)))
        if cert_temp_count.scalar() == 0:
            templates = [
                CertificateTemplate(
                    name="Minimalist",
                    template_image_url=f"{settings.public_base_url}/api/files/cert-templates/minimalist.svg",
                    config={
                        "isim_x": 300, "isim_y": 400,
                        "font_size": 48, "font_color": "#333333",
                        "name_text_align": "center", "name_font_weight": "bold",
                        "qr_x": 50, "qr_y": 650, "qr_size": 200,
                        "cert_id_x": 50, "cert_id_y": 50, "cert_id_font_size": 18,
                        "show_hologram": False,
                    },
                    is_default=True,
                    order_index=0,
                ),
                CertificateTemplate(
                    name="Profesyonel",
                    template_image_url=f"{settings.public_base_url}/api/files/cert-templates/professional.svg",
                    config={
                        "isim_x": 400, "isim_y": 380,
                        "font_size": 56, "font_color": "#1a4d99",
                        "name_text_align": "center", "name_font_weight": "bold", "name_font_style": "italic",
                        "qr_x": 80, "qr_y": 680, "qr_size": 220,
                        "cert_id_x": 80, "cert_id_y": 80, "cert_id_font_size": 20,
                        "show_hologram": True,
                    },
                    is_default=True,
                    order_index=1,
                ),
                CertificateTemplate(
                    name="Renkli",
                    template_image_url=f"{settings.public_base_url}/api/files/cert-templates/colorful.svg",
                    config={
                        "isim_x": 350, "isim_y": 420,
                        "font_size": 52, "font_color": "#ff6b6b",
                        "name_text_align": "center", "name_font_weight": "bold",
                        "qr_x": 100, "qr_y": 700, "qr_size": 200,
                        "cert_id_x": 60, "cert_id_y": 60, "cert_id_font_size": 22,
                        "show_hologram": True,
                    },
                    is_default=True,
                    order_index=2,
                ),
                CertificateTemplate(
                    name="Kurumsal",
                    template_image_url=f"{settings.public_base_url}/api/files/cert-templates/corporate.svg",
                    config={
                        "isim_x": 450, "isim_y": 400,
                        "font_size": 48, "font_color": "#2c3e50",
                        "name_text_align": "center", "name_font_weight": "normal",
                        "qr_x": 50, "qr_y": 680, "qr_size": 180,
                        "cert_id_x": 50, "cert_id_y": 50, "cert_id_font_size": 20,
                        "show_hologram": True,
                    },
                    is_default=True,
                    order_index=3,
                ),
                CertificateTemplate(
                    name="Modern",
                    template_image_url=f"{settings.public_base_url}/api/files/cert-templates/modern.svg",
                    config={
                        "isim_x": 400, "isim_y": 380,
                        "font_size": 54, "font_color": "#6366f1",
                        "name_text_align": "center", "name_font_weight": "bold",
                        "qr_x": 120, "qr_y": 700, "qr_size": 200,
                        "cert_id_x": 70, "cert_id_y": 70, "cert_id_font_size": 19,
                        "show_hologram": False,
                    },
                    is_default=True,
                    order_index=4,
                ),
                CertificateTemplate(
                    name="Elegant",
                    template_image_url=f"{settings.public_base_url}/api/files/cert-templates/elegant.svg",
                    config={
                        "isim_x": 425, "isim_y": 400,
                        "font_size": 50, "font_color": "#8b7355",
                        "name_text_align": "center", "name_font_weight": "bold", "name_font_style": "italic",
                        "qr_x": 75, "qr_y": 710, "qr_size": 190,
                        "cert_id_x": 60, "cert_id_y": 60, "cert_id_font_size": 21,
                        "show_hologram": True,
                    },
                    is_default=True,
                    order_index=5,
                ),
                CertificateTemplate(
                    name="Akademik",
                    template_image_url=f"{settings.public_base_url}/api/files/cert-templates/academic.svg",
                    config={
                        "isim_x": 400, "isim_y": 420,
                        "font_size": 56, "font_color": "#003d5c",
                        "name_text_align": "center", "name_font_weight": "bold",
                        "qr_x": 60, "qr_y": 700, "qr_size": 210,
                        "cert_id_x": 80, "cert_id_y": 80, "cert_id_font_size": 22,
                        "show_hologram": True,
                    },
                    is_default=True,
                    order_index=6,
                ),
            ]
            for tmpl in templates:
                db.add(tmpl)
            await db.commit()
            logger.info("Seeded %d default certificate templates", len(templates))

    # Seed default email templates
    async with SessionLocal() as db:
        email_temp_count = await db.execute(
            select(func.count(EmailTemplate.id)).where(EmailTemplate.template_type == "system")
        )
        if email_temp_count.scalar() == 0:
            # Get a superadmin to assign as creator (use first superadmin or create one)
            superadmin_res = await db.execute(
                select(User).where(User.role == Role.superadmin).limit(1)
            )
            superadmin = superadmin_res.scalar_one_or_none()
            if superadmin:
                email_templates = [
                    EmailTemplate(
                        event_id=None,
                        created_by=superadmin.id,
                        name="Sertifika Teslim - TR",
                        subject_tr="🎉 Sertifikanız Hazır! | {{event_name}}",
                        subject_en="🎉 Your Certificate is Ready! | {{event_name}}",
                        body_html="""
<h2>Merhaba {{recipient_name}},</h2>
<p>Tebrikler! {{event_name}} etkinliğine katılım için sertifikanız hazır.</p>

<div style="margin: 20px 0; padding: 15px; background: #f0f9ff; border-radius: 5px;">
    <p><a href="{{certificate_link}}" style="display: inline-block; padding: 10px 20px; background: #3b82f6; color: white; text-decoration: none; border-radius: 5px;">Sertifikayı İndir</a></p>
</div>

<p><strong>QR Kod ile Doğrulama:</strong></p>
<p>Sertifikanız QR kodu tarafından korunmaktadır ve resmi olarak doğrulanabilir.</p>

<br>
<p>Sorularınız için <a href="mailto:support@heptacert.com">destek@heptacert.com</a> adresine yazabilirsiniz.</p>

<p>Saygılarımızla,<br>HeptaCert Ekibi</p>
                        """,
                        template_type="system",
                        is_default=True,
                    ),
                    EmailTemplate(
                        event_id=None,
                        created_by=superadmin.id,
                        name="Kayıt Onayı - TR",
                        subject_tr="✅ Kaydınız Başarıyla Alındı | {{event_name}}",
                        subject_en="✅ Your Registration is Confirmed | {{event_name}}",
                        body_html="""
<h2>Merhaba {{recipient_name}},</h2>
<p>{{event_name}} etkinliğine kaydınız başarıyla tamamlanmıştır.</p>

<p><strong>Etkinlik Detayları:</strong></p>
<ul>
    <li><strong>Tarih:</strong> {{event_date}}</li>
    <li><strong>Yer:</strong> {{event_location}}</li>
</ul>

<p>Etkinlik hakkında daha fazla bilgi için lütfen <a href="{{event_link}}">buraya tıklayın</a>.</p>

<br>
<p>Sorularınız için <a href="mailto:support@heptacert.com">destek@heptacert.com</a> adresine yazabilirsiniz.</p>

<p>Saygılarımızla,<br>HeptaCert Ekibi</p>
                        """,
                        template_type="system",
                        is_default=True,
                    ),
                ]
                for tmpl in email_templates:
                    db.add(tmpl)
                await db.commit()
                logger.info("Seeded %d default email templates", len(email_templates))

    # Start background scheduler for expiring cert notifications
    try:
        from apscheduler.schedulers.asyncio import AsyncIOScheduler
        scheduler = AsyncIOScheduler(timezone="UTC")

        async def _notify_expiring_certs():
            """Email admins about certs expiring in 7 days or 1 day."""
            now = datetime.now(timezone.utc)
            thresholds = [now + timedelta(days=7), now + timedelta(days=1)]
            async with SessionLocal() as db:
                for threshold in thresholds:
                    window_start = threshold - timedelta(hours=1)
                    window_end   = threshold + timedelta(hours=1)
                    res = await db.execute(
                        select(Certificate, Event, User)
                        .join(Event, Certificate.event_id == Event.id)
                        .join(User, Event.admin_id == User.id)
                        .where(
                            Certificate.status == CertStatus.active,
                            Certificate.deleted_at.is_(None),
                            Certificate.hosting_ends_at >= window_start,
                            Certificate.hosting_ends_at <= window_end,
                        )
                    )
                    rows = res.all()
                    # Group by admin
                    by_admin: Dict[int, list] = {}
                    for cert, ev, admin in rows:
                        by_admin.setdefault(admin.id, {"email": admin.email, "certs": []})
                        by_admin[admin.id]["certs"].append({
                            "name": cert.student_name,
                            "event": ev.name,
                            "ends": cert.hosting_ends_at.strftime("%d.%m.%Y"),
                        })
                    for _, data in by_admin.items():
                        days_left = int((threshold - now).total_seconds() / 86400)
                        rows_html = "".join(
                            f"<tr><td>{c['name']}</td><td>{c['event']}</td><td>{c['ends']}</td></tr>"
                            for c in data["certs"]
                        )
                        html = f"""
                        <h2>⚠️ Barındırma Süresi Doluyor — {days_left} Gün</h2>
                        <p>Aşağıdaki sertifikaların barındırma süresi yakında dolacak. Yenilemek için panele giriş yapın.</p>
                        <table border="1" cellpadding="6" style="border-collapse:collapse">
                        <tr><th>Katılımcı</th><th>Etkinlik</th><th>Bitiş Tarihi</th></tr>
                        {rows_html}
                        </table>
                        <p><a href="{settings.frontend_base_url}/admin/events">Panele Git →</a></p>
                        """
                        await send_email_async(
                            data["email"],
                            f"⚠️ HeptaCert: {len(data['certs'])} sertifikanın barındırma süresi {days_left} günde doluyor",
                            html,
                        )

        async def _monthly_hc_renewal():
            """Credit monthly HC quota to all active paid subscribers."""
            now_r = datetime.now(timezone.utc)
            cutoff = now_r - timedelta(days=30)
            async with SessionLocal() as db_r:
                res_subs = await db_r.execute(
                    select(Subscription).where(
                        Subscription.is_active == True,
                        Subscription.plan_id.in_(["pro", "growth", "enterprise"]),
                        Subscription.expires_at > now_r,
                    )
                )
                subs_list = res_subs.scalars().all()
                for sub_r2 in subs_list:
                    if sub_r2.last_hc_credited_at and sub_r2.last_hc_credited_at > cutoff:
                        continue
                    quota = _get_hc_quota(sub_r2.plan_id)
                    if not quota:
                        continue
                    usr_res = await db_r.execute(select(User).where(User.id == sub_r2.user_id))
                    usr = usr_res.scalar_one_or_none()
                    if not usr:
                        continue
                    usr.heptacoin_balance += quota
                    db_r.add(Transaction(
                        user_id=usr.id, amount=quota, type=TxType.credit,
                        description=f"Aylık HC yenileme: {sub_r2.plan_id}",
                    ))
                    sub_r2.last_hc_credited_at = now_r
                    logger.info("Monthly HC renewal: user %s +%d HC (%s)", usr.email, quota, sub_r2.plan_id)
                await db_r.commit()

        async def _process_bulk_emails():
            """Process pending bulk email jobs every 5 minutes."""
            from jinja2 import Template
            
            async with SessionLocal() as db_bulk:
                # Get all pending jobs
                res_jobs = await db_bulk.execute(
                    select(BulkEmailJob).where(
                        BulkEmailJob.status.in_(["pending", "sending"])
                    ).limit(10)
                )
                jobs = res_jobs.scalars().all()
                
                for job in jobs:
                    try:
                        # Update job status to sending
                        job.status = "sending"
                        job.started_at = datetime.now(timezone.utc)
                        db_bulk.add(job)
                        await db_bulk.commit()
                        
                        # Get event and template
                        ev_res = await db_bulk.execute(
                            select(Event).where(Event.id == job.event_id)
                        )
                        event = ev_res.scalar_one_or_none()
                        if not event:
                            job.status = "failed"
                            job.error_message = "Event not found"
                            db_bulk.add(job)
                            await db_bulk.commit()
                            continue
                        
                        t_res = await db_bulk.execute(
                            select(EmailTemplate).where(EmailTemplate.id == job.email_template_id)
                        )
                        template = t_res.scalar_one_or_none()
                        if not template:
                            job.status = "failed"
                            job.error_message = "Email template not found"
                            db_bulk.add(job)
                            await db_bulk.commit()
                            continue
                        
                        # Get recipients (attendees or certificate holders)
                        # For now, assume "attendees" -- could parse from job metadata
                        att_res = await db_bulk.execute(
                            select(Attendee).where(Attendee.event_id == job.event_id)
                        )
                        attendees = att_res.scalars().all()
                        
                        if not attendees:
                            job.status = "completed"
                            job.sent_count = 0
                            db_bulk.add(job)
                            await db_bulk.commit()
                            continue
                        
                        # Process in batches for rate limiting
                        batch_size = 50
                        sent = 0
                        failed = 0
                        
                        for i in range(0, len(attendees), batch_size):
                            batch = attendees[i:i+batch_size]
                            
                            for attendee in batch:
                                try:
                                    # Render template with variables
                                    template_vars = {
                                        "recipient_name": attendee.name,
                                        "recipient_email": attendee.email,
                                        "event_name": event.name,
                                        "event_date": event.event_date.isoformat() if event.event_date else "TBD",
                                        "event_location": event.event_location or "Online",
                                        "certificate_link": f"{settings.public_base_url}/verify",
                                        "event_link": f"{settings.public_base_url}/events/{event.id}/register",
                                    }
                                    
                                    # Render subject and body
                                    subj = Template(template.subject_tr).render(**template_vars)
                                    body = Template(template.body_html).render(**template_vars)
                                    
                                    # Send mail
                                    await send_email_async(
                                        to=attendee.email,
                                        subject=subj,
                                        html_body=body,
                                    )
                                    
                                    # Log delivery
                                    delivery_log = EmailDeliveryLog(
                                        bulk_job_id=job.id,
                                        attendee_id=attendee.id,
                                        recipient_email=attendee.email,
                                        status="sent",
                                    )
                                    db_bulk.add(delivery_log)
                                    await db_bulk.commit()
                                    
                                    # Trigger webhook
                                    await trigger_webhooks(
                                        user_id=event.admin_id,
                                        event_type="email.sent",
                                        payload={
                                            "event_id": event.id,
                                            "recipient_email": attendee.email,
                                            "recipient_name": attendee.name,
                                            "sent_at": datetime.now(timezone.utc).isoformat(),
                                        },
                                    )
                                    
                                    sent += 1
                                except Exception as e:
                                    # Log failed delivery
                                    delivery_log = EmailDeliveryLog(
                                        bulk_job_id=job.id,
                                        attendee_id=attendee.id,
                                        recipient_email=attendee.email,
                                        status="failed",
                                        reason=str(e),
                                    )
                                    db_bulk.add(delivery_log)
                                    await db_bulk.commit()
                                    
                                    # Trigger failure webhook
                                    await trigger_webhooks(
                                        user_id=event.admin_id,
                                        event_type="email.failed",
                                        payload={
                                            "event_id": event.id,
                                            "recipient_email": attendee.email,
                                            "recipient_name": attendee.name,
                                            "reason": str(e),
                                            "failed_at": datetime.now(timezone.utc).isoformat(),
                                        },
                                    )
                                    
                                    failed += 1
                                    logger.error("Failed to send email to %s: %s", attendee.email, e)
                            
                            # Update job progress
                            job.sent_count = sent
                            job.failed_count = failed
                            db_bulk.add(job)
                            await db_bulk.commit()
                            
                            # Rate limiting - wait between batches
                            if i + batch_size < len(attendees):
                                import asyncio
                                await asyncio.sleep(5)
                        
                        # Mark job as completed
                        job.status = "completed"
                        job.completed_at = datetime.now(timezone.utc)
                        job.sent_count = sent
                        job.failed_count = failed
                        db_bulk.add(job)
                        await db_bulk.commit()
                        logger.info("Bulk email job %d completed: %d sent, %d failed", job.id, sent, failed)
                        
                    except Exception as e:
                        logger.error("Bulk email job %d failed: %s", job.id, e)
                        job.status = "failed"
                        job.error_message = str(e)
                        job.completed_at = datetime.now(timezone.utc)
                        db_bulk.add(job)
                        await db_bulk.commit()

        scheduler.add_job(_notify_expiring_certs, "cron", hour=2, minute=0)
        scheduler.add_job(_monthly_hc_renewal, "cron", hour=3, minute=30)
        scheduler.add_job(_process_bulk_emails, "interval", minutes=5)  # Every 5 minutes
        scheduler.start()
        logger.info("APScheduler started — cert notifications + monthly HC renewal + bulk email processing")
    except Exception as e:
        logger.warning("APScheduler init failed (non-fatal): %s", e)


def _get_hc_quota(plan_id: str) -> Optional[int]:
    """Return the monthly HC quota for a plan from DEFAULT_PRICING."""
    tier = next((t for t in DEFAULT_PRICING if t.get("id") == plan_id), None)
    return tier.get("hc_quota") if tier else None


def bad_request(msg: str) -> HTTPException:
    return HTTPException(status_code=400, detail=msg)


@app.get("/api/health")
async def health_check():
    return {"status": "ok"}


def editor_config_to_template_config(raw: dict) -> "TemplateConfig":
    """Translate nested EditorConfig or flat legacy format → TemplateConfig."""
    if "name" in raw and isinstance(raw.get("name"), dict):
        name    = raw["name"]
        cert_id = raw.get("cert_id") or {}
        qr      = raw.get("qr") or {}
        return TemplateConfig(
            # Name
            isim_x=int(name.get("x", 620)),
            isim_y=int(name.get("y", 438)),
            font_size=int(name.get("font_size", 48)),
            font_color=str(name.get("font_color", "#FFFFFF")),
            name_text_align=str(name.get("text_align", "center")),
            name_font_weight=str(name.get("font_weight", "normal")),
            name_font_style=str(name.get("font_style", "normal")),
            # QR
            qr_x=int(qr.get("x", 80)),
            qr_y=int(qr.get("y", 700)),
            qr_size=int(qr.get("size", 260)),
            show_qr=bool(qr.get("show", True)),
            # Certificate ID
            cert_id_x=int(cert_id.get("x", 60)),
            cert_id_y=int(cert_id.get("y", 60)),
            cert_id_font_size=int(cert_id.get("font_size", 22)),
            cert_id_color=str(cert_id.get("font_color", "#334155")),
            cert_id_text_align=str(cert_id.get("text_align", "left")),
            cert_id_font_weight=str(cert_id.get("font_weight", "normal")),
            cert_id_font_style=str(cert_id.get("font_style", "normal")),
            show_cert_id=bool(cert_id.get("show", True)),
            # Hologram
            show_hologram=bool(raw.get("show_hologram", True)),
        )
    else:
        # Legacy flat-field format
        return TemplateConfig(
            isim_x=int(raw.get("isim_x", 620)),
            isim_y=int(raw.get("isim_y", 438)),
            font_size=int(raw.get("font_size", 48)),
            font_color=str(raw.get("font_color", "#FFFFFF")),
            name_text_align=str(raw.get("name_text_align", "center")),
            name_font_weight=str(raw.get("name_font_weight", "normal")),
            name_font_style=str(raw.get("name_font_style", "normal")),
            qr_x=int(raw.get("qr_x", 80)),
            qr_y=int(raw.get("qr_y", 700)),
            qr_size=int(raw.get("qr_size", 260)),
            show_qr=bool(raw.get("show_qr", True)),
            cert_id_x=int(raw.get("cert_id_x", 60)),
            cert_id_y=int(raw.get("cert_id_y", 60)),
            cert_id_font_size=int(raw.get("cert_id_font_size", 22)),
            cert_id_color=str(raw.get("cert_id_color", "#334155")),
            cert_id_text_align=str(raw.get("cert_id_text_align", "left")),
            cert_id_font_weight=str(raw.get("cert_id_font_weight", "normal")),
            cert_id_font_style=str(raw.get("cert_id_font_style", "normal")),
            show_cert_id=bool(raw.get("show_cert_id", True)),
            show_hologram=bool(raw.get("show_hologram", True)),
        )


@app.post("/api/auth/login")
@limiter.limit("5/minute")
async def login(request: Request, data: LoginIn, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(User).where(User.email == str(data.email)))
    user = res.scalar_one_or_none()
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Geçersiz e-posta veya şifre.")
    if not user.is_verified:
        raise HTTPException(status_code=403, detail="E-posta adresinizi doğrulamanız gerekiyor. Lütfen gelen kutunuzu kontrol edin.")

    # Check if 2FA is enabled for this user
    totp_res = await db.execute(select(TotpSecret).where(TotpSecret.user_id == user.id, TotpSecret.enabled.is_(True)))
    totp = totp_res.scalar_one_or_none()
    if totp:
        partial = create_partial_token(user_id=user.id)
        return LoginWith2FAOut(requires_2fa=True, partial_token=partial)

    return LoginWith2FAOut(
        requires_2fa=False,
        access_token=create_access_token(user_id=user.id, role=user.role),
    )


@app.post("/api/auth/register", status_code=201)
@limiter.limit("3/minute")
async def register(request: Request, data: RegisterIn, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(User).where(User.email == str(data.email)))
    if res.scalar_one_or_none():
        raise bad_request("Bu e-posta adresi zaten kayıtlı.")

    token = make_email_token({"email": str(data.email), "action": "verify"})
    user = User(
        email=str(data.email),
        password_hash=hash_password(data.password),
        role=Role.admin,
        heptacoin_balance=100,  # 100 HC hoş geldin hediyesi
        is_verified=False,
        verification_token=token,
    )
    db.add(user)
    await db.commit()

    verify_link = f"{settings.frontend_base_url}/verify-email?token={token}"
    await send_email_async(
        to=str(data.email),
        subject="HeptaCert — E-posta Adresinizi Doğrulayın",
        html_body=f"""
        <p>Merhaba,</p>
        <p>HeptaCert'e hoş geldiniz! Hesabınızı aktif etmek için aşağıdaki bağlantıya tıklayın:</p>
        <p><a href="{verify_link}">{verify_link}</a></p>
        <p>Bu bağlantı 24 saat geçerlidir.</p>
        """,
    )
    return {"detail": "Kayıt başarılı. Aktivasyon e-postası gönderildi."}


@app.get("/api/auth/verify-email")
async def verify_email_endpoint(token: str = Query(...), db: AsyncSession = Depends(get_db)):
    try:
        payload = verify_email_token(token, max_age=86400)
    except SignatureExpired:
        raise bad_request("Doğrulama bağlantısının süresi dolmuş. Lütfen yeniden kayıt olun.")
    except (BadSignature, Exception):
        raise bad_request("Geçersiz doğrulama bağlantısı.")

    if payload.get("action") != "verify":
        raise bad_request("Geçersiz token türü.")

    email = payload.get("email")
    res = await db.execute(select(User).where(User.email == email))
    user = res.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı.")
    if user.is_verified:
        return {"detail": "Hesabınız zaten doğrulanmış."}

    user.is_verified = True
    user.verification_token = None
    await db.commit()
    return {"detail": "E-posta başarıyla doğrulandı. Giriş yapabilirsiniz."}


@app.post("/api/auth/forgot-password")
@limiter.limit("3/minute")
async def forgot_password(request: Request, data: ForgotPasswordIn, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(User).where(User.email == str(data.email)))
    user = res.scalar_one_or_none()
    # Always return 200 to avoid email enumeration
    if user and user.is_verified:
        token = make_email_token({"email": str(data.email), "action": "reset"})
        user.password_reset_token = token
        await db.commit()

        reset_link = f"{settings.frontend_base_url}/reset-password?token={token}"
        await send_email_async(
            to=str(data.email),
            subject="HeptaCert — Şifre Sıfırlama",
            html_body=f"""
            <p>Şifrenizi sıfırlamak için aşağıdaki bağlantıya tıklayın:</p>
            <p><a href="{reset_link}">{reset_link}</a></p>
            <p>Bu bağlantı 1 saat geçerlidir.</p>
            """,
        )
    return {"detail": "Şifre sıfırlama talimatları e-posta adresinize gönderildi."}


@app.post("/api/auth/reset-password")
@limiter.limit("5/minute")
async def reset_password(request: Request, data: ResetPasswordIn, db: AsyncSession = Depends(get_db)):
    try:
        payload = verify_email_token(data.token, max_age=3600)
    except SignatureExpired:
        raise bad_request("Şifre sıfırlama bağlantısının süresi dolmuş.")
    except (BadSignature, Exception):
        raise bad_request("Geçersiz sıfırlama bağlantısı.")

    if payload.get("action") != "reset":
        raise bad_request("Geçersiz token türü.")

    email = payload.get("email")
    res = await db.execute(select(User).where(User.email == email))
    user = res.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı.")

    # Validate that the token matches the one stored in DB (prevents replay attacks)
    if not user.password_reset_token or user.password_reset_token != data.token:
        raise bad_request("Bu sıfırlama bağlantısı zaten kullanılmış.")

    user.password_hash = hash_password(data.new_password)
    user.password_reset_token = None
    await db.commit()
    return {"detail": "Şifreniz başarıyla güncellendi."}


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


# ── Admin: Email Templates ────────────────────────────────────────────────────

@app.get(
    "/api/admin/events/{event_id}/email-templates",
    response_model=list[EmailTemplateOut],
    dependencies=[Depends(require_role(Role.admin, Role.superadmin)), Depends(require_email_system_access)],
)
async def list_event_email_templates(
    event_id: int,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all email templates for an event."""
    # Verify ownership
    ev_res = await db.execute(
        select(Event).where(Event.id == event_id, Event.admin_id == me.id)
    )
    if not ev_res.scalar_one_or_none() and me.role != Role.superadmin:
        raise HTTPException(status_code=403, detail="Yetkisiz erişim")
    
    res = await db.execute(
        select(EmailTemplate)
        .where(EmailTemplate.event_id == event_id)
        .order_by(EmailTemplate.created_at.desc())
    )
    return res.scalars().all()


@app.post(
    "/api/admin/events/{event_id}/email-templates",
    response_model=EmailTemplateOut,
    status_code=201,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin)), Depends(require_email_system_access)],
)
async def create_event_email_template(
    event_id: int,
    payload: EmailTemplateIn,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new email template for an event."""
    # Verify ownership
    ev_res = await db.execute(
        select(Event).where(Event.id == event_id, Event.admin_id == me.id)
    )
    if not ev_res.scalar_one_or_none() and me.role != Role.superadmin:
        raise HTTPException(status_code=403, detail="Yetkisiz erişim")
    
    template = EmailTemplate(
        event_id=event_id,
        created_by=me.id,
        name=payload.name,
        subject_tr=payload.subject_tr,
        subject_en=payload.subject_en,
        body_html=payload.body_html,
        template_type="custom",
        is_default=False,
    )
    db.add(template)
    await db.commit()
    await db.refresh(template)
    return template


@app.patch(
    "/api/admin/events/{event_id}/email-templates/{template_id}",
    response_model=EmailTemplateOut,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin)), Depends(require_email_system_access)],
)
async def update_event_email_template(
    event_id: int,
    template_id: int,
    payload: EmailTemplateIn,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update an email template."""
    # Verify ownership
    ev_res = await db.execute(
        select(Event).where(Event.id == event_id, Event.admin_id == me.id)
    )
    if not ev_res.scalar_one_or_none() and me.role != Role.superadmin:
        raise HTTPException(status_code=403, detail="Yetkisiz erişim")
    
    t_res = await db.execute(
        select(EmailTemplate).where(EmailTemplate.id == template_id, EmailTemplate.event_id == event_id)
    )
    template = t_res.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Template bulunamadı")
    
    template.name = payload.name
    template.subject_tr = payload.subject_tr
    template.subject_en = payload.subject_en
    template.body_html = payload.body_html
    db.add(template)
    await db.commit()
    await db.refresh(template)
    return template


@app.delete(
    "/api/admin/events/{event_id}/email-templates/{template_id}",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin)), Depends(require_email_system_access)],
)
async def delete_event_email_template(
    event_id: int,
    template_id: int,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete an email template."""
    # Verify ownership
    ev_res = await db.execute(
        select(Event).where(Event.id == event_id, Event.admin_id == me.id)
    )
    if not ev_res.scalar_one_or_none() and me.role != Role.superadmin:
        raise HTTPException(status_code=403, detail="Yetkisiz erişim")
    
    t_res = await db.execute(
        select(EmailTemplate).where(EmailTemplate.id == template_id, EmailTemplate.event_id == event_id)
    )
    template = t_res.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Template bulunamadı")
    
    await db.delete(template)
    await db.commit()
    return {"message": "Template silindi"}


@app.post(
    "/api/admin/events/{event_id}/email-templates/{template_id}/preview",
    response_model=dict,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin)), Depends(require_email_system_access)],
)
async def preview_email_template(
    event_id: int,
    template_id: int,
    payload: dict,  # { language: "tr" | "en", sample_attendee: { name: str, email: str } }
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Preview an email template with sample data."""
    # Verify ownership
    ev_res = await db.execute(
        select(Event).where(Event.id == event_id, Event.admin_id == me.id)
    )
    if not ev_res.scalar_one_or_none() and me.role != Role.superadmin:
        raise HTTPException(status_code=403, detail="Yetkisiz erişim")
    
    # Get template
    t_res = await db.execute(
        select(EmailTemplate).where(EmailTemplate.id == template_id, EmailTemplate.event_id == event_id)
    )
    template = t_res.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Template bulunamadı")
    
    # Get event for details
    ev_res = await db.execute(select(Event).where(Event.id == event_id))
    event = ev_res.scalar_one_or_none()
    
    # Prepare sample data
    language = payload.get("language", "tr")
    sample_attendee = payload.get("sample_attendee", {"name": "Örnek Katılımcı", "email": "ornek@example.com"})
    
    # Simple template variable replacement
    variables = {
        f"{{{{{v}}}}}": sample_attendee[v] 
        for v in sample_attendee.keys()
        if hasattr(sample_attendee, '__getitem__') or isinstance(sample_attendee, dict)
    }
    variables = {
        "{{attendee_name}}": sample_attendee.get("name", "Katılımcı"),
        "{{attendee_email}}": sample_attendee.get("email", ""),
        "{{event_name}}": event.name if event else "Etkinlik",
        "{{event_date}}": event.date.isoformat() if (event and hasattr(event, 'date') and event.date) else "",
    }
    
    # Select subject and body based on language
    if language == "en" and hasattr(template, 'subject_en'):
        subject = template.subject_en
    else:
        subject = template.subject_tr
    
    body_html = template.body_html
    
    # Replace variables
    for var, value in variables.items():
        subject = subject.replace(var, str(value))
        body_html = body_html.replace(var, str(value))
    
    return {
        "subject": subject,
        "body_html": body_html,
        "language": language,
        "template_id": template_id,
        "event_id": event_id,
    }


@app.get(
    "/api/system/email-templates",
    response_model=list[EmailTemplateOut],
)
async def list_system_email_templates(db: AsyncSession = Depends(get_db)):
    """Get system default email templates."""
    res = await db.execute(
        select(EmailTemplate)
        .where(EmailTemplate.template_type == "system", EmailTemplate.is_default == True)
        .order_by(EmailTemplate.created_at.asc())
    )
    return res.scalars().all()


# ── Admin: Certificate Templates ────────────────────────────────────────────

@app.get(
    "/api/system/cert-templates",
    response_model=list[CertificateTemplateOut],
)
async def list_cert_templates(db: AsyncSession = Depends(get_db)):
    """Get all available certificate templates."""
    res = await db.execute(
        select(CertificateTemplate)
        .where(CertificateTemplate.is_default == True)
        .order_by(CertificateTemplate.order_index.asc())
    )
    return res.scalars().all()


@app.post(
    "/api/admin/events/{event_id}/apply-cert-template",
    response_model=EventOut,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin)), Depends(require_email_system_access)],
)
async def apply_cert_template(
    event_id: int,
    payload: dict,  # { cert_template_id: int }
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Apply a certificate template to an event."""
    # Verify ownership
    ev_res = await db.execute(
        select(Event).where(Event.id == event_id, Event.admin_id == me.id)
    )
    event = ev_res.scalar_one_or_none()
    if not event and me.role != Role.superadmin:
        raise HTTPException(status_code=403, detail="Yetkisiz erişim")
    
    cert_template_id = payload.get("cert_template_id")
    if not cert_template_id:
        raise HTTPException(status_code=400, detail="cert_template_id gerekli")
    
    # Get certificate template
    ct_res = await db.execute(
        select(CertificateTemplate).where(CertificateTemplate.id == cert_template_id)
    )
    cert_template = ct_res.scalar_one_or_none()
    if not cert_template:
        raise HTTPException(status_code=404, detail="Sertifika şablonu bulunamadı")
    
    # Update event with template image and config
    event.template_image_url = cert_template.template_image_url
    event.config = cert_template.config if cert_template.config else event.config
    db.add(event)
    await db.commit()
    await db.refresh(event)
    
    return EventOut.from_attributes(event) if hasattr(EventOut, 'from_attributes') else EventOut(**event.__dict__)


# ── Admin: Email Configuration (SMTP) ────────────────────────────────────────

@app.get(
    "/api/admin/email-config",
    response_model=UserEmailConfigOut,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def get_email_config(
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get current user's email configuration."""
    res = await db.execute(
        select(UserEmailConfig).where(UserEmailConfig.user_id == me.id)
    )
    config = res.scalar_one_or_none()
    if not config:
        raise HTTPException(status_code=404, detail="Email yapılandırması bulunamadı")
    return config


@app.patch(
    "/api/admin/email-config",
    response_model=UserEmailConfigOut,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def update_email_config(
    payload: EmailConfigUpdateIn,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update user's email configuration (including encrypted SMTP password)."""
    res = await db.execute(
        select(UserEmailConfig).where(UserEmailConfig.user_id == me.id)
    )
    config = res.scalar_one_or_none()
    if not config:
        raise HTTPException(status_code=404, detail="Email yapılandırması bulunamadı")
    
    # Update fields
    config.smtp_enabled = payload.smtp_enabled
    if payload.from_name is not None:
        config.from_name = payload.from_name
    if payload.reply_to is not None:
        config.reply_to = payload.reply_to
    if payload.auto_cc is not None:
        config.auto_cc = payload.auto_cc
    config.enable_tracking_pixel = payload.enable_tracking_pixel
    
    # TODO: Encrypt SMTP password before storing
    if payload.smtp_password:
        config.smtp_password = payload.smtp_password  # In real impl, encrypt this
    
    db.add(config)
    await db.commit()
    await db.refresh(config)
    return config


@app.post(
    "/api/admin/email-config/test-connection",
    response_model=EmailConfigTestResponse,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def test_smtp_connection(
    payload: EmailConfigTestRequest,
):
    """Test SMTP connection without storing credentials."""
    import smtplib
    from email.mime.text import MIMEText
    
    try:
        # Create SMTP connection
        with smtplib.SMTP(payload.smtp_host, payload.smtp_port, timeout=10) as server:
            server.starttls()
            server.login(payload.smtp_user, payload.smtp_password)
            
            # Try to send a test email
            msg = MIMEText("Test connection")
            msg['Subject'] = "HeptaCert SMTP Test"
            msg['From'] = payload.from_email
            server.send_message(msg, from_addr=payload.from_email, to_addrs=[payload.from_email])
        
        return EmailConfigTestResponse(
            status="success",
            message="SMTP bağlantısı başarılı",
            verified_at=datetime.utcnow()
        )
    except smtplib.SMTPAuthenticationError:
        return EmailConfigTestResponse(
            status="error",
            message="Kimlik doğrulama hatası: geçersiz kullanıcı adı veya şifre"
        )
    except smtplib.SMTPException as e:
        return EmailConfigTestResponse(
            status="error",
            message=f"SMTP hatası: {str(e)}"
        )
    except Exception as e:
        return EmailConfigTestResponse(
            status="error",
            message=f"Bağlantı hatası: {str(e)}"
        )


# ── Admin: Bulk Email ────────────────────────────────────────────────────────

@app.post(
    "/api/admin/events/{event_id}/bulk-email",
    response_model=BulkEmailJobOut,
    status_code=201,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin)), Depends(require_email_system_access)],
)
async def start_bulk_email(
    event_id: int,
    payload: BulkEmailJobIn,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Start a bulk email job."""
    # Verify ownership
    ev_res = await db.execute(
        select(Event).where(Event.id == event_id, Event.admin_id == me.id)
    )
    event = ev_res.scalar_one_or_none()
    if not event and me.role != Role.superadmin:
        raise HTTPException(status_code=403, detail="Yetkisiz erişim")
    
    # Verify template exists
    t_res = await db.execute(
        select(EmailTemplate).where(EmailTemplate.id == payload.email_template_id)
    )
    if not t_res.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Template bulunamadı")
    
    # Count recipients
    if payload.recipient_type == "attendees":
        count_res = await db.execute(
            select(func.count(Attendee.id)).where(Attendee.event_id == event_id)
        )
    else:  # certified
        count_res = await db.execute(
            select(func.count(Certificate.id)).where(
                Certificate.event_id == event_id,
                Certificate.deleted_at.is_(None),
            )
        )
    
    recipients_count = count_res.scalar() or 0
    if recipients_count == 0:
        raise HTTPException(status_code=400, detail="Alıcı bulunamadı")
    
    # Create job
    job = BulkEmailJob(
        event_id=event_id,
        created_by=me.id,
        email_template_id=payload.email_template_id,
        recipients_count=recipients_count,
        status="pending",
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)
    
    # TODO: Schedule async task to process this job (APScheduler)
    return job


@app.get(
    "/api/admin/events/{event_id}/bulk-email/{job_id}",
    response_model=BulkEmailJobOut,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin)), Depends(require_email_system_access)],
)
async def get_bulk_email_job(
    event_id: int,
    job_id: int,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get bulk email job details."""
    # Verify ownership
    ev_res = await db.execute(
        select(Event).where(Event.id == event_id, Event.admin_id == me.id)
    )
    if not ev_res.scalar_one_or_none() and me.role != Role.superadmin:
        raise HTTPException(status_code=403, detail="Yetkisiz erişim")
    
    j_res = await db.execute(
        select(BulkEmailJob).where(BulkEmailJob.id == job_id, BulkEmailJob.event_id == event_id)
    )
    job = j_res.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job bulunamadı")
    
    return job


@app.get(
    "/api/admin/events/{event_id}/bulk-emails",
    response_model=list[BulkEmailJobOut],
    dependencies=[Depends(require_role(Role.admin, Role.superadmin)), Depends(require_email_system_access)],
)
async def list_bulk_email_jobs(
    event_id: int,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all bulk email jobs for an event."""
    # Verify ownership
    ev_res = await db.execute(
        select(Event).where(Event.id == event_id, Event.admin_id == me.id)
    )
    if not ev_res.scalar_one_or_none() and me.role != Role.superadmin:
        raise HTTPException(status_code=403, detail="Yetkisiz erişim")
    
    res = await db.execute(
        select(BulkEmailJob)
        .where(BulkEmailJob.event_id == event_id)
        .order_by(BulkEmailJob.created_at.desc())
    )
    return res.scalars().all()


@app.post(
    "/api/admin/events/{event_id}/scheduled-email",
    response_model=dict,
    status_code=201,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin)), Depends(require_email_system_access)],
)
async def schedule_email_job(
    event_id: int,
    payload: ScheduledEmailIn,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Schedule an email job for future delivery.
    
    Three modes:
    - immediate: Send now
    - datetime: Send at specific datetime
    - cron: Send on schedule (e.g., "0 9 * * MON" = every Monday at 9 AM)
    """
    # Verify ownership
    ev_res = await db.execute(
        select(Event).where(Event.id == event_id, Event.admin_id == me.id)
    )
    event = ev_res.scalar_one_or_none()
    if not event and me.role != Role.superadmin:
        raise HTTPException(status_code=403, detail="Yetkisiz erişim")
    
    # Verify template exists
    t_res = await db.execute(
        select(EmailTemplate).where(EmailTemplate.id == payload.email_template_id)
    )
    if not t_res.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Template bulunamadı")
    
    # Count recipients
    if payload.recipient_type == "attendees":
        count_res = await db.execute(
            select(func.count(Attendee.id)).where(Attendee.event_id == event_id)
        )
    else:  # certified
        count_res = await db.execute(
            select(func.count(Certificate.id)).where(
                Certificate.event_id == event_id,
                Certificate.deleted_at.is_(None),
            )
        )
    
    recipients_count = count_res.scalar() or 0
    if recipients_count == 0:
        raise HTTPException(status_code=400, detail="Alıcı bulunamadı")
    
    # Create the bulk email job
    job = BulkEmailJob(
        event_id=event_id,
        created_by=me.id,
        email_template_id=payload.email_template_id,
        recipients_count=recipients_count,
        status="pending" if payload.schedule_type == "immediate" else "scheduled",
    )
    
    # Handle scheduling
    if payload.schedule_type == "immediate":
        job.status = "pending"  # Will be picked up by the 5-minute scheduler
    elif payload.schedule_type == "datetime":
        if not payload.scheduled_datetime:
            raise HTTPException(status_code=400, detail="scheduled_datetime gerekli")
        job.scheduled_at = payload.scheduled_datetime
        job.status = "scheduled"
    elif payload.schedule_type == "cron":
        if not payload.cron_expression:
            raise HTTPException(status_code=400, detail="cron_expression gerekli")
        # Validate cron expression (simple check)
        if not all(c in "0123456789 *,-/" for c in payload.cron_expression):
            raise HTTPException(status_code=400, detail="Geçersiz cron ifadesi")
        job.cron_expression = payload.cron_expression
        job.status = "scheduled"
    else:
        raise HTTPException(status_code=400, detail="schedule_type geçersiz")
    
    db.add(job)
    await db.commit()
    await db.refresh(job)
    
    return {
        "id": job.id,
        "event_id": job.event_id,
        "status": job.status,
        "recipients_count": job.recipients_count,
        "scheduled_at": job.scheduled_at.isoformat() if job.scheduled_at else None,
        "message": f"Email {payload.schedule_type} başarılı" if payload.schedule_type != "datetime" else f"Email {payload.scheduled_datetime} tarihinde gönderilmek üzere zamanlandı",
    }


@app.get(
    "/api/admin/events/{event_id}/scheduled-emails",
    response_model=list[dict],
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def list_scheduled_emails(
    event_id: int,
    status: Optional[str] = Query(None),  # Filter by status: scheduled, completed, failed, cancelled
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get scheduled email jobs for an event."""
    # Verify ownership
    ev_res = await db.execute(
        select(Event).where(Event.id == event_id, Event.admin_id == me.id)
    )
    if not ev_res.scalar_one_or_none() and me.role != Role.superadmin:
        raise HTTPException(status_code=403, detail="Yetkisiz erişim")
    
    q = select(BulkEmailJob).where(BulkEmailJob.event_id == event_id, BulkEmailJob.status != "pending")
    if status:
        q = q.where(BulkEmailJob.status == status)
    q = q.order_by(BulkEmailJob.created_at.desc())
    
    res = await db.execute(q)
    jobs = res.scalars().all()
    
    return [
        {
            "id": j.id,
            "email_template_id": j.email_template_id,
            "status": j.status,
            "recipients_count": j.recipients_count,
            "sent_count": j.sent_count,
            "failed_count": j.failed_count,
            "scheduled_at": j.scheduled_at.isoformat() if j.scheduled_at else None,
            "created_at": j.created_at.isoformat(),
            "completed_at": j.completed_at.isoformat() if j.completed_at else None,
        }
        for j in jobs
    ]


@app.post(
    "/api/admin/events/{event_id}/bulk-emails-cancel/{job_id}",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def cancel_email_job(
    event_id: int,
    job_id: int,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Cancel a scheduled or pending email job."""
    # Verify ownership
    ev_res = await db.execute(
        select(Event).where(Event.id == event_id, Event.admin_id == me.id)
    )
    if not ev_res.scalar_one_or_none() and me.role != Role.superadmin:
        raise HTTPException(status_code=403, detail="Yetkisiz erişim")
    
    j_res = await db.execute(
        select(BulkEmailJob).where(BulkEmailJob.id == job_id, BulkEmailJob.event_id == event_id)
    )
    job = j_res.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job bulunamadı")
    
    if job.status not in ["pending", "scheduled"]:
        raise HTTPException(status_code=400, detail="Sadece pending/scheduled joblar iptal edilebilir")
    
    job.status = "cancelled"
    db.add(job)
    await db.commit()
    
    return {"message": "Job başarıyla iptal edildi"}


# ── Admin: Email Delivery Tracking ────────────────────────────────────────

@app.post(
    "/api/admin/bulk-email-jobs/{job_id}/log-delivery",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def log_email_delivery(
    job_id: int,
    payload: dict,  # { attendee_id: int, status: "sent" | "failed" | "bounced", reason?: str }
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Log email delivery status for tracking (internal API for background workers)."""
    # Simple validation - in production, this should have a secret token
    j_res = await db.execute(select(BulkEmailJob).where(BulkEmailJob.id == job_id))
    job = j_res.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job bulunamadı")
    
    attendee_id = payload.get("attendee_id")
    status = payload.get("status", "sent")
    reason = payload.get("reason")
    
    log_entry = EmailDeliveryLog(
        bulk_job_id=job_id,
        attendee_id=attendee_id,
        status=status,
        reason=reason,
        sent_at=datetime.utcnow(),
    )
    db.add(log_entry)
    await db.commit()
    
    return {"id": log_entry.id, "status": "logged"}


@app.get(
    "/api/admin/events/{event_id}/bulk-email-jobs/{job_id}/delivery-stats",
    response_model=dict,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def get_delivery_stats(
    event_id: int,
    job_id: int,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get delivery statistics for a bulk email job."""
    # Verify ownership
    ev_res = await db.execute(
        select(Event).where(Event.id == event_id, Event.admin_id == me.id)
    )
    if not ev_res.scalar_one_or_none() and me.role != Role.superadmin:
        raise HTTPException(status_code=403, detail="Yetkisiz erişim")
    
    # Get job
    j_res = await db.execute(
        select(BulkEmailJob).where(BulkEmailJob.id == job_id, BulkEmailJob.event_id == event_id)
    )
    job = j_res.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job bulunamadı")
    
    # Get delivery logs
    logs_res = await db.execute(
        select(func.count(EmailDeliveryLog.id), EmailDeliveryLog.status)
        .where(EmailDeliveryLog.bulk_job_id == job_id)
        .group_by(EmailDeliveryLog.status)
    )
    logs_by_status = {status: count for count, status in logs_res.all()}
    
    return {
        "job_id": job_id,
        "total_recipients": job.recipients_count,
        "sent": logs_by_status.get("sent", 0),
        "failed": logs_by_status.get("failed", 0),
        "bounced": logs_by_status.get("bounced", 0),
        "opened": logs_by_status.get("opened", 0),
        "pending": job.recipients_count - sum(logs_by_status.values()),
        "open_rate": round(logs_by_status.get("opened", 0) / job.recipients_count * 100, 2) if job.recipients_count > 0 else 0,
        "bounce_rate": round(logs_by_status.get("bounced", 0) / job.recipients_count * 100, 2) if job.recipients_count > 0 else 0,
        "failure_rate": round(logs_by_status.get("failed", 0) / job.recipients_count * 100, 2) if job.recipients_count > 0 else 0,
    }


@app.get(
    "/api/admin/events/{event_id}/bulk-email-jobs/{job_id}/delivery-logs",
    response_model=dict,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def get_delivery_logs(
    event_id: int,
    job_id: int,
    status: Optional[str] = Query(None),  # Filter by status
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=50, le=500),
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get detailed delivery logs for a bulk email job."""
    # Verify ownership
    ev_res = await db.execute(
        select(Event).where(Event.id == event_id, Event.admin_id == me.id)
    )
    if not ev_res.scalar_one_or_none() and me.role != Role.superadmin:
        raise HTTPException(status_code=403, detail="Yetkisiz erişim")
    
    # Get logs
    q = select(EmailDeliveryLog, Attendee).join(
        Attendee, EmailDeliveryLog.attendee_id == Attendee.id
    ).where(EmailDeliveryLog.bulk_job_id == job_id)
    
    if status:
        q = q.where(EmailDeliveryLog.status == status)
    
    # Count total
    count_res = await db.execute(select(func.count()).select_from(q.subquery()))
    total = int(count_res.scalar_one() or 0)
    
    # Paginate
    q = q.order_by(EmailDeliveryLog.sent_at.desc()).offset((page - 1) * limit).limit(limit)
    res = await db.execute(q)
    logs = res.all()
    
    return {
        "logs": [
            {
                "id": log.id,
                "attendee": {"id": attendee.id, "name": attendee.name, "email": attendee.email},
                "status": log.status,
                "reason": log.reason,
                "sent_at": log.sent_at.isoformat(),
                "opened_at": log.opened_at.isoformat() if log.opened_at else None,
            }
            for log, attendee in logs
        ],
        "total": total,
        "page": page,
        "limit": limit,
    }


# ── Admin: Webhook Subscriptions ───────────────────────────────────────────

class WebhookSubscriptionIn(BaseModel):
    event_type: str  # email.sent, email.failed, email.bounced, email.opened
    url: str  # HTTPS endpoint where webhook will be POSTed
    secret: Optional[str] = None  # HMAC secret for verification


@app.post(
    "/api/admin/webhooks",
    response_model=WebhookSubscriptionOut,
    status_code=201,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def create_webhook_subscription(
    payload: WebhookSubscriptionIn,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Subscribe to email events (sent, failed, bounced, opened)."""
    # Validate event type
    valid_events = ["email.sent", "email.failed", "email.bounced", "email.opened"]
    if payload.event_type not in valid_events:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid event_type. Must be one of: {', '.join(valid_events)}",
        )
    
    # Validate URL
    if not payload.url.startswith("https://"):
        raise HTTPException(
            status_code=400,
            detail="Webhook URL must be HTTPS for security",
        )
    
    webhook = WebhookSubscription(
        user_id=me.id,
        event_type=payload.event_type,
        url=payload.url,
        secret=payload.secret or secrets.token_urlsafe(32),
        is_active=True,
    )
    db.add(webhook)
    await db.commit()
    await db.refresh(webhook)
    return webhook


@app.get(
    "/api/admin/webhooks",
    response_model=list[WebhookSubscriptionOut],
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def list_webhooks(
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all webhook subscriptions for the user."""
    res = await db.execute(
        select(WebhookSubscription).where(WebhookSubscription.user_id == me.id)
    )
    return res.scalars().all()


@app.patch(
    "/api/admin/webhooks/{webhook_id}",
    response_model=WebhookSubscriptionOut,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def update_webhook(
    webhook_id: int,
    payload: dict,  # { is_active: bool, url?: str }
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update webhook subscription (enable/disable or change URL)."""
    res = await db.execute(
        select(WebhookSubscription).where(
            WebhookSubscription.id == webhook_id,
            WebhookSubscription.user_id == me.id,
        )
    )
    webhook = res.scalar_one_or_none()
    if not webhook:
        raise HTTPException(status_code=404, detail="Webhook not found")
    
    if "is_active" in payload:
        webhook.is_active = payload["is_active"]
    if "url" in payload:
        if not payload["url"].startswith("https://"):
            raise HTTPException(status_code=400, detail="URL must be HTTPS")
        webhook.url = payload["url"]
    
    db.add(webhook)
    await db.commit()
    await db.refresh(webhook)
    return webhook


@app.delete(
    "/api/admin/webhooks/{webhook_id}",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def delete_webhook(
    webhook_id: int,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a webhook subscription."""
    res = await db.execute(
        select(WebhookSubscription).where(
            WebhookSubscription.id == webhook_id,
            WebhookSubscription.user_id == me.id,
        )
    )
    webhook = res.scalar_one_or_none()
    if not webhook:
        raise HTTPException(status_code=404, detail="Webhook not found")
    
    await db.delete(webhook)
    await db.commit()
    return {"message": "Webhook deleted"}


@app.post(
    "/api/admin/webhooks/{webhook_id}/test",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def test_webhook(
    webhook_id: int,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Send a test webhook to verify endpoint is working."""
    res = await db.execute(
        select(WebhookSubscription).where(
            WebhookSubscription.id == webhook_id,
            WebhookSubscription.user_id == me.id,
        )
    )
    webhook = res.scalar_one_or_none()
    if not webhook:
        raise HTTPException(status_code=404, detail="Webhook not found")
    
    # Create test payload
    test_payload = {
        "event": webhook.event_type,
        "timestamp": datetime.utcnow().isoformat(),
        "test": True,
        "data": {
            "bulk_job_id": 0,
            "message": "Test webhook payload"
        }
    }
    
    # Send test webhook
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.post(
                webhook.url,
                json=test_payload,
                headers={
                    "X-Heptacert-Event": webhook.event_type,
                    "X-Heptacert-Timestamp": str(int(datetime.utcnow().timestamp())),
                }
            )
        return {
            "status": "sent",
            "http_status": response.status_code,
            "message": f"Webhook sent, endpoint returned {response.status_code}",
        }
    except Exception as e:
        return {
            "status": "error",
            "message": f"Failed to send webhook: {str(e)}",
        }


@app.get("/api/superadmin/admins", response_model=list[AdminRowOut], dependencies=[Depends(require_role(Role.superadmin))])
async def list_admins(db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(User).where(User.role.in_([Role.admin, Role.superadmin])).order_by(User.id.asc()))
    users = res.scalars().all()
    return [
        AdminRowOut(
            id=u.id,
            email=u.email,
            role=u.role,                  # <-- kritik
            heptacoin_balance=u.heptacoin_balance
        )
        for u in users
    ]


@app.get("/api/superadmin/transactions", response_model=TxListOut, dependencies=[Depends(require_role(Role.superadmin))])
async def list_transactions(
    user_id: Optional[int] = None,
    page: int = 1,
    limit: int = 30,
    db: AsyncSession = Depends(get_db),
):
    if page < 1 or limit < 1 or limit > 200:
        raise bad_request("Invalid page/limit")

    q = select(Transaction)
    if user_id:
        q = q.where(Transaction.user_id == user_id)

    res_total = await db.execute(select(func.count()).select_from(q.subquery()))
    total = int(res_total.scalar_one())

    q = q.order_by(Transaction.timestamp.desc()).offset((page - 1) * limit).limit(limit)
    res = await db.execute(q)
    items = res.scalars().all()

    return TxListOut(
        items=[
            TxListItem(
                id=t.id,
                user_id=t.user_id,
                amount=t.amount,
                type=t.type,
                timestamp=t.timestamp,
            )
            for t in items
        ],
        total=total,
        page=page,
        limit=limit,
    )


@app.post("/api/superadmin/admins", dependencies=[Depends(require_role(Role.superadmin))])
async def create_admin(payload: CreateAdminIn, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(User).where(User.email == str(payload.email)))
    if res.scalar_one_or_none():
        raise bad_request("Email already exists")

    admin = User(
        email=str(payload.email),
        password_hash=hash_password(payload.password),
        role=Role.admin,
        heptacoin_balance=0,
        is_verified=True,  # superadmin tarafından oluşturulan hesaplar otomatik doğrulanır
    )
    db.add(admin)
    await db.commit()
    await db.refresh(admin)
    return {"id": admin.id, "email": admin.email, "role": admin.role, "heptacoin_balance": admin.heptacoin_balance}


class AdminRoleIn(BaseModel):
    role: str = Field(pattern="^(admin|superadmin)$")


@app.delete("/api/superadmin/admins/{admin_id}", dependencies=[Depends(require_role(Role.superadmin))])
async def delete_admin(
    admin_id: int,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if admin_id == me.id:
        raise bad_request("Kendi hesabınızı silemezsiniz.")
    res = await db.execute(select(User).where(User.id == admin_id))
    user = res.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Admin not found")
    await db.delete(user)
    await db.commit()
    return {"ok": True}


@app.patch("/api/superadmin/admins/{admin_id}/role", dependencies=[Depends(require_role(Role.superadmin))])
async def change_admin_role(
    admin_id: int,
    payload: AdminRoleIn,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if admin_id == me.id:
        raise bad_request("Kendi rolünüzü değiştiremezsiniz.")
    res = await db.execute(select(User).where(User.id == admin_id))
    user = res.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Admin not found")
    user.role = Role(payload.role)
    await db.commit()
    return {"ok": True, "new_role": payload.role}


@app.get("/api/admin/transactions", dependencies=[Depends(require_role(Role.admin, Role.superadmin))])
async def my_transactions(
    limit: int = Query(default=50, le=200),
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(
        select(Transaction)
        .where(Transaction.user_id == me.id)
        .order_by(Transaction.timestamp.desc())
        .limit(limit)
    )
    txs = res.scalars().all()
    return [{"id": t.id, "amount": t.amount, "type": t.type, "timestamp": t.timestamp} for t in txs]


@app.post("/api/superadmin/coins/credit", dependencies=[Depends(require_role(Role.superadmin))])
async def credit_coins(payload: CreditCoinsIn, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(User).where(User.id == payload.admin_user_id))
    user = res.scalar_one_or_none()
    if not user or user.role != Role.admin:
        raise bad_request("Admin user not found")

    user.heptacoin_balance += payload.amount
    db.add(Transaction(user_id=user.id, amount=payload.amount, type=TxType.credit))
    await db.commit()
    return {"admin_user_id": user.id, "new_balance": user.heptacoin_balance}


# ── Waitlist ──────────────────────────────────────────────────────────────────

@app.post("/api/waitlist", status_code=201)
@limiter.limit("5/minute")
async def join_waitlist(request: Request, data: WaitlistIn, db: AsyncSession = Depends(get_db)):
    """Public endpoint — anyone can join the waitlist."""
    existing = await db.execute(select(WaitlistEntry).where(WaitlistEntry.email == str(data.email)))
    if existing.scalar_one_or_none():
        return {"ok": True, "already_registered": True}
    entry = WaitlistEntry(
        name=data.name,
        email=str(data.email),
        phone=data.phone,
        plan_interest=data.plan_interest,
        note=data.note,
    )
    db.add(entry)
    await db.commit()
    return {"ok": True, "already_registered": False}


@app.get("/api/superadmin/waitlist", dependencies=[Depends(require_role(Role.superadmin))])
async def get_waitlist(db: AsyncSession = Depends(get_db)):
    """Superadmin: list all waitlist entries ordered newest first."""
    res = await db.execute(select(WaitlistEntry).order_by(WaitlistEntry.created_at.desc()))
    entries = res.scalars().all()
    return {
        "total": len(entries),
        "entries": [WaitlistEntryOut.model_validate(e) for e in entries],
    }


# ── Pricing Config (public GET + superadmin PATCH) ────────────────────────────

@app.get("/api/pricing/config", response_model=PricingConfigOut)
async def get_pricing_config(db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(SystemConfig).where(SystemConfig.key == "pricing"))
    cfg = res.scalar_one_or_none()
    if cfg is None or not cfg.value.get("tiers"):
        return PricingConfigOut(tiers=[PricingTier(**t) for t in DEFAULT_PRICING])
    return PricingConfigOut(tiers=[PricingTier(**t) for t in cfg.value["tiers"]])


@app.get("/api/superadmin/pricing", response_model=PricingConfigOut, dependencies=[Depends(require_role(Role.superadmin))])
async def get_pricing_config_admin(db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(SystemConfig).where(SystemConfig.key == "pricing"))
    cfg = res.scalar_one_or_none()
    if cfg is None or not cfg.value.get("tiers"):
        return PricingConfigOut(tiers=[PricingTier(**t) for t in DEFAULT_PRICING])
    return PricingConfigOut(tiers=[PricingTier(**t) for t in cfg.value["tiers"]])


@app.patch("/api/superadmin/pricing", response_model=PricingConfigOut, dependencies=[Depends(require_role(Role.superadmin))])
async def update_pricing_config(payload: PricingConfigOut, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(SystemConfig).where(SystemConfig.key == "pricing"))
    cfg = res.scalar_one_or_none()
    data = {"tiers": [t.model_dump() for t in payload.tiers]}
    if cfg is None:
        cfg = SystemConfig(key="pricing", value=data)
        db.add(cfg)
    else:
        cfg.value = data
    await db.commit()
    return payload


# ── Public Stats ──────────────────────────────────────────────────────────────

DEFAULT_STATS = {
    "active_orgs": "500+",
    "certs_issued": "50.000+",
    "uptime_pct": "%100",
    "availability": "7/24",
}


class StatsOut(BaseModel):
    active_orgs: str
    certs_issued: str
    uptime_pct: str
    availability: str


class StatsIn(BaseModel):
    active_orgs: Optional[str] = None
    certs_issued: Optional[str] = None
    uptime_pct: Optional[str] = None
    availability: Optional[str] = None
    use_real_counts: bool = True


@app.get("/api/stats", response_model=StatsOut)
async def get_public_stats(db: AsyncSession = Depends(get_db)):
    """Public stats endpoint — returns display values (overridden by superadmin or real DB counts)."""
    res = await db.execute(select(SystemConfig).where(SystemConfig.key == "stats"))
    cfg = res.scalar_one_or_none()
    overrides: dict = cfg.value if cfg else {}

    if overrides.get("use_real_counts", True):
        # Real DB counts
        org_count_res = await db.execute(
            select(func.count(func.distinct(Event.admin_id)))
        )
        org_count = org_count_res.scalar_one() or 0
        cert_count_res = await db.execute(
            select(func.count()).select_from(Certificate).where(Certificate.deleted_at.is_(None))
        )
        cert_count = cert_count_res.scalar_one() or 0

        return StatsOut(
            active_orgs=overrides.get("active_orgs") or f"{org_count:,}".replace(",", "."),
            certs_issued=overrides.get("certs_issued") or f"{cert_count:,}".replace(",", "."),
            uptime_pct=overrides.get("uptime_pct") or DEFAULT_STATS["uptime_pct"],
            availability=overrides.get("availability") or DEFAULT_STATS["availability"],
        )

    return StatsOut(
        active_orgs=overrides.get("active_orgs", DEFAULT_STATS["active_orgs"]),
        certs_issued=overrides.get("certs_issued", DEFAULT_STATS["certs_issued"]),
        uptime_pct=overrides.get("uptime_pct", DEFAULT_STATS["uptime_pct"]),
        availability=overrides.get("availability", DEFAULT_STATS["availability"]),
    )


@app.get("/api/superadmin/stats", response_model=dict, dependencies=[Depends(require_role(Role.superadmin))])
async def get_stats_config(db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(SystemConfig).where(SystemConfig.key == "stats"))
    cfg = res.scalar_one_or_none()
    return cfg.value if cfg else {**DEFAULT_STATS, "use_real_counts": True}


@app.patch("/api/superadmin/stats", response_model=dict, dependencies=[Depends(require_role(Role.superadmin))])
async def update_stats_config(payload: StatsIn, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(SystemConfig).where(SystemConfig.key == "stats"))
    cfg = res.scalar_one_or_none()
    data = payload.model_dump(exclude_none=False)
    if cfg is None:
        cfg = SystemConfig(key="stats", value=data)
        db.add(cfg)
    else:
        cfg.value = data
    await db.commit()
    return data


# ── Billing / Payment endpoints ───────────────────────────────────────────────

from .payments import get_provider, PaymentRequest  # noqa: E402


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


@app.get("/api/billing/status")
async def billing_status():
    """Returns whether payment is enabled and which provider is active."""
    return {
        "enabled": settings.payment_enabled,
        "provider": settings.active_payment_provider if settings.payment_enabled else None,
        "stripe_publishable_key": settings.stripe_publishable_key if settings.payment_enabled and settings.active_payment_provider == "stripe" else None,
    }


@app.post("/api/billing/create-payment")
async def create_payment(
    payload: CreatePaymentIn,
    request: Request,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not settings.payment_enabled:
        raise HTTPException(status_code=503, detail="Payment system is not yet enabled.")

    provider = get_provider(settings)
    if provider is None:
        raise HTTPException(status_code=503, detail="No payment provider configured.")

    # Lookup pricing tier for amount
    cfg_res = await db.execute(select(SystemConfig).where(SystemConfig.key == "pricing"))
    pricing_cfg = cfg_res.scalar_one_or_none()
    tiers = pricing_cfg.value.get("tiers", DEFAULT_PRICING) if pricing_cfg else DEFAULT_PRICING

    tier = next((t for t in tiers if t.get("id") == payload.plan_id), None)
    if tier is None:
        raise HTTPException(status_code=404, detail="Plan not found.")

    if payload.billing_period == "annual":
        price = tier.get("price_annual")
    else:
        price = tier.get("price_monthly")

    if price is None:
        raise HTTPException(status_code=400, detail="This plan requires custom pricing. Contact sales.")

    amount_cents = int(float(price) * 100)

    # Create Order record
    order = Order(
        user_id=me.id,
        plan_id=payload.plan_id,
        amount_cents=amount_cents,
        currency="TRY",
        provider=provider.name,
        status=OrderStatus.pending,
        meta={"billing_period": payload.billing_period},
    )
    db.add(order)
    await db.commit()
    await db.refresh(order)

    client_ip = request.client.host if request.client else "127.0.0.1"
    frontend = settings.frontend_base_url.rstrip("/")

    pay_req = PaymentRequest(
        order_id=str(order.id),
        amount_cents=amount_cents,
        currency="TRY",
        description=f"HeptaCert {tier.get('name_tr', payload.plan_id)} - {payload.billing_period}",
        customer_email=me.email,
        customer_name=me.email.split("@")[0],
        customer_ip=client_ip,
        success_url=f"{frontend}/checkout/success?order_id={order.id}",
        cancel_url=f"{frontend}/checkout/cancel?order_id={order.id}",
        webhook_url=f"{settings.public_base_url}/api/billing/webhook/{provider.name}",
    )

    result = await provider.create_payment(pay_req)

    if not result.success:
        order.status = OrderStatus.failed
        await db.commit()
        raise HTTPException(status_code=502, detail=result.error or "Payment initiation failed.")

    order.provider_ref = result.provider_ref
    await db.commit()

    return {
        "order_id": order.id,
        "checkout_url": result.checkout_url,
        "checkout_html": result.checkout_html,
        "provider": provider.name,
    }


@app.post("/api/billing/webhook/{provider_name}")
async def payment_webhook(
    provider_name: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Server-to-server payment notification from provider."""
    if not settings.payment_enabled:
        return {"ok": True}

    provider = get_provider(settings)
    if provider is None or provider.name != provider_name:
        raise HTTPException(status_code=400, detail="Unknown provider")

    raw_body = await request.body()
    headers = dict(request.headers)

    try:
        notification = provider.verify_webhook(raw_body, headers)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    order_id_raw = notification.get("order_id")
    if not order_id_raw:
        return {"ok": True}

    try:
        order_id = int(order_id_raw)
    except (ValueError, TypeError):
        return {"ok": True}

    res = await db.execute(select(Order).where(Order.id == order_id))
    order = res.scalar_one_or_none()
    if order is None:
        return {"ok": True}

    status = notification.get("status", "failed")
    order.provider_ref = notification.get("provider_ref", order.provider_ref)

    if status == "paid" and order.status != OrderStatus.paid:
        order.status = OrderStatus.paid
        order.paid_at = datetime.now(timezone.utc)
        # Create or extend subscription
        sub_res = await db.execute(
            select(Subscription).where(Subscription.user_id == order.user_id, Subscription.plan_id == order.plan_id, Subscription.is_active == True)
        )
        existing_sub = sub_res.scalar_one_or_none()
        period = (order.meta or {}).get("billing_period", "monthly")
        delta = timedelta(days=365 if period == "annual" else 31)
        hc_quota_pay = _get_hc_quota(order.plan_id)
        if existing_sub:
            now = datetime.now(timezone.utc)
            base = max(existing_sub.expires_at or now, now)
            existing_sub.expires_at = base + delta
            existing_sub.last_hc_credited_at = now
        else:
            now = datetime.now(timezone.utc)
            db.add(Subscription(
                user_id=order.user_id,
                plan_id=order.plan_id,
                order_id=order.id,
                expires_at=now + delta,
                is_active=True,
                last_hc_credited_at=now,
            ))
        # Credit HC quota on every successful payment period
        if hc_quota_pay:
            usr_pay_res = await db.execute(select(User).where(User.id == order.user_id))
            usr_pay = usr_pay_res.scalar_one_or_none()
            if usr_pay:
                usr_pay.heptacoin_balance += hc_quota_pay
                db.add(Transaction(
                    user_id=usr_pay.id, amount=hc_quota_pay, type=TxType.credit,
                    description=f"Plan {('aktivasyonu' if not existing_sub else 'yenileme')}: {order.plan_id} ({period})",
                ))
    elif status == "failed":
        order.status = OrderStatus.failed
    elif status == "refunded":
        order.status = OrderStatus.refunded

    await db.commit()
    return {"ok": True}


@app.get("/api/billing/orders", response_model=List[OrderOut])
async def list_orders(me: CurrentUser = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    res = await db.execute(
        select(Order).where(Order.user_id == me.id).order_by(Order.created_at.desc()).limit(50)
    )
    orders = res.scalars().all()
    return [OrderOut(
        id=o.id, plan_id=o.plan_id, amount_cents=o.amount_cents, currency=o.currency,
        provider=o.provider, status=o.status, created_at=o.created_at, paid_at=o.paid_at,
    ) for o in orders]


@app.get("/api/billing/subscription")
async def my_subscription(me: CurrentUser = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    res = await db.execute(
        select(Subscription).where(Subscription.user_id == me.id, Subscription.is_active == True)
        .order_by(Subscription.expires_at.desc()).limit(1)
    )
    sub = res.scalar_one_or_none()
    if sub is None:
        return {"active": False, "plan_id": None, "expires_at": None, "role": me.role.value}
    now = datetime.now(timezone.utc)
    is_valid = sub.expires_at is None or sub.expires_at > now
    return {
        "active": is_valid,
        "plan_id": sub.plan_id,
        "expires_at": sub.expires_at.isoformat() if sub.expires_at else None,
        "role": me.role.value,
    }


# Superadmin: payment config management
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


@app.get("/api/superadmin/payment-config", dependencies=[Depends(require_role(Role.superadmin))])
async def get_payment_config(db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(SystemConfig).where(SystemConfig.key == "payment_config"))
    cfg = res.scalar_one_or_none()
    data = cfg.value if cfg else {}
    # Merge DB overrides with current env settings
    return {
        "enabled": data.get("enabled", settings.payment_enabled),
        "active_provider": data.get("active_provider", settings.active_payment_provider),
        "iyzico_api_key": data.get("iyzico_api_key", settings.iyzico_api_key),
        "iyzico_secret_key": data.get("iyzico_secret_key", settings.iyzico_secret_key),
        "iyzico_base_url": data.get("iyzico_base_url", settings.iyzico_base_url),
        "paytr_merchant_id": data.get("paytr_merchant_id", settings.paytr_merchant_id),
        "paytr_merchant_key": data.get("paytr_merchant_key", settings.paytr_merchant_key),
        "paytr_merchant_salt": data.get("paytr_merchant_salt", settings.paytr_merchant_salt),
        "stripe_secret_key": data.get("stripe_secret_key", settings.stripe_secret_key),
        "stripe_webhook_secret": data.get("stripe_webhook_secret", settings.stripe_webhook_secret),
        "stripe_publishable_key": data.get("stripe_publishable_key", settings.stripe_publishable_key),
    }


@app.patch("/api/superadmin/payment-config", dependencies=[Depends(require_role(Role.superadmin))])
async def update_payment_config(payload: PaymentConfigOut, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(SystemConfig).where(SystemConfig.key == "payment_config"))
    cfg = res.scalar_one_or_none()
    data = payload.model_dump()
    if cfg is None:
        cfg = SystemConfig(key="payment_config", value=data)
        db.add(cfg)
    else:
        cfg.value = data
    await db.commit()
    return data





class MeOut(BaseModel):
    id: int
    email: EmailStr
    role: Role
    heptacoin_balance: int

@app.get("/api/me", response_model=MeOut, dependencies=[Depends(require_role(Role.admin, Role.superadmin))])
async def me(me: CurrentUser = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(User).where(User.id == me.id))
    u = res.scalar_one()
    return MeOut(id=u.id, email=u.email, role=u.role, heptacoin_balance=u.heptacoin_balance)


@app.patch("/api/me/password", dependencies=[Depends(require_role(Role.admin, Role.superadmin))])
async def change_password(
    data: ChangePasswordIn,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(User).where(User.id == me.id))
    user = res.scalar_one()
    if not verify_password(data.current_password, user.password_hash):
        raise bad_request("Mevcut şifre yanlış.")
    user.password_hash = hash_password(data.new_password)
    await db.commit()
    return {"detail": "Şifre başarıyla güncellendi."}


@app.patch("/api/me/email", dependencies=[Depends(require_role(Role.admin, Role.superadmin))])
async def change_email(
    data: ChangeEmailIn,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(User).where(User.id == me.id))
    user = res.scalar_one()
    if not verify_password(data.current_password, user.password_hash):
        raise bad_request("Mevcut şifre yanlış.")
    exists = await db.execute(select(User).where(User.email == str(data.new_email)))
    if exists.scalar_one_or_none():
        raise bad_request("Bu e-posta adresi zaten kullanımda.")
    user.email = str(data.new_email)
    await db.commit()
    return {"detail": "E-posta başarıyla güncellendi."}


@app.get("/api/admin/events", response_model=list[EventOut], dependencies=[Depends(require_role(Role.admin, Role.superadmin))])
async def list_events(me: CurrentUser = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    res = await db.execute(
        select(Event).where(Event.admin_id == me.id).order_by(Event.created_at.desc())
    )
    items = res.scalars().all()
    return [_event_to_out(e) for e in items]


@app.post("/api/admin/events", response_model=EventOut, status_code=201, dependencies=[Depends(require_role(Role.admin, Role.superadmin))])
async def create_event(
    payload: EventCreateIn,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ev = Event(
        admin_id=me.id,
        name=payload.name,
        template_image_url=payload.template_image_url or "placeholder",
        config=payload.config or {},
    )
    db.add(ev)
    await db.commit()
    await db.refresh(ev)
    return _event_to_out(ev)


def _event_to_out(ev: Event) -> EventOut:
    return EventOut(
        id=ev.id,
        name=ev.name,
        template_image_url=ev.template_image_url,
        config=ev.config or {},
        event_date=ev.event_date.isoformat() if ev.event_date else None,
        event_description=ev.event_description,
        event_location=ev.event_location,
        min_sessions_required=ev.min_sessions_required,
        event_banner_url=ev.event_banner_url,
    )


@app.get("/api/admin/events/{event_id}", response_model=EventOut, dependencies=[Depends(require_role(Role.admin, Role.superadmin))])
async def get_event(event_id: int, me: CurrentUser = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Event).where(Event.id == event_id, Event.admin_id == me.id))
    ev = res.scalar_one_or_none()
    if not ev:
        raise HTTPException(status_code=404, detail="Event not found")
    return _event_to_out(ev)


@app.patch("/api/admin/events/{event_id}", response_model=EventOut, dependencies=[Depends(require_role(Role.admin, Role.superadmin))])
async def rename_event(
    event_id: int,
    payload: EventRenameIn,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(Event).where(Event.id == event_id, Event.admin_id == me.id))
    ev = res.scalar_one_or_none()
    if not ev:
        raise HTTPException(status_code=404, detail="Event not found")
    ev.name = payload.name
    if payload.event_date is not None:
        from datetime import date as _date
        ev.event_date = _date.fromisoformat(payload.event_date) if payload.event_date else None
    if payload.event_description is not None:
        ev.event_description = payload.event_description
    if payload.event_location is not None:
        ev.event_location = payload.event_location
    if payload.min_sessions_required is not None:
        ev.min_sessions_required = payload.min_sessions_required
    if payload.event_banner_url is not None:
        ev.event_banner_url = payload.event_banner_url if payload.event_banner_url else None
    await db.commit()
    return _event_to_out(ev)


@app.delete("/api/admin/events/{event_id}", dependencies=[Depends(require_role(Role.admin, Role.superadmin))])
async def delete_event(
    event_id: int,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Superadmin can delete any event; admin can only delete their own
    if me.role == Role.superadmin:
        res = await db.execute(select(Event).where(Event.id == event_id))
    else:
        res = await db.execute(select(Event).where(Event.id == event_id, Event.admin_id == me.id))
    ev = res.scalar_one_or_none()
    if not ev:
        raise HTTPException(status_code=404, detail="Event not found")
    await db.delete(ev)
    await db.commit()
    return {"ok": True}


@app.post("/api/admin/events/{event_id}/template-upload", dependencies=[Depends(require_role(Role.admin, Role.superadmin))])
async def upload_template(
    event_id: int,
    file: UploadFile = File(...),
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(Event).where(Event.id == event_id, Event.admin_id == me.id))
    ev = res.scalar_one_or_none()
    if not ev:
        raise HTTPException(status_code=404, detail="Event not found")

    if not file.content_type or not file.content_type.startswith("image/"):
        raise bad_request("Only image uploads allowed")

    ext = Path(file.filename or "template.png").suffix.lower() or ".png"
    safe_name = f"templates/event_{event_id}_{secrets.token_hex(8)}{ext}"
    dest = Path(settings.local_storage_dir) / safe_name

    data = await file.read()
    dest.parent.mkdir(parents=True, exist_ok=True)

    # Remove old template file from disk before overwriting
    if ev.template_image_url and ev.template_image_url not in ("placeholder", ""):
        try:
            old_path = local_path_from_url(ev.template_image_url)
            if old_path.exists() and "templates/" in str(old_path):
                old_path.unlink(missing_ok=True)
        except Exception as exc:
            logger.warning("Old template cleanup failed for event %s: %s", event_id, exc)

    dest.write_bytes(data)

    # Get image dimensions for the editor
    img_w, img_h = 1240, 877
    if PILImage is not None:
        try:
            img_obj = PILImage.open(io.BytesIO(data))
            img_w, img_h = img_obj.size
        except Exception:
            pass

    # Save template snapshot before overwriting
    snap = EventTemplateSnapshot(
        event_id=event_id,
        template_image_url=ev.template_image_url,
        config=ev.config,
        created_by=me.id,
    )
    db.add(snap)

    ev.template_image_url = safe_name
    await db.commit()
    pub_url = f"{settings.public_base_url}/api/files/{safe_name}"
    return {"template_image_url": safe_name, "url": pub_url, "width": img_w, "height": img_h}


@app.post("/api/admin/events/{event_id}/banner-upload", dependencies=[Depends(require_role(Role.admin, Role.superadmin))])
async def upload_event_banner(
    event_id: int,
    file: UploadFile = File(...),
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(Event).where(Event.id == event_id, Event.admin_id == me.id))
    ev = res.scalar_one_or_none()
    if not ev:
        raise HTTPException(status_code=404, detail="Event not found")
    if not file.content_type or not file.content_type.startswith("image/"):
        raise bad_request("Only image uploads allowed")
    ext = Path(file.filename or "banner.jpg").suffix.lower() or ".jpg"
    safe_name = f"banners/event_{event_id}/banner{ext}"
    dest = Path(settings.local_storage_dir) / safe_name
    dest.parent.mkdir(parents=True, exist_ok=True)
    data = await file.read()
    dest.write_bytes(data)
    pub_url = f"{settings.public_base_url}/api/files/{safe_name}"
    ev.event_banner_url = pub_url
    await db.commit()
    return {"event_banner_url": pub_url}


@app.put("/api/admin/events/{event_id}/config", dependencies=[Depends(require_role(Role.admin, Role.superadmin))])
async def save_event_config(
    event_id: int,
    payload: Dict[str, Any] = Body(...),
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(Event).where(Event.id == event_id, Event.admin_id == me.id))
    ev = res.scalar_one_or_none()
    if not ev:
        raise HTTPException(status_code=404, detail="Event not found")

    # Save config snapshot before overwriting
    snap = EventTemplateSnapshot(
        event_id=event_id,
        template_image_url=ev.template_image_url,
        config=ev.config,
        created_by=me.id,
    )
    db.add(snap)

    ev.config = payload
    await db.commit()
    return {"event_id": ev.id, "config": ev.config}


#
@app.post("/api/admin/events/{event_id}/bulk-generate", dependencies=[Depends(require_role(Role.admin, Role.superadmin))])
async def bulk_generate(
    event_id: int,
    request: Request,
    excel: UploadFile = File(...),
    background_tasks: BackgroundTasks = None,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Event (admin kontrol)
    res = await db.execute(select(Event).where(Event.id == event_id, Event.admin_id == me.id))
    ev = res.scalar_one_or_none()
    if not ev:
        raise HTTPException(status_code=404, detail="Event not found")

    if not ev.config:
        raise bad_request("Event config missing. Save coordinates in editor first.")
    try:
        cfg = editor_config_to_template_config(ev.config)
    except Exception as e:
        raise bad_request(f"Invalid event config: {e}")

    # File size limit: 5MB
    MAX_EXCEL_SIZE = 5 * 1024 * 1024
    raw = await excel.read()
    if len(raw) > MAX_EXCEL_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"Excel dosyası çok büyük. Maksimum {MAX_EXCEL_SIZE // (1024*1024)} MB.",
        )
    try:
        df = pd.read_excel(io.BytesIO(raw))
    except Exception:
        raise bad_request("Excel parse failed. Ensure .xlsx and readable sheet.")

    if df.empty:
        raise bad_request("Excel is empty")

    col = None
    for c in df.columns:
        lc = str(c).strip().lower()
        if lc in ("name", "student_name", "isim", "ad soyad", "fullname", "full_name"):
            col = c
            break
    if col is None:
        col = df.columns[0]

    names = [str(x).strip() for x in df[col].tolist() if str(x).strip() and str(x).strip().lower() != "nan"]
    if not names:
        raise bad_request("No names found in Excel")
    if len(names) > 1000:
        raise bad_request("Excel'de en fazla 1000 isim işlenebilir. Dosyayı bölerek tekrar deneyin.")

    # User
    res_u = await db.execute(select(User).where(User.id == me.id))
    user = res_u.scalar_one()

    # Template bytes
    template_path = local_path_from_url(ev.template_image_url)
    if not template_path.exists():
        raise bad_request("Template image not found on server. Upload template or fix template_image_url.")
    template_bytes = template_path.read_bytes()

    # Brand logo for QR overlay (from user's organization)
    org_res = await db.execute(select(Organization).where(Organization.user_id == me.id))
    org = org_res.scalar_one_or_none()
    brand_logo_bytes: Optional[bytes] = None
    if org and org.brand_logo:
        try:
            logo_path = local_path_from_url(org.brand_logo)
            if logo_path.exists():
                brand_logo_bytes = logo_path.read_bytes()
        except Exception:
            pass

    # Event lock (cert_seq atomic)
    res_lock = await db.execute(
        select(Event).where(Event.id == ev.id, Event.admin_id == me.id).with_for_update()
    )
    ev = res_lock.scalar_one()

    ISSUE_UNITS_PER_CERT = 10
    HOSTING_ESTIMATE_UNITS = 20  # estimate per cert for early balance check
    term = "yearly"

    # ── Early balance check (before any file I/O) ──────────────────────────────
    estimated_total = len(names) * (ISSUE_UNITS_PER_CERT + HOSTING_ESTIMATE_UNITS)
    if user.heptacoin_balance < estimated_total:
        raise HTTPException(
            status_code=402,
            detail=f"Yetersiz HeptaCoin. TahminiGereksinim={estimated_total}, Bakiye={user.heptacoin_balance}",
        )
    # ──────────────────────────────────────────────────────────────────────────

    created_items: List[Dict[str, Any]] = []
    total_spend_units = 0

    for student_name in names:
        cert_uuid = new_certificate_uuid()

        ev.cert_seq += 1
        public_id = f"EV{ev.id}-{ev.cert_seq:06d}"
        verify_url = f"{settings.public_base_url}/verify/{cert_uuid}"

        # NOTE: generator.py'yı public_id alacak şekilde güncellemen şart
        pdf_bytes = render_certificate_pdf(
            template_image_bytes=template_bytes,
            student_name=student_name,
            verify_url=verify_url,
            config=cfg,
            public_id=public_id,
            brand_logo_bytes=brand_logo_bytes,
        )

        rel_pdf_path = f"pdfs/event_{ev.id}/{cert_uuid}.pdf"
        abs_pdf_path = Path(settings.local_storage_dir) / rel_pdf_path
        abs_pdf_path.parent.mkdir(parents=True, exist_ok=True)
        abs_pdf_path.write_bytes(pdf_bytes)

        asset_size_bytes = abs_pdf_path.stat().st_size
        hosting_spend = hosting_units(term, asset_size_bytes)

        spend_units = ISSUE_UNITS_PER_CERT + hosting_spend
        total_spend_units += spend_units

        pdf_url = build_public_pdf_url(rel_pdf_path)
        hosting_ends_at = compute_hosting_ends(term)

        cert = Certificate(
            uuid=cert_uuid,
            public_id=public_id,
            student_name=student_name,
            event_id=ev.id,
            pdf_url=pdf_url,
            status=CertStatus.active,
            hosting_term=term,
            hosting_ends_at=hosting_ends_at,
            asset_size_bytes=asset_size_bytes,
        )
        db.add(cert)

        created_items.append({
            "uuid": cert_uuid,
            "public_id": public_id,
            "student_name": student_name,
            "status": CertStatus.active,
            "hosting_term": term,
            "hosting_ends_at": hosting_ends_at,
            "pdf_url": pdf_url,
            "spend_units": spend_units,
        })

    # Final precise balance check
    if user.heptacoin_balance < total_spend_units:
        raise HTTPException(
            status_code=402,
            detail=f"Yetersiz HeptaCoin. Gereksinim={total_spend_units}, Bakiye={user.heptacoin_balance}",
        )

    user.heptacoin_balance -= total_spend_units
    db.add(Transaction(user_id=user.id, amount=total_spend_units, type=TxType.spend))

    await db.commit()

    # ── Fire webhook ──────────────────────────────────────────────────────────
    if background_tasks:
        from .webhooks import deliver_webhook, WebhookEvent
        background_tasks.add_task(
            deliver_webhook, db, me.id, WebhookEvent.cert_bulk_completed.value,
            {"event_id": ev.id, "created": len(created_items), "spent_heptacoin": total_spend_units},
        )

    # ── Build ZIP with all PDFs ───────────────────────────────────────────────
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        for item in created_items:
            rel_pdf_path = f"pdfs/event_{ev.id}/{item['uuid']}.pdf"
            abs_pdf_path = Path(settings.local_storage_dir) / rel_pdf_path
            if abs_pdf_path.exists():
                safe_fname = "".join(
                    c if c.isalnum() or c in " _-." else "_"
                    for c in f"{item['student_name']}_{item['public_id']}.pdf"
                )
                zf.write(abs_pdf_path, safe_fname)
    zip_buffer.seek(0)

    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={
            "Content-Disposition": f"attachment; filename=certificates-event-{ev.id}.zip",
            "X-Heptacert-Created": str(len(created_items)),
            "X-Heptacert-Spent-HC": str(total_spend_units),
        },
    )



@app.get("/api/verify/{uuid}", response_model=VerifyOut)
async def verify(uuid: str, request: Request, db: AsyncSession = Depends(get_db)):
    res = await db.execute(
        select(Certificate, Event)
        .join(Event, Certificate.event_id == Event.id)
        .where(Certificate.uuid == uuid, Certificate.deleted_at.is_(None))
    )
    row = res.first()
    if not row:
        raise HTTPException(status_code=404, detail="Certificate not found")

    cert, ev = row

    now = datetime.now(timezone.utc)
    if cert.hosting_ends_at and cert.hosting_ends_at < now and cert.status == CertStatus.active:
        cert.status = CertStatus.expired
        await db.commit()

    pdf_url = cert.pdf_url if cert.status == CertStatus.active else None

    # ── Record verification hit ───────────────────────────────────────────────
    client_ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent", "")
    referer = request.headers.get("referer", "")
    db.add(VerificationHit(
        cert_uuid=uuid,
        ip_address=client_ip,
        user_agent=user_agent[:512],
        referer=referer[:512],
    ))

    # ── View count ────────────────────────────────────────────────────────────
    count_res = await db.execute(
        select(func.count()).select_from(
            select(VerificationHit).where(VerificationHit.cert_uuid == uuid).subquery()
        )
    )
    view_count = int(count_res.scalar_one() or 0) + 1  # +1 for current hit

    # ── Organization branding (match Host header to custom_domain) ────────────
    branding: Optional[Dict[str, Any]] = None
    host = request.headers.get("host", "")
    if host:
        domain = host.split(":")[0]
        org_res = await db.execute(
            select(Organization).where(Organization.custom_domain == domain)
        )
        org = org_res.scalar_one_or_none()
        if org:
            branding = {
                "org_name": org.org_name,
                "brand_logo": org.brand_logo,
                "brand_color": org.brand_color,
            }

    # ── LinkedIn URL ──────────────────────────────────────────────────────────
    linkedin_url: Optional[str] = None
    if cert.status == CertStatus.active:
        from urllib.parse import urlencode
        params = urlencode({
            "startTask": "CERTIFICATION_NAME",
            "name": ev.name,
            "certUrl": f"{settings.public_base_url}/verify/{uuid}",
        })
        linkedin_url = f"https://www.linkedin.com/profile/add?{params}"

    await db.commit()

    return VerifyOut(
        uuid=cert.uuid,
        public_id=cert.public_id,
        student_name=cert.student_name,
        event_name=ev.name,
        status=cert.status,
        pdf_url=pdf_url,
        issued_at=getattr(cert, "issued_at", None),
        hosting_ends_at=cert.hosting_ends_at,
        view_count=view_count,
        linkedin_url=linkedin_url,
        branding=branding,
    )


@app.get("/api/files/{path:path}")
async def serve_file(path: str):
    # Sanitise: strip leading slashes, reject path traversal components
    path = path.lstrip("/")
    if ".." in path or path.startswith("/") or "\\" in path:
        raise HTTPException(status_code=400, detail="Invalid path")
    storage_root = Path(settings.local_storage_dir).resolve()
    abs_path = (storage_root / path).resolve()
    # Ensure the resolved path is still within the storage directory
    if not str(abs_path).startswith(str(storage_root)):
        raise HTTPException(status_code=403, detail="Access denied")
    if not abs_path.exists() or not abs_path.is_file():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(abs_path)




@app.get(
    "/api/admin/events/{event_id}/certificates",
    response_model=CertificateListOut,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def list_certificates(
    event_id: int,
    search: str = "",
    status: Optional[CertStatus] = None,
    page: int = 1,
    limit: int = 20,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if page < 1 or limit < 1 or limit > 200:
        raise bad_request("Invalid page/limit")

    # Event erişim kontrolü (superadmin her event'e bakabilsin diye esnetiyoruz)
    q_event = select(Event).where(Event.id == event_id)
    if me.role != Role.superadmin:
        q_event = q_event.where(Event.admin_id == me.id)
    res_ev = await db.execute(q_event)
    ev = res_ev.scalar_one_or_none()
    if not ev:
        raise HTTPException(status_code=404, detail="Event not found")

    q = select(Certificate).where(
        Certificate.event_id == event_id,
        Certificate.deleted_at.is_(None),
    )

    if search:
        s = search.strip()
        from sqlalchemy import or_
        if len(s) >= 2:
            # Sanitise: keep only alphanumeric, spaces, Turkish chars
            import re as _re
            _safe_words = [w for w in _re.sub(r"[^\w\sçğıöşüÇĞİÖŞÜ]", "", s).split() if w]
            if _safe_words:
                tsq_str = " & ".join([w + ":*" for w in _safe_words])
                try:
                    q = q.where(
                        or_(
                            Certificate.student_name.ilike(f"%{s}%"),
                            func.to_tsvector("simple", Certificate.student_name).op("@@")(
                                func.to_tsquery("simple", tsq_str)
                            ),
                        )
                    )
                except Exception:
                    q = q.where(Certificate.student_name.ilike(f"%{s}%"))
            else:
                q = q.where(Certificate.student_name.ilike(f"%{s}%"))
        else:
            q = q.where(Certificate.student_name.ilike(f"%{s}%"))

    if status:
        q = q.where(Certificate.status == status)

    # total
    res_total = await db.execute(select(func.count()).select_from(q.subquery()))
    total = int(res_total.scalar_one())

    q = q.order_by(Certificate.created_at.desc()).offset((page - 1) * limit).limit(limit)
    res = await db.execute(q)
    items = res.scalars().all()

    def to_out(c: Certificate) -> CertificateOut:
        # expired/revoked -> pdf kapalı (X)
        pdf_url = c.pdf_url if c.status == CertStatus.active else None
        return CertificateOut(
            id=c.id,
            uuid=c.uuid,
            public_id=c.public_id,
            student_name=c.student_name,
            event_id=c.event_id,
            status=c.status,
            issued_at=getattr(c, "issued_at", None),
            hosting_term=getattr(c, "hosting_term", None),
            hosting_ends_at=getattr(c, "hosting_ends_at", None),
            pdf_url=pdf_url,
        )

    return CertificateListOut(
        items=[to_out(x) for x in items],
        total=total,
        page=page,
        limit=limit,
    )





@app.post(
    "/api/admin/events/{event_id}/certificates",
    response_model=CertificateOut,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def issue_certificate(
    event_id: int,
    payload: IssueCertificateIn,
    background_tasks: BackgroundTasks,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Event erişim kontrolü
    q_event = select(Event).where(Event.id == event_id)
    if me.role != Role.superadmin:
        q_event = q_event.where(Event.admin_id == me.id)
    res = await db.execute(q_event)
    ev = res.scalar_one_or_none()
    if not ev:
        raise HTTPException(status_code=404, detail="Event not found")

    if not ev.config:
        raise bad_request("Event config missing. Save coordinates in editor first.")
    try:
        cfg = editor_config_to_template_config(ev.config)
    except Exception as e:
        raise bad_request(f"Invalid event config: {e}")

    # Enforce hologram: only Growth/Enterprise can disable it
    if not cfg.show_hologram and me.role != Role.superadmin:
        _sub_h = await db.execute(
            select(Subscription)
            .where(Subscription.user_id == me.id, Subscription.is_active == True)
            .order_by(Subscription.expires_at.desc()).limit(1)
        )
        _sub_h_row = _sub_h.scalar_one_or_none()
        _now_h = datetime.now(timezone.utc)
        if not _sub_h_row or _sub_h_row.plan_id not in ("growth", "enterprise") or \
                (_sub_h_row.expires_at and _sub_h_row.expires_at < _now_h):
            cfg.show_hologram = True

    # User
    res_u = await db.execute(select(User).where(User.id == me.id))
    user = res_u.scalar_one()

    # Template bytes
    template_path = local_path_from_url(ev.template_image_url)
    if not template_path.exists():
        raise bad_request("Template image not found on server. Upload template or fix template_image_url.")
    template_bytes = template_path.read_bytes()

    # Brand logo for QR overlay (from user's organization)
    org_res2 = await db.execute(select(Organization).where(Organization.user_id == me.id))
    org2 = org_res2.scalar_one_or_none()
    single_brand_logo_bytes: Optional[bytes] = None
    if org2 and org2.brand_logo:
        try:
            logo_path2 = local_path_from_url(org2.brand_logo)
            if logo_path2.exists():
                single_brand_logo_bytes = logo_path2.read_bytes()
        except Exception:
            pass

    # Event lock (cert_seq atomic)
    res_lock = await db.execute(select(Event).where(Event.id == ev.id).with_for_update())
    ev = res_lock.scalar_one()

    ISSUE_UNITS_PER_CERT = 10
    term = payload.hosting_term

    cert_uuid = new_certificate_uuid()
    ev.cert_seq += 1
    public_id = f"EV{ev.id}-{ev.cert_seq:06d}"
    verify_url = f"{settings.public_base_url}/verify/{cert_uuid}"

    # generator.py: public_id param zorunlu olmalı
    pdf_bytes = render_certificate_pdf(
        template_image_bytes=template_bytes,
        student_name=payload.student_name,
        verify_url=verify_url,
        config=cfg,
        public_id=public_id,
        brand_logo_bytes=single_brand_logo_bytes,
    )

    rel_pdf_path = f"pdfs/event_{ev.id}/{cert_uuid}.pdf"
    abs_pdf_path = Path(settings.local_storage_dir) / rel_pdf_path
    abs_pdf_path.parent.mkdir(parents=True, exist_ok=True)
    abs_pdf_path.write_bytes(pdf_bytes)
    asset_size_bytes = abs_pdf_path.stat().st_size

    # hosting units
    hosting_spend = hosting_units(term, asset_size_bytes)
    spend_units = ISSUE_UNITS_PER_CERT + hosting_spend

    if user.heptacoin_balance < spend_units:
        raise HTTPException(
            status_code=402,
            detail=f"Insufficient HeptaCoin. NeededUnits={spend_units}, balanceUnits={user.heptacoin_balance}",
        )

    pdf_url = build_public_pdf_url(rel_pdf_path)
    hosting_ends_at = compute_hosting_ends(term)

    cert = Certificate(
        uuid=cert_uuid,
        public_id=public_id,
        student_name=payload.student_name,
        event_id=ev.id,
        pdf_url=pdf_url,
        status=CertStatus.active,
        hosting_term=term,
        hosting_ends_at=hosting_ends_at,
        asset_size_bytes=asset_size_bytes,
    )
    db.add(cert)

    user.heptacoin_balance -= spend_units
    db.add(Transaction(user_id=user.id, amount=spend_units, type=TxType.spend))

    await db.commit()
    await db.refresh(cert)

    # ── Fire webhook ──────────────────────────────────────────────────────────
    from .webhooks import deliver_webhook, WebhookEvent
    background_tasks.add_task(
        deliver_webhook, db, me.id, WebhookEvent.cert_issued.value,
        {"uuid": cert.uuid, "public_id": cert.public_id, "student_name": cert.student_name, "event_id": ev.id},
    )

    return CertificateOut(
        id=cert.id,
        uuid=cert.uuid,
        public_id=cert.public_id,
        student_name=cert.student_name,
        event_id=cert.event_id,
        status=cert.status,
        issued_at=getattr(cert, "issued_at", None),
        hosting_term=cert.hosting_term,
        hosting_ends_at=cert.hosting_ends_at,
        pdf_url=cert.pdf_url,
    )




@app.patch(
    "/api/admin/certificates/{cert_id}",
    response_model=CertificateOut,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def update_certificate_status(
    cert_id: int,
    payload: UpdateCertificateStatusIn,
    background_tasks: BackgroundTasks,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # cert + event join (yetki kontrolü için)
    q = (
        select(Certificate, Event)
        .join(Event, Certificate.event_id == Event.id)
        .where(Certificate.id == cert_id, Certificate.deleted_at.is_(None))
    )
    if me.role != Role.superadmin:
        q = q.where(Event.admin_id == me.id)

    res = await db.execute(q)
    row = res.first()
    if not row:
        raise HTTPException(status_code=404, detail="Certificate not found")

    cert, ev = row
    cert.status = payload.status
    await db.commit()
    await db.refresh(cert)

    # Remove PDF file from disk on revoke/expire
    if payload.status in (CertStatus.revoked, CertStatus.expired) and cert.pdf_url:
        try:
            pdf_path = local_path_from_url(cert.pdf_url)
            if pdf_path.exists():
                pdf_path.unlink(missing_ok=True)
        except Exception as exc:
            logger.warning("PDF file cleanup failed for cert %s: %s", cert.id, exc)

    if payload.status == CertStatus.revoked:
        from .webhooks import deliver_webhook, WebhookEvent
        background_tasks.add_task(
            deliver_webhook, db, me.id, WebhookEvent.cert_revoked.value,
            {"uuid": cert.uuid, "public_id": cert.public_id, "student_name": cert.student_name},
        )

    pdf_url = cert.pdf_url if cert.status == CertStatus.active else None

    return CertificateOut(
        id=cert.id,
        uuid=cert.uuid,
        public_id=cert.public_id,
        student_name=cert.student_name,
        event_id=cert.event_id,
        status=cert.status,
        issued_at=getattr(cert, "issued_at", None),
        hosting_term=getattr(cert, "hosting_term", None),
        hosting_ends_at=getattr(cert, "hosting_ends_at", None),
        pdf_url=pdf_url,
    )




@app.delete(
    "/api/admin/certificates/{cert_id}",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def soft_delete_certificate(
    cert_id: int,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    q = (
        select(Certificate, Event)
        .join(Event, Certificate.event_id == Event.id)
        .where(Certificate.id == cert_id, Certificate.deleted_at.is_(None))
    )
    if me.role != Role.superadmin:
        q = q.where(Event.admin_id == me.id)

    res = await db.execute(q)
    row = res.first()
    if not row:
        raise HTTPException(status_code=404, detail="Certificate not found")

    cert, ev = row
    cert.deleted_at = datetime.now(timezone.utc)
    await db.commit()
    # Remove PDF file from disk
    if cert.pdf_url:
        try:
            pdf_path = local_path_from_url(cert.pdf_url)
            if pdf_path.exists():
                pdf_path.unlink(missing_ok=True)
        except Exception as exc:
            logger.warning("PDF file cleanup failed for cert %s: %s", cert.id, exc)
    return {"ok": True}

#certificates.heptapusgroup.com {

#    encode zstd gzip

#    @api path /api/*
#    handle @api {
#        reverse_proxy heptacert-backend:8000
#    }

#    handle {
#        reverse_proxy heptacert-frontend:3000
#    }
#}

# ═══════════════════════════════════════════════════════════════════════════════
# 2FA – TOTP endpoints
# ═══════════════════════════════════════════════════════════════════════════════

@app.post("/api/auth/2fa/setup", dependencies=[Depends(require_role(Role.admin, Role.superadmin))])
async def setup_2fa(
    db: AsyncSession = Depends(get_db),
    cu: CurrentUser = Depends(get_current_user),
):
    secret = pyotp.random_base32()
    res = await db.execute(select(TotpSecret).where(TotpSecret.user_id == cu.id))
    existing = res.scalar_one_or_none()
    if existing:
        existing.secret = secret
        existing.enabled = False
        db.add(existing)
    else:
        db.add(TotpSecret(user_id=cu.id, secret=secret, enabled=False))
    await db.commit()
    otp_uri = pyotp.totp.TOTP(secret).provisioning_uri(cu.email, issuer_name="HeptaCert")
    return TotpSetupOut(otpauth_url=otp_uri, secret=secret)


@app.post("/api/auth/2fa/confirm", dependencies=[Depends(require_role(Role.admin, Role.superadmin))])
async def confirm_2fa(
    data: TotpConfirmIn,
    db: AsyncSession = Depends(get_db),
    cu: CurrentUser = Depends(get_current_user),
):
    res = await db.execute(select(TotpSecret).where(TotpSecret.user_id == cu.id))
    totp_row = res.scalar_one_or_none()
    if not totp_row:
        raise HTTPException(status_code=400, detail="2FA kurulumu başlatılmamış")
    if not pyotp.TOTP(totp_row.secret).verify(data.code, valid_window=1):
        raise HTTPException(status_code=400, detail="Geçersiz kod")
    totp_row.enabled = True
    await db.commit()
    return {"ok": True}


@app.post("/api/auth/2fa/validate")
@limiter.limit("10/minute")
async def validate_2fa(
    request: Request,
    data: TotpValidateIn,
    db: AsyncSession = Depends(get_db),
):
    try:
        payload = jwt.decode(data.partial_token, settings.jwt_secret, algorithms=["HS256"])
        if not payload.get("partial"):
            raise HTTPException(status_code=400, detail="Invalid token type")
        user_id = int(payload["sub"])
    except JWTError:
        raise HTTPException(status_code=401, detail="Geçersiz veya süresi dolmuş token")
    user_res = await db.execute(select(User).where(User.id == user_id))
    user = user_res.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="Kullanıcı bulunamadı")
    totp_res = await db.execute(
        select(TotpSecret).where(TotpSecret.user_id == user_id, TotpSecret.enabled.is_(True))
    )
    totp_row = totp_res.scalar_one_or_none()
    if not totp_row or not pyotp.TOTP(totp_row.secret).verify(data.code, valid_window=1):
        raise HTTPException(status_code=400, detail="Geçersiz kod")
    return TokenOut(access_token=create_access_token(user_id=user.id, role=user.role), token_type="bearer")


@app.patch("/api/auth/2fa/disable", dependencies=[Depends(require_role(Role.admin, Role.superadmin))])
async def disable_2fa(
    data: TotpConfirmIn,
    db: AsyncSession = Depends(get_db),
    cu: CurrentUser = Depends(get_current_user),
):
    res = await db.execute(
        select(TotpSecret).where(TotpSecret.user_id == cu.id, TotpSecret.enabled.is_(True))
    )
    totp_row = res.scalar_one_or_none()
    if not totp_row:
        raise HTTPException(status_code=400, detail="2FA zaten pasif")
    if not pyotp.TOTP(totp_row.secret).verify(data.code, valid_window=1):
        raise HTTPException(status_code=400, detail="Geçersiz kod")
    await db.delete(totp_row)
    await db.commit()
    return {"ok": True}


@app.get("/api/auth/2fa/status", dependencies=[Depends(require_role(Role.admin, Role.superadmin))])
async def get_2fa_status(
    db: AsyncSession = Depends(get_db),
    cu: CurrentUser = Depends(get_current_user),
):
    res = await db.execute(
        select(TotpSecret).where(TotpSecret.user_id == cu.id, TotpSecret.enabled.is_(True))
    )
    totp = res.scalar_one_or_none()
    return {"enabled": totp is not None}


# ═══════════════════════════════════════════════════════════════════════════════
# API Keys
# ═══════════════════════════════════════════════════════════════════════════════

@app.post(
    "/api/admin/api-keys",
    response_model=ApiKeyCreateOut,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin)), Depends(require_paid_plan)],
)
async def create_api_key(
    data: ApiKeyCreateIn,
    db: AsyncSession = Depends(get_db),
    cu: CurrentUser = Depends(get_current_user),
):
    raw_key = "hc_live_" + secrets.token_urlsafe(32)
    key_prefix = raw_key[:14]  # "hc_live_" + first 6 chars
    key_hash = _hash_api_key(raw_key)
    expires_at = (
        datetime.now(timezone.utc) + timedelta(days=data.expires_days)
        if data.expires_days
        else None
    )
    ak = ApiKey(
        user_id=cu.id,
        name=data.name,
        key_prefix=key_prefix,
        key_hash=key_hash,
        scopes=["read", "write"],
        is_active=True,
        expires_at=expires_at,
    )
    db.add(ak)
    await db.commit()
    await db.refresh(ak)
    return ApiKeyCreateOut(
        id=ak.id,
        name=ak.name,
        key_prefix=ak.key_prefix,
        scopes=ak.scopes,
        is_active=ak.is_active,
        expires_at=ak.expires_at,
        created_at=ak.created_at,
        full_key=raw_key,
    )


@app.get(
    "/api/admin/api-keys",
    response_model=List[ApiKeyOut],
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def list_api_keys(
    db: AsyncSession = Depends(get_db),
    cu: CurrentUser = Depends(get_current_user),
):
    res = await db.execute(select(ApiKey).where(ApiKey.user_id == cu.id).order_by(ApiKey.created_at.desc()))
    return res.scalars().all()


@app.delete(
    "/api/admin/api-keys/{key_id}",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def revoke_api_key(
    key_id: int,
    db: AsyncSession = Depends(get_db),
    cu: CurrentUser = Depends(get_current_user),
):
    res = await db.execute(select(ApiKey).where(ApiKey.id == key_id, ApiKey.user_id == cu.id))
    ak = res.scalar_one_or_none()
    if not ak:
        raise HTTPException(status_code=404, detail="API key bulunamadı")
    ak.is_active = False
    await db.commit()
    return {"ok": True}


# ═══════════════════════════════════════════════════════════════════════════════
# Custom Domain (self-service for Growth / Enterprise)
# ═══════════════════════════════════════════════════════════════════════════════

class UpdateCustomDomainIn(BaseModel):
    custom_domain: Optional[str] = Field(default=None, max_length=253)


@app.get(
    "/api/admin/organization/domain",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def get_custom_domain(
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org_res = await db.execute(select(Organization).where(Organization.user_id == me.id))
    org = org_res.scalar_one_or_none()
    return {"custom_domain": org.custom_domain if org else None}


@app.put(
    "/api/admin/organization/domain",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def update_custom_domain(
    payload: UpdateCustomDomainIn,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Growth/Enterprise users can set their own custom domain."""
    if me.role != Role.superadmin:
        sub_cd = await db.execute(
            select(Subscription)
            .where(Subscription.user_id == me.id, Subscription.is_active == True)
            .order_by(Subscription.expires_at.desc()).limit(1)
        )
        sub_cd_row = sub_cd.scalar_one_or_none()
        now_cd = datetime.now(timezone.utc)
        if not sub_cd_row or sub_cd_row.plan_id not in ("growth", "enterprise") or \
                (sub_cd_row.expires_at and sub_cd_row.expires_at < now_cd):
            raise HTTPException(
                status_code=403,
                detail="Özel alan adı Growth ve Enterprise planlarında kullanılabilir.",
            )
    org_res = await db.execute(select(Organization).where(Organization.user_id == me.id))
    org = org_res.scalar_one_or_none()
    if org is None:
        org = Organization(user_id=me.id, org_name="", custom_domain=payload.custom_domain or None, brand_color="#6366f1")
        db.add(org)
    else:
        org.custom_domain = payload.custom_domain or None
    await db.commit()
    return {"custom_domain": payload.custom_domain or None}


# ═══════════════════════════════════════════════════════════════════════════════
# Webhooks
# ═══════════════════════════════════════════════════════════════════════════════

@app.post(
    "/api/admin/webhooks",
    response_model=WebhookEndpointOut,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def create_webhook(
    data: WebhookEndpointIn,
    db: AsyncSession = Depends(get_db),
    cu: CurrentUser = Depends(get_current_user),
):
    wh_secret = "whsec_" + secrets.token_hex(24)
    wh = WebhookEndpoint(
        user_id=cu.id,
        url=str(data.url),
        events=data.events,
        secret=wh_secret,
        is_active=True,
    )
    db.add(wh)
    await db.commit()
    await db.refresh(wh)
    return WebhookEndpointOut(
        id=wh.id,
        url=wh.url,
        events=wh.events,
        secret=wh.secret,
        is_active=wh.is_active,
        created_at=wh.created_at,
        last_fired_at=wh.last_fired_at,
    )


@app.get(
    "/api/admin/webhooks",
    response_model=List[WebhookEndpointOut],
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def list_webhooks(
    db: AsyncSession = Depends(get_db),
    cu: CurrentUser = Depends(get_current_user),
):
    res = await db.execute(
        select(WebhookEndpoint).where(WebhookEndpoint.user_id == cu.id).order_by(WebhookEndpoint.created_at.desc())
    )
    return res.scalars().all()


@app.delete(
    "/api/admin/webhooks/{wh_id}",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def delete_webhook(
    wh_id: int,
    db: AsyncSession = Depends(get_db),
    cu: CurrentUser = Depends(get_current_user),
):
    res = await db.execute(
        select(WebhookEndpoint).where(WebhookEndpoint.id == wh_id, WebhookEndpoint.user_id == cu.id)
    )
    wh = res.scalar_one_or_none()
    if not wh:
        raise HTTPException(status_code=404, detail="Webhook bulunamadı")
    await db.delete(wh)
    await db.commit()
    return {"ok": True}


@app.get(
    "/api/admin/webhooks/{wh_id}/deliveries",
    response_model=List[WebhookDeliveryOut],
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def webhook_deliveries(
    wh_id: int,
    db: AsyncSession = Depends(get_db),
    cu: CurrentUser = Depends(get_current_user),
):
    # ownership check
    res_wh = await db.execute(
        select(WebhookEndpoint).where(WebhookEndpoint.id == wh_id, WebhookEndpoint.user_id == cu.id)
    )
    if not res_wh.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Webhook bulunamadı")
    res = await db.execute(
        select(WebhookDelivery)
        .where(WebhookDelivery.endpoint_id == wh_id)
        .order_by(WebhookDelivery.delivered_at.desc())
        .limit(50)
    )
    return res.scalars().all()


# ═══════════════════════════════════════════════════════════════════════════════
# Organizations (white-label) – superadmin only
# ═══════════════════════════════════════════════════════════════════════════════

@app.post(
    "/api/superadmin/organizations",
    response_model=OrgOut,
    dependencies=[Depends(require_role(Role.superadmin))],
)
async def create_org(
    data: OrgIn,
    db: AsyncSession = Depends(get_db),
    cu: CurrentUser = Depends(get_current_user),
):
    # Lookup target user by id provided in data, or use cu.id if not provided
    target_user_id = data.user_id if hasattr(data, "user_id") and data.user_id else cu.id
    org = Organization(
        user_id=target_user_id,
        org_name=data.org_name,
        custom_domain=data.custom_domain,
        brand_logo=data.brand_logo,
        brand_color=data.brand_color,
    )
    db.add(org)
    await db.commit()
    await db.refresh(org)
    return org


@app.get(
    "/api/superadmin/organizations",
    response_model=List[OrgOut],
    dependencies=[Depends(require_role(Role.superadmin))],
)
async def list_orgs(db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Organization).order_by(Organization.created_at.desc()))
    return res.scalars().all()


@app.patch(
    "/api/superadmin/organizations/{org_id}",
    response_model=OrgOut,
    dependencies=[Depends(require_role(Role.superadmin))],
)
async def update_org(
    org_id: int,
    data: OrgIn,
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(Organization).where(Organization.id == org_id))
    org = res.scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=404, detail="Organizasyon bulunamadı")
    if data.org_name is not None:
        org.org_name = data.org_name
    if data.custom_domain is not None:
        org.custom_domain = data.custom_domain
    if data.brand_logo is not None:
        org.brand_logo = data.brand_logo
    if data.brand_color is not None:
        org.brand_color = data.brand_color
    await db.commit()
    await db.refresh(org)
    return org


@app.delete(
    "/api/superadmin/organizations/{org_id}",
    dependencies=[Depends(require_role(Role.superadmin))],
)
async def delete_org(org_id: int, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Organization).where(Organization.id == org_id))
    org = res.scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=404, detail="Organizasyon bulunamadı")
    await db.delete(org)
    await db.commit()
    return {"ok": True}


# ═══════════════════════════════════════════════════════════════════════════════
# Audit Logs – superadmin only
# ═══════════════════════════════════════════════════════════════════════════════

@app.get(
    "/api/superadmin/audit-logs",
    response_model=List[AuditLogOut],
    dependencies=[Depends(require_role(Role.superadmin))],
)
async def get_audit_logs(
    user_id: Optional[int] = None,
    action: Optional[str] = None,
    from_date: Optional[datetime] = None,
    to_date: Optional[datetime] = None,
    page: int = 1,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
):
    if page < 1 or limit < 1 or limit > 200:
        raise bad_request("Invalid page/limit")
    q = select(AuditLog)
    if user_id:
        q = q.where(AuditLog.user_id == user_id)
    if action:
        import re as _re
        safe_action = _re.sub(r"[^\w\s/\-]", "", action)[:128]
        q = q.where(AuditLog.action.ilike(f"%{safe_action}%"))
    if from_date:
        q = q.where(AuditLog.created_at >= from_date)
    if to_date:
        q = q.where(AuditLog.created_at <= to_date)
    q = q.order_by(AuditLog.created_at.desc()).offset((page - 1) * limit).limit(limit)
    res = await db.execute(q)
    return res.scalars().all()


# ═══════════════════════════════════════════════════════════════════════════════
# Bulk Certificate Action
# ═══════════════════════════════════════════════════════════════════════════════

@app.post(
    "/api/admin/events/{event_id}/certificates/bulk-action",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def bulk_certificate_action(
    event_id: int,
    payload: BulkActionIn,
    background_tasks: BackgroundTasks,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Verify event ownership
    q_event = select(Event).where(Event.id == event_id)
    if me.role != Role.superadmin:
        q_event = q_event.where(Event.admin_id == me.id)
    res_ev = await db.execute(q_event)
    ev = res_ev.scalar_one_or_none()
    if not ev:
        raise HTTPException(status_code=404, detail="Event not found")

    # Load certs that belong to this event
    res_certs = await db.execute(
        select(Certificate).where(
            Certificate.id.in_(payload.cert_ids),
            Certificate.event_id == event_id,
            Certificate.deleted_at.is_(None),
        )
    )
    certs = res_certs.scalars().all()
    if not certs:
        raise HTTPException(status_code=404, detail="No certificates found")

    processed = 0
    for cert in certs:
        if payload.action == "delete":
            cert.deleted_at = datetime.now(timezone.utc)
            # Cleanup PDF
            if cert.pdf_url:
                try:
                    pdf_path = local_path_from_url(cert.pdf_url)
                    if pdf_path.exists():
                        pdf_path.unlink(missing_ok=True)
                except Exception as exc:
                    logger.warning("Bulk delete PDF cleanup failed for cert %s: %s", cert.id, exc)
        elif payload.action == "revoke":
            cert.status = CertStatus.revoked
            if cert.pdf_url:
                try:
                    pdf_path = local_path_from_url(cert.pdf_url)
                    if pdf_path.exists():
                        pdf_path.unlink(missing_ok=True)
                except Exception as exc:
                    logger.warning("Bulk revoke PDF cleanup failed for cert %s: %s", cert.id, exc)
        elif payload.action == "expire":
            cert.status = CertStatus.expired
        processed += 1

    await db.commit()

    if payload.action == "revoke" and background_tasks:
        from .webhooks import deliver_webhook, WebhookEvent
        background_tasks.add_task(
            deliver_webhook, db, me.id, WebhookEvent.cert_bulk_completed.value,
            {"event_id": event_id, "action": "revoke", "count": processed},
        )

    return {"ok": True, "processed": processed, "action": payload.action}


# ═══════════════════════════════════════════════════════════════════════════════
# Certificate Export (CSV / XLSX)
# ═══════════════════════════════════════════════════════════════════════════════

@app.get(
    "/api/admin/events/{event_id}/certificates/export",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def export_certificates(
    event_id: int,
    format: str = Query(default="csv", pattern="^(csv|xlsx)$"),
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    q_event = select(Event).where(Event.id == event_id)
    if me.role != Role.superadmin:
        q_event = q_event.where(Event.admin_id == me.id)
    res_ev = await db.execute(q_event)
    ev = res_ev.scalar_one_or_none()
    if not ev:
        raise HTTPException(status_code=404, detail="Event not found")

    res = await db.execute(
        select(Certificate)
        .where(Certificate.event_id == event_id, Certificate.deleted_at.is_(None))
        .order_by(Certificate.created_at.asc())
    )
    certs = res.scalars().all()

    columns = ["public_id", "student_name", "status", "hosting_term", "issued_at", "hosting_ends_at", "uuid"]

    if format == "xlsx":
        import openpyxl
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Certificates"
        ws.append(columns)
        for c in certs:
            ws.append([
                c.public_id or "",
                c.student_name,
                c.status.value if c.status else "",
                getattr(c, "hosting_term", "") or "",
                getattr(c, "issued_at", None).isoformat() if getattr(c, "issued_at", None) else "",
                getattr(c, "hosting_ends_at", None).isoformat() if getattr(c, "hosting_ends_at", None) else "",
                c.uuid,
            ])
        buf = io.BytesIO()
        wb.save(buf)
        buf.seek(0)
        return StreamingResponse(
            buf,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename=certificates-event-{event_id}.xlsx"},
        )
    else:
        buf = io.StringIO()
        writer = csv.writer(buf)
        writer.writerow(columns)
        for c in certs:
            writer.writerow([
                c.public_id or "",
                c.student_name,
                c.status.value if c.status else "",
                getattr(c, "hosting_term", "") or "",
                getattr(c, "issued_at", None).isoformat() if getattr(c, "issued_at", None) else "",
                getattr(c, "hosting_ends_at", None).isoformat() if getattr(c, "hosting_ends_at", None) else "",
                c.uuid,
            ])
        return StreamingResponse(
            iter([buf.getvalue()]),
            media_type="text/csv; charset=utf-8",
            headers={"Content-Disposition": f"attachment; filename=certificates-event-{event_id}.csv"},
        )


# ═══════════════════════════════════════════════════════════════════════════════
# Dashboard Analytics
# ═══════════════════════════════════════════════════════════════════════════════

@app.get(
    "/api/admin/dashboard/stats",
    response_model=DashboardStatsOut,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def dashboard_stats(
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Get events for this user
    res_events = await db.execute(
        select(Event).where(Event.admin_id == me.id).order_by(Event.created_at.desc())
    )
    events = res_events.scalars().all()
    event_ids = [e.id for e in events]

    if not event_ids:
        return DashboardStatsOut(
            total_events=0, total_certs=0, active_certs=0, revoked_certs=0,
            expired_certs=0, total_spent_hc=0, events_with_stats=[],
        )

    # Aggregate cert counts by status per event
    from sqlalchemy import case as sa_case
    agg_res = await db.execute(
        select(
            Certificate.event_id,
            func.count(Certificate.id).label("total"),
            func.sum(sa_case((Certificate.status == CertStatus.active, 1), else_=0)).label("active"),
            func.sum(sa_case((Certificate.status == CertStatus.revoked, 1), else_=0)).label("revoked"),
            func.sum(sa_case((Certificate.status == CertStatus.expired, 1), else_=0)).label("expired"),
        )
        .where(Certificate.event_id.in_(event_ids), Certificate.deleted_at.is_(None))
        .group_by(Certificate.event_id)
    )
    agg_rows = agg_res.all()
    event_stats_map: Dict[int, Dict] = {r.event_id: r._asdict() for r in agg_rows}

    # Total HC spent
    tx_res = await db.execute(
        select(func.coalesce(func.sum(Transaction.amount), 0))
        .where(Transaction.user_id == me.id, Transaction.type == TxType.spend)
    )
    total_spent = int(tx_res.scalar_one() or 0)

    total_certs = sum(r["total"] for r in event_stats_map.values())
    active_certs = sum(int(r["active"] or 0) for r in event_stats_map.values())
    revoked_certs = sum(int(r["revoked"] or 0) for r in event_stats_map.values())
    expired_certs = sum(int(r["expired"] or 0) for r in event_stats_map.values())

    event_name_map = {e.id: e.name for e in events}
    events_with_stats = [
        {
            "event_id": ev_id,
            "name": event_name_map.get(ev_id, ""),
            "cert_count": stats["total"],
            "active_count": int(stats["active"] or 0),
            "revoked_count": int(stats["revoked"] or 0),
            "expired_count": int(stats["expired"] or 0),
        }
        for ev_id, stats in event_stats_map.items()
    ]

    return DashboardStatsOut(
        total_events=len(events),
        total_certs=total_certs,
        active_certs=active_certs,
        revoked_certs=revoked_certs,
        expired_certs=expired_certs,
        total_spent_hc=total_spent,
        events_with_stats=events_with_stats,
    )


# ═══════════════════════════════════════════════════════════════════════════════
# Superadmin System Health
# ═══════════════════════════════════════════════════════════════════════════════

@app.get(
    "/api/superadmin/system-health",
    dependencies=[Depends(require_role(Role.superadmin))],
)
async def system_health(db: AsyncSession = Depends(get_db)):
    import shutil
    from sqlalchemy import text as sa_text

    # Disk usage
    try:
        disk = shutil.disk_usage(settings.local_storage_dir)
        disk_info = {
            "total_bytes": disk.total,
            "used_bytes": disk.used,
            "free_bytes": disk.free,
            "used_pct": round(disk.used / disk.total * 100, 1) if disk.total else 0,
        }
    except Exception:
        disk_info = {}

    # DB size
    try:
        db_size_res = await db.execute(sa_text("SELECT pg_database_size(current_database())"))
        db_size_bytes = int(db_size_res.scalar_one() or 0)
    except Exception:
        db_size_bytes = 0

    # Active DB connections
    try:
        conn_res = await db.execute(sa_text("SELECT count(*) FROM pg_stat_activity"))
        active_connections = int(conn_res.scalar_one() or 0)
    except Exception:
        active_connections = 0

    # Recent activity (last 24h audit log count)
    try:
        activity_res = await db.execute(
            select(func.count()).select_from(AuditLog)
            .where(AuditLog.created_at >= datetime.now(timezone.utc) - timedelta(hours=24))
        )
        recent_actions = int(activity_res.scalar_one() or 0)
    except Exception:
        recent_actions = 0

    # Totals
    try:
        user_res = await db.execute(select(func.count()).select_from(User))
        total_users = int(user_res.scalar_one() or 0)
        cert_res = await db.execute(
            select(func.count()).select_from(Certificate).where(Certificate.deleted_at.is_(None))
        )
        total_certs = int(cert_res.scalar_one() or 0)
    except Exception:
        total_users = 0
        total_certs = 0

    return {
        "uptime_seconds": round(time.time() - _startup_time),
        "disk_total_gb":  round(disk_info.get("total_bytes", 0) / (1024 ** 3), 2),
        "disk_used_gb":   round(disk_info.get("used_bytes",  0) / (1024 ** 3), 2),
        "disk_free_gb":   round(disk_info.get("free_bytes",  0) / (1024 ** 3), 2),
        "disk_percent":   disk_info.get("used_pct", 0),
        "db_size_mb":     round(db_size_bytes / (1024 ** 2), 2),
        "db_active_connections": active_connections,
        "recent_24h_actions": recent_actions,
        "total_users": total_users,
        "total_certs": total_certs,
    }


# ═══════════════════════════════════════════════════════════════════════════════
# Superadmin Subscription Management
# ═══════════════════════════════════════════════════════════════════════════════

class GrantSubscriptionIn(BaseModel):
    user_email: str
    plan_id: str
    days: int = 365


@app.get(
    "/api/superadmin/subscriptions",
    dependencies=[Depends(require_role(Role.superadmin))],
)
async def list_all_subscriptions(db: AsyncSession = Depends(get_db)):
    res = await db.execute(
        select(Subscription, User.email)
        .join(User, User.id == Subscription.user_id)
        .order_by(Subscription.started_at.desc())
        .limit(500)
    )
    rows = res.all()
    return [
        {
            "id": sub.id,
            "user_id": sub.user_id,
            "user_email": email,
            "plan_id": sub.plan_id,
            "order_id": sub.order_id,
            "started_at": sub.started_at.isoformat() if sub.started_at else None,
            "expires_at": sub.expires_at.isoformat() if sub.expires_at else None,
            "is_active": sub.is_active,
        }
        for sub, email in rows
    ]


@app.post(
    "/api/superadmin/subscriptions/grant",
    dependencies=[Depends(require_role(Role.superadmin))],
    status_code=201,
)
async def grant_subscription(payload: GrantSubscriptionIn, db: AsyncSession = Depends(get_db)):
    # Find user by email
    user_res = await db.execute(select(User).where(User.email == payload.user_email))
    user = user_res.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı.")

    # Validate plan_id
    valid_plans = [t["id"] for t in DEFAULT_PRICING]
    if payload.plan_id not in valid_plans:
        raise HTTPException(status_code=400, detail=f"Geçersiz plan. Geçerli planlar: {', '.join(valid_plans)}")

    # Deactivate all existing active subscriptions for this user
    await db.execute(
        update(Subscription)
        .where(Subscription.user_id == user.id, Subscription.is_active == True)
        .values(is_active=False)
    )

    now = datetime.now(timezone.utc)
    new_sub = Subscription(
        user_id=user.id,
        plan_id=payload.plan_id,
        order_id=None,
        started_at=now,
        expires_at=now + timedelta(days=payload.days),
        is_active=True,
    )
    new_sub.last_hc_credited_at = datetime.now(timezone.utc)
    db.add(new_sub)
    # Credit initial HC quota immediately
    hc_quota_grant = _get_hc_quota(payload.plan_id)
    if hc_quota_grant:
        user.heptacoin_balance += hc_quota_grant
        db.add(Transaction(
            user_id=user.id, amount=hc_quota_grant, type=TxType.credit,
            description=f"Superadmin plan aktivasyonu: {payload.plan_id}",
        ))
    await db.commit()
    await db.refresh(new_sub)

    return {
        "id": new_sub.id,
        "user_id": new_sub.user_id,
        "user_email": user.email,
        "plan_id": new_sub.plan_id,
        "started_at": new_sub.started_at.isoformat() if new_sub.started_at else None,
        "expires_at": new_sub.expires_at.isoformat() if new_sub.expires_at else None,
        "is_active": new_sub.is_active,
    }


@app.delete(
    "/api/superadmin/subscriptions/{sub_id}",
    dependencies=[Depends(require_role(Role.superadmin))],
)
async def revoke_subscription(sub_id: int, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Subscription).where(Subscription.id == sub_id))
    sub = res.scalar_one_or_none()
    if not sub:
        raise HTTPException(status_code=404, detail="Abonelik bulunamadı.")
    sub.is_active = False
    await db.commit()
    return {"detail": "Abonelik iptal edildi."}


# ═══════════════════════════════════════════════════════════════════════════════
# Magic Link Authentication
# ═══════════════════════════════════════════════════════════════════════════════

@app.post("/api/auth/magic-link")
@limiter.limit("3/minute")
async def request_magic_link(
    request: Request,
    data: MagicLinkIn,
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(User).where(User.email == str(data.email)))
    user = res.scalar_one_or_none()
    # Always 200 to avoid enumeration
    if user and user.is_verified:
        token = make_email_token({"email": str(data.email), "action": "magic_link"})
        user.magic_link_token = token
        await db.commit()

        verify_link = f"{settings.frontend_base_url}/admin/magic-verify?token={token}"
        await send_email_async(
            to=str(data.email),
            subject="HeptaCert — Giriş Bağlantısı",
            html_body=f"""
            <p>Merhaba,</p>
            <p>HeptaCert'e giriş yapmak için aşağıdaki bağlantıya tıklayın:</p>
            <p><a href="{verify_link}" style="background:#6366f1;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block">Giriş Yap →</a></p>
            <p>Bu bağlantı 15 dakika geçerlidir.</p>
            <p>Eğer bu isteği siz yapmadıysanız, bu e-postayı görmezden gelebilirsiniz.</p>
            """,
        )
    return {"detail": "Giriş bağlantısı e-posta adresinize gönderildi."}


@app.get("/api/auth/magic-link/verify")
async def verify_magic_link(
    token: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    try:
        payload = verify_email_token(token, max_age=900)  # 15 minutes
    except SignatureExpired:
        raise bad_request("Giriş bağlantısının süresi dolmuş. Lütfen yeni bir bağlantı isteyin.")
    except (BadSignature, Exception):
        raise bad_request("Geçersiz giriş bağlantısı.")

    if payload.get("action") != "magic_link":
        raise bad_request("Geçersiz token türü.")

    email = payload.get("email")
    res = await db.execute(select(User).where(User.email == email))
    user = res.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı.")
    if not user.is_verified:
        raise bad_request("Hesabınız henüz doğrulanmamış.")

    # Invalidate token after use
    user.magic_link_token = None
    await db.commit()

    return TokenOut(
        access_token=create_access_token(user_id=user.id, role=user.role),
        token_type="bearer",
    )


# ═══════════════════════════════════════════════════════════════════════════════
# Template History
# ═══════════════════════════════════════════════════════════════════════════════

@app.get(
    "/api/admin/events/{event_id}/template-history",
    response_model=List[TemplateSnapshotOut],
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def get_template_history(
    event_id: int,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    q_event = select(Event).where(Event.id == event_id)
    if me.role != Role.superadmin:
        q_event = q_event.where(Event.admin_id == me.id)
    res_ev = await db.execute(q_event)
    if not res_ev.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Event not found")

    res = await db.execute(
        select(EventTemplateSnapshot)
        .where(EventTemplateSnapshot.event_id == event_id)
        .order_by(EventTemplateSnapshot.created_at.desc())
        .limit(10)
    )
    return res.scalars().all()


@app.post(
    "/api/admin/events/{event_id}/template-history/{snap_id}/restore",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def restore_template_snapshot(
    event_id: int,
    snap_id: int,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    q_event = select(Event).where(Event.id == event_id)
    if me.role != Role.superadmin:
        q_event = q_event.where(Event.admin_id == me.id)
    res_ev = await db.execute(q_event)
    ev = res_ev.scalar_one_or_none()
    if not ev:
        raise HTTPException(status_code=404, detail="Event not found")

    res_snap = await db.execute(
        select(EventTemplateSnapshot).where(
            EventTemplateSnapshot.id == snap_id,
            EventTemplateSnapshot.event_id == event_id,
        )
    )
    snap = res_snap.scalar_one_or_none()
    if not snap:
        raise HTTPException(status_code=404, detail="Snapshot not found")

    # Save current state as new snapshot before restoring
    current_snap = EventTemplateSnapshot(
        event_id=event_id,
        template_image_url=ev.template_image_url,
        config=ev.config,
        created_by=me.id,
    )
    db.add(current_snap)

    if snap.template_image_url:
        ev.template_image_url = snap.template_image_url
    if snap.config:
        ev.config = snap.config
    await db.commit()
    return {"ok": True, "restored_snapshot_id": snap_id}


# ═══════════════════════════════════════════════════════════════════════════════
# Attendance Management
# ═══════════════════════════════════════════════════════════════════════════════

# ── Pydantic schemas for attendance ────────────────────────────────────────

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
    attendance_count: int = 0


class AttendeeImportRow(BaseModel):
    name: str
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


class SelfRegisterIn(BaseModel):
    name: str = Field(min_length=2, max_length=200)
    email: EmailStr


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


# ── Helper: resolve event + ownership ───────────────────────────────────────

async def _get_event_for_admin(event_id: int, me: CurrentUser, db: AsyncSession) -> Event:
    res = await db.execute(select(Event).where(Event.id == event_id, Event.admin_id == me.id))
    ev = res.scalar_one_or_none()
    if not ev:
        raise HTTPException(status_code=404, detail="Event not found")
    return ev


def _session_to_out(s: EventSession, attendance_count: int = 0) -> SessionOut:
    start_str = s.session_start.strftime("%H:%M") if s.session_start else None
    return SessionOut(
        id=s.id,
        event_id=s.event_id,
        name=s.name,
        session_date=s.session_date.isoformat() if s.session_date else None,
        session_start=start_str,
        session_location=s.session_location,
        checkin_token=s.checkin_token,
        is_active=s.is_active,
        created_at=s.created_at,
        attendance_count=attendance_count,
    )


# ── Public: event info & self-register ──────────────────────────────────────

@app.get("/api/events/{event_id}/info")
async def public_event_info(event_id: int, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Event).where(Event.id == event_id))
    ev = res.scalar_one_or_none()
    if not ev:
        raise HTTPException(status_code=404, detail="Event not found")
    sess_res = await db.execute(
        select(EventSession).where(EventSession.event_id == event_id).order_by(EventSession.session_date, EventSession.session_start)
    )
    sessions = sess_res.scalars().all()
    return {
        "id": ev.id,
        "name": ev.name,
        "event_date": ev.event_date.isoformat() if ev.event_date else None,
        "event_description": ev.event_description,
        "event_location": ev.event_location,
        "min_sessions_required": ev.min_sessions_required,
        "event_banner_url": ev.event_banner_url,
        "sessions": [
            {
                "id": s.id,
                "name": s.name,
                "session_date": s.session_date.isoformat() if s.session_date else None,
                "session_start": s.session_start.strftime("%H:%M") if s.session_start else None,
                "session_location": s.session_location,
            }
            for s in sessions
        ],
    }


@app.post("/api/events/{event_id}/register", status_code=201)
@limiter.limit("10/minute")
async def public_event_register(
    request: Request,
    event_id: int,
    payload: SelfRegisterIn,
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(Event).where(Event.id == event_id))
    ev = res.scalar_one_or_none()
    if not ev:
        raise HTTPException(status_code=404, detail="Event not found")
    # Check duplicate
    existing = await db.execute(
        select(Attendee).where(Attendee.event_id == event_id, func.lower(Attendee.email) == payload.email.lower())
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Bu e-posta ile zaten kaydolunmuş")
    attendee = Attendee(
        event_id=event_id,
        name=payload.name,
        email=payload.email.lower(),
        source="self_register",
    )
    db.add(attendee)
    await db.commit()
    return {"ok": True, "message": "Kayıt başarılı", "attendee_id": attendee.id}


# ── Public: QR check-in ─────────────────────────────────────────────────
API_AUDIT_SKIP_PREFIXES_EXTENDED = ("/api/attend/", "/api/events/")

@app.get("/api/attend/{checkin_token}")
async def get_session_by_token(checkin_token: str, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(EventSession).where(EventSession.checkin_token == checkin_token))
    session = res.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Geçersiz QR kodu")
    ev_res = await db.execute(select(Event).where(Event.id == session.event_id))
    ev = ev_res.scalar_one()
    count_res = await db.execute(
        select(func.count()).where(AttendanceRecord.session_id == session.id)
    )
    count = int(count_res.scalar_one() or 0)
    return {
        "session_id": session.id,
        "session_name": session.name,
        "session_date": session.session_date.isoformat() if session.session_date else None,
        "session_start": session.session_start.strftime("%H:%M") if session.session_start else None,
        "session_location": session.session_location,
        "is_active": session.is_active,
        "event_id": ev.id,
        "event_name": ev.name,
        "event_date": ev.event_date.isoformat() if ev.event_date else None,
        "min_sessions_required": ev.min_sessions_required,
        "attendance_count": count,
    }


@app.post("/api/attend/{checkin_token}", response_model=CheckinOut)
@limiter.limit("15/minute")
async def self_checkin(
    checkin_token: str,
    payload: CheckinIn,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    sess_res = await db.execute(select(EventSession).where(EventSession.checkin_token == checkin_token))
    session = sess_res.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Geçersiz QR kodu")
    if not session.is_active:
        raise HTTPException(status_code=403, detail="Bu oturum için check-in kapalı")

    ev_res = await db.execute(select(Event).where(Event.id == session.event_id))
    ev = ev_res.scalar_one()

    att_res = await db.execute(
        select(Attendee).where(
            Attendee.event_id == ev.id,
            func.lower(Attendee.email) == payload.email.lower(),
        )
    )
    attendee = att_res.scalar_one_or_none()
    if not attendee:
        raise HTTPException(
            status_code=404,
            detail="Bu e-posta ile etkinlikte kayıtlı değilsiniz. Lütfen önce kayıt olun.",
        )

    # Check duplicate
    dup_res = await db.execute(
        select(AttendanceRecord).where(
            AttendanceRecord.attendee_id == attendee.id,
            AttendanceRecord.session_id == session.id,
        )
    )
    if dup_res.scalar_one_or_none():
        attended_res = await db.execute(
            select(func.count()).where(AttendanceRecord.attendee_id == attendee.id)
        )
        attended_count = int(attended_res.scalar_one() or 0)
        total_sess_res = await db.execute(
            select(func.count()).where(EventSession.event_id == ev.id)
        )
        total_sessions = int(total_sess_res.scalar_one() or 0)
        return CheckinOut(
            success=False,
            message="Bu oturuma zaten check-in yaptınız.",
            attendee_name=attendee.name,
            sessions_attended=attended_count,
            sessions_required=ev.min_sessions_required,
            total_sessions=total_sessions,
        )

    ip = request.headers.get("X-Forwarded-For", request.client.host if request.client else None)
    record = AttendanceRecord(
        attendee_id=attendee.id,
        session_id=session.id,
        ip_address=ip,
    )
    db.add(record)
    await db.commit()

    attended_res = await db.execute(
        select(func.count()).where(AttendanceRecord.attendee_id == attendee.id)
    )
    attended_count = int(attended_res.scalar_one() or 0)
    total_sess_res = await db.execute(
        select(func.count()).where(EventSession.event_id == ev.id)
    )
    total_sessions = int(total_sess_res.scalar_one() or 0)

    return CheckinOut(
        success=True,
        message=f"Check-in başarılı! Hoş geldiniz, {attendee.name}.",
        attendee_name=attendee.name,
        sessions_attended=attended_count,
        sessions_required=ev.min_sessions_required,
        total_sessions=total_sessions,
    )


# ── Admin: Sessions ────────────────────────────────────────────────────────────────

@app.get("/api/admin/events/{event_id}/sessions", dependencies=[Depends(require_role(Role.admin, Role.superadmin)), Depends(require_paid_plan)])
async def list_sessions(
    event_id: int,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_event_for_admin(event_id, me, db)
    res = await db.execute(
        select(EventSession).where(EventSession.event_id == event_id).order_by(EventSession.session_date, EventSession.session_start, EventSession.id)
    )
    sessions = res.scalars().all()
    results = []
    for s in sessions:
        cnt_res = await db.execute(select(func.count()).where(AttendanceRecord.session_id == s.id))
        cnt = int(cnt_res.scalar_one() or 0)
        results.append(_session_to_out(s, cnt))
    return results


@app.post("/api/admin/events/{event_id}/sessions", status_code=201, dependencies=[Depends(require_role(Role.admin, Role.superadmin)), Depends(require_paid_plan)])
async def create_session(
    event_id: int,
    payload: SessionCreateIn,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_event_for_admin(event_id, me, db)
    from datetime import date as _date, time as _time
    sd = _date.fromisoformat(payload.session_date) if payload.session_date else None
    st = None
    if payload.session_start:
        parts = payload.session_start.split(":")
        st = _time(int(parts[0]), int(parts[1]))
    session = EventSession(
        event_id=event_id,
        name=payload.name,
        session_date=sd,
        session_start=st,
        session_location=payload.session_location,
        checkin_token=str(_uuid_module.uuid4()).replace("-", ""),
        is_active=False,
    )
    db.add(session)
    await db.commit()
    return _session_to_out(session, 0)


@app.patch("/api/admin/events/{event_id}/sessions/{session_id}", dependencies=[Depends(require_role(Role.admin, Role.superadmin)), Depends(require_paid_plan)])
async def update_session(
    event_id: int,
    session_id: int,
    payload: SessionCreateIn,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_event_for_admin(event_id, me, db)
    res = await db.execute(select(EventSession).where(EventSession.id == session_id, EventSession.event_id == event_id))
    session = res.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    from datetime import date as _date, time as _time
    session.name = payload.name
    if payload.session_date is not None:
        session.session_date = _date.fromisoformat(payload.session_date) if payload.session_date else None
    if payload.session_start is not None:
        parts = payload.session_start.split(":")
        session.session_start = _time(int(parts[0]), int(parts[1])) if payload.session_start else None
    if payload.session_location is not None:
        session.session_location = payload.session_location
    await db.commit()
    cnt_res = await db.execute(select(func.count()).where(AttendanceRecord.session_id == session.id))
    cnt = int(cnt_res.scalar_one() or 0)
    return _session_to_out(session, cnt)


@app.delete("/api/admin/events/{event_id}/sessions/{session_id}", dependencies=[Depends(require_role(Role.admin, Role.superadmin)), Depends(require_paid_plan)])
async def delete_session(
    event_id: int,
    session_id: int,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_event_for_admin(event_id, me, db)
    res = await db.execute(select(EventSession).where(EventSession.id == session_id, EventSession.event_id == event_id))
    session = res.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    await db.delete(session)
    await db.commit()
    return {"ok": True}


@app.patch("/api/admin/events/{event_id}/sessions/{session_id}/toggle", dependencies=[Depends(require_role(Role.admin, Role.superadmin)), Depends(require_paid_plan)])
async def toggle_session_checkin(
    event_id: int,
    session_id: int,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_event_for_admin(event_id, me, db)
    res = await db.execute(select(EventSession).where(EventSession.id == session_id, EventSession.event_id == event_id))
    session = res.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    session.is_active = not session.is_active
    await db.commit()
    cnt_res = await db.execute(select(func.count()).where(AttendanceRecord.session_id == session.id))
    cnt = int(cnt_res.scalar_one() or 0)
    return _session_to_out(session, cnt)


@app.get("/api/admin/events/{event_id}/sessions/{session_id}/qr", dependencies=[Depends(require_role(Role.admin, Role.superadmin)), Depends(require_paid_plan)])
async def get_session_qr(
    event_id: int,
    session_id: int,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_event_for_admin(event_id, me, db)
    res = await db.execute(select(EventSession).where(EventSession.id == session_id, EventSession.event_id == event_id))
    session = res.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    checkin_url = f"{settings.frontend_base_url}/attend/{session.checkin_token}"
    qr = qrcode.QRCode(version=2, error_correction=qrcode.constants.ERROR_CORRECT_M, box_size=10, border=4)
    qr.add_data(checkin_url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    from fastapi.responses import Response
    return Response(content=buf.getvalue(), media_type="image/png", headers={"X-Checkin-URL": checkin_url})


# ── Admin: Attendees ────────────────────────────────────────────────────────────────

@app.get("/api/admin/events/{event_id}/attendees", dependencies=[Depends(require_role(Role.admin, Role.superadmin)), Depends(require_paid_plan)])
async def list_attendees(
    event_id: int,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=50, le=500),
    search: str = Query(default=""),
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ev = await _get_event_for_admin(event_id, me, db)
    q = select(Attendee).where(Attendee.event_id == event_id)
    if search:
        like = f"%{search.lower()}%"
        from sqlalchemy import or_
        q = q.where(or_(func.lower(Attendee.name).like(like), func.lower(Attendee.email).like(like)))
    total_res = await db.execute(select(func.count()).select_from(q.subquery()))
    total = int(total_res.scalar_one() or 0)
    q = q.order_by(Attendee.registered_at.desc()).offset((page - 1) * limit).limit(limit)
    res = await db.execute(q)
    attendees = res.scalars().all()

    # Get session counts per attendee
    results = []
    for a in attendees:
        cnt_res = await db.execute(select(func.count()).where(AttendanceRecord.attendee_id == a.id))
        cnt = int(cnt_res.scalar_one() or 0)
        # Check if has certificate
        cert_res = await db.execute(
            select(Certificate).where(
                Certificate.event_id == event_id,
                Certificate.student_name == a.name,
                Certificate.deleted_at.is_(None),
            )
        )
        has_cert = cert_res.scalar_one_or_none() is not None
        results.append(AttendeeOut(
            id=a.id,
            event_id=a.event_id,
            name=a.name,
            email=a.email,
            source=a.source,
            registered_at=a.registered_at,
            sessions_attended=cnt,
            has_certificate=has_cert,
        ))
    return {"items": results, "total": total, "page": page, "limit": limit}


@app.get(
    "/api/admin/events/{event_id}/attendees/filter-for-email",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin)), Depends(require_paid_plan)],
)
async def filter_attendees_for_email(
    event_id: int,
    filter_type: str = Query(default="all"),  # all | with_email | unsubscribed | certified
    subscribed_only: bool = Query(default=True),
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get filtered attendees for email targeting.
    
    Filter types:
    - all: all attendees
    - with_email: attendees with valid emails
    - unsubscribed: attendees who unsubscribed
    - certified: attendees with certificates
    """
    ev = await _get_event_for_admin(event_id, me, db)
    
    q = select(Attendee).where(Attendee.event_id == event_id)
    
    # Apply filters
    if filter_type == "with_email":
        q = q.where(Attendee.email.isnot(None), Attendee.email != "")
    elif filter_type == "unsubscribed":
        q = q.where(Attendee.unsubscribed_at.isnot(None))
    elif filter_type == "certified":
        # Join with certificates
        from sqlalchemy import exists
        cert_subq = select(Certificate).where(
            Certificate.event_id == event_id,
            Certificate.deleted_at.is_(None),
            Certificate.student_name == Attendee.name
        )
        q = q.where(exists(cert_subq))
    
    if subscribed_only and filter_type != "unsubscribed":
        q = q.where(Attendee.unsubscribed_at.is_(None))
    
    res = await db.execute(q.order_by(Attendee.registered_at.desc()))
    attendees = res.scalars().all()
    
    return {
        "filter_type": filter_type,
        "count": len(attendees),
        "attendees": [
            {
                "id": a.id,
                "name": a.name,
                "email": a.email,
                "unsubscribed": a.unsubscribed_at is not None,
            }
            for a in attendees
        ],
    }


@app.post("/api/admin/events/{event_id}/attendees/import", dependencies=[Depends(require_role(Role.admin, Role.superadmin)), Depends(require_paid_plan)])
async def import_attendees(
    event_id: int,
    file: UploadFile = File(...),
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_event_for_admin(event_id, me, db)
    content = await file.read()
    try:
        if file.filename and file.filename.endswith(".csv"):
            df = pd.read_csv(io.BytesIO(content))
        else:
            df = pd.read_excel(io.BytesIO(content))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Dosya okunamadı: {e}")

    # Find name and email columns (case-insensitive)
    col_map = {c.lower(): c for c in df.columns}
    name_col = col_map.get("name") or col_map.get("ad") or col_map.get("isim")
    email_col = col_map.get("email") or col_map.get("e-posta") or col_map.get("eposta")
    if not name_col or not email_col:
        raise HTTPException(status_code=400, detail="'name' ve 'email' kolonları gerekli")

    added = 0
    skipped = 0
    errors = []
    for _, row in df.iterrows():
        raw_name = str(row[name_col]).strip() if pd.notna(row[name_col]) else ""
        raw_email = str(row[email_col]).strip().lower() if pd.notna(row[email_col]) else ""
        if not raw_name or not raw_email or "@" not in raw_email:
            skipped += 1
            continue
        existing = await db.execute(
            select(Attendee).where(Attendee.event_id == event_id, func.lower(Attendee.email) == raw_email)
        )
        if existing.scalar_one_or_none():
            skipped += 1
            continue
        db.add(Attendee(event_id=event_id, name=raw_name, email=raw_email, source="import"))
        added += 1
        if added % 100 == 0:
            await db.flush()

    await db.commit()
    return {"added": added, "skipped": skipped}


@app.delete(
    "/api/admin/events/{event_id}/attendees/{attendee_id}",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin)), Depends(require_paid_plan)],
)
async def delete_attendee(
    event_id: int,
    attendee_id: int,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_event_for_admin(event_id, me, db)
    res = await db.execute(select(Attendee).where(Attendee.id == attendee_id, Attendee.event_id == event_id))
    att = res.scalar_one_or_none()
    if not att:
        raise HTTPException(status_code=404, detail="Attendee not found")
    await db.delete(att)
    await db.commit()
    return {"ok": True}


# ── Admin: Attendance matrix & manual check-in ───────────────────────────────

@app.get("/api/admin/events/{event_id}/attendance", dependencies=[Depends(require_role(Role.admin, Role.superadmin)), Depends(require_paid_plan)])
async def get_attendance_matrix(
    event_id: int,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ev = await _get_event_for_admin(event_id, me, db)
    sess_res = await db.execute(
        select(EventSession).where(EventSession.event_id == event_id).order_by(EventSession.session_date, EventSession.session_start, EventSession.id)
    )
    sessions = sess_res.scalars().all()
    att_res = await db.execute(select(Attendee).where(Attendee.event_id == event_id).order_by(Attendee.name))
    attendees = att_res.scalars().all()

    # Build set of (attendee_id, session_id) for O(1) lookup
    rec_res = await db.execute(
        select(AttendanceRecord.attendee_id, AttendanceRecord.session_id, AttendanceRecord.checked_in_at).where(
            AttendanceRecord.attendee_id.in_([a.id for a in attendees])
        )
    )
    records = rec_res.all()
    rec_set: dict[tuple, str] = {(r.attendee_id, r.session_id): r.checked_in_at.isoformat() for r in records}

    session_ids = [s.id for s in sessions]
    rows = []
    for a in attendees:
        sessions_attended = sum(1 for sid in session_ids if (a.id, sid) in rec_set)
        meets_threshold = sessions_attended >= ev.min_sessions_required
        cert_res = await db.execute(
            select(Certificate).where(
                Certificate.event_id == event_id,
                Certificate.student_name == a.name,
                Certificate.deleted_at.is_(None),
            )
        )
        cert = cert_res.scalar_one_or_none()
        rows.append({
            "attendee_id": a.id,
            "name": a.name,
            "email": a.email,
            "source": a.source,
            "sessions_attended": sessions_attended,
            "meets_threshold": meets_threshold,
            "has_certificate": cert is not None,
            "certificate_uuid": cert.uuid if cert else None,
            "checkins": {str(sid): rec_set.get((a.id, sid)) for sid in session_ids},
        })
    return {
        "event_id": event_id,
        "min_sessions_required": ev.min_sessions_required,
        "sessions": [{"id": s.id, "name": s.name, "session_date": s.session_date.isoformat() if s.session_date else None} for s in sessions],
        "rows": rows,
    }


@app.post(
    "/api/admin/events/{event_id}/sessions/{session_id}/checkin",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin)), Depends(require_paid_plan)],
)
async def admin_manual_checkin(
    event_id: int,
    session_id: int,
    payload: CheckinIn,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ev = await _get_event_for_admin(event_id, me, db)
    sess_res = await db.execute(select(EventSession).where(EventSession.id == session_id, EventSession.event_id == event_id))
    session = sess_res.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    att_res = await db.execute(
        select(Attendee).where(Attendee.event_id == event_id, func.lower(Attendee.email) == payload.email.lower())
    )
    attendee = att_res.scalar_one_or_none()
    if not attendee:
        raise HTTPException(status_code=404, detail="Katılımcı bulunamadı")
    dup = await db.execute(
        select(AttendanceRecord).where(AttendanceRecord.attendee_id == attendee.id, AttendanceRecord.session_id == session.id)
    )
    if dup.scalar_one_or_none():
        return {"ok": False, "message": "Zaten check-in yapılmış"}
    db.add(AttendanceRecord(attendee_id=attendee.id, session_id=session.id))
    await db.commit()
    return {"ok": True, "message": f"{attendee.name} check-in başarılı"}


@app.get(
    "/api/admin/events/{event_id}/attendance/export",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin)), Depends(require_paid_plan)],
)
async def export_attendance(
    event_id: int,
    fmt: str = Query(default="xlsx", pattern="^(xlsx|csv)$"),
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ev = await _get_event_for_admin(event_id, me, db)
    sess_res = await db.execute(
        select(EventSession).where(EventSession.event_id == event_id).order_by(EventSession.session_date, EventSession.id)
    )
    sessions = sess_res.scalars().all()
    att_res = await db.execute(select(Attendee).where(Attendee.event_id == event_id).order_by(Attendee.name))
    attendees = att_res.scalars().all()
    rec_res = await db.execute(
        select(AttendanceRecord.attendee_id, AttendanceRecord.session_id).where(
            AttendanceRecord.attendee_id.in_([a.id for a in attendees])
        )
    )
    rec_set = set((r.attendee_id, r.session_id) for r in rec_res.all())

    import openpyxl
    rows = []
    for a in attendees:
        row = {"Ad Soyad": a.name, "E-posta": a.email, "Kaynak": a.source}
        for s in sessions:
            row[s.name] = "✓" if (a.id, s.id) in rec_set else "✗"
        row["Katılınan Oturum"] = sum(1 for s in sessions if (a.id, s.id) in rec_set)
        row["Eşiği Geçiyor"] = "Evet" if row["Katılınan Oturum"] >= ev.min_sessions_required else "Hayır"
        rows.append(row)

    df = pd.DataFrame(rows)
    buf = io.BytesIO()
    if fmt == "csv":
        df.to_csv(buf, index=False)
        buf.seek(0)
        return StreamingResponse(buf, media_type="text/csv", headers={"Content-Disposition": f'attachment; filename="attendance_{event_id}.csv"'})
    else:
        df.to_excel(buf, index=False)
        buf.seek(0)
        return StreamingResponse(
            buf,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f'attachment; filename="attendance_{event_id}.xlsx"'},
        )


# ── Admin: Bulk certify ─────────────────────────────────────────────────────────────────

class BulkCertifyIn(BaseModel):
    hosting_term: str = Field(default="yearly", pattern="^(monthly|yearly)$")


@app.post(
    "/api/admin/events/{event_id}/bulk-certify",
    response_model=BulkCertifyOut,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin)), Depends(require_paid_plan)],
)
async def bulk_certify_attendees(
    event_id: int,
    payload: BulkCertifyIn,
    background_tasks: BackgroundTasks,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from .generator import render_certificate_pdf, new_certificate_uuid, TemplateConfig

    ev = await _get_event_for_admin(event_id, me, db)
    if not ev.config or ev.template_image_url in ("", "placeholder"):
        raise HTTPException(status_code=400, detail="Etkinlik şablon yapılandırması eksik")

    # Fetch all attendees
    att_res = await db.execute(select(Attendee).where(Attendee.event_id == event_id))
    attendees = att_res.scalars().all()
    if not attendees:
        raise HTTPException(status_code=400, detail="Katılımcı listesi boş")

    # Determine hologram policy: only Growth/Enterprise can disable it
    _allow_no_hologram = me.role == Role.superadmin
    if not _allow_no_hologram:
        _sub_hb = await db.execute(
            select(Subscription)
            .where(Subscription.user_id == me.id, Subscription.is_active == True)
            .order_by(Subscription.expires_at.desc()).limit(1)
        )
        _sub_hb_row = _sub_hb.scalar_one_or_none()
        _now_hb = datetime.now(timezone.utc)
        _allow_no_hologram = bool(
            _sub_hb_row and _sub_hb_row.plan_id in ("growth", "enterprise") and
            (not _sub_hb_row.expires_at or _sub_hb_row.expires_at > _now_hb)
        )

    # Fetch attendance counts
    rec_res = await db.execute(
        select(AttendanceRecord.attendee_id, func.count().label("cnt"))
        .where(AttendanceRecord.attendee_id.in_([a.id for a in attendees]))
        .group_by(AttendanceRecord.attendee_id)
    )
    attend_counts: dict[int, int] = {r.attendee_id: r.cnt for r in rec_res.all()}

    # Eligible attendees
    eligible = [a for a in attendees if attend_counts.get(a.id, 0) >= ev.min_sessions_required]
    below_threshold = len(attendees) - len(eligible)

    if not eligible:
        return BulkCertifyOut(
            created=0, already_had_cert=0,
            below_threshold=below_threshold,
            total_attendees=len(attendees),
            spent_heptacoin=0
        )

    # Balance check
    user_res = await db.execute(select(User).where(User.id == me.id))
    user = user_res.scalar_one()
    # Rough estimate: check at least 10 HC per cert available
    if user.heptacoin_balance < 10:
        raise HTTPException(status_code=402, detail="Yetersiz HeptaCoin")

    # Load org branding
    org_res = await db.execute(select(Organization).where(Organization.user_id == me.id))
    org = org_res.scalar_one_or_none()
    brand_logo_path: Optional[Path] = None
    if org and org.brand_logo:
        brand_logo_path = local_path_from_url(org.brand_logo)
        if not brand_logo_path.exists():
            brand_logo_path = None

    template_path = local_path_from_url(ev.template_image_url)
    cfg_raw = ev.config or {}

    created = 0
    already_had_cert = 0
    total_spent = 0

    for attendee in eligible:
        # Check if cert already exists
        cert_check = await db.execute(
            select(Certificate).where(
                Certificate.event_id == event_id,
                Certificate.student_name == attendee.name,
                Certificate.deleted_at.is_(None),
            )
        )
        if cert_check.scalar_one_or_none():
            already_had_cert += 1
            continue

        # Re-check balance each iteration
        fresh_user = await db.execute(select(User).where(User.id == me.id))
        user = fresh_user.scalar_one()
        if user.heptacoin_balance < 10:
            break  # stop if out of coins

        cert_uuid = new_certificate_uuid()
        # Atomic seq increment
        await db.execute(
            update(Event).where(Event.id == ev.id).values(cert_seq=Event.cert_seq + 1)
        )
        await db.flush()
        ev_fresh = await db.execute(select(Event).where(Event.id == ev.id))
        ev = ev_fresh.scalar_one()
        public_id = f"EV{ev.id}-{ev.cert_seq:06d}"

        hosting_term = payload.hosting_term
        ends_at = compute_hosting_ends(hosting_term)

        try:
            tc = editor_config_to_template_config(cfg_raw)
            # Override hologram policy based on plan
            if not _allow_no_hologram:
                tc = TemplateConfig(
                    **{k: v for k, v in tc.__dict__.items() if k != "show_hologram"},
                    show_hologram=True,
                )
        except Exception as e:
            logger.warning("BulkCertify: TemplateConfig error for %s: %s", attendee.name, e)
            continue

        # Load template image bytes
        try:
            template_bytes = template_path.read_bytes()
        except Exception as e:
            logger.error("BulkCertify: cannot read template for %s: %s", attendee.name, e)
            continue

        # Load brand logo bytes
        brand_logo_bytes: Optional[bytes] = None
        if brand_logo_path and brand_logo_path.exists():
            try:
                brand_logo_bytes = brand_logo_path.read_bytes()
            except Exception:
                pass

        rel_path = f"pdfs/event_{event_id}/{cert_uuid}.pdf"
        abs_path = Path(settings.local_storage_dir) / rel_path
        abs_path.parent.mkdir(parents=True, exist_ok=True)

        try:
            pdf_bytes = render_certificate_pdf(
                template_image_bytes=template_bytes,
                student_name=attendee.name,
                verify_url=f"{settings.public_base_url}/api/verify/{cert_uuid}",
                config=tc,
                public_id=public_id,
                brand_logo_bytes=brand_logo_bytes,
            )
            abs_path.write_bytes(pdf_bytes)
        except Exception as e:
            logger.error("BulkCertify render error for %s: %s", attendee.name, e)
            continue

        asset_size = abs_path.stat().st_size if abs_path.exists() else 0
        h_units = hosting_units(hosting_term, asset_size)
        cost = 10 + h_units

        cert = Certificate(
            uuid=cert_uuid,
            student_name=attendee.name,
            event_id=event_id,
            pdf_url=build_public_pdf_url(rel_path),
            status=CertStatus.active,
            public_id=public_id,
            hosting_term=hosting_term,
            hosting_ends_at=ends_at,
            asset_size_bytes=asset_size,
        )
        db.add(cert)
        user.heptacoin_balance -= cost
        db.add(Transaction(user_id=me.id, amount=cost, type=TxType.spend))
        created += 1
        total_spent += cost
        await db.flush()

    await db.commit()
    return BulkCertifyOut(
        created=created,
        already_had_cert=already_had_cert,
        below_threshold=below_threshold,
        total_attendees=len(attendees),
        spent_heptacoin=total_spent,
    )


# ═══════════════════════════════════════════════════════════════════════════════
# Admin: Transaction list (paginated)
# ═══════════════════════════════════════════════════════════════════════════════

@app.get(
    "/api/admin/transactions/list",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def list_my_transactions_paginated(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, le=100),
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    q = select(Transaction).where(Transaction.user_id == me.id)
    total_res = await db.execute(select(func.count()).select_from(q.subquery()))
    total = int(total_res.scalar_one() or 0)

    q = q.order_by(Transaction.timestamp.desc()).offset((page - 1) * limit).limit(limit)
    res = await db.execute(q)
    txs = res.scalars().all()
    return {
        "items": [
            {"id": t.id, "amount": t.amount, "type": t.type, "timestamp": t.timestamp.isoformat()}
            for t in txs
        ],
        "total": total,
        "page": page,
        "limit": limit,
    }


# ── Public: Email Unsubscribe ────────────────────────────────────────────────

@app.post("/api/public/attendees/{attendee_id}/unsubscribe")
async def unsubscribe_from_email(
    attendee_id: int,
    token: str = Query(...),  # HMAC token for security
    db: AsyncSession = Depends(get_db),
):
    """Unsubscribe an attendee from email communications.
    
    This endpoint is public but requires a valid unsubscribe token
    for security to prevent abuse.
    """
    # Get attendee
    a_res = await db.execute(select(Attendee).where(Attendee.id == attendee_id))
    attendee = a_res.scalar_one_or_none()
    if not attendee:
        raise HTTPException(status_code=404, detail="Katılımcı bulunamadı")
    
    # Validate token (simple implementation - in production use HMAC)
    # TODO: Implement proper token validation with HMAC-SHA256
    expected_token = hashlib.sha256(f"{attendee_id}:{attendee.email}".encode()).hexdigest()[:16]
    if token != expected_token:
        logger.warning(f"Invalid unsubscribe token for attendee {attendee_id}")
        raise HTTPException(status_code=401, detail="Geçersiz token")
    
    # Mark as unsubscribed
    attendee.unsubscribed_at = datetime.utcnow()
    db.add(attendee)
    await db.commit()
    
    return {
        "status": "unsubscribed",
        "message": f"{attendee.email} adresinden abonelik kaldırıldı",
    }


@app.get("/api/public/attendees/{attendee_id}/unsubscribe-verify")
async def verify_unsubscribe_token(
    attendee_id: int,
    token: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    """Verify if an unsubscribe token is valid (for before-click confirmation)."""
    a_res = await db.execute(select(Attendee).where(Attendee.id == attendee_id))
    attendee = a_res.scalar_one_or_none()
    if not attendee:
        raise HTTPException(status_code=404, detail="Katılımcı bulunamadı")
    
    # Validate token
    expected_token = hashlib.sha256(f"{attendee_id}:{attendee.email}".encode()).hexdigest()[:16]
    is_valid = token == expected_token
    
    return {
        "valid": is_valid,
        "attendee_email": attendee.email if is_valid else None,
    }

