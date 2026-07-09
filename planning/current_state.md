# EON Next Integration: Available Features

Date: 2026-03-01
Scope: Implemented capabilities in this repository (`eon-next-v2`)

## Summary

The integration currently provides cloud-polled monitoring for EON Next accounts through Home Assistant `sensor`, `binary_sensor`, and `event` entities.

- Platform support: `sensor`, `binary_sensor`, `event`
- Frontend: sidebar panel + Lovelace card(s)
- Services exposed: `add_cost_tracker`, `reset_cost_tracker`, `update_cost_tracker`
- Options flow: panel visibility, card visibility, backfill configuration
- Default polling interval: 30 minutes
- Auth: email/password with refresh token persistence

## Implemented Setup and Account Handling

- Home Assistant config flow with credential validation
- Re-auth flow for credential refresh
- Multiple account support (all discovered accounts are loaded)
- Refresh token persistence to reduce full re-login frequency
- Options flow for panel visibility, card registration visibility, and historical backfill configuration

## Implemented Sensor Features

### Meter sensors (per meter)

- Latest reading date
- Latest meter reading
- Daily consumption total (kWh-equivalent rollup)
- Standing charge (daily, inc VAT, GBP)
- Previous day cost (total inc VAT, GBP)
- Current tariff name (with tariff code, type, unit rate, standing charge, and validity period as attributes)
- Current unit rate (GBP/kWh, converted from pence)
- Previous unit rate (last rate that differed from current, for ToU tariffs)
- Next unit rate (upcoming rate that differs from current, for ToU tariffs)
- Previous day consumption (kWh) with entry-count/data-completeness attributes

Electricity meters add:
- Electricity reading (kWh)

Export electricity meters add:
- Export unit rate (GBP/kWh)
- Export daily consumption (kWh)

Gas meters add:
- Gas reading (m3)
- Gas reading converted to kWh

### Binary sensors (per meter)

- Off-peak indicator - `on` during off-peak rate windows for time-of-use tariffs, `unavailable` for flat-rate tariffs

### Event entities (per meter)

- Current day rates - fires `rates_updated` each coordinator refresh with today's full rate schedule (start, end, rate, is_off_peak per window)

### EV smart charging sensors (per supported charger)

- Smart charging schedule status (`Active` or `No Schedule`)
- Schedule slot list as sensor attributes
- Next charge start timestamp
- Next charge end timestamp
- Second charge slot start timestamp (if present)
- Second charge slot end timestamp (if present)

### Diagnostic sensors

- Historical backfill status (state, progress, meter completion)

### Account and tracker sensors

- Account balance (GBP) per account
- User-defined cost tracker sensors (GBP/day accumulator per tracked HA entity)

## Implemented Data Retrieval Behavior

- Meter readings: GraphQL account/meter reading queries
- Consumption retrieval: REST first, GraphQL fallback (`consumptionDataByMpxn`) when needed
- Cost data: GraphQL `consumptionDataByMpxn` for standing charge and total cost
- Tariff data: GraphQL `getAccountAgreements` for active tariff agreements per meter point
- EV schedules: SmartFlex planned dispatch query (`flexPlannedDispatches`)
- Historical backfill: configurable, resumable, throttled statistics import
- External statistics import for Energy Dashboard
- Resilience: reuses previous coordinator data on transient update failures
- Resilience: raises re-auth when auth failure is detected

## Implemented Frontend Features

- Sidebar panel (`panel_custom`) auto-registered on entry setup (toggleable via options flow, default: enabled)
- WebSocket API commands: `eon_next/version`, `eon_next/dashboard_summary`, `eon_next/consumption_history`
- `eon_next/consumption_history` returns daily consumption from HA recorder statistics for a given meter serial and day range (1–365)
- Lovelace cards: `eon-next-summary-card`, `eon-next-consumption-card`, `eon-next-consumption-breakdown-card`, `eon-next-cost-card`, `eon-next-reading-card`, `eon-next-ev-card`
- Cost breakdown card shows a doughnut pie chart of usage charges vs standing charges with day/week/month period switching
- Cost breakdown card also shows a tracker-powered tracked-vs-untracked usage split for today, with per-tracker list
- All Lovelace cards include visual config editors (accessible from the card picker UI)
- Panel and cards share compiled JS bundles served via `async_register_static_paths`
- Panel meter cards now display consumption bar chart (Chart.js, tree-shaken), cost summary grid, and meter reading section
- Consumption charts support selectable time ranges (7d / 30d / 90d / 1y) via a segmented range picker with adaptive date labels
- Panel meter rows include a derived "Today's cost" value: `(today's consumption * current unit rate) + daily standing charge`
- Cost view includes "Month to date" running cost total computed from daily consumption history
- Summary card meter rows include the same derived "Today's cost" value when costs are enabled
- EV next-charge timestamps in the panel are rendered as human-friendly local date/time strings
- Chart tooltips styled with dark/light mode support and formatted values (£ prefix for cost, 1 decimal for kWh)
- Accessibility: ARIA roles and labels on panel states, meter/EV cards, chart containers, and range picker
- Panel and summary-card foreground text colors are explicitly theme-driven for improved dark-mode contrast
- Frontend CI: ESLint, Prettier format check, TypeScript type check, Rollup build (`.github/workflows/frontend.yml`)

## Current Gaps (Not Yet Implemented)

- No calendar/switch/number/select/time/climate/water_heater platforms
- No configurable update interval (options flow exists for backfill only)

## Notes

This document intentionally describes only currently implemented capabilities in this repository.
