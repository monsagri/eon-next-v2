import { LitElement, html, nothing } from 'lit'
import { property, state } from 'lit/decorators.js'
import { getEvSchedule } from '../api'
import type { HomeAssistant, EvScheduleResponse, EvScheduleSlot } from '../types'
import { formatDateTimeRange } from '../utils/date'

import sharedStyles from '../styles/shared.css'
import styles from '../styles/ev-schedule-view.css'

class EonEvScheduleView extends LitElement {
  static styles = [sharedStyles, styles]

  @property({ attribute: false }) hass!: HomeAssistant
  @property() deviceId = ''

  @state() private _data: EvScheduleResponse | null = null
  @state() private _loading = true
  @state() private _error: string | null = null

  private _fetchedDeviceId: string | null = null

  updated() {
    if (this.hass && this.deviceId && this.deviceId !== this._fetchedDeviceId) {
      this._fetchSchedule()
    }
  }

  private async _fetchSchedule() {
    this._fetchedDeviceId = this.deviceId
    this._loading = true
    this._error = null
    try {
      this._data = await getEvSchedule(this.hass, this.deviceId)
    } catch (err) {
      this._error = err instanceof Error ? err.message : String(err)
      this._data = null
    }
    this._loading = false
  }

  render() {
    if (this._loading) {
      return html`<div class="empty-schedule">Loading EV schedule…</div>`
    }

    if (this._error) {
      return html`<div class="empty-schedule">Unable to load schedule</div>`
    }

    if (!this._data) {
      return html`<div class="empty-schedule">No schedule data</div>`
    }

    const { status, slots } = this._data

    return html`
      <div class="schedule-header">
        <span>Schedule</span>
        <span class="status-badge ${status === 'scheduled' ? 'scheduled' : 'idle'}">
          ${status === 'scheduled' ? 'Active' : 'Idle'}
        </span>
      </div>

      ${slots.length > 0
        ? html`<div class="timeline">
            ${slots.map((slot, i) => this._renderSlot(slot, i))}
          </div>`
        : html`<div class="empty-schedule">No upcoming charge slots</div>`}
    `
  }

  private _renderSlot(slot: EvScheduleSlot, index: number) {
    const duration = this._computeDuration(slot.start, slot.end)

    return html`
      <div class="slot">
        <span class="slot-index">#${index + 1}</span>
        <div class="slot-times">
          <span class="slot-range"> ${formatDateTimeRange(slot.start, slot.end)} </span>
          ${duration ? html`<span class="slot-duration">${duration}</span>` : nothing}
        </div>
      </div>
    `
  }

  private _computeDuration(start: string, end: string): string | null {
    try {
      const s = new Date(start)
      const e = new Date(end)
      const mins = Math.round((e.getTime() - s.getTime()) / 60000)
      if (mins <= 0 || !isFinite(mins)) return null
      const hours = Math.floor(mins / 60)
      const remainder = mins % 60
      if (hours > 0 && remainder > 0) return `${hours}h ${remainder}m`
      if (hours > 0) return `${hours}h`
      return `${remainder}m`
    } catch {
      return null
    }
  }
}

if (!customElements.get('eon-ev-schedule-view')) {
  customElements.define('eon-ev-schedule-view', EonEvScheduleView)
}
