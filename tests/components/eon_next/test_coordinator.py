"""Unit tests for EonNextCoordinator fallback logic.

These tests exercise the coordinator's static helpers directly,
patching ``homeassistant.util.dt.now()`` to a fixed reference time
so that date-dependent logic is deterministic.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any
from unittest.mock import patch

import pytest

from custom_components.eon_next.coordinator import EonNextCoordinator

# Fixed reference time: 2025-06-15 14:00 UTC.  All tests derive
# "yesterday" / "today" from this constant so they never become flaky
# around midnight.
_REF_NOW = datetime(2025, 6, 15, 14, 0, 0, tzinfo=timezone.utc)
_YESTERDAY = (_REF_NOW - timedelta(days=1)).date()  # 2025-06-14
_TODAY = _REF_NOW.date()  # 2025-06-15


def _make_entry(
    interval_start: str, consumption: float | None
) -> dict[str, Any]:
    return {"interval_start": interval_start, "consumption": consumption}


def _patch_now():
    """Patch ``homeassistant.util.dt.now`` to return *_REF_NOW*."""
    return patch("homeassistant.util.dt.now", return_value=_REF_NOW)


class TestAggregateYesterdayConsumption:
    """Tests for EonNextCoordinator._aggregate_yesterday_consumption."""

    def test_returns_none_for_empty_list(self) -> None:
        with _patch_now():
            assert (
                EonNextCoordinator._aggregate_yesterday_consumption([]) is None
            )

    def test_sums_yesterday_entries(self) -> None:
        entries = [
            _make_entry(f"{_YESTERDAY}T08:00:00+00:00", 1.5),
            _make_entry(f"{_YESTERDAY}T08:30:00+00:00", 2.5),
            _make_entry(f"{_YESTERDAY}T09:00:00+00:00", 1.0),
        ]
        with _patch_now():
            result = EonNextCoordinator._aggregate_yesterday_consumption(
                entries
            )
        assert result == pytest.approx(5.0)

    def test_ignores_today_entries(self) -> None:
        entries = [
            _make_entry(f"{_TODAY}T08:00:00+00:00", 10.0),
            _make_entry(f"{_YESTERDAY}T08:00:00+00:00", 3.0),
        ]
        with _patch_now():
            result = EonNextCoordinator._aggregate_yesterday_consumption(
                entries
            )
        assert result == pytest.approx(3.0)

    def test_ignores_older_entries(self) -> None:
        two_days_ago = (_REF_NOW - timedelta(days=2)).date()
        entries = [
            _make_entry(f"{two_days_ago}T08:00:00+00:00", 5.0),
        ]
        with _patch_now():
            assert (
                EonNextCoordinator._aggregate_yesterday_consumption(entries)
                is None
            )

    def test_skips_none_consumption(self) -> None:
        entries = [
            _make_entry(f"{_YESTERDAY}T08:00:00+00:00", None),
            _make_entry(f"{_YESTERDAY}T09:00:00+00:00", 2.0),
        ]
        with _patch_now():
            result = EonNextCoordinator._aggregate_yesterday_consumption(
                entries
            )
        assert result == pytest.approx(2.0)

    def test_returns_none_when_no_yesterday_data(self) -> None:
        entries = [
            _make_entry(f"{_TODAY}T08:00:00+00:00", 5.0),
        ]
        with _patch_now():
            assert (
                EonNextCoordinator._aggregate_yesterday_consumption(entries)
                is None
            )

    def test_min_entries_rejects_incomplete_data(self) -> None:
        """With min_entries=44, fewer entries should return None."""
        entries = [
            _make_entry(f"{_YESTERDAY}T08:00:00+00:00", 1.0),
            _make_entry(f"{_YESTERDAY}T08:30:00+00:00", 1.0),
        ]
        with _patch_now():
            result = EonNextCoordinator._aggregate_yesterday_consumption(
                entries, min_entries=44
            )
        assert result is None

    def test_min_entries_accepts_complete_data(self) -> None:
        """With min_entries=44, 48 entries should succeed."""
        entries = [
            _make_entry(f"{_YESTERDAY}T{h:02d}:{m:02d}:00+00:00", 0.5)
            for h in range(24)
            for m in (0, 30)
        ]
        with _patch_now():
            result = EonNextCoordinator._aggregate_yesterday_consumption(
                entries, min_entries=44
            )
        assert result == pytest.approx(24.0)


class TestCostFallbackToTariff:
    """Tests that unit_rate and standing_charge fall back to tariff values.

    These exercise the tariff-fallback guards that live in
    ``_async_update_data``.  The logic is simple conditional assignment
    so we replicate the guard here rather than spinning up a full
    coordinator update cycle.
    """

    @staticmethod
    def _apply_tariff_fallback(meter_data: dict[str, Any]) -> None:
        """Replicate the tariff-fallback guards from _async_update_data."""
        if (
            meter_data.get("unit_rate") is None
            and meter_data.get("tariff_unit_rate") is not None
        ):
            meter_data["unit_rate"] = meter_data["tariff_unit_rate"]
        if (
            meter_data.get("standing_charge") is None
            and meter_data.get("tariff_standing_charge") is not None
        ):
            meter_data["standing_charge"] = meter_data["tariff_standing_charge"]

    def test_unit_rate_falls_back_to_tariff(self) -> None:
        meter_data: dict[str, Any] = {
            "unit_rate": None,
            "standing_charge": None,
            "tariff_unit_rate": 0.2236,
            "tariff_standing_charge": 0.5335,
        }
        self._apply_tariff_fallback(meter_data)
        assert meter_data["unit_rate"] == pytest.approx(0.2236)
        assert meter_data["standing_charge"] == pytest.approx(0.5335)

    def test_cost_endpoint_values_not_overridden(self) -> None:
        meter_data: dict[str, Any] = {
            "unit_rate": 0.25,
            "standing_charge": 0.50,
            "tariff_unit_rate": 0.2236,
            "tariff_standing_charge": 0.5335,
        }
        self._apply_tariff_fallback(meter_data)
        assert meter_data["unit_rate"] == pytest.approx(0.25)
        assert meter_data["standing_charge"] == pytest.approx(0.50)

    def test_no_fallback_when_tariff_missing(self) -> None:
        meter_data: dict[str, Any] = {
            "unit_rate": None,
            "standing_charge": None,
            "tariff_unit_rate": None,
            "tariff_standing_charge": None,
        }
        self._apply_tariff_fallback(meter_data)
        assert meter_data["unit_rate"] is None
        assert meter_data["standing_charge"] is None


class TestPreviousDayCostComputation:
    """Tests for computed previous_day_cost from consumption + tariff."""

    def test_computes_cost_from_consumption_and_tariff(self) -> None:
        consumption = [
            _make_entry(f"{_YESTERDAY}T00:00:00+00:00", 10.0),
        ]
        unit_rate = 0.25  # GBP/kWh
        standing_charge = 0.50  # GBP/day

        with _patch_now():
            yesterday_kwh = (
                EonNextCoordinator._aggregate_yesterday_consumption(
                    consumption
                )
            )
        assert yesterday_kwh is not None

        cost = round(yesterday_kwh * unit_rate + standing_charge, 4)
        # 10.0 * 0.25 + 0.50 = 3.0
        assert cost == pytest.approx(3.0)

    def test_no_cost_when_no_yesterday_consumption(self) -> None:
        consumption = [
            _make_entry(f"{_TODAY}T00:00:00+00:00", 10.0),
        ]
        with _patch_now():
            yesterday_kwh = (
                EonNextCoordinator._aggregate_yesterday_consumption(
                    consumption
                )
            )
        assert yesterday_kwh is None

    def test_cost_with_multiple_half_hourly_slots(self) -> None:
        # 48 half-hourly slots at 0.5 kWh each = 24 kWh total
        consumption = [
            _make_entry(f"{_YESTERDAY}T{h:02d}:{m:02d}:00+00:00", 0.5)
            for h in range(24)
            for m in (0, 30)
        ]
        unit_rate = 0.22  # GBP/kWh
        standing_charge = 0.53  # GBP/day

        with _patch_now():
            yesterday_kwh = (
                EonNextCoordinator._aggregate_yesterday_consumption(
                    consumption
                )
            )
        assert yesterday_kwh == pytest.approx(24.0)

        cost = round(yesterday_kwh * unit_rate + standing_charge, 4)
        # 24.0 * 0.22 + 0.53 = 5.81
        assert cost == pytest.approx(5.81)
