"""Learning Path engine models — decoupled from main.py."""

from datetime import datetime
from typing import List, Optional

from sqlalchemy import (
    Boolean, DateTime, ForeignKey, Index, Integer, String, Text, func,
    UniqueConstraint, Numeric,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .main import Base, JSONB


class LearningPath(Base):
    __tablename__ = "learning_paths"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    # org_id links to organizations.id — the org that owns this path
    org_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("organizations.id", ondelete="CASCADE")
    )
    name: Mapped[str] = mapped_column(String(200))
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    thumbnail_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    published: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    steps: Mapped[List["LearningPathStep"]] = relationship(
        back_populates="path",
        cascade="all, delete-orphan",
        order_by="LearningPathStep.order",
    )
    enrollments: Mapped[List["LearningPathEnrollment"]] = relationship(
        back_populates="path", cascade="all, delete-orphan"
    )

    __table_args__ = (Index("ix_learning_paths_org_id", "org_id"),)


class LearningPathStep(Base):
    __tablename__ = "learning_path_steps"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    path_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("learning_paths.id", ondelete="CASCADE"), index=True
    )
    event_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("events.id", ondelete="CASCADE"), index=True
    )
    order: Mapped[int] = mapped_column(Integer, default=0)
    # If False, step is optional — won't block path completion
    required: Mapped[bool] = mapped_column(Boolean, default=True)
    # Override passing score for this step's quiz (None = use quiz default)
    min_score_override: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    path: Mapped["LearningPath"] = relationship(back_populates="steps")
    completions: Mapped[List["LearningPathStepCompletion"]] = relationship(
        back_populates="step", cascade="all, delete-orphan"
    )

    __table_args__ = (
        UniqueConstraint("path_id", "event_id", name="uq_lp_step_path_event"),
        Index("ix_lp_steps_path_order", "path_id", "order"),
    )


class LearningPathEnrollment(Base):
    __tablename__ = "learning_path_enrollments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    path_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("learning_paths.id", ondelete="CASCADE"), index=True
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
    # 0-100 computed from completed required steps
    progress_pct: Mapped[int] = mapped_column(Integer, default=0)

    path: Mapped["LearningPath"] = relationship(back_populates="enrollments")
    step_completions: Mapped[List["LearningPathStepCompletion"]] = relationship(
        back_populates="enrollment", cascade="all, delete-orphan"
    )

    __table_args__ = (
        UniqueConstraint("path_id", "member_id", name="uq_lp_enrollment_path_member"),
        Index("ix_lp_enrollments_path_member", "path_id", "member_id"),
    )


class LearningPathStepCompletion(Base):
    __tablename__ = "learning_path_step_completions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    enrollment_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("learning_path_enrollments.id", ondelete="CASCADE"), index=True
    )
    step_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("learning_path_steps.id", ondelete="CASCADE"), index=True
    )
    # Optional: the certificate issued for this step
    certificate_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("certificates.id", ondelete="SET NULL"), nullable=True
    )
    completed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    enrollment: Mapped["LearningPathEnrollment"] = relationship(back_populates="step_completions")
    step: Mapped["LearningPathStep"] = relationship(back_populates="completions")

    __table_args__ = (
        UniqueConstraint("enrollment_id", "step_id", name="uq_lp_step_completion"),
    )
