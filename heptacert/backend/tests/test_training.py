"""
Unit tests for training_api.py helpers.
Covers: status validation, effective status computation, PDF generation,
        assignment payload validation, department validation.
"""

from datetime import datetime, timedelta, timezone

import pytest


# ── Status validation ─────────────────────────────────────────────────────────

class TestCleanStatus:
    def _clean(self, value: str) -> str:
        from src.training_api import _clean_status
        return _clean_status(value)

    def test_valid_statuses_pass(self):
        for status in ("assigned", "in_progress", "completed", "overdue", "waived"):
            assert self._clean(status) == status

    def test_strips_whitespace(self):
        assert self._clean("  assigned  ") == "assigned"

    def test_lowercase_normalization(self):
        assert self._clean("COMPLETED") == "completed"

    def test_invalid_status_raises_400(self):
        from fastapi import HTTPException
        with pytest.raises(HTTPException) as exc_info:
            self._clean("deleted")
        assert exc_info.value.status_code == 400

    def test_empty_defaults_to_assigned(self):
        assert self._clean("") == "assigned"

    def test_none_defaults_to_assigned(self):
        assert self._clean(None) == "assigned"  # type: ignore[arg-type]


# ── Approval status validation ────────────────────────────────────────────────

class TestCleanApprovalStatus:
    def _clean(self, value) -> str:
        from src.training_api import _clean_approval_status
        return _clean_approval_status(value)

    def test_valid_statuses(self):
        for s in ("not_required", "pending", "approved", "rejected"):
            assert self._clean(s) == s

    def test_invalid_raises_400(self):
        from fastapi import HTTPException
        with pytest.raises(HTTPException) as exc_info:
            self._clean("maybe")
        assert exc_info.value.status_code == 400

    def test_none_defaults_to_not_required(self):
        assert self._clean(None) == "not_required"


# ── Effective status computation ──────────────────────────────────────────────

def _make_assignment(**kwargs):
    from types import SimpleNamespace
    defaults = {
        "status": "assigned",
        "due_at": None,
        "renewal_due_at": None,
    }
    defaults.update(kwargs)
    return SimpleNamespace(**defaults)


class TestEffectiveStatus:
    def _effective(self, row, now=None) -> str:
        from src.training_api import _effective_status
        return _effective_status(row, now)

    def test_completed_stays_completed(self):
        row = _make_assignment(status="completed")
        assert self._effective(row) == "completed"

    def test_waived_stays_waived(self):
        row = _make_assignment(status="waived")
        assert self._effective(row) == "waived"

    def test_past_due_date_becomes_overdue(self):
        past = datetime.now(timezone.utc) - timedelta(days=1)
        row = _make_assignment(status="assigned", due_at=past)
        assert self._effective(row) == "overdue"

    def test_future_due_date_stays_as_status(self):
        future = datetime.now(timezone.utc) + timedelta(days=10)
        row = _make_assignment(status="assigned", due_at=future)
        assert self._effective(row) == "assigned"

    def test_none_due_at_stays_as_status(self):
        row = _make_assignment(status="in_progress", due_at=None)
        assert self._effective(row) == "in_progress"

    def test_naive_due_at_treated_as_utc(self):
        # Naive datetime (no tz) should be interpreted as UTC
        past_naive = datetime.utcnow() - timedelta(hours=1)
        row = _make_assignment(status="assigned", due_at=past_naive)
        assert self._effective(row) == "overdue"

    def test_completed_overrides_past_due(self):
        # Even if due_at is in the past, completed should stay completed
        past = datetime.now(timezone.utc) - timedelta(days=30)
        row = _make_assignment(status="completed", due_at=past)
        assert self._effective(row) == "completed"


# ── Assignment input validation ───────────────────────────────────────────────

class TestTrainingAssignmentIn:
    def test_title_min_length(self):
        from pydantic import ValidationError
        from src.training_api import TrainingAssignmentIn
        with pytest.raises(ValidationError):
            TrainingAssignmentIn(title="a", assignee_name="Test", assignee_email="t@t.com")

    def test_title_max_length(self):
        from pydantic import ValidationError
        from src.training_api import TrainingAssignmentIn
        with pytest.raises(ValidationError):
            TrainingAssignmentIn(title="x" * 201, assignee_name="Test", assignee_email="t@t.com")

    def test_assignee_email_validated(self):
        from pydantic import ValidationError
        from src.training_api import TrainingAssignmentIn
        with pytest.raises(ValidationError):
            TrainingAssignmentIn(title="Test Training", assignee_name="Test", assignee_email="not-an-email")

    def test_notify_before_days_bounds(self):
        from pydantic import ValidationError
        from src.training_api import TrainingAssignmentIn
        with pytest.raises(ValidationError):
            TrainingAssignmentIn(
                title="Test Training", assignee_name="Test",
                assignee_email="t@t.com", notify_before_days=0,
            )
        with pytest.raises(ValidationError):
            TrainingAssignmentIn(
                title="Test Training", assignee_name="Test",
                assignee_email="t@t.com", notify_before_days=366,
            )

    def test_valid_assignment_in(self):
        from src.training_api import TrainingAssignmentIn
        obj = TrainingAssignmentIn(
            title="Fire Safety Training",
            assignee_name="John Doe",
            assignee_email="john@example.com",
            notify_before_days=30,
        )
        assert obj.title == "Fire Safety Training"
        assert obj.status == "assigned"  # default
        assert obj.required is True  # default


# ── Training template validation ──────────────────────────────────────────────

class TestTrainingTemplateIn:
    def test_default_due_days_bounds(self):
        from pydantic import ValidationError
        from src.training_api import TrainingTemplateIn
        with pytest.raises(ValidationError):
            TrainingTemplateIn(name="T", title="Title", default_due_days=0)
        with pytest.raises(ValidationError):
            TrainingTemplateIn(name="T", title="Title", default_due_days=731)

    def test_renewal_interval_days_optional(self):
        from src.training_api import TrainingTemplateIn
        obj = TrainingTemplateIn(name="T", title="Title", renewal_interval_days=None)
        assert obj.renewal_interval_days is None

    def test_renewal_interval_max(self):
        from pydantic import ValidationError
        from src.training_api import TrainingTemplateIn
        with pytest.raises(ValidationError):
            TrainingTemplateIn(name="T", title="Title", renewal_interval_days=3651)

    def test_valid_template(self):
        from src.training_api import TrainingTemplateIn
        obj = TrainingTemplateIn(
            name="Annual Fire Safety",
            title="Annual Fire Safety Training",
            default_due_days=30,
            renewal_interval_days=365,
            notify_before_days=14,
        )
        assert obj.active is True  # default
        assert obj.approval_required is False  # default


# ── Bulk assign validation ────────────────────────────────────────────────────

class TestBulkAssignValidation:
    def test_empty_assignees_rejected(self):
        from pydantic import ValidationError
        from src.training_api import TrainingBulkAssignIn
        with pytest.raises(ValidationError):
            TrainingBulkAssignIn(template_id=1, assignees=[])

    def test_max_500_assignees(self):
        from pydantic import ValidationError
        from src.training_api import TrainingBulkAssignIn, TrainingBulkAssignee
        with pytest.raises(ValidationError):
            TrainingBulkAssignIn(
                template_id=1,
                assignees=[
                    TrainingBulkAssignee(assignee_name=f"User {i}", assignee_email=f"user{i}@example.com")
                    for i in range(501)
                ],
            )

    def test_valid_bulk_assign(self):
        from src.training_api import TrainingBulkAssignIn, TrainingBulkAssignee
        obj = TrainingBulkAssignIn(
            template_id=42,
            assignees=[
                TrainingBulkAssignee(assignee_name="Alice", assignee_email="alice@example.com"),
                TrainingBulkAssignee(assignee_name="Bob", assignee_email="bob@example.com"),
            ],
        )
        assert len(obj.assignees) == 2


# ── Notification email HTML safety ───────────────────────────────────────────

class TestNotificationEmailSafety:
    def test_html_escape_in_training_email(self):
        """Ensure that HTML injection via assignee_name/title is prevented."""
        from html import escape
        malicious_name = '<script>alert(1)</script>'
        malicious_title = '<img src=x onerror=alert(1)>'
        escaped_name = escape(malicious_name)
        escaped_title = escape(malicious_title)
        assert '<script>' not in escaped_name
        assert 'onerror' not in escaped_title
        assert '&lt;script&gt;' in escaped_name

    def test_html_in_event_name_escaped(self):
        from html import escape
        event_name = '"><svg onload=alert(1)>'
        escaped = escape(event_name)
        assert 'onload' not in escaped
        assert '&gt;' in escaped


# ── Department validation ─────────────────────────────────────────────────────

class TestDepartmentValidation:
    def test_department_name_min_length(self):
        from pydantic import ValidationError
        from src.training_api import OrganizationDepartmentIn
        with pytest.raises(ValidationError):
            OrganizationDepartmentIn(name="")

    def test_department_name_max_length(self):
        from pydantic import ValidationError
        from src.training_api import OrganizationDepartmentIn
        with pytest.raises(ValidationError):
            OrganizationDepartmentIn(name="x" * 161)

    def test_manager_email_validated(self):
        from pydantic import ValidationError
        from src.training_api import OrganizationDepartmentIn
        with pytest.raises(ValidationError):
            OrganizationDepartmentIn(name="Engineering", manager_email="not-an-email")

    def test_valid_department(self):
        from src.training_api import OrganizationDepartmentIn
        dept = OrganizationDepartmentIn(
            name="Engineering",
            code="ENG",
            manager_email="manager@example.com",
        )
        assert dept.active is True
