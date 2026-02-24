# E.ON Next for Home Assistant

Custom integration for E.ON Next accounts in Home Assistant.

## What This Integration Provides

- Latest electricity and gas meter readings.
- Meter reading date sensors.
- Gas conversion from m3 to kWh.
- Daily consumption sensors with fallback:
  - REST consumption endpoint first.
  - `consumptionDataByMpxn` GraphQL fallback when REST data is unavailable.
- EV smart charging sensors (when SmartFlex devices are available):
  - Smart charging schedule status.
  - Next charge start/end.
  - Second charge start/end.
- Home Assistant re-auth support for password changes.

## Requirements

- Home Assistant `2024.4.0` or newer.
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

## Development And Releases

Maintainer and release workflow is documented in [DEVELOPMENT.md](DEVELOPMENT.md).

Contributors should use Conventional Commit messages (for example, `feat: ...`, `fix: ...`) and matching pull request titles because squash merges use PR titles as final commit subjects.
