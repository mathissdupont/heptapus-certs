"""Org-wide analytics API endpoints."""

from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from .main import (
    Attendee,
    Certificate,
    CertStatus,
    CurrentUser,
    Event,
    Organization,
    ParticipantCrmProfile,
    PublicMember,
    Role,
    get_current_user,
    get_db,
    require_role,
)
from .organization_access_api import (
    get_organization_for_access,
    organization_id_from_request,
)
from .learning_path_models import LearningPath, LearningPathEnrollment, LearningPathStep, LearningPathStepCompletion
from .crm_accounts_models import CrmDeal

router = APIRouter()


async def _admin_org(db: AsyncSession, me: CurrentUser, request: Request) -> Organization:
    return await get_organization_for_access(
        db, me, "organization:view", organization_id_from_request(request)
    )


def _days_ago(n: int) -> datetime:
    return datetime.now(timezone.utc) - timedelta(days=n)


# ── Overview ──────────────────────────────────────────────────────────────────

@router.get(
    "/api/admin/analytics/org/overview",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def org_overview(
    request: Request,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    days: int = Query(default=30, ge=1, le=365),
):
    org = await _admin_org(db, me, request)
    since = _days_ago(days)

    # Events are linked to org via Event.admin_id == org.user_id
    event_count_res = await db.execute(
        select(func.count(Event.id)).where(Event.admin_id == org.user_id)
    )
    event_count = int(event_count_res.scalar_one() or 0)

    events_period_res = await db.execute(
        select(func.count(Event.id)).where(
            Event.admin_id == org.user_id,
            Event.created_at >= since,
        )
    )
    events_period = int(events_period_res.scalar_one() or 0)

    # Certificates issued for org events
    cert_total_res = await db.execute(
        select(func.count(Certificate.id))
        .join(Event, Certificate.event_id == Event.id)
        .where(Event.admin_id == org.user_id, Certificate.status == CertStatus.active)
    )
    cert_total = int(cert_total_res.scalar_one() or 0)

    cert_period_res = await db.execute(
        select(func.count(Certificate.id))
        .join(Event, Certificate.event_id == Event.id)
        .where(
            Event.admin_id == org.user_id,
            Certificate.status == CertStatus.active,
            Certificate.issued_at >= since,
        )
    )
    cert_period = int(cert_period_res.scalar_one() or 0)

    # Members: unique public members who attended org events
    org_event_ids_subq = select(Event.id).where(Event.admin_id == org.user_id).scalar_subquery()

    member_total_res = await db.execute(
        select(func.count(func.distinct(Attendee.public_member_id)))
        .where(
            Attendee.event_id.in_(org_event_ids_subq),
            Attendee.public_member_id.is_not(None),
        )
    )
    member_total = int(member_total_res.scalar_one() or 0)

    member_period_res = await db.execute(
        select(func.count(func.distinct(Attendee.public_member_id)))
        .where(
            Attendee.event_id.in_(org_event_ids_subq),
            Attendee.public_member_id.is_not(None),
            Attendee.registered_at >= since,
        )
    )
    member_period = int(member_period_res.scalar_one() or 0)

    # Attendees (registrations)
    attendee_total_res = await db.execute(
        select(func.count(Attendee.id))
        .join(Event, Attendee.event_id == Event.id)
        .where(Event.admin_id == org.user_id)
    )
    attendee_total = int(attendee_total_res.scalar_one() or 0)

    attendee_period_res = await db.execute(
        select(func.count(Attendee.id))
        .join(Event, Attendee.event_id == Event.id)
        .where(Event.admin_id == org.user_id, Attendee.registered_at >= since)
    )
    attendee_period = int(attendee_period_res.scalar_one() or 0)

    # CRM leads
    crm_total_res = await db.execute(
        select(func.count(ParticipantCrmProfile.id)).where(
            ParticipantCrmProfile.organization_id == org.id
        )
    )
    crm_total = int(crm_total_res.scalar_one() or 0)

    return {
        "period_days": days,
        "events": {"total": event_count, "period": events_period},
        "certificates": {"total": cert_total, "period": cert_period},
        "members": {"total": member_total, "period": member_period},
        "attendees": {"total": attendee_total, "period": attendee_period},
        "crm_contacts": {"total": crm_total},
    }


# ── Training Compliance ───────────────────────────────────────────────────────

@router.get(
    "/api/admin/analytics/org/training-compliance",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def training_compliance(
    request: Request,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await _admin_org(db, me, request)

    rows = (await db.execute(
        select(
            Event.id,
            Event.name,
            Event.event_date,
            func.count(Attendee.id).label("registered"),
            func.count(Certificate.id).label("certified"),
        )
        .join(Attendee, Attendee.event_id == Event.id, isouter=True)
        .join(
            Certificate,
            (Certificate.event_id == Event.id) & (Certificate.status == CertStatus.active),
            isouter=True,
        )
        .where(Event.admin_id == org.user_id)
        .group_by(Event.id, Event.name, Event.event_date)
        .order_by(Event.event_date.desc())
        .limit(20)
    )).all()

    events_compliance = []
    for row in rows:
        registered = row.registered or 0
        certified = row.certified or 0
        rate = round(certified / registered * 100, 1) if registered > 0 else 0
        events_compliance.append({
            "event_id": row.id,
            "event_name": row.name,
            "event_date": row.event_date.isoformat() if row.event_date else None,
            "registered": registered,
            "certified": certified,
            "completion_rate": rate,
        })

    total_registered = sum(e["registered"] for e in events_compliance)
    total_certified = sum(e["certified"] for e in events_compliance)
    overall_rate = round(total_certified / total_registered * 100, 1) if total_registered else 0

    return {
        "overall_completion_rate": overall_rate,
        "total_registered": total_registered,
        "total_certified": total_certified,
        "events": events_compliance,
    }


# ── Learning Paths Analytics ──────────────────────────────────────────────────

@router.get(
    "/api/admin/analytics/org/learning-paths",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def learning_paths_analytics(
    request: Request,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await _admin_org(db, me, request)

    paths = (await db.execute(
        select(LearningPath).where(LearningPath.org_id == org.id)
    )).scalars().all()

    result = []
    for path in paths:
        enroll_count = int(
            (await db.execute(
                select(func.count(LearningPathEnrollment.id))
                .where(LearningPathEnrollment.path_id == path.id)
            )).scalar_one() or 0
        )
        completed_count = int(
            (await db.execute(
                select(func.count(LearningPathEnrollment.id))
                .where(
                    LearningPathEnrollment.path_id == path.id,
                    LearningPathEnrollment.progress_pct == 100,
                )
            )).scalar_one() or 0
        )
        step_count = int(
            (await db.execute(
                select(func.count(LearningPathStep.id))
                .where(LearningPathStep.path_id == path.id)
            )).scalar_one() or 0
        )
        avg_progress = (await db.execute(
            select(func.avg(LearningPathEnrollment.progress_pct))
            .where(LearningPathEnrollment.path_id == path.id)
        )).scalar_one()

        result.append({
            "path_id": path.id,
            "path_name": path.name,
            "published": path.published,
            "step_count": step_count,
            "enrolled": enroll_count,
            "completed": completed_count,
            "completion_rate": round(completed_count / enroll_count * 100, 1) if enroll_count else 0,
            "avg_progress": round(float(avg_progress or 0), 1),
        })

    return {"paths": result}


# ── CRM Analytics ─────────────────────────────────────────────────────────────

@router.get(
    "/api/admin/analytics/org/crm",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def crm_analytics(
    request: Request,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await _admin_org(db, me, request)

    lifecycle_rows = (await db.execute(
        select(ParticipantCrmProfile.lifecycle_status, func.count(ParticipantCrmProfile.id))
        .where(ParticipantCrmProfile.organization_id == org.id)
        .group_by(ParticipantCrmProfile.lifecycle_status)
    )).all()
    lifecycle = {row[0]: row[1] for row in lifecycle_rows}

    deal_rows = (await db.execute(
        select(
            CrmDeal.stage,
            func.count(CrmDeal.id).label("count"),
            func.coalesce(func.sum(CrmDeal.amount), 0).label("value"),
        )
        .where(CrmDeal.organization_id == org.id)
        .group_by(CrmDeal.stage)
    )).all()
    pipeline = {}
    total_pipeline_value = 0.0
    won_value = 0.0
    for row in deal_rows:
        pipeline[row.stage] = {"count": row.count, "value": float(row.value)}
        total_pipeline_value += float(row.value)
        if row.stage == "won":
            won_value = float(row.value)

    total_contacts = int(
        (await db.execute(
            select(func.count(ParticipantCrmProfile.id))
            .where(ParticipantCrmProfile.organization_id == org.id)
        )).scalar_one() or 0
    )

    hot_leads = int(
        (await db.execute(
            select(func.count(ParticipantCrmProfile.id))
            .where(
                ParticipantCrmProfile.organization_id == org.id,
                ParticipantCrmProfile.lead_score >= 70,
            )
        )).scalar_one() or 0
    )

    return {
        "total_contacts": total_contacts,
        "hot_leads": hot_leads,
        "lifecycle_distribution": lifecycle,
        "pipeline_by_stage": pipeline,
        "total_pipeline_value": total_pipeline_value,
        "won_value": won_value,
        "win_rate": round(won_value / total_pipeline_value * 100, 1) if total_pipeline_value else 0,
    }


# ── Certificate Timeline ──────────────────────────────────────────────────────

@router.get(
    "/api/admin/analytics/org/cert-timeline",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def cert_timeline(
    request: Request,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    days: int = Query(default=90, ge=7, le=365),
):
    org = await _admin_org(db, me, request)
    since = _days_ago(days)

    rows = (await db.execute(
        select(
            func.date_trunc("day", Certificate.issued_at).label("day"),
            func.count(Certificate.id).label("count"),
        )
        .join(Event, Certificate.event_id == Event.id)
        .where(
            Event.admin_id == org.user_id,
            Certificate.status == CertStatus.active,
            Certificate.issued_at >= since,
        )
        .group_by("day")
        .order_by("day")
    )).all()

    return {
        "period_days": days,
        "timeline": [
            {"date": row.day.date().isoformat(), "count": row.count}
            for row in rows
        ],
    }
