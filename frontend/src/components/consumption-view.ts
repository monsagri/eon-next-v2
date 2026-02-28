import { LitElement, html, nothing } from 'lit'
import { property, state } from 'lit/decorators.js'
import { getConsumptionHistory } from '../api'
import type { HomeAssistant, MeterSummary } from '../types'
import type { ConsumptionHistoryEntry } from '../api'
import './bar-chart'

import sharedStyles from '../styles/shared.css'
import styles from '../styles/consumption-view.css'

interface ChartDataset {
  label: string
  data: number[]
  backgroundColor: string
  borderRadius: number
  yAxisID?: string
}

class EonConsumptionView extends LitElement {
  static styles = [sharedStyles, styles]

  @property({ attribute: false }) hass!: HomeAssistant
  @property({ attribute: false }) meter!: MeterSummary

  @state() private _history: ConsumptionHistoryEntry[] = []
  @state() private _loading = true

  /** Memoized chart data — recomputed when history or meter pricing context changes. */
  private _chartLabels: string[] = []
  private _chartDatasets: ChartDataset[] = []
  private _memoizedHistory: ConsumptionHistoryEntry[] | null = null
  private _memoizedMeterType: MeterSummary['type'] | undefined = undefined
  private _memoizedUnitRate: number | null | undefined = undefined
  private _memoizedStandingCharge: number | null | undefined = undefined

  private _fetchedSerial: string | null = null

  updated() {
    if (this.hass && this.meter?.serial && this.meter.serial !== this._fetchedSerial) {
      this._fetchHistory()
    }
  }

  private async _fetchHistory() {
    this._fetchedSerial = this.meter.serial
    this._loading = true
    try {
      const resp = await getConsumptionHistory(this.hass, this.meter.serial!, 7)
      this._history = resp.entries
    } catch {
      this._history = []
    }
    this._loading = false
  }

  private _ensureChartData(): void {
    const meterType = this.meter?.type
    const unitRate = this.meter?.unit_rate
    const standingCharge = this.meter?.standing_charge

    if (
      this._memoizedHistory === this._history &&
      this._memoizedMeterType === meterType &&
      this._memoizedUnitRate === unitRate &&
      this._memoizedStandingCharge === standingCharge
    ) {
      return
    }

    this._memoizedHistory = this._history
    this._memoizedMeterType = meterType
    this._memoizedUnitRate = unitRate
    this._memoizedStandingCharge = standingCharge

    const locale = this.hass?.language ?? 'en'
    this._chartLabels = this._history.map((e) => {
      const d = new Date(e.date + 'T00:00:00')
      return d.toLocaleDateString(locale, { weekday: 'short' })
    })

    const barColor =
      this.meter?.type === 'gas' ? 'rgba(255, 152, 0, 0.7)' : 'rgba(3, 169, 244, 0.7)'
    const datasets: ChartDataset[] = [
      {
        label: 'Consumption (kWh)',
        data: this._history.map((e) => e.consumption),
        backgroundColor: barColor,
        borderRadius: 4
      }
    ]

    const rate = unitRate
    const standing = standingCharge ?? 0
    if (rate != null) {
      datasets.push({
        label: 'Cost (£)',
        data: this._history.map(
          (e) => Math.round((e.consumption * rate + standing) * 100) / 100
        ),
        backgroundColor: 'rgba(76, 175, 80, 0.7)',
        borderRadius: 4,
        yAxisID: 'y2'
      })
    }

    this._chartDatasets = datasets
  }

  render() {
    this._ensureChartData()

    return html`
      <div class="stats">
        ${this.meter?.daily_consumption != null
          ? html`<div class="stat">
              <span class="stat-value"
                >${this.meter.daily_consumption}<span class="unit">kWh</span></span
              >
              <span class="stat-label">Today</span>
            </div>`
          : nothing}
      </div>

      ${this._history.length > 0
        ? html`<eon-bar-chart
            .labels=${this._chartLabels}
            .datasets=${this._chartDatasets}
            yLabel="kWh"
            y2Label=${this.meter?.unit_rate != null ? '£' : ''}
            ?darkMode=${this.hass?.themes?.darkMode ?? false}
          ></eon-bar-chart>`
        : this._loading
          ? html`<div class="chart-placeholder">Loading chart…</div>`
          : nothing}
    `
  }
}

if (!customElements.get('eon-consumption-view')) {
  customElements.define('eon-consumption-view', EonConsumptionView)
}
