"""Unit tests for historical backfill manager."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock

import pytest

from custom_components.eon_next import backfill as backfill_module
from custom_components.eon_next.backfill import EonNextBackfillManager
from custom_components.eon_next.const import (
    CONF_BACKFILL_CHUNK_DAYS,
    CONF_BACKFILL_DELAY_SECONDS,
    CONF_BACKFILL_ENABLED,
    CONF_BACKFILL_LOOKBACK_DAYS,
    CONF_BACKFILL_REBUILD_STATISTICS,
    CONF_BACKFILL_REQUESTS_PER_RUN,
)

# Dynamic reference dates — keep tests valid regardless of when they run.
_REF_DT = datetime.now(tz=timezone.utc).replace(
    hour=0, minute=0, second=0, microsecond=0,
)
_REF_DATE = _REF_DT.date()
_REF_DATE_ISO = _REF_DATE.isoformat()
_REF_PREV_ISO = (_REF_DATE - timedelta(days=1)).isoformat()
_REF_NEXT_ISO = (_REF_DATE + timedelta(days=1)).isoformat()
_REF_PLUS2_ISO = (_REF_DATE + timedelta(days=2)).isoformat()
_LOOKBACK_START_ISO = (_REF_DATE - timedelta(days=9)).isoformat()  # 10-day lookback


def _meter(serial: str, meter_type: str = "electricity") -> SimpleNamespace:
    return SimpleNamespace(
        serial=serial,
        type=meter_type,
        supply_point_id=f"sp-{serial}",
    )


def _manager(
    options: dict,
    meters: list[SimpleNamespace],
) -> EonNextBackfillManager:
    hass = SimpleNamespace(
        data={},
        config=SimpleNamespace(config_dir="/tmp"),
    )
    entry = SimpleNamespace(
        entry_id="entry123",
        options=options,
        async_create_background_task=Mock(),
    )
    api = SimpleNamespace(accounts=[SimpleNamespace(meters=meters)])
    coordinator = SimpleNamespace(set_statistics_import_enabled=Mock())
    return EonNextBackfillManager(hass, entry, api, coordinator)


def test_get_status_disabled_by_default() -> None:
    """Backfill status should be disabled when option is off."""
    manager = _manager({}, [_meter("m1"), _meter("m2")])
    manager._state = {
        "initialized": False,
        "rebuild_done": False,
        "lookback_days": 0,
        "meters": {},
    }

    status = manager.get_status()
    assert status["state"] == "disabled"
    assert status["total_meters"] == 2
    assert status["pending_meters"] == 2


def test_get_status_running_and_completed() -> None:
    """Status transitions from running to completed when all cursors are done."""
    manager = _manager({CONF_BACKFILL_ENABLED: True}, [_meter("m1"), _meter("m2")])
    manager._state = {
        "initialized": True,
        "rebuild_done": True,
        "lookback_days": 3650,
        "meters": {
            "m1": {"next_start": _REF_NEXT_ISO, "done": False},
            "m2": {"next_start": _REF_DATE_ISO, "done": True},
        },
    }

    status = manager.get_status()
    assert status["state"] == "running"
    assert status["completed_meters"] == 1
    assert status["pending_meters"] == 1
    assert status["next_start_date"] == _REF_NEXT_ISO

    manager._state["meters"]["m1"]["done"] = True
    manager._state["meters"]["m1"]["next_start"] = _REF_PLUS2_ISO
    status = manager.get_status()
    assert status["state"] == "completed"
    assert status["pending_meters"] == 0


@pytest.mark.asyncio
async def test_initialize_or_reset_progress_uses_lookback(monkeypatch) -> None:
    """Initialization should seed one cursor per meter using lookback setting."""
    manager = _manager(
        {
            CONF_BACKFILL_ENABLED: True,
            CONF_BACKFILL_LOOKBACK_DAYS: 10,
        },
        [_meter("m1"), _meter("m2", "gas")],
    )
    manager._state = {
        "initialized": False,
        "rebuild_done": False,
        "lookback_days": 0,
        "meters": {},
    }
    manager._save_state = AsyncMock()  # type: ignore[method-assign]
    monkeypatch.setattr(
        backfill_module.dt_util,
        "now",
        lambda: _REF_DT,
    )

    await manager._initialize_or_reset_progress(manager._eligible_meters())

    assert manager._state["initialized"] is True
    assert manager._state["lookback_days"] == 10
    assert manager._state["meters"]["m1"]["next_start"] == _LOOKBACK_START_ISO
    assert manager._state["meters"]["m2"]["next_start"] == _LOOKBACK_START_ISO


@pytest.mark.asyncio
async def test_clear_existing_statistics_without_rebuild_marks_done() -> None:
    """Without rebuild enabled, manager should skip clearing and mark rebuild done."""
    manager = _manager(
        {
            CONF_BACKFILL_ENABLED: True,
            CONF_BACKFILL_REBUILD_STATISTICS: False,
        },
        [_meter("m1")],
    )
    manager._state = {
        "initialized": True,
        "rebuild_done": False,
        "lookback_days": 3650,
        "meters": {"m1": {"next_start": _REF_DATE_ISO, "done": False}},
    }
    manager._save_state = AsyncMock()  # type: ignore[method-assign]

    await manager._clear_existing_statistics(manager._eligible_meters())

    assert manager._state["rebuild_done"] is True
    manager._save_state.assert_awaited_once()


@pytest.mark.asyncio
async def test_run_backfill_cycle_advances_cursor_and_imports(monkeypatch) -> None:
    """A cycle should import one chunk and advance meter cursor."""
    meter = _meter("m1", "electricity")
    manager = _manager(
        {
            CONF_BACKFILL_ENABLED: True,
            CONF_BACKFILL_CHUNK_DAYS: 1,
            CONF_BACKFILL_REQUESTS_PER_RUN: 1,
            CONF_BACKFILL_DELAY_SECONDS: 0,
        },
        [meter],
    )
    manager._state = {
        "initialized": True,
        "rebuild_done": True,
        "lookback_days": 3650,
        "meters": {"m1": {"next_start": _REF_DATE_ISO, "done": False}},
    }
    manager._save_state = AsyncMock()  # type: ignore[method-assign]
    manager.api.async_get_consumption_data_by_mpxn_range = AsyncMock(  # type: ignore[attr-defined]
        return_value=[{"interval_start": _REF_DATE_ISO, "consumption": 1.5}]
    )
    import_mock = AsyncMock()
    monkeypatch.setattr(
        backfill_module,
        "async_import_consumption_statistics",
        import_mock,
    )
    monkeypatch.setattr(
        backfill_module.dt_util,
        "now",
        lambda: _REF_DT.replace(hour=12),
    )

    await manager._run_backfill_cycle()

    manager.api.async_get_consumption_data_by_mpxn_range.assert_awaited_once()
    import_mock.assert_awaited_once()
    assert manager._state["meters"]["m1"]["next_start"] == _REF_NEXT_ISO
    assert manager._state["meters"]["m1"]["done"] is True
    # paused while pending, resumed when completed
    assert manager.coordinator.set_statistics_import_enabled.call_args_list[-1].args == (True,)
