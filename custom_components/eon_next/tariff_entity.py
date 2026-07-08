"""Shared entity mix-in for tariff-aware sensors."""

from __future__ import annotations

from typing import Any

from homeassistant.core import CALLBACK_TYPE, callback
from homeassistant.helpers.event import async_track_point_in_time
from homeassistant.util import dt as dt_util

from .tariff_helpers import get_off_peak_metadata


class TariffBoundaryRefreshMixin:
    """Write entity state at the next rate-window boundary.

    Coordinator refreshes are 30 minutes apart, so a rate/off-peak entity would
    otherwise lag a window transition (e.g. the 07:00 off-peak→peak change) by
    up to that long — breaking the "switch loads at the boundary" automations
    the README advertises.  This schedules a one-shot callback at the next
    transition (from :func:`get_off_peak_metadata`) to write state immediately,
    then reschedules for the following one.

    Mix in *before* the CoordinatorEntity base so ``super()`` chains through to
    the coordinator behaviour.  Subclasses that cache a rate snapshot override
    :meth:`_recompute_tariff_state` to refresh it before each write.
    """

    hass: Any
    _boundary_unsub: CALLBACK_TYPE | None = None

    async def async_added_to_hass(self) -> None:
        await super().async_added_to_hass()  # type: ignore[misc]
        self._recompute_tariff_state()
        self.async_on_remove(self._cancel_boundary_refresh)  # type: ignore[attr-defined]
        self._schedule_boundary_refresh()

    @callback
    def _handle_coordinator_update(self) -> None:
        self._recompute_tariff_state()
        super()._handle_coordinator_update()  # type: ignore[misc]
        self._schedule_boundary_refresh()

    @callback
    def _recompute_tariff_state(self) -> None:
        """Refresh any cached rate snapshot before a state write (override)."""

    @callback
    def _cancel_boundary_refresh(self) -> None:
        if self._boundary_unsub is not None:
            self._boundary_unsub()
            self._boundary_unsub = None

    @callback
    def _schedule_boundary_refresh(self) -> None:
        self._cancel_boundary_refresh()
        data = getattr(self, "_meter_data", None)
        if not data:
            return
        raw = get_off_peak_metadata(data).get("next_transition")
        if not raw:
            return
        when = dt_util.parse_datetime(str(raw))
        if when is None:
            return
        when = dt_util.as_utc(when)
        if when <= dt_util.utcnow():
            return
        self._boundary_unsub = async_track_point_in_time(
            self.hass, self._boundary_reached, when
        )

    @callback
    def _boundary_reached(self, _now: Any) -> None:
        self._boundary_unsub = None
        self._recompute_tariff_state()
        self.async_write_ha_state()  # type: ignore[attr-defined]
        self._schedule_boundary_refresh()
