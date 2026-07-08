"""Regression tests for sensor state-class / device-class correctness.

Covers spec 03 finding 3.1: several entities carried device-class/state-class
combinations HA rejects (raising repair issues) or that corrupt long-term
statistics.  These assert the corrected metadata so the combinations cannot
regress silently.
"""

from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest

from homeassistant.components.sensor import SensorDeviceClass

from custom_components.eon_next.eonnext import ElectricityMeter
from custom_components.eon_next.sensor import (
    CurrentUnitRateSensor,
    ExportUnitRateSensor,
    NextUnitRateSensor,
    PreviousDayConsumptionSensor,
    PreviousDayCostSensor,
    PreviousUnitRateSensor,
    StandingChargeSensor,
    async_setup_entry,
)


def _coord() -> MagicMock:
    coord = MagicMock()
    coord.data = None
    coord.last_update_success = True
    return coord


def _meter(serial: str = "E10ABC123") -> SimpleNamespace:
    return SimpleNamespace(serial=serial)


UNIT_RATE_SENSORS = [
    CurrentUnitRateSensor,
    PreviousUnitRateSensor,
    NextUnitRateSensor,
    ExportUnitRateSensor,
]


@pytest.mark.parametrize("cls", UNIT_RATE_SENSORS)
def test_unit_rate_sensors_have_no_monetary_device_class(cls) -> None:
    """Unit-rate sensors keep GBP/kWh but must not claim MONETARY.

    MONETARY requires an ISO-4217 currency unit; pairing it with GBP/kWh makes
    HA raise a repair issue per rate sensor per meter.
    """
    sensor = cls(_coord(), _meter())
    assert sensor.device_class is None
    assert sensor.native_unit_of_measurement == "GBP/kWh"


def test_standing_charge_has_no_state_class() -> None:
    """Standing charge is a fixed daily fee, not a cumulative total."""
    sensor = StandingChargeSensor(_coord(), _meter())
    assert sensor.device_class == SensorDeviceClass.MONETARY
    assert sensor.state_class is None


def test_previous_day_cost_has_no_state_class() -> None:
    """Previous-day cost is a rolling snapshot, not a cumulative total."""
    sensor = PreviousDayCostSensor(_coord(), _meter())
    assert sensor.device_class == SensorDeviceClass.MONETARY
    assert sensor.state_class is None


def test_previous_day_consumption_has_no_state_class() -> None:
    """ENERGY permits only TOTAL/TOTAL_INCREASING; this is a daily snapshot."""
    sensor = PreviousDayConsumptionSensor(_coord(), _meter())
    assert sensor.device_class == SensorDeviceClass.ENERGY
    assert sensor.state_class is None


# --- spec 03 finding 3.5: export meters must not get duplicate entity pairs ---


async def _setup_unique_ids(is_export: bool) -> set[str]:
    """Run sensor setup for one electricity meter and return the unique_ids."""
    meter = ElectricityMeter(
        MagicMock(), "m1", "E10EXPORT" if is_export else "E10STD", "sp1",
        is_export=is_export,
    )
    account = SimpleNamespace(
        account_number="A-1", meters=[meter], ev_chargers=[]
    )
    api = SimpleNamespace(accounts=[account])
    cost_trackers = MagicMock()
    cost_trackers.list_tracker_ids.return_value = []
    runtime = SimpleNamespace(
        coordinator=_coord(), api=api, backfill=MagicMock(), cost_trackers=cost_trackers
    )
    config_entry = MagicMock()
    config_entry.runtime_data = runtime

    captured: list = []
    await async_setup_entry(MagicMock(), config_entry, captured.extend)
    return {e.unique_id for e in captured}


async def test_export_meter_skips_generic_duplicate_sensors() -> None:
    """Export meters get Export* variants only — not the generic duplicates
    that read the same coordinator keys with identical values."""
    uids = await _setup_unique_ids(is_export=True)
    assert "E10EXPORT__export_unit_rate" in uids
    assert "E10EXPORT__export_daily_consumption" in uids
    # The generic pair must be absent for export meters.
    assert "E10EXPORT__daily_consumption" not in uids
    assert "E10EXPORT__current_unit_rate" not in uids


async def test_standard_meter_keeps_generic_sensors() -> None:
    """Non-export meters keep the generic sensors and get no export pair."""
    uids = await _setup_unique_ids(is_export=False)
    assert "E10STD__daily_consumption" in uids
    assert "E10STD__current_unit_rate" in uids
    assert "E10STD__export_unit_rate" not in uids
    assert "E10STD__export_daily_consumption" not in uids
