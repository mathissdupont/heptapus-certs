from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

from src.plan_policy import FEATURE_POLICIES, feature_policy_payload, plan_allows, subscription_is_active_plan
from src.product_telemetry import sanitize_metadata


def test_plan_policy_growth_vs_enterprise_access():
    assert plan_allows("growth", FEATURE_POLICIES["automation"].required_plans)
    assert not plan_allows("growth", FEATURE_POLICIES["crm"].required_plans)
    assert plan_allows("enterprise", FEATURE_POLICIES["crm"].required_plans)


def test_subscription_policy_rejects_expired_plan():
    active = SimpleNamespace(plan_id="enterprise", expires_at=datetime.now(timezone.utc) + timedelta(days=1))
    expired = SimpleNamespace(plan_id="enterprise", expires_at=datetime.now(timezone.utc) - timedelta(days=1))
    assert subscription_is_active_plan(active, {"enterprise"})
    assert not subscription_is_active_plan(expired, {"enterprise"})


def test_feature_policy_payload_is_frontend_friendly():
    payload = feature_policy_payload()
    keys = {item["key"] for item in payload}
    assert {"automation", "crm", "training", "checkin"}.issubset(keys)
    assert all("required_plans" in item for item in payload)


def test_telemetry_metadata_drops_sensitive_fields():
    cleaned = sanitize_metadata(
        {
            "email": "person@example.com",
            "token": "secret",
            "count": 12,
            "source": "checkin-page",
            "message": "contains pii",
        }
    )
    assert cleaned == {"count": 12, "source": "checkin-page"}
