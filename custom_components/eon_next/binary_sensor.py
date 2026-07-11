"""Binary sensor platform for the Eon Next integration."""

from __future__ import annotations

from typing import Any

from homeassistant.components.binary_sensor import BinarySensorEntity
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.update_coordinator import CoordinatorEntity

from .models import EonNextConfigEntry
from .tariff_entity import TariffBoundaryRefreshMixin
from .tariff_helpers import get_off_peak_metadata, is_off_peak


async def async_setup_entry(
    _hass: HomeAssistant,
    config_entry: EonNextConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up binary sensors from a config entry."""
    coordinator = config_entry.runtime_data.coordinator
    api = config_entry.runtime_data.api

    entities: list[BinarySensorEntity] = []
    for account in api.accounts:
        for meter in account.meters:
            entities.append(OffPeakBinarySensor(coordinator, meter))

    async_add_entities(entities)


class EonNextBinarySensorBase(CoordinatorEntity, BinarySensorEntity):
    """Base class for Eon Next binary sensors."""

    def __init__(self, coordinator, data_key: str):
        super().__init__(coordinator)
        self._data_key = data_key

    @property
    def _meter_data(self) -> dict[str, Any] | None:
        if self.coordinator.data and self._data_key in self.coordinator.data:
            return self.coordinator.data[self._data_key]
        return None


class OffPeakBinarySensor(TariffBoundaryRefreshMixin, EonNextBinarySensorBase):
    """Binary sensor indicating whether the current rate period is off-peak.

    On for off-peak windows, off for peak/standard periods, and
    unavailable for flat-rate tariffs that have no off-peak concept.
    """

    def __init__(self, coordinator, meter):
        super().__init__(coordinator, meter.serial)
        self._attr_name = f"{meter.serial} Off Peak"
        self._attr_unique_id = f"{meter.serial}__off_peak"
        self._is_tou = False
        self._off_peak: bool | None = None

    @callback
    def _recompute_tariff_state(self) -> None:
        # Compute once per write instead of scanning the schedule three times
        # (available/is_on/icon) - which could also disagree across a boundary.
        data = self._meter_data
        self._is_tou = bool(data.get("tariff_is_tou", False)) if data else False
        self._off_peak = is_off_peak(data) if data else None

    @property
    def available(self) -> bool:
        if not super().available or self._meter_data is None:
            return False
        return self._is_tou and self._off_peak is not None

    @property
    def is_on(self) -> bool | None:
        return self._off_peak

    @property
    def icon(self) -> str:
        return "mdi:clock-fast" if self._off_peak else "mdi:clock-outline"

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        data = self._meter_data
        if not data:
            return {}
        attrs = get_off_peak_metadata(data)
        tariff_code = data.get("tariff_code")
        if tariff_code:
            attrs["tariff_code"] = tariff_code
        return attrs
