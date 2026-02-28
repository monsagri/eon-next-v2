"""Unit tests for EonNextCoordinator fallback logic.

These tests exercise the coordinator's static helpers and fallback
logic in isolation, without requiring a full Home Assistant runtime.
"""

from __future__ import annotations

import datetime
from datetime import timedelta, timezone
from typing import Any

import pytest


def _now() -> datetime.datetime:
    """Return current time in UTC."""
    return datetime.datetime.now(timezone.utc)


def _make_entry(
    interval_start: str, consumption: float | None
) -> dict[str, Any]:
    return {"interval_start": interval_start, "consumption": consumption}


def _aggregate_yesterday(
    consumption_results: list[dict[str, Any]],
) -> float | None:
    """Pure-Python mirror of EonNextCoordinator._aggregate_yesterday_consumption.

    Kept in sync with the coordinator implementation so we can validate
    the algorithm without the full HA import chain.
    """
    yesterday = (_now() - timedelta(days=1)).date()

    total = 0.0
    has_value = False

    for entry in consumption_results:
        interval_start = entry.get("interval_start") or ""
        try:
            parsed_start = datetime.datetime.fromisoformat(str(interval_start))
        except ValueError:
            continue

        if parsed_start.tzinfo is None:
            parsed_start = parsed_start.replace(tzinfo=timezone.utc)

        if parsed_start.date() != yesterday:
            continue

        consumption = entry.get("consumption")
        if consumption is None:
            continue
        try:
            val = float(consumption)
        except (TypeError, ValueError):
            continue

        total += val
        has_value = True

    return round(total, 3) if has_value else None


def _apply_tariff_fallback(meter_data: dict[str, Any]) -> None:
    """Mirror the tariff-fallback logic from _async_update_data."""
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


class TestAggregateYesterdayConsumption:
    """Tests for _aggregate_yesterday_consumption logic."""

    def test_returns_none_for_empty_list(self) -> None:
        assert _aggregate_yesterday([]) is None

    def test_sums_yesterday_entries(self) -> None:
        yesterday = (_now() - timedelta(days=1)).date()
        entries = [
            _make_entry(f"{yesterday}T08:00:00+00:00", 1.5),
            _make_entry(f"{yesterday}T08:30:00+00:00", 2.5),
            _make_entry(f"{yesterday}T09:00:00+00:00", 1.0),
        ]
        result = _aggregate_yesterday(entries)
        assert result == pytest.approx(5.0)

    def test_ignores_today_entries(self) -> None:
        today = _now().date()
        yesterday = (_now() - timedelta(days=1)).date()
        entries = [
            _make_entry(f"{today}T08:00:00+00:00", 10.0),
            _make_entry(f"{yesterday}T08:00:00+00:00", 3.0),
        ]
        result = _aggregate_yesterday(entries)
        assert result == pytest.approx(3.0)

    def test_ignores_older_entries(self) -> None:
        two_days_ago = (_now() - timedelta(days=2)).date()
        entries = [
            _make_entry(f"{two_days_ago}T08:00:00+00:00", 5.0),
        ]
        assert _aggregate_yesterday(entries) is None

    def test_skips_none_consumption(self) -> None:
        yesterday = (_now() - timedelta(days=1)).date()
        entries = [
            _make_entry(f"{yesterday}T08:00:00+00:00", None),
            _make_entry(f"{yesterday}T09:00:00+00:00", 2.0),
        ]
        result = _aggregate_yesterday(entries)
        assert result == pytest.approx(2.0)

    def test_returns_none_when_no_yesterday_data(self) -> None:
        today = _now().date()
        entries = [
            _make_entry(f"{today}T08:00:00+00:00", 5.0),
        ]
        assert _aggregate_yesterday(entries) is None


class TestCostFallbackToTariff:
    """Tests that unit_rate and standing_charge fall back to tariff values."""

    def test_unit_rate_falls_back_to_tariff(self) -> None:
        """When cost endpoint returns None, unit_rate should use tariff_unit_rate."""
        meter_data: dict[str, Any] = {
            "unit_rate": None,
            "standing_charge": None,
            "tariff_unit_rate": 0.2236,
            "tariff_standing_charge": 0.5335,
        }
        _apply_tariff_fallback(meter_data)
        assert meter_data["unit_rate"] == pytest.approx(0.2236)
        assert meter_data["standing_charge"] == pytest.approx(0.5335)

    def test_cost_endpoint_values_not_overridden(self) -> None:
        """When cost endpoint provides values, tariff values should not override."""
        meter_data: dict[str, Any] = {
            "unit_rate": 0.25,
            "standing_charge": 0.50,
            "tariff_unit_rate": 0.2236,
            "tariff_standing_charge": 0.5335,
        }
        _apply_tariff_fallback(meter_data)
        assert meter_data["unit_rate"] == pytest.approx(0.25)
        assert meter_data["standing_charge"] == pytest.approx(0.50)

    def test_no_fallback_when_tariff_missing(self) -> None:
        """When tariff data is also None, cost fields remain None."""
        meter_data: dict[str, Any] = {
            "unit_rate": None,
            "standing_charge": None,
            "tariff_unit_rate": None,
            "tariff_standing_charge": None,
        }
        _apply_tariff_fallback(meter_data)
        assert meter_data["unit_rate"] is None
        assert meter_data["standing_charge"] is None


class TestPreviousDayCostComputation:
    """Tests for computed previous_day_cost from consumption + tariff."""

    def test_computes_cost_from_consumption_and_tariff(self) -> None:
        yesterday = (_now() - timedelta(days=1)).date()
        consumption = [
            _make_entry(f"{yesterday}T00:00:00+00:00", 10.0),
        ]
        unit_rate = 0.25  # GBP/kWh
        standing_charge = 0.50  # GBP/day

        yesterday_kwh = _aggregate_yesterday(consumption)
        assert yesterday_kwh is not None

        cost = round(yesterday_kwh * unit_rate + standing_charge, 4)
        # 10.0 * 0.25 + 0.50 = 3.0
        assert cost == pytest.approx(3.0)

    def test_no_cost_when_no_yesterday_consumption(self) -> None:
        today = _now().date()
        consumption = [
            _make_entry(f"{today}T00:00:00+00:00", 10.0),
        ]
        yesterday_kwh = _aggregate_yesterday(consumption)
        assert yesterday_kwh is None

    def test_cost_with_multiple_half_hourly_slots(self) -> None:
        yesterday = (_now() - timedelta(days=1)).date()
        # 48 half-hourly slots at 0.5 kWh each = 24 kWh total
        consumption = [
            _make_entry(f"{yesterday}T{h:02d}:{m:02d}:00+00:00", 0.5)
            for h in range(24)
            for m in (0, 30)
        ]
        unit_rate = 0.22  # GBP/kWh
        standing_charge = 0.53  # GBP/day

        yesterday_kwh = _aggregate_yesterday(consumption)
        assert yesterday_kwh == pytest.approx(24.0)

        cost = round(yesterday_kwh * unit_rate + standing_charge, 4)
        # 24.0 * 0.22 + 0.53 = 5.81
        assert cost == pytest.approx(5.81)
