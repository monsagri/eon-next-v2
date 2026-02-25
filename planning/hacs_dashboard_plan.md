# EON Next HACS Dashboard Plan

Date: 2026-02-25
Status: Draft
Scope: Plan for adding a custom dashboard/panel to the `eon-next-v2` HACS integration

## Goal

Add a dedicated sidebar panel to the EON Next integration that gives users a single-pane-of-glass energy overview, removing the need for manual Lovelace card configuration or template sensors. The panel should surface the integration's existing entity data in an opinionated, polished UI.

---

## Research Summary

### Approaches Investigated

| Approach | Description | Examples | Suitability |
|---|---|---|---|
| **Sidebar Panel** | Full-page view registered in HA sidebar via `panel_custom.async_register_panel` or `async_register_built_in_panel` | HACS integration, Alarmo, Detailed Charts Panel | Best fit for a comprehensive energy dashboard |
| **Custom Lovelace Card(s)** | Reusable cards users add to their own dashboards; distributed as a separate HACS Frontend repo | Lunar Phase Card, Octopus Energy Rates Card, Sunsynk Power Flow Card | Good for modular, embeddable components |
| **Dashboard Strategy** | Auto-generating a complete Lovelace dashboard | HA Energy Dashboard (built-in) | Over-engineered for a custom integration |
| **Integration + Companion Card** | Backend integration ships data; separate repo ships card(s) | Lunar Phase (integration) + Lunar Phase Card (frontend) | Clean separation but higher maintenance |

### Key Reference Implementations

1. **HACS Integration** ([hacs/integration](https://github.com/hacs/integration))
   - Registers a sidebar panel via `async_register_built_in_panel` with `component_name="custom"`
   - Serves static frontend via `async_register_static_paths`
   - Frontend built as a separate compiled JS bundle (`entrypoint.js`)
   - Uses `embed_iframe: True` for isolation
   - Manifest dependencies: `http`, `websocket_api`, `frontend`, `lovelace`
   - WebSocket commands for backend data retrieval

2. **Detailed Charts Panel** ([jayjojayson/detailed-charts-panel](https://github.com/jayjojayson/detailed-charts-panel))
   - Registers via `panel_custom` configuration
   - Chart.js for visualizations
   - Pure JavaScript (no build step required for simple cases)
   - WebSocket API for historical sensor data

3. **Lunar Phase** ([ngocjohn/lunar-phase](https://github.com/ngocjohn/lunar-phase))
   - Backend integration ships sensors
   - Separate HACS Frontend repo ships the visual card
   - Clean separation of concerns

4. **Alarmo** ([nielsfaber/alarmo](https://github.com/nielsfaber/alarmo))
   - Ships a configuration sidebar panel bundled directly in the integration directory
   - Uses the simpler `panel_custom.async_register_panel()` API
   - Properly unregisters panel via `frontend.async_remove_panel()` on unload
   - Manifest dependencies: `http`, `frontend`, `panel_custom`
   - Best reference for our use case (simpler than HACS's PyPI-published frontend)

5. **Octopus Energy** ([BottlecapDave/HomeAssistant-OctopusEnergy](https://github.com/BottlecapDave/HomeAssistant-OctopusEnergy))
   - Closest comparable integration (UK energy provider, Kraken API)
   - Pure backend - no custom panel, relies on HA's native Energy Dashboard
   - Companion Lovelace cards exist as separate community projects

### Panel Registration APIs

There are two APIs for registering sidebar panels. We should use the simpler one:

| API | Complexity | Used By | Recommendation |
|---|---|---|---|
| `panel_custom.async_register_panel()` | Simple, high-level | Alarmo, community integrations | **Use this** |
| `frontend.async_register_built_in_panel()` | Low-level, more control | HACS, HA core integrations | Overkill for our needs |

### Technical Foundation

**Panel registration** (recommended pattern, following Alarmo):
```python
from homeassistant.components import panel_custom, frontend
from homeassistant.components.http import StaticPathConfig

PANEL_URL = f"/api/{DOMAIN}/panel"

# Guard: only register once (multiple config entries share one panel)
if DOMAIN in hass.data.get("frontend_panels", {}):
    return

# Serve the compiled frontend JS file
panel_path = os.path.join(os.path.dirname(__file__), "frontend", "entrypoint.js")
await hass.http.async_register_static_paths([
    StaticPathConfig(PANEL_URL, panel_path, cache_headers=False)
])

# Register the sidebar panel
await panel_custom.async_register_panel(
    hass,
    webcomponent_name="eon-next-panel",
    frontend_url_path=DOMAIN,
    module_url=PANEL_URL,
    sidebar_title="EON Next",
    sidebar_icon="mdi:lightning-bolt",
    require_admin=False,
    config={},
)
```

**Panel cleanup on unload** (only when last entry is removed):
```python
async def async_unload_entry(hass, entry):
    # ... existing unload logic ...
    # Only remove panel if no other config entries remain
    if hass.data.get("frontend_panels", {}).get(DOMAIN):
        remaining = [e for e in hass.config_entries.async_entries(DOMAIN)
                     if e.entry_id != entry.entry_id]
        if not remaining:
            frontend.async_remove_panel(hass, DOMAIN)
```

**Panel custom element** (Lit):
```typescript
import { LitElement, html, css } from "lit";
import { property } from "lit/decorators.js";

class EonNextPanel extends LitElement {
  @property({ type: Object }) hass!: any;
  @property({ type: Boolean }) narrow!: boolean;
  @property({ type: Object }) route!: any;
  @property({ type: Object }) panel!: any;

  render() {
    return html`<div>EON Next Energy Dashboard</div>`;
  }
}

customElements.define("eon-next-panel", EonNextPanel);
```

**`embed_iframe` guidance**:
| Scenario | `embed_iframe` | Reason |
|---|---|---|
| LitElement / vanilla web component | `false` | Direct DOM access, native HA integration |
| React / Vue / Angular panel | `true` | Prevents framework conflicts |
| Large isolated app (like HACS) | `true` | Full isolation, separate lifecycle |

We use LitElement, so `embed_iframe` is not needed (simpler, lighter weight, direct `hass` object access).

**Manifest dependencies required**:
```json
{
  "dependencies": ["recorder", "http", "frontend", "panel_custom"]
}
```

---

## Recommended Approach

**Ship a sidebar panel within the integration itself** (not a separate repo).

### Rationale

1. **Single install** - Users install one HACS integration and get both data + dashboard
2. **Tight coupling** - The dashboard is purpose-built for our entities and coordinator data
3. **No configuration** - Panel auto-registers on integration setup; no YAML or manual card config
4. **Precedent** - HACS itself uses this exact pattern successfully
5. **Simpler maintenance** - One repo, one release cycle, one version to track
6. **Octopus Energy gap** - The closest comparable integration has no dashboard; this is a differentiator

### Trade-offs

| Pro | Con |
|---|---|
| Zero-config user experience | Increases integration bundle size |
| Data and UI co-versioned | Frontend build adds development complexity |
| Sidebar visibility (always one click away) | Users who prefer their own dashboards can't remove the sidebar entry easily |
| Direct access to coordinator data via WebSocket | Requires maintaining JS/TS tooling alongside Python |

The sidebar entry concern can be mitigated with an options flow toggle to enable/disable the panel.

---

## Dashboard Content Design

### What to Show

Based on current entities, API capabilities, and what would differentiate this from the generic HA Energy Dashboard:

#### Section 1: Account Overview (Header)
- Account holder / account number (from API)
- Number of meters connected
- Last data refresh timestamp
- Backfill status indicator (if enabled)

#### Section 2: Energy Consumption
- **Electricity**: Today's consumption (kWh), yesterday's consumption, 7-day trend sparkline
- **Gas**: Today's consumption (kWh), yesterday's consumption, 7-day trend sparkline
- **Chart**: Daily consumption bar chart (electricity + gas overlaid), configurable time range
- Pull data from existing `daily_consumption` sensors and coordinator history

#### Section 3: Costs
- Today's estimated cost (electricity + gas combined)
- Yesterday's cost breakdown (electricity, gas, standing charges)
- Month-to-date running total (calculated from daily cost sensors)
- Standing charge breakdown
- Cost chart aligned with consumption chart

#### Section 4: Meter Readings
- Latest electricity reading (kWh) with date
- Latest gas reading (m3 and kWh) with date
- Reading history table (last 10 readings)

#### Section 5: EV Smart Charging (conditional - only if SmartFlex devices exist)
- Schedule status (Active / No Schedule)
- Visual timeline of upcoming charge slots
- Next charge start/end times
- Second slot if available

#### Section 6: Backfill Status (conditional - only if backfill enabled)
- Progress indicator (completed meters / total meters)
- Per-meter status breakdown
- Next scheduled backfill time

### Future Sections (as integration features expand)
- Tariff and unit rate display (when Tier 2 features land)
- Off-peak period indicators
- Export tariff earnings
- Cost comparison / budget tracking

---

## Technical Architecture

### File Structure

```
custom_components/eon_next/
├── __init__.py              # Modified: add panel registration
├── const.py                 # Modified: add panel constants
├── manifest.json            # Modified: add frontend/http dependencies
├── websocket.py             # New: WebSocket API commands
├── frontend/                # New: compiled frontend assets
│   ├── entrypoint.js        # Compiled panel bundle (checked in)
│   └── entrypoint.js.gz     # Gzipped variant (optional)
└── ...existing files...

frontend/                    # New: frontend source (project root, not distributed)
├── src/
│   ├── eon-next-panel.ts    # Main panel web component
│   ├── components/
│   │   ├── consumption-card.ts
│   │   ├── cost-card.ts
│   │   ├── meter-card.ts
│   │   ├── ev-schedule-card.ts
│   │   ├── backfill-status.ts
│   │   └── sparkline-chart.ts
│   ├── api.ts               # WebSocket API client
│   ├── types.ts              # TypeScript type definitions
│   └── styles.ts             # Shared styles / HA CSS variable usage
├── rollup.config.mjs        # Rollup bundler config
├── tsconfig.json             # TypeScript config
├── package.json              # Node dependencies
└── package-lock.json
```

### Technology Stack

| Layer | Choice | Rationale |
|---|---|---|
| **UI Framework** | Lit 3 (LitElement) | HA's own frontend uses Lit; best compatibility with HA theming and CSS variables |
| **Language** | TypeScript | Type safety, better maintainability |
| **Bundler** | Rollup | HA ecosystem standard; produces clean ES module bundles |
| **Charts** | Lightweight option (e.g., uPlot or Chart.js) | Must be bundleable; avoid heavy deps |
| **Backend comms** | HA WebSocket API | Standard HA pattern; `hass.callWS()` from the panel |
| **Styling** | HA CSS custom properties | Automatic dark/light theme support |

### WebSocket API Design

The panel needs data beyond what entity states provide. Define WebSocket commands in `websocket.py`:

```python
# Commands to register:

"eon_next/dashboard_summary"
# Returns: aggregated consumption, cost, and meter data for the dashboard
# Pulls from coordinator data and/or entity states

"eon_next/consumption_history"
# Args: { meter_type: "electricity"|"gas", days: int }
# Returns: daily consumption array for charting

"eon_next/cost_history"
# Args: { meter_type: "electricity"|"gas", days: int }
# Returns: daily cost array for charting

"eon_next/ev_schedule"
# Returns: current EV schedule details (if SmartFlex devices exist)

"eon_next/backfill_status"
# Returns: detailed backfill progress
```

### Backend Changes

1. **`manifest.json`**: Add `"http"`, `"frontend"`, and `"panel_custom"` to `dependencies`
2. **`const.py`**: Add panel-related constants (`PANEL_TITLE`, `PANEL_ICON`, `PANEL_URL`)
3. **`__init__.py`**: Call `panel_custom.async_register_panel()` in `async_setup_entry`; call `frontend.async_remove_panel()` in `async_unload_entry`
4. **`websocket.py`** (new): Register WebSocket command handlers
5. **`coordinator.py`**: Possibly expose aggregation helpers consumed by WebSocket handlers

### Frontend Build Process

```bash
# Development
cd frontend/
npm install
npm run dev          # Rollup watch mode

# Production build (output goes to custom_components/eon_next/frontend/)
npm run build        # Rollup production build with terser minification
```

The compiled `entrypoint.js` is checked into the repo under `custom_components/eon_next/frontend/` so that HACS users don't need Node.js. This matches the pattern used by HACS itself.

### CI Integration

Add a GitHub Actions workflow to verify the frontend build:
```yaml
# .github/workflows/frontend.yml
- Runs on PRs that touch frontend/ source
- npm ci && npm run build
- Verifies the built output matches what's committed
```

---

## Implementation Phases

### Phase 1: Skeleton Panel
- Add `frontend/` source scaffold (Lit + Rollup + TypeScript)
- Register the panel in `__init__.py`
- Serve a minimal "Hello from EON Next" panel
- Add `websocket.py` with a single `eon_next/dashboard_summary` command
- Update `manifest.json` dependencies
- Add options flow toggle to show/hide panel (default: enabled)
- Verify HACS validation and hassfest still pass

### Phase 2: Core Dashboard Content
- Build consumption overview cards (electricity + gas)
- Build cost overview cards with standing charge breakdown
- Build meter readings section
- Implement `eon_next/consumption_history` and `eon_next/cost_history` WebSocket commands
- Add daily bar chart (consumption + cost)
- Apply HA theming (light/dark, CSS variables)
- Responsive layout (desktop + mobile/narrow mode)

### Phase 3: EV and Diagnostics
- Build EV smart charging schedule visualization (conditional section)
- Build backfill status indicator (conditional section)
- Add sparkline trend charts for quick overview
- Polish loading states, error states, empty states

### Phase 4: Polish and Charts
- Add time-range picker for charts (7d / 30d / 90d / 1y)
- Add month-to-date cost running total
- Refine chart interactions (tooltips, zoom)
- Accessibility audit (keyboard navigation, screen readers, contrast)
- Performance optimization (lazy loading, bundle size audit)

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Frontend build complexity | Slows development velocity | Keep build minimal (Rollup + Lit only); avoid heavy frameworks |
| Bundle size bloat via charting library | Increases download for all users | Use lightweight chart lib (uPlot ~45KB vs Chart.js ~200KB); lazy-load chart code |
| HA breaking changes to panel API | Panel stops working on HA update | Pin to documented APIs only; `panel_custom.async_register_panel` is stable and used by Alarmo, HACS |
| `register_static_path` deprecation | Must use `async_register_static_paths` | Already planned; use `StaticPathConfig` from the start |
| Users don't want the sidebar entry | Clutters sidebar for users who prefer their own dashboards | Options flow toggle to disable the panel |
| WebSocket commands expose sensitive data | Security concern | Only expose aggregated consumption/cost data; no auth tokens or credentials; validate connection user |
| HACS validation failures | Can't release | Run `hacs/action@main` validation in CI before merge |
| Coordinator data not sufficient for charts | Need history queries | Leverage HA's recorder/statistics API for historical data, or add summary caching to coordinator |

---

## Open Questions

1. **Chart library selection**: uPlot (tiny, fast, canvas-based) vs Chart.js (popular, more features, heavier) vs custom SVG (smallest, most work). Recommendation: start with uPlot for size efficiency.

2. **Historical data source**: Should charts pull from the coordinator's cached data, the HA recorder/statistics database, or the EON Next API directly? Recommendation: prefer HA statistics (already populated by our external statistics import), fall back to coordinator cache for current-day data.

3. **Panel vs card long-term**: Should we eventually also offer standalone Lovelace cards in a companion HACS Frontend repo? Could extract chart components into cards later. Keep as a future option, not a Phase 1 concern.

4. **Sidebar icon and title**: Use `mdi:lightning-bolt` and "EON Next"? Or something more specific like `mdi:home-lightning-bolt` and "Energy"? Should be configurable in options flow.

5. **Multi-account support**: The integration supports multiple config entries (accounts). Should the panel show data for all accounts or have an account selector? Recommendation: account selector dropdown if more than one entry exists.

---

## Definition of Done

- [ ] Panel auto-registers in HA sidebar when integration is loaded
- [ ] Panel shows electricity and gas consumption overview
- [ ] Panel shows cost breakdown with standing charges
- [ ] Panel shows meter readings
- [ ] Panel shows EV schedule when SmartFlex devices are present
- [ ] Panel respects HA theme (light/dark)
- [ ] Panel is responsive (desktop and mobile)
- [ ] Options flow toggle to enable/disable sidebar panel
- [ ] Frontend source builds cleanly with `npm run build`
- [ ] CI validates frontend build on PRs
- [ ] HACS validation passes
- [ ] hassfest validation passes
- [ ] All existing tests continue to pass
- [ ] CHANGELOG and version metadata updated per release conventions

---

## References

- [HA Developer Docs: Creating Custom Panels](https://developers.home-assistant.io/docs/frontend/custom-ui/creating-custom-panels/)
- [HA Integration: panel_custom](https://www.home-assistant.io/integrations/panel_custom/)
- [HA Developer Blog: async_register_static_paths migration](https://developers.home-assistant.io/blog/2024/06/18/async_register_static_paths/)
- [HACS Integration frontend.py](https://github.com/hacs/integration/blob/main/custom_components/hacs/frontend.py)
- [Alarmo panel.py (simpler pattern)](https://github.com/nielsfaber/alarmo/blob/main/custom_components/alarmo/panel.py)
- [Lit Web Components](https://lit.dev/)
- [HA Custom Card Rollup+TS+Lit Starter](https://github.com/grillp/ha-custom-card-rollup-ts-lit-starter)
- [Community Guide: Adding a Sidebar Panel](https://community.home-assistant.io/t/how-to-add-a-sidebar-panel-to-a-home-assistant-integration/981585)
- [Detailed Charts Panel (example)](https://github.com/jayjojayson/detailed-charts-panel)
- [Octopus Energy Integration](https://github.com/BottlecapDave/HomeAssistant-OctopusEnergy)
- [Lunar Phase Integration](https://github.com/ngocjohn/lunar-phase)
