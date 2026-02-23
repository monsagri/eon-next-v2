#!/usr/bin/env python3
"""The Eon Next integration."""

from __future__ import annotations

from homeassistant.core import HomeAssistant
from homeassistant.exceptions import ConfigEntryAuthFailed

from .const import (
    CONF_EMAIL,
    CONF_PASSWORD,
    DEFAULT_UPDATE_INTERVAL_MINUTES,
    PLATFORMS,
)
from .coordinator import EonNextCoordinator
from .eonnext import EonNext
from .models import EonNextConfigEntry, EonNextRuntimeData


async def async_setup_entry(hass: HomeAssistant, entry: EonNextConfigEntry) -> bool:
    """Set up Eon Next from a config entry."""
    api = EonNext()

    success = await api.login_with_username_and_password(
        entry.data[CONF_EMAIL], entry.data[CONF_PASSWORD]
    )
    if not success:
        await api.async_close()
        raise ConfigEntryAuthFailed("Failed to authenticate with Eon Next")

    coordinator = EonNextCoordinator(hass, api, DEFAULT_UPDATE_INTERVAL_MINUTES)
    try:
        await coordinator.async_config_entry_first_refresh()
    except Exception:
        await api.async_close()
        raise

    entry.runtime_data = EonNextRuntimeData(api=api, coordinator=coordinator)
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    return True


async def async_unload_entry(hass: HomeAssistant, entry: EonNextConfigEntry) -> bool:
    """Unload an Eon Next config entry."""
    unload_ok = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
    if unload_ok:
        await entry.runtime_data.api.async_close()
    return unload_ok
