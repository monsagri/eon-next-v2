import { LitElement, html, nothing } from 'lit'
import { property } from 'lit/decorators.js'
import type { MeterSummary } from '../types'

import sharedStyles from '../styles/shared.css'
import styles from '../styles/meter-view.css'

class EonMeterView extends LitElement {
  static styles = [sharedStyles, styles]

  @property({ attribute: false }) meter!: MeterSummary

  render() {
    return html`
      <div class="reading-grid">
        ${this.meter?.latest_reading != null
          ? html`<div class="reading">
              <span class="reading-value">${this.meter.latest_reading}</span>
              <span class="reading-label">Latest reading</span>
            </div>`
          : nothing}
        ${this.meter?.latest_reading_date
          ? html`<div class="detail">
              <span class="detail-label">Date</span>
              <span>${this.meter.latest_reading_date}</span>
            </div>`
          : nothing}
        ${this.meter?.tariff_name
          ? html`<div class="detail">
              <span class="detail-label">Tariff</span>
              <span>${this.meter.tariff_name}</span>
            </div>`
          : nothing}
      </div>
    `
  }
}

if (!customElements.get('eon-meter-view')) {
  customElements.define('eon-meter-view', EonMeterView)
}
