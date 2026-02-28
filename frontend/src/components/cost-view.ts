import { LitElement, html, nothing } from 'lit'
import { property, state } from 'lit/decorators.js'
import { getConsumptionHistory } from '../api'
import type { HomeAssistant, MeterSummary } from '../types'
import type { ConsumptionHistoryEntry } from '../api'

import sharedStyles from '../styles/shared.css'
import styles from '../styles/cost-view.css'

class EonCostView extends LitElement {
  static styles = [sharedStyles, styles]

  @property({ attribute: false }) hass!: HomeAssistant
  @property({ attribute: false }) meter!: MeterSummary

  @state() private _mtdCost: number | null = null

  private _fetchedSerial: string | null = null

  updated() {
    if (
      this.hass &&
      this.meter?.serial &&
      this.meter.serial !== this._fetchedSerial &&
      this.meter.unit_rate != null
    ) {
      this._fetchMtdCost()
    }
  }

  private async _fetchMtdCost() {
    this._fetchedSerial = this.meter.serial
    const now = new Date()
    const dayOfMonth = now.getDate()
    if (dayOfMonth < 2 || this.meter.unit_rate == null) {
      this._mtdCost = null
      return
    }
    try {
      const resp = await getConsumptionHistory(this.hass, this.meter.serial!, dayOfMonth)
      this._mtdCost = this._computeMtdFromHistory(resp.entries)
    } catch {
      this._mtdCost = null
    }
  }

  private _computeMtdFromHistory(entries: ConsumptionHistoryEntry[]): number | null {
    if (!entries.length || this.meter.unit_rate == null) return null

    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth()
    const rate = this.meter.unit_rate
    const standing = this.meter.standing_charge ?? 0

    let total = 0
    let daysInMonth = 0
    for (const entry of entries) {
      const d = new Date(entry.date + 'T00:00:00')
      if (d.getFullYear() === year && d.getMonth() === month) {
        total += entry.consumption * rate + standing
        daysInMonth++
      }
    }
    return daysInMonth > 0 ? Math.round(total * 100) / 100 : null
  }

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
        ${this._mtdCost != null
          ? html`<div class="stat">
              <span class="stat-value">£${this._mtdCost.toFixed(2)}</span>
              <span class="stat-label">Month to date</span>
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
