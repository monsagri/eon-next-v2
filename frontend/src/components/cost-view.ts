import { LitElement, html, nothing } from 'lit'
import { property } from 'lit/decorators.js'
import type { MeterSummary } from '../types'

import sharedStyles from '../styles/shared.css'
import styles from '../styles/cost-view.css'

class EonCostView extends LitElement {
  static styles = [sharedStyles, styles]

  @property({ attribute: false }) meter!: MeterSummary

  render() {
    const todayCost = this._computeTodayCost()

    return html`
      <div class="cost-grid">
        ${todayCost != null
          ? html`<div class="stat">
              <span class="stat-value">£${todayCost.toFixed(2)}</span>
              <span class="stat-label">Today (est)</span>
            </div>`
          : nothing}
        ${this.meter?.previous_day_cost != null
          ? html`<div class="stat">
              <span class="stat-value">£${this.meter.previous_day_cost.toFixed(2)}</span>
              <span class="stat-label">Yesterday</span>
            </div>`
          : nothing}
        ${this.meter?.standing_charge != null
          ? html`<div class="stat">
              <span class="stat-value">£${this.meter.standing_charge.toFixed(2)}</span>
              <span class="stat-label">Standing/day</span>
            </div>`
          : nothing}
        ${this.meter?.unit_rate != null
          ? html`<div class="stat">
              <span class="stat-value">£${this.meter.unit_rate.toFixed(4)}</span>
              <span class="stat-label">Unit rate/kWh</span>
            </div>`
          : nothing}
      </div>
    `
  }

  private _computeTodayCost(): number | null {
    if (this.meter?.daily_consumption == null || this.meter?.unit_rate == null) {
      return null
    }
    return (
      this.meter.daily_consumption * this.meter.unit_rate +
      (this.meter.standing_charge ?? 0)
    )
  }
}

if (!customElements.get('eon-cost-view')) {
  customElements.define('eon-cost-view', EonCostView)
}
