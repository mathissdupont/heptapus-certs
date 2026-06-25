"""
Unit tests for plan_policy.py.
Pure functions — no DB, no I/O, runs instantly.
"""

from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

import pytest

from src.plan_policy import (
    FEATURE_POLICIES,
    PLAN_CATALOG,
    PLAN_ORDER,
    feature_policy_payload,
    normalize_plan,
    plan_allows,
    plan_catalog_payload,
    subscription_is_active_plan,
)


# ── normalize_plan ────────────────────────────────────────────────────────────

class TestNormalizePlan:
    def test_none_becomes_starter(self):
        assert normalize_plan(None) == "starter"

    def test_empty_becomes_starter(self):
        assert normalize_plan("") == "starter"

    def test_whitespace_trimmed(self):
        assert normalize_plan("  pro  ") == "pro"

    def test_uppercase_lowercased(self):
        assert normalize_plan("PRO") == "pro"

    def test_known_plans(self):
        for plan in ("starter", "free", "pro", "growth", "enterprise"):
            assert normalize_plan(plan) == plan


# ── PLAN_ORDER ────────────────────────────────────────────────────────────────

class TestPlanOrder:
    def test_starter_lowest(self):
        assert PLAN_ORDER["starter"] == 0

    def test_free_equals_starter(self):
        assert PLAN_ORDER["free"] == PLAN_ORDER["starter"]

    def test_pro_above_starter(self):
        assert PLAN_ORDER["pro"] > PLAN_ORDER["starter"]

    def test_growth_above_pro(self):
        assert PLAN_ORDER["growth"] > PLAN_ORDER["pro"]

    def test_enterprise_highest(self):
        assert PLAN_ORDER["enterprise"] > PLAN_ORDER["growth"]


# ── plan_allows ───────────────────────────────────────────────────────────────

class TestPlanAllows:
    # Exact matches
    def test_pro_allows_pro(self):
        assert plan_allows("pro", ["pro"]) is True

    def test_enterprise_allows_enterprise(self):
        assert plan_allows("enterprise", ["enterprise"]) is True

    # Upward rank — higher plan satisfies lower requirement
    def test_growth_satisfies_pro_requirement(self):
        assert plan_allows("growth", ["pro"]) is True

    def test_enterprise_satisfies_pro_requirement(self):
        assert plan_allows("enterprise", ["pro"]) is True

    def test_enterprise_satisfies_growth_requirement(self):
        assert plan_allows("enterprise", ["growth"]) is True

    # Downward rank — lower plan does NOT satisfy higher requirement
    def test_pro_does_not_satisfy_growth(self):
        assert plan_allows("pro", ["growth"]) is False

    def test_pro_does_not_satisfy_enterprise(self):
        assert plan_allows("pro", ["enterprise"]) is False

    def test_starter_does_not_satisfy_pro(self):
        assert plan_allows("starter", ["pro"]) is False

    def test_free_does_not_satisfy_pro(self):
        assert plan_allows("free", ["pro"]) is False

    # Multiple required plans (OR semantics — any match is enough)
    def test_pro_satisfies_pro_or_growth(self):
        assert plan_allows("pro", ["pro", "growth"]) is True

    def test_growth_satisfies_pro_or_enterprise(self):
        assert plan_allows("growth", ["pro", "enterprise"]) is True

    # Empty requirements
    def test_empty_required_plans_always_allows(self):
        assert plan_allows("starter", []) is True
        assert plan_allows("free", []) is True

    # Unknown plan
    def test_unknown_plan_rejected_for_pro(self):
        assert plan_allows("diamond", ["pro"]) is False

    # None plan defaults to starter
    def test_none_plan_treated_as_starter(self):
        assert plan_allows(None, ["pro"]) is False
        assert plan_allows(None, []) is True

    # CRM/training enterprise-only features
    def test_enterprise_allows_crm(self):
        assert plan_allows("enterprise", ["enterprise"]) is True

    def test_pro_blocked_from_enterprise_only(self):
        assert plan_allows("pro", ["enterprise"]) is False

    # Growth-level features (automation, segmentation)
    def test_growth_allows_automation(self):
        assert plan_allows("growth", ["growth", "enterprise"]) is True

    def test_pro_blocked_from_growth_only(self):
        assert plan_allows("pro", ["growth", "enterprise"]) is False


# ── subscription_is_active_plan ───────────────────────────────────────────────

def _make_sub(plan_id: str, expires_at=None):
    return SimpleNamespace(plan_id=plan_id, expires_at=expires_at)


class TestSubscriptionIsActivePlan:
    def test_none_subscription_returns_false(self):
        assert subscription_is_active_plan(None, ["pro"]) is False

    def test_active_pro_sub_satisfies_pro(self):
        sub = _make_sub("pro")
        assert subscription_is_active_plan(sub, ["pro"]) is True

    def test_active_growth_satisfies_pro(self):
        sub = _make_sub("growth")
        assert subscription_is_active_plan(sub, ["pro"]) is True

    def test_starter_sub_fails_pro(self):
        sub = _make_sub("starter")
        assert subscription_is_active_plan(sub, ["pro"]) is False

    # Expiry
    def test_future_expiry_is_active(self):
        sub = _make_sub("pro", expires_at=datetime.now(timezone.utc) + timedelta(days=30))
        assert subscription_is_active_plan(sub, ["pro"]) is True

    def test_past_expiry_is_inactive(self):
        sub = _make_sub("pro", expires_at=datetime.now(timezone.utc) - timedelta(seconds=1))
        assert subscription_is_active_plan(sub, ["pro"]) is False

    def test_none_expiry_treated_as_active(self):
        sub = _make_sub("enterprise", expires_at=None)
        assert subscription_is_active_plan(sub, ["enterprise"]) is True

    def test_inactive_subscription_fails_even_when_plan_matches(self):
        sub = SimpleNamespace(plan_id="enterprise", expires_at=None, is_active=False)
        assert subscription_is_active_plan(sub, ["enterprise"]) is False

    def test_naive_datetime_handled(self):
        # Naive datetime (no timezone) should be treated as UTC
        sub = _make_sub("pro", expires_at=datetime.utcnow() + timedelta(days=1))
        assert subscription_is_active_plan(sub, ["pro"]) is True

    def test_expired_naive_datetime(self):
        sub = _make_sub("pro", expires_at=datetime.utcnow() - timedelta(days=1))
        assert subscription_is_active_plan(sub, ["pro"]) is False


# ── feature_policy_payload ────────────────────────────────────────────────────

class TestFeaturePolicyPayload:
    def test_returns_list(self):
        result = feature_policy_payload()
        assert isinstance(result, list)
        assert len(result) > 0

    def test_each_item_has_required_keys(self):
        for item in feature_policy_payload():
            assert "key" in item
            assert "required_plans" in item
            assert "title_tr" in item
            assert "title_en" in item

    def test_crm_is_enterprise_only(self):
        crm = next(i for i in feature_policy_payload() if i["key"] == "crm")
        assert crm["required_plans"] == ["enterprise"]
        assert crm["enterprise_only_for_staff"] is True

    def test_training_is_enterprise_only(self):
        training = next(i for i in feature_policy_payload() if i["key"] == "training")
        assert "enterprise" in training["required_plans"]

    def test_lms_is_enterprise_only(self):
        lms = next(i for i in feature_policy_payload() if i["key"] == "lms")
        assert lms["required_plans"] == ["enterprise"]
        assert lms["enterprise_only_for_staff"] is True

    def test_checkin_requires_at_least_pro(self):
        checkin = next(i for i in feature_policy_payload() if i["key"] == "checkin")
        assert "pro" in checkin["required_plans"] or plan_allows("pro", checkin["required_plans"])

    def test_all_feature_keys_are_in_enterprise_catalog(self):
        assert set(PLAN_CATALOG["enterprise"].included_features) == set(FEATURE_POLICIES)

    def test_plan_catalog_payload_separates_included_and_excluded_features(self):
        catalog = {item["id"]: item for item in plan_catalog_payload()}
        assert "checkin" in catalog["pro"]["included_features"]
        assert "automation" in catalog["pro"]["excluded_features"]
        assert "crm" in catalog["growth"]["excluded_features"]
        assert catalog["enterprise"]["excluded_features"] == []
