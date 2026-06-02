"""Superadmin QA seed endpoint for enterprise feature smoke testing."""

from __future__ import annotations

from datetime import datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .main import (
    CheckinActivityLog,
    Event,
    EventAutomationRule,
    EventSavedAudienceSegment,
    EventSession,
    Organization,
    ParticipantCrmProfile,
    Role,
    TrainingAssignment,
    User,
    get_current_user,
    get_db,
    require_role,
)

router = APIRouter()


@router.post("/api/superadmin/qa-seed", dependencies=[Depends(require_role(Role.superadmin))])
async def seed_qa_data(me: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    event = (await db.execute(select(Event).where(Event.name == "QA Phase 16 Demo Event", Event.admin_id == me.id))).scalar_one_or_none()
    if not event:
        event = Event(
            admin_id=me.id,
            name="QA Phase 16 Demo Event",
            event_description="Seed event for CRM, automation, segmentation, training, and check-in QA.",
            event_date=(datetime.utcnow() + timedelta(days=14)).date(),
            event_location="Istanbul",
            event_type="training",
            template_image_url="https://placehold.co/1600x1100/png",
            config={},
            certificate_enabled=True,
            checkin_enabled=True,
            registration_enabled=True,
        )
        db.add(event)
        await db.flush()

    session = (await db.execute(select(EventSession).where(EventSession.event_id == event.id, EventSession.name == "QA Main Hall"))).scalar_one_or_none()
    if not session:
        session = EventSession(event_id=event.id, name="QA Main Hall", capacity=120, capacity_alert_threshold=85, is_active=True)
        db.add(session)

    org = (await db.execute(select(Organization).where(Organization.user_id == me.id))).scalar_one_or_none()
    if not org:
        org = Organization(user_id=me.id, public_id=f"qa-org-{me.id}", org_name="QA Demo Organization", brand_color="#2563eb", settings={})
        db.add(org)
        await db.flush()

    if not (await db.execute(select(EventAutomationRule.id).where(EventAutomationRule.event_id == event.id))).scalar_one_or_none():
        db.add(EventAutomationRule(id=f"qa-rule-{event.id}", event_id=event.id, name="QA Thank You Flow", trigger="attended_event", trigger_config={}, enabled=False, actions=[{"type": "send_email"}]))

    if not (await db.execute(select(EventSavedAudienceSegment.id).where(EventSavedAudienceSegment.event_id == event.id))).scalar_one_or_none():
        db.add(EventSavedAudienceSegment(event_id=event.id, name="QA VIP Segment", segment_key="vip", filters={"ticket_type": "vip"}, created_by=me.id, visibility="team"))

    if not (await db.execute(select(ParticipantCrmProfile.id).where(ParticipantCrmProfile.organization_id == org.id, ParticipantCrmProfile.email == "qa-participant@example.com"))).scalar_one_or_none():
        db.add(ParticipantCrmProfile(organization_id=org.id, email="qa-participant@example.com", notes="QA seed CRM profile", tags=["qa", "vip"], lifecycle_status="lead", owner_user_id=me.id, lead_score=75))

    if not (await db.execute(select(TrainingAssignment.id).where(TrainingAssignment.organization_id == org.id, TrainingAssignment.title == "QA Compliance Assignment"))).scalar_one_or_none():
        db.add(TrainingAssignment(organization_id=org.id, event_id=event.id, title="QA Compliance Assignment", assignee_name="QA Participant", assignee_email="qa-participant@example.com", department="QA", manager_email="qa-manager@example.com", due_at=datetime.utcnow() + timedelta(days=30), created_by=me.id))

    if not (await db.execute(select(CheckinActivityLog.id).where(CheckinActivityLog.event_id == event.id))).scalar_one_or_none():
        db.add(CheckinActivityLog(event_id=event.id, session_id=session.id if session else None, method="manual", source="qa_seed", entry_point="admin", success=True, message="QA seed check-in"))

    await db.commit()
    return {"ok": True, "event_id": event.id}
