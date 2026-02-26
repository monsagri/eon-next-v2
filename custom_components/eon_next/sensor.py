#!/usr/bin/env python3
"""Sensor platform for the Eon Next integration."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from homeassistant.components.sensor import (
    SensorDeviceClass,
    SensorEntity,
    SensorStateClass,
)
from homeassistant.const import EntityCategory, UnitOfEnergy, UnitOfVolume
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.update_coordinator import CoordinatorEntity
from homeassistant.util import dt as dt_util

from .coordinator import ev_data_key
from .eonnext import METER_TYPE_ELECTRIC, METER_TYPE_GAS
from .models import EonNextConfigEntry


def _parse_timestamp(value: Any) -> datetime | None:
    """Parse an ISO8601 datetime string to datetime."""
    if not isinstance(value, str):
        return None
    return dt_util.parse_datetime(value)


async def async_setup_entry(
    _hass: HomeAssistant,
    config_entry: EonNextConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up sensors from a config entry."""

    coordinator = config_entry.runtime_data.coordinator
    api = config_entry.runtime_data.api
    backfill = config_entry.runtime_data.backfill

    entities: list[SensorEntity] = []
    for account in api.accounts:
        for meter in account.meters:
            entities.append(LatestReadingDateSensor(coordinator, meter))

            if meter.type == METER_TYPE_ELECTRIC:
                entities.append(LatestElectricKwhSensor(coordinator, meter))

            if meter.type == METER_TYPE_GAS:
                entities.append(LatestGasCubicMetersSensor(coordinator, meter))
                entities.append(LatestGasKwhSensor(coordinator, meter))

            entities.append(DailyConsumptionSensor(coordinator, meter))
            entities.append(StandingChargeSensor(coordinator, meter))
            entities.append(PreviousDayCostSensor(coordinator, meter))
            entities.append(CurrentUnitRateSensor(coordinator, meter))
            entities.append(CurrentTariffSensor(coordinator, meter))

        for charger in account.ev_chargers:
            entities.append(SmartChargingScheduleSensor(coordinator, charger))
            entities.append(NextChargeStartSensor(coordinator, charger))
            entities.append(NextChargeEndSensor(coordinator, charger))
            entities.append(NextChargeStartSlot2Sensor(coordinator, charger))
            entities.append(NextChargeEndSlot2Sensor(coordinator, charger))

    entities.append(HistoricalBackfillStatusSensor(coordinator, backfill))

    async_add_entities(entities)


class EonNextSensorBase(CoordinatorEntity, SensorEntity):
    """Base class for Eon Next sensors."""

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


class HistoricalBackfillStatusSensor(CoordinatorEntity, SensorEntity):
    """Diagnostic sensor exposing historical backfill status."""

    def __init__(self, coordinator, backfill_manager):
        super().__init__(coordinator)
        self._backfill = backfill_manager
        self._attr_name = "Historical Backfill Status"
        self._attr_icon = "mdi:database-clock-outline"
        self._attr_entity_category = EntityCategory.DIAGNOSTIC
        self._attr_unique_id = "eon_next__historical_backfill_status"

    async def async_added_to_hass(self) -> None:
        """Register status listener when entity is added."""
        await super().async_added_to_hass()

        @callback
        def _handle_status_update() -> None:
            self.async_write_ha_state()

        self.async_on_remove(self._backfill.async_add_listener(_handle_status_update))

    @property
    def native_value(self):
        return self._backfill.get_status()["state"]

    @property
    def extra_state_attributes(self):
        status = self._backfill.get_status()
        return {
            "enabled": status["enabled"],
            "initialized": status["initialized"],
            "rebuild_done": status["rebuild_done"],
            "lookback_days": status["lookback_days"],
            "total_meters": status["total_meters"],
            "completed_meters": status["completed_meters"],
            "pending_meters": status["pending_meters"],
            "next_start_date": status["next_start_date"],
        }


class LatestReadingDateSensor(EonNextSensorBase):
    """Date of latest meter reading."""

    def __init__(self, coordinator, meter):
        super().__init__(coordinator, meter.serial)
        self._attr_name = f"{meter.serial} Reading Date"
        self._attr_device_class = SensorDeviceClass.DATE
        self._attr_icon = "mdi:calendar"
        self._attr_unique_id = f"{meter.serial}__reading_date"

    @property
    def native_value(self):
        data = self._meter_data
        return data.get("latest_reading_date") if data else None


class LatestElectricKwhSensor(EonNextSensorBase):
    """Latest electricity meter reading."""

    def __init__(self, coordinator, meter):
        super().__init__(coordinator, meter.serial)
        self._attr_name = f"{meter.serial} Electricity"
        self._attr_device_class = SensorDeviceClass.ENERGY
        self._attr_native_unit_of_measurement = UnitOfEnergy.KILO_WATT_HOUR
        self._attr_state_class = SensorStateClass.TOTAL
        self._attr_icon = "mdi:meter-electric-outline"
        self._attr_unique_id = f"{meter.serial}__electricity_kwh"

    @property
    def native_value(self):
        data = self._meter_data
        return data.get("latest_reading") if data else None


class LatestGasKwhSensor(EonNextSensorBase):
    """Latest gas meter reading in kWh."""

    def __init__(self, coordinator, meter):
        super().__init__(coordinator, meter.serial)
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
        super().__init__(coordinator, meter.serial)
        self._attr_name = f"{meter.serial} Gas"
        self._attr_device_class = SensorDeviceClass.GAS
        self._attr_native_unit_of_measurement = UnitOfVolume.CUBIC_METERS
        self._attr_state_class = SensorStateClass.TOTAL
        self._attr_icon = "mdi:meter-gas-outline"
        self._attr_unique_id = f"{meter.serial}__gas_m3"

    @property
    def native_value(self):
        data = self._meter_data
        return data.get("latest_reading") if data else None


class DailyConsumptionSensor(EonNextSensorBase):
    """Daily energy consumption from smart meter data."""

    def __init__(self, coordinator, meter):
        super().__init__(coordinator, meter.serial)
        self._attr_name = f"{meter.serial} Daily Consumption"
        self._attr_device_class = SensorDeviceClass.ENERGY
        self._attr_native_unit_of_measurement = UnitOfEnergy.KILO_WATT_HOUR
        self._attr_state_class = SensorStateClass.TOTAL
        self._attr_icon = "mdi:lightning-bolt"
        self._attr_unique_id = f"{meter.serial}__daily_consumption"

    @property
    def last_reset(self) -> datetime | None:
        data = self._meter_data
        if not data:
            return None
        raw = data.get("daily_consumption_last_reset")
        if raw:
            parsed = dt_util.parse_datetime(str(raw))
            if parsed:
                return dt_util.as_utc(parsed)
        return None

    @property
    def native_value(self):
        data = self._meter_data
        return data.get("daily_consumption") if data else None


class StandingChargeSensor(EonNextSensorBase):
    """Daily standing charge (inc VAT)."""

    def __init__(self, coordinator, meter):
        super().__init__(coordinator, meter.serial)
        self._attr_name = f"{meter.serial} Standing Charge"
        self._attr_device_class = SensorDeviceClass.MONETARY
        self._attr_native_unit_of_measurement = "GBP"
        self._attr_state_class = SensorStateClass.TOTAL
        self._attr_icon = "mdi:cash-clock"
        self._attr_unique_id = f"{meter.serial}__standing_charge"

    @property
    def native_value(self):
        data = self._meter_data
        return data.get("standing_charge") if data else None


class PreviousDayCostSensor(EonNextSensorBase):
    """Previous day's total cost inc VAT (consumption + standing charge)."""

    def __init__(self, coordinator, meter):
        super().__init__(coordinator, meter.serial)
        self._attr_name = f"{meter.serial} Previous Day Cost"
        self._attr_device_class = SensorDeviceClass.MONETARY
        self._attr_native_unit_of_measurement = "GBP"
        self._attr_state_class = SensorStateClass.TOTAL
        self._attr_icon = "mdi:currency-gbp"
        self._attr_unique_id = f"{meter.serial}__previous_day_cost"

    @property
    def native_value(self):
        data = self._meter_data
        return data.get("previous_day_cost") if data else None

    @property
    def extra_state_attributes(self):
        data = self._meter_data or {}
        period = data.get("cost_period")
        if period:
            return {"cost_period": period}
        return {}


class CurrentUnitRateSensor(EonNextSensorBase):
    """Current energy unit rate (inc VAT) for use with the HA Energy Dashboard."""

    def __init__(self, coordinator, meter):
        super().__init__(coordinator, meter.serial)
        self._attr_name = f"{meter.serial} Current Unit Rate"
        self._attr_device_class = SensorDeviceClass.MONETARY
        self._attr_native_unit_of_measurement = f"GBP/{UnitOfEnergy.KILO_WATT_HOUR}"
        self._attr_icon = "mdi:currency-gbp"
        self._attr_unique_id = f"{meter.serial}__current_unit_rate"
        self._attr_suggested_display_precision = 4

    @property
    def native_value(self):
        data = self._meter_data
        return data.get("unit_rate") if data else None


class CurrentTariffSensor(EonNextSensorBase):
    """Current active tariff name for a meter point."""

    def __init__(self, coordinator, meter):
        super().__init__(coordinator, meter.serial)
        self._attr_name = f"{meter.serial} Current Tariff"
        self._attr_icon = "mdi:tag-text-outline"
        self._attr_unique_id = f"{meter.serial}__current_tariff"

    @property
    def native_value(self):
        data = self._meter_data
        return data.get("tariff_name") if data else None

    @property
    def extra_state_attributes(self):
        data = self._meter_data or {}
        attrs: dict[str, Any] = {}
        for key in (
            "tariff_code",
            "tariff_type",
            "tariff_unit_rate",
            "tariff_standing_charge",
            "tariff_valid_from",
            "tariff_valid_to",
        ):
            val = data.get(key)
            if val is not None and val != "":
                attrs[key] = val
        return attrs


class SmartChargingScheduleSensor(EonNextSensorBase):
    """Smart charging schedule status."""

    def __init__(self, coordinator, charger):
        super().__init__(coordinator, ev_data_key(charger.device_id))
        self._attr_name = f"{charger.serial} Smart Charging Schedule"
        self._attr_icon = "mdi:ev-station"
        self._attr_unique_id = f"{charger.device_id}__smart_charging_schedule"

    @property
    def native_value(self):
        data = self._meter_data
        if not data:
            return None

        schedule = data.get("schedule", [])
        if schedule:
            return "Active"
        return "No Schedule"

    @property
    def extra_state_attributes(self):
        data = self._meter_data or {}
        return {"schedule": data.get("schedule", [])}


class NextChargeStartSensor(EonNextSensorBase):
    """Start time of next EV charge slot."""

    def __init__(self, coordinator, charger):
        super().__init__(coordinator, ev_data_key(charger.device_id))
        self._attr_name = f"{charger.serial} Next Charge Start"
        self._attr_device_class = SensorDeviceClass.TIMESTAMP
        self._attr_icon = "mdi:clock-start"
        self._attr_unique_id = f"{charger.device_id}__next_charge_start"

    @property
    def native_value(self):
        data = self._meter_data
        if not data:
            return None
        return _parse_timestamp(data.get("next_charge_start"))


class NextChargeEndSensor(EonNextSensorBase):
    """End time of next EV charge slot."""

    def __init__(self, coordinator, charger):
        super().__init__(coordinator, ev_data_key(charger.device_id))
        self._attr_name = f"{charger.serial} Next Charge End"
        self._attr_device_class = SensorDeviceClass.TIMESTAMP
        self._attr_icon = "mdi:clock-end"
        self._attr_unique_id = f"{charger.device_id}__next_charge_end"

    @property
    def native_value(self):
        data = self._meter_data
        if not data:
            return None
        return _parse_timestamp(data.get("next_charge_end"))


class NextChargeStartSlot2Sensor(EonNextSensorBase):
    """Start time of the second EV charge slot."""

    def __init__(self, coordinator, charger):
        super().__init__(coordinator, ev_data_key(charger.device_id))
        self._attr_name = f"{charger.serial} Next Charge Start 2"
        self._attr_device_class = SensorDeviceClass.TIMESTAMP
        self._attr_icon = "mdi:clock-start"
        self._attr_unique_id = f"{charger.device_id}__next_charge_start_2"

    @property
    def native_value(self):
        data = self._meter_data
        if not data:
            return None
        return _parse_timestamp(data.get("next_charge_start_2"))


class NextChargeEndSlot2Sensor(EonNextSensorBase):
    """End time of the second EV charge slot."""

    def __init__(self, coordinator, charger):
        super().__init__(coordinator, ev_data_key(charger.device_id))
        self._attr_name = f"{charger.serial} Next Charge End 2"
        self._attr_device_class = SensorDeviceClass.TIMESTAMP
        self._attr_icon = "mdi:clock-end"
        self._attr_unique_id = f"{charger.device_id}__next_charge_end_2"

    @property
    def native_value(self):
        data = self._meter_data
        if not data:
            return None
        return _parse_timestamp(data.get("next_charge_end_2"))
