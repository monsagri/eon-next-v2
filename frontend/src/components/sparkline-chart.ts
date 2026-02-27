import { LitElement, html } from 'lit'
import { property } from 'lit/decorators.js'

import styles from '../styles/sparkline-chart.css'

class EonSparklineChart extends LitElement {
  static styles = [styles]

  @property({ type: Array }) values: number[] = []
  @property() color = 'var(--eon-primary)'

  render() {
    if (this.values.length < 2) {
      return html`<div class="sparkline-container"></div>`
    }

    const width = 100
    const height = 30
    const padding = 2
    const min = Math.min(...this.values)
    const max = Math.max(...this.values)
    const range = max - min || 1

    const points = this.values.map((v, i) => {
      const x = padding + (i / (this.values.length - 1)) * (width - 2 * padding)
      const y = padding + (1 - (v - min) / range) * (height - 2 * padding)
      return `${x},${y}`
    })

    const polyline = points.join(' ')

    // Create fill path (area under the line)
    const firstX = padding
    const lastX =
      padding +
      ((this.values.length - 1) / (this.values.length - 1)) * (width - 2 * padding)
    const fillPath = `M${firstX},${height} L${polyline
      .replace(/,/g, ' ')
      .split(' ')
      .reduce<string[]>((acc, val, i) => {
        if (i % 2 === 0) acc.push(`${val}`)
        else acc[acc.length - 1] += `,${val}`
        return acc
      }, [])
      .join(' L')} L${lastX},${height} Z`

    return html`
      <div class="sparkline-container">
        <svg
          viewBox="0 0 ${width} ${height}"
          preserveAspectRatio="none"
          width="100%"
          height="100%"
          aria-hidden="true"
        >
          <path d=${fillPath} fill=${this.color} opacity="0.15" />
          <polyline
            points=${polyline}
            fill="none"
            stroke=${this.color}
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </div>
    `
  }
}

if (!customElements.get('eon-sparkline-chart')) {
  customElements.define('eon-sparkline-chart', EonSparklineChart)
}
