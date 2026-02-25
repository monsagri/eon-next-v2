import { html, nothing } from 'lit'
import type { MeterSummary } from '../types'

/** Render a compact meter summary row (used by the summary card). */
export const renderMeterSummary = (
  meter: MeterSummary,
  label: string,
  icon: string,
  showCosts: boolean
) => {
  const todayCost =
    meter.daily_consumption != null && meter.unit_rate != null
      ? meter.daily_consumption * meter.unit_rate + (meter.standing_charge ?? 0)
      : null

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
    </div>
  `
}
