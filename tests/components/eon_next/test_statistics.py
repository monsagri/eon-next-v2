"""Unit tests for Eon Next statistics helpers."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from custom_components.eon_next.statistics import (
    _group_consumption_by_hour,
    statistic_id_for_meter,
)

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
