/**
 * Minimal type definitions for Home Assistant frontend integration.
 *
 * These are intentionally lightweight — only the surface area that the panel
 * and cards actually consume is typed here.
 */

/** Subset of the Home Assistant `hass` object exposed to panels and cards. */
export interface HomeAssistant {
  callWS: <T>(msg: Record<string, unknown>) => Promise<T>
  states: Record<string, HassEntity>
  themes: { darkMode: boolean }
  language: string
  locale: HassLocale
}

export interface HassEntity {
  entity_id: string
  state: string
  attributes: Record<string, unknown>
  last_changed: string
  last_updated: string
}

export interface HassLocale {
  language: string
  number_format: string
}

/** Route object passed to sidebar panels. */
export interface PanelRoute {
  prefix: string
  path: string
}

/** Panel info object passed to sidebar panels. */
export interface PanelInfo {
  config: Record<string, unknown>
  url_path: string
  title: string | null
}

/**
 * API response types — re-exported from the generated file so that existing
 * ``import { MeterSummary } from "../types"`` paths keep working.
 */
export type {
  VersionResponse,
  DashboardSummary,
  MeterSummary,
  EvChargerSummary
} from './api.generated'
