/**
 * WebSocket API client for the EON Next integration.
 *
 * Zero-argument commands are generated from the Python schemas.
 * Parameterized commands (those accepting request arguments) have their
 * response interfaces generated but require hand-written wrapper functions.
 *
 * Source of truth: custom_components/eon_next/schemas.py
 * Regenerate:      python scripts/generate_ts_api.py
 */
export {
  getVersion,
  getDashboardSummary,
  getBackfillStatus,
  WS_VERSION,
  WS_DASHBOARD_SUMMARY,
  WS_BACKFILL_STATUS
} from './api.generated'

export type {
  ConsumptionHistoryEntry,
  ConsumptionHistoryResponse,
  EvScheduleSlot,
  EvScheduleResponse,
  BackfillMeterProgress,
  BackfillStatusResponse
} from './api.generated'

import type { HomeAssistant } from './types'
import type { ConsumptionHistoryResponse, EvScheduleResponse } from './api.generated'

// --- Consumption history (parameterized command) -------------------------

export async function getConsumptionHistory(
  hass: HomeAssistant,
  meterSerial: string,
  days = 7
): Promise<ConsumptionHistoryResponse> {
  return hass.callWS<ConsumptionHistoryResponse>({
    type: 'eon_next/consumption_history',
    meter_serial: meterSerial,
    days
  })
}

// --- EV schedule (parameterized command) ---------------------------------

export async function getEvSchedule(
  hass: HomeAssistant,
  deviceId: string
): Promise<EvScheduleResponse> {
  return hass.callWS<EvScheduleResponse>({
    type: 'eon_next/ev_schedule',
    device_id: deviceId
  })
}
