"""Sidebar panel registration for the EON Next dashboard."""

from __future__ import annotations

import logging
import os

from homeassistant.components.http import StaticPathConfig
from homeassistant.core import HomeAssistant

from .const import DOMAIN, PANEL_ICON, PANEL_TITLE, PANEL_URL

_LOGGER = logging.getLogger(__name__)


async def async_register_panel(hass: HomeAssistant) -> None:
    """Register the EON Next sidebar panel.

    Guarded so that only the first config entry triggers registration.
    Requires the ``panel_custom`` component; silently skips if unavailable.
    """
    if DOMAIN in hass.data.get("frontend_panels", {}):
        return

    if "panel_custom" not in hass.config.components:
        _LOGGER.debug("panel_custom not available; skipping panel registration")
        return

    from homeassistant.components import panel_custom  # noqa: E402

    panel_path = os.path.join(os.path.dirname(__file__), "frontend", "entrypoint.js")

    await hass.http.async_register_static_paths(
        [StaticPathConfig(PANEL_URL, panel_path, cache_headers=False)]
    )

    await panel_custom.async_register_panel(
        hass,
        webcomponent_name="eon-next-panel",
        frontend_url_path=DOMAIN,
        module_url=PANEL_URL,
        sidebar_title=PANEL_TITLE,
        sidebar_icon=PANEL_ICON,
        require_admin=False,
        config={},
    )

    _LOGGER.debug("EON Next sidebar panel registered")


async def async_unregister_panel(hass: HomeAssistant) -> None:
    """Remove the EON Next sidebar panel.

    Should only be called when the last config entry is being unloaded.
    """
    if DOMAIN not in hass.data.get("frontend_panels", {}):
        return

    if "frontend" not in hass.config.components:
        return

    from homeassistant.components import frontend  # noqa: E402

    frontend.async_remove_panel(hass, DOMAIN)
    _LOGGER.debug("EON Next sidebar panel removed")
