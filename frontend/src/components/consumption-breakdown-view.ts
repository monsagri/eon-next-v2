import { LitElement, html, nothing } from 'lit'
import { property, state } from 'lit/decorators.js'
import { getConsumptionHistory } from '../api'
import type { HomeAssistant, MeterSummary } from '../types'
import type { ConsumptionHistoryEntry } from '../api'
import './pie-chart'
import './range-picker'
import type { PieChartSegment } from './pie-chart'
import type { RangeOption } from './range-picker'

import sharedStyles from '../styles/shared.css'
import styles from '../styles/consumption-breakdown-view.css'

type PeriodMode = 'day' | 'week' | 'month'

const PERIOD_OPTIONS: RangeOption[] = [
  { label: 'Day', value: 1 },
  { label: 'Week', value: 7 },
  { label: 'Month', value: 30 }
]

const COLOR_CONSUMPTION = 'rgba(3, 169, 244, 0.85)'
const COLOR_CONSUMPTION_GAS = 'rgba(255, 152, 0, 0.85)'
const COLOR_STANDING = 'rgba(156, 39, 176, 0.75)'

class EonConsumptionBreakdownView extends LitElement {
  static styles = [sharedStyles, styles]

  @property({ attribute: false }) hass!: HomeAssistant
  @property({ attribute: false }) meter!: MeterSummary

  @state() private _history: ConsumptionHistoryEntry[] = []
  @state() private _loading = true
  @state() private _periodMode: PeriodMode = 'day'

  private _fetchedSerial: string | null = null
  private _fetchedDays = 0
  private _requestId = 0

  /** Memoization keys */
  private _memoHistory: ConsumptionHistoryEntry[] | null = null
  private _memoPeriodMode: PeriodMode | null = null
  private _memoUnitRate: number | null | undefined = undefined
  private _memoStandingCharge: number | null | undefined = undefined
  private _memoMeterType: string | null | undefined = undefined
  private _memoSegments: PieChartSegment[] = []
  private _memoConsumptionCost = 0
  private _memoStandingCost = 0
  private _memoTotalCost = 0
  private _memoPeriodLabel = ''

  updated() {
    if (!this.hass || !this.meter?.serial) return

    const daysNeeded = this._daysForPeriod()
    if (this.meter.serial !== this._fetchedSerial || daysNeeded !== this._fetchedDays) {
      this._fetchHistory(daysNeeded)
    }
  }

  private _daysForPeriod(): number {
    switch (this._periodMode) {
      case 'day':
        return 2
      case 'week':
        return 8
      case 'month':
        return 31
    }
  }

  private async _fetchHistory(days: number) {
    this._fetchedSerial = this.meter.serial
    this._fetchedDays = days
    this._loading = true
    const id = ++this._requestId
    try {
      const resp = await getConsumptionHistory(this.hass, this.meter.serial!, days)
      if (id !== this._requestId) return // stale response — a newer request superseded this one
      this._history = resp.entries
    } catch {
      if (id !== this._requestId) return
      this._history = []
    }
    this._loading = false
  }

  private _onPeriodChanged(e: CustomEvent<{ value: number }>) {
    const val = e.detail.value
    if (val === 1) this._periodMode = 'day'
    else if (val === 7) this._periodMode = 'week'
    else this._periodMode = 'month'
  }

  private _periodValue(): number {
    switch (this._periodMode) {
      case 'day':
        return 1
      case 'week':
        return 7
      case 'month':
        return 30
    }
  }

  private _ensureComputedData(): void {
    if (
      this._memoHistory === this._history &&
      this._memoPeriodMode === this._periodMode &&
      this._memoUnitRate === this.meter?.unit_rate &&
      this._memoStandingCharge === this.meter?.standing_charge &&
      this._memoMeterType === this.meter?.type
    ) {
      return
    }

    this._memoHistory = this._history
    this._memoPeriodMode = this._periodMode
    this._memoUnitRate = this.meter?.unit_rate
    this._memoStandingCharge = this.meter?.standing_charge
    this._memoMeterType = this.meter?.type

    const rate = this.meter?.unit_rate ?? 0
    const standing = this.meter?.standing_charge ?? 0
    const isGas = this.meter?.type === 'gas'

    const entries = this._entriesForPeriod()
    const numDays = entries.length

    let totalConsumption = 0
    for (const entry of entries) {
      totalConsumption += entry.consumption
    }

    const consumptionCost = Math.round(totalConsumption * rate * 100) / 100
    const standingCost = Math.round(numDays * standing * 100) / 100
    const totalCost = Math.round((consumptionCost + standingCost) * 100) / 100

    this._memoConsumptionCost = consumptionCost
    this._memoStandingCost = standingCost
    this._memoTotalCost = totalCost

    this._memoSegments =
      totalCost > 0
        ? [
            {
              label: 'Usage charges',
              value: consumptionCost,
              color: isGas ? COLOR_CONSUMPTION_GAS : COLOR_CONSUMPTION
            },
            {
              label: 'Standing charge',
              value: standingCost,
              color: COLOR_STANDING
            }
          ]
        : []

    this._memoPeriodLabel = this._buildPeriodLabel(entries)
  }

  private _entriesForPeriod(): ConsumptionHistoryEntry[] {
    if (!this._history.length) return []

    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    switch (this._periodMode) {
      case 'day': {
        // Yesterday (most recent full day)
        const yesterday = new Date(today)
        yesterday.setDate(yesterday.getDate() - 1)
        const yStr = this._dateStr(yesterday)
        return this._history.filter((e) => e.date === yStr)
      }
      case 'week': {
        const weekAgo = new Date(today)
        weekAgo.setDate(weekAgo.getDate() - 7)
        return this._history.filter((e) => {
          const d = new Date(e.date + 'T00:00:00')
          return d >= weekAgo && d < today
        })
      }
      case 'month': {
        const monthAgo = new Date(today)
        monthAgo.setDate(monthAgo.getDate() - 30)
        return this._history.filter((e) => {
          const d = new Date(e.date + 'T00:00:00')
          return d >= monthAgo && d < today
        })
      }
    }
  }

  private _dateStr(d: Date): string {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }

  private _buildPeriodLabel(entries: ConsumptionHistoryEntry[]): string {
    const locale = this.hass?.language ?? 'en'
    if (!entries.length) return ''

    if (this._periodMode === 'day' && entries.length === 1) {
      const d = new Date(entries[0].date + 'T00:00:00')
      return d.toLocaleDateString(locale, {
        weekday: 'long',
        day: 'numeric',
        month: 'short'
      })
    }

    const first = new Date(entries[0].date + 'T00:00:00')
    const last = new Date(entries[entries.length - 1].date + 'T00:00:00')
    const fmt: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }
    return `${first.toLocaleDateString(locale, fmt)} – ${last.toLocaleDateString(locale, fmt)}`
  }

  render() {
    if (this.meter?.unit_rate == null) {
      return html`<div class="no-data">No tariff data available for cost breakdown</div>`
    }

    this._ensureComputedData()

    const darkMode = this.hass?.themes?.darkMode ?? false
    const isGas = this.meter?.type === 'gas'

    return html`
      <div class="breakdown-header">
        <div class="totals">
          ${this._memoTotalCost > 0
            ? html`<div class="stat">
                <span class="stat-value">£${this._memoTotalCost.toFixed(2)}</span>
                <span class="stat-label">${this._memoPeriodLabel || 'Total'}</span>
              </div>`
            : nothing}
        </div>

        <eon-range-picker
          .value=${this._periodValue()}
          .options=${PERIOD_OPTIONS}
          @range-changed=${this._onPeriodChanged}
        ></eon-range-picker>
      </div>

      ${this._memoSegments.length > 0
        ? html`
            <eon-pie-chart
              .segments=${this._memoSegments}
              ?darkMode=${darkMode}
            ></eon-pie-chart>

            <div class="legend">
              <div class="legend-item">
                <span
                  class="legend-swatch"
                  style="background: ${isGas ? COLOR_CONSUMPTION_GAS : COLOR_CONSUMPTION}"
                ></span>
                Usage £${this._memoConsumptionCost.toFixed(2)}
              </div>
              <div class="legend-item">
                <span class="legend-swatch" style="background: ${COLOR_STANDING}"></span>
                Standing £${this._memoStandingCost.toFixed(2)}
              </div>
            </div>
          `
        : this._loading
          ? html`<div class="chart-placeholder">Loading…</div>`
          : html`<div class="no-data">
              No consumption data available for this period
            </div>`}
    `
  }
}

if (!customElements.get('eon-consumption-breakdown-view')) {
  customElements.define('eon-consumption-breakdown-view', EonConsumptionBreakdownView)
}
