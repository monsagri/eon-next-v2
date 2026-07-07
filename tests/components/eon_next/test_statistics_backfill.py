"""Recorder-backed tests for recompute-forward historical import (2.4 / 2.5).

Verifies that splicing an earlier chunk into an existing series keeps the
cumulative sums monotonic and preserves the per-hour deltas of later rows —
the property that lets historical backfill run without suspending live
imports.
"""

from __future__ import annotations

from collections.abc import Generator
from datetime import datetime, timedelta, timezone
import logging
from unittest.mock import patch

import pytest

from homeassistant.components.recorder.statistics import statistics_during_period
from homeassistant.core import HomeAssistant
from homeassistant.helpers import recorder as recorder_helper
from homeassistant.setup import async_setup_component

from custom_components.eon_next.statistics import (
    async_import_consumption_statistics,
    async_import_historical_statistics,
    statistic_id_for_meter,
)

# Fixed, comfortably-past reference days so the buckets never collide with
# "today" or with each other.
_NOW = datetime.now(tz=timezone.utc)
_DAY_A = (_NOW - timedelta(days=3)).replace(
    hour=0, minute=0, second=0, microsecond=0
)
_DAY_B = (_NOW - timedelta(days=5)).replace(
    hour=0, minute=0, second=0, microsecond=0
)


@pytest.fixture(autouse=True)
def _quiet_sqlalchemy_engine_logs() -> Generator[None, None, None]:
    logger = logging.getLogger("sqlalchemy.engine")
    previous_level = logger.level
    logger.setLevel(logging.WARNING)
    try:
        yield
    finally:
        logger.setLevel(previous_level)


async def _ensure_recorder(hass: HomeAssistant) -> None:
    if "recorder" in hass.config.components:
        return
    recorder_helper.async_initialize_recorder(hass)
    with patch("homeassistant.components.recorder.ALLOW_IN_MEMORY_DB", True):
        assert await async_setup_component(
            hass,
            "recorder",
            {"recorder": {"db_url": "sqlite://", "commit_interval": 0}},
        )
    await hass.async_block_till_done()
    await hass.data[recorder_helper.DATA_RECORDER].db_connected


def _entry(when: datetime, kwh: float) -> dict:
    return {"interval_start": when.isoformat(), "consumption": kwh}


async def _flush(hass: HomeAssistant) -> None:
    """Drain the recorder queue so writes are committed and readable.

    The historical import reads back existing rows to recompute sums, so each
    write must be durable before the next import runs.
    """
    from homeassistant.helpers.recorder import get_instance

    await hass.async_block_till_done()
    await get_instance(hass).async_block_till_done()
    await hass.async_block_till_done()


async def _read_sums(hass: HomeAssistant, meter: str) -> list[float]:
    from homeassistant.helpers.recorder import get_instance

    stat_id = statistic_id_for_meter(meter, "electricity")
    await _flush(hass)

    data = await get_instance(hass).async_add_executor_job(
        statistics_during_period,
        hass,
        _DAY_B - timedelta(days=1),
        _NOW + timedelta(days=1),
        {stat_id},
        "hour",
        None,
        {"sum"},
    )
    rows = sorted(data.get(stat_id, []), key=lambda r: r["start"])
    return [float(r["sum"]) for r in rows]


@pytest.mark.asyncio
async def test_earlier_chunk_splices_and_shifts_sums(hass: HomeAssistant) -> None:
    """Importing an earlier day rewrites later sums but keeps them monotonic."""
    await _ensure_recorder(hass)
    meter = "SPLICE-METER"  # unique serial to isolate recorder state

    # Day A first (nothing exists): sums 1, 2.
    await async_import_historical_statistics(
        hass, meter, "electricity",
        [_entry(_DAY_A, 1.0), _entry(_DAY_A + timedelta(hours=1), 1.0)],
    )
    assert await _read_sums(hass, meter) == [1.0, 2.0]
    await _flush(hass)

    # Day B is earlier: it splices in below A, shifting A's sums up by B's total
    # while A's per-hour deltas (1.0 each) are preserved.
    await async_import_historical_statistics(
        hass, meter, "electricity",
        [_entry(_DAY_B, 2.0), _entry(_DAY_B + timedelta(hours=1), 2.0)],
    )

    sums = await _read_sums(hass, meter)
    assert sums == [2.0, 4.0, 5.0, 6.0]
    # Monotonic non-decreasing.
    assert all(b >= a for a, b in zip(sums, sums[1:]))


@pytest.mark.asyncio
async def test_live_append_survives_later_backfill(hass: HomeAssistant) -> None:
    """A live-appended row stays intact when an earlier chunk is backfilled."""
    await _ensure_recorder(hass)
    meter = "COEXIST-METER"  # unique serial to isolate recorder state

    # Live append at Day A.
    await async_import_consumption_statistics(
        hass, meter, "electricity", [_entry(_DAY_A, 3.0)]
    )
    assert await _read_sums(hass, meter) == [3.0]
    await _flush(hass)

    # Backfill an earlier day; the live row's sum shifts up but its delta holds.
    await async_import_historical_statistics(
        hass, meter, "electricity", [_entry(_DAY_B, 5.0)]
    )

    sums = await _read_sums(hass, meter)
    # Day B (5) then Day A (5 + 3 = 8).
    assert sums == [5.0, 8.0]
