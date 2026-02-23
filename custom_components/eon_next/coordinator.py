"""DataUpdateCoordinator for the Eon Next integration."""

import logging
from datetime import timedelta

from homeassistant.helpers.update_coordinator import DataUpdateCoordinator, UpdateFailed

from .eonnext import EonNext, EonNextAuthError, EonNextApiError, METER_TYPE_GAS

_LOGGER = logging.getLogger(__name__)


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
        self._consumption_available = None  # None = untested

    async def _async_update_data(self) -> dict:
        """Fetch data from the Eon Next API."""
        data = {}
        errors = []

        for account in self.api.accounts:
            for meter in account.meters:
                try:
                    await meter._update()

                    meter_data = {
                        "type": meter.type,
                        "serial": meter.serial,
                        "meter_id": meter.meter_id,
                        "supply_point_id": meter.supply_point_id,
                        "latest_reading": meter.latest_reading,
                        "latest_reading_date": meter.latest_reading_date,
                    }

                    # Compute gas kWh from m3 reading
                    if meter.type == METER_TYPE_GAS and meter.latest_reading is not None:
                        meter_data["latest_reading_kwh"] = meter.get_latest_reading_kwh(
                            meter.latest_reading
                        )

                    # Try REST consumption endpoint (half-hourly/daily data)
                    consumption = await self._fetch_consumption(meter)
                    if consumption is not None:
                        meter_data["consumption"] = consumption
                        meter_data["daily_consumption"] = self._sum_consumption(consumption)

                    data[meter.serial] = meter_data

                except EonNextAuthError as err:
                    _LOGGER.error("Authentication failed during update: %s", err)
                    raise UpdateFailed(f"Authentication failed: {err}") from err
                except EonNextApiError as err:
                    _LOGGER.warning("API error updating meter %s: %s", meter.serial, err)
                    errors.append(str(err))
                    # Preserve previous data for this meter if available
                    if self.data and meter.serial in self.data:
                        data[meter.serial] = self.data[meter.serial]
                except Exception as err:
                    _LOGGER.warning("Unexpected error updating meter %s: %s", meter.serial, err)
                    errors.append(str(err))
                    if self.data and meter.serial in self.data:
                        data[meter.serial] = self.data[meter.serial]

        if not data and errors:
            raise UpdateFailed(f"Failed to fetch any meter data: {'; '.join(errors)}")

        return data

    async def _fetch_consumption(self, meter) -> list | None:
        """Try to fetch consumption data from the REST API."""
        if self._consumption_available is False:
            return None

        try:
            result = await self.api.async_get_consumption(
                meter.type,
                meter.supply_point_id,
                meter.serial,
                group_by="day",
                page_size=7,
            )
            if result and "results" in result and len(result["results"]) > 0:
                self._consumption_available = True
                return result["results"]
            else:
                if self._consumption_available is None:
                    _LOGGER.debug(
                        "REST consumption endpoint not available, "
                        "falling back to meter readings only"
                    )
                self._consumption_available = False
                return None
        except Exception:
            if self._consumption_available is None:
                _LOGGER.debug(
                    "REST consumption endpoint not available, "
                    "falling back to meter readings only"
                )
            self._consumption_available = False
            return None

    @staticmethod
    def _sum_consumption(consumption_results: list) -> float | None:
        """Sum consumption values from the REST API results."""
        if not consumption_results:
            return None
        total = sum(
            float(entry.get("consumption", 0))
            for entry in consumption_results
            if entry.get("consumption") is not None
        )
        return round(total, 3)
