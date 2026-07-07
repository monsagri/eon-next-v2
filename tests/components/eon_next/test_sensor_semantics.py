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

from custom_components.eon_next.sensor import (
    CurrentUnitRateSensor,
    ExportUnitRateSensor,
    NextUnitRateSensor,
    PreviousDayConsumptionSensor,
    PreviousDayCostSensor,
    PreviousUnitRateSensor,
    StandingChargeSensor,
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
