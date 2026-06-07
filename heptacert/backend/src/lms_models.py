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


# ---------------------------------------------------------------------------
# Core course structure
# ---------------------------------------------------------------------------

class TrainingCourse(Base):
    __tablename__ = "training_courses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    org_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("organizations.id", ondelete="CASCADE")
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
    passing_score: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    is_marketplace_listed: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    marketplace_price: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2), nullable=True)
    marketplace_description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    preview_video_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
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
    announcements: Mapped[List["CourseAnnouncement"]] = relationship(
        back_populates="course", cascade="all, delete-orphan",
        order_by="CourseAnnouncement.created_at.desc()",
    )

    __table_args__ = (Index("ix_training_courses_org_id", "org_id"),)


class CourseModule(Base):
    """A single learning unit inside a course (video, article, quiz, assignment…)."""
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
    # Optional FK to quiz engine — used when content_type == "quiz"
    quiz_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("quizzes.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    course: Mapped["TrainingCourse"] = relationship(back_populates="modules")
    progress_records: Mapped[List["ModuleProgress"]] = relationship(
        back_populates="module", cascade="all, delete-orphan"
    )
    assignment: Mapped[Optional["CourseAssignment"]] = relationship(
        back_populates="module", uselist=False, cascade="all, delete-orphan"
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
    # Final computed grade (0-100), populated when course is completed
    final_grade: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    certificate_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("certificates.id", ondelete="SET NULL"), nullable=True
    )

    cert_pdf_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    # enrolled | in_progress | completed | dropped
    status: Mapped[str] = mapped_column(String(32), default="enrolled", index=True)

    course: Mapped["TrainingCourse"] = relationship(back_populates="enrollments")
    module_progress: Mapped[List["ModuleProgress"]] = relationship(
        back_populates="enrollment", cascade="all, delete-orphan"
    )
    grade_summary: Mapped[Optional["CourseGradeSummary"]] = relationship(
        "CourseGradeSummary", back_populates="enrollment", uselist=False
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
    # Score if this module was a quiz (0-100)
    quiz_score: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    enrollment: Mapped["CourseEnrollment"] = relationship(back_populates="module_progress")
    module: Mapped["CourseModule"] = relationship(back_populates="progress_records")

    __table_args__ = (
        UniqueConstraint("enrollment_id", "module_id", name="uq_module_progress"),
    )


# ---------------------------------------------------------------------------
# Assignments & Gradebook (Canvas-like)
# ---------------------------------------------------------------------------

class CourseAssignment(Base):
    """Coursework tied to a module of type 'assignment'."""
    __tablename__ = "course_assignments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    module_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("course_modules.id", ondelete="CASCADE"), index=True, unique=True
    )
    instructions: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    due_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    max_points: Mapped[int] = mapped_column(Integer, default=100)
    # text | file | url | any
    submission_type: Mapped[str] = mapped_column(String(50), default="text")

    module: Mapped["CourseModule"] = relationship(back_populates="assignment")
    submissions: Mapped[List["AssignmentSubmission"]] = relationship(
        back_populates="assignment", cascade="all, delete-orphan"
    )


class AssignmentSubmission(Base):
    __tablename__ = "assignment_submissions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    assignment_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("course_assignments.id", ondelete="CASCADE"), index=True
    )
    member_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("public_members.id", ondelete="CASCADE"), index=True
    )
    submitted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    submission_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    submission_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    file_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    # Grading
    grade: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    feedback: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    graded_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    graded_by_user_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    assignment: Mapped["CourseAssignment"] = relationship(back_populates="submissions")

    __table_args__ = (
        UniqueConstraint("assignment_id", "member_id", name="uq_assignment_submission"),
        Index("ix_assignment_submissions_member", "member_id"),
    )


# ---------------------------------------------------------------------------
# Learning Journeys (course sequences → certificate)
# ---------------------------------------------------------------------------

class LmsJourney(Base):
    """An ordered sequence of courses leading to a certificate."""
    __tablename__ = "lms_journeys"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    org_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("organizations.id", ondelete="CASCADE")
    )
    title: Mapped[str] = mapped_column(String(300))
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    thumbnail_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_published: Mapped[bool] = mapped_column(Boolean, default=False)
    cert_template_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    steps: Mapped[List["LmsJourneyStep"]] = relationship(
        back_populates="journey",
        cascade="all, delete-orphan",
        order_by="LmsJourneyStep.order",
    )
    enrollments: Mapped[List["LmsJourneyEnrollment"]] = relationship(
        back_populates="journey", cascade="all, delete-orphan"
    )

    __table_args__ = (Index("ix_lms_journeys_org_id", "org_id"),)


class LmsJourneyStep(Base):
    __tablename__ = "lms_journey_steps"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    journey_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("lms_journeys.id", ondelete="CASCADE"), index=True
    )
    course_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("training_courses.id", ondelete="CASCADE"), index=True
    )
    order: Mapped[int] = mapped_column(Integer, default=0)
    is_required: Mapped[bool] = mapped_column(Boolean, default=True)

    journey: Mapped["LmsJourney"] = relationship(back_populates="steps")

    __table_args__ = (
        UniqueConstraint("journey_id", "course_id", name="uq_journey_course"),
        Index("ix_lms_journey_steps_order", "journey_id", "order"),
    )


class LmsJourneyEnrollment(Base):
    __tablename__ = "lms_journey_enrollments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    journey_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("lms_journeys.id", ondelete="CASCADE"), index=True
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

    cert_pdf_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    journey: Mapped["LmsJourney"] = relationship(back_populates="enrollments")

    __table_args__ = (
        UniqueConstraint("journey_id", "member_id", name="uq_journey_enrollment"),
        Index("ix_lms_journey_enrollments_member", "member_id"),
    )


# ---------------------------------------------------------------------------
# Announcements (Canvas-like per-course broadcast)
# ---------------------------------------------------------------------------

class CourseAnnouncement(Base):
    __tablename__ = "course_announcements"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    course_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("training_courses.id", ondelete="CASCADE"), index=True
    )
    author_user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    title: Mapped[str] = mapped_column(String(300))
    body: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    course: Mapped["TrainingCourse"] = relationship(back_populates="announcements")


# ---------------------------------------------------------------------------
# Organization LMS Staff (instructor, TA, content_editor roles)
# ---------------------------------------------------------------------------

class OrgLmsStaff(Base):
    """Maps a user to an LMS role within an organization."""
    __tablename__ = "org_lms_staff"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    org_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    # instructor | teaching_assistant | content_editor | department_admin | viewer
    role: Mapped[str] = mapped_column(String(50), default="instructor")
    # Optional: restrict to specific course. NULL means org-wide.
    course_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("training_courses.id", ondelete="CASCADE"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    __table_args__ = (
        UniqueConstraint("org_id", "user_id", "course_id", name="uq_org_lms_staff"),
        Index("ix_org_lms_staff_org", "org_id"),
        Index("ix_org_lms_staff_user", "user_id"),
    )


# ---------------------------------------------------------------------------
# CPD configuration per course (Accreditation integration)
# ---------------------------------------------------------------------------

class CourseCpdConfig(Base):
    """CPD hours awarded for completing a course."""
    __tablename__ = "course_cpd_configs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    course_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("training_courses.id", ondelete="CASCADE"), index=True
    )
    # FK to accreditation_bodies (defined in main.py accreditation section)
    accreditation_body_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    cpd_hours: Mapped[Decimal] = mapped_column(Numeric(6, 2), default=0)
    cpd_category: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    __table_args__ = (
        UniqueConstraint("course_id", "accreditation_body_id", name="uq_course_cpd"),
    )
