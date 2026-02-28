import { LitElement, html, nothing } from 'lit'
import { property, state } from 'lit/decorators.js'

import styles from '../../styles/card-editor.css'

export interface EvEditorConfig {
  type: string
  device_id?: string
}

class EonEvCardEditor extends LitElement {
  static styles = [styles]

  @property({ attribute: false }) hass!: Record<string, unknown>
  @state() private _config!: EvEditorConfig

  setConfig(config: EvEditorConfig): void {
    this._config = { ...config }
  }

  private _fireConfigChanged() {
    this.dispatchEvent(
      new CustomEvent('config-changed', {
        detail: { config: this._config },
        bubbles: true,
        composed: true
      })
    )
  }

  render() {
    if (!this._config) return nothing

    return html`
      <div class="editor">
        <div class="editor-row">
          <label for="device_id">Device ID (optional)</label>
          <input
            id="device_id"
            type="text"
            .value=${this._config.device_id ?? ''}
            placeholder="Auto-detect first charger"
            @input=${this._deviceIdChanged}
          />
        </div>
      </div>
    `
  }

  private _deviceIdChanged(e: Event) {
    const target = e.target as HTMLInputElement
    const value = target.value.trim()
    this._config = {
      ...this._config,
      device_id: value || undefined
    }
    this._fireConfigChanged()
  }
}

if (!customElements.get('eon-next-ev-card-editor')) {
  customElements.define('eon-next-ev-card-editor', EonEvCardEditor)
}
