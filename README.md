# E.ON Next for Home Assistant

Custom integration for E.ON Next accounts in Home Assistant.

## What This Integration Provides

- Latest electricity and gas meter readings.
- Meter reading date sensors.
- Gas conversion from m3 to kWh.
- Daily consumption sensors with fallback:
  - REST consumption endpoint first.
  - `consumptionDataByMpxn` GraphQL fallback when REST data is unavailable.
- Daily standing charge sensor (inc VAT) for electricity and gas.
- Previous day total cost sensor (inc VAT) for electricity and gas.
- Current unit rate sensor (£/kWh, inc VAT) for electricity and gas — compatible with the Energy Dashboard's "use an entity with current price" option.
- Current tariff name sensor with agreement metadata (code, type, validity period) and published unit rate.
- Previous and next unit rate sensors — show the last/upcoming rate that differs from the current rate, enabling tariff-aware automations (e.g., "run the dishwasher when the cheap rate starts").
- Off-peak binary sensor — `on` during off-peak rate windows for time-of-use tariffs, `unavailable` for flat-rate tariffs. Supports automations with a simple `state: 'on'` trigger.
- Current day rates event entity — fires `rates_updated` each coordinator refresh with today's full rate schedule (start, end, rate, is_off_peak per window). Also exposes `rates` as a persistent state attribute for template sensors.
- Export unit rate and export daily consumption sensors — created automatically for detected export meters (solar/battery export).
- EV smart charging sensors (when SmartFlex devices are available):
  - Smart charging schedule status.
  - Next charge start/end.
  - Second charge start/end.
- Home Assistant re-auth support for password changes.
- Automatic retry on API outages — transient connectivity failures during login defer setup instead of invalidating stored credentials.
- Network hardening for auth/login calls: GraphQL requests now retry once over IPv4 after connector-level network-unreachable failures.
- Diagnostic status sensor for historical backfill progress.
- **EON Next Dashboard**: A sidebar panel providing a single-pane energy overview (consumption, costs, meter readings, EV schedule).
- **Lovelace cards**: Embeddable cards (starting with `eon-next-summary-card`) for power users to add to their own dashboards.

## Requirements

- Home Assistant `2024.7.0` or newer.
- An active E.ON Next account.

## Install With HACS (Recommended)

1. Open HACS in Home Assistant.
2. Go to **Integrations**.
3. If this repository is not already listed, add it as a custom repository:
   - URL: `https://github.com/monsagri/eon-next-v2`
   - Category: **Integration**
4. Find **Eon Next Integration** in HACS and install it.
5. Restart Home Assistant.
6. Go to **Settings -> Devices & Services -> Add Integration**.
7. Search for **Eon Next** and complete login.

## Manual Installation

1. Copy `custom_components/eon_next` into your Home Assistant `custom_components` directory.
2. Restart Home Assistant.
3. Add the integration from **Settings -> Devices & Services**.

## Reauthentication

If credentials expire or your password changes, Home Assistant will prompt for re-authentication. Open the integration card and complete the re-auth flow to restore updates.

## Upgrade Note

In `1.2.0`, the `Daily Consumption` sensor state class changed to `total` and now provides a data-driven `last_reset` for improved Energy Dashboard compatibility. If your instance still has long-term statistics from older semantics (such as `measurement` or `total_increasing`), you may need to recreate affected statistics/dashboard cards.

## Historical Backfill (Configurable)

The integration now supports a slow, resumable historical backfill for Energy Dashboard statistics.

- Configure it in **Settings -> Devices & Services -> Eon Next -> Configure**.
- Backfill progress is persisted and resumes across Home Assistant restarts.
- To ensure a true full-history rebuild, enable the option to clear/rebuild existing Eon statistics first.

Conservative defaults:

- Backfill disabled by default.
- Lookback: `3650` days.
- Chunk size: `1` day per request.
- Requests per run: `1`.
- Run interval: `180` minutes.
- Delay between requests: `300` seconds.

## Energy Dashboard Panel

After installation, an **EON Next** entry appears in the Home Assistant sidebar. It provides a zero-config overview of your meters, consumption, costs, and EV charging status.

- The sidebar panel is enabled by default. To hide it, go to **Settings -> Devices & Services -> Eon Next -> Configure** and disable "Show EON Next dashboard in sidebar".
- The panel uses data already fetched by the integration's coordinator — no extra API calls.
- "Today's cost" is shown as a derived value from today's consumption: `(kWh * current unit rate) + daily standing charge`.
- "Month to date" cost is shown as a running total computed from daily consumption history.
- Consumption charts support selectable time ranges (7 days, 30 days, 90 days, or 1 year) with adaptive date labels.
- EV charging schedule timestamps are displayed in a readable local date/time format.
- EV schedule widgets now show explicit `Unknown`/`No device selected` states instead of falling back to `Idle`.
- Panel and card text colors adapt to Home Assistant theme variables for improved dark-mode readability.
- Panel and card components now return to a loading state during reconnect/manual refresh cycles instead of showing stale values.
- Backfill diagnostics now render explicit loading/error/empty messages instead of a blank diagnostics block.

### Lovelace Cards

The integration ships Lovelace cards that power users can add to any dashboard:

- **EON Next Summary** (`custom:eon-next-summary-card`) — compact all-in-one overview.
- **EON Next Consumption** (`custom:eon-next-consumption-card`) — daily consumption bar chart with a time-range picker (7d / 30d / 90d / 1y), missing days shown as zero, plus an estimated daily cost overlay (£) on a second y-axis when tariff pricing is available.
- **EON Next Costs** (`custom:eon-next-cost-card`) — today/yesterday costs, month-to-date running total, standing charge, and unit rate.
- **EON Next Meter Reading** (`custom:eon-next-reading-card`) — latest meter reading, date, and tariff.
- **EON Next EV Charger** (`custom:eon-next-ev-card`) — EV smart charging schedule status and upcoming slots.
- All cards include visual config editors accessible from the Lovelace card picker UI — no YAML required to configure meter type, serial, or display options.
- Summary card rows include a derived "Today's cost" value using the same formula `(kWh * current unit rate) + daily standing charge`.
- Summary-card sparkline history loads per meter in parallel for faster initial render on multi-meter setups.

The summary card is registered by default and appears in the Lovelace card picker (storage mode). To disable it, go to **Settings -> Devices & Services -> Eon Next -> Configure** and turn off "Register EON Next summary card for Lovelace dashboards".

For YAML-mode dashboards, add the resource manually instead:

```yaml
resources:
  - url: /eon_next/cards
    type: module
```

## Development And Releases

Maintainer and release workflow is documented in [DEVELOPMENT.md](DEVELOPMENT.md).

Contributors should use Conventional Commit messages (for example, `feat: ...`, `fix: ...`) and matching pull request titles because squash merges use PR titles as final commit subjects.

Releases use a draft release-PR flow (`release-please`) so merges to `main` prepare release metadata, and maintainers explicitly approve/merge the release PR to publish.

For local development consistency:

- Node.js version is pinned in `.nvmrc` (`24.13.1`) for `nvm use`.
- Python version is pinned in `.python-version` (`3.13`) for pyenv/asdf-compatible tooling.
