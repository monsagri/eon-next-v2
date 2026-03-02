"""Cost tracker storage and runtime logic."""

from __future__ import annotations

from dataclasses import dataclass
import logging
from typing import Any, Callable

from homeassistant.const import STATE_UNAVAILABLE, STATE_UNKNOWN
from homeassistant.core import Event, HomeAssistant, State, callback
from homeassistant.helpers.event import async_track_state_change_event
from homeassistant.helpers.storage import Store
from homeassistant.util import dt as dt_util
from homeassistant.util import slugify

from .const import DOMAIN
from .coordinator import EonNextCoordinator

_LOGGER = logging.getLogger(__name__)

_STORE_VERSION = 1
_STORE_KEY_SUFFIX = "cost_trackers"

VALID_POWER_UNITS = {"W", "kW"}
VALID_ENERGY_UNITS = {"Wh", "kWh"}


@dataclass(slots=True)
class CostTrackerConfig:
    """Persisted configuration for a cost tracker."""

    id: str
    name: str
    tracked_entity_id: str
    meter_serial: str
    enabled: bool = True


@dataclass(slots=True)
class CostTrackerState:
    """Mutable state for a cost tracker."""

    today_consumption_kwh: float = 0.0
    today_cost: float = 0.0
    last_reset: str | None = None
    last_energy_value: float | None = None
    last_energy_unit: str | None = None


@dataclass(slots=True)
class CostTrackerRuntime:
    """Combined config/state and runtime listeners for one tracker."""

    config: CostTrackerConfig
    state: CostTrackerState
    unsubscribe_state: Callable[[], None] | None = None


class EonNextCostTrackerManager:
    """Manage cost tracker persistence and state calculations."""

    def __init__(
        self,
        hass: HomeAssistant,
        entry_id: str,
        coordinator: EonNextCoordinator,
    ) -> None:
        self.hass = hass
        self.entry_id = entry_id
        self.coordinator = coordinator
        self._store: Store[dict[str, Any]] = Store(
            hass,
            _STORE_VERSION,
            f"{DOMAIN}_{entry_id}_{_STORE_KEY_SUFFIX}",
        )
        self._trackers: dict[str, CostTrackerRuntime] = {}
        self._list_listeners: list[Callable[[str], None]] = []
        self._state_listeners: dict[str, list[Callable[[], None]]] = {}

    async def async_initialize(self) -> None:
        """Load trackers from storage and set up listeners."""
        stored = await self._store.async_load() or {}
        items = stored.get("trackers", [])
        if not isinstance(items, list):
            items = []

        for item in items:
            if not isinstance(item, dict):
                continue

            tracker_id = str(item.get("id") or "").strip()
            tracked_entity_id = str(item.get("tracked_entity_id") or "").strip()
            meter_serial = str(item.get("meter_serial") or "").strip()
            if not tracker_id or not tracked_entity_id or not meter_serial:
                continue

            config = CostTrackerConfig(
                id=tracker_id,
                name=str(item.get("name") or tracker_id),
                tracked_entity_id=tracked_entity_id,
                meter_serial=meter_serial,
                enabled=bool(item.get("enabled", True)),
            )
            state = CostTrackerState(
                today_consumption_kwh=float(item.get("today_consumption_kwh") or 0.0),
                today_cost=float(item.get("today_cost") or 0.0),
                last_reset=item.get("last_reset"),
                last_energy_value=item.get("last_energy_value"),
                last_energy_unit=item.get("last_energy_unit"),
            )
            runtime = CostTrackerRuntime(config=config, state=state)
            self._ensure_last_reset(runtime)
            self._rollover_if_new_day(runtime)
            self._trackers[config.id] = runtime

        for tracker_id in list(self._trackers):
            self._attach_state_listener(tracker_id)

    async def async_shutdown(self) -> None:
        """Clean up listeners and persist current state."""
        for runtime in self._trackers.values():
            if runtime.unsubscribe_state:
                runtime.unsubscribe_state()
                runtime.unsubscribe_state = None
        await self._save()

    def list_tracker_ids(self) -> list[str]:
        """Return all configured tracker ids."""
        return list(self._trackers.keys())

    def has_tracker(self, tracker_id: str) -> bool:
        """Return True when tracker id exists."""
        return tracker_id in self._trackers

    def get_config(self, tracker_id: str) -> CostTrackerConfig | None:
        """Return tracker config by id."""
        runtime = self._trackers.get(tracker_id)
        return runtime.config if runtime else None

    def get_state(self, tracker_id: str) -> CostTrackerState | None:
        """Return tracker state by id."""
        runtime = self._trackers.get(tracker_id)
        return runtime.state if runtime else None

    @callback
    def async_add_list_listener(self, listener: Callable[[str], None]) -> Callable[[], None]:
        """Listen for new trackers being added."""
        self._list_listeners.append(listener)

        def _remove() -> None:
            if listener in self._list_listeners:
                self._list_listeners.remove(listener)

        return _remove

    @callback
    def async_add_state_listener(
        self,
        tracker_id: str,
        listener: Callable[[], None],
    ) -> Callable[[], None]:
        """Listen for state updates on a single tracker."""
        listeners = self._state_listeners.setdefault(tracker_id, [])
        listeners.append(listener)

        def _remove() -> None:
            if tracker_id in self._state_listeners and listener in self._state_listeners[tracker_id]:
                self._state_listeners[tracker_id].remove(listener)

        return _remove

    async def async_add_tracker(
        self,
        *,
        name: str,
        tracked_entity_id: str,
        meter_serial: str,
        enabled: bool = True,
    ) -> CostTrackerConfig:
        """Create and persist a new tracker."""
        tracker_id = self._next_tracker_id(name)
        config = CostTrackerConfig(
            id=tracker_id,
            name=name,
            tracked_entity_id=tracked_entity_id,
            meter_serial=meter_serial,
            enabled=enabled,
        )
        state = CostTrackerState()
        runtime = CostTrackerRuntime(config=config, state=state)
        self._ensure_last_reset(runtime)
        self._trackers[tracker_id] = runtime
        self._attach_state_listener(tracker_id)
        await self._save()

        for listener in list(self._list_listeners):
            listener(tracker_id)
        self._notify_state_listeners(tracker_id)
        return config

    async def async_reset_tracker(self, tracker_id: str) -> None:
        """Reset a tracker's daily accumulator."""
        runtime = self._trackers.get(tracker_id)
        if runtime is None:
            return
        runtime.state.today_consumption_kwh = 0.0
        runtime.state.today_cost = 0.0
        runtime.state.last_energy_value = None
        runtime.state.last_energy_unit = None
        runtime.state.last_reset = self._today_midnight_iso()
        await self._save()
        self._notify_state_listeners(tracker_id)

    async def async_set_enabled(self, tracker_id: str, enabled: bool) -> None:
        """Enable or disable a tracker."""
        runtime = self._trackers.get(tracker_id)
        if runtime is None:
            return
        runtime.config.enabled = enabled
        await self._save()
        self._notify_state_listeners(tracker_id)

    def _attach_state_listener(self, tracker_id: str) -> None:
        runtime = self._trackers.get(tracker_id)
        if runtime is None:
            return
        if runtime.unsubscribe_state:
            runtime.unsubscribe_state()
        runtime.unsubscribe_state = async_track_state_change_event(
            self.hass,
            [runtime.config.tracked_entity_id],
            lambda event: self.hass.async_create_task(
                self._async_handle_state_change(tracker_id, event)
            ),
        )

    async def _async_handle_state_change(
        self,
        tracker_id: str,
        event: Event[Any],
    ) -> None:
        runtime = self._trackers.get(tracker_id)
        if runtime is None or not runtime.config.enabled:
            return

        self._ensure_last_reset(runtime)
        self._rollover_if_new_day(runtime)

        new_state: State | None = event.data.get("new_state")
        old_state: State | None = event.data.get("old_state")
        if new_state is None:
            return

        unit = str(new_state.attributes.get("unit_of_measurement") or "")
        delta_kwh = self._delta_kwh(runtime, old_state, new_state, unit)
        if delta_kwh <= 0:
            return

        rate = self._current_rate(runtime.config.meter_serial)
        if rate is None:
            _LOGGER.debug(
                "Skipping cost update for tracker %s due to missing tariff rate",
                tracker_id,
            )
            return

        runtime.state.today_consumption_kwh = round(
            runtime.state.today_consumption_kwh + delta_kwh,
            6,
        )
        runtime.state.today_cost = round(runtime.state.today_cost + (delta_kwh * rate), 4)
        await self._save()
        self._notify_state_listeners(tracker_id)

    def _delta_kwh(
        self,
        runtime: CostTrackerRuntime,
        old_state: State | None,
        new_state: State,
        unit: str,
    ) -> float:
        if new_state.state in (STATE_UNKNOWN, STATE_UNAVAILABLE):
            return 0.0

        if unit in VALID_ENERGY_UNITS:
            value = self._parse_float(new_state.state)
            if value is None:
                return 0.0

            previous = runtime.state.last_energy_value
            previous_unit = runtime.state.last_energy_unit
            runtime.state.last_energy_value = value
            runtime.state.last_energy_unit = unit

            if previous is None or previous_unit != unit:
                return 0.0

            delta = value - previous
            if delta <= 0:
                return 0.0
            if unit == "Wh":
                delta /= 1000.0
            return delta

        if unit in VALID_POWER_UNITS and old_state is not None:
            old_value = self._parse_float(old_state.state)
            if old_value is None:
                return 0.0
            elapsed = (new_state.last_updated - old_state.last_updated).total_seconds()
            if elapsed <= 0:
                return 0.0
            power_kw = old_value / 1000.0 if unit == "W" else old_value
            return power_kw * (elapsed / 3600.0)

        return 0.0

    def _current_rate(self, meter_serial: str) -> float | None:
        meter_data = self.coordinator.data.get(meter_serial) if self.coordinator.data else None
        if not meter_data:
            return None
        value = meter_data.get("unit_rate")
        parsed = self._parse_float(value)
        return parsed if parsed is not None and parsed >= 0 else None

    def _notify_state_listeners(self, tracker_id: str) -> None:
        for listener in list(self._state_listeners.get(tracker_id, [])):
            listener()

    def _rollover_if_new_day(self, runtime: CostTrackerRuntime) -> None:
        last_reset = dt_util.parse_datetime(runtime.state.last_reset or "")
        if last_reset is None:
            runtime.state.last_reset = self._today_midnight_iso()
            return
        if dt_util.as_local(last_reset).date() == dt_util.now().date():
            return
        runtime.state.today_consumption_kwh = 0.0
        runtime.state.today_cost = 0.0
        runtime.state.last_energy_value = None
        runtime.state.last_energy_unit = None
        runtime.state.last_reset = self._today_midnight_iso()

    def _ensure_last_reset(self, runtime: CostTrackerRuntime) -> None:
        if runtime.state.last_reset:
            return
        runtime.state.last_reset = self._today_midnight_iso()

    def _next_tracker_id(self, name: str) -> str:
        base = slugify(name) or "cost_tracker"
        candidate = base
        index = 2
        while candidate in self._trackers:
            candidate = f"{base}_{index}"
            index += 1
        return candidate

    def _today_midnight_iso(self) -> str:
        now = dt_util.now()
        midnight = now.replace(hour=0, minute=0, second=0, microsecond=0)
        return midnight.isoformat()

    @staticmethod
    def _parse_float(value: Any) -> float | None:
        try:
            return float(value)
        except (TypeError, ValueError):
            return None

    async def _save(self) -> None:
        trackers: list[dict[str, Any]] = []
        for runtime in self._trackers.values():
            trackers.append(
                {
                    "id": runtime.config.id,
                    "name": runtime.config.name,
                    "tracked_entity_id": runtime.config.tracked_entity_id,
                    "meter_serial": runtime.config.meter_serial,
                    "enabled": runtime.config.enabled,
                    "today_consumption_kwh": runtime.state.today_consumption_kwh,
                    "today_cost": runtime.state.today_cost,
                    "last_reset": runtime.state.last_reset,
                    "last_energy_value": runtime.state.last_energy_value,
                    "last_energy_unit": runtime.state.last_energy_unit,
                }
            )
        await self._store.async_save({"trackers": trackers})
