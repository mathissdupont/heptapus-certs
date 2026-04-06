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
import re
from datetime import datetime, timedelta, timezone
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formataddr
from enum import Enum
from html import escape
from html.parser import HTMLParser
from pathlib import Path
from typing import Any, Dict, Optional, List
from pydantic import field_validator
import uuid as _uuid_module
import aiosmtplib
from itsdangerous import URLSafeTimedSerializer, SignatureExpired, BadSignature
import pandas as pd
import pyotp
from fastapi import FastAPI, Body, Depends, HTTPException, UploadFile, File, Query, Request, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse, RedirectResponse, JSONResponse
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
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from datetime import date as date_type
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.date import DateTrigger
from sqlalchemy import (
    Boolean, String, Integer, BigInteger, DateTime, ForeignKey, Text,
    Enum as SAEnum, UniqueConstraint, Index, select, func, distinct, update, delete, or_, Date as sa_Date, Time as sa_Time
)
from sqlalchemy import JSON as _JSON
from sqlalchemy.dialects.postgresql import JSONB as _PgJSONB, INET as _PgINET, insert as _pg_insert

# Use native PostgreSQL JSONB/INET on PostgreSQL, fall back to JSON/String on SQLite
JSONB = _JSON().with_variant(_PgJSONB(), "postgresql")
INET = String(45).with_variant(_PgINET(), "postgresql")
BIGINT_PK = BigInteger().with_variant(Integer, "sqlite")
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship, selectinload

from .generator import TemplateConfig, render_certificate_pdf, render_certificate_png_watermarked, new_certificate_uuid

logger = logging.getLogger("heptacert")

ALLOWED_RICH_TEXT_STYLES = {
    "color",
    "font-size",
    "font-family",
    "font-weight",
    "font-style",
    "text-decoration",
}
FONT_SIZE_MAP = {
    "1": "12px",
    "2": "14px",
    "3": "16px",
    "4": "18px",
    "5": "24px",
    "6": "30px",
    "7": "36px",
}


def _sanitize_rich_text_style(style_text: str) -> str:
    sanitized: List[str] = []
    for chunk in style_text.split(";"):
        if ":" not in chunk:
            continue
        raw_key, raw_value = chunk.split(":", 1)
        key = raw_key.strip().lower()
        value = raw_value.strip()
        if key not in ALLOWED_RICH_TEXT_STYLES or not value:
            continue
        if key == "color" and not re.fullmatch(r"#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})|rgba?\([\d\s.,%]+\)", value):
            continue
        if key == "font-size" and not re.fullmatch(r"\d{1,3}(?:px|em|rem|%)", value):
            continue
        if key == "font-family" and not re.fullmatch(r"[A-Za-z0-9 ,\"'_-]{1,120}", value):
            continue
        if key == "font-weight" and value.lower() not in {"normal", "bold", "600", "700", "800"}:
            continue
        if key == "font-style" and value.lower() not in {"normal", "italic"}:
            continue
        if key == "text-decoration" and value.lower() not in {"none", "underline", "line-through"}:
            continue
        sanitized.append(f"{key}: {escape(value, quote=True)}")
    return "; ".join(sanitized)


class _RichTextSanitizer(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.parts: List[str] = []
        self.open_tags: List[str] = []

    def handle_starttag(self, tag: str, attrs: List[tuple[str, Optional[str]]]) -> None:
        canonical = self._canonical_tag(tag)
        if canonical is None:
            return
        if canonical == "br":
            self.parts.append("<br>")
            return
        attr_html = self._sanitize_attrs(tag, attrs, canonical)
        self.parts.append(f"<{canonical}{attr_html}>")
        self.open_tags.append(canonical)

    def handle_endtag(self, tag: str) -> None:
        canonical = self._canonical_tag(tag)
        if canonical in (None, "br"):
            return
        if self.open_tags and self.open_tags[-1] == canonical:
            self.parts.append(f"</{canonical}>")
            self.open_tags.pop()

    def handle_data(self, data: str) -> None:
        if data:
            self.parts.append(escape(data))

    def handle_entityref(self, name: str) -> None:
        self.parts.append(f"&{name};")

    def handle_charref(self, name: str) -> None:
        self.parts.append(f"&#{name};")

    def get_html(self) -> str:
        while self.open_tags:
            self.parts.append(f"</{self.open_tags.pop()}>")
        return "".join(self.parts)

    def _canonical_tag(self, tag: str) -> Optional[str]:
        tag_name = tag.lower()
        mapping = {
            "b": "strong",
            "strong": "strong",
            "i": "em",
            "em": "em",
            "u": "u",
            "p": "p",
            "div": "p",
            "br": "br",
            "ul": "ul",
            "ol": "ol",
            "li": "li",
            "span": "span",
            "font": "span",
        }
        return mapping.get(tag_name)

    def _sanitize_attrs(
        self,
        source_tag: str,
        attrs: List[tuple[str, Optional[str]]],
        canonical: str,
    ) -> str:
        styles: List[str] = []
        for key, raw_value in attrs:
            attr_key = (key or "").lower()
            value = (raw_value or "").strip()
            if not value:
                continue
            if attr_key == "style":
                cleaned_style = _sanitize_rich_text_style(value)
                if cleaned_style:
                    styles.append(cleaned_style)
            if source_tag.lower() == "font":
                if attr_key == "size" and value in FONT_SIZE_MAP:
                    styles.append(f"font-size: {FONT_SIZE_MAP[value]}")
                if attr_key == "face" and re.fullmatch(r"[A-Za-z0-9 ,\"'_-]{1,120}", value):
                    styles.append(f"font-family: {escape(value, quote=True)}")
                if attr_key == "color" and re.fullmatch(r"#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})", value):
                    styles.append(f"color: {value}")
        if canonical not in {"p", "span"} or not styles:
            return ""
        style_attr = _sanitize_rich_text_style("; ".join(styles))
        if not style_attr:
            return ""
        return f' style="{style_attr}"'


def sanitize_event_description_html(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    cleaned = value.strip()
    if not cleaned:
        return None
    if "<" not in cleaned and ">" not in cleaned:
        return escape(cleaned).replace("\r\n", "\n").replace("\r", "\n").replace("\n", "<br>") or None
    parser = _RichTextSanitizer()
    parser.feed(cleaned)
    parser.close()
    html = parser.get_html().strip()
    return html or None


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

    # SMTP (optional Ã¢â‚¬â€ if not set, verification tokens are printed to logs)
    smtp_host: str = Field(default="", alias="SMTP_HOST")
    smtp_port: int = Field(default=587, alias="SMTP_PORT")
    smtp_user: str = Field(default="", alias="SMTP_USER")
    smtp_password: str = Field(default="", alias="SMTP_PASSWORD")
    smtp_from: str = Field(default="noreply@heptapus.com", alias="SMTP_FROM")

    email_token_secret: str = Field(alias="EMAIL_TOKEN_SECRET")

    # Ã¢â€â‚¬Ã¢â€â‚¬ Payment (feature-flagged Ã¢â‚¬â€ off by default until vergi levhasÃ„Â±) Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
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
bulk_cert_job_lock = asyncio.Lock()

# Lightweight in-process caches for high-traffic QR check-in reads
CHECKIN_CONTEXT_TTL_SECONDS = 20
EVENT_TOTAL_SESSIONS_TTL_SECONDS = 30
_checkin_context_cache: Dict[str, tuple[float, Dict[str, Any]]] = {}
_event_total_sessions_cache: Dict[int, tuple[float, int]] = {}
REGISTRATION_DEVICE_COOKIE = "heptacert_reg_device"


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


class PublicMember(Base):
    __tablename__ = "public_members"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    display_name: Mapped[str] = mapped_column(String(120))
    bio: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
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
    comments: Mapped[List["EventComment"]] = relationship(back_populates="event", cascade="all, delete-orphan", passive_deletes=True)
    raffles: Mapped[List["EventRaffle"]] = relationship(back_populates="event", cascade="all, delete-orphan", passive_deletes=True)
    template_snapshots: Mapped[List["EventTemplateSnapshot"]] = relationship(back_populates="event", cascade="all, delete-orphan", passive_deletes=True)
    email_templates: Mapped[List["EmailTemplate"]] = relationship(back_populates="event", cascade="all, delete-orphan", passive_deletes=True)
    bulk_email_jobs: Mapped[List["BulkEmailJob"]] = relationship(back_populates="event", cascade="all, delete-orphan", passive_deletes=True)
    bulk_certificate_jobs: Mapped[List["BulkCertificateJob"]] = relationship(back_populates="event", cascade="all, delete-orphan", passive_deletes=True)

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
    certificate_tier: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    tier_template_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    survey_required: Mapped[bool] = mapped_column(Boolean, default=False)
    worldpass_anchor_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)

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


# Ã¢â€â‚¬Ã¢â€â‚¬ Payment DB models (created by migration 002) Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

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


# Ã¢â€â‚¬Ã¢â€â‚¬ Enterprise DB models (created by migration 003) Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

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
    __tablename__ = "organizations"
    id:            Mapped[int]           = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id:       Mapped[int]           = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    org_name:      Mapped[str]           = mapped_column(String(200))
    custom_domain: Mapped[Optional[str]] = mapped_column(String(253), unique=True, nullable=True)
    brand_logo:    Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    brand_color:   Mapped[str]           = mapped_column(String(7), default="#6366f1")
    created_at:    Mapped[datetime]      = mapped_column(DateTime(timezone=True), server_default=func.now())


class OrganizationAllowlist(Base):
    __tablename__ = "organization_allowlists"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    org_id: Mapped[int] = mapped_column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), index=True)
    email: Mapped[str] = mapped_column(String(320), nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())



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


# Ã¢â€â‚¬Ã¢â€â‚¬ Email System Models (created by migration 008) Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

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
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    event: Mapped["Event"] = relationship(back_populates="bulk_email_jobs")
    creator: Mapped["User"] = relationship(foreign_keys=[created_by])
    email_template: Mapped[Optional["EmailTemplate"]] = relationship()


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


# Ã¢â€â‚¬Ã¢â€â‚¬ Attendance management models (migration 003) Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

class AttendeeSource(str, Enum):
    import_ = "import"
    self_register = "self_register"


class EventSession(Base):
    __tablename__ = "event_sessions"
    id:                      Mapped[int]            = mapped_column(Integer, primary_key=True, autoincrement=True)
    event_id:                Mapped[int]            = mapped_column(Integer, ForeignKey("events.id", ondelete="CASCADE"), index=True)
    name:                    Mapped[str]            = mapped_column(String(200))
    session_date:            Mapped[Optional[date_type]] = mapped_column(sa_Date, nullable=True)
    session_start:           Mapped[Optional[Any]]  = mapped_column(sa_Time, nullable=True)
    session_location:        Mapped[Optional[str]]  = mapped_column(String(300), nullable=True)
    checkin_token:           Mapped[str]            = mapped_column(String(64), unique=True)
    is_active:               Mapped[bool]           = mapped_column(Boolean, default=False)
    enable_participation_test: Mapped[bool]         = mapped_column(Boolean, default=False)
    test_score_max:          Mapped[int]            = mapped_column(Integer, default=100)
    created_at:              Mapped[datetime]       = mapped_column(DateTime(timezone=True), server_default=func.now())

    event: Mapped["Event"] = relationship(back_populates="sessions")
    attendance_records: Mapped[List["AttendanceRecord"]] = relationship(back_populates="session", cascade="all, delete-orphan")


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

    event: Mapped["Event"] = relationship(back_populates="attendees")
    public_member: Mapped[Optional["PublicMember"]] = relationship(back_populates="attendees")
    attendance_records: Mapped[List["AttendanceRecord"]] = relationship(back_populates="attendee", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("event_id", "email", name="uq_attendee_event_email"),
    )


class EventComment(Base):
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


# Ã¢â€â‚¬Ã¢â€â‚¬ Gamification: Badge Rules & Participant Badges Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

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


# Ã¢â€â‚¬Ã¢â€â‚¬ Certificate Tiers Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

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


# Ã¢â€â‚¬Ã¢â€â‚¬ Survey System Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

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


# Ã¢â€â‚¬Ã¢â€â‚¬ Sponsor Slots Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

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


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


class LoginIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class PublicMemberRegisterIn(BaseModel):
    display_name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class PublicMemberLoginIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class PublicMemberProfileUpdateIn(BaseModel):
    display_name: str = Field(min_length=2, max_length=120)
    bio: Optional[str] = Field(default=None, max_length=1000)


class PublicMemberChangePasswordIn(BaseModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)


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
    visibility: str = "private"
    require_email_verification: bool = True


class PublicMemberMeOut(BaseModel):
    id: int
    email: EmailStr
    display_name: str
    bio: Optional[str] = None


class PublicMemberTokenOut(TokenOut):
    member: PublicMemberMeOut


class PublicEventListItemOut(BaseModel):
    id: int
    public_id: str
    name: str
    event_date: Optional[str] = None
    event_description: Optional[str] = None
    event_location: Optional[str] = None
    event_banner_url: Optional[str] = None
    min_sessions_required: int = 1
    visibility: str = "public"
    session_count: int = 0


class PublicEventDetailOut(BaseModel):
    id: int
    public_id: str
    name: str
    event_date: Optional[str] = None
    event_description: Optional[str] = None
    event_location: Optional[str] = None
    min_sessions_required: int = 1
    event_banner_url: Optional[str] = None
    registration_fields: List[Dict[str, Any]] = Field(default_factory=list)
    survey: Optional[Dict[str, Any]] = None
    sessions: List[Dict[str, Any]] = Field(default_factory=list)
    visibility: str = "private"
    require_email_verification: bool = True


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
    member_id: int
    member_name: str
    member_email: Optional[str] = None
    body: str
    status: str
    report_count: int = 0
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
    event_date: Optional[str] = None
    status: CertStatus
    pdf_url: Optional[str] = None
    png_url: Optional[str] = None
    issued_at: Optional[datetime] = None
    hosting_ends_at: Optional[datetime] = None
    view_count: int = 0
    linkedin_url: Optional[str] = None
    branding: Optional[Dict[str, Any]] = None


# Ã¢â€â‚¬Ã¢â€â‚¬ Enterprise Pydantic models Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

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


# Ã¢â€â‚¬Ã¢â€â‚¬ Gamification & Survey Request/Response Models Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

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
    survey_type: str = Field(default="builtin")  # builtin, external, both
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
    extra: Optional[Dict[str, Any]] = None
    created_at: datetime


class PublicParticipantStatusOut(BaseModel):
    attendee_id: int
    attendee_name: str
    attendee_email: str
    email_verified: bool = False
    event_id: int
    event_name: str
    sessions_attended: int
    total_sessions: int
    sessions_required: int
    survey_required: bool
    survey_completed: bool
    can_download_cert: bool
    certificate_ready: bool
    certificate_count: int
    latest_certificate_uuid: Optional[str] = None
    latest_certificate_verify_url: Optional[str] = None
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


# Ã¢â€â‚¬Ã¢â€â‚¬ Email System Schemas Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

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
    recipient_type: str
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
        "name_tr": "BaÃ…Å¸langÃ„Â±ÃƒÂ§",
        "name_en": "Starter",
        "price_monthly": 0,
        "price_annual": 0,
        "hc_quota": 50,
        "features_tr": [
            "50 HC hoÃ…Å¸ geldin bonusu (tek seferlik)",
            "QR kod doÃ„Å¸rulama",
            "Sertifika arÃ…Å¸ivi (1 yÃ„Â±l)",
            "Temel Ã…Å¸ablon editÃƒÂ¶rÃƒÂ¼",
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
            "AylÃ„Â±k 500 HC",
            "SÃ„Â±nÃ„Â±rsÃ„Â±z etkinlik",
            "Excel toplu basÃ„Â±m",
            "Sertifika arÃ…Å¸ivi (3 yÃ„Â±l)",
            "Etkinlik kayÃ„Â±t ve check-in sistemi",
            "QR ile yoklama takibi",
            "Ãƒâ€“ncelikli destek",
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
        "name_tr": "BÃƒÂ¼yÃƒÂ¼me",
        "name_en": "Growth",
        "price_monthly": 1299,
        "price_annual": 1099,
        "hc_quota": 2000,
        "features_tr": [
            "AylÃ„Â±k 2.000 HC",
            "SÃ„Â±nÃ„Â±rsÃ„Â±z etkinlik",
            "Excel toplu basÃ„Â±m",
            "Sertifika arÃ…Å¸ivi (3 yÃ„Â±l)",
            "Etkinlik kayÃ„Â±t ve check-in sistemi",
            "QR ile yoklama takibi",
            "API eriÃ…Å¸imi (tam)",
            "Ãƒâ€“zel alan adÃ„Â± doÃ„Å¸rulama",
            "Marka watermark kaldÃ„Â±rma",
            "Otomatik email sistemi (bulk mail + Ã…Å¸ablonlar)",
            "5-7 hazÃ„Â±r sertifika Ã…Å¸ablonu",
            "Custom event aÃƒÂ§Ã„Â±klamasÃ„Â± ve banneri",
            "Webhook API desteÃ„Å¸i",
            "Advanced analytics dashboard",
            "Custom form alanlarÃ„Â±",
            "KatÃ„Â±lÃ„Â±mcÃ„Â± self-service sertifika indirme",
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
            "SÃ„Â±nÃ„Â±rsÃ„Â±z HC kotasÃ„Â±",
            "Ãƒâ€“zel SLA anlaÃ…Å¸masÃ„Â±",
            "API entegrasyonu",
            "Ãƒâ€“zel alan adÃ„Â± desteÃ„Å¸i",
            "Etkinlik kayÃ„Â±t ve check-in sistemi",
            "QR ile yoklama takibi",
            "Toplu sertifika ÃƒÂ¼retimi",
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
    return m * 10  # yearly: 10 ay ÃƒÂ¼cret

def compute_hosting_ends(term: str) -> datetime:
    now = datetime.now(timezone.utc)
    if term == "monthly":
        return now + timedelta(days=30)
    return now + timedelta(days=365)


def ensure_utc(dt: Optional[datetime]) -> Optional[datetime]:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)

#helpers

def hash_password(pw: str) -> str:
    return pwd_context.hash(pw)


def verify_password(pw: str, pw_hash: str) -> bool:
    return pwd_context.verify(pw, pw_hash)


# Ã¢â€â‚¬Ã¢â€â‚¬ Email token helpers Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
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


def make_survey_access_token(*, attendee_id: int, event_id: int, email: str) -> str:
    return make_email_token(
        {
            "action": "survey_access",
            "attendee_id": attendee_id,
            "event_id": event_id,
            "email": email.lower(),
        }
    )


def verify_survey_access_token(token: str, *, event_id: int, max_age: int = 60 * 60 * 24 * 365) -> dict:
    payload = verify_email_token(token, max_age=max_age)
    if payload.get("action") != "survey_access":
        raise BadSignature("invalid survey token action")
    if int(payload.get("event_id") or 0) != event_id:
        raise BadSignature("survey token event mismatch")
    return payload


def build_public_survey_url(*, event_id: str, attendee_id: int, email: str) -> str:
    survey_token = make_survey_access_token(
        attendee_id=attendee_id,
        event_id=event_id,
        email=email,
    )
    return f"{settings.frontend_base_url.rstrip('/')}/events/{event_id}/survey?token={survey_token}"


def build_public_status_url(*, event_id: str, attendee_id: int, email: str) -> str:
    survey_token = make_survey_access_token(
        attendee_id=attendee_id,
        event_id=event_id,
        email=email,
    )
    return f"{settings.frontend_base_url.rstrip('/')}/events/{event_id}/status?token={survey_token}"


def build_attendee_verify_url(*, event_id: str, token: str) -> str:
    return f"{settings.frontend_base_url.rstrip('/')}/events/{event_id}/verify-email?token={token}"


async def _ensure_user_email_config(db: AsyncSession, user_id: int) -> "UserEmailConfig":
    res = await db.execute(select(UserEmailConfig).where(UserEmailConfig.user_id == user_id))
    config = res.scalar_one_or_none()
    if config:
        return config

    config = UserEmailConfig(user_id=user_id, smtp_enabled=False, smtp_use_tls=True)
    db.add(config)
    await db.commit()
    await db.refresh(config)
    return config


async def send_attendee_verification_email(*, attendee: "Attendee", event: "Event") -> None:
    token = attendee.email_verification_token
    if not token:
        return

    verify_link = build_attendee_verify_url(event_id=_get_public_event_identifier(event), token=token)
    await send_email_async(
        to=attendee.email,
        subject=f"{event.name} etkinliği için e-posta adresinizi doğrulayın",
        html_body=f"""
        <p>Merhaba {attendee.name},</p>
        <p>{event.name} etkinlik kaydınızı tamamlamak için e-posta adresinizi doğrulamanız gerekiyor.</p>
        <p><a href="{verify_link}">{verify_link}</a></p>
        <p>Bu bağlantıyı doğrulamadan check-in yapamaz ve çekilişlere dahil olamazsınız.</p>
        <p>Bağlantı 24 saat geçerlidir.</p>
        """,
        sender_user_id=event.admin_id,
    )


async def write_audit_log(
    db: AsyncSession,
    *,
    user_id: Optional[int],
    action: str,
    resource_type: Optional[str] = None,
    resource_id: Optional[str] = None,
    extra: Optional[Dict[str, Any]] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
) -> None:
    db.add(
        AuditLog(
            user_id=user_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            extra=extra,
            ip_address=ip_address,
            user_agent=user_agent,
        )
    )


async def _enforce_registration_risk_controls(
    db: AsyncSession,
    *,
    event_id: int,
    email: str,
    ip_address: Optional[str],
    user_agent: Optional[str],
    device_id: str,
) -> None:
    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(minutes=30)
    recent_logs_res = await db.execute(
        select(AuditLog)
        .where(
            AuditLog.action == "attendee.register",
            AuditLog.created_at >= cutoff,
        )
        .order_by(AuditLog.created_at.desc())
        .limit(250)
    )
    recent_logs = recent_logs_res.scalars().all()

    def _extra(log: AuditLog) -> Dict[str, Any]:
        return log.extra or {}

    same_event_logs = [log for log in recent_logs if str(_extra(log).get("event_id")) == str(event_id)]
    email_lc = email.lower()

    same_ip_recent = [
        log for log in same_event_logs
        if ip_address and log.ip_address == ip_address and log.created_at >= now - timedelta(minutes=10)
    ]
    if len(same_ip_recent) >= 5:
        raise HTTPException(status_code=429, detail="Bu IP adresinden cok fazla etkinlik kaydi denemesi algilandi.")

    same_device_logs = [
        log for log in same_event_logs
        if _extra(log).get("device_id") == device_id
    ]
    distinct_device_emails = {
        str(_extra(log).get("email") or "").lower()
        for log in same_device_logs
        if _extra(log).get("email")
    }
    if len(same_device_logs) >= 4 and email_lc not in distinct_device_emails:
        raise HTTPException(status_code=429, detail="Bu cihazdan cok sayida farkli e-posta denemesi algilandi.")

    same_ip_ua_logs = [
        log for log in same_event_logs
        if ip_address and log.ip_address == ip_address and (log.user_agent or "") == (user_agent or "")
    ]
    distinct_ip_ua_emails = {
        str(_extra(log).get("email") or "").lower()
        for log in same_ip_ua_logs
        if _extra(log).get("email")
    }
    if len(distinct_ip_ua_emails) >= 4 and email_lc not in distinct_ip_ua_emails:
        raise HTTPException(status_code=429, detail="Supheli kayit denemesi algilandi. Lutfen daha sonra tekrar deneyin.")

async def build_public_participant_status(
    db: AsyncSession,
    *,
    event: Event,
    attendee: Attendee,
) -> PublicParticipantStatusOut:
    total_sessions_res = await db.execute(
        select(func.count()).select_from(EventSession).where(EventSession.event_id == event.id)
    )
    total_sessions = int(total_sessions_res.scalar_one() or 0)

    sessions_attended_res = await db.execute(
        select(func.count()).select_from(AttendanceRecord).where(AttendanceRecord.attendee_id == attendee.id)
    )
    sessions_attended = int(sessions_attended_res.scalar_one() or 0)

    badge_res = await db.execute(
        select(ParticipantBadge)
        .where(
            ParticipantBadge.event_id == event.id,
            ParticipantBadge.attendee_id == attendee.id,
        )
        .order_by(ParticipantBadge.awarded_at.desc())
    )
    badges = badge_res.scalars().all()
    badge_items = await _build_participant_badge_items(db, event.id, badges)

    certs_res = await db.execute(
        select(Certificate)
        .where(
            Certificate.event_id == event.id,
            Certificate.student_name == attendee.name,
            Certificate.deleted_at.is_(None),
        )
        .order_by(Certificate.created_at.desc())
    )
    certificates = certs_res.scalars().all()
    latest_certificate = certificates[0] if certificates else None

    raffle_res = await db.execute(
        select(EventRaffle)
        .where(EventRaffle.event_id == event.id)
        .order_by(EventRaffle.created_at.desc())
    )
    raffles = raffle_res.scalars().all()
    eligible_raffles = [
        {
            "id": raffle.id,
            "title": raffle.title,
            "prize_name": raffle.prize_name,
            "status": raffle.status,
            "min_sessions_required": raffle.min_sessions_required,
        }
        for raffle in raffles
        if attendee.email_verified and sessions_attended >= raffle.min_sessions_required
    ]

    certificate_ready = bool(
        attendee.can_download_cert
        and sessions_attended >= event.min_sessions_required
        and latest_certificate is not None
    )

    return PublicParticipantStatusOut(
        attendee_id=attendee.id,
        attendee_name=attendee.name,
        attendee_email=attendee.email,
        email_verified=bool(attendee.email_verified),
        event_id=event.id,
        event_name=event.name,
        sessions_attended=sessions_attended,
        total_sessions=total_sessions,
        sessions_required=event.min_sessions_required,
        survey_required=bool(attendee.survey_required),
        survey_completed=attendee.survey_completed_at is not None,
        can_download_cert=bool(attendee.can_download_cert),
        certificate_ready=certificate_ready,
        certificate_count=len(certificates),
        latest_certificate_uuid=latest_certificate.uuid if latest_certificate else None,
        latest_certificate_verify_url=(
            build_certificate_verify_url(latest_certificate.uuid) if latest_certificate else None
        ),
        badge_count=len(badge_items),
        badges=badge_items,
        eligible_raffles=eligible_raffles,
    )


async def send_email_async(
    to: str,
    subject: str,
    html_body: str,
    template_vars: Optional[Dict[str, Any]] = None,
    attachments: Optional[List[tuple[str, bytes, str]]] = None,  # [(filename, bytes, mimetype),...]
    raise_on_error: bool = False,
    sender_user_id: Optional[int] = None,
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
    smtp_host = settings.smtp_host
    smtp_port = settings.smtp_port
    smtp_user = settings.smtp_user or None
    smtp_password = settings.smtp_password or None
    smtp_from_email = settings.smtp_from
    smtp_from_name = ""
    smtp_reply_to: Optional[str] = None
    smtp_auto_cc: Optional[str] = None
    smtp_use_tls = True

    if sender_user_id is not None:
        async with SessionLocal() as db_mail:
            res = await db_mail.execute(select(UserEmailConfig).where(UserEmailConfig.user_id == sender_user_id))
            user_config = res.scalar_one_or_none()
            if (
                user_config
                and user_config.smtp_enabled
                and user_config.smtp_host
                and user_config.smtp_port
                and (user_config.from_email or user_config.smtp_user)
            ):
                smtp_host = user_config.smtp_host
                smtp_port = int(user_config.smtp_port)
                smtp_user = user_config.smtp_user or None
                smtp_password = user_config.smtp_password or None
                smtp_from_email = user_config.from_email or user_config.smtp_user or settings.smtp_from
                smtp_from_name = (user_config.from_name or "").strip()
                smtp_reply_to = (user_config.reply_to or "").strip() or None
                smtp_auto_cc = (user_config.auto_cc or "").strip() or None
                smtp_use_tls = bool(user_config.smtp_use_tls)

    if not smtp_host:
        logger.warning(
            "[EMAIL Ã¢â‚¬â€ no SMTP configured] To: %s | Subject: %s\nBody: %s",
            to, subject, html_body
        )
        if raise_on_error:
            raise RuntimeError("SMTP is not configured")
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
    msg["From"] = formataddr((smtp_from_name, smtp_from_email)) if smtp_from_name else smtp_from_email
    msg["To"] = to
    if smtp_reply_to:
        msg["Reply-To"] = smtp_reply_to
    if smtp_auto_cc:
        msg["Cc"] = smtp_auto_cc
    # Add unsubscribe header (RFC 2369)
    msg["List-Unsubscribe"] = f"<mailto:{smtp_reply_to or smtp_from_email}?subject=unsubscribe>"
    
    msg.attach(MIMEText(html_body, "html"))
    
    # Attach files if provided
    if attachments:
        from email.mime.base import MIMEBase
        from email.mime.image import MIMEImage
        from email import encoders
        
        for filename, file_bytes, mimetype in attachments:
            maintype, subtype = mimetype.split("/", 1)
            if maintype == "text":
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
    
    use_implicit_tls = bool(smtp_use_tls and int(smtp_port or 0) == 465)
    use_starttls = bool(smtp_use_tls and not use_implicit_tls)

    try:
        await aiosmtplib.send(
            msg,
            hostname=smtp_host,
            port=smtp_port,
            username=smtp_user,
            password=smtp_password,
            start_tls=use_starttls,
            use_tls=use_implicit_tls,
            timeout=20,
        )
        logger.info("Email sent successfully to %s", to)
    except Exception as exc:
        logger.error("SMTP send failed to %s: %s", to, exc)
        if raise_on_error:
            raise


def _certificate_png_rel_path(event_id: int, cert_uuid: str) -> str:
    return f"pngs/event_{event_id}/{cert_uuid}.png"


def _certificate_png_public_url(event_id: int, cert_uuid: str) -> Optional[str]:
    rel_png_path = _certificate_png_rel_path(event_id, cert_uuid)
    abs_png_path = Path(settings.local_storage_dir) / rel_png_path
    if not abs_png_path.exists():
        return None
    return build_public_pdf_url(rel_png_path)


async def send_certificate_delivery_email_task(
    *,
    event_id: int,
    cert_uuid: str,
    recipient_name: str,
    recipient_email: str,
) -> None:
    if not recipient_email:
        return

    async with SessionLocal() as db_email:
        event_res = await db_email.execute(select(Event).where(Event.id == event_id))
        event = event_res.scalar_one_or_none()
        if not event or not event.auto_email_on_cert or not event.cert_email_template_id:
            return

        template_res = await db_email.execute(
            select(EmailTemplate).where(EmailTemplate.id == event.cert_email_template_id)
        )
        template = template_res.scalar_one_or_none()
        if not template:
            logger.warning("Certificate delivery email skipped: template=%s not found", event.cert_email_template_id)
            return

        cert_res = await db_email.execute(
            select(Certificate).where(
                Certificate.uuid == cert_uuid,
                Certificate.event_id == event_id,
                Certificate.deleted_at.is_(None),
            )
        )
        cert = cert_res.scalar_one_or_none()
        if not cert:
            logger.warning("Certificate delivery email skipped: cert=%s not found", cert_uuid)
            return

        pdf_rel_path = f"pdfs/event_{event_id}/{cert_uuid}.pdf"
        pdf_abs_path = Path(settings.local_storage_dir) / pdf_rel_path
        png_rel_path = _certificate_png_rel_path(event_id, cert_uuid)
        png_abs_path = Path(settings.local_storage_dir) / png_rel_path

        attachments: List[tuple[str, bytes, str]] = []
        safe_public_id = cert.public_id or cert.uuid
        if pdf_abs_path.exists():
            attachments.append((f"certificate-{safe_public_id}.pdf", pdf_abs_path.read_bytes(), "application/pdf"))
        if png_abs_path.exists():
            attachments.append((f"certificate-{safe_public_id}.png", png_abs_path.read_bytes(), "image/png"))

        verify_url = build_certificate_verify_url(cert.uuid)
        pdf_url = cert.pdf_url if cert.status == CertStatus.active else None
        png_url = _certificate_png_public_url(event_id, cert_uuid)
        template_vars = {
            "recipient_name": recipient_name,
            "recipient_email": recipient_email,
            "event_name": event.name,
            "event_date": event.event_date.isoformat() if event.event_date else "",
            "event_location": event.event_location or "",
            "certificate_link": verify_url,
            "certificate_verify_url": verify_url,
            "certificate_pdf_url": pdf_url or verify_url,
            "certificate_png_url": png_url or pdf_url or verify_url,
            "certificate_public_id": cert.public_id or "",
            "event_link": f"{settings.public_base_url}/events/{event.id}/register",
        }

        try:
            await send_email_async(
                to=recipient_email,
                subject=template.subject_tr,
                html_body=template.body_html,
                template_vars=template_vars,
                attachments=attachments or None,
                raise_on_error=False,
                sender_user_id=event.admin_id,
            )
        except Exception as exc:
            logger.error("Automatic certificate email failed for %s: %s", recipient_email, exc)


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


# Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬


def create_access_token(*, user_id: int, role: Role) -> str:
    now = datetime.now(timezone.utc)
    exp = now + timedelta(minutes=settings.jwt_expires_minutes)
    payload = {"sub": str(user_id), "role": role.value, "iat": int(now.timestamp()), "exp": exp}
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")


def create_public_member_access_token(*, member_id: int) -> str:
    now = datetime.now(timezone.utc)
    exp = now + timedelta(minutes=settings.jwt_expires_minutes)
    payload = {"sub": str(member_id), "scope": "public_member", "iat": int(now.timestamp()), "exp": exp}
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


class CurrentPublicMember(BaseModel):
    id: int
    email: EmailStr
    display_name: str


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


async def _resolve_public_member_from_authorization(
    db: AsyncSession,
    authorization: Optional[str],
) -> Optional[CurrentPublicMember]:
    if not authorization or not authorization.lower().startswith("bearer "):
        return None
    token = authorization.split(" ", 1)[1].strip()

    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
        if payload.get("scope") != "public_member":
            raise HTTPException(status_code=401, detail="Invalid token scope")
        member_id = int(payload.get("sub"))
    except HTTPException:
        raise
    except (JWTError, ValueError, TypeError):
        raise HTTPException(status_code=401, detail="Invalid token")

    res = await db.execute(select(PublicMember).where(PublicMember.id == member_id))
    member = res.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=401, detail="Member not found")
    return CurrentPublicMember(id=member.id, email=member.email, display_name=member.display_name)


async def get_current_public_member(
    db: AsyncSession = Depends(get_db),
    Authorization: Optional[str] = Header(default=None),
) -> CurrentPublicMember:
    if not Authorization or not Authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")
    member = await _resolve_public_member_from_authorization(db, Authorization)
    if not member:
        raise HTTPException(status_code=401, detail="Missing bearer token")
    return member


async def get_optional_public_member(
    db: AsyncSession = Depends(get_db),
    Authorization: Optional[str] = Header(default=None),
) -> Optional[CurrentPublicMember]:
    return await _resolve_public_member_from_authorization(db, Authorization)


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
    expires_at = ensure_utc(sub.expires_at)
    if expires_at and expires_at < now:
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
    expires_at = ensure_utc(sub.expires_at)
    if expires_at and expires_at < now:
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
    """Convert a stored URL or relative path Ã¢â€ â€™ absolute local filesystem path."""
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


def build_certificate_verify_url(
    cert_uuid: str,
    host: str | None = None,
    scheme: str = "https",
    verification_path: str | None = None,
) -> str:
    path = (verification_path or "/verify").strip()
    if not path.startswith("/"):
        path = "/" + path

    if host:
        return f"{scheme}://{host}{path.rstrip('/')}/{cert_uuid}"

    return f"{settings.frontend_base_url.rstrip('/')}{path.rstrip('/')}/{cert_uuid}"


app = FastAPI(title="HeptaCert API", version="2.0.0")

# Prefer the first X-Forwarded-For IP when behind reverse proxies.
def _client_ip_for_rate_limit(request: Request) -> str:
    xff = request.headers.get("X-Forwarded-For")
    if xff:
        first_ip = xff.split(",", 1)[0].strip()
        if first_ip:
            return first_ip
    if request.client and request.client.host:
        return request.client.host
    return "unknown"


def _get_registration_device_id(request: Request) -> tuple[str, bool]:
    existing = (request.cookies.get(REGISTRATION_DEVICE_COOKIE) or "").strip()
    if existing and len(existing) <= 128:
        return existing, False
    return secrets.token_urlsafe(24), True


async def _heptacert_rate_limit_handler(request: Request, exc: RateLimitExceeded):
    detail = str(exc.detail or "Too many requests")
    # Preserve legacy `error` key while adding standard `detail` for frontend handlers.
    return JSONResponse(
        status_code=429,
        content={
            "detail": f"Rate limit exceeded: {detail}",
            "error": f"Rate limit exceeded: {detail}",
        },
    )


# Rate limiter
limiter = Limiter(key_func=_client_ip_for_rate_limit, default_limits=["200/minute"])
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _heptacert_rate_limit_handler)

# Include domains router (custom domains / Caddy ask endpoint)
try:
    from . import domains as _domains_module  # ensure model is importable
    from . import domains_api as _domains_api  # router
    app.include_router(_domains_api.router)
except Exception:
    # Import errors at startup shouldn't break the app; log and continue.
    logger.debug("domains_api not loaded at startup (will try on demand)")

origins = [o.strip() for o in settings.cors_origins.split(",")] if settings.cors_origins else ["*"]
# When wildcard, allow_credentials must be False (browser blocks credentials+wildcard per CORS spec).
# JWT auth uses Authorization header Ã¢â‚¬â€ no cookies Ã¢â‚¬â€ so credentials=False is fine.
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


# Ã¢â€â‚¬Ã¢â€â‚¬ Audit log middleware Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
_AUDIT_SKIP_PREFIXES = (
    "/api/auth/", "/api/billing/webhook/", "/api/files/",
    "/api/verify/", "/api/pricing/", "/api/stats", "/api/billing/status",
    "/api/waitlist",
    "/docs", "/openapi", "/redoc",
)
@app.middleware("http")
async def organization_middleware(request: Request, call_next):
    """Resolve organization by Host header (if set) and attach lightweight info to request.state.organization.

    This avoids repeating the same lookup in many endpoints and centralizes host-based branding.
    """
    request.state.organization = None
    host = request.headers.get("host", "")
    if host:
        domain = host.split(":")[0]
        try:
            async with SessionLocal() as session:
                res = await session.execute(select(Organization).where(Organization.custom_domain == domain))
                org = res.scalar_one_or_none()
                if org:
                    request.state.organization = {
                        "id": org.id,
                        "org_name": org.org_name,
                        "brand_logo": org.brand_logo,
                        "brand_color": org.brand_color,
                        "settings": getattr(org, "settings", {}) or {},
                    }
        except Exception:
            # Fail open: do not block requests if DB lookup fails Ã¢â‚¬â€ logging only.
            logger.debug("organization_middleware: lookup failed for host %s", host)

    # If a human opens an API URL in the browser without Authorization, redirect
    # them to the frontend admin login. This avoids confusing raw JSON errors
    # when someone pastes an API URL into the address bar. Do NOT affect XHR
    # requests (which typically accept application/json).
    try:
        path = request.url.path or ""
        auth_hdr = request.headers.get("authorization") or request.headers.get("Authorization")
        accept = request.headers.get("accept", "")
        # Avoid redirecting public human-facing API endpoints (files, verify, etc.)
        if (
            request.method == "GET"
            and path.startswith("/api/")
            and not auth_hdr
            and "text/html" in accept
            and not any(path.startswith(p) for p in _AUDIT_SKIP_PREFIXES)
        ):
            return RedirectResponse(url=f"{settings.frontend_base_url.rstrip('/')}/admin/login", status_code=302)
    except Exception:
        pass

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
            try:
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
            except Exception as exc:
                logger.debug("Audit log write failed (non-critical): %s", exc)
                await db.rollback()

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
                        subject_tr="Sertifikanız Hazır! | {{event_name}}",
                        subject_en="Your Certificate is Ready! | {{event_name}}",
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
                        subject_tr="Kaydınız Başarıyla Alındı | {{event_name}}",
                        subject_en="Your Registration is Confirmed | {{event_name}}",
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
                        <h2>Ã¢Å¡Â Ã¯Â¸Â BarÃ„Â±ndÃ„Â±rma SÃƒÂ¼resi Doluyor Ã¢â‚¬â€ {days_left} GÃƒÂ¼n</h2>
                        <p>AÃ…Å¸aÃ„Å¸Ã„Â±daki sertifikalarÃ„Â±n barÃ„Â±ndÃ„Â±rma sÃƒÂ¼resi yakÃ„Â±nda dolacak. Yenilemek iÃƒÂ§in panele giriÃ…Å¸ yapÃ„Â±n.</p>
                        <table border="1" cellpadding="6" style="border-collapse:collapse">
                        <tr><th>KatÃ„Â±lÃ„Â±mcÃ„Â±</th><th>Etkinlik</th><th>BitiÃ…Å¸ Tarihi</th></tr>
                        {rows_html}
                        </table>
                        <p><a href="{settings.frontend_base_url}/admin/events">Panele Git Ã¢â€ â€™</a></p>
                        """
                        await send_email_async(
                            data["email"],
                            f"Ã¢Å¡Â Ã¯Â¸Â HeptaCert: {len(data['certs'])} sertifikanÃ„Â±n barÃ„Â±ndÃ„Â±rma sÃƒÂ¼resi {days_left} gÃƒÂ¼nde doluyor",
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
                        description=f"AylÃ„Â±k HC yenileme: {sub_r2.plan_id}",
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
                    select(BulkEmailJob)
                    .where(BulkEmailJob.status.in_(["pending", "sending"]))
                    .order_by(BulkEmailJob.created_at.asc())
                    .with_for_update(skip_locked=True)
                    .limit(10)
                )
                jobs = res_jobs.scalars().all()
                
                for job in jobs:
                    try:
                        # Update job status to sending
                        job.status = "sending"
                        if not job.started_at:
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
                        
                        # Get recipients (all attendees or only certified attendees)
                        att_res = await db_bulk.execute(
                            select(Attendee).where(Attendee.event_id == job.event_id)
                        )
                        all_attendees = att_res.scalars().all()

                        cert_res = await db_bulk.execute(
                            select(Certificate)
                            .where(
                                Certificate.event_id == job.event_id,
                                Certificate.status == CertStatus.active,
                                Certificate.deleted_at.is_(None),
                            )
                            .order_by(Certificate.created_at.desc())
                        )
                        cert_rows = cert_res.scalars().all()
                        cert_uuid_by_name: Dict[str, str] = {}
                        for cert in cert_rows:
                            name_key = (cert.student_name or "").strip().lower()
                            if name_key and name_key not in cert_uuid_by_name:
                                cert_uuid_by_name[name_key] = cert.uuid

                        if (job.recipient_type or "attendees") == "certified":
                            attendees = [
                                attendee
                                for attendee in all_attendees
                                if (attendee.name or "").strip().lower() in cert_uuid_by_name
                            ]
                        else:
                            attendees = all_attendees

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
                                        "certificate_link": (
                                            build_certificate_verify_url(cert_uuid_by_name[(attendee.name or '').strip().lower()])
                                            if (attendee.name or "").strip().lower() in cert_uuid_by_name
                                            else f"{settings.public_base_url}/events/{_get_public_event_identifier(event)}/register"
                                        ),
                                        "event_link": f"{settings.public_base_url}/events/{_get_public_event_identifier(event)}/register",
                                        "survey_link": build_public_survey_url(
                                            event_id=_get_public_event_identifier(event),
                                            attendee_id=attendee.id,
                                            email=attendee.email,
                                        ),
                                    }
                                    
                                    # Render subject and body
                                    subj = Template(template.subject_tr).render(**template_vars)
                                    body = Template(template.body_html).render(**template_vars)
                                    
                                    # Send mail
                                    await send_email_async(
                                        to=attendee.email,
                                        subject=subj,
                                        html_body=body,
                                        raise_on_error=True,
                                        sender_user_id=event.admin_id,
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
        scheduler.add_job(_process_bulk_certificate_jobs, "interval", seconds=3)
        scheduler.start()
        logger.info("APScheduler started Ã¢â‚¬â€ cert notifications + monthly HC renewal + bulk email processing + bulk certificate queue")
    except Exception as e:
        logger.warning("APScheduler init failed (non-fatal): %s", e)


def _get_hc_quota(plan_id: str) -> Optional[int]:
    """Return the monthly HC quota for a plan from DEFAULT_PRICING."""
    tier = next((t for t in DEFAULT_PRICING if t.get("id") == plan_id), None)
    return tier.get("hc_quota") if tier else None


def bad_request(msg: str) -> HTTPException:
    return HTTPException(status_code=400, detail=msg)


REGISTRATION_FIELD_TYPES = {"text", "textarea", "number", "tel", "select", "date"}
EVENT_VISIBILITY_VALUES = {"private", "unlisted", "public"}


def _normalize_registration_fields(raw_fields: Any) -> List[Dict[str, Any]]:
    if not isinstance(raw_fields, list):
        return []

    normalized: List[Dict[str, Any]] = []
    seen_ids: set[str] = set()

    for index, item in enumerate(raw_fields):
        if not isinstance(item, dict):
            continue

        field_id = str(item.get("id") or "").strip()[:64]
        if not field_id:
            field_id = f"field_{index + 1}"
        if field_id in seen_ids:
            continue

        label = str(item.get("label") or "").strip()[:120]
        if not label:
            continue

        field_type = str(item.get("type") or "text").strip().lower()
        if field_type not in REGISTRATION_FIELD_TYPES:
            field_type = "text"

        placeholder = str(item.get("placeholder") or "").strip()[:200] or None
        helper_text = str(item.get("helper_text") or "").strip()[:300] or None
        required = bool(item.get("required"))

        options: List[str] = []
        raw_options = item.get("options")
        if isinstance(raw_options, list):
            options = [str(option).strip()[:120] for option in raw_options if str(option).strip()]
        if field_type == "select":
            options = list(dict.fromkeys(options))[:30]
            if not options:
                field_type = "text"

        normalized_item: Dict[str, Any] = {
            "id": field_id,
            "label": label,
            "type": field_type,
            "required": required,
            "placeholder": placeholder,
            "helper_text": helper_text,
        }
        if field_type == "select":
            normalized_item["options"] = options

        normalized.append(normalized_item)
        seen_ids.add(field_id)

    return normalized


def _get_event_registration_fields(event: Event) -> List[Dict[str, Any]]:
    config = event.config or {}
    return _normalize_registration_fields(config.get("registration_fields"))


def _normalize_event_visibility(raw_visibility: Any) -> str:
    value = str(raw_visibility or "private").strip().lower()
    if value not in EVENT_VISIBILITY_VALUES:
        return "private"
    return value


def _get_event_visibility(event: Event) -> str:
    config = event.config or {}
    return _normalize_event_visibility(config.get("visibility"))


def _get_event_email_verification_required(event: Event) -> bool:
    config = event.config or {}
    raw_value = config.get("require_email_verification")
    if raw_value is None:
        return True
    return bool(raw_value)


def _get_public_event_identifier(event: Event) -> str:
    return event.public_id or str(event.id)


async def _resolve_public_event(db: AsyncSession, event_ref: str) -> Optional[Event]:
    identifier = str(event_ref or "").strip()
    if not identifier:
        return None

    public_res = await db.execute(select(Event).where(Event.public_id == identifier))
    event = public_res.scalar_one_or_none()
    if event:
        return event

    if identifier.isdigit():
        legacy_res = await db.execute(select(Event).where(Event.id == int(identifier)))
        legacy_event = legacy_res.scalar_one_or_none()
        if legacy_event and not legacy_event.public_id:
            return legacy_event
    return None


async def _generate_event_public_id(db: AsyncSession) -> str:
    for _ in range(10):
        candidate = f"evt_{secrets.token_hex(8)}"
        exists_res = await db.execute(select(Event.id).where(Event.public_id == candidate))
        if exists_res.scalar_one_or_none() is None:
            return candidate
    raise RuntimeError("Unable to generate a unique event public id")


def _normalize_registration_answers(
    registration_fields: List[Dict[str, Any]],
    raw_answers: Any,
) -> Dict[str, str]:
    raw_map = raw_answers if isinstance(raw_answers, dict) else {}
    normalized: Dict[str, str] = {}

    for field in registration_fields:
        field_id = field["id"]
        raw_value = raw_map.get(field_id, "")
        if raw_value is None:
            value = ""
        elif isinstance(raw_value, str):
            value = raw_value.strip()
        elif isinstance(raw_value, (int, float, bool)):
            value = str(raw_value).strip()
        else:
            raise bad_request(f'"{field["label"]}" alanı için geçerli bir değer girin.')

        if field.get("required") and not value:
            raise bad_request(f'"{field["label"]}" alanı zorunludur.')

        if not value:
            continue

        if field.get("type") == "select":
            options = field.get("options") or []
            if value not in options:
                raise bad_request(f'"{field["label"]}" alanı için geçerli bir seçim yapın.')

        normalized[field_id] = value[:1000]

    return normalized


async def _get_checkin_context_by_token(checkin_token: str, db: AsyncSession) -> Optional[Dict[str, Any]]:
    now_ts = time.time()
    cached = _checkin_context_cache.get(checkin_token)
    if cached and now_ts < cached[0]:
        return cached[1]

    res = await db.execute(
        select(
            EventSession.id,
            EventSession.name,
            EventSession.session_date,
            EventSession.session_start,
            EventSession.session_location,
            EventSession.is_active,
            Event.id.label("event_id"),
            Event.public_id.label("event_public_id"),
            Event.name.label("event_name"),
            Event.event_date,
            Event.min_sessions_required,
        )
        .join(Event, Event.id == EventSession.event_id)
        .where(EventSession.checkin_token == checkin_token)
        .limit(1)
    )
    row = res.first()
    if not row:
        return None

    ctx = {
        "session_id": row.id,
        "session_name": row.name,
        "session_date": row.session_date,
        "session_start": row.session_start,
        "session_location": row.session_location,
        "is_active": bool(row.is_active),
        "event_id": row.event_id,
        "event_public_id": row.event_public_id or str(row.event_id),
        "event_name": row.event_name,
        "event_date": row.event_date,
        "min_sessions_required": int(row.min_sessions_required or 0),
    }
    _checkin_context_cache[checkin_token] = (now_ts + CHECKIN_CONTEXT_TTL_SECONDS, ctx)
    return ctx


async def _get_event_total_sessions_cached(event_id: int, db: AsyncSession) -> int:
    now_ts = time.time()
    cached = _event_total_sessions_cache.get(event_id)
    if cached and now_ts < cached[0]:
        return cached[1]

    total_sess_res = await db.execute(
        select(func.count()).where(EventSession.event_id == event_id)
    )
    total_sessions = int(total_sess_res.scalar_one() or 0)
    _event_total_sessions_cache[event_id] = (now_ts + EVENT_TOTAL_SESSIONS_TTL_SECONDS, total_sessions)
    return total_sessions


def _safe_cert_filename(student_name: str, public_id: str) -> str:
    base = f"{student_name}_{public_id}.pdf"
    return "".join(c if c.isalnum() or c in " _-." else "_" for c in base)


async def _process_one_bulk_certificate_job(job_id: int) -> None:
    ISSUE_UNITS_PER_CERT = 10

    async with SessionLocal() as db_job:
        res_job = await db_job.execute(
            select(BulkCertificateJob).where(BulkCertificateJob.id == job_id).with_for_update()
        )
        job = res_job.scalar_one_or_none()
        if not job:
            return

        if job.status in ["completed", "failed", "cancelled"]:
            return

        if job.status == "pending":
            job.status = "processing"
            job.started_at = datetime.now(timezone.utc)

        names: List[str] = [str(x).strip() for x in (job.names or []) if str(x).strip()]
        total = len(names)
        job.total_count = total

        if job.current_index >= total:
            if not job.zip_file_path and job.generated_files:
                zip_rel_path = f"zips/event_{job.event_id}/bulk_job_{job.id}.zip"
                zip_abs_path = Path(settings.local_storage_dir) / zip_rel_path
                zip_abs_path.parent.mkdir(parents=True, exist_ok=True)
                with zipfile.ZipFile(zip_abs_path, "w", zipfile.ZIP_DEFLATED) as zf:
                    for item in job.generated_files or []:
                        rel_pdf = item.get("rel_pdf_path")
                        filename = item.get("file_name")
                        if not rel_pdf or not filename:
                            continue
                        pdf_abs = Path(settings.local_storage_dir) / rel_pdf
                        if pdf_abs.exists():
                            zf.write(pdf_abs, filename)
                job.zip_file_path = zip_rel_path
            job.status = "completed"
            job.completed_at = datetime.now(timezone.utc)
            db_job.add(job)
            await db_job.commit()
            return

        q_event = select(Event).where(Event.id == job.event_id)
        if job.created_by:
            q_event = q_event.where(Event.admin_id == job.created_by)
        res_ev = await db_job.execute(q_event)
        ev = res_ev.scalar_one_or_none()
        if not ev:
            job.status = "failed"
            job.error_message = "Event not found or access denied"
            job.completed_at = datetime.now(timezone.utc)
            db_job.add(job)
            await db_job.commit()
            return

        try:
            cfg = editor_config_to_template_config(ev.config or {})
        except Exception as e:
            job.status = "failed"
            job.error_message = f"Invalid event config: {e}"
            job.completed_at = datetime.now(timezone.utc)
            db_job.add(job)
            await db_job.commit()
            return

        res_user = await db_job.execute(select(User).where(User.id == job.created_by))
        user = res_user.scalar_one_or_none()
        if not user:
            job.status = "failed"
            job.error_message = "Job owner not found"
            job.completed_at = datetime.now(timezone.utc)
            db_job.add(job)
            await db_job.commit()
            return

        template_path = local_path_from_url(ev.template_image_url)
        if not template_path.exists():
            job.status = "failed"
            job.error_message = "Template image not found"
            job.completed_at = datetime.now(timezone.utc)
            db_job.add(job)
            await db_job.commit()
            return
        template_bytes = template_path.read_bytes()

        org_res = await db_job.execute(select(Organization).where(Organization.user_id == job.created_by))
        org = org_res.scalar_one_or_none()
        brand_logo_bytes: Optional[bytes] = None
        if org and org.brand_logo:
            try:
                logo_path = local_path_from_url(org.brand_logo)
                if logo_path.exists():
                    brand_logo_bytes = logo_path.read_bytes()
            except Exception:
                pass

        start_idx = max(0, int(job.current_index or 0))
        end_idx = min(total, start_idx + max(1, int(job.chunk_size or 10)))

        generated_files = list(job.generated_files or [])

        for idx in range(start_idx, end_idx):
            student_name = names[idx]

            if user.heptacoin_balance < ISSUE_UNITS_PER_CERT:
                job.status = "failed"
                job.error_message = f"Insufficient HeptaCoin at index={idx}"
                job.current_index = idx
                job.completed_at = datetime.now(timezone.utc)
                db_job.add(job)
                await db_job.commit()
                return

            cert_check = await db_job.execute(
                select(Certificate).where(
                    Certificate.event_id == ev.id,
                    Certificate.student_name == student_name,
                    Certificate.deleted_at.is_(None),
                )
            )
            if cert_check.scalar_one_or_none():
                job.already_exists_count += 1
                job.current_index = idx + 1
                continue

            try:
                cert_uuid = new_certificate_uuid()

                ev_lock_res = await db_job.execute(select(Event).where(Event.id == ev.id).with_for_update())
                ev_locked = ev_lock_res.scalar_one()
                ev_locked.cert_seq += 1
                public_id = f"EV{ev_locked.id}-{ev_locked.cert_seq:06d}"
                verify_url = build_certificate_verify_url(cert_uuid)

                pdf_bytes = await asyncio.to_thread(
                    render_certificate_pdf,
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
                try:
                    png_bytes = await asyncio.to_thread(
                        render_certificate_png_watermarked,
                        template_image_bytes=template_bytes,
                        student_name=student_name,
                        verify_url=verify_url,
                        config=cfg,
                        public_id=public_id,
                        brand_logo_bytes=brand_logo_bytes,
                    )
                    rel_png_path = _certificate_png_rel_path(ev.id, cert_uuid)
                    abs_png_path = Path(settings.local_storage_dir) / rel_png_path
                    abs_png_path.parent.mkdir(parents=True, exist_ok=True)
                    abs_png_path.write_bytes(png_bytes)
                except Exception as png_ex:
                    logger.warning("Bulk certificate PNG render failed for job=%s idx=%s: %s", job.id, idx, png_ex)

                asset_size_bytes = abs_pdf_path.stat().st_size
                hosting_term = "yearly"
                hosting_spend = hosting_units(hosting_term, asset_size_bytes)
                spend_units = ISSUE_UNITS_PER_CERT + hosting_spend

                if user.heptacoin_balance < spend_units:
                    job.status = "failed"
                    job.error_message = f"Insufficient HeptaCoin at index={idx}"
                    job.current_index = idx
                    job.completed_at = datetime.now(timezone.utc)
                    db_job.add(job)
                    await db_job.commit()
                    return

                pdf_url = build_public_pdf_url(rel_pdf_path)
                hosting_ends_at = compute_hosting_ends(hosting_term)

                cert = Certificate(
                    uuid=cert_uuid,
                    public_id=public_id,
                    student_name=student_name,
                    event_id=ev.id,
                    pdf_url=pdf_url,
                    status=CertStatus.active,
                    hosting_term=hosting_term,
                    hosting_ends_at=hosting_ends_at,
                    asset_size_bytes=asset_size_bytes,
                )
                db_job.add(cert)

                user.heptacoin_balance -= spend_units
                db_job.add(Transaction(user_id=user.id, amount=spend_units, type=TxType.spend))

                job.created_count += 1
                job.spent_heptacoin += spend_units
                generated_files.append({
                    "rel_pdf_path": rel_pdf_path,
                    "file_name": _safe_cert_filename(student_name, public_id),
                })
                job.generated_files = generated_files
                job.current_index = idx + 1

                attendee_res = await db_job.execute(
                    select(Attendee)
                    .where(
                        Attendee.event_id == ev.id,
                        func.lower(Attendee.name) == (student_name or "").strip().lower(),
                    )
                    .order_by(Attendee.id.asc())
                    .limit(1)
                )
                attendee_for_email = attendee_res.scalar_one_or_none()
                if attendee_for_email and attendee_for_email.email:
                    await send_certificate_delivery_email_task(
                        event_id=ev.id,
                        cert_uuid=cert_uuid,
                        recipient_name=attendee_for_email.name,
                        recipient_email=attendee_for_email.email,
                    )
            except Exception as ex:
                logger.error("Bulk certificate job %s failed at idx=%s: %s", job.id, idx, ex)
                job.failed_count += 1
                job.current_index = idx + 1

        if job.current_index >= total:
            zip_rel_path = f"zips/event_{job.event_id}/bulk_job_{job.id}.zip"
            zip_abs_path = Path(settings.local_storage_dir) / zip_rel_path
            zip_abs_path.parent.mkdir(parents=True, exist_ok=True)
            with zipfile.ZipFile(zip_abs_path, "w", zipfile.ZIP_DEFLATED) as zf:
                for item in generated_files:
                    rel_pdf = item.get("rel_pdf_path")
                    filename = item.get("file_name")
                    if not rel_pdf or not filename:
                        continue
                    pdf_abs = Path(settings.local_storage_dir) / rel_pdf
                    if pdf_abs.exists():
                        zf.write(pdf_abs, filename)
            job.zip_file_path = zip_rel_path
            job.status = "completed"
            job.completed_at = datetime.now(timezone.utc)

        db_job.add(job)
        await db_job.commit()


async def _process_bulk_certificate_jobs() -> None:
    if bulk_cert_job_lock.locked():
        return

    async with bulk_cert_job_lock:
        async with SessionLocal() as db_q:
            res = await db_q.execute(
                select(BulkCertificateJob.id)
                .where(BulkCertificateJob.status.in_(["pending", "processing"]))
                .order_by(BulkCertificateJob.created_at.asc())
                .limit(1)
            )
            job_ids = [r[0] for r in res.all()]

        for job_id in job_ids:
            try:
                await _process_one_bulk_certificate_job(job_id)
            except Exception as e:
                logger.error("Bulk certificate queue processor failed for job=%s: %s", job_id, e)


# Ã¢â€â‚¬Ã¢â€â‚¬ Badge Management Endpoints Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

@app.post("/api/admin/events/{event_id}/badge-rules", response_model=BadgeRulesOut)
async def create_or_update_badge_rules(
    event_id: int,
    rules_in: BadgeRulesIn,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create or update badge rules for an event. Admin only."""
    # Check authorization
    e_res = await db.execute(select(Event).where(Event.id == event_id))
    event = e_res.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Etkinlik bulunamadÃ„Â±")
    
    if event.admin_id != current_user.id and current_user.role != Role.superadmin:
        raise HTTPException(status_code=403, detail="Yetkisiz eriÃ…Å¸im")

    # Check if rules already exist
    br_res = await db.execute(
        select(BadgeRule).where(BadgeRule.event_id == event_id)
    )
    badge_rule = br_res.scalar_one_or_none()

    if badge_rule:
        badge_rule.badge_definitions = [d.model_dump() for d in rules_in.badge_definitions]
        badge_rule.enabled = rules_in.enabled
        badge_rule.updated_at = datetime.utcnow()
    else:
        badge_rule = BadgeRule(
            event_id=event_id,
            badge_definitions=[d.model_dump() for d in rules_in.badge_definitions],
            enabled=rules_in.enabled,
            created_by=current_user.id,
            updated_at=datetime.utcnow(),
        )
        db.add(badge_rule)

    await db.commit()
    await db.refresh(badge_rule)
    return badge_rule


@app.get("/api/admin/events/{event_id}/badge-rules", response_model=Optional[BadgeRulesOut])
async def get_badge_rules(
    event_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get badge rules for an event."""
    e_res = await db.execute(select(Event).where(Event.id == event_id))
    event = e_res.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Etkinlik bulunamadÃ„Â±")

    if event.admin_id != current_user.id and current_user.role != Role.superadmin:
        raise HTTPException(status_code=403, detail="Yetkisiz eriÃ…Å¸im")

    br_res = await db.execute(
        select(BadgeRule).where(BadgeRule.event_id == event_id)
    )
    badge_rule = br_res.scalar_one_or_none()
    return badge_rule


@app.post("/api/admin/events/{event_id}/badges", response_model=ParticipantBadgeOut)
async def award_badge_manually(
    event_id: int,
    badge_in: AwardBadgeIn,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Manually award a badge to an attendee."""
    # Check authorization
    e_res = await db.execute(select(Event).where(Event.id == event_id))
    event = e_res.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Etkinlik bulunamadÃ„Â±")

    if event.admin_id != current_user.id and current_user.role != Role.superadmin:
        raise HTTPException(status_code=403, detail="Yetkisiz eriÃ…Å¸im")

    # Check attendee exists
    att_res = await db.execute(
        select(Attendee).where(
            Attendee.id == badge_in.attendee_id,
            Attendee.event_id == event_id,
        )
    )
    attendee = att_res.scalar_one_or_none()
    if not attendee:
        raise HTTPException(status_code=404, detail="KatÃ„Â±lÃ„Â±mcÃ„Â± bulunamadÃ„Â±")

    # Check if badge already exists
    pb_res = await db.execute(
        select(ParticipantBadge).where(
            ParticipantBadge.event_id == event_id,
            ParticipantBadge.attendee_id == badge_in.attendee_id,
            ParticipantBadge.badge_type == badge_in.badge_type,
        )
    )
    existing_badge = pb_res.scalar_one_or_none()
    if existing_badge:
        raise HTTPException(status_code=409, detail="Bu rozet zaten veriliÃ…Å¸")

    # Create badge
    new_badge = ParticipantBadge(
        event_id=event_id,
        attendee_id=badge_in.attendee_id,
        badge_type=badge_in.badge_type,
        criteria_met=badge_in.criteria_met,
        awarded_by=current_user.id,
        awarded_at=datetime.utcnow(),
        is_automatic=False,
        badge_metadata=badge_in.badge_metadata,
    )
    db.add(new_badge)
    await db.commit()
    await db.refresh(new_badge)
    return new_badge


async def _build_participant_badge_items(
    db: AsyncSession,
    event_id: int,
    badges: List[ParticipantBadge],
) -> List[ParticipantBadgeOut]:
    att_res = await db.execute(select(Attendee).where(Attendee.event_id == event_id))
    attendees = att_res.scalars().all()
    attendee_map = {attendee.id: attendee for attendee in attendees}

    br_res = await db.execute(select(BadgeRule).where(BadgeRule.event_id == event_id))
    badge_rule = br_res.scalar_one_or_none()
    badge_definition_map = (
        {
            str(definition.get("type", "")): definition
            for definition in (badge_rule.badge_definitions or [])
            if definition.get("type")
        }
        if badge_rule
        else {}
    )

    badge_items: List[ParticipantBadgeOut] = []
    for badge in badges:
        attendee = attendee_map.get(badge.attendee_id)
        definition = badge_definition_map.get(badge.badge_type, {})
        badge_items.append(
            ParticipantBadgeOut(
                id=badge.id,
                event_id=badge.event_id,
                attendee_id=badge.attendee_id,
                badge_type=badge.badge_type,
                badge_name=definition.get("name"),
                badge_description=definition.get("description"),
                badge_icon_url=definition.get("icon_url"),
                badge_color_hex=definition.get("color_hex"),
                attendee_name=attendee.name if attendee else None,
                attendee_email=attendee.email if attendee else None,
                criteria_met=badge.criteria_met or {},
                awarded_by=badge.awarded_by,
                awarded_at=badge.awarded_at,
                is_automatic=badge.is_automatic,
                badge_metadata=badge.badge_metadata,
            )
        )

    return badge_items


@app.get("/api/admin/events/{event_id}/badges")
async def list_badges(
    event_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all awarded badges for an event."""
    e_res = await db.execute(select(Event).where(Event.id == event_id))
    event = e_res.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Etkinlik bulunamadÃ„Â±")

    if event.admin_id != current_user.id and current_user.role != Role.superadmin:
        raise HTTPException(status_code=403, detail="Yetkisiz eriÃ…Å¸im")

    pb_res = await db.execute(
        select(ParticipantBadge)
        .where(ParticipantBadge.event_id == event_id)
        .order_by(ParticipantBadge.awarded_at.desc())
    )
    badges = pb_res.scalars().all()

    by_type: Dict[str, int] = {}
    automatic_count = 0
    manual_count = 0
    for badge in badges:
        by_type[badge.badge_type] = by_type.get(badge.badge_type, 0) + 1
        if badge.is_automatic:
            automatic_count += 1
        else:
            manual_count += 1

    badge_items = await _build_participant_badge_items(db, event_id, badges)

    return {
        "total_badges": len(badges),
        "badges": badge_items,
        "badge_summary": {
            "by_type": by_type,
            "automatic_vs_manual": {"automatic": automatic_count, "manual": manual_count},
        },
    }


@app.get("/api/events/{event_id}/attendees/{attendee_id}/badges")
async def list_public_attendee_badges(
    event_id: str,
    attendee_id: int,
    email: str = Query(..., min_length=3),
    db: AsyncSession = Depends(get_db),
):
    """List awarded badges for a public attendee view."""
    event = await _resolve_public_event(db, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    attendee_res = await db.execute(
        select(Attendee).where(
            Attendee.id == attendee_id,
            Attendee.event_id == event.id,
        )
    )
    attendee = attendee_res.scalar_one_or_none()
    if not attendee or attendee.email.lower() != email.lower():
        raise HTTPException(status_code=404, detail="Attendee not found")

    pb_res = await db.execute(
        select(ParticipantBadge)
        .where(
            ParticipantBadge.event_id == event.id,
            ParticipantBadge.attendee_id == attendee_id,
        )
        .order_by(ParticipantBadge.awarded_at.desc())
    )
    badges = pb_res.scalars().all()
    badge_items = await _build_participant_badge_items(db, event.id, badges)

    return {
        "total_badges": len(badge_items),
        "badges": badge_items,
    }


@app.get("/api/events/{event_id}/survey-access")
async def resolve_public_survey_access(
    event_id: str,
    token: str = Query(..., min_length=8),
    db: AsyncSession = Depends(get_db),
):
    """Resolve a signed public survey token to attendee context."""
    event = await _resolve_public_event(db, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    try:
        payload = verify_survey_access_token(token, event_id=event.id)
    except SignatureExpired:
        raise HTTPException(status_code=410, detail="Survey access link expired")
    except BadSignature:
        raise HTTPException(status_code=400, detail="Invalid survey access link")

    attendee_id = int(payload.get("attendee_id") or 0)
    attendee_res = await db.execute(
        select(Attendee).where(
            Attendee.id == attendee_id,
            Attendee.event_id == event.id,
        )
    )
    attendee = attendee_res.scalar_one_or_none()
    if not attendee or attendee.email.lower() != str(payload.get("email") or "").lower():
        raise HTTPException(status_code=404, detail="Attendee not found")

    return {
        "attendee_id": attendee.id,
        "attendee_name": attendee.name,
        "attendee_email": attendee.email,
        "survey_token": token,
    }


@app.get("/api/events/{event_id}/participant-status", response_model=PublicParticipantStatusOut)
async def get_public_participant_status(
    event_id: str,
    token: str = Query(..., min_length=8),
    db: AsyncSession = Depends(get_db),
):
    event = await _resolve_public_event(db, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    try:
        payload = verify_survey_access_token(token, event_id=event.id)
    except SignatureExpired:
        raise HTTPException(status_code=410, detail="Survey access link expired")
    except BadSignature:
        raise HTTPException(status_code=400, detail="Invalid survey access link")

    attendee_id = int(payload.get("attendee_id") or 0)
    attendee_res = await db.execute(
        select(Attendee).where(
            Attendee.id == attendee_id,
            Attendee.event_id == event.id,
        )
    )
    attendee = attendee_res.scalar_one_or_none()
    if not attendee or attendee.email.lower() != str(payload.get("email") or "").lower():
        raise HTTPException(status_code=404, detail="Attendee not found")

    return await build_public_participant_status(db, event=event, attendee=attendee)


@app.post("/api/admin/events/{event_id}/badges/calculate")
async def trigger_automatic_badge_calculation(
    event_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Trigger automatic badge calculation for all attendees in an event."""
    e_res = await db.execute(select(Event).where(Event.id == event_id))
    event = e_res.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Etkinlik bulunamadÃ„Â±")

    if event.admin_id != current_user.id and current_user.role != Role.superadmin:
        raise HTTPException(status_code=403, detail="Yetkisiz eriÃ…Å¸im")

    # Get badge rules
    br_res = await db.execute(
        select(BadgeRule).where(BadgeRule.event_id == event_id)
    )
    badge_rule = br_res.scalar_one_or_none()
    if not badge_rule:
        raise HTTPException(status_code=404, detail="Bu etkinlik iÃƒÂ§in rozet kurallarÃ„Â± belirlenmemiÃ…Å¸")

    if not badge_rule.enabled:
        raise HTTPException(status_code=400, detail="Rozet sistemi bu etkinlik iÃƒÂ§in devre dÃ„Â±Ã…Å¸Ã„Â±")
    if not badge_rule.badge_definitions:
        raise HTTPException(status_code=400, detail="Hesaplama iÃƒÂ§in en az bir rozet tanÃ„Â±mÃ„Â± gerekli")

    # Get all attendees
    att_res = await db.execute(
        select(Attendee).where(Attendee.event_id == event_id)
    )
    attendees = att_res.scalars().all()

    # Pre-compute total session count for attendance_rate
    sessions_res = await db.execute(
        select(func.count()).select_from(EventSession).where(EventSession.event_id == event_id)
    )
    total_sessions = sessions_res.scalar() or 0

    # Pre-compute registration ranks (ordered by registered_at asc)
    rank_map: dict[int, int] = {
        att.id: idx + 1
        for idx, att in enumerate(sorted(attendees, key=lambda a: a.registered_at))
    }

    created_count = 0
    for attendee in attendees:
        # Load attendance records for this attendee once
        ar_res = await db.execute(
            select(func.count()).select_from(AttendanceRecord).where(
                AttendanceRecord.attendee_id == attendee.id
            )
        )
        sessions_attended = ar_res.scalar() or 0

        # For each badge definition, check if criteria are met
        for badge_def in badge_rule.badge_definitions or []:
            badge_type = badge_def.get("type", "")

            # Check if badge already exists
            pb_res = await db.execute(
                select(ParticipantBadge).where(
                    ParticipantBadge.event_id == event_id,
                    ParticipantBadge.attendee_id == attendee.id,
                    ParticipantBadge.badge_type == badge_type,
                )
            )
            if pb_res.scalar_one_or_none():
                continue  # Already has this badge

            # Evaluate each criterion
            criteria = badge_def.get("criteria") or {}
            passed = True
            criteria_met: dict = {}

            for key, threshold in criteria.items():
                if key == "min_sessions":
                    ok = sessions_attended >= int(threshold)
                    criteria_met[key] = {"required": threshold, "actual": sessions_attended, "passed": ok}
                    if not ok:
                        passed = False

                elif key == "attendance_rate":
                    rate = (sessions_attended / total_sessions * 100) if total_sessions > 0 else 0
                    ok = rate >= float(threshold)
                    criteria_met[key] = {"required": threshold, "actual": round(rate, 1), "passed": ok}
                    if not ok:
                        passed = False

                elif key == "registered_rank_max":
                    rank = rank_map.get(attendee.id, 9999)
                    ok = rank <= int(threshold)
                    criteria_met[key] = {"required": threshold, "actual": rank, "passed": ok}
                    if not ok:
                        passed = False

                elif key == "survey_completed":
                    required = bool(threshold)
                    actual = attendee.survey_completed_at is not None
                    ok = actual == required if required else True
                    criteria_met[key] = {"required": required, "actual": actual, "passed": ok}
                    if not ok:
                        passed = False

                elif key == "can_download_cert":
                    required = bool(threshold)
                    ok = attendee.can_download_cert == required if required else True
                    criteria_met[key] = {"required": required, "actual": attendee.can_download_cert, "passed": ok}
                    if not ok:
                        passed = False

            if not passed:
                continue

            badge = ParticipantBadge(
                event_id=event_id,
                attendee_id=attendee.id,
                badge_type=badge_type,
                criteria_met=criteria_met,
                awarded_at=datetime.utcnow(),
                is_automatic=True,
                badge_metadata={
                    "calculation_rule_version": "1.0",
                    "calculated_at": datetime.utcnow().isoformat(),
                },
            )
            db.add(badge)
            created_count += 1

    await db.commit()

    return {
        "status": "success",
        "message": f"{created_count} rozet hesaplandÃ„Â± ve verildi",
        "badges_created": created_count,
    }


# Ã¢â€â‚¬Ã¢â€â‚¬ Certificate Tier Endpoints Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

@app.post("/api/admin/events/{event_id}/certificate-tiers", response_model=CertificateTierRulesOut)
async def create_or_update_tier_rules(
    event_id: int,
    tier_rules_in: CertificateTierRulesIn,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create or update certificate tier rules for an event."""
    # Check authorization
    e_res = await db.execute(select(Event).where(Event.id == event_id))
    event = e_res.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Etkinlik bulunamadÃ„Â±")

    if event.admin_id != current_user.id and current_user.role != Role.superadmin:
        raise HTTPException(status_code=403, detail="Yetkisiz eriÃ…Å¸im")

    # Check if rules exist
    ctr_res = await db.execute(
        select(CertificateTierRule).where(CertificateTierRule.event_id == event_id)
    )
    tier_rule = ctr_res.scalar_one_or_none()

    if tier_rule:
        tier_rule.tier_definitions = [t.model_dump() for t in tier_rules_in.tier_definitions]
        tier_rule.updated_at = datetime.utcnow()
    else:
        tier_rule = CertificateTierRule(
            event_id=event_id,
            tier_definitions=[t.model_dump() for t in tier_rules_in.tier_definitions],
            created_by=current_user.id,
            updated_at=datetime.utcnow(),
        )
        db.add(tier_rule)

    await db.commit()
    await db.refresh(tier_rule)
    return tier_rule


@app.get("/api/admin/events/{event_id}/certificate-tiers", response_model=Optional[CertificateTierRulesOut])
async def get_tier_rules(
    event_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get certificate tier rules for an event."""
    e_res = await db.execute(select(Event).where(Event.id == event_id))
    event = e_res.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Etkinlik bulunamadÃ„Â±")

    if event.admin_id != current_user.id and current_user.role != Role.superadmin:
        raise HTTPException(status_code=403, detail="Yetkisiz eriÃ…Å¸im")

    ctr_res = await db.execute(
        select(CertificateTierRule).where(CertificateTierRule.event_id == event_id)
    )
    tier_rule = ctr_res.scalar_one_or_none()
    return tier_rule


@app.post("/api/admin/events/{event_id}/certificates/assign-tiers")
async def assign_certificate_tiers(
    event_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Assign certificate tiers to all attendees based on the defined rules."""
    # Check authorization
    e_res = await db.execute(select(Event).where(Event.id == event_id))
    event = e_res.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Etkinlik bulunamadÃ„Â±")

    if event.admin_id != current_user.id and current_user.role != Role.superadmin:
        raise HTTPException(status_code=403, detail="Yetkisiz eriÃ…Å¸im")

    # Get tier rules
    ctr_res = await db.execute(
        select(CertificateTierRule).where(CertificateTierRule.event_id == event_id)
    )
    tier_rule = ctr_res.scalar_one_or_none()
    if not tier_rule:
        raise HTTPException(status_code=404, detail="Bu etkinlik iÃƒÂ§in sertifika seviyesi kurallarÃ„Â± belirlenmemiÃ…Å¸")

    # Get all certificates that don't have a tier yet
    certs_res = await db.execute(
        select(Certificate)
        .where(
            Certificate.event_id == event_id,
            Certificate.status == CertStatus.active,
            Certificate.certificate_tier.is_(None),
        )
        .order_by(Certificate.created_at)
    )
    certificates = certs_res.scalars().all()

    assigned_count = 0
    for cert in certificates:
        # For simplicity, assign first matching tier
        # In production, implement complex condition evaluation
        for tier_def in tier_rule.tier_definitions or []:
            tier_name = tier_def.get("tier_name", "Unknown")
            cert.certificate_tier = tier_name
            assigned_count += 1
            break

    await db.commit()

    return {
        "status": "success",
        "message": f"{assigned_count} sertifikaya seviye atandÃ„Â±",
        "certificates_assigned": assigned_count,
    }


@app.get("/api/admin/events/{event_id}/certificates/tier-summary")
async def get_tier_summary(
    event_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get summary of certificate tier distribution for an event."""
    e_res = await db.execute(select(Event).where(Event.id == event_id))
    event = e_res.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Etkinlik bulunamadÃ„Â±")

    if event.admin_id != current_user.id and current_user.role != Role.superadmin:
        raise HTTPException(status_code=403, detail="Yetkisiz eriÃ…Å¸im")

    # Get tier distribution
    certs_res = await db.execute(
        select(Certificate.certificate_tier, func.count(Certificate.id).label('count'))
        .where(Certificate.event_id == event_id, Certificate.status == CertStatus.active)
        .group_by(Certificate.certificate_tier)
    )
    tier_counts = certs_res.all()

    tier_summary = {
        "total_certificates": 0,
        "by_tier": {},
        "tier_percentages": {},
    }

    total = sum(count for _, count in tier_counts)
    tier_summary["total_certificates"] = total

    for tier_name, count in tier_counts:
        tier_key = tier_name or "Unassigned"
        tier_summary["by_tier"][tier_key] = count
        if total > 0:
            tier_summary["tier_percentages"][tier_key] = round((count / total) * 100, 2)

    return tier_summary


# Ã¢â€â‚¬Ã¢â€â‚¬ Survey Integration Endpoints Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

@app.post("/api/admin/events/{event_id}/survey-config", response_model=EventSurveyOut)
async def configure_event_survey(
    event_id: int,
    survey_in: EventSurveyIn,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Configure survey requirements for an event."""
    e_res = await db.execute(select(Event).where(Event.id == event_id))
    event = e_res.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Etkinlik bulunamad?")

    if event.admin_id != current_user.id and current_user.role != Role.superadmin:
        raise HTTPException(status_code=403, detail="Yetkisiz eri?im")

    if survey_in.survey_type not in {"builtin", "external", "both"}:
        raise HTTPException(status_code=400, detail="Ge?ersiz anket t?r?")

    builtin_questions = [q.model_dump() for q in survey_in.builtin_questions]
    if survey_in.survey_type in {"builtin", "both"} and not builtin_questions:
        raise HTTPException(status_code=400, detail="Yerle?ik anket i?in en az bir soru gerekli")

    if survey_in.survey_type in {"external", "both"} and not survey_in.external_url:
        raise HTTPException(status_code=400, detail="Harici anket i?in URL gerekli")

    webhook_key = survey_in.external_webhook_key
    if survey_in.survey_type in {"external", "both"} and not webhook_key:
        webhook_key = secrets.token_urlsafe(24)
    elif survey_in.survey_type == "builtin":
        webhook_key = None

    es_res = await db.execute(select(EventSurvey).where(EventSurvey.event_id == event_id))
    event_survey = es_res.scalar_one_or_none()

    if event_survey:
        event_survey.is_required = survey_in.is_required
        event_survey.survey_type = survey_in.survey_type
        event_survey.builtin_questions = builtin_questions
        event_survey.external_provider = survey_in.external_provider
        event_survey.external_url = survey_in.external_url
        event_survey.external_webhook_key = webhook_key
    else:
        event_survey = EventSurvey(
            event_id=event_id,
            is_required=survey_in.is_required,
            survey_type=survey_in.survey_type,
            builtin_questions=builtin_questions,
            external_provider=survey_in.external_provider,
            external_url=survey_in.external_url,
            external_webhook_key=webhook_key,
        )
        db.add(event_survey)

    att_res = await db.execute(select(Attendee).where(Attendee.event_id == event_id))
    attendees = att_res.scalars().all()
    for attendee in attendees:
        attendee.survey_required = survey_in.is_required
        if survey_in.is_required:
            attendee.can_download_cert = attendee.survey_completed_at is not None
        else:
            attendee.can_download_cert = True

    await db.commit()
    await db.refresh(event_survey)
    return event_survey


@app.get("/api/admin/events/{event_id}/survey-config", response_model=Optional[EventSurveyOut])
async def get_event_survey(
    event_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get survey configuration for an event."""
    e_res = await db.execute(select(Event).where(Event.id == event_id))
    event = e_res.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Etkinlik bulunamad?")

    if event.admin_id != current_user.id and current_user.role != Role.superadmin:
        raise HTTPException(status_code=403, detail="Yetkisiz eri?im")

    es_res = await db.execute(select(EventSurvey).where(EventSurvey.event_id == event_id))
    event_survey = es_res.scalar_one_or_none()
    return event_survey


@app.post("/api/surveys/{event_id}/submit", response_model=SurveyResponseOut)
async def submit_builtin_survey(
    event_id: str,
    survey_resp_in: SurveyResponseIn,
    attendee_id_header_snake: Optional[int] = Header(default=None, alias="attendee_id"),
    attendee_id_header_kebab: Optional[int] = Header(default=None, alias="attendee-id"),
    db: AsyncSession = Depends(get_db),
):
    """Submit a built-in survey response. Attendee endpoint."""
    event = await _resolve_public_event(db, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    event_db_id = event.id
    attendee_id = survey_resp_in.attendee_id or attendee_id_header_snake or attendee_id_header_kebab
    token_email: Optional[str] = None
    if survey_resp_in.survey_token:
        try:
            token_payload = verify_survey_access_token(survey_resp_in.survey_token, event_id=event_db_id)
        except SignatureExpired:
            raise HTTPException(status_code=410, detail="Survey access link expired")
        except BadSignature:
            raise HTTPException(status_code=400, detail="Invalid survey access link")

        attendee_id = int(token_payload.get("attendee_id") or 0)
        token_email = str(token_payload.get("email") or "").lower()

    if not attendee_id:
        raise HTTPException(status_code=422, detail="attendee_id zorunludur")

    att_res = await db.execute(
        select(Attendee).where(
            Attendee.id == attendee_id,
            Attendee.event_id == event_db_id,
        )
    )
    attendee = att_res.scalar_one_or_none()
    if not attendee:
        raise HTTPException(status_code=404, detail="Kat?l?mc? bulunamad?")
    if token_email and attendee.email.lower() != token_email:
        raise HTTPException(status_code=404, detail="KatÃ„Â±lÃ„Â±mcÃ„Â± bulunamadÃ„Â±")

    es_res = await db.execute(select(EventSurvey).where(EventSurvey.event_id == event_db_id))
    event_survey = es_res.scalar_one_or_none()
    if not event_survey:
        raise HTTPException(status_code=400, detail="Bu etkinlik i?in anket yap?land?r?lmam??")

    if survey_resp_in.survey_type != "builtin":
        raise HTTPException(status_code=400, detail="Bu endpoint yaln?zca yerle?ik anket i?indir")

    if event_survey.survey_type not in {"builtin", "both"}:
        raise HTTPException(status_code=400, detail="Bu etkinlik yerle?ik anket kabul etmiyor")

    builtin_questions = event_survey.builtin_questions or []
    if not builtin_questions:
        raise HTTPException(status_code=400, detail="Yerle?ik anket sorular? tan?mlanmam??")

    answers = survey_resp_in.answers or {}
    for question in builtin_questions:
        question_id = str(question.get("id") or "").strip()
        if not question_id:
            continue

        raw_answer = answers.get(question_id)
        normalized_answer = str(raw_answer).strip() if raw_answer is not None else ""
        if question.get("required") and not normalized_answer:
            raise HTTPException(status_code=400, detail=f"'{question_id}' sorusu zorunludur")

        if question.get("type") == "multiple_choice" and normalized_answer:
            options = [str(option) for option in (question.get("options") or [])]
            if options and normalized_answer not in options:
                raise HTTPException(status_code=400, detail=f"'{question_id}' sorusu i?in ge?ersiz se?enek")

    sr_res = await db.execute(
        select(SurveyResponse).where(
            SurveyResponse.event_id == event_db_id,
            SurveyResponse.attendee_id == attendee_id,
            SurveyResponse.survey_type == survey_resp_in.survey_type,
        )
    )
    existing = sr_res.scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=409, detail="Bu anket zaten g?nderilmi?")

    now = datetime.utcnow()
    survey_response = SurveyResponse(
        event_id=event_db_id,
        attendee_id=attendee_id,
        survey_type=survey_resp_in.survey_type,
        answers=answers,
        external_response_id=survey_resp_in.external_response_id,
        completed_at=now,
        completion_proof={"submitted_at": now.isoformat()},
    )
    db.add(survey_response)

    attendee.survey_completed_at = now
    attendee.can_download_cert = True

    await db.commit()
    await db.refresh(survey_response)
    return survey_response


@app.post("/api/surveys/external/webhook")
async def handle_external_survey_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Handle webhook from external survey providers (Typeform, Qualtrics, etc.)."""
    try:
        payload = await request.json()
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    # Extract webhook key from headers
    webhook_key = request.headers.get("X-Webhook-Key", "")
    event_id = request.query_params.get("event_id")
    attendee_id = request.query_params.get("attendee_id")

    if not all([webhook_key, event_id, attendee_id]):
        raise HTTPException(status_code=400, detail="Missing required parameters")

    # Verify webhook key
    es_res = await db.execute(
        select(EventSurvey).where(EventSurvey.event_id == int(event_id))
    )
    event_survey = es_res.scalar_one_or_none()
    if not event_survey or event_survey.external_webhook_key != webhook_key:
        raise HTTPException(status_code=401, detail="Webhook key verification failed")

    if event_survey.survey_type not in {"external", "both"}:
        raise HTTPException(status_code=400, detail="Bu etkinlik harici anket kabul etmiyor")

    # Check if response already exists
    sr_res = await db.execute(
        select(SurveyResponse).where(
            SurveyResponse.event_id == int(event_id),
            SurveyResponse.attendee_id == int(attendee_id),
            SurveyResponse.survey_type == "external",
        )
    )
    existing = sr_res.scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=409, detail="Survey response already recorded")

    # Create response
    survey_response = SurveyResponse(
        event_id=int(event_id),
        attendee_id=int(attendee_id),
        survey_type="external",
        answers=None,
        external_response_id=payload.get("response_id"),
        completed_at=datetime.utcnow(),
        completion_proof=payload,
    )
    db.add(survey_response)

    # Update attendee
    att_res = await db.execute(
        select(Attendee).where(
            Attendee.id == int(attendee_id),
            Attendee.event_id == int(event_id),
        )
    )
    attendee = att_res.scalar_one_or_none()
    if not attendee:
        raise HTTPException(status_code=404, detail="Attendee not found")

    attendee.survey_completed_at = datetime.utcnow()
    attendee.can_download_cert = True

    await db.commit()

    return {
        "status": "success",
        "message": "Survey response recorded",
    }


@app.get("/api/admin/events/{event_id}/surveys/responses")
async def get_survey_responses(
    event_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all survey responses for an event. Admin only."""
    e_res = await db.execute(select(Event).where(Event.id == event_id))
    event = e_res.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Etkinlik bulunamadÃ„Â±")

    if event.admin_id != current_user.id and current_user.role != Role.superadmin:
        raise HTTPException(status_code=403, detail="Yetkisiz eriÃ…Å¸im")

    sr_res = await db.execute(
        select(SurveyResponse)
        .where(SurveyResponse.event_id == event_id)
        .order_by(SurveyResponse.completed_at.desc())
    )
    responses = sr_res.scalars().all()

    att_res = await db.execute(select(Attendee).where(Attendee.event_id == event_id))
    attendees = att_res.scalars().all()
    attendee_map = {attendee.id: attendee for attendee in attendees}
    completed_attendee_ids = {response.attendee_id for response in responses}

    return {
        "total_responses": len(responses),
        "responses": [
            SurveyResponseOut(
                id=response.id,
                event_id=response.event_id,
                attendee_id=response.attendee_id,
                attendee_name=attendee_map.get(response.attendee_id).name if attendee_map.get(response.attendee_id) else None,
                attendee_email=attendee_map.get(response.attendee_id).email if attendee_map.get(response.attendee_id) else None,
                survey_type=response.survey_type,
                answers=response.answers,
                external_response_id=response.external_response_id,
                completed_at=response.completed_at,
                completion_proof=response.completion_proof,
            )
            for response in responses
        ],
        "response_rate": {
            "completed": len(completed_attendee_ids),
            "pending": max(len(attendees) - len(completed_attendee_ids), 0),
        },
    }


# Ã¢â€â‚¬Ã¢â€â‚¬ Sponsor Management Endpoints Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

@app.post("/api/admin/events/{event_id}/sponsors", response_model=SponsorSlotOut)
async def create_sponsor_slot(
    event_id: int,
    sponsor_in: SponsorSlotIn,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a sponsor slot for an event."""
    # Check authorization
    e_res = await db.execute(select(Event).where(Event.id == event_id))
    event = e_res.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Etkinlik bulunamadÃ„Â±")

    if event.admin_id != current_user.id and current_user.role != Role.superadmin:
        raise HTTPException(status_code=403, detail="Yetkisiz eriÃ…Å¸im")

    # Create sponsor slot
    sponsor_slot = SponsorSlot(
        event_id=event_id,
        slot_position=sponsor_in.slot_position,
        sponsor_name=sponsor_in.sponsor_name,
        sponsor_logo_url=sponsor_in.sponsor_logo_url,
        sponsor_website_url=sponsor_in.sponsor_website_url,
        sponsor_color_hex=sponsor_in.sponsor_color_hex,
        enabled=sponsor_in.enabled,
        order_index=sponsor_in.order_index,
    )
    db.add(sponsor_slot)
    await db.commit()
    await db.refresh(sponsor_slot)
    return sponsor_slot


@app.get("/api/admin/events/{event_id}/sponsors")
async def list_sponsors(
    event_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all sponsor slots for an event."""
    e_res = await db.execute(select(Event).where(Event.id == event_id))
    event = e_res.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Etkinlik bulunamadÃ„Â±")

    if event.admin_id != current_user.id and current_user.role != Role.superadmin:
        raise HTTPException(status_code=403, detail="Yetkisiz eriÃ…Å¸im")

    ss_res = await db.execute(
        select(SponsorSlot)
        .where(SponsorSlot.event_id == event_id, SponsorSlot.enabled == True)
        .order_by(SponsorSlot.order_index)
    )
    sponsors = ss_res.scalars().all()

    return {
        "total_sponsors": len(sponsors),
        "sponsors": [SponsorSlotOut.model_validate(s) for s in sponsors],
        "by_position": {},
    }


@app.put("/api/admin/events/{event_id}/sponsors/{sponsor_id}", response_model=SponsorSlotOut)
async def update_sponsor_slot(
    event_id: int,
    sponsor_id: int,
    sponsor_in: SponsorSlotIn,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update a sponsor slot."""
    # Check authorization
    e_res = await db.execute(select(Event).where(Event.id == event_id))
    event = e_res.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Etkinlik bulunamadÃ„Â±")

    if event.admin_id != current_user.id and current_user.role != Role.superadmin:
        raise HTTPException(status_code=403, detail="Yetkisiz eriÃ…Å¸im")

    # Get sponsor slot
    ss_res = await db.execute(
        select(SponsorSlot).where(
            SponsorSlot.id == sponsor_id,
            SponsorSlot.event_id == event_id,
        )
    )
    sponsor_slot = ss_res.scalar_one_or_none()
    if not sponsor_slot:
        raise HTTPException(status_code=404, detail="Sponsor bulunamadÃ„Â±")

    # Update fields
    sponsor_slot.slot_position = sponsor_in.slot_position
    sponsor_slot.sponsor_name = sponsor_in.sponsor_name
    sponsor_slot.sponsor_logo_url = sponsor_in.sponsor_logo_url
    sponsor_slot.sponsor_website_url = sponsor_in.sponsor_website_url
    sponsor_slot.sponsor_color_hex = sponsor_in.sponsor_color_hex
    sponsor_slot.enabled = sponsor_in.enabled
    sponsor_slot.order_index = sponsor_in.order_index

    await db.commit()
    await db.refresh(sponsor_slot)
    return sponsor_slot


@app.delete("/api/admin/events/{event_id}/sponsors/{sponsor_id}")
async def delete_sponsor_slot(
    event_id: int,
    sponsor_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a sponsor slot."""
    # Check authorization
    e_res = await db.execute(select(Event).where(Event.id == event_id))
    event = e_res.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Etkinlik bulunamadÃ„Â±")

    if event.admin_id != current_user.id and current_user.role != Role.superadmin:
        raise HTTPException(status_code=403, detail="Yetkisiz eriÃ…Å¸im")

    # Get sponsor slot
    ss_res = await db.execute(
        select(SponsorSlot).where(
            SponsorSlot.id == sponsor_id,
            SponsorSlot.event_id == event_id,
        )
    )
    sponsor_slot = ss_res.scalar_one_or_none()
    if not sponsor_slot:
        raise HTTPException(status_code=404, detail="Sponsor bulunamadÃ„Â±")

    await db.delete(sponsor_slot)
    await db.commit()

    return {
        "status": "deleted",
        "message": f"Sponsor '{sponsor_slot.sponsor_name}' kaldÃ„Â±rÃ„Â±ldÃ„Â±",
    }


@app.get("/api/public/events/{event_id}/sponsors")
async def get_event_sponsors_public(
    event_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Get enabled sponsors for an event (public endpoint)."""
    ss_res = await db.execute(
        select(SponsorSlot)
        .where(SponsorSlot.event_id == event_id, SponsorSlot.enabled == True)
        .order_by(SponsorSlot.order_index)
    )
    sponsors = ss_res.scalars().all()

    # Group by position
    by_position = {}
    for sponsor in sponsors:
        if sponsor.slot_position not in by_position:
            by_position[sponsor.slot_position] = []
        by_position[sponsor.slot_position].append(SponsorSlotOut.model_validate(sponsor))

    return {
        "sponsors": [SponsorSlotOut.model_validate(s) for s in sponsors],
        "by_position": by_position,
        "total": len(sponsors),
    }


# Ã¢â€â‚¬Ã¢â€â‚¬ Analytics Endpoints Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

@app.get("/api/admin/events/{event_id}/analytics")
async def get_event_analytics(
    event_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get aggregated analytics for an event (attendees, certs, sessions)."""
    e_res = await db.execute(select(Event).where(Event.id == event_id))
    event = e_res.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Etkinlik bulunamadÃ„Â±")

    if event.admin_id != current_user.id and current_user.role != Role.superadmin:
        raise HTTPException(status_code=403, detail="Yetkisiz eriÃ…Å¸im")

    # Total attendees
    att_res = await db.execute(
        select(func.count(Attendee.id)).where(Attendee.event_id == event_id)
    )
    total_attendees = att_res.scalar() or 0

    # Certified (active certificates)
    cert_res = await db.execute(
        select(func.count(Certificate.id)).where(
            Certificate.event_id == event_id,
            Certificate.status == CertStatus.active,
        )
    )
    certified_count = cert_res.scalar() or 0
    pending_count = max(0, total_attendees - certified_count)

    # Sessions with per-session attendance rate
    sess_res = await db.execute(
        select(EventSession).where(EventSession.event_id == event_id).order_by(EventSession.id)
    )
    sessions = sess_res.scalars().all()

    session_data = []
    for session in sessions:
        arc_res = await db.execute(
            select(func.count(distinct(AttendanceRecord.attendee_id))).where(
                AttendanceRecord.session_id == session.id
            )
        )
        attended = arc_res.scalar() or 0
        rate = (attended / total_attendees) if total_attendees > 0 else 0.0
        session_data.append({"id": session.id, "name": session.name, "attendance_rate": rate})

    return {
        "event_id": event.id,
        "event_name": event.name,
        "total_attendees": total_attendees,
        "certified_count": certified_count,
        "pending_count": pending_count,
        "sessions": session_data,
    }


@app.get("/api/admin/events/{event_id}/analytics/engagement")
async def get_engagement_analytics(
    event_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get engagement analytics for an event (attendance, surveys, badges)."""
    e_res = await db.execute(select(Event).where(Event.id == event_id))
    event = e_res.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Etkinlik bulunamadÃ„Â±")

    if event.admin_id != current_user.id and current_user.role != Role.superadmin:
        raise HTTPException(status_code=403, detail="Yetkisiz eriÃ…Å¸im")

    # Get total attendees
    att_count_res = await db.execute(
        select(func.count(Attendee.id)).where(Attendee.event_id == event_id)
    )
    total_attendees = att_count_res.scalar() or 0

    # Get survey completion rate
    survey_completed_res = await db.execute(
        select(func.count(Attendee.id)).where(
            Attendee.event_id == event_id,
            Attendee.survey_completed_at.isnot(None),
        )
    )
    surveys_completed = survey_completed_res.scalar() or 0

    # Get badge distribution
    pb_res = await db.execute(
        select(func.count(ParticipantBadge.id)).where(
            ParticipantBadge.event_id == event_id
        )
    )
    total_badges = pb_res.scalar() or 0

    # Get attendance
    arc_res = await db.execute(
        select(func.count(distinct(AttendanceRecord.attendee_id))).where(
            AttendanceRecord.id.in_(
                select(AttendanceRecord.id).join(
                    EventSession,
                    EventSession.id == AttendanceRecord.session_id,
                ).where(EventSession.event_id == event_id)
            )
        )
    )
    attended_count = arc_res.scalar() or 0

    return {
        "total_attendees": total_attendees,
        "survey_completion": {
            "completed": surveys_completed,
            "pending": total_attendees - surveys_completed,
            "completion_rate": (surveys_completed / total_attendees * 100) if total_attendees > 0 else 0,
        },
        "badges": {
            "total_awarded": total_badges,
            "average_per_attendee": (total_badges / total_attendees) if total_attendees > 0 else 0,
        },
        "attendance": {
            "attended": attended_count,
            "not_attended": total_attendees - attended_count,
            "attendance_rate": (attended_count / total_attendees * 100) if total_attendees > 0 else 0,
        },
    }


@app.get("/api/admin/events/{event_id}/analytics/badges")
async def get_badge_analytics(
    event_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get badge distribution analytics."""
    e_res = await db.execute(select(Event).where(Event.id == event_id))
    event = e_res.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Etkinlik bulunamadÃ„Â±")

    if event.admin_id != current_user.id and current_user.role != Role.superadmin:
        raise HTTPException(status_code=403, detail="Yetkisiz eriÃ…Å¸im")

    # Badge distribution by type
    pb_res = await db.execute(
        select(ParticipantBadge.badge_type, func.count(ParticipantBadge.id))
        .where(ParticipantBadge.event_id == event_id)
        .group_by(ParticipantBadge.badge_type)
    )
    badge_counts = pb_res.all()

    # Automatic vs Manual
    auto_res = await db.execute(
        select(func.count(ParticipantBadge.id)).where(
            ParticipantBadge.event_id == event_id,
            ParticipantBadge.is_automatic == True,
        )
    )
    automatic = auto_res.scalar() or 0

    manual_res = await db.execute(
        select(func.count(ParticipantBadge.id)).where(
            ParticipantBadge.event_id == event_id,
            ParticipantBadge.is_automatic == False,
        )
    )
    manual = manual_res.scalar() or 0

    return {
        "by_type": {badge_type: count for badge_type, count in badge_counts},
        "by_award_method": {
            "automatic": automatic,
            "manual": manual,
        },
        "total_badges": automatic + manual,
    }


@app.get("/api/admin/events/{event_id}/analytics/tiers")
async def get_tier_analytics(
    event_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get certificate tier distribution analytics."""
    e_res = await db.execute(select(Event).where(Event.id == event_id))
    event = e_res.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Etkinlik bulunamadÃ„Â±")

    if event.admin_id != current_user.id and current_user.role != Role.superadmin:
        raise HTTPException(status_code=403, detail="Yetkisiz eriÃ…Å¸im")

    # Tier distribution
    cert_res = await db.execute(
        select(Certificate.certificate_tier, func.count(Certificate.id))
        .where(
            Certificate.event_id == event_id,
            Certificate.status == CertStatus.active,
        )
        .group_by(Certificate.certificate_tier)
    )
    tier_counts = cert_res.all()

    total = sum(count for _, count in tier_counts)
    tier_dist = {}
    for tier_name, count in tier_counts:
        tier_key = tier_name or "Unassigned"
        percentage = (count / total * 100) if total > 0 else 0
        tier_dist[tier_key] = {
            "count": count,
            "percentage": round(percentage, 2),
        }

    return {
        "total_certificates": total,
        "tier_distribution": tier_dist,
        "unassigned_count": tier_dist.get("Unassigned", {}).get("count", 0),
    }


@app.get("/api/admin/events/{event_id}/analytics/timeline")
async def get_timeline_analytics(
    event_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get timeline analytics (registrations, completions, downloads over time)."""
    e_res = await db.execute(select(Event).where(Event.id == event_id))
    event = e_res.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Etkinlik bulunamadÃ„Â±")

    if event.admin_id != current_user.id and current_user.role != Role.superadmin:
        raise HTTPException(status_code=403, detail="Yetkisiz eriÃ…Å¸im")

    # Registrations by day
    reg_res = await db.execute(
        select(
            func.date(Attendee.registered_at).label("date"),
            func.count(Attendee.id).label("count"),
        )
        .where(Attendee.event_id == event_id)
        .group_by(func.date(Attendee.registered_at))
        .order_by("date")
    )
    registrations = reg_res.all()

    # Survey completions by day
    surv_res = await db.execute(
        select(
            func.date(Attendee.survey_completed_at).label("date"),
            func.count(Attendee.id).label("count"),
        )
        .where(
            Attendee.event_id == event_id,
            Attendee.survey_completed_at.isnot(None),
        )
        .group_by(func.date(Attendee.survey_completed_at))
        .order_by("date")
    )
    surveys = surv_res.all()

    # Certificate creations by day
    cert_res = await db.execute(
        select(
            func.date(Certificate.created_at).label("date"),
            func.count(Certificate.id).label("count"),
        )
        .where(
            Certificate.event_id == event_id,
            Certificate.status == CertStatus.active,
        )
        .group_by(func.date(Certificate.created_at))
        .order_by("date")
    )
    certificates = cert_res.all()

    return {
        "registrations": [
            {"date": str(d), "count": c} for d, c in registrations
        ],
        "survey_completions": [
            {"date": str(d), "count": c} for d, c in surveys
        ],
        "certificate_creations": [
            {"date": str(d), "count": c} for d, c in certificates
        ],
    }


@app.get("/api/health")
@limiter.exempt
async def health_check():
    return {"status": "ok"}


def editor_config_to_template_config(raw: dict) -> "TemplateConfig":
    """Translate nested EditorConfig or flat legacy format Ã¢â€ â€™ TemplateConfig."""
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
        raise HTTPException(status_code=401, detail="GeÃƒÂ§ersiz e-posta veya Ã…Å¸ifre.")
    if not user.is_verified:
        raise HTTPException(status_code=403, detail="E-posta adresinizi doÃ„Å¸rulamanÃ„Â±z gerekiyor. LÃƒÂ¼tfen gelen kutunuzu kontrol edin.")

    # Check if 2FA is enabled for this user
    totp_res = await db.execute(select(TotpSecret).where(TotpSecret.user_id == user.id, TotpSecret.enabled.is_(True)))
    totp = totp_res.scalar_one_or_none()
    if totp:
        partial = create_partial_token(user_id=user.id)
        return LoginWith2FAOut(requires_2fa=True, partial_token=partial)
    # Enforce host-scoped organization access: if request resolved to an organization
    # (via organization_middleware), only allow login from users that either
    # - own the organization (Organization.user_id), or
    # - have an email matching the organization's custom domain.
    # Future: support an explicit allowlist table for per-org approved emails.
    try:
        org_info = getattr(request.state, "organization", None)
        if org_info and org_info.get("id"):
            # load full Organization to get its owner user_id and custom_domain
            org_res = await db.execute(select(Organization).where(Organization.id == int(org_info.get("id"))))
            org = org_res.scalar_one_or_none()
            if org:
                # owner bypass
                if user.id == org.user_id:
                    pass
                else:
                    # compare email domain OR check explicit allowlist entries
                    email_val = (user.email or "").strip().lower()
                    email_domain = email_val.split("@")[-1] if "@" in email_val else ""
                    org_domain = (org.custom_domain or "").lower()
                    allowed = False
                    if email_domain and org_domain and email_domain == org_domain:
                        allowed = True
                    else:
                        # consult allowlist table
                        try:
                            allow_res = await db.execute(
                                select(OrganizationAllowlist).where(
                                    OrganizationAllowlist.org_id == org.id,
                                    OrganizationAllowlist.email == email_val,
                                )
                            )
                            allow_entry = allow_res.scalar_one_or_none()
                            if allow_entry:
                                allowed = True
                        except Exception:
                            # DB problem when checking allowlist Ã¢â‚¬â€ fail closed
                            raise HTTPException(status_code=500, detail="Alan adÃ„Â± eriÃ…Å¸imi doÃ„Å¸rulanamadÃ„Â±.")

                    if not allowed:
                        raise HTTPException(status_code=403, detail="Bu alan adÃ„Â± iÃƒÂ§in yalnÃ„Â±zca yetkili hesaplar giriÃ…Å¸ yapabilir.")
    except HTTPException:
        raise
    except Exception:
        # If DB check fails for some reason, fail closed to be safe.
        raise HTTPException(status_code=500, detail="Alan adÃ„Â± eriÃ…Å¸imi doÃ„Å¸rulanamadÃ„Â±.")

    return LoginWith2FAOut(
        requires_2fa=False,
        access_token=create_access_token(user_id=user.id, role=user.role),
    )


@app.post("/api/auth/register", status_code=201)
@limiter.limit("3/minute")
async def register(request: Request, data: RegisterIn, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(User).where(User.email == str(data.email)))
    if res.scalar_one_or_none():
        raise bad_request("Bu e-posta adresi zaten kayÃ„Â±tlÃ„Â±.")

    token = make_email_token({"email": str(data.email), "action": "verify"})
    user = User(
        email=str(data.email),
        password_hash=hash_password(data.password),
        role=Role.admin,
        heptacoin_balance=100,  # 100 HC hoÃ…Å¸ geldin hediyesi
        is_verified=False,
        verification_token=token,
    )
    db.add(user)
    await db.commit()

    verify_link = f"{settings.frontend_base_url}/verify-email?token={token}"
    await send_email_async(
        to=str(data.email),
        subject="HeptaCert Ã¢â‚¬â€ E-posta Adresinizi DoÃ„Å¸rulayÃ„Â±n",
        html_body=f"""
        <p>Merhaba,</p>
        <p>HeptaCert'e hoÃ…Å¸ geldiniz! HesabÃ„Â±nÃ„Â±zÃ„Â± aktif etmek iÃƒÂ§in aÃ…Å¸aÃ„Å¸Ã„Â±daki baÃ„Å¸lantÃ„Â±ya tÃ„Â±klayÃ„Â±n:</p>
        <p><a href="{verify_link}">{verify_link}</a></p>
        <p>Bu baÃ„Å¸lantÃ„Â± 24 saat geÃƒÂ§erlidir.</p>
        """,
    )
    return {"detail": "KayÃ„Â±t baÃ…Å¸arÃ„Â±lÃ„Â±. Aktivasyon e-postasÃ„Â± gÃƒÂ¶nderildi."}


@app.get("/api/auth/verify-email")
async def verify_email_endpoint(token: str = Query(...), db: AsyncSession = Depends(get_db)):
    try:
        payload = verify_email_token(token, max_age=86400)
    except SignatureExpired:
        raise bad_request("DoÃ„Å¸rulama baÃ„Å¸lantÃ„Â±sÃ„Â±nÃ„Â±n sÃƒÂ¼resi dolmuÃ…Å¸. LÃƒÂ¼tfen yeniden kayÃ„Â±t olun.")
    except (BadSignature, Exception):
        raise bad_request("GeÃƒÂ§ersiz doÃ„Å¸rulama baÃ„Å¸lantÃ„Â±sÃ„Â±.")

    if payload.get("action") != "verify":
        raise bad_request("GeÃƒÂ§ersiz token tÃƒÂ¼rÃƒÂ¼.")

    email = payload.get("email")
    res = await db.execute(select(User).where(User.email == email))
    user = res.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="KullanÃ„Â±cÃ„Â± bulunamadÃ„Â±.")
    if user.is_verified:
        return {"detail": "HesabÃ„Â±nÃ„Â±z zaten doÃ„Å¸rulanmÃ„Â±Ã…Å¸."}

    user.is_verified = True
    user.verification_token = None
    await db.commit()
    return {"detail": "E-posta baÃ…Å¸arÃ„Â±yla doÃ„Å¸rulandÃ„Â±. GiriÃ…Å¸ yapabilirsiniz."}


@app.post("/api/public/auth/register", status_code=201)
@limiter.limit("3/minute")
async def public_member_register(request: Request, data: PublicMemberRegisterIn, db: AsyncSession = Depends(get_db)):
    email = str(data.email).strip().lower()
    display_name = data.display_name.strip()
    if not display_name:
        raise bad_request("Display name is required.")

    res = await db.execute(select(PublicMember).where(PublicMember.email == email))
    if res.scalar_one_or_none():
        raise bad_request("This email address is already registered.")

    token = make_email_token({"email": email, "action": "public_member_verify"})
    member = PublicMember(
        email=email,
        display_name=display_name,
        password_hash=hash_password(data.password),
        is_verified=False,
        verification_token=token,
    )
    db.add(member)
    await db.commit()

    verify_link = f"{settings.frontend_base_url}/member/verify-email?token={token}"
    await send_email_async(
        to=email,
        subject="HeptaCert - Verify your member account",
        html_body=f"""
        <p>Hello {display_name},</p>
        <p>Verify your HeptaCert member account to browse public events and join community features.</p>
        <p><a href="{verify_link}">{verify_link}</a></p>
        <p>This link is valid for 24 hours.</p>
        """,
    )
    return {"detail": "Member registration successful. Verification email sent."}


@app.post("/api/public/auth/login", response_model=PublicMemberTokenOut)
@limiter.limit("5/minute")
async def public_member_login(request: Request, data: PublicMemberLoginIn, db: AsyncSession = Depends(get_db)):
    email = str(data.email).strip().lower()
    res = await db.execute(select(PublicMember).where(PublicMember.email == email))
    member = res.scalar_one_or_none()
    if not member or not verify_password(data.password, member.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    if not member.is_verified:
        raise HTTPException(status_code=403, detail="Please verify your email before signing in.")

    member_out = PublicMemberMeOut(
        id=member.id,
        email=member.email,
        display_name=member.display_name,
        bio=member.bio,
    )
    return PublicMemberTokenOut(
        access_token=create_public_member_access_token(member_id=member.id),
        member=member_out,
    )


@app.get("/api/public/auth/verify-email")
async def verify_public_member_email(token: str = Query(...), db: AsyncSession = Depends(get_db)):
    try:
        payload = verify_email_token(token, max_age=86400)
    except SignatureExpired:
        raise bad_request("Verification link expired. Please register again.")
    except BadSignature:
        raise bad_request("Invalid verification link.")

    if payload.get("action") != "public_member_verify":
        raise bad_request("Invalid token action.")

    email = str(payload.get("email") or "").strip().lower()
    res = await db.execute(select(PublicMember).where(PublicMember.email == email))
    member = res.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found.")
    if not member.verification_token or not hmac.compare_digest(str(member.verification_token), token):
        raise bad_request("Invalid verification link.")
    if member.is_verified:
        return {"detail": "Your member account is already verified."}

    member.is_verified = True
    member.verification_token = None
    await db.commit()
    return {"detail": "Member email verified successfully. You can now sign in."}


@app.post("/api/public/auth/forgot-password")
@limiter.limit("3/minute")
async def public_member_forgot_password(request: Request, data: ForgotPasswordIn, db: AsyncSession = Depends(get_db)):
    email = str(data.email).strip().lower()
    res = await db.execute(select(PublicMember).where(PublicMember.email == email))
    member = res.scalar_one_or_none()
    if member and member.is_verified:
        token = make_email_token({"email": email, "action": "public_member_reset"})
        member.password_reset_token = token
        await db.commit()

        reset_link = f"{settings.frontend_base_url}/reset-password?token={token}&mode=member"
        await send_email_async(
            to=email,
            subject="HeptaCert - Reset your member password",
            html_body=f"""
            <p>Hello {member.display_name},</p>
            <p>Click the link below to reset your member account password:</p>
            <p><a href="{reset_link}">{reset_link}</a></p>
            <p>This link is valid for 1 hour.</p>
            """,
        )
    return {"detail": "If the account exists, password reset instructions were sent to the email address."}


@app.post("/api/public/auth/reset-password")
@limiter.limit("5/minute")
async def public_member_reset_password(request: Request, data: ResetPasswordIn, db: AsyncSession = Depends(get_db)):
    try:
        payload = verify_email_token(data.token, max_age=3600)
    except SignatureExpired:
        raise bad_request("Password reset link expired.")
    except (BadSignature, Exception):
        raise bad_request("Invalid password reset link.")

    if payload.get("action") != "public_member_reset":
        raise bad_request("Invalid token action.")

    email = str(payload.get("email") or "").strip().lower()
    res = await db.execute(select(PublicMember).where(PublicMember.email == email))
    member = res.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found.")
    if not member.password_reset_token or not hmac.compare_digest(str(member.password_reset_token), data.token):
        raise bad_request("Invalid password reset link.")

    member.password_hash = hash_password(data.new_password)
    member.password_reset_token = None
    await db.commit()
    return {"detail": "Password reset successful."}


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
            subject="HeptaCert Ã¢â‚¬â€ Ã…Âifre SÃ„Â±fÃ„Â±rlama",
            html_body=f"""
            <p>Ã…Âifrenizi sÃ„Â±fÃ„Â±rlamak iÃƒÂ§in aÃ…Å¸aÃ„Å¸Ã„Â±daki baÃ„Å¸lantÃ„Â±ya tÃ„Â±klayÃ„Â±n:</p>
            <p><a href="{reset_link}">{reset_link}</a></p>
            <p>Bu baÃ„Å¸lantÃ„Â± 1 saat geÃƒÂ§erlidir.</p>
            """,
        )
    return {"detail": "Ã…Âifre sÃ„Â±fÃ„Â±rlama talimatlarÃ„Â± e-posta adresinize gÃƒÂ¶nderildi."}


@app.post("/api/auth/reset-password")
@limiter.limit("5/minute")
async def reset_password(request: Request, data: ResetPasswordIn, db: AsyncSession = Depends(get_db)):
    try:
        payload = verify_email_token(data.token, max_age=3600)
    except SignatureExpired:
        raise bad_request("Ã…Âifre sÃ„Â±fÃ„Â±rlama baÃ„Å¸lantÃ„Â±sÃ„Â±nÃ„Â±n sÃƒÂ¼resi dolmuÃ…Å¸.")
    except (BadSignature, Exception):
        raise bad_request("GeÃƒÂ§ersiz sÃ„Â±fÃ„Â±rlama baÃ„Å¸lantÃ„Â±sÃ„Â±.")

    if payload.get("action") != "reset":
        raise bad_request("GeÃƒÂ§ersiz token tÃƒÂ¼rÃƒÂ¼.")

    email = payload.get("email")
    res = await db.execute(select(User).where(User.email == email))
    user = res.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="KullanÃ„Â±cÃ„Â± bulunamadÃ„Â±.")

    # Validate that the token matches the one stored in DB (prevents replay attacks)
    if not user.password_reset_token or user.password_reset_token != data.token:
        raise bad_request("Bu sÃ„Â±fÃ„Â±rlama baÃ„Å¸lantÃ„Â±sÃ„Â± zaten kullanÃ„Â±lmÃ„Â±Ã…Å¸.")

    user.password_hash = hash_password(data.new_password)
    user.password_reset_token = None
    await db.commit()
    return {"detail": "Ã…Âifreniz baÃ…Å¸arÃ„Â±yla gÃƒÂ¼ncellendi."}


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


# Ã¢â€â‚¬Ã¢â€â‚¬ Admin: Email Templates Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

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
        raise HTTPException(status_code=403, detail="Yetkisiz eriÃ…Å¸im")
    
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
        raise HTTPException(status_code=403, detail="Yetkisiz eriÃ…Å¸im")
    
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
        raise HTTPException(status_code=403, detail="Yetkisiz eriÃ…Å¸im")
    
    t_res = await db.execute(
        select(EmailTemplate).where(EmailTemplate.id == template_id, EmailTemplate.event_id == event_id)
    )
    template = t_res.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Template bulunamadÃ„Â±")
    
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
        raise HTTPException(status_code=403, detail="Yetkisiz eriÃ…Å¸im")
    
    t_res = await db.execute(
        select(EmailTemplate).where(EmailTemplate.id == template_id, EmailTemplate.event_id == event_id)
    )
    template = t_res.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Template bulunamadÃ„Â±")
    
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
        raise HTTPException(status_code=403, detail="Yetkisiz eriÃ…Å¸im")
    
    # Get template
    t_res = await db.execute(
        select(EmailTemplate).where(EmailTemplate.id == template_id, EmailTemplate.event_id == event_id)
    )
    template = t_res.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Template bulunamadÃ„Â±")
    
    # Get event for details
    ev_res = await db.execute(select(Event).where(Event.id == event_id))
    event = ev_res.scalar_one_or_none()
    
    # Prepare sample data
    language = payload.get("language", "tr")
    sample_attendee = payload.get("sample_attendee", {"name": "Ãƒâ€“rnek KatÃ„Â±lÃ„Â±mcÃ„Â±", "email": "ornek@example.com"})
    
    # Simple template variable replacement
    variables = {
        f"{{{{{v}}}}}": sample_attendee[v] 
        for v in sample_attendee.keys()
        if hasattr(sample_attendee, '__getitem__') or isinstance(sample_attendee, dict)
    }
    variables = {
        "{{attendee_name}}": sample_attendee.get("name", "KatÃ„Â±lÃ„Â±mcÃ„Â±"),
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


# Ã¢â€â‚¬Ã¢â€â‚¬ Admin: Certificate Templates Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

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
        raise HTTPException(status_code=403, detail="Yetkisiz eriÃ…Å¸im")
    
    cert_template_id = payload.get("cert_template_id")
    if not cert_template_id:
        raise HTTPException(status_code=400, detail="cert_template_id gerekli")
    
    # Get certificate template
    ct_res = await db.execute(
        select(CertificateTemplate).where(CertificateTemplate.id == cert_template_id)
    )
    cert_template = ct_res.scalar_one_or_none()
    if not cert_template:
        raise HTTPException(status_code=404, detail="Sertifika Ã…Å¸ablonu bulunamadÃ„Â±")
    
    # Update event with template image and config
    event.template_image_url = cert_template.template_image_url
    event.config = cert_template.config if cert_template.config else event.config
    db.add(event)
    await db.commit()
    await db.refresh(event)
    
    return _event_to_out(event)


# Ã¢â€â‚¬Ã¢â€â‚¬ Admin: Email Configuration (SMTP) Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

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
    return await _ensure_user_email_config(db, me.id)


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
    config = await _ensure_user_email_config(db, me.id)

    config.smtp_enabled = payload.smtp_enabled
    config.smtp_use_tls = payload.smtp_use_tls
    if payload.smtp_host is not None:
        config.smtp_host = payload.smtp_host.strip() or None
    if payload.smtp_port is not None:
        config.smtp_port = payload.smtp_port
    if payload.from_email is not None:
        config.from_email = str(payload.from_email).strip().lower() or None
    if payload.smtp_user is not None:
        config.smtp_user = payload.smtp_user.strip() or None
    if payload.smtp_password:
        config.smtp_password = payload.smtp_password
    if payload.from_name is not None:
        config.from_name = payload.from_name.strip() or None
    if payload.reply_to is not None:
        config.reply_to = payload.reply_to.strip() or None
    if payload.auto_cc is not None:
        config.auto_cc = payload.auto_cc.strip() or None
    config.enable_tracking_pixel = payload.enable_tracking_pixel

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
        server_factory = smtplib.SMTP_SSL if payload.smtp_use_tls and payload.smtp_port == 465 else smtplib.SMTP
        with server_factory(payload.smtp_host, payload.smtp_port, timeout=10) as server:
            if payload.smtp_use_tls and payload.smtp_port != 465:
                server.starttls()
            server.login(payload.smtp_user, payload.smtp_password)

            # Try to send a test email
            msg = MIMEText("Test connection")
            msg['Subject'] = "HeptaCert SMTP Test"
            msg['From'] = str(payload.from_email)
            msg['To'] = str(payload.test_email)
            server.send_message(msg, from_addr=str(payload.from_email), to_addrs=[str(payload.test_email)])
        
        return EmailConfigTestResponse(
            status="success",
            message="SMTP baÃ„Å¸lantÃ„Â±sÃ„Â± baÃ…Å¸arÃ„Â±lÃ„Â±",
            verified_at=datetime.utcnow()
        )
    except smtplib.SMTPAuthenticationError:
        return EmailConfigTestResponse(
            status="error",
            message="Kimlik doÃ„Å¸rulama hatasÃ„Â±: geÃƒÂ§ersiz kullanÃ„Â±cÃ„Â± adÃ„Â± veya Ã…Å¸ifre"
        )
    except smtplib.SMTPException as e:
        return EmailConfigTestResponse(
            status="error",
            message=f"SMTP hatasÃ„Â±: {str(e)}"
        )
    except Exception as e:
        return EmailConfigTestResponse(
            status="error",
            message=f"BaÃ„Å¸lantÃ„Â± hatasÃ„Â±: {str(e)}"
        )


# Ã¢â€â‚¬Ã¢â€â‚¬ Admin: Bulk Email Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

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
        raise HTTPException(status_code=403, detail="Yetkisiz eriÃ…Å¸im")
    
    # Verify template exists
    t_res = await db.execute(
        select(EmailTemplate).where(EmailTemplate.id == payload.email_template_id)
    )
    if not t_res.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Template bulunamadÃ„Â±")
    
    # Count recipients
    if payload.recipient_type == "attendees":
        count_res = await db.execute(
            select(func.count(Attendee.id)).where(Attendee.event_id == event_id)
        )
        recipients_count = count_res.scalar() or 0
    else:  # certified
        attendee_res = await db.execute(
            select(Attendee.name).where(Attendee.event_id == event_id)
        )
        attendee_names = {
            (name or "").strip().lower()
            for name in attendee_res.scalars().all()
            if (name or "").strip()
        }
        cert_res = await db.execute(
            select(Certificate.student_name).where(
                Certificate.event_id == event_id,
                Certificate.deleted_at.is_(None),
                Certificate.status == CertStatus.active,
            )
        )
        certified_names = {
            (name or "").strip().lower()
            for name in cert_res.scalars().all()
            if (name or "").strip()
        }
        recipients_count = len(attendee_names & certified_names)
    if recipients_count == 0:
        raise HTTPException(status_code=400, detail="Al??c?? bulunamad??")
    # Create job
    job = BulkEmailJob(
        event_id=event_id,
        created_by=me.id,
        email_template_id=payload.email_template_id,
        recipient_type=payload.recipient_type,
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
        raise HTTPException(status_code=403, detail="Yetkisiz eriÃ…Å¸im")
    
    j_res = await db.execute(
        select(BulkEmailJob).where(BulkEmailJob.id == job_id, BulkEmailJob.event_id == event_id)
    )
    job = j_res.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job bulunamadÃ„Â±")
    
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
        raise HTTPException(status_code=403, detail="Yetkisiz eriÃ…Å¸im")
    
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
        raise HTTPException(status_code=403, detail="Yetkisiz eriÃ…Å¸im")
    
    # Verify template exists
    t_res = await db.execute(
        select(EmailTemplate).where(EmailTemplate.id == payload.email_template_id)
    )
    if not t_res.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Template bulunamadÃ„Â±")
    
    # Count recipients
    if payload.recipient_type == "attendees":
        count_res = await db.execute(
            select(func.count(Attendee.id)).where(Attendee.event_id == event_id)
        )
        recipients_count = count_res.scalar() or 0
    else:  # certified
        attendee_res = await db.execute(
            select(Attendee.name).where(Attendee.event_id == event_id)
        )
        attendee_names = {
            (name or "").strip().lower()
            for name in attendee_res.scalars().all()
            if (name or "").strip()
        }
        cert_res = await db.execute(
            select(Certificate.student_name).where(
                Certificate.event_id == event_id,
                Certificate.deleted_at.is_(None),
                Certificate.status == CertStatus.active,
            )
        )
        certified_names = {
            (name or "").strip().lower()
            for name in cert_res.scalars().all()
            if (name or "").strip()
        }
        recipients_count = len(attendee_names & certified_names)
    if recipients_count == 0:
        raise HTTPException(status_code=400, detail="Al??c?? bulunamad??")
    # Create the bulk email job
    job = BulkEmailJob(
        event_id=event_id,
        created_by=me.id,
        email_template_id=payload.email_template_id,
        recipient_type=payload.recipient_type,
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
            raise HTTPException(status_code=400, detail="GeÃƒÂ§ersiz cron ifadesi")
        job.cron_expression = payload.cron_expression
        job.status = "scheduled"
    else:
        raise HTTPException(status_code=400, detail="schedule_type geÃƒÂ§ersiz")
    
    db.add(job)
    await db.commit()
    await db.refresh(job)
    
    return {
        "id": job.id,
        "event_id": job.event_id,
        "status": job.status,
        "recipients_count": job.recipients_count,
        "scheduled_at": job.scheduled_at.isoformat() if job.scheduled_at else None,
        "message": f"Email {payload.schedule_type} baÃ…Å¸arÃ„Â±lÃ„Â±" if payload.schedule_type != "datetime" else f"Email {payload.scheduled_datetime} tarihinde gÃƒÂ¶nderilmek ÃƒÂ¼zere zamanlandÃ„Â±",
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
        raise HTTPException(status_code=403, detail="Yetkisiz eriÃ…Å¸im")
    
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
        raise HTTPException(status_code=403, detail="Yetkisiz eriÃ…Å¸im")
    
    j_res = await db.execute(
        select(BulkEmailJob).where(BulkEmailJob.id == job_id, BulkEmailJob.event_id == event_id)
    )
    job = j_res.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job bulunamadÃ„Â±")
    
    if job.status not in ["pending", "scheduled"]:
        raise HTTPException(status_code=400, detail="Sadece pending/scheduled joblar iptal edilebilir")
    
    job.status = "cancelled"
    db.add(job)
    await db.commit()
    
    return {"message": "Job baÃ…Å¸arÃ„Â±yla iptal edildi"}


# Ã¢â€â‚¬Ã¢â€â‚¬ Admin: Email Delivery Tracking Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

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
        raise HTTPException(status_code=404, detail="Job bulunamadÃ„Â±")
    
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
        raise HTTPException(status_code=403, detail="Yetkisiz eriÃ…Å¸im")
    
    # Get job
    j_res = await db.execute(
        select(BulkEmailJob).where(BulkEmailJob.id == job_id, BulkEmailJob.event_id == event_id)
    )
    job = j_res.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job bulunamadÃ„Â±")
    
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
        raise HTTPException(status_code=403, detail="Yetkisiz eriÃ…Å¸im")
    
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


# Ã¢â€â‚¬Ã¢â€â‚¬ Admin: Webhook Subscriptions Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

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
        is_verified=True,  # superadmin tarafÃ„Â±ndan oluÃ…Å¸turulan hesaplar otomatik doÃ„Å¸rulanÃ„Â±r
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
        raise bad_request("Kendi hesabÃ„Â±nÃ„Â±zÃ„Â± silemezsiniz.")
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
        raise bad_request("Kendi rolÃƒÂ¼nÃƒÂ¼zÃƒÂ¼ deÃ„Å¸iÃ…Å¸tiremezsiniz.")
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
    if not user or user.role not in (Role.admin, Role.superadmin):
        raise bad_request("Admin or superadmin user not found")

    user.heptacoin_balance += payload.amount
    db.add(Transaction(user_id=user.id, amount=payload.amount, type=TxType.credit))
    await db.commit()
    return {"admin_user_id": user.id, "new_balance": user.heptacoin_balance}


# Ã¢â€â‚¬Ã¢â€â‚¬ Waitlist Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

@app.post("/api/waitlist", status_code=201)
@limiter.limit("5/minute")
async def join_waitlist(request: Request, data: WaitlistIn, db: AsyncSession = Depends(get_db)):
    """Public endpoint Ã¢â‚¬â€ anyone can join the waitlist."""
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


# Ã¢â€â‚¬Ã¢â€â‚¬ Pricing Config (public GET + superadmin PATCH) Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

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


# Ã¢â€â‚¬Ã¢â€â‚¬ Public Stats Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

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
    """Public stats endpoint Ã¢â‚¬â€ returns display values (overridden by superadmin or real DB counts)."""
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


# Ã¢â€â‚¬Ã¢â€â‚¬ Billing / Payment endpoints Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

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


@app.get("/api/public/me", response_model=PublicMemberMeOut)
async def public_me(
    member: CurrentPublicMember = Depends(get_current_public_member),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(PublicMember).where(PublicMember.id == member.id))
    db_member = res.scalar_one_or_none()
    if not db_member:
        raise HTTPException(status_code=404, detail="Member not found.")
    return PublicMemberMeOut(
        id=db_member.id,
        email=db_member.email,
        display_name=db_member.display_name,
        bio=db_member.bio,
    )


@app.patch("/api/public/me", response_model=PublicMemberMeOut)
async def update_public_me(
    data: PublicMemberProfileUpdateIn,
    member: CurrentPublicMember = Depends(get_current_public_member),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(PublicMember).where(PublicMember.id == member.id))
    db_member = res.scalar_one_or_none()
    if not db_member:
        raise HTTPException(status_code=404, detail="Member not found.")

    display_name = data.display_name.strip()
    if not display_name:
        raise bad_request("Display name is required.")

    bio = (data.bio or "").strip()
    db_member.display_name = display_name
    db_member.bio = bio or None
    await db.commit()
    await db.refresh(db_member)
    return PublicMemberMeOut(
        id=db_member.id,
        email=db_member.email,
        display_name=db_member.display_name,
        bio=db_member.bio,
    )


@app.patch("/api/public/me/password")
async def change_public_member_password(
    data: PublicMemberChangePasswordIn,
    member: CurrentPublicMember = Depends(get_current_public_member),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(PublicMember).where(PublicMember.id == member.id))
    db_member = res.scalar_one_or_none()
    if not db_member:
        raise HTTPException(status_code=404, detail="Member not found.")
    if not verify_password(data.current_password, db_member.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect.")
    if verify_password(data.new_password, db_member.password_hash):
        raise HTTPException(status_code=400, detail="New password must be different from the current password.")

    db_member.password_hash = hash_password(data.new_password)
    db_member.password_reset_token = None
    await db.commit()
    return {"detail": "Password updated successfully."}


@app.get("/api/public/my-events", response_model=list[PublicMemberEventOut])
async def public_member_events(
    member: CurrentPublicMember = Depends(get_current_public_member),
    db: AsyncSession = Depends(get_db),
):
    legacy_res = await db.execute(
        select(Attendee).where(
            func.lower(Attendee.email) == member.email.lower(),
            Attendee.public_member_id.is_(None),
        )
    )
    legacy_attendees = legacy_res.scalars().all()
    if legacy_attendees:
        for attendee in legacy_attendees:
            attendee.public_member_id = member.id
        await db.commit()

    attendee_res = await db.execute(
        select(Attendee)
        .options(selectinload(Attendee.event))
        .where(Attendee.public_member_id == member.id)
        .order_by(Attendee.registered_at.desc())
    )
    attendees = attendee_res.scalars().all()
    if not attendees:
        return []

    attendance_counts_res = await db.execute(
        select(AttendanceRecord.attendee_id, func.count().label("cnt"))
        .where(AttendanceRecord.attendee_id.in_([attendee.id for attendee in attendees]))
        .group_by(AttendanceRecord.attendee_id)
    )
    attendance_counts = {int(row.attendee_id): int(row.cnt or 0) for row in attendance_counts_res.all()}

    return [
        PublicMemberEventOut(
            attendee_id=attendee.id,
            event_id=attendee.event_id,
            event_name=attendee.event.name,
            event_date=attendee.event.event_date.isoformat() if attendee.event.event_date else None,
            event_location=attendee.event.event_location,
            event_banner_url=attendee.event.event_banner_url,
            registered_at=attendee.registered_at,
            email_verified=attendee.email_verified,
            sessions_attended=attendance_counts.get(attendee.id, 0),
            min_sessions_required=attendee.event.min_sessions_required,
            status_url=build_public_status_url(
                event_id=_get_public_event_identifier(attendee.event),
                attendee_id=attendee.id,
                email=attendee.email,
            ),
        )
        for attendee in attendees
    ]


@app.patch("/api/me/password", dependencies=[Depends(require_role(Role.admin, Role.superadmin))])
async def change_password(
    data: ChangePasswordIn,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(User).where(User.id == me.id))
    user = res.scalar_one()
    if not verify_password(data.current_password, user.password_hash):
        raise bad_request("Mevcut Ã…Å¸ifre yanlÃ„Â±Ã…Å¸.")
    user.password_hash = hash_password(data.new_password)
    await db.commit()
    return {"detail": "Ã…Âifre baÃ…Å¸arÃ„Â±yla gÃƒÂ¼ncellendi."}


@app.patch("/api/me/email", dependencies=[Depends(require_role(Role.admin, Role.superadmin))])
async def change_email(
    data: ChangeEmailIn,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(User).where(User.id == me.id))
    user = res.scalar_one()
    if not verify_password(data.current_password, user.password_hash):
        raise bad_request("Mevcut Ã…Å¸ifre yanlÃ„Â±Ã…Å¸.")
    exists = await db.execute(select(User).where(User.email == str(data.new_email)))
    if exists.scalar_one_or_none():
        raise bad_request("Bu e-posta adresi zaten kullanÃ„Â±mda.")
    user.email = str(data.new_email)
    await db.commit()
    return {"detail": "E-posta baÃ…Å¸arÃ„Â±yla gÃƒÂ¼ncellendi."}


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
    next_config = dict(payload.config or {})
    next_config["visibility"] = _normalize_event_visibility(next_config.get("visibility"))
    public_id = await _generate_event_public_id(db)
    ev = Event(
        public_id=public_id,
        admin_id=me.id,
        name=payload.name,
        template_image_url=payload.template_image_url or "placeholder",
        config=next_config,
    )
    db.add(ev)
    await db.commit()
    await db.refresh(ev)
    return _event_to_out(ev)


def _event_to_out(ev: Event) -> EventOut:
    config = ev.config if isinstance(ev.config, dict) else {}
    return EventOut(
        id=ev.id,
        public_id=ev.public_id,
        name=ev.name,
        template_image_url=ev.template_image_url or "placeholder",
        config=config,
        event_date=ev.event_date.isoformat() if ev.event_date else None,
        event_description=sanitize_event_description_html(ev.event_description),
        event_location=ev.event_location,
        min_sessions_required=int(ev.min_sessions_required or 1),
        event_banner_url=ev.event_banner_url,
        auto_email_on_cert=bool(ev.auto_email_on_cert),
        cert_email_template_id=ev.cert_email_template_id,
        visibility=_get_event_visibility(ev),
        require_email_verification=_get_event_email_verification_required(ev),
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
        ev.event_description = sanitize_event_description_html(payload.event_description)
    if payload.event_location is not None:
        ev.event_location = payload.event_location
    if payload.min_sessions_required is not None:
        ev.min_sessions_required = payload.min_sessions_required
    if payload.event_banner_url is not None:
        ev.event_banner_url = payload.event_banner_url if payload.event_banner_url else None
    next_config = dict(ev.config or {})
    config_dirty = False
    if "registration_fields" in payload.model_fields_set:
        next_config["registration_fields"] = _normalize_registration_fields(payload.registration_fields)
        config_dirty = True
    if "visibility" in payload.model_fields_set:
        next_config["visibility"] = _normalize_event_visibility(payload.visibility)
        config_dirty = True
    if "require_email_verification" in payload.model_fields_set:
        next_config["require_email_verification"] = bool(payload.require_email_verification)
        config_dirty = True
    if config_dirty:
        ev.config = next_config
    if "auto_email_on_cert" in payload.model_fields_set:
        ev.auto_email_on_cert = bool(payload.auto_email_on_cert)
    if "cert_email_template_id" in payload.model_fields_set:
        template_id = payload.cert_email_template_id
        if template_id is None:
            ev.cert_email_template_id = None
        else:
            template_res = await db.execute(
                select(EmailTemplate).where(
                    EmailTemplate.id == template_id,
                    or_(EmailTemplate.event_id == event_id, EmailTemplate.template_type == "system"),
                )
            )
            template = template_res.scalar_one_or_none()
            if not template:
                raise HTTPException(status_code=404, detail="Email template not found")
            ev.cert_email_template_id = template.id
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
@app.post(
    "/api/admin/events/{event_id}/bulk-generate",
    response_model=BulkCertificateJobOut,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def bulk_generate(
    event_id: int,
    excel: UploadFile = File(...),
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
            detail=f"Excel dosyasÃ„Â± ÃƒÂ§ok bÃƒÂ¼yÃƒÂ¼k. Maksimum {MAX_EXCEL_SIZE // (1024*1024)} MB.",
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

    raw_names = [str(x).strip() for x in df[col].tolist() if str(x).strip() and str(x).strip().lower() != "nan"]
    names = list(dict.fromkeys(raw_names))
    if not names:
        raise bad_request("No names found in Excel")
    if len(names) > 1000:
        raise bad_request("Excel'de en fazla 1000 isim iÃ…Å¸lenebilir. DosyayÃ„Â± bÃƒÂ¶lerek tekrar deneyin.")

    # User
    res_u = await db.execute(select(User).where(User.id == me.id))
    user = res_u.scalar_one()

    ISSUE_UNITS_PER_CERT = 10
    HOSTING_ESTIMATE_UNITS = 20  # estimate per cert for early balance check

    # Ã¢â€â‚¬Ã¢â€â‚¬ Early balance check (before any file I/O) Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
    estimated_total = len(names) * (ISSUE_UNITS_PER_CERT + HOSTING_ESTIMATE_UNITS)
    if user.heptacoin_balance < estimated_total:
        raise HTTPException(
            status_code=402,
            detail=f"Yetersiz HeptaCoin. TahminiGereksinim={estimated_total}, Bakiye={user.heptacoin_balance}",
        )
    # Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

    chunk_size = 5 if len(names) >= 500 else 10

    job = BulkCertificateJob(
        event_id=ev.id,
        created_by=me.id,
        names=names,
        chunk_size=chunk_size,
        total_count=len(names),
        status="pending",
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)

    # Nudge processor so first chunk starts quickly
    asyncio.create_task(_process_bulk_certificate_jobs())

    return job


@app.get(
    "/api/admin/events/{event_id}/bulk-generate-jobs",
    response_model=List[BulkCertificateJobOut],
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def list_bulk_generate_jobs(
    event_id: int,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _ = await _get_event_for_admin(event_id, me, db)
    res = await db.execute(
        select(BulkCertificateJob)
        .where(BulkCertificateJob.event_id == event_id, BulkCertificateJob.created_by == me.id)
        .order_by(BulkCertificateJob.created_at.desc())
        .limit(30)
    )
    return res.scalars().all()


@app.get(
    "/api/admin/events/{event_id}/bulk-generate-jobs/{job_id}",
    response_model=BulkCertificateJobOut,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def get_bulk_generate_job(
    event_id: int,
    job_id: int,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _ = await _get_event_for_admin(event_id, me, db)
    res = await db.execute(
        select(BulkCertificateJob).where(
            BulkCertificateJob.id == job_id,
            BulkCertificateJob.event_id == event_id,
            BulkCertificateJob.created_by == me.id,
        )
    )
    job = res.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Bulk certificate job not found")
    return job


@app.post(
    "/api/admin/events/{event_id}/bulk-generate-jobs/{job_id}/cancel",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def cancel_bulk_generate_job(
    event_id: int,
    job_id: int,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _ = await _get_event_for_admin(event_id, me, db)
    res = await db.execute(
        select(BulkCertificateJob).where(
            BulkCertificateJob.id == job_id,
            BulkCertificateJob.event_id == event_id,
            BulkCertificateJob.created_by == me.id,
        )
    )
    job = res.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Bulk certificate job not found")
    if job.status in ["completed", "failed", "cancelled"]:
        raise HTTPException(status_code=400, detail="Job already finished")

    job.status = "cancelled"
    job.completed_at = datetime.now(timezone.utc)
    db.add(job)
    await db.commit()
    return {"ok": True, "job_id": job.id, "status": job.status}


@app.get(
    "/api/admin/events/{event_id}/bulk-generate-jobs/{job_id}/download",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def download_bulk_generate_job_zip(
    event_id: int,
    job_id: int,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _ = await _get_event_for_admin(event_id, me, db)
    res = await db.execute(
        select(BulkCertificateJob).where(
            BulkCertificateJob.id == job_id,
            BulkCertificateJob.event_id == event_id,
            BulkCertificateJob.created_by == me.id,
        )
    )
    job = res.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Bulk certificate job not found")
    if job.status != "completed" or not job.zip_file_path:
        raise HTTPException(status_code=409, detail="Job henÃƒÂ¼z tamamlanmadÃ„Â±")

    zip_path = Path(settings.local_storage_dir) / job.zip_file_path
    if not zip_path.exists():
        raise HTTPException(status_code=404, detail="ZIP file not found")

    return FileResponse(
        zip_path,
        media_type="application/zip",
        filename=f"certificates-event-{event_id}-job-{job.id}.zip",
    )



@app.get("/api/verify/{uuid}", response_model=VerifyOut)
async def verify(uuid: str, request: Request, db: AsyncSession = Depends(get_db)):
    accept = (request.headers.get("accept") or "").lower()
    host = (request.headers.get("host") or "").split(":")[0].strip().lower()
    scheme = request.headers.get("x-forwarded-proto") or request.url.scheme or "https"

    org = None
    branding: Optional[Dict[str, Any]] = None
    verification_path: Optional[str] = None

    if host:
        org_res = await db.execute(
            select(Organization).where(Organization.custom_domain == host)
        )
        org = org_res.scalar_one_or_none()
        if org:
            branding = {
                "org_name": org.org_name,
                "brand_logo": org.brand_logo,
                "brand_color": org.brand_color,
            }
            org_settings = getattr(org, "settings", {}) or {}
            if isinstance(org_settings, dict):
                verification_path = org_settings.get("verification_path")

    if "text/html" in accept:
        return RedirectResponse(
            url=build_certificate_verify_url(
                uuid,
                host=host or None,
                scheme=scheme,
                verification_path=verification_path,
            ),
            status_code=307,
        )

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

    # Ã¢â€â‚¬Ã¢â€â‚¬ Record verification hit Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
    client_ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent", "")
    referer = request.headers.get("referer", "")
    db.add(VerificationHit(
        cert_uuid=uuid,
        ip_address=client_ip,
        user_agent=user_agent[:512],
        referer=referer[:512],
    ))

    # Ã¢â€â‚¬Ã¢â€â‚¬ View count Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
    count_res = await db.execute(
        select(func.count()).select_from(
            select(VerificationHit).where(VerificationHit.cert_uuid == uuid).subquery()
        )
    )
    view_count = int(count_res.scalar_one() or 0) + 1  # +1 for current hit

    # Ã¢â€â‚¬Ã¢â€â‚¬ Organization branding (match Host header to custom_domain) Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
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

    # Ã¢â€â‚¬Ã¢â€â‚¬ LinkedIn URL Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
    linkedin_url: Optional[str] = None
    if cert.status == CertStatus.active:
        from urllib.parse import urlencode
        params = urlencode({
            "startTask": "CERTIFICATION_NAME",
            "name": ev.name,
            "certUrl": build_certificate_verify_url(
                uuid,
                host=host or None,
                scheme=scheme,
                verification_path=verification_path,
            ),
        })
        linkedin_url = f"https://www.linkedin.com/profile/add?{params}"

    await db.commit()

    # Ã¢â€â‚¬Ã¢â€â‚¬ Watermarked PNG URL (only if the file was generated) Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
    png_url: Optional[str] = None
    rel_png_path = f"pngs/event_{ev.id}/{cert.uuid}.png"
    abs_png_path = Path(settings.local_storage_dir) / rel_png_path
    if abs_png_path.exists() and cert.status == CertStatus.active:
        png_url = build_public_pdf_url(rel_png_path)  # same /api/files/ base

    return VerifyOut(
        uuid=cert.uuid,
        public_id=cert.public_id,
        student_name=cert.student_name,
        event_name=ev.name,
        event_date=ev.event_date.isoformat() if ev.event_date else None,
        status=cert.status,
        pdf_url=pdf_url,
        png_url=png_url,
        issued_at=getattr(cert, "issued_at", None),
        hosting_ends_at=cert.hosting_ends_at,
        view_count=view_count,
        linkedin_url=linkedin_url,
        branding=branding,
    )


class WatermarkVerifyOut(BaseModel):
    valid: bool
    message: str
    public_id: Optional[str] = None
    cert_uuid: Optional[str] = None
    student_name: Optional[str] = None
    event_name: Optional[str] = None
    issued_at: Optional[str] = None
    status: Optional[str] = None


@app.post("/api/verify-watermark", response_model=WatermarkVerifyOut)
async def verify_watermark(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    """
    Public endpoint: upload a HeptaCert certificate image (PNG recommended).
    If a valid steganographic watermark is detected, the corresponding
    certificate details are returned.
    """
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Sadece gÃƒÂ¶rsel dosyalarÃ„Â± kabul edilir (PNG, JPEG, Ã¢â‚¬Â¦)")

    img_bytes = await file.read()
    if len(img_bytes) > 30 * 1024 * 1024:  # 30 MB guard
        raise HTTPException(status_code=413, detail="Dosya 30 MB sÃ„Â±nÃ„Â±rÃ„Â±nÃ„Â± aÃ…Å¸Ã„Â±yor")

    # Extract watermark
    try:
        from .watermark import extract_watermark
        payload = await asyncio.to_thread(extract_watermark, img_bytes)
    except Exception:
        payload = None

    if not payload:
        return WatermarkVerifyOut(
            valid=False,
            message="Bu gÃƒÂ¶rselde HeptaCert damgasÃ„Â± bulunamadÃ„Â±. Orijinal PNG dosyasÃ„Â±nÃ„Â± yÃƒÂ¼kleyin.",
        )

    # Look up certificate by public_id
    res = await db.execute(
        select(Certificate, Event)
        .join(Event, Certificate.event_id == Event.id)
        .where(Certificate.public_id == payload, Certificate.deleted_at.is_(None))
    )
    row = res.first()
    if not row:
        return WatermarkVerifyOut(
            valid=False,
            message=f"Damga gÃƒÂ¶rÃƒÂ¼ldÃƒÂ¼ ({payload}) ancak veritabanÃ„Â±nda eÃ…Å¸leÃ…Å¸en sertifika bulunamadÃ„Â±.",
            public_id=payload,
        )

    cert, ev = row
    issued_str = cert.issued_at.isoformat() if getattr(cert, "issued_at", None) else None

    return WatermarkVerifyOut(
        valid=cert.status == CertStatus.active,
        message=(
            f"Bu gÃƒÂ¶rsel geÃƒÂ§erli bir HeptaCert sertifika kaydÃ„Â±na ait."
            if cert.status == CertStatus.active
            else f"Sertifika bulundu ancak durumu: {cert.status.value}."
        ),
        public_id=cert.public_id,
        cert_uuid=cert.uuid,
        student_name=cert.student_name,
        event_name=ev.name,
        issued_at=issued_str,
        status=cert.status.value,
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



@app.get("/api/branding")
async def get_branding(request: Request, db: AsyncSession = Depends(get_db)):
    """Public endpoint: returns organization branding for the current Host header (if any).

    This is intended for the frontend to fetch host-specific branding information.
    """
    host = (request.headers.get("host") or "").split(":")[0].strip().lower()
    if not host:
        return {"org_name": None, "brand_logo": None, "brand_color": None, "settings": {}}

    try:
        res = await db.execute(select(Organization).where(Organization.custom_domain == host))
        org = res.scalar_one_or_none()
        if not org:
            return {"org_name": None, "brand_logo": None, "brand_color": None, "settings": {}}
        return {
            "org_name": org.org_name,
            "brand_logo": org.brand_logo,
            "brand_color": org.brand_color,
            "settings": getattr(org, "settings", {}) or {},
        }
    except Exception:
        return {"org_name": None, "brand_logo": None, "brand_color": None, "settings": {}}




@app.get("/public/branding")
async def get_public_branding(request: Request, db: AsyncSession = Depends(get_db)):
    host = request.headers.get("host")

    if not host:
        return JSONResponse(content={}, status_code=200)

    # localhost vs port temizle
    host = host.split(":")[0]

    # organization bul
    result = await db.execute(
        select(Organization).where(Organization.custom_domain == host)
    )
    org = result.scalar_one_or_none()

    # EÃ„Å¸er custom domain yoksa fallback
    if not org:
        return {
            "org_name": "HeptaCert",
            "brand_logo": None,
            "brand_color": "#7c3aed",
            "settings": {
                "hide_heptacert_home": False
            }
        }

    # settings ÃƒÂ§ek (senin DBÃ¢â‚¬â„¢de JSONB)
    settings_data = {}

    if hasattr(org, "settings") and org.settings:
        settings_data = org.settings

    return {
        "org_name": org.org_name,
        "brand_logo": org.brand_logo,
        "brand_color": org.brand_color,
        "settings": settings_data or {
            "hide_heptacert_home": False
        }
    }

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

    # Event eriÃ…Å¸im kontrolÃƒÂ¼ (superadmin her event'e bakabilsin diye esnetiyoruz)
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
            _safe_words = [w for w in _re.sub(r"[^\w\sÃƒÂ§Ã„Å¸Ã„Â±ÃƒÂ¶Ã…Å¸ÃƒÂ¼Ãƒâ€¡Ã„ÂÃ„Â°Ãƒâ€“Ã…ÂÃƒÅ“]", "", s).split() if w]
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
        # expired/revoked -> pdf kapalÃ„Â± (X)
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
    # Event eriÃ…Å¸im kontrolÃƒÂ¼
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
    certificate_footer: Optional[str] = None
    try:
        certificate_footer = (org2.settings or {}).get("certificate_footer") if org2 else None
    except Exception:
        certificate_footer = None

    # Event lock (cert_seq atomic)
    res_lock = await db.execute(select(Event).where(Event.id == ev.id).with_for_update())
    ev = res_lock.scalar_one()

    ISSUE_UNITS_PER_CERT = 10
    term = payload.hosting_term

    cert_uuid = new_certificate_uuid()
    ev.cert_seq += 1
    public_id = f"EV{ev.id}-{ev.cert_seq:06d}"
    verify_url = build_certificate_verify_url(cert_uuid)

    # generator.py: public_id param zorunlu olmalÃ„Â±
    pdf_bytes = render_certificate_pdf(
        template_image_bytes=template_bytes,
        student_name=payload.student_name,
        verify_url=verify_url,
        config=cfg,
        public_id=public_id,
        brand_logo_bytes=single_brand_logo_bytes,
        certificate_footer=certificate_footer,
    )

    rel_pdf_path = f"pdfs/event_{ev.id}/{cert_uuid}.pdf"
    abs_pdf_path = Path(settings.local_storage_dir) / rel_pdf_path
    abs_pdf_path.parent.mkdir(parents=True, exist_ok=True)
    abs_pdf_path.write_bytes(pdf_bytes)
    asset_size_bytes = abs_pdf_path.stat().st_size

    rel_png_path: Optional[str] = None
    # Save watermarked PNG alongside PDF (steganographic verification support)
    try:
        png_bytes = await asyncio.to_thread(
            render_certificate_png_watermarked,
            template_image_bytes=template_bytes,
            student_name=payload.student_name,
            verify_url=verify_url,
            config=cfg,
            public_id=public_id,
            brand_logo_bytes=single_brand_logo_bytes,
            certificate_footer=certificate_footer,
        )
        rel_png_path = f"pngs/event_{ev.id}/{cert_uuid}.png"
        abs_png_path = Path(settings.local_storage_dir) / rel_png_path
        abs_png_path.parent.mkdir(parents=True, exist_ok=True)
        abs_png_path.write_bytes(png_bytes)
    except Exception:
        pass  # PNG watermark is non-critical; PDF is always saved

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

    attendee_res = await db.execute(
        select(Attendee)
        .where(
            Attendee.event_id == ev.id,
            func.lower(Attendee.name) == (payload.student_name or "").strip().lower(),
        )
        .order_by(Attendee.id.asc())
        .limit(1)
    )
    attendee_for_email = attendee_res.scalar_one_or_none()
    if attendee_for_email and attendee_for_email.email:
        background_tasks.add_task(
            send_certificate_delivery_email_task,
            event_id=ev.id,
            cert_uuid=cert.uuid,
            recipient_name=attendee_for_email.name,
            recipient_email=attendee_for_email.email,
        )

    # Ã¢â€â‚¬Ã¢â€â‚¬ Fire webhook Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
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
        png_url=_certificate_png_public_url(ev.id, cert.uuid),
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
    # cert + event join (yetki kontrolÃƒÂ¼ iÃƒÂ§in)
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

# Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â
# 2FA Ã¢â‚¬â€œ TOTP endpoints
# Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â

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
        raise HTTPException(status_code=400, detail="2FA kurulumu baÃ…Å¸latÃ„Â±lmamÃ„Â±Ã…Å¸")
    if not pyotp.TOTP(totp_row.secret).verify(data.code, valid_window=1):
        raise HTTPException(status_code=400, detail="GeÃƒÂ§ersiz kod")
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
        raise HTTPException(status_code=401, detail="GeÃƒÂ§ersiz veya sÃƒÂ¼resi dolmuÃ…Å¸ token")
    user_res = await db.execute(select(User).where(User.id == user_id))
    user = user_res.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="KullanÃ„Â±cÃ„Â± bulunamadÃ„Â±")
    totp_res = await db.execute(
        select(TotpSecret).where(TotpSecret.user_id == user_id, TotpSecret.enabled.is_(True))
    )
    totp_row = totp_res.scalar_one_or_none()
    if not totp_row or not pyotp.TOTP(totp_row.secret).verify(data.code, valid_window=1):
        raise HTTPException(status_code=400, detail="GeÃƒÂ§ersiz kod")
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
        raise HTTPException(status_code=400, detail="GeÃƒÂ§ersiz kod")
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


# Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â
# API Keys
# Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â

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
        raise HTTPException(status_code=404, detail="API key bulunamadÃ„Â±")
    ak.is_active = False
    await db.commit()
    return {"ok": True}


# Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â
# Custom Domain (self-service for Growth / Enterprise)
# Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â

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
                detail="Ãƒâ€“zel alan adÃ„Â± Growth ve Enterprise planlarÃ„Â±nda kullanÃ„Â±labilir.",
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


@app.get(
    "/api/admin/organization/settings",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def get_organization_settings(
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(Organization).where(Organization.user_id == me.id))
    org = res.scalar_one_or_none()
    if org is None:
        # Create a default organization record for this user to simplify UX
        org = Organization(user_id=me.id, org_name="", brand_color="#6366f1")
        # ensure settings column exists before assigning
        try:
            org.settings = {}
        except Exception:
            pass
        db.add(org)
        await db.commit()
        await db.refresh(org)
    return {
        "id": org.id,
        "org_name": org.org_name,
        "brand_logo": org.brand_logo,
        "brand_color": org.brand_color,
        "settings": getattr(org, "settings", {}) or {},
    }



@app.get(
    "/api/admin/organization/allowlist",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def list_organization_allowlist(
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(Organization).where(Organization.user_id == me.id))
    org = res.scalar_one_or_none()
    if not org:
        return []
    rows = await db.execute(select(OrganizationAllowlist).where(OrganizationAllowlist.org_id == org.id).order_by(OrganizationAllowlist.created_at.desc()))
    entries = rows.scalars().all()
    return [
        {"id": e.id, "email": e.email, "created_at": e.created_at.isoformat() if e.created_at else None}
        for e in entries
    ]


@app.post(
    "/api/admin/organization/allowlist",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def add_organization_allowlist(
    payload: Dict[str, str] = Body(...),
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    email = (payload.get("email") or "").strip().lower()
    if not email or "@" not in email:
        raise bad_request("A valid email is required")
    res = await db.execute(select(Organization).where(Organization.user_id == me.id))
    org = res.scalar_one_or_none()
    if not org:
        org = Organization(user_id=me.id, org_name="", brand_color="#6366f1")
        try:
            org.settings = {}
        except Exception:
            pass
        db.add(org)
        await db.commit()
        await db.refresh(org)

    # avoid duplicates
    existing = await db.execute(select(OrganizationAllowlist).where(OrganizationAllowlist.org_id == org.id, OrganizationAllowlist.email == email))
    if existing.scalar_one_or_none():
        return {"ok": True}

    entry = OrganizationAllowlist(org_id=org.id, email=email)
    db.add(entry)
    await db.commit()
    await db.refresh(entry)
    return {"ok": True, "id": entry.id, "email": entry.email}


@app.delete(
    "/api/admin/organization/allowlist/{entry_id}",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def delete_organization_allowlist(
    entry_id: int,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(Organization).where(Organization.user_id == me.id))
    org = res.scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    row = await db.execute(select(OrganizationAllowlist).where(OrganizationAllowlist.id == entry_id, OrganizationAllowlist.org_id == org.id))
    entry = row.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=404, detail="Allowlist entry not found")
    await db.delete(entry)
    await db.commit()
    return {"ok": True}


@app.patch(
    "/api/admin/organization/settings",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def patch_organization_settings(
    payload: Dict[str, Any] = Body(...),
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(Organization).where(Organization.user_id == me.id))
    org = res.scalar_one_or_none()

    if not org:
        org = Organization(
            user_id=me.id,
            org_name="",
            brand_color="#6366f1",
            brand_logo=None,
        )
        try:
            org.settings = {}
        except Exception:
            pass
        db.add(org)
        await db.commit()
        await db.refresh(org)

    if not isinstance(payload, dict):
        raise bad_request("Expected JSON object for settings")

    existing = getattr(org, "settings", {}) or {}
    if not isinstance(existing, dict):
        existing = {}

    # AyrÃ„Â± kolonlar
    if "brand_color" in payload:
        org.brand_color = payload.pop("brand_color") or "#6366f1"

    if "brand_logo" in payload:
        org.brand_logo = payload.pop("brand_logo")

    if "org_name" in payload:
        org.org_name = payload.pop("org_name") or ""

    if "custom_domain" in payload:
        org.custom_domain = payload.pop("custom_domain")

    # Geri kalanlar settings iÃƒÂ§ine
    existing.update(payload)

    try:
        org.settings = existing
    except Exception:
        raise HTTPException(status_code=500, detail="Database missing settings column; run migrations")

    await db.commit()
    await db.refresh(org)

    return {
        "ok": True,
        "id": org.id,
        "org_name": org.org_name,
        "brand_logo": org.brand_logo,
        "brand_color": org.brand_color,
        "custom_domain": org.custom_domain,
        "settings": org.settings or {},
    }


@app.post(
    "/api/admin/organization/logo",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def upload_organization_logo(
    file: UploadFile = File(...),
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(Organization).where(Organization.user_id == me.id))
    org = res.scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    if not file.content_type or not file.content_type.startswith("image/"):
        raise bad_request("Only image uploads allowed")
    data = await file.read()
    max_bytes = 1_000_000
    if len(data) > max_bytes:
        raise bad_request("Image too large (max 1MB)")
    ext = Path(file.filename or "logo.png").suffix.lower() or ".png"
    safe_name = f"orgs/{org.id}/logo{ext}"
    dest = Path(settings.local_storage_dir) / safe_name
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(data)
    pub_url = f"{settings.public_base_url}/api/files/{safe_name}"
    org.brand_logo = pub_url
    await db.commit()
    return {"brand_logo": pub_url}


# Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â
# Webhooks
# Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â

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
        raise HTTPException(status_code=404, detail="Webhook bulunamadÃ„Â±")
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
        raise HTTPException(status_code=404, detail="Webhook bulunamadÃ„Â±")
    res = await db.execute(
        select(WebhookDelivery)
        .where(WebhookDelivery.endpoint_id == wh_id)
        .order_by(WebhookDelivery.delivered_at.desc())
        .limit(50)
    )
    return res.scalars().all()


# Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â
# Organizations (white-label) Ã¢â‚¬â€œ superadmin only
# Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â

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
    # Validate the target user exists (prevent FK violations)
    user_res = await db.execute(select(User).where(User.id == target_user_id))
    if not user_res.scalar_one_or_none():
        raise HTTPException(status_code=400, detail=f"User with id {target_user_id} not found")
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
        raise HTTPException(status_code=404, detail="Organizasyon bulunamadÃ„Â±")
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
        raise HTTPException(status_code=404, detail="Organizasyon bulunamadÃ„Â±")
    await db.delete(org)
    await db.commit()
    return {"ok": True}


# Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â
# Audit Logs Ã¢â‚¬â€œ superadmin only
# Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â

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
    logs = res.scalars().all()
    # Convert IPv4Address objects to strings for response
    result = []
    for log in logs:
        result.append({
            'id': log.id,
            'user_id': log.user_id,
            'action': log.action,
            'resource_type': log.resource_type,
            'resource_id': log.resource_id,
            'ip_address': str(log.ip_address) if log.ip_address else None,
            'created_at': log.created_at,
        })
    return [AuditLogOut(**item) for item in result]


# Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â
# Bulk Certificate Action
# Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â

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


# Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â
# Certificate Export (CSV / XLSX)
# Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â

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


# Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â
# Dashboard Analytics
# Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â

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


# Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â
# Superadmin System Health
# Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â

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


# Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â
# Superadmin Subscription Management
# Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â

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
        raise HTTPException(status_code=404, detail="KullanÃ„Â±cÃ„Â± bulunamadÃ„Â±.")

    # Validate plan_id
    valid_plans = [t["id"] for t in DEFAULT_PRICING]
    if payload.plan_id not in valid_plans:
        raise HTTPException(status_code=400, detail=f"GeÃƒÂ§ersiz plan. GeÃƒÂ§erli planlar: {', '.join(valid_plans)}")

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
        raise HTTPException(status_code=404, detail="Abonelik bulunamadÃ„Â±.")
    sub.is_active = False
    await db.commit()
    return {"detail": "Abonelik iptal edildi."}


# Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â
# Magic Link Authentication
# Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â

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
            subject="HeptaCert Ã¢â‚¬â€ GiriÃ…Å¸ BaÃ„Å¸lantÃ„Â±sÃ„Â±",
            html_body=f"""
            <p>Merhaba,</p>
            <p>HeptaCert'e giriÃ…Å¸ yapmak iÃƒÂ§in aÃ…Å¸aÃ„Å¸Ã„Â±daki baÃ„Å¸lantÃ„Â±ya tÃ„Â±klayÃ„Â±n:</p>
            <p><a href="{verify_link}" style="background:#6366f1;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block">GiriÃ…Å¸ Yap Ã¢â€ â€™</a></p>
            <p>Bu baÃ„Å¸lantÃ„Â± 15 dakika geÃƒÂ§erlidir.</p>
            <p>EÃ„Å¸er bu isteÃ„Å¸i siz yapmadÃ„Â±ysanÃ„Â±z, bu e-postayÃ„Â± gÃƒÂ¶rmezden gelebilirsiniz.</p>
            """,
        )
    return {"detail": "GiriÃ…Å¸ baÃ„Å¸lantÃ„Â±sÃ„Â± e-posta adresinize gÃƒÂ¶nderildi."}


@app.get("/api/auth/magic-link/verify")
async def verify_magic_link(
    token: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    try:
        payload = verify_email_token(token, max_age=900)  # 15 minutes
    except SignatureExpired:
        raise bad_request("GiriÃ…Å¸ baÃ„Å¸lantÃ„Â±sÃ„Â±nÃ„Â±n sÃƒÂ¼resi dolmuÃ…Å¸. LÃƒÂ¼tfen yeni bir baÃ„Å¸lantÃ„Â± isteyin.")
    except (BadSignature, Exception):
        raise bad_request("GeÃƒÂ§ersiz giriÃ…Å¸ baÃ„Å¸lantÃ„Â±sÃ„Â±.")

    if payload.get("action") != "magic_link":
        raise bad_request("GeÃƒÂ§ersiz token tÃƒÂ¼rÃƒÂ¼.")

    email = payload.get("email")
    res = await db.execute(select(User).where(User.email == email))
    user = res.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="KullanÃ„Â±cÃ„Â± bulunamadÃ„Â±.")
    if not user.is_verified:
        raise bad_request("HesabÃ„Â±nÃ„Â±z henÃƒÂ¼z doÃ„Å¸rulanmamÃ„Â±Ã…Å¸.")

    # Invalidate token after use
    user.magic_link_token = None
    await db.commit()

    return TokenOut(
        access_token=create_access_token(user_id=user.id, role=user.role),
        token_type="bearer",
    )


# Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â
# Template History
# Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â

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


# Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â
# Attendance Management
# Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â

# Ã¢â€â‚¬Ã¢â€â‚¬ Pydantic schemas for attendance Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

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
    public_member_id: Optional[int] = None
    public_member_name: Optional[str] = None
    public_member_email: Optional[str] = None
    registration_answers: Dict[str, str] = Field(default_factory=dict)


class SelfRegisterIn(BaseModel):
    name: str = Field(min_length=2, max_length=200)
    email: EmailStr
    registration_answers: Dict[str, Any] = Field(default_factory=dict)


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


# Ã¢â€â‚¬Ã¢â€â‚¬ Helper: resolve event + ownership Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

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


async def _get_event_attendance_counts(
    event_id: int,
    db: AsyncSession,
) -> tuple[List[Attendee], Dict[int, int]]:
    attendees_res = await db.execute(
        select(Attendee).where(Attendee.event_id == event_id).order_by(Attendee.name, Attendee.id)
    )
    attendees = attendees_res.scalars().all()
    if not attendees:
        return [], {}

    counts_res = await db.execute(
        select(AttendanceRecord.attendee_id, func.count().label("cnt"))
        .where(AttendanceRecord.attendee_id.in_([a.id for a in attendees]))
        .group_by(AttendanceRecord.attendee_id)
    )
    counts = {int(row.attendee_id): int(row.cnt or 0) for row in counts_res.all()}
    return attendees, counts


def _raffle_to_out(
    raffle: EventRaffle,
    attendees: List[Attendee],
    attendance_counts: Dict[int, int],
    *,
    require_email_verification: bool,
) -> EventRaffleOut:
    def _winner_draw_sort_key(winner: EventRaffleWinner) -> datetime:
        drawn_at = winner.drawn_at or datetime.min
        if drawn_at.tzinfo is None:
            return drawn_at.replace(tzinfo=timezone.utc)
        return drawn_at.astimezone(timezone.utc)

    attendee_map = {attendee.id: attendee for attendee in attendees}
    eligible_attendees = [
        EventRaffleEligibleOut(
            attendee_id=attendee.id,
            attendee_name=attendee.name,
            attendee_email=attendee.email,
            sessions_attended=attendance_counts.get(attendee.id, 0),
        )
        for attendee in attendees
        if (attendee.email_verified or not require_email_verification)
        and attendance_counts.get(attendee.id, 0) >= raffle.min_sessions_required
    ]
    winners: List[EventRaffleWinnerOut] = []
    for winner in sorted(raffle.winners, key=_winner_draw_sort_key):
        attendee = attendee_map.get(winner.attendee_id) or winner.attendee
        if not attendee:
            continue
        winners.append(
            EventRaffleWinnerOut(
                attendee_id=attendee.id,
                attendee_name=attendee.name,
                attendee_email=attendee.email,
                sessions_attended=attendance_counts.get(attendee.id, 0),
                drawn_at=winner.drawn_at,
            )
        )

    return EventRaffleOut(
        id=raffle.id,
        event_id=raffle.event_id,
        title=raffle.title,
        prize_name=raffle.prize_name,
        description=raffle.description,
        min_sessions_required=raffle.min_sessions_required,
        winner_count=raffle.winner_count,
        reserve_winner_count=raffle.reserve_winner_count,
        status=raffle.status,
        created_at=raffle.created_at,
        updated_at=raffle.updated_at,
        drawn_at=raffle.drawn_at,
        eligible_count=len(eligible_attendees),
        total_attendees=len(attendees),
        eligible_attendees=eligible_attendees,
        winners=winners,
    )


def _pick_raffle_winners(
    raffle: EventRaffle,
    attendees: List[Attendee],
    attendance_counts: Dict[int, int],
    *,
    require_email_verification: bool,
    excluded_attendee_ids: Optional[set[int]] = None,
) -> List[Attendee]:
    excluded = excluded_attendee_ids or set()
    eligible_attendees = [
        attendee
        for attendee in attendees
        if (attendee.email_verified or not require_email_verification)
        and attendance_counts.get(attendee.id, 0) >= raffle.min_sessions_required
        and attendee.id not in excluded
    ]
    if not eligible_attendees:
        raise HTTPException(status_code=400, detail="Çekiliş için uygun katılımcı bulunamadı")

    draw_count = min(raffle.winner_count + raffle.reserve_winner_count, len(eligible_attendees))
    return secrets.SystemRandom().sample(eligible_attendees, draw_count)


# Ã¢â€â‚¬Ã¢â€â‚¬ Public: event info & self-register Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

def _build_public_survey_info(survey: Optional["EventSurvey"]) -> Optional[Dict[str, Any]]:
    if not survey:
        return None
    builtin_questions = survey.builtin_questions or []
    return {
        "is_required": bool(survey.is_required),
        "survey_type": survey.survey_type,
        "external_url": survey.external_url,
        "has_builtin_questions": len(builtin_questions) > 0,
        "builtin_questions": builtin_questions,
    }


def _build_public_event_detail(
    event: Event,
    sessions: List[EventSession],
    survey: Optional["EventSurvey"],
) -> PublicEventDetailOut:
    return PublicEventDetailOut(
        id=event.id,
        public_id=_get_public_event_identifier(event),
        name=event.name,
        event_date=event.event_date.isoformat() if event.event_date else None,
        event_description=sanitize_event_description_html(event.event_description),
        event_location=event.event_location,
        min_sessions_required=int(event.min_sessions_required or 1),
        event_banner_url=event.event_banner_url,
        registration_fields=_get_event_registration_fields(event),
        survey=_build_public_survey_info(survey),
        visibility=_get_event_visibility(event),
        require_email_verification=_get_event_email_verification_required(event),
        sessions=[
            {
                "id": s.id,
                "name": s.name,
                "session_date": s.session_date.isoformat() if s.session_date else None,
                "session_start": s.session_start.strftime("%H:%M") if s.session_start else None,
                "session_location": s.session_location,
            }
            for s in sessions
        ],
    )


def _event_comment_to_out(comment: EventComment) -> PublicEventCommentOut:
    return PublicEventCommentOut(
        id=comment.id,
        event_id=comment.event_id,
        member_id=comment.public_member_id,
        member_name=comment.public_member.display_name,
        member_email=comment.public_member.email,
        body=comment.body,
        status=comment.status,
        report_count=comment.report_count,
        created_at=comment.created_at,
        updated_at=comment.updated_at,
    )


@app.get("/api/public/events", response_model=list[PublicEventListItemOut])
async def list_public_events(db: AsyncSession = Depends(get_db)):
    bind = db.get_bind()
    dialect_name = bind.dialect.name if bind is not None else ""

    if dialect_name == "sqlite":
        events_res = await db.execute(
            select(Event)
            .where(func.lower(func.coalesce(func.json_extract(Event.config, "$.visibility"), "private")) == "public")
            .order_by(Event.created_at.desc())
        )
        visible_events = events_res.scalars().all()
    elif dialect_name == "postgresql":
        events_res = await db.execute(
            select(Event)
            .where(
                func.lower(
                    func.coalesce(
                        func.jsonb_extract_path_text(Event.config, "visibility"),
                        "private",
                    )
                )
                == "public"
            )
            .order_by(Event.created_at.desc())
        )
        visible_events = events_res.scalars().all()
    else:
        events_res = await db.execute(select(Event).order_by(Event.created_at.desc()))
        visible_events = [event for event in events_res.scalars().all() if _get_event_visibility(event) == "public"]
    if not visible_events:
        return []

    event_ids = [event.id for event in visible_events]
    session_counts_res = await db.execute(
        select(EventSession.event_id, func.count(EventSession.id).label("cnt"))
        .where(EventSession.event_id.in_(event_ids))
        .group_by(EventSession.event_id)
    )
    session_counts = {int(row.event_id): int(row.cnt or 0) for row in session_counts_res.all()}

    return [
        PublicEventListItemOut(
            id=event.id,
            public_id=_get_public_event_identifier(event),
            name=event.name,
            event_date=event.event_date.isoformat() if event.event_date else None,
            event_description=sanitize_event_description_html(event.event_description),
            event_location=event.event_location,
            event_banner_url=event.event_banner_url,
            min_sessions_required=int(event.min_sessions_required or 1),
            visibility=_get_event_visibility(event),
            session_count=session_counts.get(event.id, 0),
        )
        for event in visible_events
    ]


@app.get("/api/public/events/{event_id}", response_model=PublicEventDetailOut)
async def get_public_event_detail(event_id: str, db: AsyncSession = Depends(get_db)):
    event = await _resolve_public_event(db, event_id)
    if not event or _get_event_visibility(event) == "private":
        raise HTTPException(status_code=404, detail="Event not found")

    sessions_res = await db.execute(
        select(EventSession).where(EventSession.event_id == event.id).order_by(EventSession.session_date, EventSession.session_start)
    )
    survey_res = await db.execute(select(EventSurvey).where(EventSurvey.event_id == event.id))
    return _build_public_event_detail(event, sessions_res.scalars().all(), survey_res.scalar_one_or_none())


@app.get("/api/public/events/{event_id}/comments", response_model=list[PublicEventCommentOut])
async def list_public_event_comments(event_id: str, db: AsyncSession = Depends(get_db)):
    event = await _resolve_public_event(db, event_id)
    if not event or _get_event_visibility(event) == "private":
        raise HTTPException(status_code=404, detail="Event not found")

    comments_res = await db.execute(
        select(EventComment)
        .options(selectinload(EventComment.public_member))
        .where(EventComment.event_id == event.id, EventComment.status == "visible")
        .order_by(EventComment.created_at.desc())
    )
    return [_event_comment_to_out(comment) for comment in comments_res.scalars().all()]


@app.post("/api/public/events/{event_id}/comments", response_model=PublicEventCommentOut, status_code=201)
@limiter.limit("5/minute")
async def create_public_event_comment(
    request: Request,
    event_id: str,
    payload: PublicEventCommentCreateIn,
    member: CurrentPublicMember = Depends(get_current_public_member),
    db: AsyncSession = Depends(get_db),
):
    event = await _resolve_public_event(db, event_id)
    if not event or _get_event_visibility(event) == "private":
        raise HTTPException(status_code=404, detail="Event not found")

    comment = EventComment(
        event_id=event.id,
        public_member_id=member.id,
        body=payload.body,
        status="visible",
    )
    db.add(comment)
    await db.commit()
    await db.refresh(comment)
    await db.refresh(comment, attribute_names=["public_member"])

    await write_audit_log(
        db,
        user_id=None,
        action="public.comment.create",
        resource_type="event_comment",
        resource_id=str(comment.id),
        ip_address=_client_ip_for_rate_limit(request),
        user_agent=request.headers.get("User-Agent"),
        extra={"event_id": event.id, "public_member_id": member.id},
    )
    await db.commit()
    return _event_comment_to_out(comment)


@app.post("/api/public/events/{event_id}/comments/{comment_id}/report")
@limiter.limit("10/minute")
async def report_public_event_comment(
    request: Request,
    event_id: str,
    comment_id: int,
    member: CurrentPublicMember = Depends(get_current_public_member),
    db: AsyncSession = Depends(get_db),
):
    event = await _resolve_public_event(db, event_id)
    if not event or _get_event_visibility(event) == "private":
        raise HTTPException(status_code=404, detail="Event not found")
    comment_res = await db.execute(
        select(EventComment).where(EventComment.id == comment_id, EventComment.event_id == event.id)
    )
    comment = comment_res.scalar_one_or_none()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")

    comment.report_count += 1
    if comment.status == "visible":
        comment.status = "reported"
    await write_audit_log(
        db,
        user_id=None,
        action="public.comment.report",
        resource_type="event_comment",
        resource_id=str(comment.id),
        ip_address=_client_ip_for_rate_limit(request),
        user_agent=request.headers.get("User-Agent"),
        extra={"event_id": event.id, "public_member_id": member.id},
    )
    await db.commit()
    return {"ok": True, "status": comment.status, "report_count": comment.report_count}


@app.get("/api/events/{event_id}/info")
async def public_event_info(event_id: str, db: AsyncSession = Depends(get_db)):
    ev = await _resolve_public_event(db, event_id)
    if not ev:
        raise HTTPException(status_code=404, detail="Event not found")
    sess_res = await db.execute(
        select(EventSession).where(EventSession.event_id == ev.id).order_by(EventSession.session_date, EventSession.session_start)
    )
    survey_res = await db.execute(select(EventSurvey).where(EventSurvey.event_id == ev.id))
    return _build_public_event_detail(ev, sess_res.scalars().all(), survey_res.scalar_one_or_none()).model_dump()


@app.post("/api/events/{event_id}/register", status_code=201)
@limiter.limit("10/minute")
async def public_event_register(
    request: Request,
    event_id: str,
    payload: SelfRegisterIn,
    db: AsyncSession = Depends(get_db),
    member: Optional[CurrentPublicMember] = Depends(get_optional_public_member),
):
    ev = await _resolve_public_event(db, event_id)
    if not ev:
        raise HTTPException(status_code=404, detail="Event not found")
    event_db_id = ev.id
    require_email_verification = _get_event_email_verification_required(ev)

    normalized_email = payload.email.lower()
    if member and normalized_email != member.email.lower():
        raise bad_request("Signed-in members must register with their own email address.")

    client_ip = _client_ip_for_rate_limit(request)
    user_agent = request.headers.get("User-Agent")
    device_id, should_set_device_cookie = _get_registration_device_id(request)
    registration_fields = _get_event_registration_fields(ev)
    registration_answers = _normalize_registration_answers(
        registration_fields,
        payload.registration_answers,
    )

    await _enforce_registration_risk_controls(
        db,
        event_id=event_db_id,
        email=normalized_email,
        ip_address=client_ip,
        user_agent=user_agent,
        device_id=device_id,
    )

    existing = await db.execute(
        select(Attendee).where(Attendee.event_id == event_db_id, func.lower(Attendee.email) == normalized_email)
    )
    existing_attendee = existing.scalar_one_or_none()
    if existing_attendee:
        existing_attendee.name = payload.name
        existing_attendee.registration_answers = registration_answers
        if member and not existing_attendee.public_member_id:
            existing_attendee.public_member_id = member.id

        if not existing_attendee.email_verified and require_email_verification:
            existing_attendee.email_verification_token = make_email_token(
                {
                    "action": "attendee_verify",
                    "attendee_id": existing_attendee.id,
                    "event_id": event_db_id,
                    "email": existing_attendee.email.lower(),
                }
            )
            await write_audit_log(
                db,
                user_id=None,
                action="attendee.register",
                resource_type="attendee",
                resource_id=str(existing_attendee.id),
                ip_address=client_ip,
                user_agent=user_agent,
                extra={
                    "event_id": event_id,
                    "event_public_id": _get_public_event_identifier(ev),
                    "email": normalized_email,
                    "device_id": device_id,
                    "public_member_id": member.id if member else None,
                    "result": "existing_unverified",
                    "verification_required": True,
                },
            )
            await db.commit()
            await send_attendee_verification_email(attendee=existing_attendee, event=ev)
            response = JSONResponse(
                status_code=200,
                content={
                    "ok": True,
                    "already_registered": True,
                    "email_verified": False,
                    "verification_required": True,
                    "message": "Bu e-posta ile kayit bulundu. Devam etmek icin dogrulama e-postasini onaylayin.",
                    "attendee_id": existing_attendee.id,
                    "attendee_name": existing_attendee.name,
                    "attendee_email": existing_attendee.email,
                },
            )
            if should_set_device_cookie:
                response.set_cookie(
                    key=REGISTRATION_DEVICE_COOKIE,
                    value=device_id,
                    max_age=60 * 60 * 24 * 365,
                    httponly=True,
                    samesite="Lax",
                )
            return response

        if not existing_attendee.email_verified and not require_email_verification:
            existing_attendee.email_verified = True
            existing_attendee.email_verification_token = None
            existing_attendee.email_verified_at = datetime.now(timezone.utc)

        survey_token = make_survey_access_token(
            attendee_id=existing_attendee.id,
            event_id=event_db_id,
            email=existing_attendee.email,
        )
        await write_audit_log(
            db,
            user_id=None,
            action="attendee.register",
            resource_type="attendee",
            resource_id=str(existing_attendee.id),
            ip_address=client_ip,
            user_agent=user_agent,
            extra={
                "event_id": event_db_id,
                "email": normalized_email,
                "device_id": device_id,
                "public_member_id": member.id if member else None,
                "result": "existing_verified" if existing_attendee.email_verified else "existing_auto_verified",
                "verification_required": require_email_verification,
            },
        )
        await db.commit()
        response = JSONResponse(
            status_code=200,
            content={
                "ok": True,
                "already_registered": True,
                "email_verified": bool(existing_attendee.email_verified),
                "verification_required": require_email_verification,
                "message": "Bu e-posta ile zaten kayitlisiniz.",
                "attendee_id": existing_attendee.id,
                "attendee_name": existing_attendee.name,
                "attendee_email": existing_attendee.email,
                "survey_token": survey_token,
                "survey_url": build_public_survey_url(
                    event_id=_get_public_event_identifier(ev),
                    attendee_id=existing_attendee.id,
                    email=existing_attendee.email,
                ),
                "status_url": build_public_status_url(
                    event_id=_get_public_event_identifier(ev),
                    attendee_id=existing_attendee.id,
                    email=existing_attendee.email,
                ),
            },
        )
        if should_set_device_cookie:
            response.set_cookie(
                key=REGISTRATION_DEVICE_COOKIE,
                value=device_id,
                max_age=60 * 60 * 24 * 365,
                httponly=True,
                samesite="Lax",
            )
        return response

    attendee = Attendee(
        event_id=event_db_id,
        name=payload.name,
        email=normalized_email,
        source="self_register",
        email_verified=not require_email_verification,
        public_member_id=member.id if member else None,
        registration_answers=registration_answers,
    )
    db.add(attendee)
    await db.flush()
    if require_email_verification:
        attendee.email_verification_token = make_email_token(
            {
                "action": "attendee_verify",
                "attendee_id": attendee.id,
                "event_id": event_db_id,
                "email": attendee.email.lower(),
            }
        )
    else:
        attendee.email_verification_token = None
        attendee.email_verified_at = datetime.now(timezone.utc)
    await write_audit_log(
        db,
        user_id=None,
        action="attendee.register",
        resource_type="attendee",
        resource_id=str(attendee.id),
        ip_address=client_ip,
        user_agent=user_agent,
        extra={
            "event_id": event_db_id,
            "email": normalized_email,
            "device_id": device_id,
            "public_member_id": member.id if member else None,
            "result": "created_unverified" if require_email_verification else "created_verified",
            "verification_required": require_email_verification,
        },
    )
    await db.commit()
    if require_email_verification:
        await send_attendee_verification_email(attendee=attendee, event=ev)
    survey_token = make_survey_access_token(
        attendee_id=attendee.id,
        event_id=event_db_id,
        email=attendee.email,
    )
    response = JSONResponse(
        status_code=201,
        content={
            "ok": True,
            "already_registered": False,
            "email_verified": bool(attendee.email_verified),
            "verification_required": require_email_verification,
            "message": "Kayit alindi. Etkinlige katilimi tamamlamak icin e-posta dogrulamasi gerekiyor." if require_email_verification else "Kayit alindi.",
            "attendee_id": attendee.id,
            "attendee_name": attendee.name,
            "attendee_email": attendee.email,
            "survey_token": survey_token if attendee.email_verified else None,
            "survey_url": build_public_survey_url(
                event_id=_get_public_event_identifier(ev),
                attendee_id=attendee.id,
                email=attendee.email,
            ) if attendee.email_verified else None,
            "status_url": build_public_status_url(
                event_id=_get_public_event_identifier(ev),
                attendee_id=attendee.id,
                email=attendee.email,
            ) if attendee.email_verified else None,
        },
    )
    if should_set_device_cookie:
        response.set_cookie(
            key=REGISTRATION_DEVICE_COOKIE,
            value=device_id,
            max_age=60 * 60 * 24 * 365,
            httponly=True,
            samesite="Lax",
        )
    return response


@app.get("/api/events/{event_id}/verify-email")
async def verify_attendee_email(event_id: str, token: str = Query(...), db: AsyncSession = Depends(get_db)):
    event = await _resolve_public_event(db, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    try:
        payload = verify_email_token(token, max_age=86400)
    except SignatureExpired:
        raise bad_request("Dogrulama baglantisinin suresi dolmus.")
    except (BadSignature, Exception):
        raise bad_request("Gecersiz dogrulama baglantisi.")

    if payload.get("action") != "attendee_verify":
        raise bad_request("Gecersiz token turu.")
    if int(payload.get("event_id") or 0) != event.id:
        raise bad_request("Etkinlik dogrulama bilgisi eslesmiyor.")

    attendee_id = int(payload.get("attendee_id") or 0)
    email = str(payload.get("email") or "").lower()
    res = await db.execute(select(Attendee).where(Attendee.id == attendee_id, Attendee.event_id == event.id))
    attendee = res.scalar_one_or_none()
    if not attendee or attendee.email.lower() != email:
        raise HTTPException(status_code=404, detail="Katilimci bulunamadi.")

    attendee.email_verified = True
    attendee.email_verification_token = None
    attendee.email_verified_at = datetime.now(timezone.utc)
    await db.commit()

    return {
        "detail": "E-posta dogrulandi.",
        "attendee_id": attendee.id,
        "event_id": event.id,
        "status_url": build_public_status_url(event_id=_get_public_event_identifier(event), attendee_id=attendee.id, email=attendee.email),
    }


# Ã¢â€â‚¬Ã¢â€â‚¬ Public: QR check-in Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
API_AUDIT_SKIP_PREFIXES_EXTENDED = ("/api/attend/", "/api/events/")

@app.get("/api/attend/{checkin_token}")
async def get_session_by_token(checkin_token: str, db: AsyncSession = Depends(get_db)):
    ctx = await _get_checkin_context_by_token(checkin_token, db)
    if not ctx:
        raise HTTPException(status_code=404, detail="Geçersiz QR kodu")
    count_res = await db.execute(
        select(func.count()).where(AttendanceRecord.session_id == ctx["session_id"])
    )
    count = int(count_res.scalar_one() or 0)
    return {
        "session_id": ctx["session_id"],
        "session_name": ctx["session_name"],
        "session_date": ctx["session_date"].isoformat() if ctx["session_date"] else None,
        "session_start": ctx["session_start"].strftime("%H:%M") if ctx["session_start"] else None,
        "session_location": ctx["session_location"],
        "is_active": ctx["is_active"],
        "event_id": ctx["event_id"],
        "event_public_id": ctx["event_public_id"],
        "event_name": ctx["event_name"],
        "event_date": ctx["event_date"].isoformat() if ctx["event_date"] else None,
        "min_sessions_required": ctx["min_sessions_required"],
        "attendance_count": count,
    }


@app.post("/api/attend/{checkin_token}", response_model=CheckinOut)
@limiter.limit("600/minute")
async def self_checkin(
    checkin_token: str,
    payload: CheckinIn,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    ctx = await _get_checkin_context_by_token(checkin_token, db)
    if not ctx:
        raise HTTPException(status_code=404, detail="Geçersiz QR kodu")
    if not ctx["is_active"]:
        raise HTTPException(status_code=403, detail="Bu oturum için check-in kapalı")

    att_res = await db.execute(
        select(Attendee).where(
            Attendee.event_id == ctx["event_id"],
            func.lower(Attendee.email) == payload.email.lower(),
        )
    )
    attendee = att_res.scalar_one_or_none()
    event_res = await db.execute(select(Event).where(Event.id == ctx["event_id"]))
    event = event_res.scalar_one_or_none()
    require_email_verification = _get_event_email_verification_required(event) if event else True
    if attendee and require_email_verification and not attendee.email_verified:
        raise HTTPException(status_code=403, detail="Check-in icin once e-posta dogrulamasi yapmalisiniz.")
    if not attendee:
        raise HTTPException(
            status_code=404,
            detail="Bu e-posta ile etkinlikte kayıtlı değilsiniz. Lütfen önce kayıt olun.",
        )

    ip = request.headers.get("X-Forwarded-For", request.client.host if request.client else None)
    insert_stmt = (
        _pg_insert(AttendanceRecord.__table__)
        .values(
            attendee_id=attendee.id,
            session_id=ctx["session_id"],
            ip_address=ip,
        )
        .on_conflict_do_nothing(index_elements=["attendee_id", "session_id"])
        .returning(AttendanceRecord.id)
    )
    inserted_res = await db.execute(insert_stmt)
    inserted_id = inserted_res.scalar_one_or_none()
    await db.commit()

    attended_res = await db.execute(
        select(func.count()).where(AttendanceRecord.attendee_id == attendee.id)
    )
    attended_count = int(attended_res.scalar_one() or 0)
    total_sessions = await _get_event_total_sessions_cached(ctx["event_id"], db)

    if inserted_id is None:
        return CheckinOut(
            success=False,
            message="Bu oturuma zaten check-in yaptınız.",
            attendee_name=attendee.name,
            sessions_attended=attended_count,
            sessions_required=ctx["min_sessions_required"],
            total_sessions=total_sessions,
        )

    return CheckinOut(
        success=True,
        message=f"Check-in başarılı! Hoş geldiniz, {attendee.name}.",
        attendee_name=attendee.name,
        sessions_attended=attended_count,
        sessions_required=ctx["min_sessions_required"],
        total_sessions=total_sessions,
    )


# Ã¢â€â‚¬Ã¢â€â‚¬ Admin: Sessions Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

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


@app.get(
    "/api/admin/events/{event_id}/sessions/{session_id}/qr",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin)), Depends(require_paid_plan)],
)
async def get_session_qr(
    event_id: int,
    session_id: int,
    request: Request,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ev = await _get_event_for_admin(event_id, me, db)

    res = await db.execute(
        select(EventSession).where(
            EventSession.id == session_id,
            EventSession.event_id == event_id,
        )
    )
    session = res.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Event sahibinin organization/domain bilgisini ÃƒÂ§ek
    org_res = await db.execute(
        select(Organization).where(Organization.user_id == ev.admin_id)
    )
    org = org_res.scalar_one_or_none()

    # Ãƒâ€“ncelik: organization custom domain
    # fallback: request host
    # en son: settings.frontend_base_url
    host = None

    if org and org.custom_domain:
        host = org.custom_domain
    else:
        req_host = (request.headers.get("host") or "").split(":")[0].strip().lower()
        if req_host:
            host = req_host

    if host:
        checkin_url = f"https://{host}/attend/{session.checkin_token}"
    else:
        checkin_url = f"{settings.frontend_base_url.rstrip('/')}/attend/{session.checkin_token}"

    qr = qrcode.QRCode(
        version=2,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=10,
        border=4,
    )
    qr.add_data(checkin_url)
    qr.make(fit=True)

    img = qr.make_image(fill_color="black", back_color="white")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)

    from fastapi.responses import Response
    return Response(
        content=buf.getvalue(),
        media_type="image/png",
        headers={"X-Checkin-URL": checkin_url},
    )
# Ã¢â€â‚¬Ã¢â€â‚¬ Admin: Attendees Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

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
    q = select(Attendee).options(selectinload(Attendee.public_member)).where(Attendee.event_id == event_id)
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
            public_member_id=a.public_member_id,
            public_member_name=a.public_member.display_name if a.public_member else None,
            public_member_email=a.public_member.email if a.public_member else None,
            registration_answers=(a.registration_answers or {}),
        ))
    return {"items": results, "total": total, "page": page, "limit": limit}


@app.get(
    "/api/admin/events/{event_id}/attendees/{attendee_id}/survey-link",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def get_attendee_survey_link(
    event_id: int,
    attendee_id: int,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    event = await _get_event_for_admin(event_id, me, db)
    res = await db.execute(
        select(Attendee).where(Attendee.id == attendee_id, Attendee.event_id == event_id)
    )
    attendee = res.scalar_one_or_none()
    if not attendee:
        raise HTTPException(status_code=404, detail="Katılımcı bulunamadı")

    survey_token = make_survey_access_token(
        attendee_id=attendee.id,
        event_id=event_id,
        email=attendee.email,
    )
    return {
        "attendee_id": attendee.id,
        "attendee_name": attendee.name,
        "attendee_email": attendee.email,
        "survey_token": survey_token,
        "survey_url": build_public_survey_url(
            event_id=_get_public_event_identifier(event),
            attendee_id=attendee.id,
            email=attendee.email,
        ),
    }


@app.get("/api/admin/events/{event_id}/comments", response_model=list[PublicEventCommentOut], dependencies=[Depends(require_role(Role.admin, Role.superadmin))])
async def list_admin_event_comments(
    event_id: int,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_event_for_admin(event_id, me, db)
    comments_res = await db.execute(
        select(EventComment)
        .options(selectinload(EventComment.public_member))
        .where(EventComment.event_id == event_id)
        .order_by(EventComment.created_at.desc())
    )
    return [_event_comment_to_out(comment) for comment in comments_res.scalars().all()]


@app.patch("/api/admin/events/{event_id}/comments/{comment_id}", response_model=PublicEventCommentOut, dependencies=[Depends(require_role(Role.admin, Role.superadmin))])
async def update_admin_event_comment(
    event_id: int,
    comment_id: int,
    payload: AdminEventCommentUpdateIn,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_event_for_admin(event_id, me, db)
    comment_res = await db.execute(
        select(EventComment)
        .options(selectinload(EventComment.public_member))
        .where(EventComment.id == comment_id, EventComment.event_id == event_id)
    )
    comment = comment_res.scalar_one_or_none()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")

    comment.status = payload.status
    await write_audit_log(
        db,
        user_id=me.id,
        action="admin.comment.update",
        resource_type="event_comment",
        resource_id=str(comment.id),
        extra={"event_id": event_id, "status": payload.status},
    )
    await db.commit()
    await db.refresh(comment, attribute_names=["public_member"])
    return _event_comment_to_out(comment)


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
        raise HTTPException(status_code=400, detail=f"Dosya okunamadÃ„Â±: {e}")

    # Find name and email columns (case-insensitive)
    col_map = {c.lower(): c for c in df.columns}
    name_col = col_map.get("name") or col_map.get("ad") or col_map.get("isim")
    email_col = col_map.get("email") or col_map.get("e-posta") or col_map.get("eposta")
    if not name_col or not email_col:
        raise HTTPException(status_code=400, detail="'name' ve 'email' kolonlarÃ„Â± gerekli")

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


# Ã¢â€â‚¬Ã¢â€â‚¬ Admin: Attendance matrix & manual check-in Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

async def _get_raffle_for_admin(
    event_id: int,
    raffle_id: int,
    me: CurrentUser,
    db: AsyncSession,
) -> EventRaffle:
    await _get_event_for_admin(event_id, me, db)
    raffle_res = await db.execute(
        select(EventRaffle)
        .options(selectinload(EventRaffle.winners).selectinload(EventRaffleWinner.attendee))
        .where(EventRaffle.id == raffle_id, EventRaffle.event_id == event_id)
    )
    raffle = raffle_res.scalar_one_or_none()
    if not raffle:
        raise HTTPException(status_code=404, detail="Raffle not found")
    return raffle


@app.get(
    "/api/admin/events/{event_id}/raffles",
    response_model=List[EventRaffleOut],
    dependencies=[Depends(require_role(Role.admin, Role.superadmin)), Depends(require_paid_plan)],
)
async def list_event_raffles(
    event_id: int,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    event = await _get_event_for_admin(event_id, me, db)
    raffles_res = await db.execute(
        select(EventRaffle)
        .options(selectinload(EventRaffle.winners).selectinload(EventRaffleWinner.attendee))
        .where(EventRaffle.event_id == event_id)
        .order_by(EventRaffle.created_at.desc(), EventRaffle.id.desc())
    )
    raffles = raffles_res.scalars().all()
    attendees, attendance_counts = await _get_event_attendance_counts(event_id, db)
    require_email_verification = _get_event_email_verification_required(event)
    return [
        _raffle_to_out(
            raffle,
            attendees,
            attendance_counts,
            require_email_verification=require_email_verification,
        )
        for raffle in raffles
    ]


@app.get(
    "/api/admin/events/{event_id}/raffles/audit",
    response_model=List[AuditLogOut],
    dependencies=[Depends(require_role(Role.admin, Role.superadmin)), Depends(require_paid_plan)],
)
async def list_event_raffle_audit_logs(
    event_id: int,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_event_for_admin(event_id, me, db)
    logs_res = await db.execute(
        select(AuditLog)
        .where(
            AuditLog.resource_type == "raffle",
            AuditLog.extra["event_id"].astext == str(event_id),
        )
        .order_by(AuditLog.created_at.desc())
        .limit(100)
    )
    return logs_res.scalars().all()


@app.post(
    "/api/admin/events/{event_id}/raffles",
    response_model=EventRaffleOut,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin)), Depends(require_paid_plan)],
)
async def create_event_raffle(
    event_id: int,
    payload: EventRaffleCreateIn,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    event = await _get_event_for_admin(event_id, me, db)
    raffle = EventRaffle(
        event_id=event_id,
        title=payload.title.strip(),
        prize_name=payload.prize_name.strip(),
        description=(payload.description.strip() if payload.description else None),
        min_sessions_required=payload.min_sessions_required,
        winner_count=payload.winner_count,
        reserve_winner_count=payload.reserve_winner_count,
        status="draft",
        created_by=me.id,
    )
    db.add(raffle)
    await db.flush()
    await write_audit_log(
        db,
        user_id=me.id,
        action="raffle.create",
        resource_type="raffle",
        resource_id=str(raffle.id),
        extra={
            "event_id": event_id,
            "title": raffle.title,
            "winner_count": raffle.winner_count,
            "reserve_winner_count": raffle.reserve_winner_count,
            "min_sessions_required": raffle.min_sessions_required,
        },
    )
    await db.commit()
    raffle = await _get_raffle_for_admin(event_id, raffle.id, me, db)
    attendees, attendance_counts = await _get_event_attendance_counts(event_id, db)
    return _raffle_to_out(
        raffle,
        attendees,
        attendance_counts,
        require_email_verification=_get_event_email_verification_required(event),
    )


@app.patch(
    "/api/admin/events/{event_id}/raffles/{raffle_id}",
    response_model=EventRaffleOut,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin)), Depends(require_paid_plan)],
)
async def update_event_raffle(
    event_id: int,
    raffle_id: int,
    payload: EventRaffleUpdateIn,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    event = await _get_event_for_admin(event_id, me, db)
    raffle = await _get_raffle_for_admin(event_id, raffle_id, me, db)
    should_reset_draw = False

    original_title = raffle.title
    if payload.title is not None:
        raffle.title = payload.title.strip()
    if payload.prize_name is not None:
        raffle.prize_name = payload.prize_name.strip()
    if payload.description is not None:
        raffle.description = payload.description.strip() or None
    if payload.min_sessions_required is not None:
        raffle.min_sessions_required = payload.min_sessions_required
        should_reset_draw = True
    if payload.winner_count is not None:
        raffle.winner_count = payload.winner_count
        should_reset_draw = True
    if payload.reserve_winner_count is not None:
        raffle.reserve_winner_count = payload.reserve_winner_count
        should_reset_draw = True

    if should_reset_draw:
        await db.execute(delete(EventRaffleWinner).where(EventRaffleWinner.raffle_id == raffle.id))
        raffle.winners.clear()
        raffle.status = "draft"
        raffle.drawn_at = None

    await write_audit_log(
        db,
        user_id=me.id,
        action="raffle.update",
        resource_type="raffle",
        resource_id=str(raffle.id),
        extra={
            "event_id": event_id,
            "title_before": original_title,
            "title_after": raffle.title,
            "winner_count": raffle.winner_count,
            "reserve_winner_count": raffle.reserve_winner_count,
            "min_sessions_required": raffle.min_sessions_required,
            "reset_draw": should_reset_draw,
        },
    )
    await db.commit()
    refreshed = await _get_raffle_for_admin(event_id, raffle_id, me, db)
    attendees, attendance_counts = await _get_event_attendance_counts(event_id, db)
    return _raffle_to_out(
        refreshed,
        attendees,
        attendance_counts,
        require_email_verification=_get_event_email_verification_required(event),
    )


@app.delete(
    "/api/admin/events/{event_id}/raffles/{raffle_id}",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin)), Depends(require_paid_plan)],
)
async def delete_event_raffle(
    event_id: int,
    raffle_id: int,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    raffle = await _get_raffle_for_admin(event_id, raffle_id, me, db)
    await write_audit_log(
        db,
        user_id=me.id,
        action="raffle.delete",
        resource_type="raffle",
        resource_id=str(raffle.id),
        extra={
            "event_id": event_id,
            "title": raffle.title,
            "winner_count": raffle.winner_count,
            "reserve_winner_count": raffle.reserve_winner_count,
        },
    )
    await db.delete(raffle)
    await db.commit()
    return {"ok": True}


@app.post(
    "/api/admin/events/{event_id}/raffles/{raffle_id}/draw",
    response_model=EventRaffleOut,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin)), Depends(require_paid_plan)],
)
async def draw_event_raffle(
    event_id: int,
    raffle_id: int,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    event = await _get_event_for_admin(event_id, me, db)
    raffle = await _get_raffle_for_admin(event_id, raffle_id, me, db)
    if raffle.winners:
        raise HTTPException(status_code=400, detail="Kazananlar zaten ÃƒÂ§ekildi. Yeni tur iÃƒÂ§in tekrar ÃƒÂ§ek kullanÃ„Â±n")
    attendees, attendance_counts = await _get_event_attendance_counts(event_id, db)
    selected_winners = _pick_raffle_winners(
        raffle,
        attendees,
        attendance_counts,
        require_email_verification=_get_event_email_verification_required(event),
    )
    draw_time = datetime.now(timezone.utc)
    for attendee in selected_winners:
        raffle.winners.append(
            EventRaffleWinner(attendee_id=attendee.id, drawn_at=draw_time)
        )

    raffle.status = "drawn"
    raffle.drawn_at = draw_time
    await write_audit_log(
        db,
        user_id=me.id,
        action="raffle.draw",
        resource_type="raffle",
        resource_id=str(raffle.id),
        extra={
            "event_id": event_id,
            "title": raffle.title,
            "selected_count": len(selected_winners),
            "winner_ids": [attendee.id for attendee in selected_winners],
        },
    )
    await db.commit()

    refreshed = await _get_raffle_for_admin(event_id, raffle_id, me, db)
    attendees, attendance_counts = await _get_event_attendance_counts(event_id, db)
    return _raffle_to_out(
        refreshed,
        attendees,
        attendance_counts,
        require_email_verification=_get_event_email_verification_required(event),
    )


@app.post(
    "/api/admin/events/{event_id}/raffles/{raffle_id}/redraw",
    response_model=EventRaffleOut,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin)), Depends(require_paid_plan)],
)
async def redraw_event_raffle(
    event_id: int,
    raffle_id: int,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    event = await _get_event_for_admin(event_id, me, db)
    raffle = await _get_raffle_for_admin(event_id, raffle_id, me, db)
    attendees, attendance_counts = await _get_event_attendance_counts(event_id, db)
    excluded_attendee_ids = {winner.attendee_id for winner in raffle.winners}
    selected_winners = _pick_raffle_winners(
        raffle,
        attendees,
        attendance_counts,
        require_email_verification=_get_event_email_verification_required(event),
        excluded_attendee_ids=excluded_attendee_ids,
    )

    draw_time = datetime.now(timezone.utc)
    for attendee in selected_winners:
        raffle.winners.append(
            EventRaffleWinner(attendee_id=attendee.id, drawn_at=draw_time)
        )

    raffle.status = "drawn"
    raffle.drawn_at = draw_time
    await write_audit_log(
        db,
        user_id=me.id,
        action="raffle.redraw",
        resource_type="raffle",
        resource_id=str(raffle.id),
        extra={
            "event_id": event_id,
            "title": raffle.title,
            "selected_count": len(selected_winners),
            "winner_ids": [attendee.id for attendee in selected_winners],
            "excluded_count": len(excluded_attendee_ids),
        },
    )
    await db.commit()

    refreshed = await _get_raffle_for_admin(event_id, raffle_id, me, db)
    attendees, attendance_counts = await _get_event_attendance_counts(event_id, db)
    return _raffle_to_out(
        refreshed,
        attendees,
        attendance_counts,
        require_email_verification=_get_event_email_verification_required(event),
    )


@app.get(
    "/api/admin/events/{event_id}/raffles/{raffle_id}/export",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin)), Depends(require_paid_plan)],
)
async def export_event_raffle(
    event_id: int,
    raffle_id: int,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    event = await _get_event_for_admin(event_id, me, db)
    raffle = await _get_raffle_for_admin(event_id, raffle_id, me, db)
    attendees, attendance_counts = await _get_event_attendance_counts(event_id, db)
    raffle_out = _raffle_to_out(
        raffle,
        attendees,
        attendance_counts,
        require_email_verification=_get_event_email_verification_required(event),
    )

    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow([
        "cekilis_id",
        "cekilis_basligi",
        "hediye",
        "min_oturum",
        "yedek_kazanan_sayisi",
        "tur_no",
        "kazanan_tipi",
        "kazanan_sirasi",
        "katilimci_id",
        "ad_soyad",
        "email",
        "katildigi_oturum_sayisi",
        "cekilis_zamani",
    ])
    chunk_size = max(1, raffle_out.winner_count + raffle_out.reserve_winner_count)
    for index, winner in enumerate(raffle_out.winners, start=1):
        round_index = ((index - 1) // chunk_size) + 1
        index_in_round = ((index - 1) % chunk_size) + 1
        winner_type = "asil" if index_in_round <= raffle_out.winner_count else "yedek"
        winner_order = index_in_round if winner_type == "asil" else index_in_round - raffle_out.winner_count
        writer.writerow([
            raffle_out.id,
            raffle_out.title,
            raffle_out.prize_name,
            raffle_out.min_sessions_required,
            raffle_out.reserve_winner_count,
            round_index,
            winner_type,
            winner_order,
            winner.attendee_id,
            winner.attendee_name,
            winner.attendee_email,
            winner.sessions_attended,
            winner.drawn_at.isoformat(),
        ])

    await write_audit_log(
        db,
        user_id=me.id,
        action="raffle.export",
        resource_type="raffle",
        resource_id=str(raffle.id),
        extra={
            "event_id": event_id,
            "title": raffle.title,
            "winner_rows": len(raffle_out.winners),
        },
    )
    await db.commit()

    filename = f"raffle_{raffle_out.id}_results.csv"
    return StreamingResponse(
        iter([buffer.getvalue().encode("utf-8-sig")]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@app.post(
    "/api/admin/events/{event_id}/raffles/{raffle_id}/reset",
    response_model=EventRaffleOut,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin)), Depends(require_paid_plan)],
)
async def reset_event_raffle(
    event_id: int,
    raffle_id: int,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    event = await _get_event_for_admin(event_id, me, db)
    raffle = await _get_raffle_for_admin(event_id, raffle_id, me, db)
    await db.execute(delete(EventRaffleWinner).where(EventRaffleWinner.raffle_id == raffle.id))
    raffle.winners.clear()
    raffle.status = "draft"
    raffle.drawn_at = None
    await write_audit_log(
        db,
        user_id=me.id,
        action="raffle.reset",
        resource_type="raffle",
        resource_id=str(raffle.id),
        extra={
            "event_id": event_id,
            "title": raffle.title,
        },
    )
    await db.commit()

    refreshed = await _get_raffle_for_admin(event_id, raffle_id, me, db)
    attendees, attendance_counts = await _get_event_attendance_counts(event_id, db)
    return _raffle_to_out(
        refreshed,
        attendees,
        attendance_counts,
        require_email_verification=_get_event_email_verification_required(event),
    )


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
    att_res = await db.execute(
        select(Attendee)
        .options(selectinload(Attendee.public_member))
        .where(Attendee.event_id == event_id)
        .order_by(Attendee.name)
    )
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
        row = {
            "Ad Soyad": a.name,
            "E-posta": a.email,
            "Kaynak": a.source,
            "Uye Hesabi": a.public_member.display_name if a.public_member else "",
            "Uye E-postasi": a.public_member.email if a.public_member else "",
        }
        for s in sessions:
            row[s.name] = "Evet" if (a.id, s.id) in rec_set else "Hayir"
        row["Katilinan Oturum"] = sum(1 for s in sessions if (a.id, s.id) in rec_set)
        row["Esigi Geciyor"] = "Evet" if row["Katilinan Oturum"] >= ev.min_sessions_required else "Hayir"
        answers = a.registration_answers or {}
        for field in registration_fields:
            row[field["label"]] = answers.get(field["id"], "")
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


# Ã¢â€â‚¬Ã¢â€â‚¬ Admin: Bulk certify Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

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
    from .generator import (
        TemplateConfig,
        new_certificate_uuid,
        render_certificate_pdf,
        render_certificate_png_watermarked,
    )

    ev = await _get_event_for_admin(event_id, me, db)
    if not ev.config or ev.template_image_url in ("", "placeholder"):
        raise HTTPException(status_code=400, detail="Etkinlik sablon yapilandirmasi eksik")

    # Fetch all attendees
    att_res = await db.execute(select(Attendee).where(Attendee.event_id == event_id))
    attendees = att_res.scalars().all()
    if not attendees:
        raise HTTPException(status_code=400, detail="Katilimci listesi bos")

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
        rel_png_path = _certificate_png_rel_path(event_id, cert_uuid)
        abs_png_path = Path(settings.local_storage_dir) / rel_png_path
        abs_png_path.parent.mkdir(parents=True, exist_ok=True)

        try:
            pdf_bytes = render_certificate_pdf(
                template_image_bytes=template_bytes,
                student_name=attendee.name,
                verify_url=build_certificate_verify_url(cert_uuid),
                config=tc,
                public_id=public_id,
                brand_logo_bytes=brand_logo_bytes,
                certificate_footer=(cfg_raw.get("certificate_footer") if isinstance(cfg_raw, dict) else None),
            )
            abs_path.write_bytes(pdf_bytes)
            try:
                png_bytes = render_certificate_png_watermarked(
                    template_image_bytes=template_bytes,
                    student_name=attendee.name,
                    verify_url=build_certificate_verify_url(cert_uuid),
                    config=tc,
                    public_id=public_id,
                    brand_logo_bytes=brand_logo_bytes,
                    certificate_footer=(cfg_raw.get("certificate_footer") if isinstance(cfg_raw, dict) else None),
                )
                abs_png_path.write_bytes(png_bytes)
            except Exception as png_error:
                logger.warning("BulkCertify PNG render error for %s: %s", attendee.name, png_error)
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
        if attendee.email:
            background_tasks.add_task(
                send_certificate_delivery_email_task,
                event_id=event_id,
                cert_uuid=cert_uuid,
                recipient_name=attendee.name,
                recipient_email=attendee.email,
            )

    await db.commit()
    return BulkCertifyOut(
        created=created,
        already_had_cert=already_had_cert,
        below_threshold=below_threshold,
        total_attendees=len(attendees),
        spent_heptacoin=total_spent,
    )


@app.post(
    "/api/admin/events/{event_id}/bulk-certify-queue",
    response_model=BulkCertificateJobOut,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin)), Depends(require_paid_plan)],
)
async def bulk_certify_attendees_queue(
    event_id: int,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Creates a background bulk certificate job for all eligible attendees.

    Uses the existing job queue (BulkCertificateJob) so the request returns
    immediately and heavy PDF rendering happens asynchronously, preventing
    HTTP timeouts for large attendee lists.
    """
    ev = await _get_event_for_admin(event_id, me, db)
    if not ev.config or ev.template_image_url in ("", "placeholder"):
        raise HTTPException(status_code=400, detail="Etkinlik sablon yapilandirmasi eksik")

    # Fetch all attendees
    att_res = await db.execute(select(Attendee).where(Attendee.event_id == event_id))
    attendees = att_res.scalars().all()
    if not attendees:
        raise HTTPException(status_code=400, detail="Katilimci listesi bos")

    # Count attendance per attendee
    rec_res = await db.execute(
        select(AttendanceRecord.attendee_id, func.count().label("cnt"))
        .where(AttendanceRecord.attendee_id.in_([a.id for a in attendees]))
        .group_by(AttendanceRecord.attendee_id)
    )
    attend_counts: dict[int, int] = {r.attendee_id: r.cnt for r in rec_res.all()}

    eligible = [a for a in attendees if attend_counts.get(a.id, 0) >= ev.min_sessions_required]
    if not eligible:
        raise HTTPException(status_code=400, detail="Esigi gecen katilimci bulunamadi")

    names = [a.name for a in eligible]

    # Early balance check
    res_u = await db.execute(select(User).where(User.id == me.id))
    user = res_u.scalar_one()
    ISSUE_UNITS_PER_CERT = 10
    HOSTING_ESTIMATE_UNITS = 20
    estimated_total = len(names) * (ISSUE_UNITS_PER_CERT + HOSTING_ESTIMATE_UNITS)
    if user.heptacoin_balance < estimated_total:
        raise HTTPException(
            status_code=402,
            detail=f"Yetersiz HeptaCoin. Tahmini Gereksinim={estimated_total}, Bakiye={user.heptacoin_balance}",
        )

    chunk_size = 5 if len(names) >= 500 else 10
    job = BulkCertificateJob(
        event_id=ev.id,
        created_by=me.id,
        names=names,
        chunk_size=chunk_size,
        total_count=len(names),
        status="pending",
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)

    # Nudge the background processor to start quickly
    asyncio.create_task(_process_bulk_certificate_jobs())

    return job


# Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â
# Admin: Transaction list (paginated)
# Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â

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
            {"id": t.id, "amount": t.amount, "type": t.type, "timestamp": t.timestamp.isoformat() if t.timestamp else None}
            for t in txs
        ],
        "total": total,
        "page": page,
        "limit": limit,
    }


# Ã¢â€â‚¬Ã¢â€â‚¬ Public: Email Unsubscribe Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

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
        raise HTTPException(status_code=404, detail="KatÃ„Â±lÃ„Â±mcÃ„Â± bulunamadÃ„Â±")
    
    # Validate token (simple implementation - in production use HMAC)
    # TODO: Implement proper token validation with HMAC-SHA256
    expected_token = hashlib.sha256(f"{attendee_id}:{attendee.email}".encode()).hexdigest()[:16]
    if token != expected_token:
        logger.warning(f"Invalid unsubscribe token for attendee {attendee_id}")
        raise HTTPException(status_code=401, detail="GeÃƒÂ§ersiz token")
    
    # Mark as unsubscribed
    attendee.unsubscribed_at = datetime.utcnow()
    db.add(attendee)
    await db.commit()
    
    return {
        "status": "unsubscribed",
        "message": f"{attendee.email} adresinden abonelik kaldÃ„Â±rÃ„Â±ldÃ„Â±",
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
        raise HTTPException(status_code=404, detail="KatÃ„Â±lÃ„Â±mcÃ„Â± bulunamadÃ„Â±")
    
    # Validate token
    expected_token = hashlib.sha256(f"{attendee_id}:{attendee.email}".encode()).hexdigest()[:16]
    is_valid = token == expected_token
    
    return {
        "valid": is_valid,
        "attendee_email": attendee.email if is_valid else None,
    }

