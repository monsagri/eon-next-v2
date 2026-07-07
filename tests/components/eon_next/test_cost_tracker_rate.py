"""Regression test: cost trackers use the time-of-use rate (spec 04, 4.3)."""

from __future__ import annotations

from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import patch

from custom_components.eon_next.cost_tracker import EonNextCostTrackerManager

_REF_UTC = datetime.now(tz=timezone.utc).replace(
    hour=3, minute=0, second=0, microsecond=0
)
_REF_DATE_ISO = _REF_UTC.date().isoformat()


def _ts(hour: int) -> str:
    return f"{_REF_DATE_ISO}T{hour:02d}:00:00+00:00"


def _manager_with_data(meter_data: dict) -> EonNextCostTrackerManager:
    # _current_rate only touches self.coordinator; bypass the heavy __init__.
    mgr = EonNextCostTrackerManager.__new__(EonNextCostTrackerManager)
    mgr.coordinator = SimpleNamespace(data={"m1": meter_data})
    return mgr


def test_current_rate_uses_tou_window() -> None:
    """At 03:00 UTC (off-peak window) the tracker rate is 7p, not the mean."""
    meter_data = {
        "tariff_unit_rate": 0.19,  # schedule mean of 7/25/25
        "tariff_is_tou": True,
        "tariff_code": "E-1R-NEXT-DRIVE-01",
        "unit_rate": 0.19,
        "tariff_rates_schedule": [
            {"value": 7.0, "validFrom": _ts(2), "validTo": _ts(5)},
            {"value": 25.0, "validFrom": _ts(5), "validTo": _ts(8)},
        ],
    }
    mgr = _manager_with_data(meter_data)
    with patch("homeassistant.util.dt.utcnow", return_value=_REF_UTC):
        rate = mgr._current_rate("m1")
    assert rate == 0.07


def test_current_rate_flat_tariff() -> None:
    meter_data = {
        "tariff_unit_rate": 0.22,
        "tariff_is_tou": False,
        "unit_rate": 0.22,
    }
    mgr = _manager_with_data(meter_data)
    rate = mgr._current_rate("m1")
    assert rate == 0.22


def test_current_rate_none_without_meter_data() -> None:
    mgr = EonNextCostTrackerManager.__new__(EonNextCostTrackerManager)
    mgr.coordinator = SimpleNamespace(data=None)
    assert mgr._current_rate("m1") is None
