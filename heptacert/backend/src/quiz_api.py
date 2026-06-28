"""Quiz / Exam engine API endpoints."""

import asyncio
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from .main import (
    Attendee,
    Certificate,
    CertStatus,
    CurrentPublicMember,
    CurrentUser,
    Event,
    Organization,
    Role,
    SessionLocal,
    Transaction,
    TxType,
    User,
    build_certificate_verify_url,
    build_public_pdf_url,
    compute_hosting_ends,
    editor_config_to_template_config,
    get_current_public_member,
    get_current_user,
    get_db,
    get_optional_public_member,
    hosting_units,
    local_path_from_url,
    new_certificate_uuid,
    require_role,
    settings,
    write_audit_log,
)
from .generator import render_certificate_pdf, render_certificate_png_watermarked
from .quiz_models import Quiz, QuizAnswer, QuizAttempt, QuizChoice, QuizQuestion

logger = logging.getLogger("heptacert.quiz")

router = APIRouter()

ISSUE_UNITS_PER_CERT = 10


# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------


class QuizChoiceIn(BaseModel):
    choice_text: str = Field(default="", max_length=500)
    is_correct: bool = False
    order: int = 0


class QuizQuestionIn(BaseModel):
    question_text: str = Field(default="", max_length=2000)
    question_type: str = Field(default="mcq", pattern="^(mcq|true_false|open_text)$")
    order: int = 0
    points: int = Field(default=1, ge=1, le=10)
    choices: list[QuizChoiceIn] = []


class QuizIn(BaseModel):
    title: str = Field(default="Sınav", max_length=200)
    description: Optional[str] = Field(default=None, max_length=2000)
    passing_score: int = Field(default=70, ge=1, le=100)
    max_attempts: int = Field(default=3, ge=1, le=10)
    time_limit_minutes: Optional[int] = Field(default=None, ge=1, le=300)
    required_for_cert: bool = True
    is_active: bool = True
    questions: list[QuizQuestionIn] = []


class QuizPatch(BaseModel):
    title: Optional[str] = Field(default=None, max_length=200)
    description: Optional[str] = Field(default=None, max_length=2000)
    passing_score: Optional[int] = Field(default=None, ge=1, le=100)
    max_attempts: Optional[int] = Field(default=None, ge=1, le=10)
    time_limit_minutes: Optional[int] = Field(default=None, ge=1, le=300)
    required_for_cert: Optional[bool] = None
    is_active: Optional[bool] = None


class QuizAnswerIn(BaseModel):
    question_id: int
    selected_choice_id: Optional[int] = None
    open_text_answer: Optional[str] = Field(default=None, max_length=5000)


class QuizSubmitIn(BaseModel):
    attempt_id: int
    answers: list[QuizAnswerIn]


class QuizStartIn(BaseModel):
    attendee_name: str = Field(min_length=2, max_length=200)
    attendee_email: Optional[str] = Field(default=None, max_length=320)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _quiz_to_dict(quiz: Quiz, include_correct: bool = False) -> dict[str, Any]:
    questions = []
    for q in quiz.questions:
        choices = [
            {
                "id": c.id,
                "choice_text": c.choice_text,
                "order": c.order,
                **({"is_correct": c.is_correct} if include_correct else {}),
            }
            for c in q.choices
        ]
        questions.append(
            {
                "id": q.id,
                "question_text": q.question_text,
                "question_type": q.question_type,
                "order": q.order,
                "points": q.points,
                "choices": choices,
            }
        )
    return {
        "id": quiz.id,
        "event_id": quiz.event_id,
        "title": quiz.title,
        "description": quiz.description,
        "passing_score": quiz.passing_score,
        "max_attempts": quiz.max_attempts,
        "time_limit_minutes": quiz.time_limit_minutes,
        "required_for_cert": quiz.required_for_cert,
        "is_active": quiz.is_active,
        "created_at": quiz.created_at.isoformat() if quiz.created_at else None,
        "questions": questions,
    }


def _attempt_to_dict(attempt: QuizAttempt) -> dict[str, Any]:
    return {
        "id": attempt.id,
        "quiz_id": attempt.quiz_id,
        "attendee_name": attempt.attendee_name,
        "attendee_email": attempt.attendee_email,
        "score": attempt.score,
        "passed": attempt.passed,
        "attempt_number": attempt.attempt_number,
        "cert_issued": attempt.cert_issued,
        "started_at": attempt.started_at.isoformat() if attempt.started_at else None,
        "completed_at": attempt.completed_at.isoformat() if attempt.completed_at else None,
    }


async def _get_event_for_admin(event_id: int, me: CurrentUser, db: AsyncSession) -> Event:
    res = await db.execute(select(Event).where(Event.id == event_id))
    ev = res.scalar_one_or_none()
    if not ev:
        raise HTTPException(status_code=404, detail="Etkinlik bulunamadı.")
    if me.role != Role.superadmin and ev.admin_id != me.id:
        raise HTTPException(status_code=403, detail="Bu etkinliğe erişim yetkiniz yok.")
    return ev


async def _get_quiz_for_event(event_id: int, db: AsyncSession) -> Quiz:
    res = await db.execute(
        select(Quiz)
        .where(Quiz.event_id == event_id)
        .options(
            selectinload(Quiz.questions).selectinload(QuizQuestion.choices)
        )
    )
    quiz = res.scalar_one_or_none()
    if not quiz:
        raise HTTPException(status_code=404, detail="Bu etkinlik için sınav bulunamadı.")
    return quiz


async def _issue_cert_background(event_id: int, student_name: str, attempt_id: int) -> None:
    """Issue a certificate after a quiz pass. Runs as a background task."""
    async with SessionLocal() as db:
        try:
            # Load event
            ev_res = await db.execute(select(Event).where(Event.id == event_id))
            ev = ev_res.scalar_one_or_none()
            if not ev:
                logger.warning("quiz cert: event %d not found", event_id)
                return

            # Load template
            try:
                template_path = local_path_from_url(ev.template_image_url)
                if not template_path.exists():
                    logger.warning("quiz cert: template missing for event %d", event_id)
                    return
                template_bytes = template_path.read_bytes()
            except Exception as exc:
                logger.warning("quiz cert: template read error: %s", exc)
                return

            # Load admin user for billing. Lock the row (user -> event order, matching
            # the event lock below) so the balance check + debit are atomic against
            # concurrent issuance and the balance cannot go negative / double-spend.
            user_res = await db.execute(select(User).where(User.id == ev.admin_id).with_for_update())
            user = user_res.scalar_one_or_none()
            if not user:
                return

            # Load org branding
            org_res = await db.execute(
                select(Organization).where(Organization.user_id == ev.admin_id).limit(1)
            )
            org = org_res.scalar_one_or_none()
            brand_logo_bytes: Optional[bytes] = None
            if org and org.brand_logo:
                try:
                    logo_path = local_path_from_url(org.brand_logo)
                    if logo_path.exists():
                        brand_logo_bytes = logo_path.read_bytes()
                except Exception:
                    pass
            certificate_footer: Optional[str] = None
            try:
                certificate_footer = (org.settings or {}).get("certificate_footer") if org else None
            except Exception:
                pass

            # Lock event row for cert_seq increment
            ev_lock_res = await db.execute(
                select(Event).where(Event.id == ev.id).with_for_update()
            )
            ev_locked = ev_lock_res.scalar_one()

            cert_uuid = new_certificate_uuid()
            ev_locked.cert_seq += 1
            public_id = f"EV{ev_locked.id}-{ev_locked.cert_seq:06d}"
            verify_url = build_certificate_verify_url(cert_uuid)

            # Resolve template config from event's editor config
            if not ev.config:
                logger.warning("quiz cert: event %d has no template config", event_id)
                return
            cfg = editor_config_to_template_config(ev.config)

            # Generate PDF
            pdf_bytes = await asyncio.to_thread(
                render_certificate_pdf,
                template_image_bytes=template_bytes,
                student_name=student_name,
                verify_url=verify_url,
                config=cfg,
                public_id=public_id,
                brand_logo_bytes=brand_logo_bytes,
                certificate_footer=certificate_footer,
            )

            rel_pdf_path = f"pdfs/event_{ev.id}/{cert_uuid}.pdf"
            abs_pdf_path = Path(settings.local_storage_dir) / rel_pdf_path
            abs_pdf_path.parent.mkdir(parents=True, exist_ok=True)
            abs_pdf_path.write_bytes(pdf_bytes)
            asset_size_bytes = abs_pdf_path.stat().st_size

            # Generate PNG watermark (best-effort)
            rel_png_path: Optional[str] = None
            try:
                png_bytes = await asyncio.to_thread(
                    render_certificate_png_watermarked,
                    template_image_bytes=template_bytes,
                    student_name=student_name,
                    verify_url=verify_url,
                    config=cfg,
                    public_id=public_id,
                    brand_logo_bytes=brand_logo_bytes,
                    certificate_footer=certificate_footer,
                )
                rel_png_path = f"pngs/event_{ev.id}/{cert_uuid}.png"
                abs_png_path = Path(settings.local_storage_dir) / rel_png_path
                abs_png_path.parent.mkdir(parents=True, exist_ok=True)
                abs_png_path.write_bytes(png_bytes)
            except Exception:
                pass

            # Billing
            term = "yearly"
            spend_units = ISSUE_UNITS_PER_CERT + hosting_units(term, asset_size_bytes)
            if user.heptacoin_balaonce < spend_units:
                logger.warning(
                    "quiz cert: insufficient HeptaCoin for event %d (need %d, have %d)",
                    event_id, spend_units, user.heptacoin_balaonce,
                )
                return

            pdf_url = build_public_pdf_url(rel_pdf_path)
            # Link to the attendee when the name resolves to a single attendee in this
            # event (collisions stay unlinked and fall back to name matching).
            att_match = await db.execute(
                select(Attendee.id)
                .where(Attendee.event_id == ev.id, Attendee.name == student_name)
                .limit(2)
            )
            att_ids = [r[0] for r in att_match.all()]
            matched_attendee_id = att_ids[0] if len(att_ids) == 1 else None
            cert = Certificate(
                uuid=cert_uuid,
                public_id=public_id,
                student_name=student_name,
                attendee_id=matched_attendee_id,
                event_id=ev.id,
                pdf_url=pdf_url,
                status=CertStatus.active,
                hosting_term=term,
                hosting_ends_at=compute_hosting_ends(term),
                asset_size_bytes=asset_size_bytes,
            )
            db.add(cert)
            user.heptacoin_balaonce -= spend_units
            db.add(Transaction(user_id=user.id, amount=spend_units, type=TxType.spend))

            # Mark attempt as cert_issued
            attempt_res = await db.execute(
                select(QuizAttempt).where(QuizAttempt.id == attempt_id)
            )
            attempt = attempt_res.scalar_one_or_none()
            if attempt:
                attempt.cert_issued = True
                await db.flush()
                try:
                    from .main import _maybe_log_cpd
                    await _maybe_log_cpd(db, event_id, cert.id, attendee_email=attempt.attendee_email)
                except Exception:
                    pass

            await db.commit()
            logger.info(
                "quiz cert issued: event=%d student=%r cert_uuid=%s",
                event_id, student_name, cert_uuid,
            )
        except Exception as exc:
            logger.error("quiz cert background error: %s", exc, exc_info=True)
            await db.rollback()


# ---------------------------------------------------------------------------
# Admin endpoints
# ---------------------------------------------------------------------------


@router.post(
    "/api/admin/events/{event_id}/quiz",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def create_or_replace_quiz(
    event_id: int,
    payload: QuizIn,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create (or fully replace) the quiz for an event."""
    ev = await _get_event_for_admin(event_id, me, db)

    # Delete existing quiz if any
    existing = await db.execute(select(Quiz).where(Quiz.event_id == ev.id))
    old = existing.scalar_one_or_none()
    if old:
        await db.delete(old)
        await db.flush()

    quiz = Quiz(
        event_id=ev.id,
        title=payload.title.strip() or "Sınav",
        description=payload.description,
        passing_score=payload.passing_score,
        max_attempts=payload.max_attempts,
        time_limit_minutes=payload.time_limit_minutes,
        required_for_cert=payload.required_for_cert,
        is_active=payload.is_active,
    )
    db.add(quiz)
    await db.flush()

    valid_questions = [q for q in payload.questions if q.question_text.strip()]
    for q_in in valid_questions:
        q = QuizQuestion(
            quiz_id=quiz.id,
            question_text=q_in.question_text.strip(),
            question_type=q_in.question_type,
            order=q_in.order,
            points=q_in.points,
        )
        db.add(q)
        await db.flush()
        for c_in in (c for c in q_in.choices if c.choice_text.strip()):
            db.add(
                QuizChoice(
                    question_id=q.id,
                    choice_text=c_in.choice_text.strip(),
                    is_correct=c_in.is_correct,
                    order=c_in.order,
                )
            )

    await db.commit()

    # Reload with relationships
    quiz_res = await db.execute(
        select(Quiz)
        .where(Quiz.id == quiz.id)
        .options(selectinload(Quiz.questions).selectinload(QuizQuestion.choices))
    )
    quiz = quiz_res.scalar_one()
    return _quiz_to_dict(quiz, include_correct=True)


@router.patch(
    "/api/admin/events/{event_id}/quiz",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def patch_quiz(
    event_id: int,
    payload: QuizPatch,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_event_for_admin(event_id, me, db)
    quiz = await _get_quiz_for_event(event_id, db)

    for field, val in payload.model_dump(exclude_none=True).items():
        setattr(quiz, field, val)

    await db.commit()
    return _quiz_to_dict(quiz, include_correct=True)


@router.delete(
    "/api/admin/events/{event_id}/quiz",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def delete_quiz(
    event_id: int,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_event_for_admin(event_id, me, db)
    quiz = await _get_quiz_for_event(event_id, db)
    await db.delete(quiz)
    await db.commit()
    return {"ok": True}


@router.get(
    "/api/admin/events/{event_id}/quiz",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def get_quiz_admin(
    event_id: int,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_event_for_admin(event_id, me, db)
    quiz = await _get_quiz_for_event(event_id, db)
    return _quiz_to_dict(quiz, include_correct=True)


@router.get(
    "/api/admin/events/{event_id}/quiz/results",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def get_quiz_results(
    event_id: int,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_event_for_admin(event_id, me, db)
    quiz_res = await db.execute(select(Quiz).where(Quiz.event_id == event_id))
    quiz = quiz_res.scalar_one_or_none()
    if not quiz:
        return {"attempts": [], "summary": {"total": 0, "passed": 0, "pass_rate": 0}}

    attempts_res = await db.execute(
        select(QuizAttempt)
        .where(QuizAttempt.quiz_id == quiz.id)
        .order_by(QuizAttempt.started_at.desc())
    )
    attempts = attempts_res.scalars().all()

    total = len(attempts)
    passed = sum(1 for a in attempts if a.passed)
    return {
        "attempts": [_attempt_to_dict(a) for a in attempts],
        "summary": {
            "total": total,
            "passed": passed,
            "pass_rate": round(passed / total * 100) if total else 0,
        },
    }


@router.post(
    "/api/admin/events/{event_id}/quiz/attempts/{attempt_id}/issue-cert",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def manually_issue_cert_for_attempt(
    event_id: int,
    attempt_id: int,
    background_tasks: BackgroundTasks,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Manually trigger certificate issuance for a passed attempt."""
    await _get_event_for_admin(event_id, me, db)

    quiz_res = await db.execute(select(Quiz).where(Quiz.event_id == event_id))
    quiz = quiz_res.scalar_one_or_none()
    if not quiz:
        raise HTTPException(status_code=404, detail="Sınav bulunamadı.")

    attempt_res = await db.execute(
        select(QuizAttempt).where(
            QuizAttempt.id == attempt_id, QuizAttempt.quiz_id == quiz.id
        )
    )
    attempt = attempt_res.scalar_one_or_none()
    if not attempt:
        raise HTTPException(status_code=404, detail="Deneme bulunamadı.")
    if not attempt.passed:
        raise HTTPException(status_code=400, detail="Bu deneme başarısız, sertifika verilemez.")
    if attempt.cert_issued:
        return {"ok": True, "message": "Sertifika daha önce verilmiş."}

    background_tasks.add_task(
        _issue_cert_background, event_id, attempt.attendee_name, attempt.id
    )
    return {"ok": True, "message": "Sertifika arka planda oluşturuluyor."}


# ---------------------------------------------------------------------------
# Public / member endpoints
# ---------------------------------------------------------------------------


@router.get("/api/public/events/{event_id}/quiz")
async def get_quiz_public(
    event_id: int,
    db: AsyncSession = Depends(get_db),
    member: Optional[CurrentPublicMember] = Depends(get_optional_public_member),
):
    """Return quiz metadata + questions (without correct answers) for attendees."""
    ev_res = await db.execute(select(Event).where(Event.id == event_id))
    ev = ev_res.scalar_one_or_none()
    if not ev:
        raise HTTPException(status_code=404, detail="Etkinlik bulunamadı.")

    res = await db.execute(
        select(Quiz)
        .where(Quiz.event_id == event_id, Quiz.is_active == True)
        .options(selectinload(Quiz.questions).selectinload(QuizQuestion.choices))
    )
    quiz = res.scalar_one_or_none()
    if not quiz:
        raise HTTPException(status_code=404, detail="Bu etkinlik için aktif sınav bulunamadı.")

    result = _quiz_to_dict(quiz, include_correct=False)

    # Attach member's attempt history if logged in
    if member:
        att_res = await db.execute(
            select(QuizAttempt)
            .where(QuizAttempt.quiz_id == quiz.id, QuizAttempt.member_id == member.id)
            .order_by(QuizAttempt.attempt_number.desc())
            .limit(1)
        )
        last_attempt = att_res.scalar_one_or_none()
        result["my_last_attempt"] = _attempt_to_dict(last_attempt) if last_attempt else None

        count_res = await db.execute(
            select(func.count(QuizAttempt.id)).where(
                QuizAttempt.quiz_id == quiz.id, QuizAttempt.member_id == member.id
            )
        )
        result["my_attempt_count"] = count_res.scalar_one()
    else:
        result["my_last_attempt"] = None
        result["my_attempt_count"] = 0

    return result


@router.post("/api/public/events/{event_id}/quiz/start")
async def start_quiz_attempt(
    event_id: int,
    payload: QuizStartIn,
    db: AsyncSession = Depends(get_db),
    member: Optional[CurrentPublicMember] = Depends(get_optional_public_member),
):
    """Start a new quiz attempt. Returns attempt_id for submission."""
    ev_res = await db.execute(select(Event).where(Event.id == event_id))
    ev = ev_res.scalar_one_or_none()
    if not ev:
        raise HTTPException(status_code=404, detail="Etkinlik bulunamadı.")

    quiz_res = await db.execute(
        select(Quiz).where(Quiz.event_id == event_id, Quiz.is_active == True)
    )
    quiz = quiz_res.scalar_one_or_none()
    if not quiz:
        raise HTTPException(status_code=404, detail="Aktif sınav bulunamadı.")

    # Count existing attempts
    if member:
        count_res = await db.execute(
            select(func.count(QuizAttempt.id)).where(
                QuizAttempt.quiz_id == quiz.id, QuizAttempt.member_id == member.id
            )
        )
    else:
        count_res = await db.execute(
            select(func.count(QuizAttempt.id)).where(
                QuizAttempt.quiz_id == quiz.id,
                QuizAttempt.attendee_email == payload.attendee_email,
            )
        )
    attempt_count = count_res.scalar_one()

    if attempt_count >= quiz.max_attempts:
        raise HTTPException(
            status_code=400,
            detail=f"Maksimum deneme sayısına ({quiz.max_attempts}) ulaşıldı.",
        )

    attempt = QuizAttempt(
        quiz_id=quiz.id,
        member_id=member.id if member else None,
        attendee_name=payload.attendee_name,
        attendee_email=payload.attendee_email if not member else member.email,
        attempt_number=attempt_count + 1,
    )
    db.add(attempt)
    await db.commit()
    await db.refresh(attempt)
    return {"attempt_id": attempt.id, "attempt_number": attempt.attempt_number}


@router.post("/api/public/events/{event_id}/quiz/submit")
async def submit_quiz_attempt(
    event_id: int,
    payload: QuizSubmitIn,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    member: Optional[CurrentPublicMember] = Depends(get_optional_public_member),
):
    """Submit answers for an attempt. Auto-scores MCQ and true_false questions."""
    # Validate attempt belongs to this quiz
    quiz_res = await db.execute(
        select(Quiz)
        .where(Quiz.event_id == event_id, Quiz.is_active == True)
        .options(selectinload(Quiz.questions).selectinload(QuizQuestion.choices))
    )
    quiz = quiz_res.scalar_one_or_none()
    if not quiz:
        raise HTTPException(status_code=404, detail="Aktif sınav bulunamadı.")

    attempt_res = await db.execute(
        select(QuizAttempt).where(
            QuizAttempt.id == payload.attempt_id,
            QuizAttempt.quiz_id == quiz.id,
        )
    )
    attempt = attempt_res.scalar_one_or_none()
    if not attempt:
        raise HTTPException(status_code=404, detail="Deneme bulunamadı.")
    if attempt.completed_at is not None:
        raise HTTPException(status_code=400, detail="Bu deneme zaten tamamlandı.")

    # Verify ownership
    if member and attempt.member_id != member.id:
        raise HTTPException(status_code=403, detail="Bu deneme size ait değil.")

    # Build question map
    q_map = {q.id: q for q in quiz.questions}
    choice_map: dict[int, QuizChoice] = {}
    for q in quiz.questions:
        for c in q.choices:
            choice_map[c.id] = c

    # Score
    total_points = sum(q.points for q in quiz.questions if q.question_type != "open_text")
    earned_points = 0

    for ans_in in payload.answers:
        q = q_map.get(ans_in.question_id)
        if not q:
            continue

        answer = QuizAnswer(
            attempt_id=attempt.id,
            question_id=q.id,
            selected_choice_id=ans_in.selected_choice_id,
            open_text_answer=ans_in.open_text_answer,
        )
        db.add(answer)

        if q.question_type in ("mcq", "true_false") and ans_in.selected_choice_id:
            choice = choice_map.get(ans_in.selected_choice_id)
            if choice and choice.is_correct:
                earned_points += q.points

    score_pct = round(earned_points / total_points * 100) if total_points else 0
    passed = score_pct >= quiz.passing_score

    attempt.score = score_pct
    attempt.passed = passed
    attempt.completed_at = datetime.now(timezone.utc)

    await db.commit()

    # Auto-issue cert if passed and quiz is required_for_cert
    if passed and quiz.required_for_cert and not attempt.cert_issued:
        background_tasks.add_task(
            _issue_cert_background, event_id, attempt.attendee_name, attempt.id
        )

    return {
        "attempt_id": attempt.id,
        "score": score_pct,
        "passed": passed,
        "passing_score": quiz.passing_score,
        "cert_will_be_issued": passed and quiz.required_for_cert and not attempt.cert_issued,
    }


@router.get("/api/public/events/{event_id}/quiz/my-result")
async def get_my_quiz_result(
    event_id: int,
    db: AsyncSession = Depends(get_db),
    member: CurrentPublicMember = Depends(get_current_public_member),
):
    quiz_res = await db.execute(select(Quiz).where(Quiz.event_id == event_id))
    quiz = quiz_res.scalar_one_or_none()
    if not quiz:
        raise HTTPException(status_code=404, detail="Sınav bulunamadı.")

    att_res = await db.execute(
        select(QuizAttempt)
        .where(QuizAttempt.quiz_id == quiz.id, QuizAttempt.member_id == member.id)
        .order_by(QuizAttempt.attempt_number.desc())
    )
    attempts = att_res.scalars().all()
    return {
        "attempts": [_attempt_to_dict(a) for a in attempts],
        "best_score": max((a.score for a in attempts), default=None),
        "any_passed": any(a.passed for a in attempts),
    }
