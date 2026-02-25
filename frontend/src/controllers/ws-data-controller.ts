import type { ReactiveController, ReactiveControllerHost } from 'lit'
import type { HomeAssistant } from '../types'

/**
 * Reactive controller that fetches data via a WebSocket call once,
 * then exposes `data`, `loading`, and `error` as reactive state.
 *
 * Usage:
 *   private _ctrl = new WsDataController(this, (hass) => getDashboardSummary(hass));
 *
 *   render() {
 *     if (this._ctrl.loading) return html`…`;
 *     const data = this._ctrl.data;
 *   }
 */
export class WsDataController<T> implements ReactiveController {
  data: T | null = null
  loading = true
  error: string | null = null

  private _fetched = false

  constructor(
    private readonly _host: ReactiveControllerHost & { hass?: HomeAssistant },
    private readonly _fetcher: (hass: HomeAssistant) => Promise<T>
  ) {
    this._host.addController(this)
  }

  hostUpdated(): void {
    if (!this._fetched && this._host.hass) {
      this._fetch(this._host.hass)
    }
  }

  /** Manually trigger a refresh (e.g. from a refresh button). */
  async refresh(): Promise<void> {
    const hass = this._host.hass
    if (hass) {
      await this._fetch(hass)
    }
  }

  private async _fetch(hass: HomeAssistant): Promise<void> {
    this._fetched = true
    try {
      this.data = await this._fetcher(hass)
      this.error = null
    } catch (err) {
      this.error = err instanceof Error ? err.message : String(err)
    } finally {
      this.loading = false
      this._host.requestUpdate()
    }
  }

  hostDisconnected(): void {
    // Allow re-fetch if the element is reconnected.
    this._fetched = false
  }
}
