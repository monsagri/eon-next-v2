"""Data models for the Eon Next integration."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import TYPE_CHECKING, Any

from homeassistant.config_entries import ConfigEntry

from .coordinator import EonNextCoordinator
from .eonnext import KrakenClient

if TYPE_CHECKING:
    from .backfill import EonNextBackfillManager
    from .cost_tracker import EonNextCostTrackerManager


@dataclass(slots=True)
class EonNextRuntimeData:
    """Runtime data for an Eon Next config entry."""

    api: KrakenClient
    coordinator: EonNextCoordinator
    backfill: EonNextBackfillManager
    cost_trackers: EonNextCostTrackerManager
    # Snapshot of the entry options at setup time, used by the update
    # listener to reload only when options actually change (not on
    # data-only updates such as refresh-token rotation).
    options: dict[str, Any] = field(default_factory=dict)


EonNextConfigEntry = ConfigEntry[EonNextRuntimeData]
