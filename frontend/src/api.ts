/**
 * WebSocket API client for the EON Next integration.
 *
 * All types, constants, and functions are generated from the Python schemas.
 * This module re-exports them so existing import paths keep working.
 *
 * Source of truth: custom_components/eon_next/schemas.py
 * Regenerate:      python scripts/generate_ts_api.py
 */
export {
  getVersion,
  getDashboardSummary,
  WS_VERSION,
  WS_DASHBOARD_SUMMARY,
} from "./api.generated";
