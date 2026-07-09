import { LitElement, html, nothing } from 'lit'
import { property } from 'lit/decorators.js'
import type { StackedBar } from '../../utils/dashboard-data'
import { formatPounds } from '../../utils/dashboard-data'

import tokens from '../../styles/dashboard-tokens.css'
import styles from '../../styles/stacked-bar-chart.css'

/**
 * Pure-CSS stacked bar chart: the energy-used segment sits on top of the fixed
 * daily standing charge, so the fixed floor a customer pays before using
 * anything is always visible. Height-normalised to the max total in the series.
 */
class EonStackedBarChart extends LitElement {
  static styles = [tokens, styles]

  @property({ type: Array }) bars: StackedBar[] = []
  @property() usageColor = 'var(--eon-elec)'
  @property() standColor = 'var(--eon-elec-standing)'
  /** Chart body height in px. */
  @property({ type: Number }) height = 240
  /** Max bar width in px (keeps sparse series from ballooning). */
  @property({ type: Number }) maxBarWidth = 22
  /** Whether to render the x-axis label row. */
  @property({ type: Boolean }) showLabels = true

  render() {
    return html`
      <div
        class="bars"
        style="height:${this.height}px"
        role="img"
        aria-label="Daily cost - energy used stacked on the standing charge"
      >
        ${this.bars.map((b) => this._renderBar(b))}
      </div>
      ${
        this.showLabels
          ? html`<div class="labels">
              ${this.bars.map((b) => html`<span class="label">${b.label}</span>`)}
            </div>`
          : nothing
      }
    `
  }

  private _renderBar(bar: StackedBar) {
    const title = `${formatPounds(bar.usageCost + bar.standCost)} · usage ${formatPounds(
      bar.usageCost
    )} + standing ${formatPounds(bar.standCost)}`
    return html`
      <div class="col" style="max-width:${this.maxBarWidth}px" title=${title}>
        <div class="stack">
          <div
            class="seg seg--usage"
            style="height:${bar.usagePct}%;background:${this.usageColor}"
          ></div>
          <div
            class="seg seg--stand"
            style="height:${bar.standPct}%;background:${this.standColor}"
          ></div>
        </div>
      </div>
    `
  }
}

if (!customElements.get('eon-stacked-bar-chart')) {
  customElements.define('eon-stacked-bar-chart', EonStackedBarChart)
}

export { EonStackedBarChart }
