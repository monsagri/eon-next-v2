import type { ReactiveController, ReactiveControllerHost } from 'lit'
import type { HomeAssistant } from '../types'

/** Background refresh cadence — aligned to the 30-min coordinator poll. */
const REFRESH_INTERVAL_MS = 5 * 60 * 1000

/**
 * Reactive controller that fetches data via a WebSocket call, then keeps it
 * fresh: it re-fetches on an interval so a wall-mounted dashboard never shows
 * data frozen at mount time, drops out-of-order responses via request
 * versioning, and revalidates in the background without blanking the UI.
 *
 * Usage:
 *   private _ctrl = new WsDataController(this, (hass) => getDashboardSummary(hass));
 *
 *   render() {
 *     if (this._ctrl.loading) return html`…`;   // initial load only
 *     const data = this._ctrl.data;             // stale-while-revalidate
 *   }
 */
export class WsDataController<T> implements ReactiveController {
  data: T | null = null
  /** True only during the very first load (no data yet). */
  loading = true
  /** True while a background refresh is in flight (data already shown). */
  refreshing = false
  error: string | null = null

  private _requestSeq = 0
  private _timer: ReturnType<typeof setInterval> | undefined
  private _lastConnection: unknown = undefined

  constructor(
    private readonly _host: ReactiveControllerHost & { hass?: HomeAssistant },
    private readonly _fetcher: (hass: HomeAssistant) => Promise<T>
  ) {
    this._host.addController(this)
  }

  hostConnected(): void {
    this._startTimer()
  }

  hostUpdated(): void {
    const hass = this._host.hass
    if (!hass) return
    if (this.data === null && !this.refreshing) {
      this._fetch(hass)
    } else if (this._lastConnection !== hass.connection) {
      // HA reconnected (new connection object) — refresh against it.
      this._lastConnection = hass.connection
      this._fetch(hass)
    }
  }

  /** Manually trigger a refresh (e.g. from a refresh button). */
  async refresh(): Promise<void> {
    const hass = this._host.hass
    if (hass) {
      await this._fetch(hass)
    }
  }

  private _startTimer(): void {
    this._stopTimer()
    this._timer = setInterval(() => {
      const hass = this._host.hass
      if (hass) this._fetch(hass)
    }, REFRESH_INTERVAL_MS)
  }

  private _stopTimer(): void {
    if (this._timer !== undefined) {
      clearInterval(this._timer)
      this._timer = undefined
    }
  }

  private async _fetch(hass: HomeAssistant): Promise<void> {
    const seq = ++this._requestSeq
    this._lastConnection = hass.connection
    if (this.data === null) {
      this.loading = true
    } else {
      this.refreshing = true
    }
    this.error = null
    this._host.requestUpdate()

    try {
      const result = await this._fetcher(hass)
      if (seq !== this._requestSeq) return // superseded by a newer request
      this.data = result
    } catch (err) {
      if (seq !== this._requestSeq) return
      this.error = err instanceof Error ? err.message : String(err)
    } finally {
      if (seq === this._requestSeq) {
        this.loading = false
        this.refreshing = false
        this._host.requestUpdate()
      }
    }
  }

  hostDisconnected(): void {
    this._stopTimer()
    // Invalidate any in-flight request and force a fresh fetch on reconnect.
    this._requestSeq++
    this.data = null
    this.loading = true
    this.refreshing = false
    this._lastConnection = undefined
  }
}
