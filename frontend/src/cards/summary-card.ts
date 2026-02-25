import { LitElement, html, nothing } from 'lit'
import { property, state } from 'lit/decorators.js'
import { getDashboardSummary } from '../api'
import { WsDataController } from '../controllers/ws-data-controller'
import { renderMeterSummary } from '../templates/meter-summary'
import type { HomeAssistant, DashboardSummary } from '../types'

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

  private _data = new WsDataController<DashboardSummary>(this, (h) =>
    getDashboardSummary(h)
  )

  setConfig(config: SummaryCardConfig): void {
    this._config = { show_gas: true, show_ev: true, show_costs: true, ...config }
  }

  getCardSize(): number {
    return 3
  }

  render() {
    if (this._data.error) {
      return html`<ha-card>
        <div class="error">Error: ${this._data.error}</div>
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
          renderMeterSummary(m, 'Electricity', 'mdi:flash', showCosts)
        )}
        ${showGas
          ? gas.map((m) => renderMeterSummary(m, 'Gas', 'mdi:fire', showCosts))
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
                `
              )}
            </div>`
          : nothing}
      </ha-card>
    `
  }
}

customElements.define('eon-next-summary-card', EonNextSummaryCard)
