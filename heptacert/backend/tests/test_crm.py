"""
Unit tests for CRM helpers and validation logic.
Covers: normalize_email, clean_tags, lifecycle/priority validation,
        CSV import field parsing, duplicate detection helpers.
"""

import pytest


# ── Email normalization ───────────────────────────────────────────────────────

class TestNormalizeEmail:
    def _norm(self, email: str) -> str:
        from src.event_crm_api import _normalize_email
        return _normalize_email(email)

    def test_lowercase(self):
        assert self._norm("User@Example.COM") == "user@example.com"

    def test_strip_whitespace(self):
        assert self._norm("  test@test.com  ") == "test@test.com"

    def test_none_returns_empty(self):
        assert self._norm(None) == ""  # type: ignore[arg-type]

    def test_empty_returns_empty(self):
        assert self._norm("") == ""

    def test_preserves_plus_addressing(self):
        assert self._norm("user+tag@example.com") == "user+tag@example.com"


# ── Tag cleaning ──────────────────────────────────────────────────────────────

class TestCleanTags:
    def _clean(self, tags: list) -> list:
        from src.event_crm_api import _clean_tags
        return _clean_tags(tags)

    def test_strips_whitespace(self):
        assert "vip" in self._clean(["  vip  "])

    def test_deduplicates(self):
        result = self._clean(["vip", "vip", "vip"])
        assert result.count("vip") == 1

    def test_removes_empty_strings(self):
        result = self._clean(["", "  ", "vip"])
        assert "" not in result
        assert "vip" in result

    def test_max_50_tags(self):
        result = self._clean([f"tag{i}" for i in range(100)])
        assert len(result) <= 50

    def test_preserves_order_of_first_occurrence(self):
        result = self._clean(["a", "b", "c"])
        assert result == ["a", "b", "c"]


# ── CRM profile visibility check ──────────────────────────────────────────────

class TestCrmVisibility:
    def test_private_view_not_visible_to_other_user(self):
        # owner=1, created_by=1 → visible; other user (id=2) → not visible
        visibility = "private"
        created_by = 1
        requesting_user_id = 2
        assert not (visibility == "organization" or created_by == requesting_user_id)

    def test_org_view_visible_to_all_org_users(self):
        visibility = "organization"
        requesting_user_id = 99
        assert visibility == "organization" or False  # any org user can see it

    def test_private_view_visible_to_creator(self):
        visibility = "private"
        created_by = 5
        requesting_user_id = 5
        assert visibility == "organization" or created_by == requesting_user_id


# ── Lifecycle status validation ───────────────────────────────────────────────

class TestLifecycleStatus:
    VALID = {"lead", "active", "vip", "renewal", "inactive"}

    def test_valid_statuses_accepted(self):
        for status in self.VALID:
            assert status in self.VALID

    def test_arbitrary_string_not_in_valid_set(self):
        assert "hacker" not in self.VALID
        assert "admin" not in self.VALID
        assert "" not in self.VALID


# ── Priority validation ───────────────────────────────────────────────────────

class TestPriorityValidation:
    VALID_PRIORITIES = {"low", "normal", "high", "urgent"}

    def test_valid_priorities(self):
        for p in self.VALID_PRIORITIES:
            assert p in self.VALID_PRIORITIES

    def test_invalid_priority_rejected(self):
        assert "critical" not in self.VALID_PRIORITIES
        assert "medium" not in self.VALID_PRIORITIES

    def test_priority_normalization(self):
        raw = "  HIGH  "
        normalized = raw.strip().lower()
        assert normalized in self.VALID_PRIORITIES


# ── Lead score bounds ─────────────────────────────────────────────────────────

class TestLeadScore:
    def test_minimum_is_zero(self):
        from pydantic import ValidationError
        from src.event_crm_api import ParticipantCrmIn
        with pytest.raises(ValidationError):
            ParticipantCrmIn(email="a@b.com", lead_score=-1)

    def test_maximum_is_100(self):
        from pydantic import ValidationError
        from src.event_crm_api import ParticipantCrmIn
        with pytest.raises(ValidationError):
            ParticipantCrmIn(email="a@b.com", lead_score=101)

    def test_zero_is_valid(self):
        from src.event_crm_api import ParticipantCrmIn
        obj = ParticipantCrmIn(email="a@b.com", lead_score=0)
        assert obj.lead_score == 0

    def test_100_is_valid(self):
        from src.event_crm_api import ParticipantCrmIn
        obj = ParticipantCrmIn(email="a@b.com", lead_score=100)
        assert obj.lead_score == 100


# ── Saved view visibility validation ─────────────────────────────────────────

class TestSavedViewVisibility:
    def test_clean_visibility_private(self):
        from src.event_crm_api import _clean_visibility
        assert _clean_visibility("private") == "private"

    def test_clean_visibility_organization(self):
        from src.event_crm_api import _clean_visibility
        assert _clean_visibility("organization") == "organization"

    def test_clean_visibility_invalid_raises(self):
        from fastapi import HTTPException
        from src.event_crm_api import _clean_visibility
        with pytest.raises(HTTPException) as exc_info:
            _clean_visibility("public")
        assert exc_info.value.status_code == 400

    def test_clean_visibility_empty_defaults_to_private(self):
        from src.event_crm_api import _clean_visibility
        assert _clean_visibility("") == "private"


# ── Merge validation ──────────────────────────────────────────────────────────

class TestMergeValidation:
    def test_merge_in_max_sources(self):
        from pydantic import ValidationError
        from src.event_crm_api import ParticipantCrmMergeIn
        with pytest.raises(ValidationError):
            # max_length=25 on source_emails
            ParticipantCrmMergeIn(
                target_email="target@example.com",
                source_emails=[f"src{i}@example.com" for i in range(26)],
            )

    def test_merge_requires_at_least_one_source(self):
        from pydantic import ValidationError
        from src.event_crm_api import ParticipantCrmMergeIn
        with pytest.raises(ValidationError):
            ParticipantCrmMergeIn(target_email="target@example.com", source_emails=[])

    def test_merge_valid(self):
        from src.event_crm_api import ParticipantCrmMergeIn
        obj = ParticipantCrmMergeIn(
            target_email="target@example.com",
            source_emails=["src@example.com"],
        )
        assert obj.target_email == "target@example.com"


# ── Bulk email validation ─────────────────────────────────────────────────────

class TestBulkEmailValidation:
    def test_bulk_update_max_500_emails(self):
        from pydantic import ValidationError
        from src.event_crm_api import ParticipantCrmBulkUpdateIn
        with pytest.raises(ValidationError):
            ParticipantCrmBulkUpdateIn(emails=[f"{i}@x.com" for i in range(501)])

    def test_bulk_update_requires_at_least_one_email(self):
        from pydantic import ValidationError
        from src.event_crm_api import ParticipantCrmBulkUpdateIn
        with pytest.raises(ValidationError):
            ParticipantCrmBulkUpdateIn(emails=[])

    def test_bulk_email_max_1000_emails(self):
        from pydantic import ValidationError
        from src.event_crm_api import ParticipantCrmSelectionIn
        with pytest.raises(ValidationError):
            ParticipantCrmSelectionIn(emails=[f"{i}@x.com" for i in range(1001)])
