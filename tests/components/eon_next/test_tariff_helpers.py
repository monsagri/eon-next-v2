"""Unit tests for tariff_helpers rate calculation and off-peak detection."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any
from unittest.mock import patch

import pytest

from custom_components.eon_next.tariff_helpers import (
    RateInfo,
    build_day_rates,
    get_next_rate,
    get_off_peak_metadata,
    get_previous_rate,
    is_off_peak,
)

# Dynamic reference time: today at 03:00 UTC — inside a typical off-peak
# window.  All schedule timestamps are derived from this so the tests
# remain valid regardless of when they run.
_REF_DATE = datetime.now(tz=timezone.utc).replace(
    hour=3, minute=0, second=0, microsecond=0
)
_REF_DATE_ISO = _REF_DATE.date().isoformat()
_PREV_DATE_ISO = (_REF_DATE - timedelta(days=1)).date().isoformat()
# For local-time tests assume BST-like offset (UTC+1), so local = 04:00.
_REF_LOCAL = _REF_DATE + timedelta(hours=1)


def _patch_utcnow():
    return patch("homeassistant.util.dt.utcnow", return_value=_REF_DATE)


def _patch_now(local: datetime | None = None):
    return patch(
        "homeassistant.util.dt.now", return_value=local or _REF_LOCAL
    )


def _make_schedule_entry(
    value: float, valid_from: str, valid_to: str
) -> dict[str, Any]:
    return {"value": value, "validFrom": valid_from, "validTo": valid_to}


def _ts(hour: int, date_iso: str | None = None) -> str:
    """Build an ISO timestamp string for *hour* on *date_iso* (default today)."""
    d = date_iso or _REF_DATE_ISO
    return f"{d}T{hour:02d}:00:00+00:00"


# ── Flat-rate meter data ──────────────────────────────────────

def _flat_meter_data(unit_rate: float = 0.2236) -> dict[str, Any]:
    return {
        "tariff_unit_rate": unit_rate,
        "tariff_is_tou": False,
        "tariff_rates_schedule": None,
        "tariff_code": "E-1R-NEXT-FLEX-01",
    }


# ── ToU meter data with API schedule ─────────────────────────

def _tou_meter_data_with_schedule() -> dict[str, Any]:
    """ToU meter with API schedule spanning 02:00–05:00 off-peak, 05:00–08:00 peak."""
    return {
        "tariff_unit_rate": 0.10,
        "tariff_is_tou": True,
        "tariff_code": "E-1R-NEXT-DRIVE-01",
        "tariff_rates_schedule": [
            _make_schedule_entry(7.0, _ts(2), _ts(5)),
            _make_schedule_entry(25.0, _ts(5), _ts(8)),
            _make_schedule_entry(25.0, _ts(21, _PREV_DATE_ISO), _ts(2)),
        ],
    }


# ── ToU meter data with pattern fallback ─────────────────────

def _tou_meter_data_pattern_only() -> dict[str, Any]:
    """ToU meter without time windows — falls back to tariff_patterns registry."""
    return {
        "tariff_unit_rate": 0.10,
        "tariff_is_tou": True,
        "tariff_code": "E-1R-NEXT-DRIVE-01",
        "tariff_rates_schedule": [
            {"value": 7.0},
            {"value": 25.0},
        ],
    }


def _local_at(hour: int) -> datetime:
    """Return a datetime for today at *hour* in the reference timezone."""
    return _REF_DATE.replace(hour=hour)


# ═══════════════════════════════════════════════════════════════
# get_previous_rate
# ═══════════════════════════════════════════════════════════════


class TestGetPreviousRate:
    def test_returns_none_when_no_unit_rate(self) -> None:
        assert get_previous_rate({}) is None

    def test_flat_rate_returns_current(self) -> None:
        info = get_previous_rate(_flat_meter_data(0.22))
        assert info is not None
        assert info.rate == 0.22
        assert info.is_off_peak is False

    def test_tou_api_schedule_returns_previous_window(self) -> None:
        """At 03:00 UTC we're in the 7p off-peak window; previous should be 25p peak."""
        data = _tou_meter_data_with_schedule()
        with _patch_utcnow():
            info = get_previous_rate(data)
        assert info is not None
        assert info.rate == pytest.approx(0.25)
        assert info.is_off_peak is False

    def test_tou_pattern_fallback_during_off_peak(self) -> None:
        """NEXT-DRIVE off-peak is 00:00–07:00 local.  At 04:00 local -> previous was peak."""
        data = _tou_meter_data_pattern_only()
        with _patch_utcnow(), _patch_now(_local_at(4)):
            info = get_previous_rate(data)
        assert info is not None
        assert info.rate == pytest.approx(0.25)
        assert info.is_off_peak is False

    def test_tou_pattern_fallback_during_peak(self) -> None:
        """At 08:00 local (peak) -> previous was off-peak."""
        data = _tou_meter_data_pattern_only()
        with _patch_utcnow(), _patch_now(_local_at(8)):
            info = get_previous_rate(data)
        assert info is not None
        assert info.rate == pytest.approx(0.07)
        assert info.is_off_peak is True


# ═══════════════════════════════════════════════════════════════
# get_next_rate
# ═══════════════════════════════════════════════════════════════


class TestGetNextRate:
    def test_returns_none_when_no_unit_rate(self) -> None:
        assert get_next_rate({}) is None

    def test_flat_rate_returns_current(self) -> None:
        info = get_next_rate(_flat_meter_data(0.22))
        assert info is not None
        assert info.rate == 0.22

    def test_tou_api_schedule_returns_next_window(self) -> None:
        """At 03:00 UTC we're in 7p off-peak; next different rate is 25p peak at 05:00."""
        data = _tou_meter_data_with_schedule()
        with _patch_utcnow():
            info = get_next_rate(data)
        assert info is not None
        assert info.rate == pytest.approx(0.25)
        assert info.is_off_peak is False

    def test_tou_pattern_fallback_during_off_peak(self) -> None:
        data = _tou_meter_data_pattern_only()
        with _patch_utcnow(), _patch_now(_local_at(4)):
            info = get_next_rate(data)
        assert info is not None
        assert info.rate == pytest.approx(0.25)
        assert info.is_off_peak is False

    def test_tou_pattern_fallback_during_peak(self) -> None:
        data = _tou_meter_data_pattern_only()
        with _patch_utcnow(), _patch_now(_local_at(8)):
            info = get_next_rate(data)
        assert info is not None
        assert info.rate == pytest.approx(0.07)
        assert info.is_off_peak is True


# ═══════════════════════════════════════════════════════════════
# is_off_peak
# ═══════════════════════════════════════════════════════════════


class TestIsOffPeak:
    def test_returns_none_for_flat_rate(self) -> None:
        assert is_off_peak(_flat_meter_data()) is None

    def test_api_schedule_off_peak_window(self) -> None:
        """At 03:00 UTC, inside the 7p window (the cheapest) -> True."""
        data = _tou_meter_data_with_schedule()
        with _patch_utcnow():
            assert is_off_peak(data) is True

    def test_api_schedule_peak_window(self) -> None:
        """At 06:00 UTC, inside the 25p window -> False."""
        data = _tou_meter_data_with_schedule()
        with patch("homeassistant.util.dt.utcnow", return_value=_REF_DATE.replace(hour=6)):
            assert is_off_peak(data) is False

    def test_pattern_fallback_off_peak(self) -> None:
        data = _tou_meter_data_pattern_only()
        with _patch_now(_local_at(4)):
            assert is_off_peak(data) is True

    def test_pattern_fallback_peak(self) -> None:
        data = _tou_meter_data_pattern_only()
        with _patch_now(_local_at(8)):
            assert is_off_peak(data) is False

    def test_returns_none_for_tou_without_data(self) -> None:
        data = {
            "tariff_is_tou": True,
            "tariff_rates_schedule": [],
            "tariff_code": "UNKNOWN-TARIFF",
        }
        with _patch_utcnow(), _patch_now():
            assert is_off_peak(data) is None


# ═══════════════════════════════════════════════════════════════
# get_off_peak_metadata
# ═══════════════════════════════════════════════════════════════


class TestGetOffPeakMetadata:
    def test_empty_for_flat_rate(self) -> None:
        assert get_off_peak_metadata(_flat_meter_data()) == {}

    def test_api_schedule_returns_rate_name_and_transition(self) -> None:
        data = _tou_meter_data_with_schedule()
        with _patch_utcnow():
            meta = get_off_peak_metadata(data)
        assert meta["current_rate_name"] == "off_peak"
        assert meta["next_transition"] == _ts(5)

    def test_pattern_fallback_returns_rate_name(self) -> None:
        data = _tou_meter_data_pattern_only()
        with _patch_now(_local_at(4)):
            meta = get_off_peak_metadata(data)
        assert meta["current_rate_name"] == "off_peak"
        assert "next_transition" in meta


# ═══════════════════════════════════════════════════════════════
# build_day_rates
# ═══════════════════════════════════════════════════════════════


class TestBuildDayRates:
    def test_empty_when_no_unit_rate(self) -> None:
        assert build_day_rates({}) == []

    def test_flat_rate_single_window(self) -> None:
        data = _flat_meter_data(0.22)
        with _patch_now():
            rates = build_day_rates(data)
        assert len(rates) == 1
        assert rates[0]["rate"] == 0.22
        assert rates[0]["is_off_peak"] is False

    def test_api_schedule_filters_to_today(self) -> None:
        data = _tou_meter_data_with_schedule()
        with _patch_now(), _patch_utcnow():
            rates = build_day_rates(data)
        assert len(rates) > 0
        for r in rates:
            assert "start" in r
            assert "end" in r
            assert "rate" in r
            assert "is_off_peak" in r

    def test_pattern_fallback_builds_windows(self) -> None:
        data = _tou_meter_data_pattern_only()
        with _patch_now(_local_at(12)):
            rates = build_day_rates(data)
        assert len(rates) >= 2
        off_peak_windows = [r for r in rates if r["is_off_peak"]]
        peak_windows = [r for r in rates if not r["is_off_peak"]]
        assert len(off_peak_windows) >= 1
        assert len(peak_windows) >= 1

    def test_pattern_fallback_rates_match_schedule_values(self) -> None:
        data = _tou_meter_data_pattern_only()
        with _patch_now(_local_at(12)):
            rates = build_day_rates(data)
        off_peak = [r for r in rates if r["is_off_peak"]]
        peak = [r for r in rates if not r["is_off_peak"]]
        if off_peak:
            assert off_peak[0]["rate"] == pytest.approx(0.07)
        if peak:
            assert peak[0]["rate"] == pytest.approx(0.25)


# ═══════════════════════════════════════════════════════════════
# Edge cases
# ═══════════════════════════════════════════════════════════════


class TestEdgeCases:
    def test_schedule_with_invalid_values_skipped(self) -> None:
        data = {
            "tariff_unit_rate": 0.10,
            "tariff_is_tou": True,
            "tariff_code": "E-1R-NEXT-DRIVE-01",
            "tariff_rates_schedule": [
                {"value": "bad", "validFrom": _ts(0), "validTo": _ts(6)},
            ],
        }
        with _patch_utcnow(), _patch_now():
            info = get_previous_rate(data)
        assert info is not None
        assert info.rate == 0.10

    def test_empty_schedule_falls_through(self) -> None:
        data = {
            "tariff_unit_rate": 0.15,
            "tariff_is_tou": True,
            "tariff_rates_schedule": [],
            "tariff_code": "UNKNOWN-01",
        }
        with _patch_utcnow(), _patch_now():
            info = get_previous_rate(data)
        assert info is not None
        assert info.rate == 0.15

    def test_none_schedule_falls_through(self) -> None:
        data = {
            "tariff_unit_rate": 0.15,
            "tariff_is_tou": True,
            "tariff_rates_schedule": None,
            "tariff_code": "UNKNOWN-01",
        }
        with _patch_utcnow(), _patch_now():
            info = get_next_rate(data)
        assert info is not None
        assert info.rate == 0.15
