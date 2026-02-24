# Changelog

All notable changes to this project will be documented in this file.

This project is a fork of [madmachinations/eon-next-v2](https://github.com/madmachinations/eon-next-v2), maintained by [@monsagri](https://github.com/monsagri).

## [Unreleased]

### Added

- External statistics import via `async_add_external_statistics` for the Energy Dashboard — consumption is now attributed to the correct time period even when data arrives late
- Half-hourly consumption data support from the REST API (falls back to daily, then GraphQL)

### Fixed

- Fixed `DailyConsumptionSensor` warnings in the Energy Dashboard by changing `state_class` from `MEASUREMENT` to `TOTAL` and adding a data-driven `last_reset`
- Daily consumption now filters to today's entries only instead of summing 7 days
- `last_reset` is derived from actual consumption timestamps rather than computing midnight

## [1.1.1] - 2026-02-23

### Fixed

- Removed invalid `homeassistant` key from `manifest.json` that caused hassfest validation to fail
- Updated codeowners from `@madmachinations` to `@monsagri`
- Updated `actions/checkout` from v3 to v4 in hassfest workflow
- Added `permissions: {}` to GitHub workflows per HACS best practices
- Added `workflow_dispatch` trigger to hassfest workflow for manual runs

## [1.1.0] - 2026-02-23

### Changed

- Modernised integration architecture with cleaner model definitions
- Improved type annotations and robustness throughout
- Moved development documentation to `development.md`
- Added pyright configuration for static type checking
- Added `.gitignore` for `__pycache__`

## [1.0.0] - 2026-02-23

### Added

- REST API consumption endpoint for half-hourly and daily smart meter data
- `DataUpdateCoordinator` pattern with 30-minute polling interval
- `CoordinatorEntity` base for all sensors (eliminates duplicate API calls)
- MPAN/MPRN capture from meter points for REST API consumption queries
- Proper exception classes (`EonNextAuthError`, `EonNextApiError`)
- `async_unload_entry` for proper cleanup on integration removal/reload
- Constants extracted to `const.py`

### Fixed

- Replaced removed `async_forward_entry_setup` with `async_forward_entry_setups` for HA 2025.6+ compatibility
- Fixed auth token refresh bug where re-login failed due to missing credentials
- Reuse `aiohttp` session instead of creating a new one per request
- Fixed typo in `strings.json` ("addresss" -> "address")
- Added "unknown" error type for unexpected config flow errors

### Changed

- Bumped version from upstream to 1.0.0 to mark the fork's first stable release
