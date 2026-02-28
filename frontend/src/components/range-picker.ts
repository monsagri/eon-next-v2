import { LitElement, html } from 'lit'
import { property } from 'lit/decorators.js'

import styles from '../styles/range-picker.css'

export interface RangeOption {
  label: string
  value: number
}

const DEFAULT_OPTIONS: RangeOption[] = [
  { label: '7d', value: 7 },
  { label: '30d', value: 30 },
  { label: '90d', value: 90 },
  { label: '1y', value: 365 }
]

class EonRangePicker extends LitElement {
  static styles = [styles]

  @property({ type: Number }) value = 7
  @property({ type: Array }) options: RangeOption[] = DEFAULT_OPTIONS

  render() {
    return html`
      <div class="range-picker" role="radiogroup" aria-label="Time range">
        ${this.options.map(
          (opt) => html`
            <button
              class="range-btn ${this.value === opt.value ? 'active' : ''}"
              role="radio"
              aria-checked=${this.value === opt.value ? 'true' : 'false'}
              @click=${() => this._select(opt.value)}
            >
              ${opt.label}
            </button>
          `
        )}
      </div>
    `
  }

  private _select(value: number) {
    if (value === this.value) return
    this.value = value
    this.dispatchEvent(
      new CustomEvent('range-changed', {
        detail: { value },
        bubbles: true,
        composed: true
      })
    )
  }
}

if (!customElements.get('eon-range-picker')) {
  customElements.define('eon-range-picker', EonRangePicker)
}
