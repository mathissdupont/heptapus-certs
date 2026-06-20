"""Presentation workspace models.

Kept outside main.py so the presentation editor/export feature can evolve as an
independent module.
"""

from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from .db import Base
from .db_types import JSONB


class PresentationDeck(Base):
    __tablename__ = "presentation_decks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    organization_id: Mapped[int] = mapped_column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), index=True)
    event_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("events.id", ondelete="CASCADE"), nullable=True, index=True)
    created_by: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    title: Mapped[str] = mapped_column(String(220))
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    language: Mapped[str] = mapped_column(String(8), default="tr")
    theme: Mapped[dict] = mapped_column(JSONB, default=dict)
    slides: Mapped[list] = mapped_column(JSONB, default=list)
    presenter_token: Mapped[Optional[str]] = mapped_column(String(96), unique=True, nullable=True, index=True)
    source: Mapped[str] = mapped_column(String(32), default="manual")
    status: Mapped[str] = mapped_column(String(24), default="draft", index=True)
    file_path: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    file_filename: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    file_content_type: Mapped[Optional[str]] = mapped_column(String(160), nullable=True)
    file_size: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    converted_file_path: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    converted_file_filename: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    conversion_status: Mapped[str] = mapped_column(String(24), default="not_required", index=True)
    conversion_error: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    conversion_attempts: Mapped[int] = mapped_column(Integer, default=0)
    last_export_path: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    last_export_filename: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        Index("ix_presentation_decks_org_updated", "organization_id", "updated_at"),
        Index("ix_presentation_decks_event_updated", "event_id", "updated_at"),
    )
