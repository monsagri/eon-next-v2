"""Unit tests for EON Next service handlers."""

from __future__ import annotations

from dataclasses import dataclass, field
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.eon_next.const import DOMAIN
from custom_components.eon_next.services import async_register_services
from homeassistant.helpers import entity_registry as er


@dataclass(slots=True)
class _FakeMeter:
    serial: str


@dataclass(slots=True)
class _FakeAccount:
    meters: list[_FakeMeter] = field(default_factory=list)


def _make_entry(hass, *, serial: str) -> tuple[MockConfigEntry, AsyncMock, str]:
    entry = MockConfigEntry(domain=DOMAIN, data={})
    entry.add_to_hass(hass)
    manager = AsyncMock()
    manager.async_add_tracker = AsyncMock()
    manager.async_reset_tracker = AsyncMock()
    manager.async_set_enabled = AsyncMock()
    runtime_data = SimpleNamespace(
        api=SimpleNamespace(accounts=[_FakeAccount(meters=[_FakeMeter(serial=serial)])]),
        cost_trackers=manager,
    )
    entry.runtime_data = runtime_data
    return entry, manager, serial


@pytest.mark.asyncio
async def test_add_cost_tracker_routes_by_meter_serial(hass) -> None:
    """add_cost_tracker should resolve config entry from meter serial."""
    _, manager_a, _ = _make_entry(hass, serial="meter-a")
    _, manager_b, _ = _make_entry(hass, serial="meter-b")
    await async_register_services(hass)

    await hass.services.async_call(
        DOMAIN,
        "add_cost_tracker",
        {
            "name": "Washing Machine",
            "tracked_entity_id": "sensor.washer_energy",
            "meter_serial": "meter-b",
            "enabled": True,
        },
        blocking=True,
    )

    manager_a.async_add_tracker.assert_not_called()
    manager_b.async_add_tracker.assert_awaited_once_with(
        name="Washing Machine",
        tracked_entity_id="sensor.washer_energy",
        meter_serial="meter-b",
        enabled=True,
    )


@pytest.mark.asyncio
async def test_add_cost_tracker_with_unknown_meter_raises(hass) -> None:
    """add_cost_tracker should fail for unknown meter serial."""
    _make_entry(hass, serial="meter-a")
    await async_register_services(hass)

    with pytest.raises(ValueError, match="Unable to resolve config entry"):
        await hass.services.async_call(
            DOMAIN,
            "add_cost_tracker",
            {
                "name": "Dryer",
                "tracked_entity_id": "sensor.dryer_energy",
                "meter_serial": "does-not-exist",
            },
            blocking=True,
        )


@pytest.mark.asyncio
async def test_reset_and_update_cost_tracker_target_entities(hass) -> None:
    """reset/update services should target cost_tracker entities via registry."""
    entry, manager, _ = _make_entry(hass, serial="meter-a")
    await async_register_services(hass)

    registry = er.async_get(hass)
    tracker_entry = registry.async_get_or_create(
        "sensor",
        DOMAIN,
        "cost_tracker__washer",
        config_entry=entry.entry_id,
        suggested_object_id="washer_cost_tracker",
    )
    non_tracker_entry = registry.async_get_or_create(
        "sensor",
        DOMAIN,
        "not_a_cost_tracker",
        config_entry=entry.entry_id,
        suggested_object_id="other_sensor",
    )

    await hass.services.async_call(
        DOMAIN,
        "reset_cost_tracker",
        {"entity_id": [tracker_entry.entity_id, non_tracker_entry.entity_id]},
        blocking=True,
    )
    manager.async_reset_tracker.assert_awaited_once_with("washer")

    await hass.services.async_call(
        DOMAIN,
        "update_cost_tracker",
        {"entity_id": tracker_entry.entity_id, "enabled": False},
        blocking=True,
    )
    manager.async_set_enabled.assert_awaited_once_with("washer", False)
