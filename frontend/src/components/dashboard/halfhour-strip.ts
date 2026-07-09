import { LitElement, html, nothing } from 'lit'
import { property } from 'lit/decorators.js'

import tokens from '../../styles/dashboard-tokens.css'
import styles from '../../styles/halfhour-strip.css'

export interface HalfHourBar {
  heightPct: number
  color: string
}

/**
 * A row of half-hour bars used for the today's-rate shape (tariff page) and the
 * smart-charging schedule (EV page). Optionally overlays a "now" marker and a
 * time axis.
 */
class EonHalfHourStrip extends LitElement {
  static styles = [tokens, styles]

  @property({ type: Array }) bars: HalfHourBar[] = []
  @property({ type: Number }) height = 64
  /** 0..1 position of the "now" marker, or null to hide it. */
  @property({ type: Number }) nowFraction: number | null = null
  /** Axis tick labels spread evenly under the strip. */
  @property({ type: Array }) axis: string[] = []
  @property() ariaLabel = 'Half-hourly chart'

  render() {
    return html`
      <div
        class="strip"
        style="height:${this.height}px"
        role="img"
        aria-label=${this.ariaLabel}
      >
        ${this.bars.map(
          (b) =>
            html`<div
              class="bar"
              style="height:${b.heightPct}%;background:${b.color}"
            ></div>`
        )}
        ${
          this.nowFraction != null
            ? html`<div class="now" style="left:${this.nowFraction * 100}%">
                <span class="now-label mono">now</span>
              </div>`
            : nothing
        }
      </div>
      ${
        this.axis.length
          ? html`<div class="axis mono">
              ${this.axis.map((t) => html`<span>${t}</span>`)}
            </div>`
          : nothing
      }
    `
  }
}

if (!customElements.get('eon-halfhour-strip')) {
  customElements.define('eon-halfhour-strip', EonHalfHourStrip)
}

export { EonHalfHourStrip }
