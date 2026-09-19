"""Pure certificate-tier rule evaluation.

Tier definitions are evaluated in their configured order.  The first matching
definition wins; a definition without conditions is an explicit fallback.
Malformed legacy JSON fails closed instead of assigning an incorrect tier.
"""

from __future__ import annotations

from collections.abc import Mapping
from typing import Any


_NUMERIC_OPERATORS = {
    "eq": lambda actual, expected: actual == expected,
    "ne": lambda actual, expected: actual != expected,
    "gt": lambda actual, expected: actual > expected,
    "gte": lambda actual, expected: actual >= expected,
    "lt": lambda actual, expected: actual < expected,
    "lte": lambda actual, expected: actual <= expected,
}


def _condition_matches(condition: Mapping[str, Any], metrics: Mapping[str, Any]) -> bool:
    field = condition.get("field")
    operator = condition.get("operator", "eq")
    if not isinstance(field, str) or field not in metrics:
        return False

    actual = metrics[field]
    expected = condition.get("value")

    try:
        if operator in _NUMERIC_OPERATORS:
            return bool(_NUMERIC_OPERATORS[operator](actual, expected))
        if operator == "in":
            return actual in expected
        if operator == "not_in":
            return actual not in expected
    except (TypeError, ValueError):
        return False
    return False


def select_certificate_tier(
    definitions: list[dict[str, Any]], metrics: Mapping[str, Any]
) -> dict[str, Any] | None:
    """Return the first matching tier definition, or ``None`` when none match."""

    for definition in definitions:
        if not isinstance(definition, dict):
            continue
        conditions = definition.get("conditions")
        if not isinstance(conditions, list):
            continue
        if not conditions:
            return definition

        results = [
            _condition_matches(condition, metrics)
            if isinstance(condition, dict)
            else False
            for condition in conditions
        ]
        logic = str(definition.get("condition_logic", "AND")).upper()
        matched = all(results) if logic == "AND" else any(results) if logic == "OR" else False
        if matched:
            return definition

    return None
