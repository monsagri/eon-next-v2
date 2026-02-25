import { html, nothing } from 'lit'
import type { EvChargerSummary } from '../types'

/** Render an EV charger card (used by the panel grid). */
export const renderEvCard = (ev: EvChargerSummary) => html`
  <div class="card">
    <h2>
      <ha-icon icon="mdi:ev-station" style="--mdc-icon-size: 20px;"></ha-icon>
      EV Charger — ${ev.serial}
    </h2>

    <div class="meter-row">
      <span class="label">Schedule</span>
      <span class="value">${ev.schedule_slots > 0 ? 'Active' : 'No schedule'}</span>
    </div>

    ${ev.next_charge_start
      ? html`<div class="meter-row">
          <span class="label">Next charge</span>
          <span>${ev.next_charge_start} → ${ev.next_charge_end}</span>
        </div>`
      : nothing}
  </div>
`
