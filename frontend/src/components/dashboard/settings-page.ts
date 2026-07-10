import { LitElement, html, nothing } from 'lit'
import { property } from 'lit/decorators.js'
import { type AccountInfo, getAccounts } from '../../api'
import { WsDataController } from '../../controllers/ws-data-controller'
import type { AccountsResponse } from '../../api'
import type { HomeAssistant } from '../../types'
import { formatPounds } from '../../utils/dashboard-data'
import '../backfill-status'

import tokens from '../../styles/dashboard-tokens.css'
import shared from '../../styles/dashboard-shared.css'
import styles from '../../styles/settings-page.css'

/** The Home Assistant page that lists this integration's config entries. */
const HA_INTEGRATION_URL = '/config/integrations/integration/eon_next'

const STATUS_LABEL: Record<string, string> = {
  connected: 'Connected',
  reauth_required: 'Reauthentication needed',
  error: 'Needs attention'
}

/**
 * Settings page.
 *
 * Surfaces the configured provider accounts (read-only) and links out to Home
 * Assistant's own config flow for anything that touches credentials - account
 * management stays with HA, which owns auth and admin-gating.
 */
class EonSettingsPage extends LitElement {
  static styles = [tokens, shared, styles]

  @property({ attribute: false }) hass!: HomeAssistant
  @property() version: string | null = null

  private _accounts = new WsDataController<AccountsResponse>(this, (h) => getAccounts(h))

  private get _isAdmin(): boolean {
    return this.hass?.user?.is_admin === true
  }

  private _openHa(event: Event) {
    event.preventDefault()
    // HA's SPA router listens for `location-changed` on the window after a
    // history push - this navigates without a full reload.
    history.pushState(null, '', HA_INTEGRATION_URL)
    window.dispatchEvent(new CustomEvent('location-changed'))
  }

  render() {
    return html`
      <div class="page">
        <div class="card intro">
          <div class="serif intro-title">Settings</div>
          <div class="muted intro-body">
            The integration refresh interval and backfill controls are managed from the
            integration's options in Home Assistant.
          </div>
          ${this.version ? html`<div class="faint version">Version ${this.version}</div>` : nothing}
        </div>

        ${this._renderAccounts()}

        <div class="card">
          <eon-backfill-status .hass=${this.hass}></eon-backfill-status>
        </div>
      </div>
    `
  }

  private _renderAccounts() {
    const accounts = this._accounts.data?.accounts ?? []
    return html`
      <div class="card accounts">
        <div class="accounts-head">
          <div class="serif accounts-title">Connected accounts</div>
          ${
            this._isAdmin
              ? html`<a
                  class="acct-link acct-link--primary"
                  href=${HA_INTEGRATION_URL}
                  @click=${this._openHa}
                  >Add account</a
                >`
              : nothing
          }
        </div>

        ${
          this._accounts.loading && !this._accounts.data
            ? html`<div class="muted acct-empty">Loading accounts…</div>`
            : accounts.length === 0
              ? html`<div class="muted acct-empty">No accounts configured.</div>`
              : html`<div class="acct-list">
                  ${accounts.map((a) => this._renderAccount(a))}
                </div>`
        }

        <div class="faint accounts-foot">
          ${
            this._isAdmin
              ? 'Adding, re-authenticating or removing an account opens Home Assistant.'
              : 'Ask an administrator to add or change accounts.'
          }
        </div>
      </div>
    `
  }

  private _renderAccount(account: AccountInfo) {
    const statusLabel = STATUS_LABEL[account.status] ?? account.status
    const statusClass =
      account.status === 'connected'
        ? 'acct-status--ok'
        : account.status === 'reauth_required'
          ? 'acct-status--warn'
          : 'acct-status--err'

    return html`
      <div class="acct-row">
        <div class="acct-main">
          <div class="acct-name">${account.provider_name}</div>
          ${
            account.account_number
              ? html`<div class="mono acct-num">${account.account_number}</div>`
              : nothing
          }
        </div>
        <div class="acct-meta">
          ${
            account.balance != null
              ? html`<div class="acct-balance">${formatPounds(account.balance)}</div>`
              : nothing
          }
          <span class="acct-status ${statusClass}">${statusLabel}</span>
          ${
            this._isAdmin
              ? html`<a
                  class="acct-link"
                  href=${HA_INTEGRATION_URL}
                  @click=${this._openHa}
                  >Manage</a
                >`
              : nothing
          }
        </div>
      </div>
    `
  }
}

if (!customElements.get('eon-settings-page')) {
  customElements.define('eon-settings-page', EonSettingsPage)
}

export { EonSettingsPage }
