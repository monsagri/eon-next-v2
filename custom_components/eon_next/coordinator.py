"""DataUpdateCoordinator for the Eon Next integration."""

from __future__ import annotations

import logging
from datetime import timedelta
from typing import Any

from homeassistant.exceptions import ConfigEntryAuthFailed
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator, UpdateFailed

from .eonnext import (
    EonNext,
    EonNextApiError,
    EonNextAuthError,
    GasMeter,
    METER_TYPE_GAS,
)

_LOGGER = logging.getLogger(__name__)


def ev_data_key(device_id: str) -> str:
    """Create a stable coordinator key for EV devices."""
    return f"ev::{device_id}"


class EonNextCoordinator(DataUpdateCoordinator):
    """Coordinator to manage fetching Eon Next data."""

    def __init__(self, hass, api: EonNext, update_interval_minutes: int = 30):
        super().__init__(
            hass,
            _LOGGER,
            name="Eon Next",
            update_interval=timedelta(minutes=update_interval_minutes),
        )
        self.api = api

    async def _async_update_data(self) -> dict[str, dict[str, Any]]:
        """Fetch data from the Eon Next API."""
        data: dict[str, dict[str, Any]] = {}
        errors: list[str] = []

        for account in self.api.accounts:
            for meter in account.meters:
                meter_key = meter.serial
                try:
                    await meter._update()

                    meter_data: dict[str, Any] = {
                        "type": meter.type,
                        "serial": meter.serial,
                        "meter_id": meter.meter_id,
                        "supply_point_id": meter.supply_point_id,
                        "latest_reading": meter.latest_reading,
                        "latest_reading_date": meter.latest_reading_date,
                    }

                    if (
                        meter.type == METER_TYPE_GAS
                        and isinstance(meter, GasMeter)
                        and meter.latest_reading is not None
                    ):
                        meter_data["latest_reading_kwh"] = meter.get_latest_reading_kwh(
                            meter.latest_reading
                        )

                    consumption = await self._fetch_consumption(meter)
                    if consumption is not None:
                        meter_data["consumption"] = consumption
                        meter_data["daily_consumption"] = self._sum_consumption(consumption)

                    data[meter_key] = meter_data

                except EonNextAuthError as err:
                    _LOGGER.error("Authentication failed during update: %s", err)
                    raise ConfigEntryAuthFailed(
                        f"Authentication failed during update: {err}"
                    ) from err
                except EonNextApiError as err:
                    _LOGGER.warning("API error updating meter %s: %s", meter.serial, err)
                    errors.append(str(err))
                    if self.data and meter_key in self.data:
                        data[meter_key] = self.data[meter_key]
                except Exception as err:  # pylint: disable=broad-except
                    _LOGGER.warning("Unexpected error updating meter %s: %s", meter.serial, err)
                    errors.append(str(err))
                    if self.data and meter_key in self.data:
                        data[meter_key] = self.data[meter_key]

            for charger in account.ev_chargers:
                charger_key = ev_data_key(charger.device_id)
                try:
                    schedule = await self.api.async_get_smart_charging_schedule(
                        charger.device_id
                    )
                    schedule_slots = self._schedule_slots(schedule)

                    charger_data: dict[str, Any] = {
                        "type": "ev_charger",
                        "device_id": charger.device_id,
                        "serial": charger.serial,
                        "schedule": schedule_slots,
                    }
                    if schedule_slots:
                        charger_data["next_charge_start"] = schedule_slots[0]["start"]
                        charger_data["next_charge_end"] = schedule_slots[0]["end"]
                    if len(schedule_slots) > 1:
                        charger_data["next_charge_start_2"] = schedule_slots[1]["start"]
                        charger_data["next_charge_end_2"] = schedule_slots[1]["end"]

                    data[charger_key] = charger_data

                except EonNextAuthError as err:
                    _LOGGER.error("Authentication failed while updating EV data: %s", err)
                    raise ConfigEntryAuthFailed(
                        f"Authentication failed during EV update: {err}"
                    ) from err
                except EonNextApiError as err:
                    _LOGGER.debug("EV API data unavailable for %s: %s", charger.serial, err)
                    if self.data and charger_key in self.data:
                        data[charger_key] = self.data[charger_key]
                except Exception as err:  # pylint: disable=broad-except
                    _LOGGER.debug("Unexpected EV update error for %s: %s", charger.serial, err)
                    if self.data and charger_key in self.data:
                        data[charger_key] = self.data[charger_key]

        if not data and errors:
            raise UpdateFailed(f"Failed to fetch any data: {'; '.join(errors)}")

        return data

    async def _fetch_consumption(self, meter) -> list[dict[str, Any]] | None:
        """Try to fetch daily consumption from REST, then GraphQL fallback."""
        try:
            result = await self.api.async_get_consumption(
                meter.type,
                meter.supply_point_id,
                meter.serial,
                group_by="day",
                page_size=7,
            )
            if result and "results" in result and len(result["results"]) > 0:
                return result["results"]
        except EonNextAuthError:
            raise
        except Exception as err:  # pylint: disable=broad-except
            _LOGGER.debug(
                "REST consumption unavailable for meter %s: %s",
                meter.serial,
                err,
            )

        try:
            fallback = await self.api.async_get_consumption_data_by_mpxn(
                meter.supply_point_id,
                days=7,
            )
            if fallback:
                return fallback
        except EonNextAuthError:
            raise
        except Exception as err:  # pylint: disable=broad-except
            _LOGGER.debug(
                "GraphQL consumptionDataByMpxn fallback unavailable for meter %s: %s",
                meter.serial,
                err,
            )

        return None

    @staticmethod
    def _sum_consumption(consumption_results: list[dict[str, Any]]) -> float | None:
        """Sum consumption values from consumption results."""
        if not consumption_results:
            return None

        total = 0.0
        has_value = False
        for entry in consumption_results:
            consumption = entry.get("consumption")
            if consumption is None:
                continue
            try:
                total += float(consumption)
                has_value = True
            except (TypeError, ValueError):
                continue

        if not has_value:
            return None
        return round(total, 3)

    @staticmethod
    def _schedule_slots(schedule: list[dict[str, Any]] | None) -> list[dict[str, Any]]:
        """Normalize and sort EV schedule slots."""
        if not schedule:
            return []

        slots = []
        for item in schedule:
            if not isinstance(item, dict):
                continue
            start = item.get("start")
            end = item.get("end")
            if not start or not end:
                continue
            slots.append(
                {
                    "start": start,
                    "end": end,
                    "type": item.get("type"),
                    "energy_added_kwh": item.get("energyAddedKwh"),
                }
            )

        slots.sort(key=lambda item: item["start"])
        return slots
