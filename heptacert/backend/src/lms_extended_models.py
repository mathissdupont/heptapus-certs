"""
Extended LMS models: Gradebook, Discussions, Rubrics, Learning Outcomes,
Groups, Badges, Calendar/Syllabus, Events↔LMS Bridge.
All are independent of Events tables — share only PublicMember / User / Org FKs.
"""

from datetime import datetime
from decimal import Decimal
from typing import List, Optional

from sqlalchemy import (
    Boolean, DateTime, ForeignKey, Index, Integer, JSON, Numeric,
    String, Text, UniqueConstraint, func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .main import Base


# ---------------------------------------------------------------------------
# 2A — Gradebook
# ---------------------------------------------------------------------------

class CourseGradeItem(Base):
    """A grading component of a course (quiz, assignment, participation)."""
    __tablename__ = "course_grade_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    course_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("training_courses.id", ondelete="CASCADE"), index=True
    )
    # quiz | assignment | participation | custom
    item_type: Mapped[str] = mapped_column(String(50), default="assignment")
    item_ref_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    title: Mapped[str] = mapped_column(String(300))
    max_points: Mapped[int] = mapped_column(Integer, default=100)
    weight_pct: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=0)
    order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (Index("ix_grade_items_course", "course_id"),)


class CourseGradeSummary(Base):
    """Computed weighted-average grade per enrollment."""
    __tablename__ = "course_grade_summaries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    enrollment_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("course_enrollments.id", ondelete="CASCADE"), unique=True
    )
    weighted_avg: Mapped[Optional[Decimal]] = mapped_column(Numeric(6, 2), nullable=True)
    letter_grade: Mapped[Optional[str]] = mapped_column(String(5), nullable=True)
    passed: Mapped[bool] = mapped_column(Boolean, default=False)
    computed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    enrollment: Mapped["CourseEnrollment"] = relationship("CourseEnrollment", back_populates="grade_summary")


# ---------------------------------------------------------------------------
# 2B — Discussions
# ---------------------------------------------------------------------------

class CourseDiscussion(Base):
    __tablename__ = "course_discussions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    course_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("training_courses.id", ondelete="CASCADE"), index=True
    )
    module_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("course_modules.id", ondelete="SET NULL"), nullable=True
    )
    author_member_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("public_members.id", ondelete="SET NULL"), nullable=True
    )
    title: Mapped[str] = mapped_column(String(300))
    body: Mapped[str] = mapped_column(Text)
    is_pinned: Mapped[bool] = mapped_column(Boolean, default=False)
    is_locked: Mapped[bool] = mapped_column(Boolean, default=False)
    reply_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    replies: Mapped[List["DiscussionReply"]] = relationship(
        back_populates="discussion", cascade="all, delete-orphan",
        order_by="DiscussionReply.created_at"
    )

    __table_args__ = (Index("ix_course_discussions_course", "course_id"),)


class DiscussionReply(Base):
    __tablename__ = "discussion_replies"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    discussion_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("course_discussions.id", ondelete="CASCADE"), index=True
    )
    parent_reply_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("discussion_replies.id", ondelete="SET NULL"), nullable=True
    )
    author_member_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("public_members.id", ondelete="SET NULL"), nullable=True
    )
    body: Mapped[str] = mapped_column(Text)
    is_instructor_reply: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    discussion: Mapped["CourseDiscussion"] = relationship(back_populates="replies")

    __table_args__ = (Index("ix_discussion_replies_discussion", "discussion_id"),)


# ---------------------------------------------------------------------------
# 2C — Rubrics
# ---------------------------------------------------------------------------

class Rubric(Base):
    __tablename__ = "rubrics"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    course_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("training_courses.id", ondelete="CASCADE"), index=True
    )
    title: Mapped[str] = mapped_column(String(300))
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    criteria: Mapped[List["RubricCriterion"]] = relationship(
        back_populates="rubric", cascade="all, delete-orphan",
        order_by="RubricCriterion.order"
    )

    __table_args__ = (Index("ix_rubrics_course", "course_id"),)


class RubricCriterion(Base):
    __tablename__ = "rubric_criteria"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    rubric_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("rubrics.id", ondelete="CASCADE"), index=True
    )
    title: Mapped[str] = mapped_column(String(300))
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    points: Mapped[int] = mapped_column(Integer, default=10)
    order: Mapped[int] = mapped_column(Integer, default=0)

    rubric: Mapped["Rubric"] = relationship(back_populates="criteria")
    ratings: Mapped[List["RubricRating"]] = relationship(
        back_populates="criterion", cascade="all, delete-orphan",
        order_by="RubricRating.points.desc()"
    )


class RubricRating(Base):
    __tablename__ = "rubric_ratings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    criterion_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("rubric_criteria.id", ondelete="CASCADE"), index=True
    )
    description: Mapped[str] = mapped_column(String(300))
    points: Mapped[int] = mapped_column(Integer, default=0)

    criterion: Mapped["RubricCriterion"] = relationship(back_populates="ratings")


class SubmissionRubricScore(Base):
    __tablename__ = "submission_rubric_scores"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    submission_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("assignment_submissions.id", ondelete="CASCADE"), index=True
    )
    criterion_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("rubric_criteria.id", ondelete="CASCADE"), index=True
    )
    rating_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("rubric_ratings.id", ondelete="SET NULL"), nullable=True
    )
    points_earned: Mapped[int] = mapped_column(Integer, default=0)
    comment: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    __table_args__ = (
        UniqueConstraint("submission_id", "criterion_id", name="uq_submission_rubric_criterion"),
    )


# ---------------------------------------------------------------------------
# 2D — Learning Outcomes
# ---------------------------------------------------------------------------

class LearningOutcome(Base):
    __tablename__ = "learning_outcomes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    org_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    title: Mapped[str] = mapped_column(String(300))
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    mastery_points: Mapped[int] = mapped_column(Integer, default=70)
    display_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    alignments: Mapped[List["CourseOutcomeAlignment"]] = relationship(
        back_populates="outcome", cascade="all, delete-orphan"
    )

    __table_args__ = (Index("ix_learning_outcomes_org", "org_id"),)


class CourseOutcomeAlignment(Base):
    __tablename__ = "course_outcome_alignments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    course_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("training_courses.id", ondelete="CASCADE"), index=True
    )
    outcome_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("learning_outcomes.id", ondelete="CASCADE"), index=True
    )
    module_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("course_modules.id", ondelete="SET NULL"), nullable=True
    )

    outcome: Mapped["LearningOutcome"] = relationship(back_populates="alignments")

    __table_args__ = (
        UniqueConstraint("course_id", "outcome_id", "module_id", name="uq_course_outcome_module"),
    )


class OutcomeMastery(Base):
    __tablename__ = "outcome_masteries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    member_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("public_members.id", ondelete="CASCADE"), index=True
    )
    outcome_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("learning_outcomes.id", ondelete="CASCADE"), index=True
    )
    score: Mapped[int] = mapped_column(Integer, default=0)
    mastered_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    # course | assignment | quiz
    evidence_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    evidence_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    __table_args__ = (
        UniqueConstraint("member_id", "outcome_id", name="uq_member_outcome"),
    )


# ---------------------------------------------------------------------------
# 2E — Course Groups
# ---------------------------------------------------------------------------

class CourseGroup(Base):
    __tablename__ = "course_groups"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    course_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("training_courses.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(200))
    max_members: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    created_by_user_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    members: Mapped[List["CourseGroupMember"]] = relationship(
        back_populates="group", cascade="all, delete-orphan"
    )

    __table_args__ = (Index("ix_course_groups_course", "course_id"),)


class CourseGroupMember(Base):
    __tablename__ = "course_group_members"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    group_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("course_groups.id", ondelete="CASCADE"), index=True
    )
    member_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("public_members.id", ondelete="CASCADE"), index=True
    )
    joined_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    group: Mapped["CourseGroup"] = relationship(back_populates="members")

    __table_args__ = (
        UniqueConstraint("group_id", "member_id", name="uq_group_member"),
    )


# ---------------------------------------------------------------------------
# 2G — Badges
# ---------------------------------------------------------------------------

class Badge(Base):
    __tablename__ = "badges"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    org_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(200))
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    image_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    criteria_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    # course_completed | journey_completed | manual | automation
    trigger_type: Mapped[str] = mapped_column(String(50), default="manual")
    trigger_ref_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    awards: Mapped[List["BadgeAward"]] = relationship(
        back_populates="badge", cascade="all, delete-orphan"
    )

    __table_args__ = (Index("ix_badges_org", "org_id"),)


class BadgeAward(Base):
    __tablename__ = "badge_awards"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    badge_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("badges.id", ondelete="CASCADE"), index=True
    )
    member_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("public_members.id", ondelete="CASCADE"), index=True
    )
    issued_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    evidence_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    issued_by_user_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    badge: Mapped["Badge"] = relationship(back_populates="awards")

    __table_args__ = (
        UniqueConstraint("badge_id", "member_id", name="uq_badge_award"),
        Index("ix_badge_awards_member", "member_id"),
    )


# ---------------------------------------------------------------------------
# 2H — Calendar + Syllabus
# ---------------------------------------------------------------------------

class CourseCalendarEvent(Base):
    __tablename__ = "course_calendar_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    course_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("training_courses.id", ondelete="CASCADE"), index=True
    )
    title: Mapped[str] = mapped_column(String(300))
    # due_date | lecture | exam | office_hours | other
    event_type: Mapped[str] = mapped_column(String(50), default="other")
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    ends_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    module_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("course_modules.id", ondelete="SET NULL"), nullable=True
    )
    conference_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (Index("ix_course_calendar_course", "course_id"),)


class CourseSyllabus(Base):
    __tablename__ = "course_syllabuses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    course_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("training_courses.id", ondelete="CASCADE"), unique=True
    )
    content_html: Mapped[str] = mapped_column(Text, default="")
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


# ---------------------------------------------------------------------------
# 3A — Events ↔ LMS Bridge
# ---------------------------------------------------------------------------

# ---------------------------------------------------------------------------
# 2I - Attendance
# ---------------------------------------------------------------------------

class CourseAttendanceSession(Base):
    __tablename__ = "course_attendance_sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    course_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("training_courses.id", ondelete="CASCADE"), index=True
    )
    title: Mapped[str] = mapped_column(String(300))
    session_type: Mapped[str] = mapped_column(String(50), default="lecture")
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    ends_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    location: Mapped[Optional[str]] = mapped_column(String(300), nullable=True)
    required: Mapped[bool] = mapped_column(Boolean, default=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_by_user_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    records: Mapped[List["CourseAttendanceRecord"]] = relationship(
        back_populates="session", cascade="all, delete-orphan"
    )

    __table_args__ = (Index("ix_attendance_sessions_course_start", "course_id", "starts_at"),)


class CourseAttendanceRecord(Base):
    __tablename__ = "course_attendance_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    session_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("course_attendance_sessions.id", ondelete="CASCADE"), index=True
    )
    enrollment_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("course_enrollments.id", ondelete="CASCADE"), index=True
    )
    member_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("public_members.id", ondelete="CASCADE"), index=True
    )
    status: Mapped[str] = mapped_column(String(32), default="present")
    minutes_attended: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    recorded_by_user_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    recorded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    session: Mapped["CourseAttendanceSession"] = relationship(back_populates="records")

    __table_args__ = (
        UniqueConstraint("session_id", "enrollment_id", name="uq_attendance_session_enrollment"),
        Index("ix_attendance_records_member", "member_id"),
    )


class EventLmsBridge(Base):
    __tablename__ = "event_lms_bridges"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    event_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("events.id", ondelete="CASCADE"), index=True
    )
    course_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("training_courses.id", ondelete="CASCADE"), nullable=True
    )
    # attendance | cert_issued | quiz_pass
    trigger_on: Mapped[str] = mapped_column(String(50), default="attendance")
    # enroll_in_course | unlock_module | award_badge
    action: Mapped[str] = mapped_column(String(50), default="enroll_in_course")
    action_ref_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (Index("ix_event_lms_bridges_event", "event_id"),)


# ---------------------------------------------------------------------------
# QUIZ SYSTEM
# ---------------------------------------------------------------------------

class LMSQuiz(Base):
    __tablename__ = "lms_quizzes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    course_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("training_courses.id", ondelete="CASCADE"), index=True
    )
    title: Mapped[str] = mapped_column(String(300))
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    time_limit_minutes: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    attempts_allowed: Mapped[int] = mapped_column(Integer, default=1)
    passing_score: Mapped[int] = mapped_column(Integer, default=60)
    shuffle_questions: Mapped[bool] = mapped_column(Boolean, default=False)
    show_correct_answers: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    questions: Mapped[List["LMSQuizQuestion"]] = relationship(
        back_populates="quiz", cascade="all, delete-orphan",
        order_by="LMSQuizQuestion.order"
    )
    attempts: Mapped[List["LMSQuizAttempt"]] = relationship(
        back_populates="quiz", cascade="all, delete-orphan"
    )

    __table_args__ = (Index("ix_lms_quizzes_course", "course_id"),)


class LMSQuizQuestion(Base):
    __tablename__ = "lms_quiz_questions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    quiz_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("lms_quizzes.id", ondelete="CASCADE"), index=True
    )
    question_text: Mapped[str] = mapped_column(Text)
    # multiple_choice | true_false | short_answer
    question_type: Mapped[str] = mapped_column(String(50), default="multiple_choice")
    points: Mapped[int] = mapped_column(Integer, default=1)
    order: Mapped[int] = mapped_column(Integer, default=0)
    explanation: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    quiz: Mapped["LMSQuiz"] = relationship(back_populates="questions")
    choices: Mapped[List["LMSQuizChoice"]] = relationship(
        back_populates="question", cascade="all, delete-orphan",
        order_by="LMSQuizChoice.order"
    )

    __table_args__ = (Index("ix_lms_quiz_questions_quiz", "quiz_id"),)


class LMSQuizChoice(Base):
    __tablename__ = "lms_quiz_choices"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    question_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("lms_quiz_questions.id", ondelete="CASCADE"), index=True
    )
    choice_text: Mapped[str] = mapped_column(String(1000))
    is_correct: Mapped[bool] = mapped_column(Boolean, default=False)
    order: Mapped[int] = mapped_column(Integer, default=0)

    question: Mapped["LMSQuizQuestion"] = relationship(back_populates="choices")

    __table_args__ = (Index("ix_lms_quiz_choices_question", "question_id"),)


class LMSQuizAttempt(Base):
    __tablename__ = "lms_quiz_attempts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    quiz_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("lms_quizzes.id", ondelete="CASCADE"), index=True
    )
    member_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("public_members.id", ondelete="CASCADE"), index=True
    )
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    submitted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    score: Mapped[Optional[Decimal]] = mapped_column(Numeric(6, 2), nullable=True)
    passed: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    attempt_number: Mapped[int] = mapped_column(Integer, default=1)

    quiz: Mapped["LMSQuiz"] = relationship(back_populates="attempts")
    answers: Mapped[List["LMSQuizAnswer"]] = relationship(
        back_populates="attempt", cascade="all, delete-orphan"
    )

    __table_args__ = (Index("ix_lms_quiz_attempts_quiz_member", "quiz_id", "member_id"),)


class LMSQuizAnswer(Base):
    __tablename__ = "lms_quiz_answers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    attempt_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("lms_quiz_attempts.id", ondelete="CASCADE"), index=True
    )
    question_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("lms_quiz_questions.id", ondelete="CASCADE"), index=True
    )
    selected_choice_ids: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    text_answer: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    attempt: Mapped["LMSQuizAttempt"] = relationship(back_populates="answers")

    __table_args__ = (
        UniqueConstraint("attempt_id", "question_id", name="uq_lms_quiz_answer_attempt_question"),
        Index("ix_lms_quiz_answers_attempt", "attempt_id"),
    )
