import { LitElement, html, css, nothing } from "lit";
import { property, state } from "lit/decorators.js";
import { sharedStyles } from "./styles";
import { getVersion, getDashboardSummary } from "./api";
import type {
  HomeAssistant,
  PanelRoute,
  PanelInfo,
  DashboardSummary,
  MeterSummary,
  EvChargerSummary,
} from "./types";

class EonNextPanel extends LitElement {
  @property({ attribute: false }) hass!: HomeAssistant;
  @property({ type: Boolean }) narrow!: boolean;
  @property({ attribute: false }) route!: PanelRoute;
  @property({ attribute: false }) panel!: PanelInfo;

  @state() private _version: string | null = null;
  @state() private _summary: DashboardSummary | null = null;
  @state() private _loading = true;
  @state() private _error: string | null = null;

  firstUpdated(): void {
    this._loadData();
  }

  private async _loadData(): Promise<void> {
    if (!this.hass) return;
    try {
      const [version, summary] = await Promise.all([
        getVersion(this.hass),
        getDashboardSummary(this.hass),
      ]);
      this._version = version.version;
      this._summary = summary;
      this._error = null;
    } catch (err) {
      this._error = err instanceof Error ? err.message : String(err);
    } finally {
      this._loading = false;
    }
  }

  static styles = [
    sharedStyles,
    css`
      :host {
        display: block;
        padding: 16px;
        max-width: 1200px;
        margin: 0 auto;
      }

      .header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 24px;
      }

      .header h1 {
        margin: 0;
        font-size: 1.5em;
        color: var(--eon-text-primary);
      }

      .version-badge {
        font-size: 0.75em;
        color: var(--eon-text-secondary);
        background: var(--eon-divider);
        padding: 2px 8px;
        border-radius: 12px;
      }

      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 16px;
      }

      .card {
        background: var(--eon-background);
        border-radius: var(--ha-card-border-radius, 12px);
        box-shadow: var(
          --ha-card-box-shadow,
          0 2px 2px 0 rgba(0, 0, 0, 0.14),
          0 1px 5px 0 rgba(0, 0, 0, 0.12),
          0 3px 1px -2px rgba(0, 0, 0, 0.2)
        );
        padding: 16px;
      }

      .card h2 {
        margin: 0 0 12px;
        font-size: 1.1em;
        color: var(--eon-text-primary);
      }

      .meter-row {
        display: flex;
        justify-content: space-between;
        padding: 8px 0;
        border-bottom: 1px solid var(--eon-divider);
      }

      .meter-row:last-child {
        border-bottom: none;
      }

      .label {
        color: var(--eon-text-secondary);
        font-size: 0.9em;
      }

      .loading {
        text-align: center;
        padding: 48px;
        color: var(--eon-text-secondary);
      }

      .error {
        color: var(--error-color, #db4437);
        padding: 16px;
        text-align: center;
      }

      .empty {
        color: var(--eon-text-secondary);
        padding: 16px;
        text-align: center;
        font-style: italic;
      }
    `,
  ];

  render() {
    if (this._loading) {
      return html`<div class="loading">Loading EON Next data…</div>`;
    }

    if (this._error) {
      return html`<div class="error">Error: ${this._error}</div>`;
    }

    return html`
      <div class="header">
        <h1>EON Next Energy</h1>
        ${this._version
          ? html`<span class="version-badge">v${this._version}</span>`
          : nothing}
      </div>

      <div class="grid">
        ${this._summary?.meters.map((m) => this._renderMeterCard(m)) ?? nothing}
        ${this._summary?.ev_chargers.map((ev) => this._renderEvCard(ev)) ??
        nothing}
      </div>

      ${!this._summary?.meters.length && !this._summary?.ev_chargers.length
        ? html`<div class="empty">
            No meter or EV data available. Check your integration
            configuration.
          </div>`
        : nothing}
    `;
  }

  private _renderMeterCard(meter: MeterSummary) {
    const icon = meter.type === "gas" ? "mdi:fire" : "mdi:flash";
    const label = meter.type === "gas" ? "Gas" : "Electricity";

    return html`
      <div class="card">
        <h2>
          <ha-icon .icon=${icon} style="--mdc-icon-size: 20px;"></ha-icon>
          ${label} — ${meter.serial}
        </h2>

        ${meter.daily_consumption != null
          ? html`<div class="meter-row">
              <span class="label">Today's consumption</span>
              <span class="value">${meter.daily_consumption}<span class="unit">kWh</span></span>
            </div>`
          : nothing}

        ${meter.latest_reading != null
          ? html`<div class="meter-row">
              <span class="label">Latest reading</span>
              <span class="value">${meter.latest_reading}</span>
            </div>`
          : nothing}

        ${meter.latest_reading_date
          ? html`<div class="meter-row">
              <span class="label">Reading date</span>
              <span>${meter.latest_reading_date}</span>
            </div>`
          : nothing}

        ${meter.standing_charge != null
          ? html`<div class="meter-row">
              <span class="label">Standing charge</span>
              <span class="value">£${meter.standing_charge.toFixed(2)}<span class="unit">/day</span></span>
            </div>`
          : nothing}

        ${meter.previous_day_cost != null
          ? html`<div class="meter-row">
              <span class="label">Yesterday's cost</span>
              <span class="value">£${meter.previous_day_cost.toFixed(2)}</span>
            </div>`
          : nothing}

        ${meter.unit_rate != null
          ? html`<div class="meter-row">
              <span class="label">Unit rate</span>
              <span class="value">£${meter.unit_rate.toFixed(4)}<span class="unit">/kWh</span></span>
            </div>`
          : nothing}

        ${meter.tariff_name
          ? html`<div class="meter-row">
              <span class="label">Tariff</span>
              <span>${meter.tariff_name}</span>
            </div>`
          : nothing}
      </div>
    `;
  }

  private _renderEvCard(ev: EvChargerSummary) {
    return html`
      <div class="card">
        <h2>
          <ha-icon icon="mdi:ev-station" style="--mdc-icon-size: 20px;"></ha-icon>
          EV Charger — ${ev.serial}
        </h2>

        <div class="meter-row">
          <span class="label">Schedule</span>
          <span class="value">${ev.schedule_slots > 0 ? "Active" : "No schedule"}</span>
        </div>

        ${ev.next_charge_start
          ? html`<div class="meter-row">
              <span class="label">Next charge</span>
              <span>${ev.next_charge_start} → ${ev.next_charge_end}</span>
            </div>`
          : nothing}
      </div>
    `;
  }
}

customElements.define("eon-next-panel", EonNextPanel);
