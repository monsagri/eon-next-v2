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
    _merge_and_recompute_series,
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


async def _read_sums(
    hass: HomeAssistant, meter: str, *, expect: int | None = None
) -> list[float]:
    """Read stored cumulative sums, settling the async recorder first.

    ``async_add_external_statistics`` only queues the write, and in-process the
    executor read can momentarily race ahead of the applied rows.  Poll with a
    flush between attempts until at least ``expect`` rows are visible (or the
    attempt budget is spent) so the assertion runs against a settled series
    rather than a half-applied one — deterministic, and a genuinely wrong merge
    still fails because the values won't match.
    """
    from homeassistant.helpers.recorder import get_instance

    stat_id = statistic_id_for_meter(meter, "electricity")
    rows: list = []
    for _ in range(50):
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
        if expect is None or len(rows) >= expect:
            break
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
    assert await _read_sums(hass, meter, expect=2) == [1.0, 2.0]
    await _flush(hass)

    # Day B is earlier: it splices in below A, shifting A's sums up by B's total
    # while A's per-hour deltas (1.0 each) are preserved.
    await async_import_historical_statistics(
        hass, meter, "electricity",
        [_entry(_DAY_B, 2.0), _entry(_DAY_B + timedelta(hours=1), 2.0)],
    )

    sums = await _read_sums(hass, meter, expect=4)
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
    assert await _read_sums(hass, meter, expect=1) == [3.0]
    await _flush(hass)

    # Backfill an earlier day; the live row's sum shifts up but its delta holds.
    await async_import_historical_statistics(
        hass, meter, "electricity", [_entry(_DAY_B, 5.0)]
    )

    sums = await _read_sums(hass, meter, expect=2)
    # Day B (5) then Day A (5 + 3 = 8).
    assert sums == [5.0, 8.0]


# --- Pure-function tests for the recompute-forward merge (no recorder) --------
#
# These exercise _merge_and_recompute_series directly, so they are fully
# deterministic and cover the splice/monotonicity property (2.4/2.5) and the
# daily-vs-half-hourly double-count guard (the "yesterday" fix).

_MIDNIGHT = datetime(2026, 6, 1, 0, 0, tzinfo=timezone.utc)


def test_merge_splices_earlier_chunk_and_preserves_deltas() -> None:
    """An earlier chunk shifts later sums up while keeping per-hour deltas."""
    # Existing Day-A series (sums 1, 2), nothing before it.
    day_a = _MIDNIGHT + timedelta(days=2)
    existing = [(day_a, 1.0), (day_a + timedelta(hours=1), 2.0)]
    # Splice in an earlier Day-B (2 kWh per hour).
    new = {_MIDNIGHT: 2.0, _MIDNIGHT + timedelta(hours=1): 2.0}

    series = _merge_and_recompute_series(0.0, existing, new)

    sums = [s for _, s in series]
    assert sums == [2.0, 4.0, 5.0, 6.0]
    assert all(b >= a for a, b in zip(sums, sums[1:]))  # monotonic
    # Day A's own deltas (1.0 each) survive the rebase.
    assert round(series[2][1] - series[1][1], 3) == 1.0
    assert round(series[3][1] - series[2][1], 3) == 1.0


def test_merge_daily_bucket_skipped_when_finer_rows_exist() -> None:
    """A daily bucket must not double-count a day the coordinator already
    imported at half-hourly (hourly) resolution."""
    baseline = 10.0
    # 24 existing hourly rows for one day, 0.5 kWh each (day total 12.0).
    existing = [
        (_MIDNIGHT + timedelta(hours=i), round(baseline + 0.5 * (i + 1), 3))
        for i in range(24)
    ]
    # Backfill offers the same day as a single daily bucket (30 kWh) — a value
    # that, if applied on top, would inflate the day massively.
    new = {_MIDNIGHT: 30.0}

    series = _merge_and_recompute_series(
        baseline, existing, new, daily_granularity=True
    )

    # Daily bucket skipped: the finer series is preserved unchanged.
    assert series == existing
    assert len(series) == 24
    # Day total is the real 12.0, not doubled.
    assert round(series[-1][1] - baseline, 3) == 12.0


def test_merge_daily_bucket_applied_when_only_coarse_row_exists() -> None:
    """With no finer data (fresh day, or a prior daily import), the daily
    bucket is authoritative and overwrites."""
    # No existing rows: a fresh daily import lands.
    fresh = _merge_and_recompute_series(4.0, [], {_MIDNIGHT: 5.0}, daily_granularity=True)
    assert fresh == [(_MIDNIGHT, 9.0)]

    # A single prior daily row for the day is refreshed, not preserved.
    refreshed = _merge_and_recompute_series(
        4.0, [(_MIDNIGHT, 7.0)], {_MIDNIGHT: 5.0}, daily_granularity=True
    )
    assert refreshed == [(_MIDNIGHT, 9.0)]


def test_merge_hourly_granularity_never_skips() -> None:
    """Without the daily flag, new hours always overwrite (live-import path)."""
    existing = [
        (_MIDNIGHT + timedelta(hours=i), round(0.5 * (i + 1), 3)) for i in range(24)
    ]
    new = {_MIDNIGHT: 2.0}  # a corrected hour, same timestamp as existing[0]
    series = _merge_and_recompute_series(0.0, existing, new)  # daily_granularity=False
    # The new value replaced hour 0 (0.5 -> 2.0), so the whole series shifts +1.5.
    assert series[0][1] == 2.0
    assert len(series) == 24
