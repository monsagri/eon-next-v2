import { LitElement, html } from 'lit'
import { property, state } from 'lit/decorators.js'
import { getDashboardSummary } from '../api'
import { WsDataController } from '../controllers/ws-data-controller'
import type { HomeAssistant, DashboardSummary } from '../types'
import '../components/ev-schedule-view'

import sharedStyles from '../styles/shared.css'

export interface EvCardConfig {
  type: string
  device_id?: string
}

class EonNextEvCard extends LitElement {
  static styles = [sharedStyles]

  @property({ attribute: false }) hass!: HomeAssistant
  @state() private _config!: EvCardConfig

  private _data = new WsDataController<DashboardSummary>(this, (h) =>
    getDashboardSummary(h)
  )

  setConfig(config: EvCardConfig): void {
    this._config = { ...config }
  }

  getCardSize(): number {
    return 3
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

    const ev = this._findDevice()
    if (!ev) {
      return html`<ha-card>
        <div class="card-content secondary-text">No EV charger found</div>
      </ha-card>`
    }

    return html`
      <ha-card>
        <div class="card-header">
          <ha-icon icon="mdi:ev-station" style="--mdc-icon-size: 18px;"></ha-icon>
          EV Smart Charging
        </div>
        <div class="card-content">
          <eon-ev-schedule-view
            .hass=${this.hass}
            .deviceId=${ev.device_id ?? ''}
          ></eon-ev-schedule-view>
        </div>
      </ha-card>
    `
  }

  private _findDevice() {
    const chargers = this._data.data?.ev_chargers ?? []
    if (this._config.device_id) {
      return chargers.find((c) => c.device_id === this._config.device_id)
    }
    return chargers[0] ?? null
  }
}

if (!customElements.get('eon-next-ev-card')) {
  customElements.define('eon-next-ev-card', EonNextEvCard)
}
