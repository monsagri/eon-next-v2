"""Regression tests: cost-tracker storage writes are debounced (spec 05, 5.1)."""

from __future__ import annotations

from unittest.mock import AsyncMock, Mock

import pytest

from custom_components.eon_next.cost_tracker import (
    _SAVE_DELAY_SECONDS,
    CostTrackerConfig,
    CostTrackerRuntime,
    CostTrackerState,
    EonNextCostTrackerManager,
)


def _manager_with_mock_store(trackers=None) -> EonNextCostTrackerManager:
    mgr = EonNextCostTrackerManager.__new__(EonNextCostTrackerManager)
    mgr._store = Mock()
    mgr._store.async_save = AsyncMock()
    mgr._store.async_delay_save = Mock()
    mgr._trackers = trackers or {}
    return mgr


def _runtime() -> CostTrackerRuntime:
    return CostTrackerRuntime(
        config=CostTrackerConfig(
            id="t1",
            name="Washer",
            tracked_entity_id="sensor.washer_energy",
            meter_serial="m1",
            enabled=True,
        ),
        state=CostTrackerState(today_consumption_kwh=1.5, today_cost=0.3),
    )


def test_delay_save_debounces_via_store() -> None:
    """The hot path schedules a delayed save rather than writing immediately."""
    mgr = _manager_with_mock_store()
    mgr._delay_save()

    mgr._store.async_delay_save.assert_called_once_with(
        mgr._snapshot, _SAVE_DELAY_SECONDS
    )
    mgr._store.async_save.assert_not_called()


@pytest.mark.asyncio
async def test_save_writes_immediately() -> None:
    """Structural/shutdown saves persist immediately with the full snapshot."""
    mgr = _manager_with_mock_store({"t1": _runtime()})
    await mgr._save()

    mgr._store.async_save.assert_awaited_once()
    payload = mgr._store.async_save.await_args.args[0]
    assert payload["trackers"][0]["id"] == "t1"
    assert payload["trackers"][0]["today_cost"] == 0.3


@pytest.mark.asyncio
async def test_shutdown_flushes_pending_state() -> None:
    """async_shutdown flushes immediately so a pending delayed write isn't lost."""
    mgr = _manager_with_mock_store({"t1": _runtime()})
    await mgr.async_shutdown()

    mgr._store.async_save.assert_awaited_once()


def test_snapshot_is_json_serializable_shape() -> None:
    mgr = _manager_with_mock_store({"t1": _runtime()})
    snap = mgr._snapshot()
    assert list(snap) == ["trackers"]
    entry = snap["trackers"][0]
    assert entry["tracked_entity_id"] == "sensor.washer_energy"
    assert entry["enabled"] is True
