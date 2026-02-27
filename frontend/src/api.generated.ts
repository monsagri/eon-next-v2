// ---------------------------------------------------------------
// THIS FILE IS AUTO-GENERATED — DO NOT EDIT BY HAND
//
// Source of truth: custom_components/eon_next/schemas.py
// Regenerate:      python scripts/generate_ts_api.py
// ---------------------------------------------------------------

import type { HomeAssistant } from './types'

// --- Response interfaces ---

export interface VersionResponse {
  version: string
}

export interface MeterSummary {
  serial: string | null
  type: string | null
  latest_reading: number | null
  latest_reading_date: string | null
  daily_consumption: number | null
  standing_charge: number | null
  previous_day_cost: number | null
  unit_rate: number | null
  tariff_name: string | null
}

export interface EvChargerSummary {
  device_id: string | null
  serial: string | null
  schedule_slots: number
  next_charge_start: string | null
  next_charge_end: string | null
}

export interface DashboardSummary {
  meters: MeterSummary[]
  ev_chargers: EvChargerSummary[]
}

export interface ConsumptionHistoryEntry {
  date: string
  consumption: number
}

export interface ConsumptionHistoryResponse {
  entries: ConsumptionHistoryEntry[]
}

export interface EvScheduleSlot {
  start: string
  end: string
}

export interface EvScheduleResponse {
  device_id: string | null
  serial: string | null
  status: string
  slots: EvScheduleSlot[]
}

export interface BackfillMeterProgress {
  serial: string
  done: boolean
  next_start: string | null
  days_completed: number
  days_remaining: number
}

export interface BackfillStatusResponse {
  state: string
  enabled: boolean
  total_meters: number
  completed_meters: number
  pending_meters: number
  lookback_days: number
  next_start_date: string | null
  meters: BackfillMeterProgress[]
}

// --- WebSocket command constants ---

export const WS_VERSION = 'eon_next/version' as const
export const WS_DASHBOARD_SUMMARY = 'eon_next/dashboard_summary' as const

// --- Typed API functions ---

export async function getVersion(hass: HomeAssistant): Promise<VersionResponse> {
  return hass.callWS<VersionResponse>({ type: WS_VERSION })
}

export async function getDashboardSummary(
  hass: HomeAssistant
): Promise<DashboardSummary> {
  return hass.callWS<DashboardSummary>({ type: WS_DASHBOARD_SUMMARY })
}
