/**
 * Minimal type definitions for Home Assistant frontend integration.
 *
 * These are intentionally lightweight — only the surface area that the panel
 * and cards actually consume is typed here.
 */

/** Subset of the Home Assistant `hass` object exposed to panels and cards. */
export interface HomeAssistant {
  callWS: <T>(msg: Record<string, unknown>) => Promise<T>;
  states: Record<string, HassEntity>;
  themes: { darkMode: boolean };
  language: string;
  locale: HassLocale;
}

export interface HassEntity {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
  last_changed: string;
  last_updated: string;
}

export interface HassLocale {
  language: string;
  number_format: string;
}

/** Route object passed to sidebar panels. */
export interface PanelRoute {
  prefix: string;
  path: string;
}

/** Panel info object passed to sidebar panels. */
export interface PanelInfo {
  config: Record<string, unknown>;
  url_path: string;
  title: string | null;
}

/** Response from eon_next/version WebSocket command. */
export interface VersionResponse {
  version: string;
}

/** Response from eon_next/dashboard_summary WebSocket command. */
export interface DashboardSummary {
  meters: MeterSummary[];
  ev_chargers: EvChargerSummary[];
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
