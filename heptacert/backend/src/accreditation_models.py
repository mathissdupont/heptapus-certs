"""Accreditation & CPD models."""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import (
    Boolean, DateTime, ForeignKey, Integer, Numeric, String, Text
)
from .db_types import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from .main import Base


class AccreditationBody(Base):
    __tablename__ = "accreditation_bodies"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    short_code: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    logo_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    verification_url_pattern: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default="now()")


class OrgAccreditation(Base):
    __tablename__ = "org_accreditations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    organization_id: Mapped[int] = mapped_column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    body_id: Mapped[int] = mapped_column(Integer, ForeignKey("accreditation_bodies.id", ondelete="CASCADE"), nullable=False)
    accreditation_number: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    valid_from: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    valid_until: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    documents_json: Mapped[Optional[list]] = mapped_column(JSONB, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default="now()")
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default="now()")


class EventCpdConfig(Base):
    __tablename__ = "event_cpd_configs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    event_id: Mapped[int] = mapped_column(Integer, ForeignKey("events.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    body_id: Mapped[int] = mapped_column(Integer, ForeignKey("accreditation_bodies.id", ondelete="RESTRICT"), nullable=False)
    cpd_hours: Mapped[float] = mapped_column(Numeric(6, 2), nullable=False, default=0)
    cpd_category: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    cpd_unit_type: Mapped[str] = mapped_column(String(50), nullable=False, server_default="hours")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default="now()")
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default="now()")


class MemberCpdLog(Base):
    __tablename__ = "member_cpd_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    member_id: Mapped[int] = mapped_column(Integer, ForeignKey("public_members.id", ondelete="CASCADE"), nullable=False, index=True)
    event_id: Mapped[int] = mapped_column(Integer, ForeignKey("events.id", ondelete="CASCADE"), nullable=False)
    body_id: Mapped[int] = mapped_column(Integer, ForeignKey("accreditation_bodies.id", ondelete="RESTRICT"), nullable=False)
    cpd_hours: Mapped[float] = mapped_column(Numeric(6, 2), nullable=False)
    cpd_category: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    certificate_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("certificates.id", ondelete="SET NULL"), nullable=True)
    earned_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default="now()")
