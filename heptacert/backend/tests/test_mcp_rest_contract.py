"""Every MCP write tool must send what its REST endpoint actually accepts.

The MCP server calls the REST API over HTTP, so a renamed or missing field only shows
up as a 422 (or is silently dropped by pydantic) in production. These tests run each
write tool against a stubbed transport and validate every captured body against the
body model of the real FastAPI route.
"""

import re
from types import SimpleNamespace

import pytest
from fastapi.routing import APIRoute
from pydantic import BaseModel

from src import main, mcp_server

RULE = {"id": "3f9a0c", "name": "Thank attendees", "trigger": "attended_event", "trigger_config": {},
        "enabled": True, "actions": [{"type": "send_email", "email_template_id": 4, "label": "Send email"}]}

# Representative arguments for every write tool; partial updates are listed separately.
CALLS = {
    "create_event": {"name": "Workshop", "event_date": "2025-09-15", "event_location": "Hall A"},
    "update_event": {"event_id": 7, "event_location": "Hall B"},
    "delete_event": {"event_id": 7, "confirm": True},
    "close_registration": {"event_id": 7},
    "open_registration": {"event_id": 7},
    "add_attendee": {"event_id": 7, "first_name": "Ada", "last_name": "Lovelace", "email": "ada@example.com"},
    "bulk_add_attendees": {"event_id": 7, "attendees": [{"name": "Ada Lovelace", "email": "ada@example.com"}]},
    "update_attendee": {"event_id": 7, "attendee_id": 9, "email": "ada@example.org"},
    "remove_attendee": {"event_id": 7, "attendee_id": 9, "confirm": True},
    "create_session": {"event_id": 7, "title": "Keynote", "start_time": "2025-09-15T09:00:00"},
    "update_session": {"event_id": 7, "session_id": 5, "location": "Hall B"},
    "delete_session": {"event_id": 7, "session_id": 5, "confirm": True},
    "manual_checkin": {"event_id": 7, "session_id": 5, "attendee_email": "ada@example.com"},
    "issue_certificates": {"event_id": 7, "confirm": True},
    "revoke_certificate": {"cert_id": 3, "confirm": True},
    "create_automation_rule": {"event_id": 7, "name": "Thanks", "trigger": "attended_event",
                               "actions": [{"type": "send_email", "template_id": 4}]},
    "update_automation_rule": {"event_id": 7, "rule_id": "3f9a0c", "enabled": False},
    "delete_automation_rule": {"event_id": 7, "rule_id": "3f9a0c", "confirm": True},
    "create_webhook": {"url": "https://hooks.example.com/heptacert", "events": ["attendee.register", "email.sent"]},
    "delete_webhook": {"webhook_id": 2, "confirm": True},
    "create_email_template": {"event_id": 7, "name": "Reminder", "subject_tr": "Hatırlatma",
                              "subject_en": "Reminder", "body_html": "<p>Hi</p>"},
    "update_email_template": {"event_id": 7, "template_id": 4, "name": "Reminder", "subject_tr": "Hatırlatma",
                              "subject_en": "Reminder", "body_html": "<p>Hi</p>"},
    "delete_email_template": {"event_id": 7, "template_id": 4, "confirm": True},
    "start_bulk_email": {"event_id": 7, "email_template_id": 4, "recipient_type": "all", "confirm": True},
    "cancel_bulk_email_job": {"event_id": 7, "job_id": 11, "confirm": True},
    "apply_certificate_template": {"event_id": 7, "cert_template_id": 2, "confirm": True},
    "configure_survey": {"event_id": 7, "is_required": True, "survey_type": "builtin",
                         "builtin_questions": [{"id": "q1", "type": "rating", "question": "How was it?"}],
                         "confirm": True},
}


def _routes():
    table = []
    for route in main.app.routes:
        if isinstance(route, APIRoute):
            pattern = re.compile("^" + re.sub(r"\{[^}]+\}", "[^/]+", route.path) + "$")
            model = None
            if route.body_field is not None:
                model = getattr(route.body_field, "type_", None) or route.body_field.field_info.annotation
            table.append((route.methods, pattern, model))
    return table


ROUTES = _routes()
# Guard the guard: if body models stop resolving, the validation below would silently pass.
assert any(isinstance(m, type) and issubclass(m, BaseModel) for _, _, m in ROUTES)


def _assert_matches_route(method: str, path: str, body):
    path = path.split("?")[0]
    matches = [model for methods, pattern, model in ROUTES if method in methods and pattern.match(path)]
    assert matches, f"no REST route for {method} {path}"
    model = matches[0]
    if isinstance(model, type) and issubclass(model, BaseModel) and body is not None:
        unknown = set(body) - set(model.model_fields)
        assert not unknown, f"{method} {path} sends fields the API ignores: {sorted(unknown)}"
        model.model_validate(body)


@pytest.fixture
def transport(monkeypatch):
    writes = []

    async def allowed(*args, **kwargs):
        return None

    async def get(path, api_key, params=None):
        if path.endswith("/automations"):
            return {"rules": [RULE]}
        if path.endswith("/sessions"):
            return [{"id": 5, "name": "Keynote", "is_active": True}]
        return {"id": 7, "name": "Workshop", "overview": {"attendees": 3}, "items": []}

    def writer(method):
        async def call(path, api_key, body=None, *args, **kwargs):
            writes.append((method, path, body))
            return {"id": 7, "name": "Workshop", "rules": [RULE]}
        return call

    monkeypatch.setattr(mcp_server, "_require_scope", allowed)
    monkeypatch.setattr(mcp_server, "_get", get)
    monkeypatch.setattr(mcp_server, "_post", writer("POST"))
    monkeypatch.setattr(mcp_server, "_patch", writer("PATCH"))
    monkeypatch.setattr(mcp_server, "_delete", writer("DELETE"))
    monkeypatch.setattr(mcp_server, "_fire_and_forget_log", lambda *a, **kw: None)
    return writes


def _ctx():
    return SimpleNamespace(request_context=SimpleNamespace(
        request=SimpleNamespace(headers={"authorization": "Bearer owner-token"})
    ))


@pytest.mark.asyncio
async def test_every_write_tool_is_covered():
    tools = await mcp_server.mcp.list_tools()
    write_tools = {tool.name for tool in tools if tool.annotations.readOnlyHint is False}
    assert write_tools == set(CALLS)


@pytest.mark.asyncio
@pytest.mark.parametrize("tool_name", sorted(CALLS))
async def test_write_tool_sends_the_rest_schema(transport, tool_name):
    await getattr(mcp_server, tool_name)(_ctx(), **CALLS[tool_name])
    assert transport, f"{tool_name} did not write"
    for method, path, body in transport:
        _assert_matches_route(method, path, body)


@pytest.mark.asyncio
async def test_event_updates_keep_the_current_name(transport):
    await mcp_server.close_registration(_ctx(), event_id=7)
    assert transport == [("PATCH", "/api/admin/events/7", {"name": "Workshop", "registration_closed": True})]


@pytest.mark.asyncio
async def test_automation_update_merges_into_the_current_rule(transport):
    await mcp_server.update_automation_rule(_ctx(), event_id=7, rule_id="3f9a0c", enabled=False)
    assert transport == [("PATCH", "/api/admin/events/7/automations/3f9a0c", {
        "name": "Thank attendees", "trigger": "attended_event", "trigger_config": {}, "enabled": False,
        "actions": [{"type": "send_email", "email_template_id": 4}],
    })]


@pytest.mark.asyncio
async def test_automation_actions_reject_fields_the_api_would_drop(transport):
    result = (await mcp_server.create_automation_rule(
        _ctx(), event_id=7, name="Thanks", trigger="attended_event",
        actions=[{"type": "create_reminder", "message": "See you"}],
    )).structuredContent
    assert result["status"] == "invalid"
    missing = (await mcp_server.create_automation_rule(
        _ctx(), event_id=7, name="Thanks", trigger="attended_event", actions=[{"type": "send_email"}],
    )).structuredContent
    assert missing["status"] == "invalid"
    assert transport == []


@pytest.mark.asyncio
async def test_webhook_creates_one_subscription_per_event_type(transport):
    await mcp_server.create_webhook(_ctx(), url="https://hooks.example.com/h", events=["attendee.register", "email.sent"])
    assert [body["event_type"] for _, _, body in transport] == ["attendee.register", "email.sent"]


@pytest.mark.asyncio
async def test_bulk_add_reports_incomplete_rows_instead_of_posting(transport):
    result = (await mcp_server.bulk_add_attendees(
        _ctx(), event_id=7, attendees=[{"name": "Cher", "email": "cher@example.com"},
                                       {"name": "Ada Lovelace", "email": "ada@example.com"}],
    )).structuredContent
    assert result["result"]["added"] == 1
    assert result["result"]["errors"][0]["email"] == "cher@example.com"
    assert [body for _, _, body in transport] == [
        {"first_name": "Ada", "last_name": "Lovelace", "email": "ada@example.com"}
    ]
