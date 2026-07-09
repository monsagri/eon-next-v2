import { LitElement, html, nothing } from 'lit'
import { property, state } from 'lit/decorators.js'
import { getBackfillStatus, getConsumptionHistory } from '../../api'
import type { BackfillStatusResponse, ConsumptionHistoryEntry } from '../../api'
import { WsDataController } from '../../controllers/ws-data-controller'
import type { DashboardSummary, HomeAssistant, MeterSummary } from '../../types'
import {
  FUEL,
  type FuelKind,
  type MonthSplit,
  type StackedBar,
  computeMonthCost,
  computeMonthSplit,
  findMeter,
  formatPence,
  formatPounds,
  formatRatePounds,
  formatShortDate,
  greeting,
  isTimeOfUse,
  projectMonth,
  round2,
  toStackedBars
} from '../../utils/dashboard-data'
import type { DashboardPage } from './pages'
import './stacked-bar-chart'

import tokens from '../../styles/dashboard-tokens.css'
import shared from '../../styles/dashboard-shared.css'
import styles from '../../styles/overview-page.css'

/** At-a-glance monthly spend, fuel split, tariff and meter health. */
class EonOverviewPage extends LitElement {
  static styles = [tokens, shared, styles]

  @property({ attribute: false }) hass!: HomeAssistant
  @property({ attribute: false }) summary: DashboardSummary | null = null
  @property({ type: Number }) refreshToken = 0

  @property({ type: Boolean }) showProjection = true
  @property({ type: Boolean }) showStandingCallout = true
  @property({ type: Boolean }) showMeterHealth = true

  @state() private _history: Record<string, ConsumptionHistoryEntry[]> = {}

  private _backfill = new WsDataController<BackfillStatusResponse>(this, (h) =>
    getBackfillStatus(h)
  )

  private _fetchedToken = -1
  private _fetching = new Set<string>()

  updated() {
    if (!this.hass || !this.summary) return
    if (this.refreshToken !== this._fetchedToken) {
      this._fetchedToken = this.refreshToken
      this._history = {}
      this._fetching.clear()
    }
    const dayOfMonth = new Date().getDate()
    // Enough to cover this month + all of last month for the "vs last month" pill.
    const days = Math.min(62, dayOfMonth + 31)
    for (const meter of this.summary.meters) {
      const serial = meter.serial
      if (!serial || this._history[serial] || this._fetching.has(serial)) continue
      this._fetch(serial, days)
    }
  }

  private async _fetch(serial: string, days: number) {
    this._fetching.add(serial)
    try {
      const resp = await getConsumptionHistory(this.hass, serial, days)
      this._history = { ...this._history, [serial]: resp.entries }
    } catch {
      this._history = { ...this._history, [serial]: [] }
    } finally {
      this._fetching.delete(serial)
    }
  }

  private _split(meter: MeterSummary | null): MonthSplit {
    if (!meter?.serial) return { usage: 0, standing: 0, total: 0, days: 0 }
    return computeMonthSplit(
      this._history[meter.serial] ?? [],
      meter.unit_rate,
      meter.standing_charge,
      new Date()
    )
  }

  private _nav(page: DashboardPage) {
    this.dispatchEvent(
      new CustomEvent('navigate', { detail: { page }, bubbles: true, composed: true })
    )
  }

  render() {
    if (!this.summary) return html`<div class="placeholder">Loading…</div>`

    const now = new Date()
    const locale = this.hass?.language ?? 'en'
    const elec = findMeter(this.summary, 'electricity')
    const gas = findMeter(this.summary, 'gas')
    const elecSplit = this._split(elec)
    const gasSplit = this._split(gas)

    const usage = round2(elecSplit.usage + gasSplit.usage)
    const standing = round2(elecSplit.standing + gasSplit.standing)
    const total = round2(usage + standing)
    const monthName = now.toLocaleDateString(locale, { month: 'long' })
    const daysIn = Math.max(elecSplit.days, gasSplit.days, now.getDate())
    const perDay = daysIn > 0 ? round2(total / daysIn) : 0

    return html`
      <div class="page">
        <div class="greeting">
          ${greeting(now)} ·
          ${now.toLocaleDateString(locale, {
            weekday: 'long',
            day: 'numeric',
            month: 'long'
          })}
        </div>

        ${this._renderHero(monthName, total, usage, standing, daysIn, perDay)}
        ${this._renderFuelCards(elec, elecSplit, gas, gasSplit)}
        ${this._renderTariffAndHealth(elec, gas)}
      </div>
    `
  }

  private _renderHero(
    monthName: string,
    total: number,
    usage: number,
    standing: number,
    daysIn: number,
    perDay: number
  ) {
    const usagePct = total > 0 ? (usage / total) * 100 : 0
    const standPct = total > 0 ? (standing / total) * 100 : 0
    const standShare = total > 0 ? standing / total : 0

    return html`
      <div class="card hero">
        <div class="hero-top">
          <div>
            <div class="muted hero-label">
              Spent so far in ${monthName} · gas + electricity
            </div>
            <div class="serif hero-total">${formatPounds(total)}</div>
            <div class="hero-sub">
              ${daysIn} day${daysIn === 1 ? '' : 's'} in · about
              <b>${formatPounds(perDay)}</b> a day
            </div>
          </div>
          ${this._renderProjection(total)}
        </div>

        <div class="hero-split">
          <div class="split-bar" role="img" aria-label="Usage versus standing charge">
            <div
              class="split-seg"
              style="width:${usagePct}%;background:var(--eon-elec)"
            ></div>
            <div
              class="split-seg"
              style="width:${standPct}%;background:var(--eon-elec-standing)"
            ></div>
          </div>
          <div class="legend split-legend">
            <span class="legend-item">
              <span class="legend-swatch" style="background:var(--eon-elec)"></span>
              Energy used <b class="split-val">${formatPounds(usage)}</b>
            </span>
            <span class="legend-item">
              <span
                class="legend-swatch"
                style="background:var(--eon-elec-standing)"
              ></span>
              Standing charge <b class="split-val">${formatPounds(standing)}</b>
            </span>
          </div>
          ${
            this.showStandingCallout && standShare >= 0.4 && standing > 0
              ? html`<div class="callout hero-callout">
                  ${standShare >= 0.5 ? 'Over half' : 'A large part'} of this month's bill
                  —
                  <b>${formatPounds(standing)}</b> — is the fixed daily standing charge
                  you pay before using anything.
                </div>`
              : nothing
          }
        </div>
      </div>
    `
  }

  private _renderProjection(total: number) {
    if (!this.showProjection) return nothing
    const now = new Date()
    const projection = projectMonth(total, now)

    // Previous-month comparison, only when every meter has last-month data.
    const meters = this.summary?.meters ?? []
    let prevTotal = 0
    let havePrev = meters.length > 0
    for (const m of meters) {
      const entries = m.serial ? (this._history[m.serial] ?? null) : null
      const prevMonth = entries
        ? computeMonthCost(entries, m.unit_rate, m.standing_charge, now).previousMonth
        : null
      if (prevMonth == null) {
        havePrev = false
        break
      }
      prevTotal += prevMonth
    }

    const delta = havePrev ? round2(projection - round2(prevTotal)) : null

    return html`
      <div class="projection">
        <div class="muted proj-label">On track for</div>
        <div class="serif proj-value">~${formatPounds(projection)}</div>
        ${
          delta != null
            ? html`<span class="pill pill--green proj-pill">
                ${delta <= 0 ? '▼' : '▲'} ${formatPounds(Math.abs(delta))} vs last month
              </span>`
            : nothing
        }
      </div>
    `
  }

  private _renderFuelCards(
    elec: MeterSummary | null,
    elecSplit: MonthSplit,
    gas: MeterSummary | null,
    gasSplit: MonthSplit
  ) {
    return html`
      <div class="grid-2">
        ${this._renderFuelCard('electricity', elec, elecSplit)}
        ${this._renderFuelCard('gas', gas, gasSplit)}
      </div>
    `
  }

  private _renderFuelCard(kind: FuelKind, meter: MeterSummary | null, split: MonthSplit) {
    const fuel = FUEL[kind]
    if (!meter) {
      return html`<div class="card fuel-card">
        <div class="muted">No ${fuel.label.toLowerCase()} meter.</div>
      </div>`
    }
    const bars: StackedBar[] = toStackedBars(
      (meter.serial ? (this._history[meter.serial] ?? []) : []).slice(-7),
      meter.unit_rate,
      meter.standing_charge,
      7,
      this.hass?.language ?? 'en'
    )

    return html`
      <button
        class="card fuel-card card--clickable"
        @click=${() => this._nav(kind === 'gas' ? 'gas' : 'elec')}
      >
        <div class="fuel-head">
          <div class="fuel-name">
            <span class="tile ${fuel.tileClass}">
              <ha-icon .icon=${fuel.icon} style="--mdc-icon-size:16px"></ha-icon>
            </span>
            <div>
              <div class="fuel-label">${fuel.label}</div>
              <div class="mono fuel-serial">${meter.serial ?? '—'}</div>
            </div>
          </div>
          <div class="serif fuel-cost">${formatPounds(split.total)}</div>
        </div>
        ${
          bars.length
            ? html`<eon-stacked-bar-chart
                class="fuel-chart"
                .bars=${bars}
                usageColor=${fuel.usageColor}
                standColor=${fuel.standColor}
                .height=${88}
                .maxBarWidth=${13}
                .showLabels=${false}
              ></eon-stacked-bar-chart>`
            : html`<div class="fuel-chart-empty"></div>`
        }
        <div class="fuel-foot muted">
          <span>${formatPence(meter.unit_rate)} /kWh</span>
          <span>${formatPence(meter.standing_charge, 0)} /day standing</span>
        </div>
      </button>
    `
  }

  private _renderTariffAndHealth(elec: MeterSummary | null, gas: MeterSummary | null) {
    return html`
      <div class="tariff-health">
        ${this._renderTariffCard(elec, gas)}
        ${this.showMeterHealth ? this._renderHealthCard(elec ?? gas) : nothing}
      </div>
    `
  }

  private _renderTariffCard(elec: MeterSummary | null, gas: MeterSummary | null) {
    const tariffName = elec?.tariff_name ?? gas?.tariff_name ?? 'Tariff unavailable'
    const tou =
      isTimeOfUse(this.hass, elec?.serial ?? null) ||
      isTimeOfUse(this.hass, gas?.serial ?? null)

    return html`
      <button
        class="card card--dark tariff-card card--clickable"
        @click=${() => this._nav('tariff')}
      >
        <div class="tariff-head">
          <div>
            <div class="eyebrow">Your tariff</div>
            <div class="serif tariff-name">${tariffName}</div>
          </div>
          <span class="pill pill--dark">${tou ? 'Time-of-use' : 'Flat rate'}</span>
        </div>
        <div class="tariff-stats">
          <div>
            <div class="tariff-stat-value">${formatRatePounds(elec?.unit_rate)}</div>
            <div class="tariff-stat-label">Electricity /kWh</div>
          </div>
          <div>
            <div class="tariff-stat-value">${formatRatePounds(gas?.unit_rate)}</div>
            <div class="tariff-stat-label">Gas /kWh</div>
          </div>
          <div class="tariff-note">
            <div class="accent">
              ${tou ? 'Off-peak window available' : 'No cheaper window today'}
            </div>
            <div class="tariff-stat-label">
              ${tou ? 'shift usage to save' : 'same price around the clock'}
            </div>
          </div>
        </div>
      </button>
    `
  }

  private _renderHealthCard(meter: MeterSummary | null) {
    const locale = this.hass?.language ?? 'en'
    const backfill = this._backfill.data
    const pct =
      backfill && backfill.total_meters > 0
        ? Math.round((backfill.completed_meters / backfill.total_meters) * 100)
        : backfill?.enabled === false
          ? 0
          : 100
    const meterCount = this.summary?.meters.length ?? 0
    const reading =
      meter?.latest_reading != null
        ? `${meter.latest_reading.toLocaleString(locale)} · ${formatShortDate(
            meter.latest_reading_date,
            locale
          )}`
        : '—'

    return html`
      <div class="card health-card">
        <div class="health-head">
          <div class="health-title">Meter health</div>
          <span class="health-status"> <span class="dot"></span>All healthy </span>
        </div>
        <div class="health-row">
          <span class="muted">Latest reading</span>
          <span class="health-value">${reading}</span>
        </div>
        <div class="health-row">
          <span class="muted">Data completeness</span>
          <span class="health-value accent-green"
            >100% · ${meterCount} meter${meterCount === 1 ? '' : 's'}</span
          >
        </div>
        <div class="health-backfill">
          <div class="health-backfill-head faint">
            <span>Historical backfill</span>
            <span>${pct}%${pct >= 100 ? ' · done' : ''}</span>
          </div>
          <div class="progress">
            <div class="progress-fill" style="width:${pct}%"></div>
          </div>
        </div>
      </div>
    `
  }
}

if (!customElements.get('eon-overview-page')) {
  customElements.define('eon-overview-page', EonOverviewPage)
}

export { EonOverviewPage }
