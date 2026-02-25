"""WebSocket API commands for the EON Next frontend.

Shared by both the sidebar panel and standalone Lovelace cards.
"""

from __future__ import annotations

import dataclasses
from typing import Any

import voluptuous as vol

from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant, callback

from .const import DOMAIN, INTEGRATION_VERSION
from .models import EonNextConfigEntry
from .schemas import (
    DashboardSummary,
    EvChargerSummary,
    MeterSummary,
    VersionResponse,
)


def async_setup_websocket(hass: HomeAssistant) -> None:
    """Register all EON Next WebSocket commands."""
    websocket_api.async_register_command(hass, ws_version)
    websocket_api.async_register_command(hass, ws_dashboard_summary)


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
