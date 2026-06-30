"""Unit tests for event-type feature presets (WP17 / ADR-0018).

Pure-function tests over event_features — no DB, no app bootstrap.
"""

from src.event_features import (
    EVENT_TYPES,
    EVENT_TYPE_CERTIFICATE,
    FEATURE_DEFAULTS,
    PRESET_BY_EVENT_TYPE,
    normalize_event_type,
    resolved_feature_defaults,
)


def test_unknown_type_falls_back_to_global_defaults():
    # custom / unknown types use the minimal safe FEATURE_DEFAULTS set.
    assert resolved_feature_defaults("custom") == FEATURE_DEFAULTS
    assert resolved_feature_defaults("does-not-exist") == FEATURE_DEFAULTS
    assert resolved_feature_defaults(None) == FEATURE_DEFAULTS


def test_certificate_event_uses_defaults():
    assert resolved_feature_defaults(EVENT_TYPE_CERTIFICATE) == FEATURE_DEFAULTS


def test_conference_enables_ticketing():
    res = resolved_feature_defaults("conference")
    assert res["ticketing_enabled"] is True
    assert res["registration_enabled"] is True
    assert res["checkin_enabled"] is True


def test_workshop_enables_quiz_and_cpd():
    res = resolved_feature_defaults("workshop")
    assert res["quiz_enabled"] is True
    assert res["cpd_enabled"] is True


def test_concert_disables_certificate_enables_ticketing():
    res = resolved_feature_defaults("concert")
    assert res["certificate_enabled"] is False
    assert res["ticketing_enabled"] is True


def test_club_event_enables_gamification():
    assert resolved_feature_defaults("club_event")["gamification_enabled"] is True


def test_resolved_defaults_cover_every_flag_for_every_type():
    # Every type must resolve to a complete flag set (forward-compatible merge).
    for etype in EVENT_TYPES:
        res = resolved_feature_defaults(etype)
        assert set(res.keys()) == set(FEATURE_DEFAULTS.keys())
        assert all(isinstance(v, bool) for v in res.values())


def test_presets_only_reference_known_flags():
    # A preset must never introduce a flag that isn't a real feature default
    # (guards against drift when columns are renamed/removed).
    known = set(FEATURE_DEFAULTS.keys())
    for etype, overrides in PRESET_BY_EVENT_TYPE.items():
        assert etype in EVENT_TYPES, f"preset for unknown event_type {etype!r}"
        assert set(overrides).issubset(known), f"{etype} references unknown flags"


def test_resolver_does_not_mutate_module_state():
    res = resolved_feature_defaults("workshop")
    res["quiz_enabled"] = False
    # mutating the returned dict must not leak into the next call
    assert resolved_feature_defaults("workshop")["quiz_enabled"] is True
    assert FEATURE_DEFAULTS["quiz_enabled"] is False


def test_normalize_event_type_guards():
    assert normalize_event_type("CONFERENCE") == "conference"
    assert normalize_event_type("  workshop ") == "workshop"
    assert normalize_event_type("nonsense") == EVENT_TYPE_CERTIFICATE
