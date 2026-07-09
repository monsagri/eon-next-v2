import { LitElement, html, nothing } from 'lit'
import { property, state } from 'lit/decorators.js'
import type { PropertyValues } from 'lit'
import { getDashboardSummary, getVersion } from './api'
import { WsDataController } from './controllers/ws-data-controller'
import {
  findAccountBalance,
  findMeter,
  formatPounds,
  formatRelative
} from './utils/dashboard-data'
import { NAV_ITEMS, PAGE_TITLES, type DashboardPage } from './components/dashboard/pages'
import type {
  DashboardSummary,
  HomeAssistant,
  PanelInfo,
  PanelRoute,
  VersionResponse
} from './types'

import './components/dashboard/overview-page'
import './components/dashboard/meter-detail-page'
import './components/dashboard/tariff-page'
import './components/dashboard/ev-page'
import './components/dashboard/settings-page'

import tokens from './styles/dashboard-tokens.css'
import styles from './styles/panel.css'

const FONTS_URL =
  'https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700;800' +
  '&family=Newsreader:opsz,wght@6..72,400;6..72,500;6..72,600&family=Space+Mono&display=swap'

/**
 * The EON Next sidebar panel — a self-contained dashboard app.
 *
 * A left nav rail switches between Overview, Electricity, Gas, Tariff and EV
 * pages; the main column carries a top bar (title, freshness, refresh) and the
 * active page. The design is a branded warm-cream surface that reads the same
 * regardless of the host HA theme.
 */
class EonNextPanel extends LitElement {
  static styles = [tokens, styles]

  @property({ attribute: false }) hass!: HomeAssistant
  @property({ type: Boolean }) narrow = false
  @property({ attribute: false }) route!: PanelRoute
  @property({ attribute: false }) panel!: PanelInfo

  @state() private _page: DashboardPage = 'overview'
  @state() private _lastUpdated: Date | null = null
  /** Bumped by the refresh button to force pages to re-fetch. */
  @state() private _refreshToken = 0

  private _version = new WsDataController<VersionResponse>(this, (h) => getVersion(h))
  private _summary = new WsDataController<DashboardSummary>(this, (h) =>
    getDashboardSummary(h)
  )

  private _hadData = false

  connectedCallback() {
    super.connectedCallback()
    this._ensureFonts()
  }

  updated(_changed: PropertyValues) {
    // Track when fresh summary data arrives, for the "Updated …" label.
    if (this._summary.data && !this._summary.loading && !this._summary.refreshing) {
      if (!this._hadData) {
        this._hadData = true
        this._lastUpdated = new Date()
      }
    }
  }

  /** Load the design's Google Fonts once, into the main document. */
  private _ensureFonts() {
    const doc = this.ownerDocument
    if (!doc || doc.getElementById('eon-next-fonts')) return
    const link = doc.createElement('link')
    link.id = 'eon-next-fonts'
    link.rel = 'stylesheet'
    link.href = FONTS_URL
    doc.head.appendChild(link)
  }

  private _navigate = (page: DashboardPage) => {
    this._page = page
  }

  private _onNavigateEvent = (e: CustomEvent<{ page: DashboardPage }>) => {
    this._navigate(e.detail.page)
  }

  private _refresh = () => {
    this._refreshToken++
    this._lastUpdated = new Date()
    this._summary.refresh()
    this._version.refresh()
  }

  render() {
    return html`
      <div class="shell" @navigate=${this._onNavigateEvent}>
        ${this._renderRail()}
        <main class="main">
          ${this._renderTopBar()}
          <div class="content">${this._renderPage()}</div>
        </main>
      </div>
    `
  }

  private _renderRail() {
    const balance = findAccountBalance(this.hass)
    return html`
      <nav class="rail" aria-label="Dashboard sections">
        <div class="brand">
          <div class="brand-logo" aria-hidden="true">
            <svg viewBox="0 0 48 48" class="brand-bolt" focusable="false">
              <path d="M27 4 11 27h11l-2 17 18-24H26z" fill="#fff" />
            </svg>
          </div>
          <div>
            <div class="brand-name">EON Next</div>
            <div class="brand-sub mono">home energy</div>
          </div>
        </div>

        <div class="nav-items">
          ${NAV_ITEMS.map((item) => this._renderNavButton(item.page, item.label, item.icon))}
        </div>

        <div class="rail-bottom">
          ${
            balance != null
              ? html`<div class="balance">
                  <div class="balance-label">Balance</div>
                  <div
                    class="serif balance-value ${balance >= 0 ? 'balance--credit' : 'balance--debit'}"
                  >
                    ${formatPounds(Math.abs(balance))}
                  </div>
                  <div class="balance-sub">${balance >= 0 ? 'in credit' : 'owed'}</div>
                </div>`
              : nothing
          }
          ${this._renderNavButton('settings', 'Settings', 'mdi:cog-outline')}
        </div>
      </nav>
    `
  }

  private _renderNavButton(page: DashboardPage, label: string, icon: string) {
    const active = this._page === page
    return html`
      <button
        class="nav-item ${active ? 'nav-item--active' : ''}"
        aria-current=${active ? 'page' : 'false'}
        @click=${() => this._navigate(page)}
      >
        <ha-icon .icon=${icon} style="--mdc-icon-size:18px"></ha-icon>
        <span>${label}</span>
      </button>
    `
  }

  private _renderTopBar() {
    const updated = this._summary.refreshing
      ? 'Updating…'
      : `Updated ${formatRelative(this._lastUpdated)}`
    return html`
      <header class="topbar">
        <div class="topbar-left">
          <ha-menu-button
            class="menu-button"
            .hass=${this.hass}
            .narrow=${this.narrow}
          ></ha-menu-button>
          <h1 class="serif topbar-title">${PAGE_TITLES[this._page]}</h1>
        </div>
        <div class="topbar-right">
          <span class="freshness"> <span class="dot"></span>${updated} </span>
          <button
            class="refresh-btn"
            title="Refresh data"
            aria-label="Refresh data"
            @click=${this._refresh}
          >
            <ha-icon icon="mdi:refresh" style="--mdc-icon-size:18px"></ha-icon>
          </button>
        </div>
      </header>
    `
  }

  private _renderPage() {
    if (this._summary.loading && !this._summary.data) {
      return html`<div class="state-msg" role="status">Loading energy data…</div>`
    }
    if (this._summary.error && !this._summary.data) {
      return html`
        <div class="state-msg state-msg--error" role="alert">
          <ha-icon icon="mdi:alert-circle" style="--mdc-icon-size:40px"></ha-icon>
          <div>Unable to load data</div>
          <div class="state-sub">${this._summary.error}</div>
        </div>
      `
    }

    const summary = this._summary.data
    const hasMeters = (summary?.meters.length ?? 0) > 0
    const hasEv = (summary?.ev_chargers.length ?? 0) > 0
    if (!hasMeters && !hasEv) {
      return html`
        <div class="state-msg" role="status">
          <ha-icon
            icon="mdi:lightning-bolt-circle"
            style="--mdc-icon-size:40px"
          ></ha-icon>
          <div>No data available</div>
          <div class="state-sub">No meter or EV data found for this account.</div>
        </div>
      `
    }

    const token = this._refreshToken
    switch (this._page) {
      case 'overview':
        return html`<eon-overview-page
          .hass=${this.hass}
          .summary=${summary}
          .refreshToken=${token}
        ></eon-overview-page>`
      case 'elec':
        return html`<eon-meter-detail-page
          .hass=${this.hass}
          .meter=${findMeter(summary, 'electricity')}
          .refreshToken=${token}
        ></eon-meter-detail-page>`
      case 'gas':
        return html`<eon-meter-detail-page
          .hass=${this.hass}
          .meter=${findMeter(summary, 'gas')}
          .refreshToken=${token}
        ></eon-meter-detail-page>`
      case 'tariff':
        return html`<eon-tariff-page
          .hass=${this.hass}
          .summary=${summary}
        ></eon-tariff-page>`
      case 'ev':
        return html`<eon-ev-page
          .hass=${this.hass}
          .deviceId=${summary?.ev_chargers[0]?.device_id ?? ''}
          .refreshToken=${token}
        ></eon-ev-page>`
      case 'settings':
        return html`<eon-settings-page
          .hass=${this.hass}
          .version=${this._version.data?.version ?? null}
        ></eon-settings-page>`
    }
  }
}

customElements.define('eon-next-panel', EonNextPanel)
