import { LitElement, html } from 'lit'
import { property, state } from 'lit/decorators.js'
import { getDashboardSummary } from '../api'
import { WsDataController } from '../controllers/ws-data-controller'
import type { HomeAssistant, DashboardSummary } from '../types'
import '../components/consumption-breakdown-view'

import sharedStyles from '../styles/shared.css'

export interface ConsumptionBreakdownCardConfig {
  type: string
  meter_type?: string
  meter_serial?: string
}

class EonNextConsumptionBreakdownCard extends LitElement {
  static styles = [sharedStyles]

  static async getConfigElement() {
    await import('./editors/meter-card-editor')
    return document.createElement('eon-next-meter-card-editor')
  }

  @property({ attribute: false }) hass!: HomeAssistant
  @state() private _config!: ConsumptionBreakdownCardConfig

  private _data = new WsDataController<DashboardSummary>(this, (h) =>
    getDashboardSummary(h)
  )

  setConfig(config: ConsumptionBreakdownCardConfig): void {
    this._config = { meter_type: 'electricity', ...config }
  }

  getCardSize(): number {
    return 4
  }

  render() {
    if (this._data.error) {
      return html`<ha-card>
        <div class="card-content error">Error: ${this._data.error}</div>
      </ha-card>`
    }

    if (!this._data.data) {
      return html`<ha-card>
        <div class="card-content secondary-text">Loading…</div>
      </ha-card>`
    }

    const meter = this._findMeter()
    if (!meter) {
      return html`<ha-card>
        <div class="card-content secondary-text">No meter found</div>
      </ha-card>`
    }

    const icon = meter.type === 'gas' ? 'mdi:fire' : 'mdi:flash'
    const label = meter.type === 'gas' ? 'Gas' : 'Electricity'

    return html`
      <ha-card>
        <div class="card-header">
          <ha-icon .icon=${icon} style="--mdc-icon-size: 18px;"></ha-icon>
          ${label} Cost Breakdown
        </div>
        <div class="card-content">
          <eon-consumption-breakdown-view
            .hass=${this.hass}
            .meter=${meter}
          ></eon-consumption-breakdown-view>
        </div>
      </ha-card>
    `
  }

  private _findMeter() {
    const meters = this._data.data?.meters ?? []
    if (this._config.meter_serial) {
      return meters.find((m) => m.serial === this._config.meter_serial)
    }
    return meters.find((m) => m.type === this._config.meter_type) ?? meters[0]
  }
}

customElements.define(
  'eon-next-consumption-breakdown-card',
  EonNextConsumptionBreakdownCard
)
