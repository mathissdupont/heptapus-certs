"""LMS (Learning Management System) models — completely independent of Events."""

from datetime import datetime
from decimal import Decimal
from typing import List, Optional

from sqlalchemy import (
    Boolean, DateTime, ForeignKey, Index, Integer, Numeric,
    String, Text, UniqueConstraint, func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .main import Base


class TrainingCourse(Base):
    __tablename__ = "training_courses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    org_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    title: Mapped[str] = mapped_column(String(300))
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    thumbnail_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    category: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    level: Mapped[str] = mapped_column(String(50), default="beginner")
    language: Mapped[str] = mapped_column(String(10), default="tr")
    is_published: Mapped[bool] = mapped_column(Boolean, default=False)
    is_featured: Mapped[bool] = mapped_column(Boolean, default=False)
    price: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2), nullable=True)
    cert_template_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    # Passing requirement (0-100), None = no quiz requirement
    passing_score: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    modules: Mapped[List["CourseModule"]] = relationship(
        back_populates="course",
        cascade="all, delete-orphan",
        order_by="CourseModule.order",
    )
    enrollments: Mapped[List["CourseEnrollment"]] = relationship(
        back_populates="course", cascade="all, delete-orphan"
    )

    __table_args__ = (Index("ix_training_courses_org_id", "org_id"),)


class CourseModule(Base):
    __tablename__ = "course_modules"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    course_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("training_courses.id", ondelete="CASCADE"), index=True
    )
    title: Mapped[str] = mapped_column(String(300))
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    order: Mapped[int] = mapped_column(Integer, default=0)
    # video | article | quiz | file | assignment
    content_type: Mapped[str] = mapped_column(String(50), default="article")
    content_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    content_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    duration_minutes: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    is_required: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    course: Mapped["TrainingCourse"] = relationship(back_populates="modules")
    progress_records: Mapped[List["ModuleProgress"]] = relationship(
        back_populates="module", cascade="all, delete-orphan"
    )

    __table_args__ = (Index("ix_course_modules_course_order", "course_id", "order"),)


class CourseEnrollment(Base):
    __tablename__ = "course_enrollments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    course_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("training_courses.id", ondelete="CASCADE"), index=True
    )
    member_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("public_members.id", ondelete="CASCADE"), index=True
    )
    enrolled_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    completed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    progress_pct: Mapped[int] = mapped_column(Integer, default=0)
    certificate_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("certificates.id", ondelete="SET NULL"), nullable=True
    )

    course: Mapped["TrainingCourse"] = relationship(back_populates="enrollments")
    module_progress: Mapped[List["ModuleProgress"]] = relationship(
        back_populates="enrollment", cascade="all, delete-orphan"
    )

    __table_args__ = (
        UniqueConstraint("course_id", "member_id", name="uq_course_enrollment"),
        Index("ix_course_enrollments_member", "member_id"),
    )


class ModuleProgress(Base):
    __tablename__ = "module_progress"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    enrollment_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("course_enrollments.id", ondelete="CASCADE"), index=True
    )
    module_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("course_modules.id", ondelete="CASCADE"), index=True
    )
    started_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    completed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    time_spent_seconds: Mapped[int] = mapped_column(Integer, default=0)

    enrollment: Mapped["CourseEnrollment"] = relationship(back_populates="module_progress")
    module: Mapped["CourseModule"] = relationship(back_populates="progress_records")

    __table_args__ = (
        UniqueConstraint("enrollment_id", "module_id", name="uq_module_progress"),
    )
