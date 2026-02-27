import { LitElement, html, nothing } from 'lit'
import { property } from 'lit/decorators.js'
import { getVersion, getDashboardSummary } from './api'
import { WsDataController } from './controllers/ws-data-controller'
import { renderEvCard } from './templates/ev-card'
import type {
  HomeAssistant,
  PanelRoute,
  PanelInfo,
  DashboardSummary,
  MeterSummary,
  VersionResponse
} from './types'

import './components/consumption-view'
import './components/cost-view'
import './components/meter-view'

import sharedStyles from './styles/shared.css'
import panelStyles from './styles/panel.css'

class EonNextPanel extends LitElement {
  static styles = [sharedStyles, panelStyles]

  @property({ attribute: false }) hass!: HomeAssistant
  @property({ type: Boolean }) narrow!: boolean
  @property({ attribute: false }) route!: PanelRoute
  @property({ attribute: false }) panel!: PanelInfo

  private _version = new WsDataController<VersionResponse>(this, (h) => getVersion(h))
  private _summary = new WsDataController<DashboardSummary>(this, (h) =>
    getDashboardSummary(h)
  )

  render() {
    if (this._summary.loading) {
      return html`<div class="loading">Loading EON Next data…</div>`
    }

    if (this._summary.error) {
      return html`<div class="error">Error: ${this._summary.error}</div>`
    }

    const { data } = this._summary
    const version = this._version.data?.version

    return html`
      <div class="header">
        <h1>EON Next Energy</h1>
        ${version ? html`<span class="version-badge">v${version}</span>` : nothing}
      </div>

      <div class="grid">
        ${data?.meters.map((m) => this._renderMeterCard(m)) ?? nothing}
        ${data?.ev_chargers.map(renderEvCard) ?? nothing}
      </div>

      ${!data?.meters.length && !data?.ev_chargers.length
        ? html`<div class="empty">
            No meter or EV data available. Check your integration configuration.
          </div>`
        : nothing}
    `
  }

  private _renderMeterCard(meter: MeterSummary) {
    const icon = meter.type === 'gas' ? 'mdi:fire' : 'mdi:flash'
    const label = meter.type === 'gas' ? 'Gas' : 'Electricity'

    return html`
      <div class="card">
        <h2>
          <ha-icon .icon=${icon} style="--mdc-icon-size: 20px;"></ha-icon>
          ${label} — ${meter.serial}
        </h2>

        <eon-consumption-view .hass=${this.hass} .meter=${meter}></eon-consumption-view>

        <div class="card-divider"></div>

        <eon-cost-view .meter=${meter}></eon-cost-view>

        <div class="card-divider"></div>

        <eon-meter-view .meter=${meter}></eon-meter-view>
      </div>
    `
  }
}

customElements.define('eon-next-panel', EonNextPanel)
