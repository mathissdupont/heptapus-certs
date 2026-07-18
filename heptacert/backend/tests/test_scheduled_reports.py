"""Regression test for the scheduled-report executor (was never wired)."""

import uuid
from datetime import datetime, timezone
from unittest.mock import AsyncMock, patch

import pytest

from src.main import SessionLocal, Role  # import first so the app package is fully initialized
from src.models import User, Organization, Event, Attendee
from src.report_scheduler_models import ScheduledReport
from src.report_runner import run_due_scheduled_reports

UTC = timezone.utc


@pytest.mark.asyncio
async def test_due_scheduled_report_runs_emails_and_advances():
    async with SessionLocal() as sess:
        async with sess.begin():
            owner = User(email=f"rep-owner-{uuid.uuid4().hex[:8]}@test.com", password_hash="x", role=Role.admin)
            sess.add(owner)
            await sess.flush()
            org = Organization(user_id=owner.id, public_id=f"rep-org-{uuid.uuid4().hex[:8]}", org_name="Rep Org")
            sess.add(org)
            event = Event(admin_id=owner.id, name="Rapor Etkinliği", template_image_url="t.png", config={})
            sess.add(event)
            await sess.flush()
            sess.add(Attendee(
                event_id=event.id, name="Katılımcı", email=f"att-{uuid.uuid4().hex[:8]}@test.com",
                source="self_register", registered_at=datetime(2026, 5, 30, tzinfo=UTC),
            ))
            report = ScheduledReport(
                organization_id=org.id, name="Haftalık Katılımcı Raporu", report_type="attendee_list",
                filters_json={}, frequency="weekly", recipients_json=["boss@test.com"],
                active=1, next_run_at=datetime(2020, 1, 1, tzinfo=UTC),  # long overdue
            )
            sess.add(report)
            await sess.flush()
            report_id = report.id

    with patch("src.report_runner.send_email_async", new=AsyncMock()) as mock_send:
        ran = await run_due_scheduled_reports(now=datetime(2026, 6, 1, tzinfo=UTC))

    assert ran >= 1
    assert mock_send.await_count >= 1  # the recipient was emailed

    async with SessionLocal() as sess:
        r = await sess.get(ScheduledReport, report_id)
        assert r.last_run_at is not None          # ran
        assert r.next_run_at is not None          # rescheduled (no longer overdue-stuck)


@pytest.mark.asyncio
async def test_inactive_report_is_not_run():
    async with SessionLocal() as sess:
        async with sess.begin():
            owner = User(email=f"rep-off-{uuid.uuid4().hex[:8]}@test.com", password_hash="x", role=Role.admin)
            sess.add(owner)
            await sess.flush()
            org = Organization(user_id=owner.id, public_id=f"rep-off-org-{uuid.uuid4().hex[:8]}", org_name="Off Org")
            sess.add(org)
            await sess.flush()
            report = ScheduledReport(
                organization_id=org.id, name="Kapalı", report_type="org_overview",
                filters_json={}, frequency="weekly", recipients_json=["x@test.com"],
                active=0, next_run_at=datetime(2020, 1, 1, tzinfo=UTC),
            )
            sess.add(report)
            await sess.flush()
            report_id = report.id

    with patch("src.report_runner.send_email_async", new=AsyncMock()) as mock_send:
        await run_due_scheduled_reports(now=datetime(2026, 6, 1, tzinfo=UTC))

    # inactive report must not be emailed
    async with SessionLocal() as sess:
        r = await sess.get(ScheduledReport, report_id)
        assert r.last_run_at is None
    assert all("Kapalı" not in str(c) for c in mock_send.call_args_list)
