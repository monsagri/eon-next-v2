// ---------------------------------------------------------------
// THIS FILE IS AUTO-GENERATED — DO NOT EDIT BY HAND
//
// Source of truth: custom_components/eon_next/schemas.py
// Regenerate:      python scripts/generate_ts_api.py
// ---------------------------------------------------------------

import type { HomeAssistant } from "./types";

// --- Response interfaces ---

export interface VersionResponse {
  version: string;
}

export interface MeterSummary {
  serial: string;
  type: string;
  latest_reading: number | null;
  latest_reading_date: string | null;
  daily_consumption: number | null;
  standing_charge: number | null;
  previous_day_cost: number | null;
  unit_rate: number | null;
  tariff_name: string | null;
}

export interface EvChargerSummary {
  device_id: string;
  serial: string;
  schedule_slots: number;
  next_charge_start: string | null;
  next_charge_end: string | null;
}

export interface DashboardSummary {
  meters: MeterSummary[];
  ev_chargers: EvChargerSummary[];
}

// --- WebSocket command constants ---

export const WS_VERSION = "eon_next/version" as const;
export const WS_DASHBOARD_SUMMARY = "eon_next/dashboard_summary" as const;

// --- Typed API functions ---

export async function getVersion(hass: HomeAssistant): Promise<VersionResponse> {
  return hass.callWS<VersionResponse>({ type: WS_VERSION });
}

export async function getDashboardSummary(
  hass: HomeAssistant,
): Promise<DashboardSummary> {
  return hass.callWS<DashboardSummary>({ type: WS_DASHBOARD_SUMMARY });
}
