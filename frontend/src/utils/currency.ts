/**
 * Currency formatting, parameterised per provider.
 *
 * The dashboard shows money in a provider's currency. E.ON Next - and other UK
 * Kraken suppliers - report GBP with a pence minor unit; a non-UK provider
 * swaps this config. Formatters read the active currency so call sites stay
 * currency-agnostic, and a provider sets it once via `setCurrency`.
 */

export interface CurrencyConfig {
  /** Major-unit symbol, e.g. `£`. */
  symbol: string
  /** Minor-unit symbol, e.g. `p`. */
  minorSymbol: string
  /** Minor units per major unit, e.g. `100`. */
  minorScale: number
  /** Whether the major symbol precedes the value (`£1.00` vs `1.00 kr`). */
  symbolBefore: boolean
}

/** Pounds sterling with a pence minor unit - the UK Kraken default. */
export const GBP: CurrencyConfig = {
  symbol: '£',
  minorSymbol: 'p',
  minorScale: 100,
  symbolBefore: true
}

let active: CurrencyConfig = GBP

/** Set the currency used by the formatters below (defaults to GBP). */
export function setCurrency(config: CurrencyConfig): void {
  active = config
}

/** The currently active currency config. */
export function activeCurrency(): CurrencyConfig {
  return active
}

function withSymbol(body: string, c: CurrencyConfig): string {
  return c.symbolBefore ? `${c.symbol}${body}` : `${body}${c.symbol}`
}

/** Money in the major unit, e.g. `£11.52`. */
export function formatMajor(
  value: number | null | undefined,
  dp = 2,
  c: CurrencyConfig = active
): string {
  if (value == null || !Number.isFinite(value)) return '-'
  return withSymbol(value.toFixed(dp), c)
}

/** A major-unit rate shown in the minor unit, e.g. `21.17p`. */
export function formatMinor(
  value: number | null | undefined,
  dp = 2,
  c: CurrencyConfig = active
): string {
  if (value == null || !Number.isFinite(value)) return '-'
  return `${(value * c.minorScale).toFixed(dp)}${c.minorSymbol}`
}

/** A major-unit rate shown to full precision, e.g. `£0.2117`. */
export function formatMajorRate(
  value: number | null | undefined,
  dp = 4,
  c: CurrencyConfig = active
): string {
  if (value == null || !Number.isFinite(value)) return '-'
  return withSymbol(value.toFixed(dp), c)
}
