import { LitElement, html, nothing } from 'lit'
import { property } from 'lit/decorators.js'
import type { DashboardSummary, HomeAssistant, MeterSummary } from '../../types'
import {
  type DayRate,
  findMeter,
  formatPence,
  formatRatePounds,
  meterDayRates,
  meterIsTimeOfUse,
  meterRateWindow
} from '../../utils/dashboard-data'
import type { HalfHourBar } from './halfhour-strip'
import './halfhour-strip'

import tokens from '../../styles/dashboard-tokens.css'
import shared from '../../styles/dashboard-shared.css'
import styles from '../../styles/tariff-page.css'

/** Full tariff detail, current/next/previous rates, and today's rate shape. */
class EonTariffPage extends LitElement {
  static styles = [tokens, shared, styles]

  @property({ attribute: false }) hass!: HomeAssistant
  @property({ attribute: false }) summary: DashboardSummary | null = null

  render() {
    const elec = findMeter(this.summary, 'electricity')
    const gas = findMeter(this.summary, 'gas')
    const tou = meterIsTimeOfUse(elec) || meterIsTimeOfUse(gas)

    return html`
      <div class="page">
        ${this._renderTariffCard(elec, gas, tou)} ${this._renderRateStrip(elec, tou)}
        ${this._renderTimelines(elec, gas)}
      </div>
    `
  }

  private _renderTariffCard(
    elec: MeterSummary | null,
    gas: MeterSummary | null,
    tou: boolean
  ) {
    const locale = this.hass?.language ?? 'en'
    const name = elec?.tariff_name ?? gas?.tariff_name ?? 'Tariff unavailable'
    const primary = elec ?? gas
    const validFrom = primary?.tariff_valid_from ?? null
    const validTo = primary?.tariff_valid_to ?? null
    const type = primary?.tariff_type ?? null

    const dates: string[] = []
    if (type) dates.push(type)
    if (validFrom) dates.push(`started ${fullDate(validFrom, locale)}`)
    if (validTo) dates.push(`locked until ${fullDate(validTo, locale)}`)

    return html`
      <div class="card card--dark tariff-hero">
        <div class="tariff-hero-head">
          <div>
            <div class="eyebrow">Current tariff</div>
            <div class="serif tariff-hero-name">${name}</div>
            ${
              dates.length
                ? html`<div class="tariff-hero-dates">${dates.join(' · ')}</div>`
                : nothing
            }
          </div>
          <span class="pill pill--dark tariff-hero-pill">
            ${tou ? 'Time-of-use' : 'Flat rate · no off-peak'}
          </span>
        </div>
        <div class="tariff-hero-stats">
          ${this._heroStat('Electricity unit', formatRatePounds(elec?.unit_rate), 'per kWh', 'var(--eon-elec)')}
          ${this._heroStat('Elec standing', formatRatePounds(elec?.standing_charge), 'per day', 'var(--eon-elec-standing)')}
          ${this._heroStat('Gas unit', formatRatePounds(gas?.unit_rate), 'per kWh', 'var(--eon-gas)')}
          ${this._heroStat('Gas standing', formatRatePounds(gas?.standing_charge), 'per day', 'var(--eon-gas-standing)')}
        </div>
      </div>
    `
  }

  private _heroStat(label: string, value: string, sub: string, color: string) {
    return html`
      <div class="hero-stat" style="border-left-color:${color}">
        <div class="tariff-stat-label">${label}</div>
        <div class="serif hero-stat-value">${value}</div>
        <div class="hero-stat-sub">${sub}</div>
      </div>
    `
  }

  private _renderRateStrip(elec: MeterSummary | null, tou: boolean) {
    const rates = meterDayRates(elec)
    const bars = buildRateBars(rates, elec?.unit_rate ?? null)
    const now = new Date()
    const nowFraction = (now.getHours() * 60 + now.getMinutes()) / 1440
    const headline = tou
      ? 'Varies through the day'
      : `Flat · ${formatPence(elec?.unit_rate)}/kWh all day`

    return html`
      <div class="card rate-strip-card">
        <div class="chart-title-row">
          <div class="chart-title">Today's electricity rate</div>
          <div class="muted rate-headline">${headline}</div>
        </div>
        <eon-halfhour-strip
          .bars=${bars}
          .height=${64}
          .nowFraction=${nowFraction}
          .axis=${['00:00', '06:00', '12:00', '18:00', '24:00']}
          ariaLabel="Today's electricity rate by half-hour"
        ></eon-halfhour-strip>
        ${
          tou
            ? nothing
            : html`<div class="callout rate-callout">
                You're on a fixed tariff, so there's no cheaper window - the price is
                identical every half-hour. On a time-of-use tariff this strip would shade
                the off-peak hours automatically.
              </div>`
        }
      </div>
    `
  }

  private _renderTimelines(elec: MeterSummary | null, gas: MeterSummary | null) {
    return html`
      <div class="grid-2">
        ${this._renderTimeline('Electricity', elec, 'var(--eon-elec)')}
        ${this._renderTimeline('Gas', gas, 'var(--eon-gas)')}
      </div>
    `
  }

  private _renderTimeline(label: string, meter: MeterSummary | null, color: string) {
    const locale = this.hass?.language ?? 'en'
    const previous = meterRateWindow(meter, 'previous')
    const next = meterRateWindow(meter, 'next')
    const currentRate = meter?.unit_rate ?? null

    return html`
      <div class="card timeline-card">
        <div class="timeline-title">${label} rate timeline</div>
        ${this._timelineRow('Previous', previous.rate, previous.validTo ? `→ ${fullDate(previous.validTo, locale)}` : '', false, color)}
        ${this._timelineRow('Current', currentRate, previous.validTo ? `from ${fullDate(previous.validTo, locale)}` : '', true, color)}
        ${this._timelineRow('Next', next.rate ?? currentRate, next.rate == null ? 'fixed' : next.validFrom ? `from ${fullDate(next.validFrom, locale)}` : '', false, color)}
      </div>
    `
  }

  private _timelineRow(
    label: string,
    rate: number | null,
    note: string,
    current: boolean,
    color: string
  ) {
    return html`
      <div class="timeline-row ${current ? 'timeline-row--current' : ''}">
        <span class="muted">${label}</span>
        <span class="timeline-rate" style=${current ? `color:${color}` : ''}>
          ${formatPence(rate)}
          ${note ? html`<span class="faint timeline-note">${note}</span>` : nothing}
        </span>
      </div>
    `
  }
}

function fullDate(value: string, locale: string): string {
  const d = new Date(value.length <= 10 ? `${value}T00:00:00` : value)
  if (isNaN(d.getTime())) return value
  return d.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })
}

/**
 * Map today's rate windows onto 48 half-hour bars. A flat tariff renders every
 * bar at the same height; a time-of-use tariff scales bar height to the rate.
 */
function buildRateBars(rates: DayRate[], fallbackRate: number | null): HalfHourBar[] {
  const slotRates: number[] = []
  const slotOffPeak: boolean[] = []
  const midnight = new Date()
  midnight.setHours(0, 0, 0, 0)

  for (let i = 0; i < 48; i++) {
    const slotStart = new Date(midnight.getTime() + i * 30 * 60000)
    const slotMid = new Date(slotStart.getTime() + 15 * 60000)
    let rate = fallbackRate ?? 0
    let offPeak = false
    for (const w of rates) {
      const start = new Date(w.start)
      const end = new Date(w.end)
      if (isNaN(start.getTime()) || isNaN(end.getTime())) continue
      if (slotMid >= start && slotMid < end) {
        rate = w.rate
        offPeak = w.isOffPeak
        break
      }
    }
    slotRates.push(rate)
    slotOffPeak.push(offPeak)
  }

  const min = Math.min(...slotRates)
  const max = Math.max(...slotRates)
  const flat = max - min < 1e-6

  return slotRates.map((rate, i) => {
    const heightPct = flat ? 72 : 45 + ((rate - min) / (max - min)) * 50
    const color = slotOffPeak[i] ? 'var(--eon-green-light)' : 'var(--eon-elec-tile)'
    return { heightPct, color }
  })
}

if (!customElements.get('eon-tariff-page')) {
  customElements.define('eon-tariff-page', EonTariffPage)
}

export { EonTariffPage }
