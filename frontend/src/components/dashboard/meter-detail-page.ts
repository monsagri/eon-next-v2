import { LitElement, html, nothing } from 'lit'
import { property, state } from 'lit/decorators.js'
import type { PropertyValues } from 'lit'
import { getConsumptionHistory } from '../../api'
import type { ConsumptionHistoryEntry } from '../../api'
import type { HomeAssistant, MeterSummary } from '../../types'
import {
  FUEL,
  type FuelKind,
  type StackedBar,
  computeMonthCost,
  formatPence,
  formatPounds,
  formatShortDate,
  isTimeOfUse,
  normaliseType,
  toMonthlyStackedBars,
  toStackedBars
} from '../../utils/dashboard-data'
import '../range-picker'
import './stacked-bar-chart'

import tokens from '../../styles/dashboard-tokens.css'
import shared from '../../styles/dashboard-shared.css'
import styles from '../../styles/meter-detail-page.css'

/** Detailed consumption-cost history for one meter (electricity or gas). */
class EonMeterDetailPage extends LitElement {
  static styles = [tokens, shared, styles]

  @property({ attribute: false }) hass!: HomeAssistant
  @property({ attribute: false }) meter: MeterSummary | null = null
  /** Bumped by the shell's refresh button to force a re-fetch. */
  @property({ type: Number }) refreshToken = 0

  @state() private _days = 30
  @state() private _history: ConsumptionHistoryEntry[] = []
  @state() private _loading = true

  private _fetchedSerial: string | null = null
  private _fetchedDays = 0
  private _fetchedToken = -1
  private _requestId = 0

  // Memoised chart/month math — recomputed only when its inputs change, so it
  // doesn't re-run on every unrelated `hass` state tick.
  private _memoHistory: ConsumptionHistoryEntry[] | null = null
  private _memoDays = -1
  private _memoRate: number | null | undefined = undefined
  private _memoStanding: number | null | undefined = undefined
  private _memoBars: StackedBar[] = []
  private _memoMonthToDate = 0

  get kind(): FuelKind {
    return normaliseType(this.meter?.type ?? null)
  }

  updated(changed: PropertyValues) {
    if (!this.hass || !this.meter?.serial) return
    const needed = this._daysToFetch()
    if (
      this.meter.serial !== this._fetchedSerial ||
      needed !== this._fetchedDays ||
      this.refreshToken !== this._fetchedToken ||
      changed.has('meter')
    ) {
      this._fetch(needed)
    }
  }

  /** Fetch enough history to cover the chart range *and* month-to-date. */
  private _daysToFetch(): number {
    const dayOfMonth = new Date().getDate()
    return Math.max(this._days, dayOfMonth)
  }

  private async _fetch(days: number) {
    this._fetchedSerial = this.meter!.serial
    this._fetchedDays = days
    this._fetchedToken = this.refreshToken
    this._loading = true
    const id = ++this._requestId
    try {
      const resp = await getConsumptionHistory(this.hass, this.meter!.serial!, days)
      if (id !== this._requestId) return
      this._history = resp.entries
    } catch {
      if (id !== this._requestId) return
      this._history = []
    }
    this._loading = false
  }

  private _onRange(e: CustomEvent<{ value: number }>) {
    this._days = e.detail.value
  }

  /** Recompute the chart bars and month-to-date cost only when inputs change. */
  private _ensureComputed(): void {
    const rate = this.meter?.unit_rate
    const standing = this.meter?.standing_charge
    if (
      this._memoHistory === this._history &&
      this._memoDays === this._days &&
      this._memoRate === rate &&
      this._memoStanding === standing
    ) {
      return
    }
    this._memoHistory = this._history
    this._memoDays = this._days
    this._memoRate = rate
    this._memoStanding = standing

    const locale = this.hass?.language ?? 'en'
    // Chart shows the most recent `_days` entries from the (possibly larger) fetch.
    const recent = this._history.slice(-this._days)
    this._memoBars =
      this._days >= 365
        ? toMonthlyStackedBars(this._history, rate, standing, locale)
        : toStackedBars(recent, rate, standing, this._days, locale)
    this._memoMonthToDate = computeMonthCost(
      this._history,
      rate,
      standing,
      new Date()
    ).monthToDate
  }

  render() {
    if (!this.meter) {
      return html`<div class="placeholder">No meter available.</div>`
    }

    this._ensureComputed()
    const kind = this.kind
    const fuel = FUEL[kind]
    const standingPence = formatPence(this.meter.standing_charge, 0)

    return html`
      <div class="page">
        ${this._renderHeader(fuel)}
        ${this._renderChartCard(kind, this._memoBars, fuel, standingPence)}
        ${this._renderStats(standingPence)} ${this._renderReadingStrip(kind)}
      </div>
    `
  }

  private _renderHeader(fuel: (typeof FUEL)[FuelKind]) {
    const tou = isTimeOfUse(this.hass, this.meter?.serial ?? null)
    const descriptor =
      this.kind === 'gas'
        ? 'Import · volume m³ → kWh'
        : tou
          ? 'Import · time-of-use'
          : 'Import · single rate'
    return html`
      <div class="detail-header">
        <div class="meter-id">
          <span class="tile ${fuel.tileClass}">
            <ha-icon .icon=${fuel.icon} style="--mdc-icon-size:18px"></ha-icon>
          </span>
          <div>
            <div class="mono meter-serial">Meter ${this.meter?.serial ?? '—'}</div>
            <div class="muted meter-descriptor">${descriptor}</div>
          </div>
        </div>
        <eon-range-picker
          .value=${this._days}
          @range-changed=${this._onRange}
        ></eon-range-picker>
      </div>
    `
  }

  private _renderChartCard(
    kind: FuelKind,
    bars: StackedBar[],
    fuel: (typeof FUEL)[FuelKind],
    standingPence: string
  ) {
    return html`
      <div class="card chart-card">
        <div class="chart-title-row">
          <div class="chart-title">Daily cost — usage &amp; standing charge</div>
          <div class="faint chart-range">${this._rangeLabel()}</div>
        </div>
        ${
          bars.length
            ? html`<eon-stacked-bar-chart
                .bars=${bars}
                usageColor=${fuel.usageColor}
                standColor=${fuel.standColor}
                .height=${240}
              ></eon-stacked-bar-chart>`
            : html`<div class="placeholder">
                ${this._loading ? 'Loading chart…' : 'No consumption data for this range.'}
              </div>`
        }
        <div class="legend chart-legend">
          <span class="legend-item">
            <span class="legend-swatch" style="background:${fuel.usageColor}"></span
            >Energy used
          </span>
          <span class="legend-item">
            <span class="legend-swatch" style="background:${fuel.standColor}"></span>
            Standing charge (${standingPence} / day, fixed)
          </span>
        </div>
        ${
          kind === 'gas'
            ? html`<div class="callout">
                In summer barely any gas is used — nearly every bar is
                <b>pure standing charge</b>. Heating usage grows the caps again from
                autumn.
              </div>`
            : nothing
        }
        <div class="footnote faint">
          Costs use today's unit rate applied to historical usage — an approximation, as
          no historical rate series is available.
        </div>
      </div>
    `
  }

  private _renderStats(standingPence: string) {
    return html`
      <div class="grid-4">
        ${this._statCard('This month', formatPounds(this._memoMonthToDate))}
        ${this._statCard('Yesterday', formatPounds(this.meter?.previous_day_cost))}
        ${this._statCard('Unit rate', formatPence(this.meter?.unit_rate), 'per kWh')}
        ${this._statCard('Standing', standingPence, 'per day')}
      </div>
    `
  }

  private _statCard(label: string, value: string, sub?: string) {
    return html`
      <div class="card card--stat">
        <div class="stat-label">${label}</div>
        <div class="stat-value">${value}</div>
        ${sub ? html`<div class="stat-sub">${sub}</div>` : nothing}
      </div>
    `
  }

  private _renderReadingStrip(kind: FuelKind) {
    const reading = this.meter?.latest_reading
    if (reading == null) return nothing
    const locale = this.hass?.language ?? 'en'
    const descriptor = `${kind === 'gas' ? 'Volume' : 'Register'} read · ${formatShortDate(
      this.meter?.latest_reading_date,
      locale
    )}`
    return html`
      <div class="card reading-strip">
        <div>
          <div class="reading-title">Latest meter reading</div>
          <div class="faint reading-descriptor">${descriptor}</div>
        </div>
        <div class="mono reading-value">
          ${reading.toLocaleString(locale)}
          <span class="reading-unit faint">kWh</span>
        </div>
      </div>
    `
  }

  private _rangeLabel(): string {
    return (
      { 7: 'Last 7 days', 30: 'Last 30 days', 90: 'Last 90 days', 365: 'Last 12 months' }[
        this._days
      ] ?? `Last ${this._days} days`
    )
  }
}

if (!customElements.get('eon-meter-detail-page')) {
  customElements.define('eon-meter-detail-page', EonMeterDetailPage)
}

export { EonMeterDetailPage }
