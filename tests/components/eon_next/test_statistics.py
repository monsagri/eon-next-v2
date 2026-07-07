"""Unit tests for Eon Next statistics helpers."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock

import pytest

import custom_components.eon_next.statistics as stats_module
from custom_components.eon_next.statistics import (
    StatisticsLookupError,
    _group_consumption_by_hour,
    _merge_and_recompute_series,
    async_import_consumption_statistics,
    statistic_id_for_meter,
)


def _h(hour: int) -> datetime:
    """A UTC hour bucket derived from the reference date."""
    return _REF_DT.replace(hour=hour)

# Dynamic reference date so tests remain valid regardless of when they run.
_REF_DT = datetime.now(tz=timezone.utc).replace(
    hour=0, minute=0, second=0, microsecond=0,
) - timedelta(days=1)  # yesterday midnight UTC
_REF_DATE_STR = _REF_DT.strftime("%Y-%m-%d")


def test_statistic_id_for_meter_supported_types() -> None:
    """Supported meter types map to stable statistic IDs."""
    assert (
        statistic_id_for_meter("ABC-123", "electricity")
        == "eon_next:electricity_abc_123_consumption"
    )
    assert statistic_id_for_meter("GAS.01", "gas") == "eon_next:gas_gas_01_consumption"


def test_statistic_id_for_meter_unknown_type() -> None:
    """Unknown meter types are ignored."""
    assert statistic_id_for_meter("ABC-123", "unknown") is None


def test_group_consumption_by_hour_handles_mixed_timestamps() -> None:
    """Hourly grouping normalizes timezone-aware and naive timestamps."""
    entries = [
        {"interval_start": f"{_REF_DATE_STR}T00:10:00Z", "consumption": 1.25},
        {"interval_start": f"{_REF_DATE_STR}T00:45:00Z", "consumption": "2.0"},
        # 01:15+01:00 is 00:15 UTC -> same UTC hour bucket
        {"interval_start": f"{_REF_DATE_STR}T01:15:00+01:00", "consumption": 0.75},
        # Naive timestamps are treated as UTC in this integration.
        {"interval_start": f"{_REF_DATE_STR}T02:00:00", "consumption": 3},
        {"interval_start": "not-a-date", "consumption": 100},
        {"interval_start": f"{_REF_DATE_STR}T03:00:00Z", "consumption": "bad"},
    ]

    grouped = _group_consumption_by_hour(entries)

    assert grouped == {
        _REF_DT.replace(hour=0): 4.0,
        _REF_DT.replace(hour=2): 3.0,
    }


@pytest.mark.asyncio
async def test_import_skips_when_last_stat_lookup_fails(monkeypatch) -> None:
    """A recorder lookup failure must skip the import entirely (spec 02, 2.1).

    Importing with a guessed zero base would overwrite existing rows with
    regressed cumulative sums (a large negative spike in the Energy Dashboard).
    """

    async def _raise(*_args, **_kwargs):
        raise StatisticsLookupError("recorder busy")

    monkeypatch.setattr(stats_module, "_get_last_stat", _raise)

    import homeassistant.components.recorder.statistics as recorder_stats

    add_mock = MagicMock()
    monkeypatch.setattr(recorder_stats, "async_add_external_statistics", add_mock)

    entries = [{"interval_start": f"{_REF_DATE_STR}T00:00:00Z", "consumption": 1.0}]
    await async_import_consumption_statistics(
        MagicMock(), "ABC-123", "electricity", entries
    )

    add_mock.assert_not_called()


# --- 2.4/2.5: recompute-forward historical splice ---


class TestMergeAndRecomputeSeries:
    def test_splices_new_hours_below_and_shifts_existing_sums(self) -> None:
        """Inserting an earlier hour raises every later cumulative sum by its kWh."""
        # existing: h2=10kWh (sum 10), h3=5kWh (sum 15) from baseline 0.
        existing = [(_h(2), 10.0), (_h(3), 15.0)]
        new = {_h(1): 4.0}
        result = _merge_and_recompute_series(0.0, existing, new)
        assert result == [(_h(1), 4.0), (_h(2), 14.0), (_h(3), 19.0)]

    def test_new_value_overwrites_existing_hour(self) -> None:
        existing = [(_h(2), 10.0)]
        result = _merge_and_recompute_series(0.0, existing, {_h(2): 3.0})
        assert result == [(_h(2), 3.0)]

    def test_baseline_offset_is_preserved(self) -> None:
        """A nonzero baseline just shifts the whole series — deltas unchanged."""
        existing = [(_h(2), 110.0)]  # h2 = 10kWh above baseline 100
        result = _merge_and_recompute_series(100.0, existing, {_h(1): 5.0})
        assert result == [(_h(1), 105.0), (_h(2), 115.0)]

    def test_output_is_monotonic(self) -> None:
        existing = [(_h(4), 8.0), (_h(6), 12.0)]
        new = {_h(1): 3.0, _h(5): 2.0}
        result = _merge_and_recompute_series(0.0, existing, new)
        sums = [s for _, s in result]
        assert sums == sorted(sums)
        assert all(b >= a for a, b in zip(sums, sums[1:]))
