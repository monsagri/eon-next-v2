import { LitElement, html, nothing } from 'lit'
import { property } from 'lit/decorators.js'
import { getVersion, getDashboardSummary } from './api'
import { WsDataController } from './controllers/ws-data-controller'
import type {
  HomeAssistant,
  PanelRoute,
  PanelInfo,
  DashboardSummary,
  MeterSummary,
  EvChargerSummary,
  VersionResponse
} from './types'

import './components/consumption-view'
import './components/consumption-breakdown-view'
import './components/cost-view'
import './components/meter-view'
import './components/ev-schedule-view'
import './components/backfill-status'
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
      return html`
        <div class="loading" role="status" aria-label="Loading energy data">
          <div class="skeleton-grid">
            <div class="skeleton-card"></div>
            <div class="skeleton-card"></div>
          </div>
        </div>
      `
    }

    if (this._summary.error) {
      return html`
        <div class="error-state" role="alert">
          <ha-icon icon="mdi:alert-circle" style="--mdc-icon-size: 48px;"></ha-icon>
          <h2>Unable to load data</h2>
          <p>${this._summary.error}</p>
        </div>
      `
    }

    const { data } = this._summary
    const version = this._version.data?.version

    return html`
      <div class="header">
        <h1>EON Next Energy</h1>
        ${version ? html`<span class="version-badge">v${version}</span>` : nothing}
      </div>

      ${!data?.meters.length && !data?.ev_chargers.length
        ? html`<div class="empty-state">
            <ha-icon
              icon="mdi:lightning-bolt-circle"
              style="--mdc-icon-size: 48px;"
            ></ha-icon>
            <h2>No data available</h2>
            <p>No meter or EV data found. Check your integration configuration.</p>
          </div>`
        : html`
            <div class="grid">
              ${data?.meters.map((m) => this._renderMeterCard(m)) ?? nothing}
              ${data?.ev_chargers.map((ev) => this._renderEvCard(ev)) ?? nothing}
            </div>

            <div class="section-divider"></div>

            <div class="diagnostics">
              <eon-backfill-status .hass=${this.hass}></eon-backfill-status>
            </div>
          `}
    `
  }

  private _renderMeterCard(meter: MeterSummary) {
    const icon = meter.type === 'gas' ? 'mdi:fire' : 'mdi:flash'
    const label = meter.type === 'gas' ? 'Gas' : 'Electricity'

    return html`
      <article class="card" aria-label="${label} meter ${meter.serial}">
        <h2>
          <ha-icon .icon=${icon} style="--mdc-icon-size: 20px;"></ha-icon>
          ${label} — ${meter.serial}
        </h2>

        <eon-consumption-view .hass=${this.hass} .meter=${meter}></eon-consumption-view>

        <div class="card-divider"></div>

        <eon-cost-view .hass=${this.hass} .meter=${meter}></eon-cost-view>

        <div class="card-divider"></div>

        <eon-consumption-breakdown-view
          .hass=${this.hass}
          .meter=${meter}
        ></eon-consumption-breakdown-view>

        <div class="card-divider"></div>

        <eon-meter-view .meter=${meter}></eon-meter-view>
      </article>
    `
  }

  private _renderEvCard(ev: EvChargerSummary) {
    return html`
      <article class="card" aria-label="EV charger ${ev.serial}">
        <h2>
          <ha-icon icon="mdi:ev-station" style="--mdc-icon-size: 20px;"></ha-icon>
          EV Charger — ${ev.serial}
        </h2>

        <eon-ev-schedule-view
          .hass=${this.hass}
          .deviceId=${ev.device_id ?? ''}
        ></eon-ev-schedule-view>
      </article>
    `
  }
}

customElements.define('eon-next-panel', EonNextPanel)
