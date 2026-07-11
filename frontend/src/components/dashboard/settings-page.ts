import { LitElement, html, nothing } from 'lit'
import { property } from 'lit/decorators.js'
import type { HomeAssistant } from '../../types'
import '../backfill-status'

import tokens from '../../styles/dashboard-tokens.css'
import shared from '../../styles/dashboard-shared.css'
import styles from '../../styles/settings-page.css'

/**
 * Settings placeholder. Account, refresh-interval and backfill controls live in
 * the integration's options flow; the historical-backfill status is surfaced
 * here for convenience.
 */
class EonSettingsPage extends LitElement {
  static styles = [tokens, shared, styles]

  @property({ attribute: false }) hass!: HomeAssistant
  @property() version: string | null = null

  render() {
    return html`
      <div class="page">
        <div class="card intro">
          <div class="serif intro-title">Settings</div>
          <div class="muted intro-body">
            Account details, the integration refresh interval and backfill controls are
            managed from the E.ON Next integration's options in Home Assistant.
          </div>
          ${this.version ? html`<div class="faint version">Version ${this.version}</div>` : nothing}
        </div>

        <div class="card">
          <eon-backfill-status .hass=${this.hass}></eon-backfill-status>
        </div>
      </div>
    `
  }
}

if (!customElements.get('eon-settings-page')) {
  customElements.define('eon-settings-page', EonSettingsPage)
}

export { EonSettingsPage }
