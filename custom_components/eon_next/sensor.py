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
from homeassistant.helpers.restore_state import RestoreEntity
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.update_coordinator import CoordinatorEntity
from homeassistant.util import dt as dt_util

from .coordinator import ev_data_key
from .cost_tracker import EonNextCostTrackerManager
from .eonnext import METER_TYPE_ELECTRIC, METER_TYPE_GAS, ElectricityMeter
from .models import EonNextConfigEntry
from .tariff_helpers import RateInfo, get_next_rate, get_previous_rate


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
    cost_trackers = config_entry.runtime_data.cost_trackers

    entities: list[SensorEntity] = []
    for account in api.accounts:
        account_number = getattr(account, "account_number", None)
        if account_number:
            entities.append(AccountBalanceSensor(coordinator, account_number))

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
            entities.append(PreviousUnitRateSensor(coordinator, meter))
            entities.append(NextUnitRateSensor(coordinator, meter))
            entities.append(PreviousDayConsumptionSensor(coordinator, meter))

            if isinstance(meter, ElectricityMeter) and meter.is_export:
                entities.append(ExportUnitRateSensor(coordinator, meter))
                entities.append(ExportDailyConsumptionSensor(coordinator, meter))

        for charger in account.ev_chargers:
            entities.append(SmartChargingScheduleSensor(coordinator, charger))
            entities.append(NextChargeStartSensor(coordinator, charger))
            entities.append(NextChargeEndSensor(coordinator, charger))
            entities.append(NextChargeStartSlot2Sensor(coordinator, charger))
            entities.append(NextChargeEndSlot2Sensor(coordinator, charger))

    entities.append(HistoricalBackfillStatusSensor(coordinator, backfill))

    tracker_entity_ids = cost_trackers.list_tracker_ids()
    for tracker_id in tracker_entity_ids:
        entities.append(CostTrackerSensor(cost_trackers, tracker_id))

    async_add_entities(entities)

    known_tracker_ids = set(tracker_entity_ids)

    @callback
    def _handle_tracker_added(tracker_id: str) -> None:
        if tracker_id in known_tracker_ids:
            return
        known_tracker_ids.add(tracker_id)
        async_add_entities([CostTrackerSensor(cost_trackers, tracker_id)])

    config_entry.async_on_unload(
        cost_trackers.async_add_list_listener(_handle_tracker_added)
    )


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
        attrs: dict[str, Any] = {
            "enabled": status["enabled"],
            "initialized": status["initialized"],
            "rebuild_done": status["rebuild_done"],
            "lookback_days": status["lookback_days"],
            "total_meters": status["total_meters"],
            "completed_meters": status["completed_meters"],
            "pending_meters": status["pending_meters"],
            "next_start_date": status["next_start_date"],
        }
        meters_progress = status.get("meters_progress", {})
        if meters_progress:
            attrs["meters_progress"] = meters_progress
        return attrs


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


class PreviousDayConsumptionSensor(EonNextSensorBase):
    """Yesterday's total consumption."""

    def __init__(self, coordinator, meter):
        super().__init__(coordinator, meter.serial)
        self._attr_name = f"{meter.serial} Previous Day Consumption"
        self._attr_device_class = SensorDeviceClass.ENERGY
        self._attr_native_unit_of_measurement = UnitOfEnergy.KILO_WATT_HOUR
        self._attr_state_class = SensorStateClass.TOTAL
        self._attr_icon = "mdi:history"
        self._attr_unique_id = f"{meter.serial}__previous_day_consumption"

    @property
    def last_reset(self) -> datetime | None:
        data = self._meter_data
        if not data:
            return None
        raw = data.get("previous_day_consumption_last_reset")
        if not raw:
            return None
        parsed = dt_util.parse_datetime(str(raw))
        return dt_util.as_utc(parsed) if parsed else None

    @property
    def native_value(self):
        data = self._meter_data
        return data.get("previous_day_consumption") if data else None

    @property
    def extra_state_attributes(self):
        data = self._meter_data or {}
        return {
            "entry_count": data.get("previous_day_consumption_entry_count", 0),
            "data_complete": data.get("previous_day_consumption_data_complete", False),
        }


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


class AccountBalanceSensor(EonNextSensorBase):
    """Account balance in pounds."""

    def __init__(self, coordinator, account_number: str):
        super().__init__(coordinator, f"account::{account_number}")
        self._account_number = account_number
        self._attr_name = f"{account_number} Account Balance"
        self._attr_device_class = SensorDeviceClass.MONETARY
        self._attr_native_unit_of_measurement = "GBP"
        self._attr_icon = "mdi:wallet-outline"
        self._attr_unique_id = f"{account_number}__account_balance"

    @property
    def native_value(self):
        data = self._meter_data
        return data.get("balance") if data else None

    @property
    def extra_state_attributes(self):
        data = self._meter_data or {}
        return {
            "account_number": self._account_number,
            "last_updated": data.get("last_updated"),
        }


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


class PreviousUnitRateSensor(EonNextSensorBase):
    """Most recent unit rate that differs from the current rate."""

    def __init__(self, coordinator, meter):
        super().__init__(coordinator, meter.serial)
        self._attr_name = f"{meter.serial} Previous Unit Rate"
        self._attr_device_class = SensorDeviceClass.MONETARY
        self._attr_native_unit_of_measurement = f"GBP/{UnitOfEnergy.KILO_WATT_HOUR}"
        self._attr_icon = "mdi:currency-gbp"
        self._attr_unique_id = f"{meter.serial}__previous_unit_rate"
        self._attr_suggested_display_precision = 4
        self._rate_info: RateInfo | None = None

    @callback
    def _handle_coordinator_update(self) -> None:
        data = self._meter_data
        self._rate_info = get_previous_rate(data) if data else None
        super()._handle_coordinator_update()

    def _get_rate_info(self) -> RateInfo | None:
        if self._rate_info is not None:
            return self._rate_info
        data = self._meter_data
        return get_previous_rate(data) if data else None

    @property
    def native_value(self):
        info = self._get_rate_info()
        return info.rate if info else None

    @property
    def extra_state_attributes(self):
        data = self._meter_data
        if not data:
            return {}
        info = self._get_rate_info()
        if not info:
            return {}
        attrs: dict[str, Any] = {}
        if info.valid_from is not None:
            attrs["valid_from"] = info.valid_from
        if info.valid_to is not None:
            attrs["valid_to"] = info.valid_to
        tariff_code = data.get("tariff_code")
        if tariff_code:
            attrs["tariff_code"] = tariff_code
        return attrs


class NextUnitRateSensor(EonNextSensorBase):
    """Next upcoming unit rate that differs from the current rate."""

    def __init__(self, coordinator, meter):
        super().__init__(coordinator, meter.serial)
        self._attr_name = f"{meter.serial} Next Unit Rate"
        self._attr_device_class = SensorDeviceClass.MONETARY
        self._attr_native_unit_of_measurement = f"GBP/{UnitOfEnergy.KILO_WATT_HOUR}"
        self._attr_icon = "mdi:currency-gbp"
        self._attr_unique_id = f"{meter.serial}__next_unit_rate"
        self._attr_suggested_display_precision = 4
        self._rate_info: RateInfo | None = None

    @callback
    def _handle_coordinator_update(self) -> None:
        data = self._meter_data
        self._rate_info = get_next_rate(data) if data else None
        super()._handle_coordinator_update()

    def _get_rate_info(self) -> RateInfo | None:
        if self._rate_info is not None:
            return self._rate_info
        data = self._meter_data
        return get_next_rate(data) if data else None

    @property
    def native_value(self):
        info = self._get_rate_info()
        return info.rate if info else None

    @property
    def extra_state_attributes(self):
        data = self._meter_data
        if not data:
            return {}
        info = self._get_rate_info()
        if not info:
            return {}
        attrs: dict[str, Any] = {}
        if info.valid_from is not None:
            attrs["valid_from"] = info.valid_from
        if info.valid_to is not None:
            attrs["valid_to"] = info.valid_to
        tariff_code = data.get("tariff_code")
        if tariff_code:
            attrs["tariff_code"] = tariff_code
        return attrs


class ExportUnitRateSensor(EonNextSensorBase):
    """Current export unit rate for export meters."""

    def __init__(self, coordinator, meter):
        super().__init__(coordinator, meter.serial)
        self._attr_name = f"{meter.serial} Export Unit Rate"
        self._attr_device_class = SensorDeviceClass.MONETARY
        self._attr_native_unit_of_measurement = f"GBP/{UnitOfEnergy.KILO_WATT_HOUR}"
        self._attr_icon = "mdi:solar-power"
        self._attr_unique_id = f"{meter.serial}__export_unit_rate"
        self._attr_suggested_display_precision = 4

    @property
    def native_value(self):
        data = self._meter_data
        return data.get("unit_rate") if data else None

    @property
    def extra_state_attributes(self):
        data = self._meter_data or {}
        attrs: dict[str, Any] = {}
        for key in (
            "tariff_code",
            "tariff_name",
            "tariff_valid_from",
            "tariff_valid_to",
        ):
            val = data.get(key)
            if val is not None and val != "":
                attrs[key] = val
        return attrs


class ExportDailyConsumptionSensor(EonNextSensorBase):
    """Daily export consumption for export meters."""

    def __init__(self, coordinator, meter):
        super().__init__(coordinator, meter.serial)
        self._attr_name = f"{meter.serial} Export Daily Consumption"
        self._attr_device_class = SensorDeviceClass.ENERGY
        self._attr_native_unit_of_measurement = UnitOfEnergy.KILO_WATT_HOUR
        self._attr_state_class = SensorStateClass.TOTAL
        self._attr_icon = "mdi:solar-power"
        self._attr_unique_id = f"{meter.serial}__export_daily_consumption"

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


class CostTrackerSensor(RestoreEntity, SensorEntity):
    """User-defined cost tracker sensor."""

    _attr_device_class = SensorDeviceClass.MONETARY
    _attr_native_unit_of_measurement = "GBP"
    _attr_state_class = SensorStateClass.TOTAL
    _attr_icon = "mdi:cash-plus"
    _attr_suggested_display_precision = 4

    def __init__(
        self,
        manager: EonNextCostTrackerManager,
        tracker_id: str,
    ) -> None:
        self._manager = manager
        self._tracker_id = tracker_id
        self._attr_unique_id = f"cost_tracker__{tracker_id}"
        config = self._manager.get_config(tracker_id)
        display_name = config.name if config else tracker_id
        self._attr_name = f"{display_name} Cost Tracker"

    async def async_added_to_hass(self) -> None:
        """Register tracker-state listener."""
        await super().async_added_to_hass()

        @callback
        def _on_tracker_update() -> None:
            self.async_write_ha_state()

        self.async_on_remove(
            self._manager.async_add_state_listener(self._tracker_id, _on_tracker_update)
        )

    @property
    def available(self) -> bool:
        return self._manager.has_tracker(self._tracker_id)

    @property
    def native_value(self):
        state = self._manager.get_state(self._tracker_id)
        if state is None:
            return None
        return state.today_cost

    @property
    def last_reset(self) -> datetime | None:
        state = self._manager.get_state(self._tracker_id)
        if state is None or not state.last_reset:
            return None
        parsed = dt_util.parse_datetime(state.last_reset)
        return dt_util.as_utc(parsed) if parsed else None

    @property
    def extra_state_attributes(self):
        config = self._manager.get_config(self._tracker_id)
        state = self._manager.get_state(self._tracker_id)
        if config is None or state is None:
            return {}
        return {
            "tracked_entity": config.tracked_entity_id,
            "meter_serial": config.meter_serial,
            "today_consumption_kwh": round(state.today_consumption_kwh, 6),
            "today_cost": state.today_cost,
            "last_reset": state.last_reset,
            "enabled": config.enabled,
            "entry_id": self._manager.entry_id,
        }
