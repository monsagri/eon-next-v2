import { LitElement, html } from 'lit'
import { property } from 'lit/decorators.js'
import type { PropertyValues } from 'lit'
import {
  Chart,
  BarController,
  BarElement,
  CategoryScale,
  LinearScale,
  Legend,
  Tooltip
} from 'chart.js'

import styles from '../styles/bar-chart.css'

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Legend, Tooltip)

export interface BarChartDataset {
  label: string
  data: number[]
  backgroundColor?: string
  borderRadius?: number
  yAxisID?: string
}

class EonBarChart extends LitElement {
  static styles = [styles]

  @property({ type: Array }) labels: string[] = []
  @property({ type: Array }) datasets: BarChartDataset[] = []
  @property() yLabel = ''
  @property() y2Label = ''
  @property({ type: Boolean }) darkMode = false

  private _chart: Chart | null = null

  render() {
    return html`<div class="chart-container"><canvas></canvas></div>`
  }

  firstUpdated() {
    if (!this._chart) {
      this._createChart()
    }
  }

  updated(changed: PropertyValues) {
    const labelsChanged = changed.has('labels')
    const datasetsChanged = changed.has('datasets')
    const darkModeChanged = changed.has('darkMode')
    const y2LabelChanged = changed.has('y2Label')

    if (!labelsChanged && !datasetsChanged && !darkModeChanged && !y2LabelChanged) {
      return
    }

    if (!this._chart) {
      this._createChart()
      return
    }

    let shouldRecreate = y2LabelChanged && this._chart != null

    if (datasetsChanged) {
      const previousDatasets = changed.get('datasets') as BarChartDataset[] | undefined
      const previousLength = previousDatasets?.length ?? 0
      if (previousLength !== this.datasets.length) {
        shouldRecreate = true
      }

      const previousUsesY2 =
        previousDatasets?.some((dataset) => dataset.yAxisID === 'y2') ?? false
      const currentUsesY2 = this.datasets.some((dataset) => dataset.yAxisID === 'y2')
      if (previousUsesY2 !== currentUsesY2) {
        shouldRecreate = true
      }
    }

    if (shouldRecreate) {
      this._chart?.destroy()
      this._chart = null
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

    const textColor = this.darkMode ? '#e1e1e1' : '#212121'
    const gridColor = this.darkMode ? '#3c3c3c' : '#e0e0e0'

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const scales: Record<string, any> = {
      x: {
        ticks: { color: textColor },
        grid: { display: false }
      },
      y: {
        beginAtZero: true,
        title: {
          display: !!this.yLabel,
          text: this.yLabel,
          color: textColor
        },
        ticks: { color: textColor },
        grid: { color: gridColor }
      }
    }

    if (this.y2Label) {
      scales.y2 = {
        position: 'right',
        beginAtZero: true,
        title: { display: true, text: this.y2Label, color: textColor },
        ticks: { color: textColor },
        grid: { drawOnChartArea: false }
      }
    }

    this._chart = new Chart(canvas, {
      type: 'bar',
      data: { labels: this.labels, datasets: this.datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: this.datasets.length > 1 },
          tooltip: { mode: 'index', intersect: false }
        },
        scales
      }
    })
  }

  private _updateChart() {
    if (!this._chart) {
      this._createChart()
      return
    }

    const textColor = this.darkMode ? '#e1e1e1' : '#212121'
    const gridColor = this.darkMode ? '#3c3c3c' : '#e0e0e0'

    this._chart.data.labels = this.labels
    this._chart.data.datasets = this.datasets
    const scales = this._chart.options.scales ?? {}
    const xScale = scales.x ?? {}
    const yScale = scales.y ?? {}
    const yScaleTitle = (yScale as { title?: { color?: string } }).title
    if (xScale.ticks) xScale.ticks.color = textColor
    if (yScale.ticks) yScale.ticks.color = textColor
    if (yScale.grid) yScale.grid.color = gridColor
    if (yScaleTitle) {
      yScaleTitle.color = textColor
    }
    const y2Scale = scales.y2 as Record<string, Record<string, unknown>> | undefined
    if (y2Scale?.ticks) y2Scale.ticks.color = textColor
    if (y2Scale?.title) {
      y2Scale.title.color = textColor
    }
    this._chart.update('none')
  }
}

if (!customElements.get('eon-bar-chart')) {
  customElements.define('eon-bar-chart', EonBarChart)
}
