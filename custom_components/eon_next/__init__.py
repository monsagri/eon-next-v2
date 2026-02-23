#!/usr/bin/env python3
"""The Eon Next integration."""

import logging

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant

from .const import DOMAIN, CONF_EMAIL, CONF_PASSWORD, PLATFORMS, DEFAULT_UPDATE_INTERVAL_MINUTES
from .eonnext import EonNext
from .coordinator import EonNextCoordinator

_LOGGER = logging.getLogger(__name__)


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up Eon Next from a config entry."""
    hass.data.setdefault(DOMAIN, {})

    api = EonNext()
    success = await api.login_with_username_and_password(
        entry.data[CONF_EMAIL], entry.data[CONF_PASSWORD]
    )

    if not success:
        _LOGGER.error("Failed to authenticate with Eon Next")
        return False

    coordinator = EonNextCoordinator(
        hass, api, DEFAULT_UPDATE_INTERVAL_MINUTES
    )
    await coordinator.async_config_entry_first_refresh()

    hass.data[DOMAIN][entry.entry_id] = {
        "api": api,
        "coordinator": coordinator,
    }

    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload an Eon Next config entry."""
    unload_ok = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
    if unload_ok:
        entry_data = hass.data[DOMAIN].pop(entry.entry_id)
        await entry_data["api"].async_close()
    return unload_ok
