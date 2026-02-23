#!/usr/bin/env python3
"""Sensor platform for the Eon Next integration."""

import logging

from homeassistant.components.sensor import (
    SensorDeviceClass,
    SensorEntity,
    SensorStateClass,
)

from homeassistant.const import (
    UnitOfEnergy,
    UnitOfVolume,
)

from homeassistant.helpers.update_coordinator import CoordinatorEntity

from .const import DOMAIN
from .eonnext import METER_TYPE_GAS, METER_TYPE_ELECTRIC

_LOGGER = logging.getLogger(__name__)


async def async_setup_entry(hass, config_entry, async_add_entities):
    """Set up sensors from a config entry."""
    entry_data = hass.data[DOMAIN][config_entry.entry_id]
    coordinator = entry_data["coordinator"]
    api = entry_data["api"]

    entities = []
    for account in api.accounts:
        for meter in account.meters:
            serial = meter.serial
            if serial not in coordinator.data:
                continue

            entities.append(LatestReadingDateSensor(coordinator, meter))

            if meter.type == METER_TYPE_ELECTRIC:
                entities.append(LatestElectricKwhSensor(coordinator, meter))

            if meter.type == METER_TYPE_GAS:
                entities.append(LatestGasCubicMetersSensor(coordinator, meter))
                entities.append(LatestGasKwhSensor(coordinator, meter))

            # Add daily consumption sensor if REST data is available
            meter_data = coordinator.data.get(serial, {})
            if meter_data.get("daily_consumption") is not None:
                entities.append(DailyConsumptionSensor(coordinator, meter))

    async_add_entities(entities)


class EonNextSensorBase(CoordinatorEntity, SensorEntity):
    """Base class for Eon Next sensors."""

    def __init__(self, coordinator, meter):
        super().__init__(coordinator)
        self._meter_serial = meter.serial

    @property
    def _meter_data(self) -> dict | None:
        if self.coordinator.data and self._meter_serial in self.coordinator.data:
            return self.coordinator.data[self._meter_serial]
        return None

    @property
    def available(self) -> bool:
        return super().available and self._meter_data is not None


class LatestReadingDateSensor(EonNextSensorBase):
    """Date of latest meter reading."""

    def __init__(self, coordinator, meter):
        super().__init__(coordinator, meter)
        self._attr_name = f"{meter.serial} Reading Date"
        self._attr_device_class = SensorDeviceClass.DATE
        self._attr_icon = "mdi:calendar"
        self._attr_unique_id = f"{meter.serial}__reading_date"

    @property
    def native_value(self):
        data = self._meter_data
        return data["latest_reading_date"] if data else None


class LatestElectricKwhSensor(EonNextSensorBase):
    """Latest electricity meter reading."""

    def __init__(self, coordinator, meter):
        super().__init__(coordinator, meter)
        self._attr_name = f"{meter.serial} Electricity"
        self._attr_device_class = SensorDeviceClass.ENERGY
        self._attr_native_unit_of_measurement = UnitOfEnergy.KILO_WATT_HOUR
        self._attr_state_class = SensorStateClass.TOTAL
        self._attr_icon = "mdi:meter-electric-outline"
        self._attr_unique_id = f"{meter.serial}__electricity_kwh"

    @property
    def native_value(self):
        data = self._meter_data
        return data["latest_reading"] if data else None


class LatestGasKwhSensor(EonNextSensorBase):
    """Latest gas meter reading in kWh."""

    def __init__(self, coordinator, meter):
        super().__init__(coordinator, meter)
        self._attr_name = f"{meter.serial} Gas kWh"
        self._attr_device_class = SensorDeviceClass.ENERGY
        self._attr_native_unit_of_measurement = UnitOfEnergy.KILO_WATT_HOUR
        self._attr_state_class = SensorStateClass.TOTAL
        self._attr_icon = "mdi:meter-gas-outline"
        self._attr_unique_id = f"{meter.serial}__gas_kwh"

    @property
    def native_value(self):
        data = self._meter_data
        return data.get("latest_reading_kwh") if data else None


class LatestGasCubicMetersSensor(EonNextSensorBase):
    """Latest gas meter reading in cubic meters."""

    def __init__(self, coordinator, meter):
        super().__init__(coordinator, meter)
        self._attr_name = f"{meter.serial} Gas"
        self._attr_device_class = SensorDeviceClass.GAS
        self._attr_native_unit_of_measurement = UnitOfVolume.CUBIC_METERS
        self._attr_state_class = SensorStateClass.TOTAL
        self._attr_icon = "mdi:meter-gas-outline"
        self._attr_unique_id = f"{meter.serial}__gas_m3"

    @property
    def native_value(self):
        data = self._meter_data
        return data["latest_reading"] if data else None


class DailyConsumptionSensor(EonNextSensorBase):
    """Daily energy consumption from smart meter data."""

    def __init__(self, coordinator, meter):
        super().__init__(coordinator, meter)
        self._attr_name = f"{meter.serial} Daily Consumption"
        self._attr_device_class = SensorDeviceClass.ENERGY
        self._attr_native_unit_of_measurement = UnitOfEnergy.KILO_WATT_HOUR
        self._attr_state_class = SensorStateClass.TOTAL_INCREASING
        self._attr_icon = "mdi:lightning-bolt"
        self._attr_unique_id = f"{meter.serial}__daily_consumption"

    @property
    def native_value(self):
        data = self._meter_data
        return data.get("daily_consumption") if data else None
