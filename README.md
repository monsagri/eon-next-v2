# Eon Next

Custom Home Assistant integration for E.ON Next accounts.

## Features

- Latest meter reading and reading date sensors for electricity and gas.
- Gas conversion sensor from m3 to kWh.
- Daily consumption sensor with dual fallback:
  - REST consumption endpoint first.
  - `consumptionDataByMpxn` GraphQL fallback if REST is unavailable.
- EV smart charging sensors (when SmartFlex devices are present):
  - Smart charging schedule status.
  - Next charge slot start/end.
  - Second charge slot start/end.
- Native HA re-auth flow:
  - Authentication failures trigger Home Assistant's re-auth prompt.
  - Password changes can be fixed from the standard UI flow.
- Modern HA runtime pattern via `entry.runtime_data`.

## Installation

1. Copy the `eon_next` folder into `custom_components` in your Home Assistant config directory.
2. Restart Home Assistant.
3. Go to **Settings -> Devices & Services -> Add Integration** and add **Eon Next**.

## HACS / Release

The integration manifest and `hacs.json` are versioned for HACS compatibility.

For a HACS-visible release, create and push a semantic version tag (example below):

```bash
git tag -a v1.1.0 -m "Eon Next 1.1.0"
git push origin v1.1.0
```
