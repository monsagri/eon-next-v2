import { LitElement, html, nothing } from 'lit'
import { property, state } from 'lit/decorators.js'

import styles from '../../styles/card-editor.css'

export interface SummaryEditorConfig {
  type: string
  show_gas?: boolean
  show_ev?: boolean
  show_costs?: boolean
}

class EonSummaryCardEditor extends LitElement {
  static styles = [styles]

  @property({ attribute: false }) hass!: Record<string, unknown>
  @state() private _config!: SummaryEditorConfig

  setConfig(config: SummaryEditorConfig): void {
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
        <div class="editor-checkbox">
          <input
            id="show_gas"
            type="checkbox"
            .checked=${this._config.show_gas !== false}
            @change=${this._toggleGas}
          />
          <label for="show_gas">Show gas meters</label>
        </div>

        <div class="editor-checkbox">
          <input
            id="show_ev"
            type="checkbox"
            .checked=${this._config.show_ev !== false}
            @change=${this._toggleEv}
          />
          <label for="show_ev">Show EV charging</label>
        </div>

        <div class="editor-checkbox">
          <input
            id="show_costs"
            type="checkbox"
            .checked=${this._config.show_costs !== false}
            @change=${this._toggleCosts}
          />
          <label for="show_costs">Show costs</label>
        </div>
      </div>
    `
  }

  private _toggleGas(e: Event) {
    const target = e.target as HTMLInputElement
    this._config = { ...this._config, show_gas: target.checked }
    this._fireConfigChanged()
  }

  private _toggleEv(e: Event) {
    const target = e.target as HTMLInputElement
    this._config = { ...this._config, show_ev: target.checked }
    this._fireConfigChanged()
  }

  private _toggleCosts(e: Event) {
    const target = e.target as HTMLInputElement
    this._config = { ...this._config, show_costs: target.checked }
    this._fireConfigChanged()
  }
}

if (!customElements.get('eon-next-summary-card-editor')) {
  customElements.define('eon-next-summary-card-editor', EonSummaryCardEditor)
}
