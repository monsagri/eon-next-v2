"""Data models for the Eon Next integration."""

from __future__ import annotations

from dataclasses import dataclass
from typing import TYPE_CHECKING

from homeassistant.config_entries import ConfigEntry

from .coordinator import EonNextCoordinator
from .eonnext import EonNext

if TYPE_CHECKING:
    from .backfill import EonNextBackfillManager


@dataclass(slots=True)
class EonNextRuntimeData:
    """Runtime data for an Eon Next config entry."""

    api: EonNext
    coordinator: EonNextCoordinator
    backfill: EonNextBackfillManager


EonNextConfigEntry = ConfigEntry[EonNextRuntimeData]
