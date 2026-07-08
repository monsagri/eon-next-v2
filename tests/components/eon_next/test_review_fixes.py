"""Regression tests for the July 2026 code-review medium/low fixes."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

import pytest

from homeassistant.core import State

from custom_components.eon_next.cost_tracker import (
    CostTrackerConfig,
    CostTrackerRuntime,
    CostTrackerState,
    EonNextCostTrackerManager,
)
from custom_components.eon_next.eonnext import EonNext
from custom_components.eon_next.tariff_patterns import get_tariff_pattern


# ── 4.9 Agreement selection compares dates, not datetime strings ──────────


def test_active_agreement_starting_today_is_selected() -> None:
    """An agreement whose validFrom is today (as an ISO datetime) is active."""
    today = datetime.now(tz=timezone.utc).date()
    agreements = [
        {
            "validFrom": f"{today.isoformat()}T00:00:00+00:00",
            "validTo": None,
            "tariff": {
                "__typename": "StandardTariff",
                "displayName": "Next Flex",
                "tariffCode": "E-1R-NEXT-FLEX-01",
                "unitRate": 22.0,
                "standingCharge": 40.0,
            },
        }
    ]
    active = EonNext._find_active_agreement(agreements, today.isoformat())
    assert active is not None
    assert active["tariff_code"] == "E-1R-NEXT-FLEX-01"


def test_future_agreement_is_skipped() -> None:
    today = datetime.now(tz=timezone.utc).date()
    tomorrow = today + timedelta(days=1)
    agreements = [
        {
            "validFrom": f"{tomorrow.isoformat()}T00:00:00+00:00",
            "validTo": None,
            "tariff": {"__typename": "StandardTariff", "unitRate": 22.0},
        }
    ]
    assert EonNext._find_active_agreement(agreements, today.isoformat()) is None


# ── 4.6 Tariff pattern matches whole code segments, not substrings ────────


def test_pattern_matches_hyphenated_segment() -> None:
    assert get_tariff_pattern("E-1R-NEXT-DRIVE-JAN-2024-A-C") is not None


def test_pattern_does_not_match_substring_run_together() -> None:
    # "NEXTDRIVE" (no hyphen) must not match the "NEXT-DRIVE" pattern.
    assert get_tariff_pattern("E-1R-NEXTDRIVE-01") is None


# ── 4.4 Off-peak detection: tolerance + dynamic tariffs ───────────────────


def _tou_meter(schedule: list[dict[str, Any]]) -> dict[str, Any]:
    return {
        "tariff_unit_rate": 0.10,
        "tariff_is_tou": True,
        "tariff_code": "E-1R-AGILE-01",
        "tariff_rates_schedule": schedule,
    }


def test_dynamic_tariff_off_peak_uses_cheap_quantile() -> None:
    """On many-tier (dynamic) tariffs the cheapest slots count as off-peak."""
    from custom_components.eon_next.tariff_helpers import _is_off_peak_rate

    # 12 distinct rising rates 1..12 pence.
    schedule = [{"value": float(v)} for v in range(1, 13)]
    # A cheap slot (2p) is off-peak; a mid/high slot (9p) is not — even though
    # 9p is not the schedule maximum.
    assert _is_off_peak_rate(2.0, schedule) is True
    assert _is_off_peak_rate(9.0, schedule) is False


def test_discrete_tariff_off_peak_tolerates_float_noise() -> None:
    from custom_components.eon_next.tariff_helpers import _is_off_peak_rate

    schedule = [{"value": 7.0}, {"value": 25.0}]
    # A sub-penny difference from the cheapest tier still reads as off-peak.
    assert _is_off_peak_rate(7.02, schedule) is True
    assert _is_off_peak_rate(25.0, schedule) is False


# ── 5.8 / 5.3 Cost tracker delta handling ─────────────────────────────────


def _bare_manager() -> EonNextCostTrackerManager:
    mgr = EonNextCostTrackerManager.__new__(EonNextCostTrackerManager)
    mgr._shutdown = False
    mgr._trackers = {}
    mgr._state_listeners = {}
    return mgr


def _state(entity_id: str, value: str, unit: str, when: datetime) -> State:
    return State(
        entity_id,
        value,
        {"unit_of_measurement": unit},
        last_updated=when,
        last_changed=when,
    )


def test_power_delta_uses_previous_states_unit() -> None:
    """A W↔kW flip between updates must not mis-scale the interval (5.8)."""
    mgr = _bare_manager()
    runtime = CostTrackerRuntime(
        config=CostTrackerConfig(
            id="t1",
            name="EV",
            tracked_entity_id="sensor.ev_power",
            meter_serial="m1",
        ),
        state=CostTrackerState(),
    )
    t0 = datetime(2026, 1, 1, 0, 0, tzinfo=timezone.utc)
    t1 = t0 + timedelta(hours=1)
    old = _state("sensor.ev_power", "2", "kW", t0)  # 2 kW for one hour
    new = _state("sensor.ev_power", "2000", "W", t1)  # unit flipped to W
    # Integrate the PREVIOUS reading over the interval using its own unit:
    # 2 kW * 1 h = 2 kWh (not 2/1000).
    delta = mgr._delta_kwh(runtime, old, new, "W")
    assert delta == pytest.approx(2.0)


@pytest.mark.asyncio
async def test_disabled_tracker_advances_energy_baseline(hass) -> None:
    """A paused tracker keeps its baseline current so re-enabling doesn't
    bill the whole paused span in one lump (5.3)."""
    del hass  # fixture only to run under the HA event-loop lifecycle
    mgr = _bare_manager()
    runtime = CostTrackerRuntime(
        config=CostTrackerConfig(
            id="t1",
            name="EV",
            tracked_entity_id="sensor.ev_energy",
            meter_serial="m1",
            enabled=False,
        ),
        state=CostTrackerState(last_reset=datetime.now().isoformat()),
    )
    mgr._trackers["t1"] = runtime

    now = datetime.now(tz=timezone.utc)
    event = _fake_event(
        old=_state("sensor.ev_energy", "5", "kWh", now),
        new=_state("sensor.ev_energy", "8", "kWh", now),
    )
    await mgr._async_handle_state_change("t1", event)

    # Baseline advanced to 8 while disabled; no cost accrued.
    assert runtime.state.last_energy_value == 8.0
    assert runtime.state.today_cost == 0.0


class _FakeEvent:
    def __init__(self, data: dict[str, Any]) -> None:
        self.data = data


def _fake_event(old: State, new: State) -> Any:
    return _FakeEvent({"old_state": old, "new_state": new})
