import { LitElement, html, nothing } from "lit";
import { property } from "lit/decorators.js";
import { getVersion, getDashboardSummary } from "./api";
import { WsDataController } from "./controllers/ws-data-controller";
import { renderMeterCard } from "./templates/meter-card";
import { renderEvCard } from "./templates/ev-card";
import type {
  HomeAssistant,
  PanelRoute,
  PanelInfo,
  DashboardSummary,
  VersionResponse,
} from "./types";

import sharedStyles from "./styles/shared.css";
import panelStyles from "./styles/panel.css";

class EonNextPanel extends LitElement {
  static styles = [sharedStyles, panelStyles];

  @property({ attribute: false }) hass!: HomeAssistant;
  @property({ type: Boolean }) narrow!: boolean;
  @property({ attribute: false }) route!: PanelRoute;
  @property({ attribute: false }) panel!: PanelInfo;

  private _version = new WsDataController<VersionResponse>(this, (h) =>
    getVersion(h),
  );
  private _summary = new WsDataController<DashboardSummary>(this, (h) =>
    getDashboardSummary(h),
  );

  render() {
    if (this._summary.loading) {
      return html`<div class="loading">Loading EON Next data…</div>`;
    }

    if (this._summary.error) {
      return html`<div class="error">Error: ${this._summary.error}</div>`;
    }

    const { data } = this._summary;
    const version = this._version.data?.version;

    return html`
      <div class="header">
        <h1>EON Next Energy</h1>
        ${version
          ? html`<span class="version-badge">v${version}</span>`
          : nothing}
      </div>

      <div class="grid">
        ${data?.meters.map(renderMeterCard) ?? nothing}
        ${data?.ev_chargers.map(renderEvCard) ?? nothing}
      </div>

      ${!data?.meters.length && !data?.ev_chargers.length
        ? html`<div class="empty">
            No meter or EV data available. Check your integration
            configuration.
          </div>`
        : nothing}
    `;
  }
}

customElements.define("eon-next-panel", EonNextPanel);
