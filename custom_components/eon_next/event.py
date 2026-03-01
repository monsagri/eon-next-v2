"""Event platform for the Eon Next integration."""

from __future__ import annotations

from typing import Any

from homeassistant.components.event import EventEntity
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.update_coordinator import CoordinatorEntity

from .models import EonNextConfigEntry
from .tariff_helpers import build_day_rates


async def async_setup_entry(
    _hass: HomeAssistant,
    config_entry: EonNextConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up event entities from a config entry."""
    coordinator = config_entry.runtime_data.coordinator
    api = config_entry.runtime_data.api

    entities: list[EventEntity] = []
    for account in api.accounts:
        for meter in account.meters:
            entities.append(CurrentDayRatesEvent(coordinator, meter))

    async_add_entities(entities)


class EonNextEventBase(CoordinatorEntity, EventEntity):
    """Base class for Eon Next event entities."""

    def __init__(self, coordinator, data_key: str):
        super().__init__(coordinator)
        self._data_key = data_key

    @property
    def _meter_data(self) -> dict[str, Any] | None:
        if self.coordinator.data and self._data_key in self.coordinator.data:
            return self.coordinator.data[self._data_key]
        return None

    @property
    def available(self) -> bool:
        return super().available and self._meter_data is not None


class CurrentDayRatesEvent(EonNextEventBase):
    """Event entity that fires ``rates_updated`` with today's rate schedule.

    For flat-rate tariffs a single window covers the full day.  For
    time-of-use tariffs each rate period is a separate entry.
    """

    _attr_event_types = ["rates_updated"]

    def __init__(self, coordinator, meter):
        super().__init__(coordinator, meter.serial)
        self._attr_name = f"{meter.serial} Current Day Rates"
        self._attr_unique_id = f"{meter.serial}__current_day_rates"
        self._rates: list[dict[str, Any]] = []
        self._tariff_code: str | None = None

    @callback
    def _handle_coordinator_update(self) -> None:
        """Fire rates_updated event on each coordinator refresh."""
        data = self._meter_data
        if data is not None:
            self._rates = build_day_rates(data)
            self._tariff_code = data.get("tariff_code")
            self._trigger_event(
                "rates_updated",
                {"rates": self._rates, "tariff_code": self._tariff_code},
            )
        else:
            self.async_write_ha_state()

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        return {
            "rates": self._rates,
            "tariff_code": self._tariff_code,
        }
