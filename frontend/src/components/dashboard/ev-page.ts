import { LitElement, html } from 'lit'
import { property, state } from 'lit/decorators.js'
import type { PropertyValues } from 'lit'
import { getEvSchedule } from '../../api'
import type { EvScheduleResponse, EvScheduleSlot } from '../../api'
import type { HomeAssistant } from '../../types'
import type { HalfHourBar } from './halfhour-strip'
import './halfhour-strip'

import tokens from '../../styles/dashboard-tokens.css'
import shared from '../../styles/dashboard-shared.css'
import styles from '../../styles/ev-page.css'

/** Smart-charging status and schedule for an EV charger. */
class EonEvPage extends LitElement {
  static styles = [tokens, shared, styles]

  @property({ attribute: false }) hass!: HomeAssistant
  @property() deviceId = ''
  @property({ type: Number }) refreshToken = 0

  @state() private _data: EvScheduleResponse | null = null
  @state() private _loading = true
  @state() private _error = false

  private _fetchedDeviceId: string | null = null
  private _fetchedToken = -1

  updated(_changed: PropertyValues) {
    if (!this.hass || !this.deviceId) return
    if (
      this.deviceId !== this._fetchedDeviceId ||
      this.refreshToken !== this._fetchedToken
    ) {
      this._fetch()
    }
  }

  private async _fetch() {
    this._fetchedDeviceId = this.deviceId
    this._fetchedToken = this.refreshToken
    this._loading = true
    this._error = false
    try {
      this._data = await getEvSchedule(this.hass, this.deviceId)
    } catch {
      this._error = true
      this._data = null
    }
    this._loading = false
  }

  render() {
    if (!this.deviceId) {
      return html`<div class="placeholder">No EV charger available.</div>`
    }
    if (this._loading && !this._data) {
      return html`<div class="placeholder">Loading EV schedule…</div>`
    }
    if (this._error || !this._data) {
      return html`<div class="placeholder">Unable to load EV schedule.</div>`
    }

    const { status, slots } = this._data
    const active = status === 'scheduled' || status === 'active'

    return html`
      <div class="page">
        ${this._renderBanner(active)} ${this._renderChargeCards(slots)}
        ${this._renderSchedule(slots)}
      </div>
    `
  }

  private _renderBanner(active: boolean) {
    return html`
      <div class="card card--dark ev-banner">
        <div class="ev-tile">
          <ha-icon icon="mdi:ev-station" style="--mdc-icon-size:26px"></ha-icon>
        </div>
        <div class="ev-banner-text">
          <div class="serif ev-banner-title">
            ${active ? 'Smart charging active' : 'Charging idle'}
          </div>
          <div class="ev-banner-desc">
            ${
              active
                ? 'Schedule optimised for the cheapest overnight slots'
                : 'No charge scheduled — plug in to schedule a cheap overnight charge'
            }
          </div>
        </div>
        <span class="pill ${active ? 'pill--ready' : 'pill--dark'}">
          ${active ? 'Ready' : 'Idle'}
        </span>
      </div>
    `
  }

  private _renderChargeCards(slots: EvScheduleSlot[]) {
    const locale = this.hass?.language ?? 'en'
    return html`
      <div class="grid-2">
        ${this._chargeCard('Next charge', slots[0], locale)}
        ${this._chargeCard('Following charge', slots[1], locale)}
      </div>
    `
  }

  private _chargeCard(label: string, slot: EvScheduleSlot | undefined, locale: string) {
    if (!slot) {
      return html`<div class="card card--stat charge-card">
        <div class="muted charge-label">${label}</div>
        <div class="serif charge-value charge-value--empty">Not scheduled</div>
      </div>`
    }
    const start = new Date(slot.start)
    const end = new Date(slot.end)
    const window = `${timeOfDay(start)} → ${timeOfDay(end)}`
    const hours = durationHours(start, end)
    const desc = `${relativeDay(start, locale)} · ${hours}`

    return html`
      <div class="card card--stat charge-card">
        <div class="muted charge-label">${label}</div>
        <div class="serif charge-value">${window}</div>
        <div class="charge-desc">${desc}</div>
      </div>
    `
  }

  private _renderSchedule(slots: EvScheduleSlot[]) {
    const bars = buildScheduleBars(slots)
    return html`
      <div class="card schedule-card">
        <div class="schedule-title">Charging schedule</div>
        <eon-halfhour-strip
          .bars=${bars}
          .height=${56}
          .axis=${['18:00', '00:00', '06:00', '12:00']}
          ariaLabel="Charging schedule by half-hour"
        ></eon-halfhour-strip>
        <div class="legend schedule-legend">
          <span class="legend-item">
            <span class="legend-swatch" style="background:var(--eon-green)"></span>
            Charging (off-peak)
          </span>
          <span class="legend-item">
            <span class="legend-swatch" style="background:var(--eon-hairline)"></span>Idle
          </span>
        </div>
      </div>
    `
  }
}

/**
 * Build 48 half-hour bars over a 24-hour window starting at 18:00 today.
 * A slot is "charging" (tall green) when it overlaps a scheduled charge.
 */
function buildScheduleBars(slots: EvScheduleSlot[]): HalfHourBar[] {
  const windowStart = new Date()
  windowStart.setHours(18, 0, 0, 0)
  const ranges = slots
    .map((s) => [new Date(s.start).getTime(), new Date(s.end).getTime()] as const)
    .filter(([a, b]) => Number.isFinite(a) && Number.isFinite(b) && b > a)

  const bars: HalfHourBar[] = []
  for (let i = 0; i < 48; i++) {
    const slotStart = windowStart.getTime() + i * 30 * 60000
    const slotEnd = slotStart + 30 * 60000
    const charging = ranges.some(([a, b]) => a < slotEnd && b > slotStart)
    bars.push({
      heightPct: charging ? 90 : 18,
      color: charging ? 'var(--eon-green)' : 'var(--eon-hairline)'
    })
  }
  return bars
}

function timeOfDay(d: Date): string {
  if (isNaN(d.getTime())) return '—'
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function durationHours(start: Date, end: Date): string {
  const mins = Math.round((end.getTime() - start.getTime()) / 60000)
  if (!Number.isFinite(mins) || mins <= 0) return 'scheduled'
  const h = Math.floor(mins / 60)
  const m = mins % 60
  const hrs = m === 0 ? `${h} hr` : `${(mins / 60).toFixed(1)} hr`
  return `${hrs} window`
}

function relativeDay(d: Date, locale: string): string {
  if (isNaN(d.getTime())) return ''
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfSlot = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const diffDays = Math.round((startOfSlot.getTime() - startOfToday.getTime()) / 86400000)
  if (diffDays <= 0) return d.getHours() >= 18 || d.getHours() < 6 ? 'Tonight' : 'Today'
  if (diffDays === 1) return 'Tomorrow'
  return d.toLocaleDateString(locale, { weekday: 'short' })
}

if (!customElements.get('eon-ev-page')) {
  customElements.define('eon-ev-page', EonEvPage)
}

export { EonEvPage }
