"""DataUpdateCoordinator for the Eon Next integration."""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Any

from homeassistant.exceptions import ConfigEntryAuthFailed
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator, UpdateFailed
from homeassistant.util import dt as dt_util

from .eonnext import (
    EonNext,
    EonNextApiError,
    EonNextAuthError,
    GasMeter,
    METER_TYPE_GAS,
)
from .statistics import async_import_consumption_statistics

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
        self._statistics_import_enabled = True

    def set_statistics_import_enabled(self, enabled: bool) -> None:
        """Enable or disable automatic statistics imports during updates."""
        self._statistics_import_enabled = enabled

    async def _async_update_data(self) -> dict[str, dict[str, Any]]:
        """Fetch data from the Eon Next API."""
        data: dict[str, dict[str, Any]] = {}
        errors: list[str] = []

        for account in self.api.accounts:
            account_tariffs = await self._fetch_tariff_data(account)

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
                        # Defaults for cost/tariff fields — overwritten below
                        # when the respective API calls succeed.
                        "daily_consumption": None,
                        "daily_consumption_last_reset": None,
                        "standing_charge": None,
                        "previous_day_cost": None,
                        "cost_period": None,
                        "unit_rate": None,
                        "tariff_name": None,
                        "tariff_code": None,
                        "tariff_type": None,
                        "tariff_unit_rate": None,
                        "tariff_standing_charge": None,
                        "tariff_valid_from": None,
                        "tariff_valid_to": None,
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
                        daily = self._aggregate_daily_consumption(consumption)
                        meter_data["daily_consumption"] = daily["total"]
                        meter_data["daily_consumption_last_reset"] = daily[
                            "last_reset"
                        ]

                        if self._statistics_import_enabled:
                            try:
                                await async_import_consumption_statistics(
                                    self.hass,
                                    meter.serial,
                                    meter.type,
                                    consumption,
                                )
                            except Exception as err:  # pylint: disable=broad-except
                                _LOGGER.debug(
                                    "Statistics import failed for meter %s: %s",
                                    meter.serial,
                                    err,
                                )

                    cost_data = await self._fetch_daily_costs(meter)
                    if cost_data:
                        meter_data["standing_charge"] = cost_data["standing_charge"]
                        meter_data["previous_day_cost"] = cost_data["total_cost"]
                        meter_data["cost_period"] = cost_data["period"]
                        meter_data["unit_rate"] = cost_data.get("unit_rate")
                    else:
                        # Use previous values when available to avoid
                        # flipping sensors to "unknown" on transient failures.
                        # Check each field independently — _parse_cost_item
                        # can return standing_charge=None while still
                        # providing total_cost or unit_rate.
                        prev = self.data.get(meter_key, {}) if self.data else {}
                        _cost_keys = (
                            "standing_charge",
                            "previous_day_cost",
                            "cost_period",
                            "unit_rate",
                        )
                        has_prev = any(
                            prev.get(k) is not None for k in _cost_keys
                        )
                        if has_prev:
                            for k in _cost_keys:
                                if prev.get(k) is not None:
                                    meter_data[k] = prev[k]
                            _LOGGER.debug(
                                "No new cost data for meter %s; "
                                "retaining previous values",
                                meter.serial,
                            )
                        else:
                            _LOGGER.warning(
                                "No cost data available for meter %s — "
                                "standing charge, previous day cost, and unit "
                                "rate sensors will show as unknown until data "
                                "arrives from the API",
                                meter.serial,
                            )

                    tariff = (
                        account_tariffs.get(meter.supply_point_id)
                        if account_tariffs
                        else None
                    )
                    if tariff:
                        meter_data["tariff_name"] = tariff.get("tariff_name")
                        meter_data["tariff_code"] = tariff.get("tariff_code")
                        meter_data["tariff_type"] = tariff.get("tariff_type")
                        meter_data["tariff_unit_rate"] = self._pence_to_pounds(
                            tariff.get("unit_rate")
                        )
                        meter_data["tariff_standing_charge"] = self._pence_to_pounds(
                            tariff.get("standing_charge")
                        )
                        meter_data["tariff_valid_from"] = tariff.get("valid_from")
                        meter_data["tariff_valid_to"] = tariff.get("valid_to")
                    else:
                        # Retain previous tariff values on transient failures.
                        prev = self.data.get(meter_key, {}) if self.data else {}
                        if prev.get("tariff_name") is not None:
                            for key in (
                                "tariff_name",
                                "tariff_code",
                                "tariff_type",
                                "tariff_unit_rate",
                                "tariff_standing_charge",
                                "tariff_valid_from",
                                "tariff_valid_to",
                            ):
                                meter_data[key] = prev.get(key)
                            _LOGGER.debug(
                                "No new tariff data for meter %s; "
                                "retaining previous values",
                                meter.serial,
                            )
                        else:
                            _LOGGER.warning(
                                "No tariff data available for meter %s "
                                "(supply point %s) — tariff sensor will show "
                                "as unknown until data arrives from the API",
                                meter.serial,
                                meter.supply_point_id,
                            )

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

    async def _fetch_tariff_data(self, account) -> dict[str, dict[str, Any]] | None:
        """Fetch tariff agreement data for all meter points on an account."""
        try:
            return await self.api.async_get_tariff_data(account.account_number)
        except EonNextAuthError as err:
            raise ConfigEntryAuthFailed(
                f"Authentication failed fetching tariffs: {err}"
            ) from err
        except Exception as err:  # pylint: disable=broad-except
            _LOGGER.warning(
                "Tariff data unavailable for account %s: %s",
                account.account_number,
                err,
            )
            return None

    async def _fetch_daily_costs(self, meter) -> dict[str, Any] | None:
        """Fetch daily cost data for the most recent complete day."""
        try:
            return await self.api.async_get_daily_costs(meter.supply_point_id)
        except EonNextAuthError:
            raise
        except Exception as err:  # pylint: disable=broad-except
            _LOGGER.warning(
                "Daily cost data unavailable for meter %s: %s",
                meter.serial,
                err,
            )
            return None

    async def _fetch_consumption(self, meter) -> list[dict[str, Any]] | None:
        """Fetch consumption data, preferring half-hourly granularity.

        Tries half-hourly REST data first (up to 48 half-hour slots,
        approximately one day depending on availability), then falls back to
        daily REST data, then to the GraphQL consumptionDataByMpxn query.
        """
        # Try half-hourly data first (up to 48 slots, ~1 day when available)
        try:
            result = await self.api.async_get_consumption(
                meter.type,
                meter.supply_point_id,
                meter.serial,
                group_by="half_hour",
                page_size=48,
            )
            if result and "results" in result and len(result["results"]) > 0:
                return result["results"]
        except EonNextAuthError:
            raise
        except Exception as err:  # pylint: disable=broad-except
            _LOGGER.debug(
                "REST half-hourly consumption unavailable for meter %s: %s",
                meter.serial,
                err,
            )

        # Fall back to daily-grouped REST data
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
                "REST daily consumption unavailable for meter %s: %s",
                meter.serial,
                err,
            )

        # Fall back to GraphQL
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
    def _pence_to_pounds(value: Any) -> float | None:
        """Convert a pence value to pounds, returning None on failure."""
        if value is None:
            return None
        try:
            return round(float(value) / 100.0, 4)
        except (TypeError, ValueError):
            return None

    @staticmethod
    def _aggregate_daily_consumption(
        consumption_results: list[dict[str, Any]],
    ) -> dict[str, Any]:
        """Sum today's consumption and derive last_reset from the data.

        Filters entries to today's date in Home Assistant local time and sums
        their consumption values. Returns a dict with ``total`` (float | None)
        and ``last_reset`` (str | None) — the original interval_start value
        of the earliest entry included in the sum.
        """
        today = dt_util.now().date()

        total = 0.0
        has_value = False
        earliest_start_utc: datetime | None = None
        earliest_start: str | None = None

        for entry in consumption_results:
            interval_start = entry.get("interval_start") or ""
            parsed_start = dt_util.parse_datetime(str(interval_start))
            if parsed_start is None:
                continue

            if parsed_start.tzinfo is None:
                parsed_start = parsed_start.replace(tzinfo=timezone.utc)

            local_start = dt_util.as_local(parsed_start)
            parsed_start_utc = dt_util.as_utc(local_start)

            # Keep entries whose local date falls on today.
            if local_start.date() != today:
                continue

            consumption = entry.get("consumption")
            if consumption is None:
                continue
            try:
                val = float(consumption)
            except (TypeError, ValueError):
                continue

            total += val
            has_value = True
            if earliest_start_utc is None or parsed_start_utc < earliest_start_utc:
                earliest_start_utc = parsed_start_utc
                earliest_start = interval_start

        return {
            "total": round(total, 3) if has_value else None,
            "last_reset": earliest_start,
        }

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

        try:
            slots.sort(key=lambda item: str(item["start"]))
        except Exception as err:  # pylint: disable=broad-except
            _LOGGER.debug("Unable to sort EV schedule slots by start time: %s", err)
        return slots
