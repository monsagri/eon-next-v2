import { LitElement, html, nothing } from 'lit'
import { property } from 'lit/decorators.js'
import { getBackfillStatus } from '../api'
import { WsDataController } from '../controllers/ws-data-controller'
import type { HomeAssistant, BackfillStatusResponse } from '../types'

import sharedStyles from '../styles/shared.css'
import styles from '../styles/backfill-status.css'

class EonBackfillStatus extends LitElement {
  static styles = [sharedStyles, styles]

  @property({ attribute: false }) hass!: HomeAssistant

  private _data = new WsDataController<BackfillStatusResponse>(this, (h) =>
    getBackfillStatus(h)
  )

  render() {
    if (this._data.loading) {
      return html`
        <div class="backfill-header">
          <ha-icon icon="mdi:database-clock" style="--mdc-icon-size: 18px;"></ha-icon>
          Historical Backfill
        </div>
        <div class="disabled-notice">Loading status…</div>
      `
    }

    if (this._data.error) {
      return html`
        <div class="backfill-header">
          <ha-icon icon="mdi:database-clock" style="--mdc-icon-size: 18px;"></ha-icon>
          Historical Backfill
        </div>
        <div class="disabled-notice">Failed to load backfill status.</div>
      `
    }

    const status = this._data.data
    if (!status) {
      return html`
        <div class="backfill-header">
          <ha-icon icon="mdi:database-clock" style="--mdc-icon-size: 18px;"></ha-icon>
          Historical Backfill
        </div>
        <div class="disabled-notice">No backfill status available.</div>
      `
    }

    if (!status.enabled) {
      return html`
        <div class="backfill-header">
          <ha-icon icon="mdi:database-clock" style="--mdc-icon-size: 18px;"></ha-icon>
          Historical Backfill
        </div>
        <div class="disabled-notice">
          Backfill is disabled. Enable it in the integration options.
        </div>
      `
    }

    const pct =
      status.total_meters > 0
        ? Math.round((status.completed_meters / status.total_meters) * 100)
        : 0

    return html`
      <div class="backfill-header">
        <ha-icon icon="mdi:database-clock" style="--mdc-icon-size: 18px;"></ha-icon>
        Historical Backfill
        <span class="state-badge ${status.state}">${status.state}</span>
      </div>

      <div class="status-row">
        <span class="label">Progress</span>
        <span class="value"
          >${status.completed_meters} / ${status.total_meters} meters (${pct}%)</span
        >
      </div>

      <div class="progress-bar">
        <div class="progress-bar-fill" style="width: ${pct}%"></div>
      </div>

      ${status.lookback_days > 0
        ? html`<div class="status-row">
            <span class="label">Lookback</span>
            <span class="value">${status.lookback_days} days</span>
          </div>`
        : nothing}
      ${status.next_start_date
        ? html`<div class="status-row">
            <span class="label">Next backfill from</span>
            <span class="value">${status.next_start_date}</span>
          </div>`
        : nothing}
      ${status.meters.length > 0
        ? html`<div class="meter-list">
            ${status.meters.map(
              (m) => html`
                <div class="meter-item">
                  <span class="meter-serial">${m.serial}</span>
                  ${m.done
                    ? html`<span class="meter-done">Complete</span>`
                    : html`<span class="meter-pending"
                        >${m.days_completed}/${m.days_completed + m.days_remaining}
                        days</span
                      >`}
                </div>
              `
            )}
          </div>`
        : nothing}
    `
  }
}

if (!customElements.get('eon-backfill-status')) {
  customElements.define('eon-backfill-status', EonBackfillStatus)
}
