"""Data models for the Eon Next integration."""

from __future__ import annotations

from dataclasses import dataclass

from homeassistant.config_entries import ConfigEntry

from .coordinator import EonNextCoordinator
from .eonnext import EonNext


@dataclass(slots=True)
class EonNextRuntimeData:
    """Runtime data for an Eon Next config entry."""

    api: EonNext
    coordinator: EonNextCoordinator


EonNextConfigEntry = ConfigEntry[EonNextRuntimeData]
