import { LitElement, html, nothing } from 'lit'
import { property } from 'lit/decorators.js'
import { getVersion } from '../api'
import { WsDataController } from '../controllers/ws-data-controller'
import type { HomeAssistant, VersionResponse } from '../types'

import styles from '../styles/version-banner.css'

/** Expected backend version — injected at build time via const.  */
const FRONTEND_VERSION = '__FRONTEND_VERSION__'

class EonVersionBanner extends LitElement {
  static styles = [styles]

  @property({ attribute: false }) hass!: HomeAssistant

  private _version = new WsDataController<VersionResponse>(this, (h) => getVersion(h))

  render() {
    const backendVersion = this._version.data?.version
    if (!backendVersion) return nothing

    // If FRONTEND_VERSION was not replaced at build time, skip the check
    if (FRONTEND_VERSION.startsWith('__')) return nothing

    if (backendVersion === FRONTEND_VERSION) return nothing

    return html`
      <div class="version-mismatch">
        <ha-icon icon="mdi:alert" style="--mdc-icon-size: 18px;"></ha-icon>
        <span>
          Version mismatch: frontend v${FRONTEND_VERSION}, backend v${backendVersion}. Try
          clearing your browser cache or restarting Home Assistant.
        </span>
      </div>
    `
  }
}

if (!customElements.get('eon-version-banner')) {
  customElements.define('eon-version-banner', EonVersionBanner)
}
