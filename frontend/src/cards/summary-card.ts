import { LitElement, html, css, nothing } from "lit";
import { property, state } from "lit/decorators.js";
import { sharedStyles } from "../styles";
import { getDashboardSummary } from "../api";
import type { HomeAssistant, DashboardSummary, MeterSummary } from "../types";

export interface SummaryCardConfig {
  type: string;
  show_gas?: boolean;
  show_ev?: boolean;
  show_costs?: boolean;
}

class EonNextSummaryCard extends LitElement {
  @property({ attribute: false }) hass!: HomeAssistant;
  @state() private _config!: SummaryCardConfig;
  @state() private _summary: DashboardSummary | null = null;
  @state() private _error: string | null = null;

  setConfig(config: SummaryCardConfig): void {
    this._config = {
      show_gas: true,
      show_ev: true,
      show_costs: true,
      ...config,
    };
  }

  getCardSize(): number {
    return 3;
  }

  firstUpdated(): void {
    this._loadData();
  }

  private async _loadData(): Promise<void> {
    if (!this.hass) return;
    try {
      this._summary = await getDashboardSummary(this.hass);
      this._error = null;
    } catch (err) {
      this._error = err instanceof Error ? err.message : String(err);
    }
  }

  static styles = [
    sharedStyles,
    css`
      ha-card {
        padding: 16px;
      }

      .title {
        font-size: 1.1em;
        font-weight: 500;
        margin-bottom: 12px;
        color: var(--eon-text-primary);
      }

      .meter-section {
        margin-bottom: 12px;
      }

      .meter-label {
        display: flex;
        align-items: center;
        gap: 4px;
        font-weight: 500;
        margin-bottom: 4px;
        color: var(--eon-text-primary);
      }

      .stat-row {
        display: flex;
        justify-content: space-between;
        padding: 4px 0;
        font-size: 0.9em;
      }

      .stat-label {
        color: var(--eon-text-secondary);
      }

      .error {
        color: var(--error-color, #db4437);
        font-size: 0.9em;
      }
    `,
  ];

  render() {
    if (this._error) {
      return html`<ha-card>
        <div class="error">Error: ${this._error}</div>
      </ha-card>`;
    }

    if (!this._summary) {
      return html`<ha-card>
        <div class="card-content secondary-text">Loading…</div>
      </ha-card>`;
    }

    const electricity = this._summary.meters.filter(
      (m) => m.type === "electricity",
    );
    const gas = this._summary.meters.filter((m) => m.type === "gas");
    const showGas = this._config.show_gas !== false;
    const showEv = this._config.show_ev !== false;
    const showCosts = this._config.show_costs !== false;

    return html`
      <ha-card>
        <div class="title">
          <ha-icon icon="mdi:lightning-bolt" style="--mdc-icon-size: 18px;"></ha-icon>
          EON Next Summary
        </div>

        ${electricity.map((m) => this._renderMeter(m, "Electricity", "mdi:flash", showCosts))}
        ${showGas ? gas.map((m) => this._renderMeter(m, "Gas", "mdi:fire", showCosts)) : nothing}

        ${showEv && this._summary.ev_chargers.length > 0
          ? html`<div class="meter-section">
              <div class="meter-label">
                <ha-icon icon="mdi:ev-station" style="--mdc-icon-size: 16px;"></ha-icon>
                EV Charging
              </div>
              ${this._summary.ev_chargers.map(
                (ev) => html`
                  <div class="stat-row">
                    <span class="stat-label">Status</span>
                    <span>${ev.schedule_slots > 0 ? "Scheduled" : "Idle"}</span>
                  </div>
                `,
              )}
            </div>`
          : nothing}
      </ha-card>
    `;
  }

  private _renderMeter(
    meter: MeterSummary,
    label: string,
    icon: string,
    showCosts: boolean,
  ) {
    return html`
      <div class="meter-section">
        <div class="meter-label">
          <ha-icon .icon=${icon} style="--mdc-icon-size: 16px;"></ha-icon>
          ${label}
        </div>

        ${meter.daily_consumption != null
          ? html`<div class="stat-row">
              <span class="stat-label">Today</span>
              <span>${meter.daily_consumption} kWh</span>
            </div>`
          : nothing}

        ${showCosts && meter.previous_day_cost != null
          ? html`<div class="stat-row">
              <span class="stat-label">Yesterday cost</span>
              <span>£${meter.previous_day_cost.toFixed(2)}</span>
            </div>`
          : nothing}

        ${showCosts && meter.standing_charge != null
          ? html`<div class="stat-row">
              <span class="stat-label">Standing charge</span>
              <span>£${meter.standing_charge.toFixed(2)}/day</span>
            </div>`
          : nothing}
      </div>
    `;
  }
}

customElements.define("eon-next-summary-card", EonNextSummaryCard);
