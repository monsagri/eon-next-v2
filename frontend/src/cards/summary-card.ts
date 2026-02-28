import { LitElement, html, nothing } from 'lit'
import { property, state } from 'lit/decorators.js'
import { getDashboardSummary, getConsumptionHistory } from '../api'
import { WsDataController } from '../controllers/ws-data-controller'
import type { HomeAssistant, DashboardSummary, MeterSummary } from '../types'
import { formatDateTime } from '../utils/date'
import '../components/sparkline-chart'

import sharedStyles from '../styles/shared.css'
import cardStyles from '../styles/summary-card.css'

export interface SummaryCardConfig {
  type: string
  show_gas?: boolean
  show_ev?: boolean
  show_costs?: boolean
}

class EonNextSummaryCard extends LitElement {
  static styles = [sharedStyles, cardStyles]

  @property({ attribute: false }) hass!: HomeAssistant
  @state() private _config!: SummaryCardConfig
  @state() private _sparklines: Record<string, number[]> = {}

  private _data = new WsDataController<DashboardSummary>(this, (h) =>
    getDashboardSummary(h)
  )

  private _sparklineFetched = false

  setConfig(config: SummaryCardConfig): void {
    this._config = { show_gas: true, show_ev: true, show_costs: true, ...config }
  }

  getCardSize(): number {
    return 4
  }

  updated() {
    if (this.hass && this._data.data && !this._sparklineFetched) {
      this._fetchSparklines()
    }
  }

  private async _fetchSparklines() {
    this._sparklineFetched = true
    const meters = this._data.data?.meters ?? []
    const meterPromises = meters
      .filter((meter) => meter.serial)
      .map(async (meter) => {
        try {
          const serial = meter.serial as string
          const resp = await getConsumptionHistory(this.hass, serial, 7)
          return { serial, values: resp.entries.map((e) => e.consumption) }
        } catch {
          // Sparkline is optional; silently skip individual failures.
          return null
        }
      })

    if (meterPromises.length === 0) {
      return
    }

    const results = await Promise.all(meterPromises)
    const nextSparklines: Record<string, number[]> = {}

    for (const result of results) {
      if (result) {
        nextSparklines[result.serial] = result.values
      }
    }

    if (Object.keys(nextSparklines).length > 0) {
      this._sparklines = {
        ...this._sparklines,
        ...nextSparklines
      }
    }
  }

  render() {
    if (this._data.error) {
      return html`<ha-card>
        <div class="error">Unable to load data</div>
        <div class="card-content secondary-text">Details: ${this._data.error}</div>
      </ha-card>`
    }

    if (!this._data.data) {
      return html`<ha-card>
        <div class="card-content secondary-text">Loading…</div>
      </ha-card>`
    }

    const { meters, ev_chargers } = this._data.data
    const electricity = meters.filter((m) => m.type === 'electricity')
    const gas = meters.filter((m) => m.type === 'gas')
    const showGas = this._config.show_gas !== false
    const showEv = this._config.show_ev !== false
    const showCosts = this._config.show_costs !== false

    return html`
      <ha-card>
        <div class="title">
          <ha-icon icon="mdi:lightning-bolt" style="--mdc-icon-size: 18px;"></ha-icon>
          EON Next Summary
        </div>

        ${electricity.map((m) =>
          this._renderMeterSection(m, 'Electricity', 'mdi:flash', showCosts)
        )}
        ${showGas
          ? gas.map((m) => this._renderMeterSection(m, 'Gas', 'mdi:fire', showCosts))
          : nothing}
        ${showEv && ev_chargers.length > 0
          ? html`<div class="meter-section">
              <div class="meter-label">
                <ha-icon icon="mdi:ev-station" style="--mdc-icon-size: 16px;"></ha-icon>
                EV Charging
              </div>
              ${ev_chargers.map(
                (ev) => html`
                  <div class="stat-row">
                    <span class="stat-label">Status</span>
                    <span>${ev.schedule_slots > 0 ? 'Scheduled' : 'Idle'}</span>
                  </div>
                  ${ev.next_charge_start
                    ? html`<div class="stat-row">
                        <span class="stat-label">Next charge</span>
                        <span>${formatDateTime(ev.next_charge_start)}</span>
                      </div>`
                    : nothing}
                `
              )}
            </div>`
          : nothing}
        ${!meters.length && !ev_chargers.length
          ? html`<div class="empty-notice">No data available</div>`
          : nothing}
      </ha-card>
    `
  }

  private _renderMeterSection(
    meter: MeterSummary,
    label: string,
    icon: string,
    showCosts: boolean
  ) {
    const todayCost =
      meter.daily_consumption != null && meter.unit_rate != null
        ? meter.daily_consumption * meter.unit_rate + (meter.standing_charge ?? 0)
        : null

    const sparklineData = meter.serial ? this._sparklines[meter.serial] : undefined
    const sparklineColor =
      meter.type === 'gas' ? 'rgba(255, 152, 0, 0.8)' : 'rgba(3, 169, 244, 0.8)'

    return html`
      <div class="meter-section">
        <div class="meter-label">
          <ha-icon .icon=${icon} style="--mdc-icon-size: 16px;"></ha-icon>
          ${label}
        </div>

        ${meter.daily_consumption != null
          ? html`<div class="stat-row">
              <span class="stat-label">Today</span>
              <span>${meter.daily_consumption} kWh</span>
            </div>`
          : nothing}
        ${showCosts && todayCost != null
          ? html`<div class="stat-row">
              <span class="stat-label">Today's cost</span>
              <span>£${todayCost.toFixed(2)}</span>
            </div>`
          : nothing}
        ${showCosts && meter.previous_day_cost != null
          ? html`<div class="stat-row">
              <span class="stat-label">Yesterday cost</span>
              <span>£${meter.previous_day_cost.toFixed(2)}</span>
            </div>`
          : nothing}
        ${showCosts && meter.standing_charge != null
          ? html`<div class="stat-row">
              <span class="stat-label">Standing charge</span>
              <span>£${meter.standing_charge.toFixed(2)}/day</span>
            </div>`
          : nothing}
        ${sparklineData && sparklineData.length >= 2
          ? html`<eon-sparkline-chart
              .values=${sparklineData}
              .color=${sparklineColor}
            ></eon-sparkline-chart>`
          : nothing}
      </div>
    `
  }
}

customElements.define('eon-next-summary-card', EonNextSummaryCard)
