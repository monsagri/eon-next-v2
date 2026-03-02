"""Service handlers for the Eon Next integration."""

from __future__ import annotations

import voluptuous as vol

from homeassistant.const import ATTR_ENTITY_ID
from homeassistant.core import HomeAssistant, ServiceCall
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers import entity_registry as er

from .const import DOMAIN
from .models import EonNextConfigEntry

SERVICE_ADD_COST_TRACKER = "add_cost_tracker"
SERVICE_RESET_COST_TRACKER = "reset_cost_tracker"
SERVICE_UPDATE_COST_TRACKER = "update_cost_tracker"


def _loaded_entries(hass: HomeAssistant) -> list[EonNextConfigEntry]:
    return [
        entry
        for entry in hass.config_entries.async_entries(DOMAIN)
        if getattr(entry, "runtime_data", None) is not None
    ]


def _extract_tracker_targets(
    hass: HomeAssistant,
    entity_ids: list[str],
) -> list[tuple[EonNextConfigEntry, str]]:
    registry = er.async_get(hass)
    targets: list[tuple[EonNextConfigEntry, str]] = []
    for entity_id in entity_ids:
        registry_entry = registry.async_get(entity_id)
        if registry_entry is None:
            continue
        unique_id = registry_entry.unique_id or ""
        if not unique_id.startswith("cost_tracker__"):
            continue
        tracker_id = unique_id.removeprefix("cost_tracker__")
        entry = next(
            (
                loaded
                for loaded in _loaded_entries(hass)
                if loaded.entry_id == registry_entry.config_entry_id
            ),
            None,
        )
        if entry is None:
            continue
        targets.append((entry, tracker_id))
    return targets


async def async_register_services(hass: HomeAssistant) -> None:
    """Register integration services."""
    if hass.services.has_service(DOMAIN, SERVICE_ADD_COST_TRACKER):
        return

    async def _async_add_cost_tracker(call: ServiceCall) -> None:
        name = call.data["name"]
        tracked_entity_id = call.data["tracked_entity_id"]
        meter_serial = call.data["meter_serial"]
        enabled = bool(call.data.get("enabled", True))
        requested_entry_id = call.data.get("entry_id")

        entries = _loaded_entries(hass)
        entry: EonNextConfigEntry | None
        if requested_entry_id:
            entry = next(
                (loaded for loaded in entries if loaded.entry_id == requested_entry_id),
                None,
            )
        else:
            entry = next(
                (
                    loaded
                    for loaded in entries
                    if any(
                        meter.serial == meter_serial
                        for account in loaded.runtime_data.api.accounts
                        for meter in account.meters
                    )
                ),
                None,
            )
        if entry is None:
            raise ValueError("Unable to resolve config entry for the requested meter")

        await entry.runtime_data.cost_trackers.async_add_tracker(
            name=name,
            tracked_entity_id=tracked_entity_id,
            meter_serial=meter_serial,
            enabled=enabled,
        )

    async def _async_reset_cost_tracker(call: ServiceCall) -> None:
        entity_data = call.data.get(ATTR_ENTITY_ID)
        if isinstance(entity_data, str):
            entity_ids = [entity_data]
        elif isinstance(entity_data, list):
            entity_ids = [entity_id for entity_id in entity_data if isinstance(entity_id, str)]
        else:
            entity_ids = []

        for entry, tracker_id in _extract_tracker_targets(hass, entity_ids):
            await entry.runtime_data.cost_trackers.async_reset_tracker(tracker_id)

    async def _async_update_cost_tracker(call: ServiceCall) -> None:
        enabled = bool(call.data["enabled"])
        entity_data = call.data.get(ATTR_ENTITY_ID)
        if isinstance(entity_data, str):
            entity_ids = [entity_data]
        elif isinstance(entity_data, list):
            entity_ids = [entity_id for entity_id in entity_data if isinstance(entity_id, str)]
        else:
            entity_ids = []

        for entry, tracker_id in _extract_tracker_targets(hass, entity_ids):
            await entry.runtime_data.cost_trackers.async_set_enabled(tracker_id, enabled)

    hass.services.async_register(
        DOMAIN,
        SERVICE_ADD_COST_TRACKER,
        _async_add_cost_tracker,
        schema=vol.Schema(
            {
                vol.Required("name"): cv.string,
                vol.Required("tracked_entity_id"): cv.entity_id,
                vol.Required("meter_serial"): cv.string,
                vol.Optional("enabled", default=True): cv.boolean,
                vol.Optional("entry_id"): cv.string,
            }
        ),
    )
    hass.services.async_register(
        DOMAIN,
        SERVICE_RESET_COST_TRACKER,
        _async_reset_cost_tracker,
        schema=vol.Schema(
            {vol.Required(ATTR_ENTITY_ID): vol.Any(cv.entity_id, [cv.entity_id])}
        ),
    )
    hass.services.async_register(
        DOMAIN,
        SERVICE_UPDATE_COST_TRACKER,
        _async_update_cost_tracker,
        schema=vol.Schema(
            {
                vol.Required(ATTR_ENTITY_ID): vol.Any(cv.entity_id, [cv.entity_id]),
                vol.Required("enabled"): cv.boolean,
            }
        ),
    )


async def async_unregister_services(hass: HomeAssistant) -> None:
    """Unregister integration services."""
    for service in (
        SERVICE_ADD_COST_TRACKER,
        SERVICE_RESET_COST_TRACKER,
        SERVICE_UPDATE_COST_TRACKER,
    ):
        if hass.services.has_service(DOMAIN, service):
            hass.services.async_remove(DOMAIN, service)
