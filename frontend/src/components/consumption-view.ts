import { LitElement, html, nothing } from 'lit'
import { property, state } from 'lit/decorators.js'
import { getConsumptionHistory } from '../api'
import type { HomeAssistant, MeterSummary } from '../types'
import type { ConsumptionHistoryEntry } from '../api'
import './bar-chart'
import './range-picker'

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
  @property({ type: Number }) days = 7

  @state() private _history: ConsumptionHistoryEntry[] = []
  @state() private _loading = true
  @state() private _selectedDays = 0

  /** Memoized chart data — recomputed when history or meter pricing context changes. */
  private _chartLabels: string[] = []
  private _chartDatasets: ChartDataset[] = []
  private _memoizedHistory: ConsumptionHistoryEntry[] | null = null
  private _memoizedMeterType: MeterSummary['type'] | undefined = undefined
  private _memoizedUnitRate: number | null | undefined = undefined
  private _memoizedStandingCharge: number | null | undefined = undefined

  private _fetchedSerial: string | null = null
  private _fetchedDays = 0

  connectedCallback() {
    // eslint-disable-next-line wc/guard-super-call
    super.connectedCallback()
    if (this._selectedDays === 0) {
      this._selectedDays = this.days
    }
  }

  updated() {
    if (
      this.hass &&
      this.meter?.serial &&
      (this.meter.serial !== this._fetchedSerial ||
        this._selectedDays !== this._fetchedDays)
    ) {
      this._fetchHistory()
    }
  }

  private async _fetchHistory() {
    this._fetchedSerial = this.meter.serial
    this._fetchedDays = this._selectedDays
    this._loading = true
    try {
      const resp = await getConsumptionHistory(
        this.hass,
        this.meter.serial!,
        this._selectedDays
      )
      this._history = resp.entries
    } catch {
      this._history = []
    }
    this._loading = false
  }

  private _onRangeChanged(e: CustomEvent<{ value: number }>) {
    this._selectedDays = e.detail.value
  }

  private _formatLabel(dateStr: string, totalDays: number): string {
    const locale = this.hass?.language ?? 'en'
    const d = new Date(dateStr + 'T00:00:00')
    if (totalDays <= 14) {
      return d.toLocaleDateString(locale, { weekday: 'short' })
    }
    if (totalDays <= 31) {
      return d.toLocaleDateString(locale, { day: 'numeric' })
    }
    return d.toLocaleDateString(locale, { month: 'short', day: 'numeric' })
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

    this._chartLabels = this._history.map((e) =>
      this._formatLabel(e.date, this._selectedDays)
    )

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
      <div class="consumption-header">
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

        <eon-range-picker
          .value=${this._selectedDays}
          @range-changed=${this._onRangeChanged}
        ></eon-range-picker>
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
