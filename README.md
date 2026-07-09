<img src="frontend/brand/eon-next-icon-terracotta-512.png" alt="EON Next" width="88" align="left" />

# E.ON Next for Home Assistant

A custom integration that brings your E.ON Next electricity, gas and EV‑charging data into Home Assistant — with a purpose‑built **dashboard app** in the sidebar, Energy Dashboard integration, tariff‑aware sensors, and Lovelace cards.

<br clear="left" />

[![Sponsor](https://img.shields.io/badge/Sponsor-%E2%9D%A4-ea4aaa?logo=githubsponsors&logoColor=white)](https://github.com/sponsors/monsagri)
[![Buy Me a Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-ffdd00?logo=buymeacoffee&logoColor=black)](https://buymeacoffee.com/monsagri)

---

## The EON Next dashboard

After installation an **EON Next** entry appears in the Home Assistant sidebar (marked with the ⚡ lightning‑bolt brand). It opens a zero‑config dashboard app with a left‑nav page switcher. The design leads with **money and comparison** rather than a live "today" total, and keeps the **fixed daily standing charge visible everywhere** — consumption charts are stacked bars where energy used sits on top of the standing‑charge floor, so you can see what you pay before using anything.

| Page | What it shows |
|---|---|
| **Overview** | Month‑to‑date spend, a projected month‑end total vs last month, a usage‑vs‑standing‑charge split bar, per‑fuel summary cards with 7‑day mini charts, your tariff at a glance, and meter health. |
| **Electricity** / **Gas** | A stacked daily‑cost chart (usage on top of the standing charge) with a 7d / 30d / 90d / 1y range toggle, headline stat cards (this month, yesterday, unit rate, standing charge), and the latest meter reading. |
| **Tariff & rates** | Current / previous / next unit rates and standing charges, plus today's rate shape — flat, or shaded off‑peak windows for time‑of‑use tariffs. |
| **EV charging** | Smart‑charging status, the next scheduled charges, and a half‑hourly schedule strip. |
| **Settings** | Where account, refresh‑interval and backfill controls live (managed from the integration options), plus historical‑backfill status. |

Notes:

- The panel uses data already fetched by the integration's coordinator — **no extra API calls**.
- Consumption cost bars apply **today's** unit rate to historical usage (an approximation, surfaced as a footnote in the app), since the API exposes only current rates; standing‑charge segments use the fixed per‑day charge.
- "Month to date" is a running total computed from daily consumption history; charts offer 7‑day, 30‑day, 90‑day and 1‑year ranges with adaptive labels.
- On phones (including the iOS/Android Companion apps) a menu button in the top bar opens the Home Assistant sidebar, so you can always navigate away from the dashboard.
- The panel is enabled by default. To hide it, go to **Settings → Devices & Services → Eon Next → Configure** and disable "Show EON Next dashboard in sidebar".

## Branding

The integration's brand is a **lightning bolt** on a rounded tile:

- **Terracotta** tile / white bolt for light contexts, and a **dark** tile / terracotta bolt with a tan outline for dark contexts.
- The bolt is the panel's brand mark and the Home Assistant **sidebar icon** (`mdi:lightning-bolt`), so the integration reads consistently across the app and HA config surfaces.
- Source assets live in [`frontend/brand/`](frontend/brand/) (SVG + PNG, plus a favicon and a wordmark lockup).

## What this integration provides

### Meters, readings and consumption

- Latest electricity and gas meter readings, with reading‑date sensors.
- Gas conversion from m³ to kWh.
- Daily consumption sensors with a deliberate fallback chain: REST half‑hourly → REST daily.
- Previous‑day consumption sensor (kWh) with data‑quality attributes (`entry_count`, `data_complete`).

### Tariffs, rates and cost

- Daily standing charge sensor (inc VAT) for electricity and gas.
- Previous‑day total cost sensor (inc VAT) for electricity and gas.
- Current unit rate sensor (£/kWh, inc VAT) — compatible with the Energy Dashboard's "use an entity with current price" option.
- Current tariff name sensor with agreement metadata (code, type, validity period) and published unit rate.
- Account balance sensor per account (£), refreshed on coordinator updates.
- **Previous** and **next** unit‑rate sensors — the last/upcoming rate that differs from the current rate, enabling tariff‑aware automations (e.g. "run the dishwasher when the cheap rate starts").
- **Off‑peak** binary sensor — `on` during off‑peak windows for time‑of‑use tariffs, `unavailable` for flat‑rate tariffs. The off‑peak sensor and the Current/Previous/Next unit‑rate sensors update exactly at each rate‑window boundary (not only on the 30‑minute poll), so boundary‑triggered automations fire on time.
- **Current‑day rates** event entity — fires `rates_updated` when the day's schedule or tariff changes (and at midnight rollover), with today's full schedule (start, end, rate, `is_off_peak` per window) also exposed as a persistent `rates` attribute for template sensors.
- **Export** unit‑rate and export daily‑consumption sensors — created automatically for detected export meters (solar/battery). Export meters get these dedicated Export sensors only, so they no longer show duplicate entity pairs.

### Cost trackers

Per‑device cost tracking with persistent storage, managed via services:

- `eon_next.add_cost_tracker` — create a tracker for a selected power/energy entity and meter tariff.
- `eon_next.reset_cost_tracker` — zero one or more trackers.
- `eon_next.update_cost_tracker` — enable/disable one or more trackers.
- `eon_next.remove_cost_tracker` — delete one or more trackers and their sensor entities.

Reset/update/remove accept device/area/label targets (not only entities) and reject entities that aren't E.ON Next cost trackers instead of silently doing nothing. The cost‑breakdown UI includes a tracker‑powered "tracked vs untracked usage (today)" view and a per‑tracker cost list when trackers exist for the selected meter.

### EV smart charging

When SmartFlex devices are available: smart‑charging schedule status, next charge start/end, and second charge start/end — surfaced on the dashboard's **EV charging** page.

### Energy Dashboard & statistics

- Current‑price and consumption entities wire directly into Home Assistant's Energy Dashboard.
- A slow, resumable **historical backfill** imports long‑term statistics (see below).
- A diagnostic status sensor reports backfill progress.

### Reliability

- Home Assistant re‑auth support for password changes.
- Transient connectivity failures during login defer setup instead of invalidating stored credentials.
- Auth/login GraphQL requests retry once over IPv4 after connector‑level network‑unreachable failures.

## Lovelace cards

Alongside the sidebar dashboard, the integration ships embeddable Lovelace cards for custom dashboards:

- **EON Next Summary** (`custom:eon-next-summary-card`) — compact all‑in‑one overview.
- **EON Next Consumption** (`custom:eon-next-consumption-card`) — daily consumption bar chart with a 7d/30d/90d/1y picker, missing days shown as zero, and an estimated daily‑cost overlay when tariff pricing is available.
- **EON Next Cost Breakdown** (`custom:eon-next-consumption-breakdown-card`) — usage vs standing‑charge pie chart with day/week/month views.
- **EON Next Costs** (`custom:eon-next-cost-card`) — today/yesterday costs, month‑to‑date running total, standing charge, and unit rate.
- **EON Next Meter Reading** (`custom:eon-next-reading-card`) — latest reading, date, and tariff.
- **EON Next EV Charger** (`custom:eon-next-ev-card`) — EV smart‑charging status and upcoming slots.

All cards include visual config editors in the Lovelace card picker — no YAML required to set meter type, serial, or display options.

The summary card is registered by default and appears in the card picker (storage mode). To disable it, go to **Settings → Devices & Services → Eon Next → Configure** and turn off "Register EON Next summary card for Lovelace dashboards". For YAML‑mode dashboards, add the resource manually:

```yaml
resources:
  - url: /eon_next/cards
    type: module
```

## Requirements

- Home Assistant `2024.7.0` or newer.
- An active E.ON Next account.

## Install with HACS (recommended)

1. Open HACS in Home Assistant.
2. Go to **Integrations**.
3. If this repository is not already listed, add it as a custom repository:
   - URL: `https://github.com/monsagri/eon-next-v2`
   - Category: **Integration**
4. Find **Eon Next Integration** in HACS and install it.
5. Restart Home Assistant.
6. Go to **Settings → Devices & Services → Add Integration**.
7. Search for **Eon Next** and complete login.

## Manual installation

1. Copy `custom_components/eon_next` into your Home Assistant `custom_components` directory.
2. Restart Home Assistant.
3. Add the integration from **Settings → Devices & Services**.

## Reauthentication

If credentials expire or your password changes, Home Assistant prompts for re‑authentication. Open the integration card and complete the re‑auth flow to restore updates.

## Historical backfill (configurable)

The integration supports a slow, resumable historical backfill for Energy Dashboard statistics.

- Configure it in **Settings → Devices & Services → Eon Next → Configure**.
- Progress is persisted and resumes across Home Assistant restarts.
- To force a true full‑history rebuild, enable the option to clear/rebuild existing Eon statistics first.
- Backfill runs **alongside** live 30‑minute imports rather than suspending them: each historical chunk is spliced into the existing statistics and later cumulative sums are recomputed, so current‑day Energy Dashboard data keeps updating while history fills in.

Conservative defaults:

| Option | Default |
|---|---|
| Backfill enabled | off |
| Lookback | `3650` days |
| Chunk size | `1` day per request |
| Requests per run | `1` |
| Run interval | `180` minutes |
| Delay between requests | `300` seconds |

## Upgrade notes

In `1.2.0`, the `Daily Consumption` sensor state class changed to `total` and now provides a data‑driven `last_reset` for improved Energy Dashboard compatibility. If your instance still has long‑term statistics from older semantics (`measurement` or `total_increasing`), you may need to recreate affected statistics/dashboard cards.

Several sensors had invalid device‑class/state‑class combinations corrected to stop Home Assistant repair issues and spurious long‑term statistics:

- The unit‑rate sensors (`Current`/`Previous`/`Next`/`Export Unit Rate`) no longer use the `monetary` device class — a `£/kWh` price is not an ISO‑4217 currency amount. They keep their value and unit; only the device class is removed.
- `Standing Charge`, `Previous Day Cost`, and `Previous Day Consumption` no longer carry a `state_class`, as they are fixed fees or per‑day snapshots rather than cumulative totals. They stop generating long‑term statistics; old statistics can be recreated or deleted.

On time‑of‑use tariffs (e.g. Next Drive), the `Current Unit Rate` sensor reports the rate for the current half‑hour window instead of the schedule average, `Previous Day Cost` prices each half‑hour against its own rate window, and cost trackers accrue at the live time‑of‑use rate. Expect these values to differ from earlier flat/average‑rate releases.

The meter register‑reading sensors (`Electricity`, `Gas kWh`, `Gas`) use the `total_increasing` state class (a monotonic meter counter) and keep the reading's decimal precision instead of rounding to whole units. Older `total` long‑term statistics for these entities may need recreating.

Export meters no longer create the generic `Daily Consumption` and `Current Unit Rate` sensors — they duplicated the dedicated `Export Daily Consumption` and `Export Unit Rate` sensors. On existing installs those two generic entities become unavailable for export meters and can be deleted from the entity registry.

## Development and releases

Maintainer and release workflow is documented in [DEVELOPMENT.md](DEVELOPMENT.md).

- Contributors use Conventional Commit messages (`feat: …`, `fix: …`) and matching PR titles, because squash merges use PR titles as final commit subjects.
- Releases use a draft release‑PR flow (`release-please`): merges to `main` prepare release metadata, and maintainers approve/merge the release PR to publish.
- The Lit + TypeScript frontend lives in `frontend/` and builds committed bundles into `custom_components/eon_next/frontend/`, so HACS installs need no build step. See [`frontend/AGENTS.md`](frontend/AGENTS.md).
- Node.js is pinned in `.nvmrc` (`24.13.1`); Python is pinned in `.python-version` (`3.13`).
