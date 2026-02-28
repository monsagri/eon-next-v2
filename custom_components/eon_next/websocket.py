"""WebSocket API commands for the EON Next frontend.

Shared by both the sidebar panel and standalone Lovelace cards.
"""

from __future__ import annotations

import dataclasses
import logging
from datetime import timedelta
from typing import Any

import voluptuous as vol

from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant, callback
from homeassistant.util import dt as dt_util

from .const import DOMAIN, INTEGRATION_VERSION
from .eonnext import EonNextAuthError
from .models import EonNextConfigEntry
from .schemas import (
    BackfillMeterProgress,
    BackfillStatusResponse,
    ConsumptionHistoryEntry,
    ConsumptionHistoryResponse,
    DashboardSummary,
    EvChargerSummary,
    EvScheduleResponse,
    EvScheduleSlot,
    MeterSummary,
    VersionResponse,
)
from .statistics import statistic_id_for_meter

_LOGGER = logging.getLogger(__name__)

WS_CONSUMPTION_HISTORY_SCHEMA = {
    vol.Required("type"): "eon_next/consumption_history",
    vol.Required("meter_serial"): str,
    vol.Optional("days", default=7): vol.All(int, vol.Range(min=1, max=365)),
}


def async_setup_websocket(hass: HomeAssistant) -> None:
    """Register all EON Next WebSocket commands."""
    websocket_api.async_register_command(hass, ws_version)
    websocket_api.async_register_command(hass, ws_dashboard_summary)
    websocket_api.async_register_command(hass, ws_consumption_history)
    websocket_api.async_register_command(hass, ws_ev_schedule)
    websocket_api.async_register_command(hass, ws_backfill_status)


@websocket_api.websocket_command(  # pyright: ignore[reportPrivateImportUsage]
    {vol.Required("type"): "eon_next/version"}
)
@callback
def ws_version(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,  # pyright: ignore[reportPrivateImportUsage]
    msg: dict[str, Any],
) -> None:
    """Return the integration version."""
    connection.send_result(
        msg["id"],
        dataclasses.asdict(VersionResponse(version=INTEGRATION_VERSION)),
    )


@websocket_api.websocket_command(  # pyright: ignore[reportPrivateImportUsage]
    {vol.Required("type"): "eon_next/dashboard_summary"}
)
@websocket_api.async_response  # pyright: ignore[reportPrivateImportUsage]
async def ws_dashboard_summary(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,  # pyright: ignore[reportPrivateImportUsage]
    msg: dict[str, Any],
) -> None:
    """Return an aggregated summary of all meters and EV chargers."""
    meters: list[MeterSummary] = []
    ev_chargers: list[EvChargerSummary] = []

    entries: list[EonNextConfigEntry] = (
        hass.config_entries.async_entries(DOMAIN)  # type: ignore[assignment]
    )

    for entry in entries:
        runtime_data = getattr(entry, "runtime_data", None)
        if runtime_data is None:
            continue

        coordinator = runtime_data.coordinator
        if coordinator.data is None:
            continue

        for key, data in coordinator.data.items():
            data_type = data.get("type")

            if data_type in ("electricity", "gas"):
                meters.append(
                    MeterSummary(
                        serial=data.get("serial"),
                        type=data_type,
                        latest_reading=data.get("latest_reading"),
                        latest_reading_date=data.get("latest_reading_date"),
                        daily_consumption=data.get("daily_consumption"),
                        standing_charge=data.get("standing_charge"),
                        previous_day_cost=data.get("previous_day_cost"),
                        unit_rate=data.get("unit_rate"),
                        tariff_name=data.get("tariff_name"),
                    )
                )

            elif data_type == "ev_charger":
                schedule = data.get("schedule", [])
                ev_chargers.append(
                    EvChargerSummary(
                        device_id=data.get("device_id"),
                        serial=data.get("serial"),
                        schedule_slots=len(schedule),
                        next_charge_start=data.get("next_charge_start"),
                        next_charge_end=data.get("next_charge_end"),
                    )
                )

    connection.send_result(
        msg["id"],
        dataclasses.asdict(DashboardSummary(meters=meters, ev_chargers=ev_chargers)),
    )


def _find_meter_info(
    hass: HomeAssistant, meter_serial: str
) -> dict[str, Any] | None:
    """Look up meter metadata from coordinator data.

    Returns a dict with ``type``, ``supply_point_id``, and the owning
    ``api`` client, or ``None`` if the meter is not found.
    """
    entries: list[EonNextConfigEntry] = (
        hass.config_entries.async_entries(DOMAIN)  # type: ignore[assignment]
    )
    for entry in entries:
        runtime_data = getattr(entry, "runtime_data", None)
        if runtime_data is None:
            continue
        coordinator = runtime_data.coordinator
        if coordinator.data is None:
            continue
        for data in coordinator.data.values():
            if data.get("serial") == meter_serial:
                return {
                    "type": data.get("type"),
                    "supply_point_id": data.get("supply_point_id"),
                    "api": coordinator.api,
                }
    return None


@websocket_api.websocket_command(  # pyright: ignore[reportPrivateImportUsage]
    WS_CONSUMPTION_HISTORY_SCHEMA
)
@websocket_api.async_response  # pyright: ignore[reportPrivateImportUsage]
async def ws_consumption_history(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,  # pyright: ignore[reportPrivateImportUsage]
    msg: dict[str, Any],
) -> None:
    """Return daily consumption history for a meter.

    Tries recorder statistics first, then falls back to the REST
    consumption endpoint when statistics are empty or unavailable.
    """
    meter_serial: str = msg["meter_serial"]
    days: int = msg["days"]

    meter_info = _find_meter_info(hass, meter_serial)
    if meter_info is None:
        connection.send_result(
            msg["id"],
            dataclasses.asdict(ConsumptionHistoryResponse(entries=[])),
        )
        return

    meter_type: str = meter_info["type"]

    entries = await _entries_from_statistics(hass, meter_serial, meter_type, days)

    if not entries:
        entries = await _entries_from_rest(
            meter_info["api"],
            meter_type,
            meter_info["supply_point_id"],
            meter_serial,
            days,
        )

    entries = _gap_fill(entries, days)

    connection.send_result(
        msg["id"],
        dataclasses.asdict(ConsumptionHistoryResponse(entries=entries)),
    )


def _gap_fill(
    entries: list[ConsumptionHistoryEntry], days: int
) -> list[ConsumptionHistoryEntry]:
    """Ensure every calendar day in the range has an entry.

    Missing days are filled with zero-consumption entries only when at
    least one real reading exists. This avoids masking total data-source
    failures as genuine zero usage.
    """
    if not entries:
        return []

    today = dt_util.now().date()
    existing = {e.date for e in entries}
    for offset in range(days):
        day = (today - timedelta(days=days - 1 - offset)).isoformat()
        if day not in existing:
            entries.append(ConsumptionHistoryEntry(date=day, consumption=0.0))
    entries.sort(key=lambda e: e.date)
    return entries[-days:]


async def _entries_from_statistics(
    hass: HomeAssistant,
    meter_serial: str,
    meter_type: str,
    days: int,
) -> list[ConsumptionHistoryEntry]:
    """Try to build consumption entries from HA recorder statistics."""
    stat_id = statistic_id_for_meter(meter_serial, meter_type)
    if stat_id is None:
        return []

    # Align to local day boundaries so each bucket represents a full
    # calendar day and the caller gets exactly ``days`` entries.
    local_now = dt_util.now()
    end_of_today = local_now.replace(
        hour=23, minute=59, second=59, microsecond=999999
    )
    start_of_range = (local_now - timedelta(days=days)).replace(
        hour=0, minute=0, second=0, microsecond=0
    )

    entries: list[ConsumptionHistoryEntry] = []
    try:
        from homeassistant.components.recorder.statistics import (
            statistics_during_period,
        )
        from homeassistant.helpers.recorder import get_instance

        result = await get_instance(hass).async_add_executor_job(
            statistics_during_period,
            hass,
            start_of_range,
            end_of_today,
            {stat_id},
            "day",
            None,
            {"sum", "change"},
        )
        if stat_id in result:
            for stat in result[stat_id]:
                change = stat.get("change")
                if change is None or change < 0:
                    continue
                start_ts = stat.get("start")
                if not isinstance(start_ts, (int, float)):
                    continue
                dt = dt_util.utc_from_timestamp(float(start_ts))
                local_dt = dt_util.as_local(dt)
                entries.append(
                    ConsumptionHistoryEntry(
                        date=local_dt.strftime("%Y-%m-%d"),
                        consumption=round(float(change), 3),
                    )
                )
        entries.sort(key=lambda e: e.date)
        entries = entries[-days:]
    except Exception as err:  # pylint: disable=broad-except
        _LOGGER.debug("Failed to fetch consumption history for %s: %s", stat_id, err)

    return entries


async def _entries_from_rest(
    api: Any,
    meter_type: str,
    supply_point_id: str | None,
    meter_serial: str,
    days: int,
) -> list[ConsumptionHistoryEntry]:
    """Fall back to the REST consumption endpoint for history data."""
    if not supply_point_id:
        return []

    today = dt_util.now().date()
    period_to = f"{(today + timedelta(days=1)).isoformat()}T00:00:00Z"
    period_from = f"{(today - timedelta(days=days)).isoformat()}T00:00:00Z"

    entries: list[ConsumptionHistoryEntry] = []
    try:
        result = await api.async_get_consumption(
            meter_type,
            supply_point_id,
            meter_serial,
            group_by="day",
            page_size=days,
            period_from=period_from,
            period_to=period_to,
        )
        if result and isinstance(result.get("results"), list):
            for item in result["results"]:
                consumption = item.get("consumption")
                interval = item.get("interval_start")
                if consumption is None or interval is None:
                    continue
                try:
                    value = float(consumption)
                except (TypeError, ValueError):
                    continue
                if value < 0:
                    continue
                # interval_start is an ISO datetime; extract the date part
                date_str = str(interval)[:10]
                entries.append(
                    ConsumptionHistoryEntry(
                        date=date_str,
                        consumption=round(value, 3),
                    )
                )
        entries.sort(key=lambda e: e.date)
        entries = entries[-days:]
    except EonNextAuthError:
        _LOGGER.warning(
            "Authentication failed fetching REST consumption for meter %s",
            meter_serial,
        )
    except Exception as err:  # pylint: disable=broad-except
        _LOGGER.debug(
            "REST consumption fallback failed for meter %s: %s", meter_serial, err
        )

    return entries


@websocket_api.websocket_command(  # pyright: ignore[reportPrivateImportUsage]
    {
        vol.Required("type"): "eon_next/ev_schedule",
        vol.Required("device_id"): str,
    }
)
@callback
def ws_ev_schedule(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,  # pyright: ignore[reportPrivateImportUsage]
    msg: dict[str, Any],
) -> None:
    """Return EV charge schedule for a specific device."""
    device_id: str = msg["device_id"]

    entries: list[EonNextConfigEntry] = (
        hass.config_entries.async_entries(DOMAIN)  # type: ignore[assignment]
    )

    for entry in entries:
        runtime_data = getattr(entry, "runtime_data", None)
        if runtime_data is None:
            continue
        coordinator = runtime_data.coordinator
        if coordinator.data is None:
            continue

        for data in coordinator.data.values():
            if data.get("type") != "ev_charger":
                continue
            if data.get("device_id") != device_id:
                continue

            schedule = data.get("schedule", [])
            slots = [
                EvScheduleSlot(
                    start=slot.get("start", ""),
                    end=slot.get("end", ""),
                )
                for slot in schedule
                if isinstance(slot, dict)
            ]

            status = "scheduled" if slots else "idle"
            connection.send_result(
                msg["id"],
                dataclasses.asdict(
                    EvScheduleResponse(
                        device_id=device_id,
                        serial=data.get("serial"),
                        status=status,
                        slots=slots,
                    )
                ),
            )
            return

    # Device not found — return empty response
    connection.send_result(
        msg["id"],
        dataclasses.asdict(
            EvScheduleResponse(
                device_id=device_id,
                serial=None,
                status="unknown",
                slots=[],
            )
        ),
    )


@websocket_api.websocket_command(  # pyright: ignore[reportPrivateImportUsage]
    {vol.Required("type"): "eon_next/backfill_status"}
)
@callback
def ws_backfill_status(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,  # pyright: ignore[reportPrivateImportUsage]
    msg: dict[str, Any],
) -> None:
    """Return aggregated backfill status across all config entries."""
    entries: list[EonNextConfigEntry] = (
        hass.config_entries.async_entries(DOMAIN)  # type: ignore[assignment]
    )

    total_meters = 0
    completed_meters = 0
    pending_meters = 0
    lookback_days = 0
    enabled = False
    state = "disabled"
    next_start_date: str | None = None
    meter_progress: list[BackfillMeterProgress] = []

    for entry in entries:
        runtime_data = getattr(entry, "runtime_data", None)
        if runtime_data is None:
            continue

        backfill = runtime_data.backfill
        status = backfill.get_status()

        if status["enabled"]:
            enabled = True

        total_meters += status["total_meters"]
        completed_meters += status["completed_meters"]
        pending_meters += status["pending_meters"]
        lookback_days = max(lookback_days, status["lookback_days"])

        if status["next_start_date"]:
            if next_start_date is None or status["next_start_date"] < next_start_date:
                next_start_date = status["next_start_date"]

        # Use the most active state
        if status["state"] in ("running", "initializing"):
            state = status["state"]
        elif status["state"] == "completed" and state == "disabled":
            state = "completed"

        for serial, progress in status["meters_progress"].items():
            meter_progress.append(
                BackfillMeterProgress(
                    serial=serial,
                    done=progress.get("done", False),
                    next_start=progress.get("next_start"),
                    days_completed=progress.get("days_completed", 0),
                    days_remaining=progress.get("days_remaining", 0),
                )
            )

    meter_progress.sort(key=lambda meter: meter.serial)

    connection.send_result(
        msg["id"],
        dataclasses.asdict(
            BackfillStatusResponse(
                state=state,
                enabled=enabled,
                total_meters=total_meters,
                completed_meters=completed_meters,
                pending_meters=pending_meters,
                lookback_days=lookback_days,
                next_start_date=next_start_date,
                meters=meter_progress,
            )
        ),
    )
