import { LitElement, html } from 'lit'
import { property } from 'lit/decorators.js'
import type { PropertyValues } from 'lit'
import { Chart, DoughnutController, ArcElement, Legend, Tooltip } from 'chart.js'

import styles from '../styles/pie-chart.css'

Chart.register(DoughnutController, ArcElement, Legend, Tooltip)

export interface PieChartSegment {
  label: string
  value: number
  color: string
}

class EonPieChart extends LitElement {
  static styles = [styles]

  @property({ type: Array }) segments: PieChartSegment[] = []
  @property({ type: Boolean }) darkMode = false

  private _chart: Chart | null = null

  render() {
    return html`<div class="chart-container" role="img" aria-label="Pie chart">
      <canvas></canvas>
    </div>`
  }

  firstUpdated() {
    if (!this._chart) {
      this._createChart()
    }
  }

  updated(changed: PropertyValues) {
    if (!changed.has('segments') && !changed.has('darkMode')) {
      return
    }

    if (!this._chart) {
      this._createChart()
      return
    }

    this._updateChart()
  }

  disconnectedCallback() {
    // eslint-disable-next-line wc/guard-super-call
    super.disconnectedCallback()
    this._chart?.destroy()
    this._chart = null
  }

  private _createChart() {
    const canvas = this.renderRoot.querySelector('canvas') as HTMLCanvasElement | null
    if (!canvas) return

    this._chart = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: this.segments.map((s) => s.label),
        datasets: [
          {
            data: this.segments.map((s) => s.value),
            backgroundColor: this.segments.map((s) => s.color),
            borderWidth: 0,
            hoverOffset: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        cutout: '55%',
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: this.darkMode ? '#424242' : '#fff',
            titleColor: this.darkMode ? '#e1e1e1' : '#212121',
            bodyColor: this.darkMode ? '#bdbdbd' : '#424242',
            borderColor: this.darkMode ? '#616161' : '#e0e0e0',
            borderWidth: 1,
            cornerRadius: 8,
            padding: 10,
            callbacks: {
              label: (ctx: { label?: string; parsed: number }) => {
                const total = this.segments.reduce((sum, s) => sum + s.value, 0)
                const pct = total > 0 ? ((ctx.parsed / total) * 100).toFixed(1) : '0'
                return `${ctx.label}: £${ctx.parsed.toFixed(2)} (${pct}%)`
              }
            }
          }
        }
      }
    })
  }

  private _updateChart() {
    if (!this._chart) {
      this._createChart()
      return
    }

    this._chart.data.labels = this.segments.map((s) => s.label)
    this._chart.data.datasets[0].data = this.segments.map((s) => s.value)
    this._chart.data.datasets[0].backgroundColor = this.segments.map((s) => s.color)

    const tooltip = this._chart.options.plugins?.tooltip
    if (tooltip) {
      tooltip.backgroundColor = this.darkMode ? '#424242' : '#fff'
      tooltip.titleColor = this.darkMode ? '#e1e1e1' : '#212121'
      tooltip.bodyColor = this.darkMode ? '#bdbdbd' : '#424242'
      tooltip.borderColor = this.darkMode ? '#616161' : '#e0e0e0'
    }

    this._chart.update('none')
  }
}

if (!customElements.get('eon-pie-chart')) {
  customElements.define('eon-pie-chart', EonPieChart)
}
