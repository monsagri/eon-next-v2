import type { HomeAssistant, VersionResponse, DashboardSummary } from "./types";

/**
 * WebSocket API client for the EON Next integration.
 *
 * This is the only module that knows about eon_next/* command names.
 * Shared view components receive data via properties, not by calling
 * the API directly — keeping them provider-agnostic.
 */

export async function getVersion(hass: HomeAssistant): Promise<VersionResponse> {
  return hass.callWS<VersionResponse>({ type: "eon_next/version" });
}

export async function getDashboardSummary(
  hass: HomeAssistant,
): Promise<DashboardSummary> {
  return hass.callWS<DashboardSummary>({ type: "eon_next/dashboard_summary" });
}
