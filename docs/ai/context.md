# AI Context: E.ON Next Integration

## Purpose

This repository contains a Home Assistant custom integration for E.ON Next accounts, distributed through HACS.

Core outcomes:

- Expose meter and EV smart-charging data as Home Assistant sensors.
- Keep integration behavior robust across API volatility.
- Maintain compatibility with Home Assistant and HACS validation expectations.

## Repository Layout

- `custom_components/eon_next/`: integration source code.
- `custom_components/eon_next/manifest.json`: HA integration metadata.
- `hacs.json`: HACS metadata.
- `.github/workflows/`: CI validation (hassfest, HACS checks, commit conventions).
- `README.md`: user-facing install and usage docs.
- `DEVELOPMENT.md`: maintainer workflow summary.
- `planning/README.md`: planning index.
- `planning/current_state.md`: implemented capability baseline.
- `planning/eon_next_capabilities.md`: API-supported capability map.
- `planning/feature_ideas.md`: roadmap/backlog option set.

## Runtime Architecture

- Config entry setup/unload is in `__init__.py`.
- Runtime state is stored on config entries via `entry.runtime_data` (`models.py`).
- Periodic updates are orchestrated by `EonNextCoordinator` (`coordinator.py`).
- API interaction and auth/token lifecycle are in `eonnext.py`.
- Entities are exposed via `sensor.py`.
- External statistics import for Energy Dashboard is in `statistics.py`.

## Domain-Specific Data Flow

- Authentication:
  - Primary: email/password login.
  - Session continuity: refresh token persistence in config entry data.
- Consumption fetching order:
  - REST half-hourly first.
  - REST daily second.
  - GraphQL `consumptionDataByMpxn` fallback.
- EV:
  - Device discovery from account data.
  - Schedule retrieval via smart charging GraphQL query.

## Home Assistant Expectations

- Re-auth should be triggered through `ConfigEntryAuthFailed` for auth failures.
- Platform setup should use config-entry forwarding (`PLATFORMS = ["sensor"]` currently).
- Sensor semantics (device class, state class, units) must remain coherent for Energy Dashboard behavior.
- Recorder/statistics usage must avoid duplicate or regressive external statistics imports.

## HACS and Release Context

- HACS discovers releases via tags/releases in GitHub.
- `manifest.json` version, release tag, and changelog entries must match.
- `hacs.json` must remain valid for category and minimum HA compatibility metadata.

## Known Operational Constraints

- Upstream API behavior may vary by account features.
- EV entities are conditional on account/device availability.
- Consumption sources may be intermittently unavailable; fallbacks are expected behavior, not exceptional logic.
