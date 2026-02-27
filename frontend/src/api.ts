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
  WS_VERSION,
  WS_DASHBOARD_SUMMARY
} from './api.generated'

export type { ConsumptionHistoryEntry, ConsumptionHistoryResponse } from './api.generated'

import type { HomeAssistant } from './types'
import type { ConsumptionHistoryResponse } from './api.generated'

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
