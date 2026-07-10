#!/usr/bin/env python3
"""The Eon Next integration."""

from __future__ import annotations

import logging
import os
from typing import Any

from homeassistant.components.http import StaticPathConfig
from homeassistant.core import HomeAssistant, callback
from homeassistant.exceptions import ConfigEntryAuthFailed, ConfigEntryNotReady
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers import entity_registry as er

from .backfill import EonNextBackfillManager
from .const import (
    CARDS_URL,
    CONF_EMAIL,
    CONF_PASSWORD,
    CONF_PROVIDER,
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
from .cost_tracker import EonNextCostTrackerManager
from .eonnext import EonNextAuthError, KrakenClient
from .models import EonNextConfigEntry, EonNextRuntimeData
from .providers import get_provider
from .services import async_register_services

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

    await async_register_services(hass)

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
    """Reload the entry when its options change.

    The update listener fires on *any* ``async_update_entry`` call,
    including data-only updates such as persisting a rotated refresh
    token. Reloading on those tears down the aiohttp session mid-request
    and flaps entities, so only reload when the options actually changed.
    """
    runtime_data = getattr(entry, "runtime_data", None)
    new_options = dict(entry.options)
    if runtime_data is not None:
        if runtime_data.options == new_options:
            return
        runtime_data.options = new_options
    await hass.config_entries.async_reload(entry.entry_id)


async def _async_migrate_unique_ids(
    hass: HomeAssistant, entry: EonNextConfigEntry
) -> None:
    """Migrate legacy entity unique_ids to entry-scoped ids.

    The historical-backfill status sensor used a hard-coded unique_id, which
    collided when a second E.ON account was added.  Move it to an entry-scoped
    id in place so existing installs keep the same entity.
    """
    legacy = "eon_next__historical_backfill_status"
    new = f"{entry.entry_id}__historical_backfill_status"

    @callback
    def _migrate(entity_entry: er.RegistryEntry) -> dict[str, str] | None:
        if entity_entry.unique_id == legacy:
            return {"new_unique_id": new}
        return None

    await er.async_migrate_entries(hass, entry.entry_id, _migrate)


async def async_setup_entry(hass: HomeAssistant, entry: EonNextConfigEntry) -> bool:
    """Set up Eon Next from a config entry."""
    # Entries created before multi-provider support have no CONF_PROVIDER key;
    # get_provider(None) defaults to E.ON Next, so they set up unchanged.
    api = KrakenClient(get_provider(entry.data.get(CONF_PROVIDER)))
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

    # All login, account/meter loading, and manager initialisation is wrapped
    # so that a failure is mapped to the correct HA outcome (re-auth vs retry)
    # and the owned aiohttp session is always closed - otherwise an auth blip
    # or malformed payload escapes as a bare "Error" and leaks a session per
    # setup retry ("Unclosed client session").
    try:
        # Try stored refresh token first to avoid a redundant password login.
        stored_refresh_token = entry.data.get(CONF_REFRESH_TOKEN)
        if stored_refresh_token:
            authenticated = await api.login_with_refresh_token(stored_refresh_token)
            if authenticated:
                _LOGGER.debug("Authenticated using stored refresh token")
            else:
                _LOGGER.debug(
                    "Stored refresh token expired, falling back to credentials"
                )

        # Fall back to username/password if refresh token was unavailable.
        if not authenticated:
            authenticated = await api.login_with_username_and_password(
                entry.data[CONF_EMAIL], entry.data[CONF_PASSWORD]
            )
            if not authenticated:
                raise ConfigEntryAuthFailed("Failed to authenticate with Eon Next")

        coordinator = EonNextCoordinator(hass, api, DEFAULT_UPDATE_INTERVAL_MINUTES)
        backfill = EonNextBackfillManager(hass, entry, api, coordinator)
        cost_trackers = EonNextCostTrackerManager(hass, entry.entry_id, coordinator)
        await backfill.async_prime()
        await cost_trackers.async_initialize()

        await coordinator.async_config_entry_first_refresh()
        await backfill.async_start()
    except (ConfigEntryAuthFailed, ConfigEntryNotReady):
        # Already classified (e.g. by the coordinator's first refresh); close
        # the owned session and propagate unchanged.
        await api.async_close()
        raise
    except EonNextAuthError as err:
        await api.async_close()
        raise ConfigEntryAuthFailed(
            "Authentication with E.ON Next failed"
        ) from err
    except Exception as err:  # pylint: disable=broad-except
        # Any other failure (API/transport blip, malformed payload, storage
        # error) is transient - let HA retry setup rather than showing an
        # unhandled error, and never leak the session.
        await api.async_close()
        raise ConfigEntryNotReady(
            f"Error setting up E.ON Next integration: {err}"
        ) from err

    entry.runtime_data = EonNextRuntimeData(
        api=api,
        coordinator=coordinator,
        backfill=backfill,
        cost_trackers=cost_trackers,
        options=dict(entry.options),
    )

    await _async_migrate_unique_ids(hass, entry)

    entry.async_on_unload(entry.add_update_listener(_async_update_listener))
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)

    await _async_reconcile_frontend(hass)

    return True


async def async_unload_entry(hass: HomeAssistant, entry: EonNextConfigEntry) -> bool:
    """Unload an Eon Next config entry."""
    unload_ok = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
    if unload_ok:
        await entry.runtime_data.cost_trackers.async_shutdown()
        await entry.runtime_data.backfill.async_stop()
        await entry.runtime_data.api.async_close()

        # Reconcile frontend, excluding the entry being unloaded
        await _async_reconcile_frontend(hass, exclude_entry_id=entry.entry_id)

    return unload_ok
