"""Service handlers for the Eon Next integration."""

from __future__ import annotations

import voluptuous as vol

from homeassistant.core import HomeAssistant, ServiceCall
from homeassistant.exceptions import ServiceValidationError
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers.target import (
    TargetSelection,
    async_extract_referenced_entity_ids,
)

from .const import DOMAIN
from .cost_tracker import VALID_ENERGY_UNITS, VALID_POWER_UNITS
from .models import EonNextConfigEntry

SERVICE_ADD_COST_TRACKER = "add_cost_tracker"
SERVICE_RESET_COST_TRACKER = "reset_cost_tracker"
SERVICE_UPDATE_COST_TRACKER = "update_cost_tracker"
SERVICE_REMOVE_COST_TRACKER = "remove_cost_tracker"

_VALID_TRACKED_UNITS = VALID_POWER_UNITS | VALID_ENERGY_UNITS
_VALID_TRACKED_DEVICE_CLASSES = {"power", "energy"}


def _loaded_entries(hass: HomeAssistant) -> list[EonNextConfigEntry]:
    return [
        entry
        for entry in hass.config_entries.async_entries(DOMAIN)
        if getattr(entry, "runtime_data", None) is not None
    ]


def _entry_has_meter(entry: EonNextConfigEntry, meter_serial: str) -> bool:
    return any(
        meter.serial == meter_serial
        for account in entry.runtime_data.api.accounts
        for meter in account.meters
    )


def _tracker_target_for_entity(
    hass: HomeAssistant,
    entity_id: str,
) -> tuple[EonNextConfigEntry, str] | None:
    """Resolve a single entity_id to its (entry, tracker_id), or None."""
    registry = er.async_get(hass)
    registry_entry = registry.async_get(entity_id)
    if registry_entry is None:
        return None
    unique_id = registry_entry.unique_id or ""
    if not unique_id.startswith("cost_tracker__"):
        return None
    tracker_suffix = unique_id.removeprefix("cost_tracker__")
    current_prefix = f"{registry_entry.config_entry_id}__"
    if not tracker_suffix.startswith(current_prefix):
        return None
    tracker_id = tracker_suffix.removeprefix(current_prefix)
    entry = next(
        (
            loaded
            for loaded in _loaded_entries(hass)
            if loaded.entry_id == registry_entry.config_entry_id
        ),
        None,
    )
    if entry is None:
        return None
    return (entry, tracker_id)


def _resolve_tracker_targets(
    hass: HomeAssistant,
    call: ServiceCall,
) -> list[tuple[EonNextConfigEntry, str]]:
    """Resolve a target selection to cost-tracker targets.

    Entities named explicitly (``entity_id``) must be E.ON Next cost trackers;
    anything else raises ``ServiceValidationError`` so a typo is not a silent
    no-op.  Entities pulled in indirectly via a device/area/label are filtered
    to the trackers among them (a device may legitimately hold other entities).
    """
    selected = async_extract_referenced_entity_ids(hass, TargetSelection(call.data))

    targets: list[tuple[EonNextConfigEntry, str]] = []
    invalid: list[str] = []
    for entity_id in selected.referenced:
        target = _tracker_target_for_entity(hass, entity_id)
        if target is None:
            invalid.append(entity_id)
        else:
            targets.append(target)
    if invalid:
        raise ServiceValidationError(
            "Not E.ON Next cost tracker sensors: " + ", ".join(sorted(invalid))
        )

    for entity_id in selected.indirectly_referenced:
        target = _tracker_target_for_entity(hass, entity_id)
        if target is not None:
            targets.append(target)
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

        # Validate the tracked entity exists and looks like a power/energy
        # sensor, otherwise the tracker silently never accrues any cost.
        state = hass.states.get(tracked_entity_id)
        if state is None:
            raise ServiceValidationError(
                f"Tracked entity {tracked_entity_id} does not exist"
            )
        unit = str(state.attributes.get("unit_of_measurement") or "")
        device_class = str(state.attributes.get("device_class") or "")
        if (
            unit not in _VALID_TRACKED_UNITS
            and device_class not in _VALID_TRACKED_DEVICE_CLASSES
        ):
            raise ServiceValidationError(
                f"Tracked entity {tracked_entity_id} must be a power or energy "
                f"sensor (unit one of {sorted(_VALID_TRACKED_UNITS)})"
            )

        entries = _loaded_entries(hass)
        entry: EonNextConfigEntry | None
        if requested_entry_id:
            entry = next(
                (loaded for loaded in entries if loaded.entry_id == requested_entry_id),
                None,
            )
            if entry is not None and not _entry_has_meter(entry, meter_serial):
                raise ServiceValidationError(
                    f"Config entry {requested_entry_id!r} has no meter "
                    f"{meter_serial!r}"
                )
        else:
            entry = next(
                (loaded for loaded in entries if _entry_has_meter(loaded, meter_serial)),
                None,
            )
        if entry is None:
            raise ServiceValidationError(
                f"Unable to resolve config entry for meter_serial={meter_serial!r} "
                f"entry_id={requested_entry_id!r}"
            )

        await entry.runtime_data.cost_trackers.async_add_tracker(
            name=name,
            tracked_entity_id=tracked_entity_id,
            meter_serial=meter_serial,
            enabled=enabled,
        )

    async def _async_reset_cost_tracker(call: ServiceCall) -> None:
        for entry, tracker_id in _resolve_tracker_targets(hass, call):
            await entry.runtime_data.cost_trackers.async_reset_tracker(tracker_id)

    async def _async_update_cost_tracker(call: ServiceCall) -> None:
        enabled = bool(call.data["enabled"])
        for entry, tracker_id in _resolve_tracker_targets(hass, call):
            await entry.runtime_data.cost_trackers.async_set_enabled(tracker_id, enabled)

    async def _async_remove_cost_tracker(call: ServiceCall) -> None:
        for entry, tracker_id in _resolve_tracker_targets(hass, call):
            await entry.runtime_data.cost_trackers.async_remove_tracker(tracker_id)

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
        schema=cv.make_entity_service_schema({}),
    )
    hass.services.async_register(
        DOMAIN,
        SERVICE_UPDATE_COST_TRACKER,
        _async_update_cost_tracker,
        schema=cv.make_entity_service_schema({vol.Required("enabled"): cv.boolean}),
    )
    hass.services.async_register(
        DOMAIN,
        SERVICE_REMOVE_COST_TRACKER,
        _async_remove_cost_tracker,
        schema=cv.make_entity_service_schema({}),
    )
