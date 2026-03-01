"""Helper functions for tariff rate calculations.

Provides rate lookup and off-peak detection from two data sources:
1. API rate schedule (tariff_rates_schedule with validFrom/validTo)
2. Tariff pattern registry fallback (known windows from tariff_patterns.py)
"""

from __future__ import annotations

import datetime as dt_mod
from dataclasses import dataclass
from datetime import datetime, time, timedelta, tzinfo
from typing import Any

from homeassistant.util import dt as dt_util

from .tariff_patterns import TariffRateWindow, get_tariff_pattern


@dataclass(slots=True)
class RateInfo:
    """A rate with optional validity window."""

    rate: float  # GBP/kWh
    valid_from: str | None = None
    valid_to: str | None = None
    is_off_peak: bool = False


# ── Internal helpers ───────────────────────────────────────────


def _parse_dt(value: Any) -> datetime | None:
    """Parse a datetime string, ensuring timezone awareness."""
    if not value or not isinstance(value, str):
        return None
    parsed = dt_util.parse_datetime(value)
    if parsed is not None and parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=dt_util.UTC)
    return parsed


def _pence_to_pounds(pence: float) -> float:
    return round(pence / 100.0, 4)


def _schedule_has_time_windows(schedule: list[dict[str, Any]]) -> bool:
    return any(_parse_dt(e.get("validFrom")) is not None for e in schedule)


def _find_current_window(
    schedule: list[dict[str, Any]],
    now_utc: datetime,
) -> dict[str, Any] | None:
    for entry in schedule:
        vf = _parse_dt(entry.get("validFrom"))
        vt = _parse_dt(entry.get("validTo"))
        if vf is not None and vt is not None and vf <= now_utc < vt:
            return entry
    return None


def _min_rate_pence(schedule: list[dict[str, Any]]) -> float | None:
    vals: list[float] = []
    for e in schedule:
        v = e.get("value")
        if v is not None:
            try:
                vals.append(float(v))
            except (TypeError, ValueError):
                pass
    return min(vals) if vals else None


def _distinct_rates_pence(schedule: list[dict[str, Any]]) -> list[float]:
    vals: set[float] = set()
    for e in schedule:
        v = e.get("value")
        if v is not None:
            try:
                vals.add(float(v))
            except (TypeError, ValueError):
                pass
    return sorted(vals)


def _time_in_off_peak_windows(
    local_time: time,
    windows: list[TariffRateWindow],
) -> bool:
    for w in windows:
        if w.name != "off_peak":
            continue
        if w.start_time <= w.end_time:
            if w.start_time <= local_time < w.end_time:
                return True
        else:
            # Wraps midnight
            if local_time >= w.start_time or local_time < w.end_time:
                return True
    return False


def _next_transition_dt(
    now_local: datetime,
    windows: list[TariffRateWindow],
) -> datetime | None:
    """Find the next off-peak boundary transition as a datetime."""
    boundaries: list[time] = []
    for w in windows:
        if w.name == "off_peak":
            boundaries.append(w.start_time)
            boundaries.append(w.end_time)
    if not boundaries:
        return None

    boundaries = sorted(set(boundaries))
    now_t = now_local.time()

    for t in boundaries:
        if t > now_t:
            return now_local.replace(
                hour=t.hour, minute=t.minute, second=0, microsecond=0
            )

    # Wrap to first boundary tomorrow
    tomorrow = now_local.date() + timedelta(days=1)
    return datetime.combine(tomorrow, boundaries[0], tzinfo=now_local.tzinfo)


# ── Public API ─────────────────────────────────────────────────


def get_previous_rate(meter_data: dict[str, Any]) -> RateInfo | None:
    """Get the most recent rate that differs from the current rate.

    Returns the current rate for flat-rate tariffs, None when no data.
    """
    unit_rate = meter_data.get("tariff_unit_rate")
    if unit_rate is None:
        return None

    is_tou = meter_data.get("tariff_is_tou", False)
    if not is_tou:
        return RateInfo(rate=float(unit_rate))

    schedule = meter_data.get("tariff_rates_schedule") or []
    tariff_code = meter_data.get("tariff_code")
    now_utc = dt_util.utcnow()

    # Strategy 1: API schedule with time windows
    if schedule and _schedule_has_time_windows(schedule):
        current = _find_current_window(schedule, now_utc)
        if current is not None:
            try:
                current_pence = float(current["value"])
            except (TypeError, ValueError, KeyError):
                current_pence = None
            if current_pence is not None:
                min_r = _min_rate_pence(schedule)
                candidates = []
                for e in schedule:
                    vt = _parse_dt(e.get("validTo"))
                    if vt is None or vt > now_utc:
                        continue
                    try:
                        val = float(e["value"])
                    except (TypeError, ValueError, KeyError):
                        continue
                    if val != current_pence:
                        candidates.append((vt, e))
                if candidates:
                    candidates.sort(key=lambda x: x[0], reverse=True)
                    prev = candidates[0][1]
                    try:
                        prev_val = float(prev["value"])
                    except (TypeError, ValueError, KeyError):
                        prev_val = None
                    if prev_val is not None:
                        return RateInfo(
                            rate=_pence_to_pounds(prev_val),
                            valid_from=prev.get("validFrom"),
                            valid_to=prev.get("validTo"),
                            is_off_peak=(min_r is not None and prev_val == min_r),
                        )

    # Strategy 2: Pattern fallback with schedule rate values
    if schedule:
        distinct = _distinct_rates_pence(schedule)
        if len(distinct) >= 2:
            pattern = get_tariff_pattern(tariff_code)
            if pattern and pattern.windows:
                now_local = dt_util.now().time()
                in_off_peak = _time_in_off_peak_windows(
                    now_local, pattern.windows
                )
                # Currently off-peak -> previous was peak (highest rate)
                # Currently peak -> previous was off-peak (lowest rate)
                if in_off_peak:
                    return RateInfo(
                        rate=_pence_to_pounds(distinct[-1]),
                        is_off_peak=False,
                    )
                return RateInfo(
                    rate=_pence_to_pounds(distinct[0]),
                    is_off_peak=True,
                )

    return RateInfo(rate=float(unit_rate))


def get_next_rate(meter_data: dict[str, Any]) -> RateInfo | None:
    """Get the next upcoming rate that differs from the current rate.

    Returns the current rate for flat-rate tariffs, None when no data.
    """
    unit_rate = meter_data.get("tariff_unit_rate")
    if unit_rate is None:
        return None

    is_tou = meter_data.get("tariff_is_tou", False)
    if not is_tou:
        return RateInfo(rate=float(unit_rate))

    schedule = meter_data.get("tariff_rates_schedule") or []
    tariff_code = meter_data.get("tariff_code")
    now_utc = dt_util.utcnow()

    # Strategy 1: API schedule with time windows
    if schedule and _schedule_has_time_windows(schedule):
        current = _find_current_window(schedule, now_utc)
        if current is not None:
            try:
                current_pence = float(current["value"])
            except (TypeError, ValueError, KeyError):
                current_pence = None
            if current_pence is not None:
                min_r = _min_rate_pence(schedule)
                candidates = []
                for e in schedule:
                    vf = _parse_dt(e.get("validFrom"))
                    if vf is None or vf <= now_utc:
                        continue
                    try:
                        val = float(e["value"])
                    except (TypeError, ValueError, KeyError):
                        continue
                    if val != current_pence:
                        candidates.append((vf, e))
                if candidates:
                    candidates.sort(key=lambda x: x[0])
                    nxt = candidates[0][1]
                    try:
                        nxt_val = float(nxt["value"])
                    except (TypeError, ValueError, KeyError):
                        nxt_val = None
                    if nxt_val is not None:
                        return RateInfo(
                            rate=_pence_to_pounds(nxt_val),
                            valid_from=nxt.get("validFrom"),
                            valid_to=nxt.get("validTo"),
                            is_off_peak=(min_r is not None and nxt_val == min_r),
                        )

    # Strategy 2: Pattern fallback
    if schedule:
        distinct = _distinct_rates_pence(schedule)
        if len(distinct) >= 2:
            pattern = get_tariff_pattern(tariff_code)
            if pattern and pattern.windows:
                now_local = dt_util.now().time()
                in_off_peak = _time_in_off_peak_windows(
                    now_local, pattern.windows
                )
                if in_off_peak:
                    return RateInfo(
                        rate=_pence_to_pounds(distinct[-1]),
                        is_off_peak=False,
                    )
                return RateInfo(
                    rate=_pence_to_pounds(distinct[0]),
                    is_off_peak=True,
                )

    return RateInfo(rate=float(unit_rate))


def is_off_peak(meter_data: dict[str, Any]) -> bool | None:
    """Determine whether the current time falls in an off-peak period.

    Returns True/False for ToU tariffs, None when flat-rate or unknown.
    """
    is_tou = meter_data.get("tariff_is_tou", False)
    if not is_tou:
        return None

    schedule = meter_data.get("tariff_rates_schedule") or []
    tariff_code = meter_data.get("tariff_code")

    # API schedule with time windows
    if schedule and _schedule_has_time_windows(schedule):
        now_utc = dt_util.utcnow()
        current = _find_current_window(schedule, now_utc)
        if current is not None:
            min_r = _min_rate_pence(schedule)
            try:
                cur_val = float(current["value"])
            except (TypeError, ValueError, KeyError):
                cur_val = None
            if min_r is not None and cur_val is not None:
                return cur_val == min_r
            return None

    # Pattern registry fallback
    pattern = get_tariff_pattern(tariff_code)
    if pattern and pattern.windows:
        now_local = dt_util.now().time()
        return _time_in_off_peak_windows(now_local, pattern.windows)

    return None


def get_off_peak_metadata(
    meter_data: dict[str, Any],
) -> dict[str, Any]:
    """Return off-peak metadata: current_rate_name and next_transition."""
    result: dict[str, Any] = {}

    is_tou = meter_data.get("tariff_is_tou", False)
    if not is_tou:
        return result

    schedule = meter_data.get("tariff_rates_schedule") or []
    tariff_code = meter_data.get("tariff_code")

    # API schedule with time windows
    if schedule and _schedule_has_time_windows(schedule):
        now_utc = dt_util.utcnow()
        current = _find_current_window(schedule, now_utc)
        if current is not None:
            min_r = _min_rate_pence(schedule)
            try:
                cur_val = float(current["value"])
            except (TypeError, ValueError, KeyError):
                cur_val = None
            is_off = min_r is not None and cur_val is not None and cur_val == min_r
            result["current_rate_name"] = "off_peak" if is_off else "peak"
            result["next_transition"] = current.get("validTo")
        return result

    # Pattern registry fallback
    pattern = get_tariff_pattern(tariff_code)
    if pattern and pattern.windows:
        now_local = dt_util.now()
        in_off_peak = _time_in_off_peak_windows(now_local.time(), pattern.windows)
        result["current_rate_name"] = "off_peak" if in_off_peak else "peak"

        next_dt = _next_transition_dt(now_local, pattern.windows)
        if next_dt is not None:
            result["next_transition"] = next_dt.isoformat()

    return result


def build_day_rates(meter_data: dict[str, Any]) -> list[dict[str, Any]]:
    """Build today's rate schedule.

    Returns a list of ``{start, end, rate, is_off_peak}`` dicts with
    rates in GBP/kWh.  Returns an empty list when no data is available.
    """
    schedule = meter_data.get("tariff_rates_schedule") or []
    is_tou = meter_data.get("tariff_is_tou", False)
    unit_rate = meter_data.get("tariff_unit_rate")
    tariff_code = meter_data.get("tariff_code")

    if unit_rate is None:
        return []

    now = dt_util.now()
    today = now.date()

    # Flat rate: single window
    if not is_tou:
        day_start = datetime.combine(today, time.min, tzinfo=now.tzinfo)
        day_end = day_start + timedelta(days=1)
        return [
            {
                "start": day_start.isoformat(),
                "end": day_end.isoformat(),
                "rate": float(unit_rate),
                "is_off_peak": False,
            }
        ]

    # API schedule with time windows — filter to today
    if schedule and _schedule_has_time_windows(schedule):
        day_start = datetime.combine(today, time.min, tzinfo=now.tzinfo)
        day_end = day_start + timedelta(days=1)
        day_start_utc = dt_util.as_utc(day_start)
        day_end_utc = dt_util.as_utc(day_end)

        min_r = _min_rate_pence(schedule)
        rates: list[dict[str, Any]] = []
        for entry in schedule:
            vf = _parse_dt(entry.get("validFrom"))
            vt = _parse_dt(entry.get("validTo"))
            if vf is None or vt is None:
                continue
            if vt <= day_start_utc or vf >= day_end_utc:
                continue
            try:
                val = float(entry["value"])
            except (TypeError, ValueError, KeyError):
                continue
            rates.append(
                {
                    "start": max(vf, day_start_utc).isoformat(),
                    "end": min(vt, day_end_utc).isoformat(),
                    "rate": _pence_to_pounds(val),
                    "is_off_peak": min_r is not None and val == min_r,
                }
            )
        rates.sort(key=lambda r: r["start"])
        if rates:
            return rates

    # Pattern fallback — construct windows from known tariff structure
    pattern = get_tariff_pattern(tariff_code)
    if pattern and pattern.windows and schedule:
        distinct = _distinct_rates_pence(schedule)
        if len(distinct) >= 2:
            off_peak_rate = _pence_to_pounds(distinct[0])
            peak_rate = _pence_to_pounds(distinct[-1])
            return _build_pattern_day_windows(
                today, now.tzinfo, pattern.windows, off_peak_rate, peak_rate
            )

    return []


def _build_pattern_day_windows(
    today: dt_mod.date,
    tz: tzinfo | None,
    windows: list[TariffRateWindow],
    off_peak_rate: float,
    peak_rate: float,
) -> list[dict[str, Any]]:
    """Construct a full day of rate windows from a tariff pattern."""
    day_start = datetime.combine(today, time.min, tzinfo=tz)
    day_end = day_start + timedelta(days=1)

    # Collect off-peak intervals as datetime ranges within today
    dt_intervals: list[tuple[datetime, datetime]] = []
    for w in windows:
        if w.name != "off_peak":
            continue
        if w.start_time <= w.end_time:
            dt_intervals.append(
                (
                    datetime.combine(today, w.start_time, tzinfo=tz),
                    datetime.combine(today, w.end_time, tzinfo=tz),
                )
            )
        else:
            # Wraps midnight
            dt_intervals.append(
                (datetime.combine(today, w.start_time, tzinfo=tz), day_end)
            )
            dt_intervals.append(
                (day_start, datetime.combine(today, w.end_time, tzinfo=tz))
            )

    dt_intervals.sort(key=lambda x: x[0])

    # Fill the day with off-peak and peak windows
    result: list[dict[str, Any]] = []
    cursor = day_start
    for start, end in dt_intervals:
        if start > cursor:
            result.append(
                {
                    "start": cursor.isoformat(),
                    "end": start.isoformat(),
                    "rate": peak_rate,
                    "is_off_peak": False,
                }
            )
        actual_start = max(cursor, start)
        if end > actual_start:
            result.append(
                {
                    "start": actual_start.isoformat(),
                    "end": end.isoformat(),
                    "rate": off_peak_rate,
                    "is_off_peak": True,
                }
            )
            cursor = end

    if cursor < day_end:
        result.append(
            {
                "start": cursor.isoformat(),
                "end": day_end.isoformat(),
                "rate": peak_rate,
                "is_off_peak": False,
            }
        )

    return result
