#!/usr/bin/env python3
"""The Eon Next integration."""

from __future__ import annotations

import logging
import os
from typing import Any

from homeassistant.components.http import StaticPathConfig
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import ConfigEntryAuthFailed, ConfigEntryNotReady
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from homeassistant.helpers import config_validation as cv

from .backfill import EonNextBackfillManager
from .const import (
    CARDS_URL,
    CONF_EMAIL,
    CONF_PASSWORD,
    CONF_REFRESH_TOKEN,
    CONF_SHOW_CARD,
    CONF_SHOW_PANEL,
    DEFAULT_SHOW_CARD,
    DEFAULT_SHOW_PANEL,
    DEFAULT_UPDATE_INTERVAL_MINUTES,
    DOMAIN,
    INTEGRATION_VERSION,
    PLATFORMS,
)
from .coordinator import EonNextCoordinator
from .eonnext import EonNext, EonNextApiError
from .models import EonNextConfigEntry, EonNextRuntimeData

CONFIG_SCHEMA = cv.config_entry_only_config_schema(DOMAIN)

_LOGGER = logging.getLogger(__name__)
_WEBSOCKET_REGISTERED_KEY = f"{DOMAIN}_websocket_registered"


def _get_lovelace_resources(
    hass: HomeAssistant,
    *,
    operation: str,
    required_methods: tuple[str, ...],
) -> Any | None:
    """Return Lovelace resources manager when available for storage dashboards."""
    lovelace = hass.data.get("lovelace")
    if lovelace is None:
        _LOGGER.debug("Lovelace data not available; skipping card resource %s", operation)
        return None

    mode = getattr(lovelace, "mode", None)
    resources = getattr(lovelace, "resources", None)
    if mode is None or resources is None:
        _LOGGER.debug(
            "Lovelace storage API unavailable; skipping card resource %s", operation
        )
        return None

    if mode != "storage":
        return None

    if any(not callable(getattr(resources, method, None)) for method in required_methods):
        _LOGGER.debug(
            "Lovelace resources API incomplete; skipping card resource %s", operation
        )
        return None

    return resources


async def _async_ensure_card_resource(hass: HomeAssistant) -> None:
    """Register or update the Lovelace card resource (storage mode only)."""
    resources = _get_lovelace_resources(
        hass,
        operation="registration",
        required_methods=("async_items", "async_create_item", "async_update_item"),
    )
    if resources is None:
        return

    resource_url = f"{CARDS_URL}?v={INTEGRATION_VERSION}"
    existing = [
        resource
        for resource in resources.async_items()
        if str(resource.get("url", "")).startswith(CARDS_URL)
    ]
    if not existing:
        await resources.async_create_item({"res_type": "module", "url": resource_url})
        return

    for resource in existing:
        if f"v={INTEGRATION_VERSION}" not in str(resource.get("url", "")):
            await resources.async_update_item(
                resource["id"],
                {"res_type": "module", "url": resource_url},
            )


async def _async_remove_card_resource(hass: HomeAssistant) -> None:
    """Remove the Lovelace card resource (storage mode only)."""
    resources = _get_lovelace_resources(
        hass,
        operation="removal",
        required_methods=("async_items", "async_delete_item"),
    )
    if resources is None:
        return

    existing = [
        resource
        for resource in resources.async_items()
        if str(resource.get("url", "")).startswith(CARDS_URL)
    ]
    for resource in existing:
        await resources.async_delete_item(resource["id"])


async def async_setup(hass: HomeAssistant, config: dict[str, Any]) -> bool:
    """Set up integration-wide resources (once, not per config entry).

    Registers the Lovelace card JS bundle as a static path and the
    WebSocket commands shared by the sidebar panel and standalone cards.
    """
    # Serve the compiled card JS bundle (always, so the URL is resolvable)
    cards_path = os.path.join(os.path.dirname(__file__), "frontend", "cards.js")
    if os.path.isfile(cards_path):
        await hass.http.async_register_static_paths(
            [StaticPathConfig(CARDS_URL, cards_path, cache_headers=False)]
        )

    # Register WebSocket commands (shared by panel and cards), once per hass.
    if not hass.data.get(_WEBSOCKET_REGISTERED_KEY):
        from .websocket import async_setup_websocket  # noqa: E402

        async_setup_websocket(hass)
        hass.data[_WEBSOCKET_REGISTERED_KEY] = True

    return True


async def _async_reconcile_frontend(
    hass: HomeAssistant,
    exclude_entry_id: str | None = None,
) -> None:
    """Reconcile panel and card resource based on all loaded entries.

    Call after setup or unload so that the panel/card state reflects the
    union of every loaded entry's options.  ``exclude_entry_id`` is used
    during unload to ignore the entry that is about to be removed.
    """
    from .panel import async_register_panel, async_unregister_panel  # noqa: E402

    entries = hass.config_entries.async_entries(DOMAIN)

    any_panel = False
    any_card = False
    for e in entries:
        if e.entry_id == exclude_entry_id:
            continue
        if getattr(e, "runtime_data", None) is None:
            continue
        any_panel = any_panel or e.options.get(CONF_SHOW_PANEL, DEFAULT_SHOW_PANEL)
        any_card = any_card or e.options.get(CONF_SHOW_CARD, DEFAULT_SHOW_CARD)

    if any_panel:
        await async_register_panel(hass)
    else:
        await async_unregister_panel(hass)

    if any_card:
        await _async_ensure_card_resource(hass)
    else:
        await _async_remove_card_resource(hass)


async def _async_update_listener(
    hass: HomeAssistant, entry: EonNextConfigEntry
) -> None:
    """Handle config entry option updates."""
    await hass.config_entries.async_reload(entry.entry_id)


async def async_setup_entry(hass: HomeAssistant, entry: EonNextConfigEntry) -> bool:
    """Set up Eon Next from a config entry."""
    api = EonNext(session=async_get_clientsession(hass))
    authenticated = False

    def _persist_refresh_token(refresh_token: str) -> None:
        """Save the latest refresh token to config entry data."""
        if entry.data.get(CONF_REFRESH_TOKEN) == refresh_token:
            return
        hass.config_entries.async_update_entry(
            entry,
            data={**entry.data, CONF_REFRESH_TOKEN: refresh_token},
        )

    api.set_token_update_callback(_persist_refresh_token)
    api.username = entry.data[CONF_EMAIL]
    api.password = entry.data[CONF_PASSWORD]

    # Try stored refresh token first to avoid a redundant username/password login.
    stored_refresh_token = entry.data.get(CONF_REFRESH_TOKEN)
    if stored_refresh_token:
        try:
            authenticated = await api.login_with_refresh_token(stored_refresh_token)
        except EonNextApiError as err:
            await api.async_close()
            raise ConfigEntryNotReady(
                f"Unable to reach E.ON Next API: {err}"
            ) from err
        if authenticated:
            _LOGGER.debug("Authenticated using stored refresh token")
        else:
            _LOGGER.debug("Stored refresh token expired, falling back to credentials")

    # Fall back to username/password if refresh token was unavailable or failed.
    if not authenticated:
        try:
            authenticated = await api.login_with_username_and_password(
                entry.data[CONF_EMAIL], entry.data[CONF_PASSWORD]
            )
        except EonNextApiError as err:
            await api.async_close()
            raise ConfigEntryNotReady(
                f"Unable to reach E.ON Next API: {err}"
            ) from err
        if not authenticated:
            await api.async_close()
            raise ConfigEntryAuthFailed("Failed to authenticate with Eon Next")

    coordinator = EonNextCoordinator(hass, api, DEFAULT_UPDATE_INTERVAL_MINUTES)
    backfill = EonNextBackfillManager(hass, entry, api, coordinator)
    await backfill.async_prime()

    try:
        await coordinator.async_config_entry_first_refresh()
    except Exception:
        await api.async_close()
        raise

    await backfill.async_start()
    entry.runtime_data = EonNextRuntimeData(
        api=api,
        coordinator=coordinator,
        backfill=backfill,
    )
    entry.async_on_unload(entry.add_update_listener(_async_update_listener))
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)

    await _async_reconcile_frontend(hass)

    return True


async def async_unload_entry(hass: HomeAssistant, entry: EonNextConfigEntry) -> bool:
    """Unload an Eon Next config entry."""
    unload_ok = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
    if unload_ok:
        await entry.runtime_data.backfill.async_stop()
        await entry.runtime_data.api.async_close()

        # Reconcile frontend, excluding the entry being unloaded
        await _async_reconcile_frontend(hass, exclude_entry_id=entry.entry_id)

    return unload_ok
