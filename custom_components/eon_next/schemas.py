"""WebSocket API schemas for the EON Next frontend.

These dataclasses are the **single source of truth** for all data shapes
exchanged between the Python backend and the TypeScript frontend.

Run ``python scripts/generate_ts_api.py`` after editing this file to
regenerate ``frontend/src/api.generated.ts``.
"""

from __future__ import annotations

from dataclasses import dataclass


# ---------------------------------------------------------------------------
# Response dataclasses
# ---------------------------------------------------------------------------


@dataclass
class VersionResponse:
    """Response from ``eon_next/version``."""

    version: str


@dataclass
class MeterSummary:
    """Per-meter data included in the dashboard summary."""

    serial: str | None
    type: str | None
    latest_reading: float | None
    latest_reading_date: str | None
    daily_consumption: float | None
    standing_charge: float | None
    previous_day_cost: float | None
    unit_rate: float | None
    tariff_name: str | None


@dataclass
class EvChargerSummary:
    """Per-charger data included in the dashboard summary."""

    device_id: str | None
    serial: str | None
    schedule_slots: int
    next_charge_start: str | None
    next_charge_end: str | None


@dataclass
class DashboardSummary:
    """Response from ``eon_next/dashboard_summary``."""

    meters: list[MeterSummary]
    ev_chargers: list[EvChargerSummary]


@dataclass
class ConsumptionHistoryEntry:
    """Single day of consumption history."""

    date: str
    consumption: float


@dataclass
class ConsumptionHistoryResponse:
    """Response from ``eon_next/consumption_history``.

    This command accepts ``meter_serial`` (str) and ``days`` (int, 1–30)
    as request parameters.  The code-generator only handles zero-argument
    commands, so the typed API wrapper lives in ``frontend/src/api.ts``
    rather than in the auto-generated file.
    """

    entries: list[ConsumptionHistoryEntry]


# ---------------------------------------------------------------------------
# Command registry — maps WS command type strings to response dataclasses
# ---------------------------------------------------------------------------

WS_COMMANDS: dict[str, type] = {
    "eon_next/version": VersionResponse,
    "eon_next/dashboard_summary": DashboardSummary,
}
