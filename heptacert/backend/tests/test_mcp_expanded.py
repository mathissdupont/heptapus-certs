"""Communication tools: actual REST contracts, scopes and confirmation boundaries."""

import json
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from fastapi import HTTPException

from src import main, mcp_server
from src import email_api
from src.services import _required_scope_for_request


def context():
    return SimpleNamespace(request_context=SimpleNamespace(
        request=SimpleNamespace(headers={"authorization": "Bearer review-token"})))


@pytest.fixture
def allowed(monkeypatch):
    scope = AsyncMock()
    monkeypatch.setattr(mcp_server, "_require_scope", scope)
    monkeypatch.setattr(mcp_server, "_fire_and_forget_log", lambda *args, **kwargs: None)
    return scope


@pytest.mark.parametrize("method,path,scope", [
    ("GET", "/api/admin/events/7/email-templates", "automations:read"),
    ("POST", "/api/admin/events/7/email-templates", "automations:write"),
    ("PATCH", "/api/admin/events/7/email-templates/9", "automations:write"),
    ("DELETE", "/api/admin/events/7/email-templates/9", "automations:write"),
    ("POST", "/api/admin/events/7/email-templates/9/preview", "automations:read"),
    ("GET", "/api/system/email-templates", "automations:read"),
    ("POST", "/api/admin/events/7/bulk-email", "automations:write"),
    ("GET", "/api/admin/events/7/bulk-email/9", "automations:read"),
    ("GET", "/api/admin/events/7/bulk-emails", "automations:read"),
    ("POST", "/api/admin/events/7/bulk-emails-cancel/9", "automations:write"),
    ("GET", "/api/admin/events/7/bulk-email-jobs/9/delivery-stats", "automations:read"),
    ("GET", "/api/admin/events/7/bulk-email-jobs/9/delivery-logs", "automations:read"),
    ("GET", "/api/system/cert-templates", "certificates:read"),
    ("POST", "/api/admin/events/7/apply-cert-template", "certificates:write"),
    ("GET", "/api/admin/events/7/survey-config", "events:read"),
    ("POST", "/api/admin/events/7/survey-config", "events:write"),
])
def test_new_tools_match_rest_scope_classification(method, path, scope):
    assert _required_scope_for_request(method, path) == scope


@pytest.mark.asyncio
async def test_bulk_email_preview_uses_same_grant_and_never_sends(monkeypatch, allowed):
    read = AsyncMock(side_effect=[[{"id": 9, "subject_en": "Workshop"}], []])
    write = AsyncMock()
    monkeypatch.setattr(mcp_server, "_get", read)
    monkeypatch.setattr(mcp_server, "_post", write)
    result = await mcp_server.start_bulk_email(context(), 7, 9)
    assert result.structuredContent["requires_confirm"] is True
    assert result.structuredContent["recipient_count"] is None
    assert result.structuredContent["template"]["id"] == 9
    assert [call.args[0] for call in read.await_args_list] == [
        "/api/admin/events/7/email-templates", "/api/system/email-templates",
    ]
    allowed.assert_awaited_once_with("review-token", "automations:write")
    write.assert_not_awaited()


@pytest.mark.asyncio
async def test_bulk_email_confirm_queues_real_contract(monkeypatch, allowed):
    write = AsyncMock(return_value={"id": 12, "status": "pending"})
    monkeypatch.setattr(mcp_server, "_post", write)
    result = await mcp_server.start_bulk_email(context(), 7, 9, "certified", True)
    write.assert_awaited_once_with("/api/admin/events/7/bulk-email", "review-token",
                                  {"email_template_id": 9, "recipient_type": "certified"})
    assert result.structuredContent["job"]["id"] == 12


@pytest.mark.asyncio
async def test_certificate_design_change_requires_confirmation(monkeypatch, allowed):
    read = AsyncMock(side_effect=[{}, [{"id": 4, "name": "Review template"}]])
    write = AsyncMock()
    monkeypatch.setattr(mcp_server, "_get", read)
    monkeypatch.setattr(mcp_server, "_post", write)
    result = await mcp_server.apply_certificate_template(context(), 7, 4)
    assert result.structuredContent["requires_confirm"] is True
    write.assert_not_awaited()
    write.return_value = {"id": 7, "config": {"private": "not returned"}}
    result = await mcp_server.apply_certificate_template(context(), 7, 4, True)
    write.assert_awaited_once_with("/api/admin/events/7/apply-cert-template", "review-token",
                                  {"cert_template_id": 4})
    assert "config" not in json.dumps(result.structuredContent)


@pytest.mark.asyncio
async def test_survey_disable_and_webhook_key_redaction(monkeypatch, allowed):
    write = AsyncMock(return_value={"survey_type": "disabled", "external_webhook_key": "private"})
    monkeypatch.setattr(mcp_server, "_post", write)
    result = await mcp_server.configure_survey(context(), 7, survey_type="disabled", confirm=True)
    assert result.structuredContent["survey"]["external_webhook_key"] == "[REDACTED]"
    assert "private" not in result.content[-1].text
    assert write.await_args.args[2]["survey_type"] == "disabled"


@pytest.mark.asyncio
async def test_survey_change_previews_eligibility_effect_without_writing(monkeypatch, allowed):
    read = AsyncMock(return_value={"survey_type": "external", "external_webhook_key": "private"})
    write = AsyncMock()
    monkeypatch.setattr(mcp_server, "_get", read)
    monkeypatch.setattr(mcp_server, "_post", write)
    result = await mcp_server.configure_survey(context(), 7, survey_type="disabled")
    assert result.structuredContent["requires_confirm"] is True
    assert result.structuredContent["current_survey"]["external_webhook_key"] == "[REDACTED]"
    assert result.structuredContent["proposed_survey"]["survey_type"] == "disabled"
    write.assert_not_awaited()


@pytest.mark.asyncio
@pytest.mark.parametrize("kwargs", [
    {"survey_type": "builtin"},
    {"survey_type": "external"},
    {"survey_type": "external", "external_url": "http://example.com"},
])
async def test_invalid_survey_cannot_write(monkeypatch, allowed, kwargs):
    write = AsyncMock()
    monkeypatch.setattr(mcp_server, "_post", write)
    with pytest.raises(ValueError):
        await mcp_server.configure_survey(context(), 7, **kwargs)
    write.assert_not_awaited()


@pytest.mark.asyncio
async def test_delivery_logs_are_bounded_and_omit_smtp_internals(monkeypatch, allowed):
    read = AsyncMock(return_value={"total": 1, "logs": [
        {"id": 1, "status": "failed", "reason": "SMTP private detail",
         "attendee": {"name": "Review attendee"}},
    ]})
    monkeypatch.setattr(mcp_server, "_get", read)
    result = await mcp_server.get_bulk_email_delivery_logs(context(), 7, 12, page=2, limit=25, status="failed")
    assert read.await_args.kwargs["params"] == {"page": 2, "limit": 25, "status": "failed"}
    assert "SMTP" not in result.content[-1].text
    assert result.structuredContent["delivery_logs"]["logs"][0]["status"] == "failed"


@pytest.mark.asyncio
async def test_delivery_logs_reject_job_from_other_event_before_reading_pii(monkeypatch):
    monkeypatch.setattr(email_api, "_get_event_for_admin", AsyncMock())
    db = SimpleNamespace(execute=AsyncMock(
        return_value=SimpleNamespace(scalar_one_or_none=lambda: None)))
    with pytest.raises(HTTPException) as error:
        await email_api.get_delivery_logs(7, 999, status=None, page=1, limit=50,
                                         me=SimpleNamespace(id=1), db=db)
    assert error.value.status_code == 404
    assert db.execute.await_count == 1


@pytest.mark.asyncio
async def test_bulk_email_template_must_belong_to_event_or_be_shared_system_default(monkeypatch):
    monkeypatch.setattr(email_api, "_get_event_for_admin", AsyncMock())
    db = SimpleNamespace(execute=AsyncMock(
        return_value=SimpleNamespace(scalar_one_or_none=lambda: None)))
    payload = main.BulkEmailJobIn(email_template_id=99)
    with pytest.raises(HTTPException) as error:
        await email_api.start_bulk_email(7, payload, me=SimpleNamespace(id=1), db=db)
    assert error.value.status_code == 404
    stmt = db.execute.await_args.args[0]
    sql = str(stmt)
    assert "email_templates.event_id" in sql
    assert "email_templates.template_type" in sql
    assert "email_templates.is_default" in sql
    assert 7 in stmt.compile().params.values()
