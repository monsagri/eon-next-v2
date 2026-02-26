# Changelog

All notable changes to this project will be documented in this file.

This project is a fork of [madmachinations/eon-next-v2](https://github.com/madmachinations/eon-next-v2), maintained by [@monsagri](https://github.com/monsagri).

## [1.5.2](https://github.com/monsagri/eon-next-v2/compare/v1.5.1...v1.5.2) (2026-02-26)


### Bug Fixes

* drop invalid `state_class` from `CurrentUnitRateSensor` — HA does not allow `MEASUREMENT` with `device_class=MONETARY`; the sensor now reports no state class, fixing log warnings on every update cycle
* add 30-second request timeout to API session ([b6d3a83](https://github.com/monsagri/eon-next-v2/commit/b6d3a83271873dd089c71f7fbaa9c5da55e0211e))
* revert auth retry and IPv4 fallback that caused connection failures ([b88cc1c](https://github.com/monsagri/eon-next-v2/commit/b88cc1c209e9f7cbe409b4e9989cc8bc88e7e9cc))
* revert auth retry and IPv4 fallback that caused connection failures ([ff28570](https://github.com/monsagri/eon-next-v2/commit/ff2857016aec8433408a5d8b3f92a5af501e2635))

## [1.5.1](https://github.com/monsagri/eon-next-v2/compare/v1.5.0...v1.5.1) (2026-02-25)


### Bug Fixes

* auth retry behaviour and networking issues ([#22](https://github.com/monsagri/eon-next-v2/issues/22)) ([8d9dd57](https://github.com/monsagri/eon-next-v2/commit/8d9dd57a863574797fb530eb6eb59267e0c3cb6c))

## [1.5.0](https://github.com/monsagri/eon-next-v2/compare/v1.4.0...v1.5.0) (2026-02-25)


### Features

* add sidebar dashboard panel and Lovelace card infrastructure ([#20](https://github.com/monsagri/eon-next-v2/issues/20)) ([84c7994](https://github.com/monsagri/eon-next-v2/commit/84c7994e878ced73356219d843e27910a28536c7))


### Bug Fixes

* preserve auth tokens on transient network errors ([#19](https://github.com/monsagri/eon-next-v2/issues/19)) ([97f0f9a](https://github.com/monsagri/eon-next-v2/commit/97f0f9ab96bacc14084f1002c823af3a208c319d))

## [Unreleased]

### Added

- Sidebar dashboard panel: auto-registers an EON Next energy overview in the HA sidebar showing consumption, costs, meter readings, and EV charging status
- Lovelace card: `eon-next-summary-card` for embedding on custom dashboards, opt-in via integration options
- WebSocket API (`eon_next/version`, `eon_next/dashboard_summary`) shared by both the panel and cards
- Options flow toggle to show or hide the sidebar panel (default: enabled)
- Options flow toggle to register the Lovelace summary card (default: disabled)
- Frontend CI workflow for lint, format check, type check, and build
- Derived "Today's cost" rows in panel and summary card, calculated as `(today's kWh * unit rate) + daily standing charge`
- EV next-charge schedule timestamps now render in a human-friendly local date/time format
- Added runtime pinning files for contributors: `.nvmrc` (Node `24.13.1`) and `.python-version` (Python `3.13`)

### Fixed

- Improved panel and summary-card text contrast in dark mode by explicitly applying theme-driven foreground colors to value rows
- Frontend websocket data controller now restores loading state during reconnect/manual refresh instead of continuing to show stale data

## [1.4.0](https://github.com/monsagri/eon-next-v2/compare/v1.3.1...v1.4.0) (2026-02-25)


### Features

* add current unit rate sensor for Energy Dashboard cost tracking ([#15](https://github.com/monsagri/eon-next-v2/issues/15)) ([3ce81b8](https://github.com/monsagri/eon-next-v2/commit/3ce81b8f461fa69ea6821e6477b8f3dbfb49fcf8))
* add tariff agreement sensors with current tariff name and metadata ([#18](https://github.com/monsagri/eon-next-v2/issues/18)) ([add16e4](https://github.com/monsagri/eon-next-v2/commit/add16e4fdb4e26e3999f237e1cadbc6ba101c068))

## [1.3.1](https://github.com/monsagri/eon-next-v2/compare/v1.3.0...v1.3.1) (2026-02-25)


### Bug Fixes

* use state class `total` for monetary sensors ([8cadab5](https://github.com/monsagri/eon-next-v2/commit/8cadab5f3a0861aeb781797480b0efaf0b573562))

## [1.3.0](https://github.com/monsagri/eon-next-v2/compare/v1.2.0...v1.3.0) (2026-02-25)


### Features

* add cost tracking ([#9](https://github.com/monsagri/eon-next-v2/issues/9)) ([a6b7c2e](https://github.com/monsagri/eon-next-v2/commit/a6b7c2e8b7b2aa45a2736c04b1203dcfc524f370))
* add history backfill with diagnostic sensor ([94c498a](https://github.com/monsagri/eon-next-v2/commit/94c498ae9052af804c5eab5949a125e26ae798b1))


### Bug Fixes

* harden integration tests and add missing type annotations ([#12](https://github.com/monsagri/eon-next-v2/issues/12)) ([3a9ea7b](https://github.com/monsagri/eon-next-v2/commit/3a9ea7bd40880ca8963ea13f2d5a0ae3be16edd5))

## [1.2.0] - 2026-02-24

### Added

- External statistics import via `async_add_external_statistics` for the Energy Dashboard — consumption is now attributed to the correct time period even when data arrives late
- Half-hourly consumption data support from the REST API (falls back to daily, then GraphQL)

### Fixed

- Fixed `DailyConsumptionSensor` warnings in the Energy Dashboard by changing `state_class` from `MEASUREMENT` to `TOTAL` and adding a data-driven `last_reset`
- Daily consumption now filters to today's entries only instead of summing 7 days
- `last_reset` is derived from actual consumption timestamps rather than computing midnight
- Treated JWT `refreshExpiresIn` as a relative duration and now store it as an absolute expiry (`iat + refreshExpiresIn`) so refresh tokens remain valid for their intended lifetime
- Reused the refresh token obtained during config-flow validation in `async_setup_entry` to avoid an immediate second username/password login and reduce rate-limit risk
- Ensured token-refresh fallback re-login does not reinitialize account state by using `initialise=False` in auth-only refresh paths
- Added an auth refresh lock to prevent concurrent API calls from racing to refresh credentials at the same time
- Persisted newly issued refresh tokens to config-entry data so auth sessions survive Home Assistant restarts
- Tightened auth error detection by removing overly broad `"token"` message matching and keeping specific auth indicators (`jwt`, `unauthenticated`, etc.)
- Used explicit authentication success tracking during setup instead of `api.accounts` presence, preventing unnecessary second login attempts when account discovery returns no entities
- Hardened token validation to treat missing/non-numeric expiry values as invalid (instead of raising `TypeError` in auth refresh checks)
- Avoided no-op config-entry writes when refresh token value is unchanged and isolated token-update callback failures so successful auth is not downgraded by persistence callback errors
- Exposed a public token-update callback setter on the API client to avoid external assignment to private internals

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
