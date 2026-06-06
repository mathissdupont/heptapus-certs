"""Quiz / Exam engine models — decoupled from main.py."""

from datetime import datetime
from typing import List, Optional

from sqlalchemy import (
    Boolean, DateTime, ForeignKey, Index, Integer, String, Text, func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .main import Base


class Quiz(Base):
    __tablename__ = "quizzes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    event_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("events.id", ondelete="CASCADE"), unique=True, index=True
    )
    title: Mapped[str] = mapped_column(String(200), default="Sınav")
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    # 0-100 percentage required to pass
    passing_score: Mapped[int] = mapped_column(Integer, default=70)
    max_attempts: Mapped[int] = mapped_column(Integer, default=3)
    time_limit_minutes: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    # If True, passing this quiz is required to receive the event certificate
    required_for_cert: Mapped[bool] = mapped_column(Boolean, default=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    questions: Mapped[List["QuizQuestion"]] = relationship(
        back_populates="quiz",
        cascade="all, delete-orphan",
        order_by="QuizQuestion.order",
    )
    attempts: Mapped[List["QuizAttempt"]] = relationship(
        back_populates="quiz", cascade="all, delete-orphan"
    )


class QuizQuestion(Base):
    __tablename__ = "quiz_questions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    quiz_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("quizzes.id", ondelete="CASCADE"), index=True
    )
    question_text: Mapped[str] = mapped_column(Text)
    # mcq = multiple choice, true_false, open_text (manually graded)
    question_type: Mapped[str] = mapped_column(String(20), default="mcq")
    order: Mapped[int] = mapped_column(Integer, default=0)
    points: Mapped[int] = mapped_column(Integer, default=1)

    quiz: Mapped["Quiz"] = relationship(back_populates="questions")
    choices: Mapped[List["QuizChoice"]] = relationship(
        back_populates="question",
        cascade="all, delete-orphan",
        order_by="QuizChoice.order",
    )
    answers: Mapped[List["QuizAnswer"]] = relationship(
        back_populates="question", cascade="all, delete-orphan"
    )

    __table_args__ = (Index("ix_quiz_questions_quiz_order", "quiz_id", "order"),)


class QuizChoice(Base):
    __tablename__ = "quiz_choices"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    question_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("quiz_questions.id", ondelete="CASCADE"), index=True
    )
    choice_text: Mapped[str] = mapped_column(Text)
    is_correct: Mapped[bool] = mapped_column(Boolean, default=False)
    order: Mapped[int] = mapped_column(Integer, default=0)

    question: Mapped["QuizQuestion"] = relationship(back_populates="choices")


class QuizAttempt(Base):
    __tablename__ = "quiz_attempts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    quiz_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("quizzes.id", ondelete="CASCADE"), index=True
    )
    # Either a logged-in public member or an anonymous attendee (email only)
    member_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("public_members.id", ondelete="SET NULL"), nullable=True, index=True
    )
    attendee_name: Mapped[str] = mapped_column(String(200))
    attendee_email: Mapped[Optional[str]] = mapped_column(
        String(320), nullable=True, index=True
    )
    score: Mapped[int] = mapped_column(Integer, default=0)  # percentage 0-100
    passed: Mapped[bool] = mapped_column(Boolean, default=False)
    attempt_number: Mapped[int] = mapped_column(Integer, default=1)
    cert_issued: Mapped[bool] = mapped_column(Boolean, default=False)
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    completed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    quiz: Mapped["Quiz"] = relationship(back_populates="attempts")
    answers: Mapped[List["QuizAnswer"]] = relationship(
        back_populates="attempt", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("ix_quiz_attempts_quiz_member", "quiz_id", "member_id"),
        Index("ix_quiz_attempts_quiz_email", "quiz_id", "attendee_email"),
    )


class QuizAnswer(Base):
    __tablename__ = "quiz_answers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    attempt_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("quiz_attempts.id", ondelete="CASCADE"), index=True
    )
    question_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("quiz_questions.id", ondelete="CASCADE"), index=True
    )
    selected_choice_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("quiz_choices.id", ondelete="SET NULL"), nullable=True
    )
    open_text_answer: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    attempt: Mapped["QuizAttempt"] = relationship(back_populates="answers")
    question: Mapped["QuizQuestion"] = relationship(back_populates="answers")
