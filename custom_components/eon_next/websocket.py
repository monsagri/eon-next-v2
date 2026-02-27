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
from .models import EonNextConfigEntry
from .schemas import (
    ConsumptionHistoryEntry,
    ConsumptionHistoryResponse,
    DashboardSummary,
    EvChargerSummary,
    MeterSummary,
    VersionResponse,
)
from .statistics import statistic_id_for_meter

_LOGGER = logging.getLogger(__name__)


def async_setup_websocket(hass: HomeAssistant) -> None:
    """Register all EON Next WebSocket commands."""
    websocket_api.async_register_command(hass, ws_version)
    websocket_api.async_register_command(hass, ws_dashboard_summary)
    websocket_api.async_register_command(hass, ws_consumption_history)


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


def _find_meter_type(hass: HomeAssistant, meter_serial: str) -> str | None:
    """Look up a meter's type (electricity/gas) from coordinator data."""
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
                return data.get("type")  # type: ignore[no-any-return]
    return None


@websocket_api.websocket_command(  # pyright: ignore[reportPrivateImportUsage]
    {
        vol.Required("type"): "eon_next/consumption_history",
        vol.Required("meter_serial"): str,
        vol.Optional("days", default=7): vol.All(int, vol.Range(min=1, max=30)),
    }
)
@websocket_api.async_response  # pyright: ignore[reportPrivateImportUsage]
async def ws_consumption_history(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,  # pyright: ignore[reportPrivateImportUsage]
    msg: dict[str, Any],
) -> None:
    """Return daily consumption history for a meter from recorder statistics."""
    meter_serial: str = msg["meter_serial"]
    days: int = msg["days"]

    meter_type = _find_meter_type(hass, meter_serial)
    if meter_type is None:
        connection.send_result(
            msg["id"],
            dataclasses.asdict(ConsumptionHistoryResponse(entries=[])),
        )
        return

    stat_id = statistic_id_for_meter(meter_serial, meter_type)
    if stat_id is None:
        connection.send_result(
            msg["id"],
            dataclasses.asdict(ConsumptionHistoryResponse(entries=[])),
        )
        return

    now = dt_util.now()
    start = now - timedelta(days=days)

    entries: list[ConsumptionHistoryEntry] = []
    try:
        from homeassistant.components.recorder.statistics import (
            statistics_during_period,
        )
        from homeassistant.helpers.recorder import get_instance

        result = await get_instance(hass).async_add_executor_job(
            statistics_during_period,
            hass,
            start,
            now,
            {stat_id},
            "day",
            None,
            {"sum", "change"},
        )
        if stat_id in result:
            for stat in result[stat_id]:
                change = stat.get("change")
                if change is None or change <= 0:
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
    except Exception as err:  # pylint: disable=broad-except
        _LOGGER.debug("Failed to fetch consumption history for %s: %s", stat_id, err)

    connection.send_result(
        msg["id"],
        dataclasses.asdict(ConsumptionHistoryResponse(entries=entries)),
    )
