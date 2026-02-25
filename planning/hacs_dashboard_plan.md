# EON Next HACS Dashboard Plan

Date: 2026-02-25
Status: Draft
Scope: Plan for adding a custom dashboard/panel to the `eon-next-v2` HACS integration

## Goal

Provide two complementary frontend experiences, shipped from this single repo:

1. **Sidebar panel** - An opinionated, single-pane-of-glass energy overview for users who want a zero-config dashboard out of the box.
2. **Embeddable Lovelace cards** - Modular, configurable card components that power users can drop into their own custom dashboards alongside cards from other integrations.

Both the panel and the cards share the same WebSocket API, the same TypeScript source tree, and the same build pipeline. Users get both automatically on install; either can be ignored without affecting the other.

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
  "dependencies": ["recorder", "http", "frontend", "panel_custom", "lovelace"]
}
```

---

## Recommended Approach

**Ship both a sidebar panel and embeddable Lovelace cards within the integration itself** (single repo, single install).

### Rationale

1. **Single install** - Users install one HACS integration and get data + dashboard + cards
2. **Two audiences** - The panel serves casual users; the cards serve power users who curate their own dashboards
3. **No configuration** - Panel auto-registers in the sidebar; cards auto-register in the Lovelace card picker
4. **Shared code** - Panel sections and standalone cards share the same components (consumption chart, cost breakdown, EV schedule, etc.)
5. **Precedent** - HACS ships a sidebar panel; many integrations embed Lovelace cards; combining both is a natural extension
6. **Octopus Energy gap** - The closest comparable integration has neither; this is a major differentiator
7. **Simpler maintenance** - One repo, one release cycle, one version to track

### User Experience

| User Type | What They Get | How |
|---|---|---|
| **Casual user** | Full energy overview in sidebar | Panel auto-registers; click "EON Next" in sidebar |
| **Power user** | Individual cards on their own dashboards | Cards appear in the Lovelace card picker; search "EON Next" |
| **Minimalist** | Sensors only, no UI clutter | Disable panel via options flow; ignore cards |

### Trade-offs

| Pro | Con |
|---|---|
| Zero-config for both audiences | Increases integration bundle size |
| Data and UI co-versioned | Frontend build adds development complexity |
| Cards reusable across any dashboard | Must maintain card config schemas and editor UIs |
| Sidebar panel for quick overview | Users who don't want the sidebar entry must toggle it off |
| Shared components reduce duplication | Slightly larger initial JS payload (mitigated by lazy loading) |

The sidebar entry concern is mitigated by an options flow toggle to enable/disable the panel (default: enabled).

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

## Lovelace Card Design (Power Users)

The same visual components used inside the sidebar panel are also registered as standalone Lovelace cards. Power users add them to any dashboard via the card picker or YAML.

### Cards to Ship

| Card | Element Name | Description | Config Options |
|---|---|---|---|
| **Consumption Card** | `eon-next-consumption-card` | Daily electricity/gas consumption with sparkline trend | `meter_type`, `days`, `show_chart` |
| **Cost Card** | `eon-next-cost-card` | Cost breakdown with standing charges and daily total | `meter_type`, `show_standing_charge`, `show_chart` |
| **Meter Card** | `eon-next-meter-card` | Latest meter reading with date and reading history | `meter_type`, `show_history` |
| **EV Schedule Card** | `eon-next-ev-card` | Smart charging schedule timeline | `show_second_slot` |
| **Summary Card** | `eon-next-summary-card` | Compact all-in-one overview (mini version of the panel) | `show_gas`, `show_ev`, `show_costs` |

### Card Configuration Example (YAML)

```yaml
type: custom:eon-next-consumption-card
meter_type: electricity
days: 7
show_chart: true
```

### Card Registration Pattern

Cards are auto-registered in the Lovelace card picker so users can find them via the UI editor:

```javascript
// Register cards in the HA card picker
window.customCards = window.customCards || [];
window.customCards.push({
  type: "eon-next-consumption-card",
  name: "EON Next Consumption",
  preview: true,
  description: "Shows daily electricity or gas consumption with trend chart",
});
```

### Card vs Panel: Shared Components

```
┌──────────────────────────────────────────────────┐
│  Frontend Source (frontend/src/)                  │
│                                                   │
│  ┌─────────────────────────────────────────────┐ │
│  │  Shared Components (components/)             │ │
│  │  ├── consumption-view.ts                     │ │
│  │  ├── cost-view.ts                            │ │
│  │  ├── meter-view.ts                           │ │
│  │  ├── ev-schedule-view.ts                     │ │
│  │  └── sparkline-chart.ts                      │ │
│  └─────────────────────────────────────────────┘ │
│         ▲                        ▲                │
│         │                        │                │
│  ┌──────┴──────┐   ┌────────────┴────────────┐  │
│  │ Panel       │   │ Cards                    │  │
│  │ (panel.ts)  │   │ ├── consumption-card.ts  │  │
│  │ Composes    │   │ ├── cost-card.ts         │  │
│  │ all views   │   │ ├── meter-card.ts        │  │
│  │ into one    │   │ ├── ev-card.ts           │  │
│  │ full page   │   │ └── summary-card.ts      │  │
│  └─────────────┘   └─────────────────────────┘  │
│                                                   │
│  Build Output:                                    │
│  ├── entrypoint.js  (panel bundle)               │
│  └── cards.js       (card bundle)                │
└──────────────────────────────────────────────────┘
```

The panel composes all shared view components into a single full-page layout. Each card wraps a single shared view component in an `<ha-card>` element with `setConfig()` and card picker registration. This means improvements to a chart or view component benefit both the panel and the cards simultaneously.

### Embedded Card Registration (Python)

Cards are registered via `async_register_static_paths` + Lovelace resource auto-registration (storage mode). This happens in `async_setup()` (not `async_setup_entry()`) so it runs once per integration:

```python
from homeassistant.components.http import StaticPathConfig

CARDS_URL = f"/{DOMAIN}/cards"

async def async_setup(hass: HomeAssistant, config: dict) -> bool:
    """Register frontend resources (once per integration, not per entry)."""
    # Serve card JS
    cards_path = os.path.join(os.path.dirname(__file__), "frontend", "cards.js")
    await hass.http.async_register_static_paths([
        StaticPathConfig(CARDS_URL, cards_path, cache_headers=False)
    ])

    # Auto-register as Lovelace resource (storage mode only)
    lovelace = hass.data.get("lovelace")
    if lovelace and lovelace.mode == "storage":
        await lovelace.resources.async_get_info()
        resource_url = f"{CARDS_URL}?v={INTEGRATION_VERSION}"
        existing = [r for r in lovelace.resources.async_items()
                    if r["url"].startswith(CARDS_URL)]
        if not existing:
            await lovelace.resources.async_create_item(
                {"res_type": "module", "url": resource_url}
            )
        else:
            # Update version if changed
            for r in existing:
                if f"v={INTEGRATION_VERSION}" not in r["url"]:
                    await lovelace.resources.async_update_item(
                        r["id"],
                        {"res_type": "module", "url": resource_url}
                    )

    # Register WebSocket commands (shared by panel and cards)
    from .websocket import async_setup_websocket
    async_setup_websocket(hass)

    return True
```

For YAML-mode users, cards remain accessible by manually adding:
```yaml
resources:
  - url: /eon_next/cards.js
    type: module
```

---

## Technical Architecture

### File Structure

```
custom_components/eon_next/
├── __init__.py              # Modified: async_setup for cards; async_setup_entry for panel
├── const.py                 # Modified: add frontend constants + INTEGRATION_VERSION
├── manifest.json            # Modified: add frontend/http/panel_custom/lovelace deps
├── panel.py                 # New: panel registration/unregistration helpers
├── websocket.py             # New: WebSocket API commands (shared by panel + cards)
├── frontend/                # New: compiled frontend assets (checked in, not source)
│   ├── __init__.py          # Required for static path registration
│   ├── entrypoint.js        # Compiled panel bundle
│   └── cards.js             # Compiled Lovelace card bundle
└── ...existing files...

frontend/                    # New: frontend source (project root, not distributed via HACS)
├── src/
│   ├── panel.ts             # Main panel web component (composes views)
│   ├── cards/               # Standalone Lovelace card wrappers
│   │   ├── consumption-card.ts
│   │   ├── cost-card.ts
│   │   ├── meter-card.ts
│   │   ├── ev-card.ts
│   │   ├── summary-card.ts
│   │   └── register.ts      # Card picker registration (window.customCards)
│   ├── components/          # Shared view components (used by both panel and cards)
│   │   ├── consumption-view.ts
│   │   ├── cost-view.ts
│   │   ├── meter-view.ts
│   │   ├── ev-schedule-view.ts
│   │   ├── backfill-status.ts
│   │   └── sparkline-chart.ts
│   ├── api.ts               # WebSocket API client (shared)
│   ├── types.ts             # TypeScript type definitions
│   └── styles.ts            # Shared styles / HA CSS variable usage
├── rollup.config.mjs        # Rollup config (two entry points: panel + cards)
├── tsconfig.json
├── package.json
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
# Commands to register (used by both the panel and standalone cards):

"eon_next/version"
# Returns: { version: "1.4.0" }
# Used by cards for frontend/backend version mismatch detection

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

1. **`manifest.json`**: Add `"http"`, `"frontend"`, `"panel_custom"`, and `"lovelace"` to `dependencies`
2. **`const.py`**: Add frontend constants (`PANEL_TITLE`, `PANEL_ICON`, `PANEL_URL`, `CARDS_URL`, `INTEGRATION_VERSION`)
3. **`__init__.py`**: Two registration points:
   - `async_setup()` - Register card JS, Lovelace resources, and WebSocket commands (once per integration)
   - `async_setup_entry()` - Register sidebar panel (guarded, once per first entry)
   - `async_unload_entry()` - Remove panel (only when last entry unloads)
4. **`panel.py`** (new): Panel registration/unregistration helpers (following Alarmo pattern)
5. **`websocket.py`** (new): Register WebSocket command handlers (shared by panel + cards)
6. **`coordinator.py`**: Possibly expose aggregation helpers consumed by WebSocket handlers

### Frontend Build Process

Rollup is configured with **two entry points** that produce separate bundles:

```javascript
// rollup.config.mjs (simplified)
export default [
  {
    input: "src/panel.ts",
    output: { file: "../custom_components/eon_next/frontend/entrypoint.js", format: "es" },
  },
  {
    input: "src/cards/register.ts",
    output: { file: "../custom_components/eon_next/frontend/cards.js", format: "es" },
  },
];
```

```bash
# Development
cd frontend/
npm install
npm run dev          # Rollup watch mode (both bundles)

# Production build (output goes to custom_components/eon_next/frontend/)
npm run build        # Rollup production build with terser minification
```

The compiled `entrypoint.js` and `cards.js` are checked into the repo under `custom_components/eon_next/frontend/` so that HACS users don't need Node.js. This matches the pattern used by HACS itself. Shared components are tree-shaken into each bundle by Rollup.

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

### Phase 1: Skeleton (Panel + Card Infrastructure)
- Add `frontend/` source scaffold (Lit + Rollup + TypeScript, two entry points)
- Add `panel.py` with panel registration/unregistration helpers
- Add `websocket.py` with `eon_next/version` and `eon_next/dashboard_summary` commands
- Register panel in `async_setup_entry`; register card JS + Lovelace resource in `async_setup`
- Update `manifest.json` dependencies (`http`, `frontend`, `panel_custom`, `lovelace`)
- Serve a minimal "Hello from EON Next" panel
- Ship one skeleton card (`eon-next-summary-card`) registered in the card picker
- Add options flow toggle to show/hide panel (default: enabled)
- Verify HACS validation and hassfest still pass

### Phase 2: Core Dashboard Content + First Cards
- Build shared `consumption-view` and `cost-view` components
- Compose them into the sidebar panel layout
- Wrap them as standalone `eon-next-consumption-card` and `eon-next-cost-card` Lovelace cards
- Add `setConfig()`, card picker metadata, and basic config editor for each card
- Build `meter-view` component + `eon-next-meter-card`
- Implement `eon_next/consumption_history` and `eon_next/cost_history` WebSocket commands
- Add daily bar chart (consumption + cost)
- Apply HA theming (light/dark, CSS variables)
- Responsive layout for panel (desktop + mobile/narrow mode)
- Card sizing (`getCardSize()` / `getGridOptions()`) for Lovelace layout engines

### Phase 3: EV, Diagnostics, and Summary Card
- Build `ev-schedule-view` + `eon-next-ev-card` (conditional on SmartFlex devices)
- Build `backfill-status` panel section (panel-only, not a standalone card)
- Build `eon-next-summary-card` (compact all-in-one for power users)
- Add sparkline trend charts to shared components
- Polish loading states, error states, empty states
- Version mismatch detection (frontend/backend) with user notification

### Phase 4: Polish, Charts, and Card Editors
- Add time-range picker for charts (7d / 30d / 90d / 1y)
- Add month-to-date cost running total
- Build visual config editors for each card (so power users can configure via the UI)
- Refine chart interactions (tooltips, zoom)
- Accessibility audit (keyboard navigation, screen readers, contrast)
- Performance optimization (lazy loading, bundle size audit)
- YAML-mode documentation for manual card resource registration

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Frontend build complexity | Slows development velocity | Keep build minimal (Rollup + Lit only); avoid heavy frameworks |
| Bundle size bloat via charting library | Increases download for all users | Use lightweight chart lib (uPlot ~45KB vs Chart.js ~200KB); lazy-load chart code |
| HA breaking changes to panel API | Panel stops working on HA update | Pin to documented APIs only; `panel_custom.async_register_panel` is stable and used by Alarmo, HACS |
| `register_static_path` deprecation | Must use `async_register_static_paths` | Already planned; use `StaticPathConfig` from the start |
| Users don't want the sidebar entry | Clutters sidebar for users who prefer their own dashboards | Options flow toggle to disable panel; cards work independently |
| Card caching issues on update | Users see stale card JS after integration update | Version-tagged URLs (`?v=X.X.X`) + WebSocket version check + cache-bust on mismatch |
| Lovelace YAML mode users miss cards | Auto-registration only works in storage mode | Document manual resource URL in README; static path remains accessible |
| WebSocket commands expose sensitive data | Security concern | Only expose aggregated consumption/cost data; no auth tokens or credentials; validate connection user |
| HACS validation failures | Can't release | Run `hacs/action@main` validation in CI before merge |
| Coordinator data not sufficient for charts | Need history queries | Leverage HA's recorder/statistics API for historical data, or add summary caching to coordinator |

---

## Open Questions

1. **Chart library selection**: uPlot (tiny, fast, canvas-based) vs Chart.js (popular, more features, heavier) vs custom SVG (smallest, most work). Recommendation: start with uPlot for size efficiency.

2. **Historical data source**: Should charts pull from the coordinator's cached data, the HA recorder/statistics database, or the EON Next API directly? Recommendation: prefer HA statistics (already populated by our external statistics import), fall back to coordinator cache for current-day data.

3. **Sidebar icon and title**: Use `mdi:lightning-bolt` and "EON Next"? Or something more specific like `mdi:home-lightning-bolt` and "Energy"? Should be configurable in options flow.

4. **Multi-account support**: The integration supports multiple config entries (accounts). Should the panel show data for all accounts or have an account selector? Cards could accept a config entry ID. Recommendation: account selector dropdown in panel; optional `account` config key in cards.

5. **Card config editors**: Should we ship visual editors (`getConfigElement()`) from Phase 2, or defer to Phase 4? Editors are important for power users who use the UI dashboard editor, but add development effort. Recommendation: ship basic editors in Phase 2 for the core cards.

6. **Shared component bundling**: Should the panel and card bundles share code via import maps, or should Rollup tree-shake shared code into each bundle independently? Independent bundles are simpler but slightly larger. Recommendation: independent bundles initially; optimize later if bundle size becomes a concern.

---

## Future Direction: Standalone Energy UI Integration

The embedded approach (cards shipped inside this integration) is the right choice today — it keeps everything co-versioned and gives users a single install. However, the shared view components (consumption charts, cost breakdowns, EV schedules, etc.) are designed with reusability in mind and are not inherently tied to the EON Next API.

**Long-term vision**: Extract the frontend components into a **separate, provider-agnostic HACS "Dashboard" integration** (e.g., `energy-dashboard-cards`) that works with any energy provider — EON Next, Octopus Energy, Hildebrand Glow, or even the built-in HA Energy platform. This would:

- Accept generic entity IDs for consumption, cost, meter readings, and EV schedules (rather than being hard-wired to EON Next entities)
- Ship as a standalone HACS Frontend repo, installable independently
- Be discoverable in the HACS "Frontend" category for broader adoption
- Support multiple providers on a single dashboard (e.g., electricity from one provider, gas from another)

**How to prepare now** (without over-engineering):

1. Keep shared view components in `frontend/src/components/` decoupled from EON Next–specific WebSocket commands — they should accept data via properties, not fetch it themselves
2. Use the WebSocket API layer (`api.ts`) as the only place that knows about `eon_next/*` command names
3. Design card configs to accept arbitrary entity IDs alongside the current auto-discovery from EON Next entities
4. When the standalone repo is eventually created, the shared components can be extracted with minimal refactoring, and this integration's cards can become thin wrappers that auto-configure entity IDs from the EON Next config entry

This is not planned work — just a guiding principle for how we structure the frontend code today so that the option remains open.

---

## Definition of Done

### Panel
- [ ] Panel auto-registers in HA sidebar when integration is loaded
- [ ] Panel shows electricity and gas consumption overview
- [ ] Panel shows cost breakdown with standing charges
- [ ] Panel shows meter readings
- [ ] Panel shows EV schedule when SmartFlex devices are present
- [ ] Panel respects HA theme (light/dark)
- [ ] Panel is responsive (desktop and mobile)
- [ ] Options flow toggle to enable/disable sidebar panel

### Lovelace Cards
- [ ] Cards auto-register as Lovelace resources (storage mode)
- [ ] Cards appear in the Lovelace card picker with name, description, and preview
- [ ] Each card accepts configuration via `setConfig()` and the visual editor
- [ ] Cards work independently of the sidebar panel (no panel required)
- [ ] Cards display correctly in masonry, grid, and panel dashboard layouts
- [ ] Frontend/backend version mismatch detection with user notification

### Infrastructure
- [ ] Frontend source builds cleanly with `npm run build` (two bundles: panel + cards)
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
- [Community Guide: Embedded Lovelace Card in an Integration](https://community.home-assistant.io/t/developer-guide-embedded-lovelace-card-in-a-home-assistant-integration/974909)
- [HA Developer Docs: Custom Card](https://developers.home-assistant.io/docs/frontend/custom-ui/custom-card/)
