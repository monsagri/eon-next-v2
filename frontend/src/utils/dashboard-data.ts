/**
 * Data helpers for the redesigned dashboard.
 *
 * Two data paths feed the pages (see the design handoff):
 *  - the WebSocket API (`dashboard_summary`, `consumption_history`, …) for the
 *    core numbers, exposed as typed API functions elsewhere; and
 *  - HA entity states/attributes (Path B) for the richer tariff detail the WS
 *    API does not carry (previous/next rates, off-peak windows, today's rate
 *    shape, account balance).
 *
 * The WS API exposes *current* rates only — there is no historical rate series
 * — so multi-day cost bars are `historical kWh × today's rates` (an
 * approximation). Callers surface a footnote where that matters.
 */

import type { ConsumptionHistoryEntry } from '../api'
import type { DashboardSummary, HassEntity, HomeAssistant, MeterSummary } from '../types'

export type FuelKind = 'electricity' | 'gas'

/** A single stacked bar: energy-used segment sits on top of the fixed standing charge. */
export interface StackedBar {
  usagePct: number
  standPct: number
  label: string
  /** Absolute pound values, for tooltips / accessibility. */
  usageCost: number
  standCost: number
}

/** Rate window read from a `*_unit_rate` sensor's attributes. */
export interface RateWindow {
  rate: number | null
  validFrom: string | null
  validTo: string | null
}

// --- Meter selection --------------------------------------------------------

export function findMeter(
  summary: DashboardSummary | null,
  kind: FuelKind
): MeterSummary | null {
  if (!summary) return null
  return summary.meters.find((m) => normaliseType(m.type) === kind) ?? null
}

export function normaliseType(type: string | null): FuelKind {
  return type === 'gas' ? 'gas' : 'electricity'
}

/** Per-fuel presentation: label, icon, tile class and chart colours. */
export interface FuelDescriptor {
  label: string
  icon: string
  tileClass: string
  usageColor: string
  standColor: string
}

export const FUEL: Record<FuelKind, FuelDescriptor> = {
  electricity: {
    label: 'Electricity',
    icon: 'mdi:lightning-bolt',
    tileClass: 'tile--elec',
    usageColor: 'var(--eon-elec)',
    standColor: 'var(--eon-elec-standing)'
  },
  gas: {
    label: 'Gas',
    icon: 'mdi:fire',
    tileClass: 'tile--gas',
    usageColor: 'var(--eon-gas)',
    standColor: 'var(--eon-gas-standing)'
  }
}

// --- HA entity-state lookups (Path B) ---------------------------------------

/** Slugify a serial/name the way HA derives entity object-ids from names. */
function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

/**
 * Per-`states`-object cache. HA replaces the whole `states` map on every state
 * tick, and pages re-render on every tick, so an entity lookup that falls
 * through to scanning every entity (the common flat-rate case, where the direct
 * id misses) would otherwise re-scan hundreds-to-thousands of entities several
 * times per render. Keying on the map's identity makes repeated lookups within
 * a tick O(1) while staying fresh across ticks.
 */
const lookupCache = new WeakMap<object, Map<string, HassEntity | null>>()

function cachedLookup(
  states: HomeAssistant['states'],
  key: string,
  compute: () => HassEntity | null
): HassEntity | null {
  let byKey = lookupCache.get(states)
  if (!byKey) {
    byKey = new Map()
    lookupCache.set(states, byKey)
  }
  if (byKey.has(key)) return byKey.get(key) ?? null
  const result = compute()
  byKey.set(key, result)
  return result
}

/**
 * Find an entity for a meter by its `<serial> <name>`-derived object-id.
 *
 * Entity ids are `sensor.<slug(serial)>_<suffix>` (single underscores), while
 * the integration's *unique_ids* use a `<serial>__<suffix>` form — so we match
 * against the state map rather than assuming an exact id.
 */
export function findMeterEntity(
  hass: HomeAssistant | undefined,
  domain: string,
  serial: string | null,
  suffix: string
): HassEntity | null {
  if (!hass?.states || !serial) return null
  const states = hass.states
  return cachedLookup(states, `${domain}|${serial}|${suffix}`, () => {
    const wanted = `${domain}.${slug(serial)}_${suffix}`
    const direct = states[wanted]
    if (direct) return direct

    const serialSlug = slug(serial)
    const suffixSlug = `_${suffix}`
    for (const [entityId, state] of Object.entries(states)) {
      if (!entityId.startsWith(`${domain}.`)) continue
      if (entityId.includes(serialSlug) && entityId.endsWith(suffixSlug)) {
        return state
      }
    }
    return null
  })
}

/** Account balance in pounds (positive = in credit). */
export function findAccountBalance(hass: HomeAssistant | undefined): number | null {
  if (!hass?.states) return null
  const entity = cachedLookup(hass.states, 'account_balance', () => {
    for (const [entityId, state] of Object.entries(hass.states)) {
      if (entityId.startsWith('sensor.') && entityId.endsWith('_account_balance')) {
        return state
      }
    }
    return null
  })
  return numericState(entity)
}

function numericState(entity: HassEntity | null): number | null {
  if (!entity) return null
  const n = Number(entity.state)
  return Number.isFinite(n) ? n : null
}

/** Read a `*_unit_rate` sensor into a rate window. */
export function readRateWindow(
  hass: HomeAssistant | undefined,
  serial: string | null,
  suffix: 'current_unit_rate' | 'previous_unit_rate' | 'next_unit_rate'
): RateWindow {
  const entity = findMeterEntity(hass, 'sensor', serial, suffix)
  return {
    rate: numericState(entity),
    validFrom: attrString(entity, 'valid_from'),
    validTo: attrString(entity, 'valid_to')
  }
}

/** Read a string attribute off an entity, treating empty strings as absent. */
export function attrString(entity: HassEntity | null, key: string): string | null {
  const v = entity?.attributes?.[key]
  return typeof v === 'string' && v !== '' ? v : null
}

/** Half-hour rate window for the today's-rate strip. */
export interface DayRate {
  start: string
  end: string
  rate: number
  isOffPeak: boolean
}

/** Read today's rate schedule from the `*_current_day_rates` event entity. */
export function readDayRates(
  hass: HomeAssistant | undefined,
  serial: string | null
): DayRate[] {
  const entity = findMeterEntity(hass, 'event', serial, 'current_day_rates')
  const raw = entity?.attributes?.rates
  if (!Array.isArray(raw)) return []
  const out: DayRate[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const r = item as Record<string, unknown>
    const rate = Number(r.rate)
    if (!Number.isFinite(rate)) continue
    out.push({
      start: typeof r.start === 'string' ? r.start : '',
      end: typeof r.end === 'string' ? r.end : '',
      rate,
      isOffPeak: r.is_off_peak === true
    })
  }
  return out
}

/** Whether a meter is on a time-of-use tariff (has an off-peak binary sensor). */
export function isTimeOfUse(
  hass: HomeAssistant | undefined,
  serial: string | null
): boolean {
  const entity = findMeterEntity(hass, 'binary_sensor', serial, 'off_peak')
  return entity != null && entity.state !== 'unavailable' && entity.state !== 'unknown'
}

// --- Formatting -------------------------------------------------------------

/** `£11.52` — money is already in pounds. */
export function formatPounds(value: number | null | undefined, dp = 2): string {
  if (value == null || !Number.isFinite(value)) return '—'
  return `£${value.toFixed(dp)}`
}

/** `21.17p` — a GBP/kWh rate shown in pence. */
export function formatPence(rate: number | null | undefined, dp = 2): string {
  if (rate == null || !Number.isFinite(rate)) return '—'
  return `${(rate * 100).toFixed(dp)}p`
}

/** `£0.2117` — a GBP/kWh rate shown to full precision. */
export function formatRatePounds(rate: number | null | undefined): string {
  if (rate == null || !Number.isFinite(rate)) return '—'
  return `£${rate.toFixed(4)}`
}

/** Human date like `6 Jul`. */
export function formatShortDate(value: string | null | undefined, locale = 'en'): string {
  if (!value) return '—'
  const d = new Date(value.length <= 10 ? `${value}T00:00:00` : value)
  if (isNaN(d.getTime())) return value
  return d.toLocaleDateString(locale, { day: 'numeric', month: 'short' })
}

/** Relative "updated" label, e.g. `just now`, `2 hrs ago`. */
export function formatRelative(from: Date | null): string {
  if (!from) return '—'
  const secs = Math.max(0, Math.round((Date.now() - from.getTime()) / 1000))
  if (secs < 45) return 'just now'
  const mins = Math.round(secs / 60)
  if (mins < 60) return `${mins} min${mins === 1 ? '' : 's'} ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs} hr${hrs === 1 ? '' : 's'} ago`
  const days = Math.round(hrs / 24)
  return `${days} day${days === 1 ? '' : 's'} ago`
}

// --- Stacked-bar computation ------------------------------------------------

/**
 * Turn daily consumption entries into normalised stacked bars.
 *
 * For each day: `usageCost = kWh × rate`, `standCost = standingPerDay`,
 * `total = usageCost + standCost`; each segment's height is its share of the
 * max total in the visible series. Bars are labelled sparsely for long ranges.
 */
export function toStackedBars(
  entries: ConsumptionHistoryEntry[],
  rate: number | null | undefined,
  standingPerDay: number | null | undefined,
  totalDays: number,
  locale = 'en'
): StackedBar[] {
  const r = rate ?? 0
  const stand = standingPerDay ?? 0

  const computed = entries.map((e) => ({
    date: e.date,
    usageCost: Math.max(0, e.consumption) * r,
    standCost: stand
  }))

  const max = Math.max(0.0001, ...computed.map((c) => c.usageCost + c.standCost))

  return computed.map((c, i) => ({
    usagePct: (c.usageCost / max) * 100,
    standPct: (c.standCost / max) * 100,
    usageCost: c.usageCost,
    standCost: c.standCost,
    label: barLabel(c.date, i, entries.length, totalDays, locale)
  }))
}

/**
 * Aggregate daily entries into monthly buckets for the 1-year view, so the
 * standing charge scales with the days in each month and the stack stays
 * proportional.
 */
export function toMonthlyStackedBars(
  entries: ConsumptionHistoryEntry[],
  rate: number | null | undefined,
  standingPerDay: number | null | undefined,
  locale = 'en'
): StackedBar[] {
  const r = rate ?? 0
  const stand = standingPerDay ?? 0

  const buckets = new Map<string, { kwh: number; days: number; date: Date }>()
  for (const e of entries) {
    const d = new Date(`${e.date}T00:00:00`)
    if (isNaN(d.getTime())) continue
    const key = `${d.getFullYear()}-${d.getMonth()}`
    const bucket = buckets.get(key) ?? {
      kwh: 0,
      days: 0,
      date: new Date(d.getFullYear(), d.getMonth(), 1)
    }
    bucket.kwh += Math.max(0, e.consumption)
    bucket.days += 1
    buckets.set(key, bucket)
  }

  const ordered = [...buckets.values()].sort(
    (a, b) => a.date.getTime() - b.date.getTime()
  )
  const computed = ordered.map((b) => ({
    date: b.date,
    usageCost: b.kwh * r,
    standCost: b.days * stand
  }))
  const max = Math.max(0.0001, ...computed.map((c) => c.usageCost + c.standCost))

  return computed.map((c) => ({
    usagePct: (c.usageCost / max) * 100,
    standPct: (c.standCost / max) * 100,
    usageCost: c.usageCost,
    standCost: c.standCost,
    label: c.date.toLocaleDateString(locale, { month: 'narrow' })
  }))
}

function barLabel(
  date: string,
  index: number,
  count: number,
  totalDays: number,
  locale: string
): string {
  const d = new Date(`${date}T00:00:00`)
  if (isNaN(d.getTime())) return ''
  if (totalDays <= 14) {
    return d.toLocaleDateString(locale, { weekday: 'short' })
  }
  // Sparse labels for dense ranges: roughly every 5th (30d) / every 15th (90d).
  const stride = totalDays <= 31 ? 5 : 15
  if (index % stride !== 0 && index !== count - 1) return ''
  // Always include the month: bare day numbers read as a broken axis when the
  // range crosses a month boundary (…"28", "3", "7"…).
  return d.toLocaleDateString(locale, { day: 'numeric', month: 'short' })
}

// --- Month-to-date / projection ---------------------------------------------

export interface MonthCost {
  /** Cost so far this calendar month (usage × current rate + standing/day). */
  monthToDate: number
  /** Days of the current month with data. */
  daysWithData: number
  /** Full cost of the previous calendar month, or null if not enough history. */
  previousMonth: number | null
}

/**
 * Compute month-to-date and previous-month cost for one meter from its
 * consumption history, using the meter's *current* rate + standing charge.
 */
export function computeMonthCost(
  entries: ConsumptionHistoryEntry[],
  rate: number | null | undefined,
  standingPerDay: number | null | undefined,
  now: Date
): MonthCost {
  const r = rate ?? 0
  const stand = standingPerDay ?? 0

  const curYear = now.getFullYear()
  const curMonth = now.getMonth()
  const prev = new Date(curYear, curMonth - 1, 1)
  const prevYear = prev.getFullYear()
  const prevMonth = prev.getMonth()

  let mtd = 0
  let mtdDays = 0
  let prevCost = 0
  let prevDays = 0
  for (const e of entries) {
    const d = new Date(`${e.date}T00:00:00`)
    if (isNaN(d.getTime())) continue
    const cost = Math.max(0, e.consumption) * r + stand
    if (d.getFullYear() === curYear && d.getMonth() === curMonth) {
      mtd += cost
      mtdDays++
    } else if (d.getFullYear() === prevYear && d.getMonth() === prevMonth) {
      prevCost += cost
      prevDays++
    }
  }

  return {
    monthToDate: round2(mtd),
    daysWithData: mtdDays,
    previousMonth: prevDays > 0 ? round2(prevCost) : null
  }
}

export interface MonthSplit {
  usage: number
  standing: number
  total: number
  days: number
}

/** Split this calendar month's cost into usage vs standing charge for one meter. */
export function computeMonthSplit(
  entries: ConsumptionHistoryEntry[],
  rate: number | null | undefined,
  standingPerDay: number | null | undefined,
  now: Date
): MonthSplit {
  const r = rate ?? 0
  const stand = standingPerDay ?? 0
  const curYear = now.getFullYear()
  const curMonth = now.getMonth()

  let usage = 0
  let standing = 0
  let days = 0
  for (const e of entries) {
    const d = new Date(`${e.date}T00:00:00`)
    if (isNaN(d.getTime())) continue
    if (d.getFullYear() === curYear && d.getMonth() === curMonth) {
      usage += Math.max(0, e.consumption) * r
      standing += stand
      days++
    }
  }
  return {
    usage: round2(usage),
    standing: round2(standing),
    total: round2(usage + standing),
    days
  }
}

/** Straight-line projection of a month's spend from the run-rate so far. */
export function projectMonth(monthToDate: number, now: Date): number {
  const daysElapsed = now.getDate()
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  if (daysElapsed <= 0) return monthToDate
  return round2((monthToDate / daysElapsed) * daysInMonth)
}

export function round2(value: number): number {
  return Math.round(value * 100) / 100
}

/** A friendly greeting for the current time of day. */
export function greeting(now: Date): string {
  const h = now.getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}
