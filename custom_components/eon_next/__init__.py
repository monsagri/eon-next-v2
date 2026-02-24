#!/usr/bin/env python3
"""The Eon Next integration."""

from __future__ import annotations

import logging

from homeassistant.core import HomeAssistant
from homeassistant.exceptions import ConfigEntryAuthFailed

from .const import (
    CONF_EMAIL,
    CONF_PASSWORD,
    CONF_REFRESH_TOKEN,
    DEFAULT_UPDATE_INTERVAL_MINUTES,
    PLATFORMS,
)
from .coordinator import EonNextCoordinator
from .eonnext import EonNext
from .models import EonNextConfigEntry, EonNextRuntimeData

_LOGGER = logging.getLogger(__name__)


async def async_setup_entry(hass: HomeAssistant, entry: EonNextConfigEntry) -> bool:
    """Set up Eon Next from a config entry."""
    api = EonNext()
    authenticated = False

    def _persist_refresh_token(refresh_token: str) -> None:
        """Save the latest refresh token to config entry data."""
        hass.config_entries.async_update_entry(
            entry,
            data={**entry.data, CONF_REFRESH_TOKEN: refresh_token},
        )

    api._on_token_update = _persist_refresh_token
    api.username = entry.data[CONF_EMAIL]
    api.password = entry.data[CONF_PASSWORD]

    # Try stored refresh token first to avoid a redundant username/password login.
    stored_refresh_token = entry.data.get(CONF_REFRESH_TOKEN)
    if stored_refresh_token:
        authenticated = await api.login_with_refresh_token(stored_refresh_token)
        if authenticated:
            _LOGGER.debug("Authenticated using stored refresh token")
        else:
            _LOGGER.debug("Stored refresh token expired, falling back to credentials")

    # Fall back to username/password if refresh token was unavailable or failed.
    if not authenticated:
        authenticated = await api.login_with_username_and_password(
            entry.data[CONF_EMAIL], entry.data[CONF_PASSWORD]
        )
        if not authenticated:
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
