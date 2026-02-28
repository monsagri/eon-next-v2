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
    const selectedIndex = this.options.findIndex((opt) => opt.value === this.value)
    const activeIndex = selectedIndex >= 0 ? selectedIndex : 0

    return html`
      <div class="range-picker" role="radiogroup" aria-label="Time range">
        ${this.options.map(
          (opt, index) => html`
            <button
              type="button"
              class="range-btn ${this.value === opt.value ? 'active' : ''}"
              role="radio"
              aria-checked=${this.value === opt.value ? 'true' : 'false'}
              tabindex=${index === activeIndex ? '0' : '-1'}
              @keydown=${(event: KeyboardEvent) => this._onKeydown(event, index)}
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

  private _onKeydown(event: KeyboardEvent, index: number) {
    let nextIndex: number | null = null

    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      nextIndex = (index - 1 + this.options.length) % this.options.length
    } else if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      nextIndex = (index + 1) % this.options.length
    } else if (event.key === 'Home') {
      nextIndex = 0
    } else if (event.key === 'End') {
      nextIndex = this.options.length - 1
    } else if (event.key === ' ' || event.key === 'Enter') {
      nextIndex = index
    }

    if (nextIndex == null) {
      return
    }

    event.preventDefault()
    const nextValue = this.options[nextIndex]?.value
    if (nextValue == null) {
      return
    }

    this._select(nextValue)
    this.updateComplete.then(() => {
      const buttons = this.renderRoot.querySelectorAll<HTMLButtonElement>('.range-btn')
      buttons[nextIndex]?.focus()
    })
  }
}

if (!customElements.get('eon-range-picker')) {
  customElements.define('eon-range-picker', EonRangePicker)
}
