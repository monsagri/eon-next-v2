"""External statistics import for the Eon Next integration.

Imports half-hourly (or daily) consumption data as external statistics
with correct timestamps so the Energy Dashboard attributes consumption
to the right period - even when data arrives late.
"""

from __future__ import annotations

import logging
import re
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import Any

from homeassistant.const import UnitOfEnergy
from homeassistant.core import HomeAssistant
from homeassistant.util import dt as dt_util

from .const import DOMAIN
from .eonnext import METER_TYPE_ELECTRIC, METER_TYPE_GAS

_LOGGER = logging.getLogger(__name__)

_VALID_ID_CHAR = re.compile(r"[^a-z0-9]")


class StatisticsLookupError(Exception):
    """Raised when the last-statistic lookup fails for a recorder reason.

    Distinct from a genuine "no prior statistic exists" result: a lookup
    failure (busy DB, migration, recorder unavailable) must abort the import
    cycle rather than fall back to a zero sum base, which would overwrite
    existing rows with regressed cumulative sums.
    """


def _sanitize_id(value: str) -> str:
    """Convert a string to a valid statistic ID component."""
    sanitized = _VALID_ID_CHAR.sub("_", value.lower())
    sanitized = re.sub(r"_+", "_", sanitized)
    return sanitized.strip("_")


def _hour_start(dt: datetime) -> datetime:
    """Round a datetime down to the start of its hour (UTC)."""
    return dt.replace(minute=0, second=0, microsecond=0)


def statistic_id_for_meter(meter_serial: str, meter_type: str) -> str | None:
    """Build statistic_id for a supported meter."""
    sanitized_serial = _sanitize_id(meter_serial)
    if meter_type == METER_TYPE_GAS:
        fuel = "gas"
    elif meter_type == METER_TYPE_ELECTRIC:
        fuel = "electricity"
    else:
        return None
    return f"{DOMAIN}:{fuel}_{sanitized_serial}_consumption"


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
            _LOGGER.debug(
                "Naive interval_start '%s' received; assuming UTC",
                interval_start,
            )
            parsed = parsed.replace(tzinfo=timezone.utc)
        else:
            parsed = dt_util.as_utc(parsed)

        hourly[_hour_start(parsed)] += val

    return dict(hourly)


async def _get_last_stat(
    hass: HomeAssistant,
    statistic_id: str,
    before: datetime,
) -> tuple[datetime | None, float]:
    """Retrieve latest timestamp and cumulative sum for a statistics ID.

    Returns ``(None, 0.0)`` only when no prior statistic genuinely exists.
    Raises :class:`StatisticsLookupError` on any recorder failure so the
    caller can skip the import cycle instead of restarting the cumulative
    sum from zero (which would regress existing rows).
    """
    try:
        from homeassistant.helpers.recorder import get_instance
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
            latest = result[statistic_id][0]
            start_ts = latest.get("start")
            last_start = (
                dt_util.utc_from_timestamp(float(start_ts))
                if isinstance(start_ts, (int, float))
                else None
            )
            return last_start, float(latest.get("sum", 0.0) or 0.0)

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
            latest = fallback[statistic_id][-1]
            start_ts = latest.get("start")
            last_start = (
                dt_util.utc_from_timestamp(float(start_ts))
                if isinstance(start_ts, (int, float))
                else None
            )
            return last_start, float(latest.get("sum", 0.0) or 0.0)
    except Exception as err:  # pylint: disable=broad-except
        # Do not fall back to a zero base: importing with last_sum=0.0 and no
        # skip guard would overwrite the existing rows with regressed sums.
        raise StatisticsLookupError(
            f"last-statistic lookup failed for {statistic_id}: {err}"
        ) from err

    # No prior statistic exists - a legitimate fresh start at zero.
    return None, 0.0


def _build_statistic_metadata(
    meter_serial: str, meter_type: str, statistic_id: str
) -> dict[str, Any]:
    """Build the StatisticMetaData kwargs for a meter's consumption stat."""
    fuel = "gas" if meter_type == METER_TYPE_GAS else "electricity"
    metadata_dict: dict[str, Any] = {
        "has_sum": True,
        "name": f"{meter_serial} {fuel.title()} Consumption",
        "source": DOMAIN,
        "statistic_id": statistic_id,
        "unit_of_measurement": UnitOfEnergy.KILO_WATT_HOUR,
        "unit_class": "energy",
    }

    # Use mean_type (modern HA) with has_mean fallback (older HA).
    try:
        from homeassistant.components.recorder.models import StatisticMeanType

        metadata_dict["mean_type"] = StatisticMeanType.NONE
    except ImportError:
        metadata_dict["has_mean"] = False

    return metadata_dict


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

    This is the *append-only* live path: it only writes hours newer than the
    latest existing statistic.  Historical backfill uses
    :func:`async_import_historical_statistics`, which can splice earlier hours
    in and rewrite subsequent sums.
    """
    from homeassistant.components.recorder.models import (
        StatisticData,
        StatisticMetaData,
    )
    from homeassistant.components.recorder.statistics import (
        async_add_external_statistics,
    )

    hourly = _group_consumption_by_hour(consumption_entries)
    if not hourly:
        return

    statistic_id = statistic_id_for_meter(meter_serial, meter_type)
    if statistic_id is None:
        _LOGGER.warning(
            "Unknown meter type '%s' for serial %s; skipping statistics import",
            meter_type,
            meter_serial,
        )
        return

    metadata_dict = _build_statistic_metadata(meter_serial, meter_type, statistic_id)

    sorted_hours = sorted(hourly.keys())
    if not sorted_hours:
        return
    try:
        last_start, last_sum = await _get_last_stat(
            hass, statistic_id, sorted_hours[0]
        )
    except StatisticsLookupError as err:
        # Skip this cycle entirely rather than import with a guessed base.
        _LOGGER.warning(
            "Skipping statistics import for %s: %s", statistic_id, err
        )
        return

    statistics: list[StatisticData] = []
    cumulative_sum = last_sum
    for hour in sorted_hours:
        if last_start is not None and hour <= last_start:
            continue

        kwh = round(hourly[hour], 3)
        cumulative_sum = round(cumulative_sum + kwh, 3)
        statistics.append(
            StatisticData(
                start=hour,
                state=cumulative_sum,
                sum=cumulative_sum,
            )
        )

    if not statistics:
        return

    async_add_external_statistics(
        hass, StatisticMetaData(**metadata_dict), statistics
    )
    _LOGGER.debug(
        "Imported %d hourly statistics for %s",
        len(statistics),
        statistic_id,
    )


def _merge_and_recompute_series(
    baseline_sum: float,
    existing: list[tuple[datetime, float]],
    new_hourly: dict[datetime, float],
    *,
    daily_granularity: bool = False,
) -> list[tuple[datetime, float]]:
    """Splice new hours into an existing series and recompute cumulative sums.

    ``existing`` is the list of ``(hour, cumulative_sum)`` rows already stored
    from the first affected hour onward, sorted ascending; ``baseline_sum`` is
    the cumulative sum of the row immediately *before* them (0.0 if none).

    Per-hour consumption is reconstructed from the differences between
    consecutive cumulative sums, new hours overwrite existing ones, and the
    whole range is re-accumulated from ``baseline_sum`` so the series stays
    monotonic.  Returns ``(hour, cumulative_sum)`` for every hour in the range.

    When ``daily_granularity`` is set, each entry in ``new_hourly`` represents a
    whole local day collapsed into one hour bucket.  A daily bucket that landed
    on a day the coordinator already populated with finer half-hourly rows would
    only overwrite one of that day's ~24 hours and leave the rest - inflating
    the day by ~2x.  So a daily bucket is skipped for any day already covered by
    more than one existing row; the finer rows are more accurate and preserved.
    """
    per_hour: dict[datetime, float] = {}

    # Reconstruct each existing hour's own consumption from the sum deltas.
    prev_sum = baseline_sum
    for hour, cumulative in existing:
        per_hour[hour] = round(cumulative - prev_sum, 3)
        prev_sum = cumulative

    effective_new = dict(new_hourly)
    if daily_granularity:
        # A daily bucket's own hour is the day's local midnight in UTC, so the
        # local day spans exactly [day_hour, day_hour + 24h) - tz-robust without
        # any local-time conversion here.
        for day_hour in list(effective_new):
            day_end = day_hour + timedelta(hours=24)
            finer_existing = sum(1 for h in per_hour if day_hour <= h < day_end)
            if finer_existing > 1:
                del effective_new[day_hour]

    # New (backfilled) values are authoritative for their hour.
    for hour, kwh in effective_new.items():
        per_hour[hour] = round(kwh, 3)

    # Re-accumulate from the baseline across the merged, ordered hours.
    result: list[tuple[datetime, float]] = []
    running = baseline_sum
    for hour in sorted(per_hour):
        running = round(running + per_hour[hour], 3)
        result.append((hour, running))
    return result


async def _fetch_baseline_and_existing(
    hass: HomeAssistant,
    statistic_id: str,
    chunk_min: datetime,
    end: datetime,
) -> tuple[float, list[tuple[datetime, float]]]:
    """Return the baseline sum before *chunk_min* and existing rows in range.

    Raises :class:`StatisticsLookupError` on any recorder failure so the caller
    skips the import rather than corrupting the series.
    """
    try:
        from homeassistant.helpers.recorder import get_instance
        from homeassistant.components.recorder.statistics import (
            statistics_during_period,
        )

        def _rows(start: datetime, stop: datetime) -> list[Any]:
            data = statistics_during_period(
                hass, start, stop, {statistic_id}, "hour", None, {"sum"}
            )
            return list(data.get(statistic_id, []))

        instance = get_instance(hass)

        # Baseline: the newest stored row strictly before the chunk.
        before_rows = await instance.async_add_executor_job(
            _rows, chunk_min - timedelta(days=3650), chunk_min
        )
        baseline_sum = 0.0
        for row in before_rows:
            start_dt = _row_start(row)
            if start_dt is not None and start_dt < chunk_min:
                baseline_sum = float(row.get("sum", 0.0) or 0.0)

        # Existing rows from the chunk start onward (these get rewritten).
        after_rows = await instance.async_add_executor_job(_rows, chunk_min, end)
        existing: list[tuple[datetime, float]] = []
        for row in after_rows:
            start_dt = _row_start(row)
            if start_dt is None or start_dt < chunk_min:
                continue
            existing.append((start_dt, float(row.get("sum", 0.0) or 0.0)))
        existing.sort(key=lambda item: item[0])
        return baseline_sum, existing
    except Exception as err:  # pylint: disable=broad-except
        raise StatisticsLookupError(
            f"statistics lookup failed for {statistic_id}: {err}"
        ) from err


def _row_start(row: dict[str, Any]) -> datetime | None:
    start_ts = row.get("start")
    if isinstance(start_ts, (int, float)):
        return dt_util.utc_from_timestamp(float(start_ts))
    return None


async def async_import_historical_statistics(
    hass: HomeAssistant,
    meter_serial: str,
    meter_type: str,
    consumption_entries: list[dict[str, Any]],
    *,
    daily_granularity: bool = False,
) -> None:
    """Import *historical* consumption without suspending live imports.

    Unlike the append-only live path, this splices earlier hours into the
    existing series and rewrites every subsequent cumulative sum so the series
    stays monotonic - letting the historical backfill run concurrently with
    live 30-minute imports.  Adding a constant to all later sums does not
    change the per-period deltas the Energy Dashboard displays.

    Set ``daily_granularity`` when ``consumption_entries`` are daily buckets so
    a day the coordinator already imported at half-hourly resolution is not
    double-counted (see :func:`_merge_and_recompute_series`).
    """
    from homeassistant.helpers.recorder import get_instance
    from homeassistant.components.recorder.models import (
        StatisticData,
        StatisticMetaData,
    )
    from homeassistant.components.recorder.statistics import (
        async_add_external_statistics,
    )

    hourly = _group_consumption_by_hour(consumption_entries)
    if not hourly:
        return

    statistic_id = statistic_id_for_meter(meter_serial, meter_type)
    if statistic_id is None:
        _LOGGER.warning(
            "Unknown meter type '%s' for serial %s; skipping statistics import",
            meter_type,
            meter_serial,
        )
        return

    chunk_min = min(hourly)
    end = _hour_start(dt_util.utcnow()) + timedelta(hours=1)

    try:
        baseline_sum, existing = await _fetch_baseline_and_existing(
            hass, statistic_id, chunk_min, end
        )
    except StatisticsLookupError as err:
        _LOGGER.warning(
            "Skipping historical statistics import for %s: %s", statistic_id, err
        )
        return

    series = _merge_and_recompute_series(
        baseline_sum, existing, hourly, daily_granularity=daily_granularity
    )
    if not series:
        return

    metadata_dict = _build_statistic_metadata(meter_serial, meter_type, statistic_id)
    statistics = [
        StatisticData(start=hour, state=cumulative, sum=cumulative)
        for hour, cumulative in series
    ]

    async_add_external_statistics(
        hass, StatisticMetaData(**metadata_dict), statistics
    )
    # Make this write durable before returning.  The recompute-forward design
    # reads existing rows back to rebase later sums, so a same-cycle consecutive
    # chunk (requests_per_run > 1 with delay_seconds = 0) must not read a stale
    # baseline and emit a regressive, non-monotonic sum.  ``async_add_external_
    # statistics`` only queues the write; block until the recorder has applied
    # it so the next read - and any reader - sees a committed series.
    await get_instance(hass).async_block_till_done()
    _LOGGER.debug(
        "Backfilled %d hourly statistics for %s (rewrote from %s)",
        len(statistics),
        statistic_id,
        chunk_min.isoformat(),
    )
