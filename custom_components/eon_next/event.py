"""Event platform for the Eon Next integration."""

from __future__ import annotations

from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .models import EonNextConfigEntry


async def async_setup_entry(
    _hass: HomeAssistant,
    _config_entry: EonNextConfigEntry,
    _async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up event entities from a config entry."""
