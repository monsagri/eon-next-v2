import { html, nothing } from 'lit'
import type { MeterSummary } from '../types'

/** Render a full meter card (used by the panel grid). */
export const renderMeterCard = (meter: MeterSummary) => {
  const icon = meter.type === 'gas' ? 'mdi:fire' : 'mdi:flash'
  const label = meter.type === 'gas' ? 'Gas' : 'Electricity'

  return html`
    <div class="card">
      <h2>
        <ha-icon .icon=${icon} style="--mdc-icon-size: 20px;"></ha-icon>
        ${label} — ${meter.serial}
      </h2>

      ${meter.daily_consumption != null
        ? html`<div class="meter-row">
            <span class="label">Today's consumption</span>
            <span class="value"
              >${meter.daily_consumption}<span class="unit">kWh</span></span
            >
          </div>`
        : nothing}
      ${meter.latest_reading != null
        ? html`<div class="meter-row">
            <span class="label">Latest reading</span>
            <span class="value">${meter.latest_reading}</span>
          </div>`
        : nothing}
      ${meter.latest_reading_date
        ? html`<div class="meter-row">
            <span class="label">Reading date</span>
            <span>${meter.latest_reading_date}</span>
          </div>`
        : nothing}
      ${meter.standing_charge != null
        ? html`<div class="meter-row">
            <span class="label">Standing charge</span>
            <span class="value"
              >£${meter.standing_charge.toFixed(2)}<span class="unit">/day</span></span
            >
          </div>`
        : nothing}
      ${meter.previous_day_cost != null
        ? html`<div class="meter-row">
            <span class="label">Yesterday's cost</span>
            <span class="value">£${meter.previous_day_cost.toFixed(2)}</span>
          </div>`
        : nothing}
      ${meter.unit_rate != null
        ? html`<div class="meter-row">
            <span class="label">Unit rate</span>
            <span class="value"
              >£${meter.unit_rate.toFixed(4)}<span class="unit">/kWh</span></span
            >
          </div>`
        : nothing}
      ${meter.tariff_name
        ? html`<div class="meter-row">
            <span class="label">Tariff</span>
            <span>${meter.tariff_name}</span>
          </div>`
        : nothing}
    </div>
  `
}
