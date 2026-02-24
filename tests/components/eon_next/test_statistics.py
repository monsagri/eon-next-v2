"""Unit tests for Eon Next statistics helpers."""

from __future__ import annotations

from datetime import datetime, timezone

from custom_components.eon_next.statistics import (
    _group_consumption_by_hour,
    statistic_id_for_meter,
)


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
        {"interval_start": "2026-02-24T00:10:00Z", "consumption": 1.25},
        {"interval_start": "2026-02-24T00:45:00Z", "consumption": "2.0"},
        # 01:15+01:00 is 00:15 UTC -> same UTC hour bucket
        {"interval_start": "2026-02-24T01:15:00+01:00", "consumption": 0.75},
        # Naive timestamps are treated as UTC in this integration.
        {"interval_start": "2026-02-24T02:00:00", "consumption": 3},
        {"interval_start": "not-a-date", "consumption": 100},
        {"interval_start": "2026-02-24T03:00:00Z", "consumption": "bad"},
    ]

    grouped = _group_consumption_by_hour(entries)

    assert grouped == {
        datetime(2026, 2, 24, 0, 0, tzinfo=timezone.utc): 4.0,
        datetime(2026, 2, 24, 2, 0, tzinfo=timezone.utc): 3.0,
    }
