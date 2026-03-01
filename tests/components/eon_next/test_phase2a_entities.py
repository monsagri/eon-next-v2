"""Unit tests for Phase 2A sensor, binary_sensor, and event entities.

Tests verify entity construction, unique_id format, native_value from
coordinator data, and extra_state_attributes.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any
from unittest.mock import MagicMock, patch

import pytest

from custom_components.eon_next.binary_sensor import OffPeakBinarySensor
from custom_components.eon_next.event import CurrentDayRatesEvent
from custom_components.eon_next.sensor import (
    ExportDailyConsumptionSensor,
    ExportUnitRateSensor,
    NextUnitRateSensor,
    PreviousUnitRateSensor,
)

# Dynamic reference time: today at 03:00 UTC.  All derived timestamps
# are relative so tests never become date-dependent.
_REF_UTC = datetime.now(tz=timezone.utc).replace(
    hour=3, minute=0, second=0, microsecond=0
)
_REF_LOCAL = _REF_UTC + timedelta(hours=1)
_REF_DATE_ISO = _REF_UTC.date().isoformat()
_PREV_DATE_ISO = (_REF_UTC - timedelta(days=1)).date().isoformat()
_LAST_YEAR_ISO = (_REF_UTC - timedelta(days=365)).date().isoformat()
_NEXT_YEAR_ISO = (_REF_UTC + timedelta(days=365)).date().isoformat()
_TODAY_MIDNIGHT_ISO = f"{_REF_DATE_ISO}T00:00:00+00:00"


def _ts(hour: int, date_iso: str | None = None) -> str:
    d = date_iso or _REF_DATE_ISO
    return f"{d}T{hour:02d}:00:00+00:00"


def _patch_utcnow():
    return patch("homeassistant.util.dt.utcnow", return_value=_REF_UTC)


def _patch_now(local: datetime | None = None):
    return patch(
        "homeassistant.util.dt.now", return_value=local or _REF_LOCAL
    )


def _make_coordinator(data: dict[str, Any] | None = None) -> MagicMock:
    coord = MagicMock()
    coord.data = data
    coord.last_update_success = True
    return coord


def _make_meter(serial: str = "E10ABC123", is_export: bool = False) -> MagicMock:
    meter = MagicMock()
    meter.serial = serial
    meter.is_export = is_export
    return meter


def _flat_meter_data() -> dict[str, Any]:
    return {
        "tariff_unit_rate": 0.2236,
        "tariff_is_tou": False,
        "tariff_rates_schedule": None,
        "tariff_code": "E-1R-NEXT-FLEX-01",
        "unit_rate": 0.2236,
        "daily_consumption": 5.5,
        "daily_consumption_last_reset": _TODAY_MIDNIGHT_ISO,
        "tariff_name": "Next Flex",
        "tariff_valid_from": _LAST_YEAR_ISO,
        "tariff_valid_to": _NEXT_YEAR_ISO,
    }


def _tou_meter_data() -> dict[str, Any]:
    return {
        "tariff_unit_rate": 0.10,
        "tariff_is_tou": True,
        "tariff_code": "E-1R-NEXT-DRIVE-01",
        "tariff_rates_schedule": [
            {
                "value": 7.0,
                "validFrom": _ts(2),
                "validTo": _ts(5),
            },
            {
                "value": 25.0,
                "validFrom": _ts(5),
                "validTo": _ts(8),
            },
        ],
        "unit_rate": 0.10,
        "daily_consumption": 12.0,
        "daily_consumption_last_reset": _TODAY_MIDNIGHT_ISO,
    }


# ═══════════════════════════════════════════════════════════════
# PreviousUnitRateSensor
# ═══════════════════════════════════════════════════════════════


class TestPreviousUnitRateSensor:
    def test_unique_id_format(self) -> None:
        meter = _make_meter("E10ABC123")
        sensor = PreviousUnitRateSensor(_make_coordinator(), meter)
        assert sensor._attr_unique_id == "E10ABC123__previous_unit_rate"

    def test_native_value_flat_rate(self) -> None:
        meter = _make_meter()
        data = _flat_meter_data()
        coord = _make_coordinator({meter.serial: data})
        sensor = PreviousUnitRateSensor(coord, meter)
        with _patch_utcnow(), _patch_now():
            assert sensor.native_value == pytest.approx(0.2236)

    def test_native_value_none_when_no_data(self) -> None:
        meter = _make_meter()
        coord = _make_coordinator({})
        sensor = PreviousUnitRateSensor(coord, meter)
        assert sensor.native_value is None

    def test_extra_state_attributes_include_tariff_code(self) -> None:
        meter = _make_meter()
        data = _flat_meter_data()
        coord = _make_coordinator({meter.serial: data})
        sensor = PreviousUnitRateSensor(coord, meter)
        with _patch_utcnow(), _patch_now():
            attrs = sensor.extra_state_attributes
        assert attrs.get("tariff_code") == "E-1R-NEXT-FLEX-01"


# ═══════════════════════════════════════════════════════════════
# NextUnitRateSensor
# ═══════════════════════════════════════════════════════════════


class TestNextUnitRateSensor:
    def test_unique_id_format(self) -> None:
        meter = _make_meter("E10ABC123")
        sensor = NextUnitRateSensor(_make_coordinator(), meter)
        assert sensor._attr_unique_id == "E10ABC123__next_unit_rate"

    def test_native_value_flat_rate(self) -> None:
        meter = _make_meter()
        data = _flat_meter_data()
        coord = _make_coordinator({meter.serial: data})
        sensor = NextUnitRateSensor(coord, meter)
        with _patch_utcnow(), _patch_now():
            assert sensor.native_value == pytest.approx(0.2236)

    def test_native_value_tou_returns_next_different_rate(self) -> None:
        meter = _make_meter()
        data = _tou_meter_data()
        coord = _make_coordinator({meter.serial: data})
        sensor = NextUnitRateSensor(coord, meter)
        with _patch_utcnow():
            val = sensor.native_value
        assert val is not None
        assert val == pytest.approx(0.25)


# ═══════════════════════════════════════════════════════════════
# ExportUnitRateSensor
# ═══════════════════════════════════════════════════════════════


class TestExportUnitRateSensor:
    def test_unique_id_format(self) -> None:
        meter = _make_meter("EXP001")
        sensor = ExportUnitRateSensor(_make_coordinator(), meter)
        assert sensor._attr_unique_id == "EXP001__export_unit_rate"

    def test_native_value_reads_unit_rate(self) -> None:
        meter = _make_meter("EXP001")
        data = {"unit_rate": 0.055, "tariff_code": "EXPORT-01"}
        coord = _make_coordinator({meter.serial: data})
        sensor = ExportUnitRateSensor(coord, meter)
        assert sensor.native_value == 0.055

    def test_extra_state_attributes_filters_empty(self) -> None:
        meter = _make_meter("EXP001")
        data = {"unit_rate": 0.055, "tariff_code": "EXPORT-01", "tariff_name": "", "tariff_valid_from": None}
        coord = _make_coordinator({meter.serial: data})
        sensor = ExportUnitRateSensor(coord, meter)
        attrs = sensor.extra_state_attributes
        assert "tariff_code" in attrs
        assert "tariff_name" not in attrs
        assert "tariff_valid_from" not in attrs


# ═══════════════════════════════════════════════════════════════
# ExportDailyConsumptionSensor
# ═══════════════════════════════════════════════════════════════


class TestExportDailyConsumptionSensor:
    def test_unique_id_format(self) -> None:
        meter = _make_meter("EXP001")
        sensor = ExportDailyConsumptionSensor(_make_coordinator(), meter)
        assert sensor._attr_unique_id == "EXP001__export_daily_consumption"

    def test_native_value_reads_daily_consumption(self) -> None:
        meter = _make_meter("EXP001")
        data = {"daily_consumption": 3.2}
        coord = _make_coordinator({meter.serial: data})
        sensor = ExportDailyConsumptionSensor(coord, meter)
        assert sensor.native_value == 3.2

    def test_last_reset_parses_datetime(self) -> None:
        meter = _make_meter("EXP001")
        data = {
            "daily_consumption": 3.2,
            "daily_consumption_last_reset": _TODAY_MIDNIGHT_ISO,
        }
        coord = _make_coordinator({meter.serial: data})
        sensor = ExportDailyConsumptionSensor(coord, meter)
        reset = sensor.last_reset
        assert reset is not None
        assert reset.tzinfo is not None

    def test_last_reset_returns_none_when_missing(self) -> None:
        meter = _make_meter("EXP001")
        data = {"daily_consumption": 3.2}
        coord = _make_coordinator({meter.serial: data})
        sensor = ExportDailyConsumptionSensor(coord, meter)
        assert sensor.last_reset is None


# ═══════════════════════════════════════════════════════════════
# OffPeakBinarySensor
# ═══════════════════════════════════════════════════════════════


class TestOffPeakBinarySensor:
    def test_unique_id_format(self) -> None:
        meter = _make_meter("E10ABC123")
        sensor = OffPeakBinarySensor(_make_coordinator(), meter)
        assert sensor._attr_unique_id == "E10ABC123__off_peak"

    def test_unavailable_for_flat_rate(self) -> None:
        meter = _make_meter()
        data = _flat_meter_data()
        coord = _make_coordinator({meter.serial: data})
        sensor = OffPeakBinarySensor(coord, meter)
        # For flat-rate tariffs, available should return False
        assert sensor.available is False

    def test_available_for_tou(self) -> None:
        meter = _make_meter()
        data = _tou_meter_data()
        coord = _make_coordinator({meter.serial: data})
        sensor = OffPeakBinarySensor(coord, meter)
        assert sensor.available is True

    def test_is_on_returns_true_during_off_peak(self) -> None:
        meter = _make_meter()
        data = _tou_meter_data()
        coord = _make_coordinator({meter.serial: data})
        sensor = OffPeakBinarySensor(coord, meter)
        with _patch_utcnow():
            assert sensor.is_on is True

    def test_is_on_returns_false_during_peak(self) -> None:
        meter = _make_meter()
        data = _tou_meter_data()
        coord = _make_coordinator({meter.serial: data})
        sensor = OffPeakBinarySensor(coord, meter)
        with patch("homeassistant.util.dt.utcnow", return_value=_REF_UTC.replace(hour=6)):
            assert sensor.is_on is False

    def test_extra_state_attributes_include_tariff_code(self) -> None:
        meter = _make_meter()
        data = _tou_meter_data()
        coord = _make_coordinator({meter.serial: data})
        sensor = OffPeakBinarySensor(coord, meter)
        with _patch_utcnow():
            attrs = sensor.extra_state_attributes
        assert attrs.get("tariff_code") == "E-1R-NEXT-DRIVE-01"

    def test_is_on_returns_none_when_no_data(self) -> None:
        meter = _make_meter()
        coord = _make_coordinator({})
        sensor = OffPeakBinarySensor(coord, meter)
        assert sensor.is_on is None


# ═══════════════════════════════════════════════════════════════
# CurrentDayRatesEvent
# ═══════════════════════════════════════════════════════════════


class TestCurrentDayRatesEvent:
    def test_unique_id_format(self) -> None:
        meter = _make_meter("E10ABC123")
        entity = CurrentDayRatesEvent(_make_coordinator(), meter)
        assert entity._attr_unique_id == "E10ABC123__current_day_rates"

    def test_event_types(self) -> None:
        meter = _make_meter()
        entity = CurrentDayRatesEvent(_make_coordinator(), meter)
        assert "rates_updated" in entity._attr_event_types

    def test_extra_state_attributes_defaults(self) -> None:
        meter = _make_meter()
        entity = CurrentDayRatesEvent(_make_coordinator(), meter)
        attrs = entity.extra_state_attributes
        assert attrs["rates"] == []
        assert attrs["tariff_code"] is None

    def test_unavailable_when_no_data(self) -> None:
        meter = _make_meter()
        coord = _make_coordinator({})
        entity = CurrentDayRatesEvent(coord, meter)
        assert entity.available is False

    def test_available_when_data_present(self) -> None:
        meter = _make_meter()
        data = _flat_meter_data()
        coord = _make_coordinator({meter.serial: data})
        entity = CurrentDayRatesEvent(coord, meter)
        assert entity.available is True
