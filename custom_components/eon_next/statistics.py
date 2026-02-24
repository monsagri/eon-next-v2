"""External statistics import for the Eon Next integration.

Imports half-hourly (or daily) consumption data as external statistics
with correct timestamps so the Energy Dashboard attributes consumption
to the right period — even when data arrives late.
"""

from __future__ import annotations

import logging
import re
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import Any

from homeassistant.core import HomeAssistant
from homeassistant.util import dt as dt_util

from .const import DOMAIN

_LOGGER = logging.getLogger(__name__)

_VALID_ID_CHAR = re.compile(r"[^a-z0-9]")


def _sanitize_id(value: str) -> str:
    """Convert a string to a valid statistic ID component."""
    sanitized = _VALID_ID_CHAR.sub("_", value.lower())
    sanitized = re.sub(r"_+", "_", sanitized)
    return sanitized.strip("_")


def _hour_start(dt: datetime) -> datetime:
    """Round a datetime down to the start of its hour (UTC)."""
    return dt.replace(minute=0, second=0, microsecond=0)


def _group_consumption_by_hour(
    entries: list[dict[str, Any]],
) -> dict[datetime, float]:
    """Aggregate consumption entries into hourly UTC buckets."""
    hourly: dict[datetime, float] = defaultdict(float)

    for entry in entries:
        interval_start = entry.get("interval_start")
        consumption = entry.get("consumption")
        if not interval_start or consumption is None:
            continue

        try:
            val = float(consumption)
        except (TypeError, ValueError):
            continue

        parsed = dt_util.parse_datetime(str(interval_start))
        if parsed is None:
            continue

        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)
        else:
            parsed = dt_util.as_utc(parsed)

        hourly[_hour_start(parsed)] += val

    return dict(hourly)


async def _get_last_sum(
    hass: HomeAssistant,
    statistic_id: str,
    before: datetime,
) -> float:
    """Retrieve the last cumulative sum so new imports continue from it."""
    try:
        from homeassistant.components.recorder import get_instance
        from homeassistant.components.recorder.statistics import (
            get_last_statistics,
            statistics_during_period,
        )

        # Prefer latest available sum regardless of age to preserve continuity
        # across long data gaps.
        result = await get_instance(hass).async_add_executor_job(
            get_last_statistics,
            hass,
            1,
            statistic_id,
            True,
            {"sum"},
        )
        if statistic_id in result and result[statistic_id]:
            return float(result[statistic_id][0].get("sum", 0.0) or 0.0)

        # Backward-compatible fallback for older recorder implementations.
        fallback = await get_instance(hass).async_add_executor_job(
            statistics_during_period,
            hass,
            before - timedelta(days=7),
            before,
            {statistic_id},
            "hour",
            None,
            {"sum"},
        )
        if statistic_id in fallback and fallback[statistic_id]:
            return float(fallback[statistic_id][-1].get("sum", 0.0) or 0.0)
    except Exception as err:  # pylint: disable=broad-except
        _LOGGER.debug(
            "Could not retrieve last statistics sum for %s: %s",
            statistic_id,
            err,
        )

    return 0.0


async def async_import_consumption_statistics(
    hass: HomeAssistant,
    meter_serial: str,
    meter_type: str,
    consumption_entries: list[dict[str, Any]],
) -> None:
    """Import consumption data as external statistics with correct timestamps.

    Aggregates half-hourly (or daily) entries into hourly buckets, retrieves
    the last known cumulative sum, and calls ``async_add_external_statistics``
    so the Energy Dashboard shows consumption in the correct time period.
    """
    try:
        from homeassistant.components.recorder.models import (
            StatisticData,
            StatisticMetaData,
        )
        from homeassistant.components.recorder.statistics import (
            async_add_external_statistics,
        )
    except ImportError:
        _LOGGER.debug("Recorder not available, skipping statistics import")
        return

    hourly = _group_consumption_by_hour(consumption_entries)
    if not hourly:
        return

    sanitized_serial = _sanitize_id(meter_serial)
    fuel = "gas" if meter_type == "gas" else "electricity"
    statistic_id = f"{DOMAIN}:{fuel}_{sanitized_serial}_consumption"

    metadata_dict: dict[str, Any] = {
        "has_sum": True,
        "name": f"{meter_serial} {fuel.title()} Consumption",
        "source": DOMAIN,
        "statistic_id": statistic_id,
        "unit_of_measurement": "kWh",
        "unit_class": "energy",
    }

    # Use mean_type (modern HA) with has_mean fallback (older HA).
    try:
        from homeassistant.components.recorder.models import StatisticMeanType

        metadata_dict["mean_type"] = StatisticMeanType.NONE
    except ImportError:
        metadata_dict["has_mean"] = False

    sorted_hours = sorted(hourly.keys())
    last_sum = await _get_last_sum(hass, statistic_id, sorted_hours[0])

    statistics: list[StatisticData] = []
    cumulative_sum = last_sum
    for hour in sorted_hours:
        kwh = round(hourly[hour], 3)
        cumulative_sum = round(cumulative_sum + kwh, 3)
        statistics.append(
            StatisticData(
                start=hour,
                state=cumulative_sum,
                sum=cumulative_sum,
            )
        )

    async_add_external_statistics(
        hass, StatisticMetaData(**metadata_dict), statistics
    )
    _LOGGER.debug(
        "Imported %d hourly statistics for %s",
        len(statistics),
        statistic_id,
    )
