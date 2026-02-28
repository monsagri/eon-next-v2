import { LitElement, html, nothing } from 'lit'
import { property, state } from 'lit/decorators.js'

import styles from '../../styles/card-editor.css'

export interface MeterCardEditorConfig {
  type: string
  meter_type?: string
  meter_serial?: string
}

class EonMeterCardEditor extends LitElement {
  static styles = [styles]

  @property({ attribute: false }) hass!: Record<string, unknown>
  @state() private _config!: MeterCardEditorConfig

  setConfig(config: MeterCardEditorConfig): void {
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
          <label for="meter_type">Meter type</label>
          <select
            id="meter_type"
            .value=${this._config.meter_type ?? 'electricity'}
            @change=${this._meterTypeChanged}
          >
            <option value="electricity">Electricity</option>
            <option value="gas">Gas</option>
          </select>
        </div>

        <div class="editor-row">
          <label for="meter_serial">Meter serial (optional)</label>
          <input
            id="meter_serial"
            type="text"
            .value=${this._config.meter_serial ?? ''}
            placeholder="Auto-detect"
            @input=${this._meterSerialChanged}
          />
        </div>
      </div>
    `
  }

  private _meterTypeChanged(e: Event) {
    const target = e.target as HTMLSelectElement
    this._config = { ...this._config, meter_type: target.value }
    this._fireConfigChanged()
  }

  private _meterSerialChanged(e: Event) {
    const target = e.target as HTMLInputElement
    const value = target.value.trim()
    this._config = {
      ...this._config,
      meter_serial: value || undefined
    }
    this._fireConfigChanged()
  }
}

if (!customElements.get('eon-next-meter-card-editor')) {
  customElements.define('eon-next-meter-card-editor', EonMeterCardEditor)
}
