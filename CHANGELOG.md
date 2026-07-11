# Changelog

All notable changes to this project will be documented in this file.

This project is a fork of [madmachinations/eon-next-v2](https://github.com/madmachinations/eon-next-v2), maintained by [@monsagri](https://github.com/monsagri).

## [2.0.0](https://github.com/monsagri/eon-next-v2/compare/v1.10.0...v2.0.0) (2026-07-11)


### ⚠ BREAKING CHANGES

* raise minimum Home Assistant to 2026.3.0 (Python 3.14) ([#82](https://github.com/monsagri/eon-next-v2/issues/82))

### Features

* raise minimum Home Assistant to 2026.3.0 (Python 3.14) ([#82](https://github.com/monsagri/eon-next-v2/issues/82)) ([67a4760](https://github.com/monsagri/eon-next-v2/commit/67a4760048f70a054585fa6bb865836ab88c4c2d))

## [1.10.0](https://github.com/monsagri/eon-next-v2/compare/v1.9.3...v1.10.0) (2026-07-11)


### Features

* **frontend:** adopt the lightning-bolt brand mark in the panel ([7d77636](https://github.com/monsagri/eon-next-v2/commit/7d776362ef7357f5580d0a489b8b2f0fb0edf79a))
* **frontend:** open the HA sidebar from the brand logo ([5eb2a74](https://github.com/monsagri/eon-next-v2/commit/5eb2a74e9989ece56099fc3de07bb4ac9f7b4dfa))
* **frontend:** redesign dashboard panel as a multi-page app ([9567c90](https://github.com/monsagri/eon-next-v2/commit/9567c9011ebb391221976ae7674065532778e1ee))


### Bug Fixes

* **frontend:** render dense charts, stop page overflow, shade no-data days ([8c1c535](https://github.com/monsagri/eon-next-v2/commit/8c1c5350bddec76e5301bdaddd7413a4311deab9))
* **frontend:** resolve dashboard panel layout and chart styling issues ([658df6a](https://github.com/monsagri/eon-next-v2/commit/658df6a01e8b2001d27ce65e38b9501b35aefb44))

## [1.9.3](https://github.com/monsagri/eon-next-v2/compare/v1.9.2...v1.9.3) (2026-07-09)


### Bug Fixes

* **tariff:** fall back to pattern when no schedule window is current ([173b53a](https://github.com/monsagri/eon-next-v2/commit/173b53a16eca4481dc63da92cc24b022b3ae0ea0))

## [1.9.2](https://github.com/monsagri/eon-next-v2/compare/v1.9.1...v1.9.2) (2026-07-08)


### Bug Fixes

* **panel:** stop WebSocket request storm on panel load ([21a0115](https://github.com/monsagri/eon-next-v2/commit/21a01151b6f28430fcf147d3d2d35f7990a3bf28))

## [1.9.1](https://github.com/monsagri/eon-next-v2/compare/v1.9.0...v1.9.1) (2026-07-08)


### Bug Fixes

* **auth:** refresh-and-retry once on 401 instead of forcing re-auth ([94448ff](https://github.com/monsagri/eon-next-v2/commit/94448ff4e39385394ce596fa7cf2aec6a59423d0))
* **backfill:** close statistics double-count and read-after-write; dedupe export sensors ([97ae8f3](https://github.com/monsagri/eon-next-v2/commit/97ae8f355a73af66d59d4e970ad357770a58ffb3))
* **backfill:** import history without suspending live statistics ([3ffb303](https://github.com/monsagri/eon-next-v2/commit/3ffb303bd4c1715cfa84c91244a3da1d0aed3305))
* **backfill:** stop permanent history holes and today double-counting ([35cea11](https://github.com/monsagri/eon-next-v2/commit/35cea11d6673b3e295e43ed3c3b6bf235297223a))
* **cost-tracker:** debounce storage writes on tracked-entity updates ([689f586](https://github.com/monsagri/eon-next-v2/commit/689f586b21b9791c1da444f17c1ad7783f504da4))
* **meters:** skip inactive meters so replaced meters disappear ([#53](https://github.com/monsagri/eon-next-v2/issues/53)) ([9b48b78](https://github.com/monsagri/eon-next-v2/commit/9b48b78b820ec5e251c8f4181eaa94acb57c62f4))
* **panel:** add sidebar toggle so the dashboard isn't a dead end on iOS ([#54](https://github.com/monsagri/eon-next-v2/issues/54)) ([08e3fbb](https://github.com/monsagri/eon-next-v2/commit/08e3fbbf75898d7440a45df3338b31eb88ba1c3a))
* reload entry only on options change to stop refresh-token reload loop ([1dbf23c](https://github.com/monsagri/eon-next-v2/commit/1dbf23c3c7ec19fe5e4492bac20f60a19949e8ab))
* resolve remaining medium/low code-review findings ([c46ef9f](https://github.com/monsagri/eon-next-v2/commit/c46ef9f8328ca8c2fa69746aee847a41fbe856b8))
* **sensor:** correct invalid device-class/state-class combinations ([5497fe9](https://github.com/monsagri/eon-next-v2/commit/5497fe9ebd99008a1ffb8ba525cb0ccb65dc1e85))
* **setup:** map setup errors to re-auth/retry and never leak the session ([f30af97](https://github.com/monsagri/eon-next-v2/commit/f30af97b47ac9011df9522b98e96f71d3e0094ac))
* **statistics:** skip import when last-stat lookup fails ([a1195d4](https://github.com/monsagri/eon-next-v2/commit/a1195d4ebe40288e5410558f47bc1525fe104474))
* **tariff:** price time-of-use tariffs by current window, not the mean ([670a292](https://github.com/monsagri/eon-next-v2/commit/670a292827ba90423eee08dc2d4ee872f07ba34f))

## [1.9.0](https://github.com/monsagri/eon-next-v2/compare/v1.8.2...v1.9.0) (2026-03-02)


### Features

* **frontend:** add cost breakdown pie chart card with day/week/month views ([#50](https://github.com/monsagri/eon-next-v2/issues/50)) ([4e7ef94](https://github.com/monsagri/eon-next-v2/commit/4e7ef940115c5925b2a4edf929959a931a82bdbe))
* implement A1-A3 phase 2 architectural prerequisites ([#48](https://github.com/monsagri/eon-next-v2/issues/48)) ([6209496](https://github.com/monsagri/eon-next-v2/commit/6209496e349ab99e82746481ecae2b78ce58fd18))
* implement phase 2A tariff-aware sensors ([#51](https://github.com/monsagri/eon-next-v2/issues/51)) ([499c429](https://github.com/monsagri/eon-next-v2/commit/499c4298b73035f08cca507662e4ad9141a451e1))
* implement phase 2b cost trackers, services, and dashboard breakdown ([1140db9](https://github.com/monsagri/eon-next-v2/commit/1140db9c84bc9be12225b74625c25826a8a4cc5d))


### Bug Fixes

* address automated review findings for phase 2b ([5439105](https://github.com/monsagri/eon-next-v2/commit/54391053445bf93168b0c3dd960847e8d46b8b69))
* correct entity registry test config_entry argument ([5e6f43d](https://github.com/monsagri/eon-next-v2/commit/5e6f43dd25709a1c2cde844638f3aef2c3c00260))

## [Unreleased]

### Features

* **sensor:** add previous and next unit rate sensors for tariff-aware automations (Phase 2A)
* **binary_sensor:** add off-peak binary sensor for time-of-use tariff automation triggers
* **event:** add current day rates event entity with today's full rate schedule
* **sensor:** add export unit rate and export daily consumption sensors for solar/export meters
* **sensor:** add previous day consumption and account balance sensors (Phase 2B)
* **sensor/services:** add cost tracker entities with persistent storage and management services (`add_cost_tracker`, `reset_cost_tracker`, `update_cost_tracker`)
* **frontend:** extend cost breakdown with default cost-tracker visualization (tracked vs untracked usage today + per-tracker list)
* add tariff rate calculation helpers with API schedule and pattern registry fallback
* **frontend:** add cost breakdown pie chart card with day/week/month views
* **frontend:** add time-range picker for consumption charts (7d / 30d / 90d / 1y) with adaptive date labels
* **frontend:** add month-to-date running cost total to the cost view
* **frontend:** add visual config editors for all Lovelace cards (meter, summary, EV)
* **frontend:** improve chart tooltips with styled backgrounds, formatted values, and dark-mode support
* **frontend:** add ARIA roles and labels across panel, charts, and range picker for accessibility
* **websocket:** extend `eon_next/consumption_history` max day range from 30 to 365

### Bug Fixes

* **coordinator:** derive unit rate, standing charge, and previous-day cost from tariff agreement data when the defunct daily-costs endpoint returns nothing
* **frontend:** remove build-time version stamp that drifted from release-please managed version - the backend version badge is now the single source of truth

## [1.8.2](https://github.com/monsagri/eon-next-v2/compare/v1.8.1...v1.8.2) (2026-02-28)


### Bug Fixes

* **coordinator:** address review feedback for daily consumption aggregation ([102b862](https://github.com/monsagri/eon-next-v2/commit/102b86268bc312f692e13f9c3b0b0bd604320bb2))
* **coordinator:** fix daily consumption and previous-day cost showing unknown ([bbba961](https://github.com/monsagri/eon-next-v2/commit/bbba961f030ae3cf2a256ea1a3d1c3c9652684b1))

## [1.8.1](https://github.com/monsagri/eon-next-v2/compare/v1.8.0...v1.8.1) (2026-02-28)


### Bug Fixes

* **coordinator:** address PR review feedback for tariff fallback ([d7238c3](https://github.com/monsagri/eon-next-v2/commit/d7238c326e5fb098525dfbdb2731ee975df27437))
* **coordinator:** derive unit rate, standing charge, and previous-day cost from tariff data ([c5047ef](https://github.com/monsagri/eon-next-v2/commit/c5047efa84f418ba6bbda2a2a9f5ff57896943f6))

## [1.8.0](https://github.com/monsagri/eon-next-v2/compare/v1.7.1...v1.8.0) (2026-02-28)


### Features

* **frontend:** add time-range picker, MTD cost, card editors, and accessibility (Phase 4) ([#41](https://github.com/monsagri/eon-next-v2/issues/41)) ([506e158](https://github.com/monsagri/eon-next-v2/commit/506e158d06d2ba101ded4c41977e23a5fdd197e8))

## [1.7.1](https://github.com/monsagri/eon-next-v2/compare/v1.7.0...v1.7.1) (2026-02-28)


### Bug Fixes

* **panel:** guard static path registration against duplicate aiohttp routes ([#39](https://github.com/monsagri/eon-next-v2/issues/39)) ([9e51ea2](https://github.com/monsagri/eon-next-v2/commit/9e51ea2ca2c26eb94a1b1eb7b2109c7e04f92c83))

## [1.7.0](https://github.com/monsagri/eon-next-v2/compare/v1.6.0...v1.7.0) (2026-02-28)


### Features

* **frontend:** add EV schedule, backfill diagnostics, and enhanced summary card (Phase 3) ([d0dddd9](https://github.com/monsagri/eon-next-v2/commit/d0dddd9a6c4b2690ef9d9901c0e3cdbca901591d))
* **frontend:** fill missing chart days and add cost overlay to consumption chart ([#35](https://github.com/monsagri/eon-next-v2/issues/35)) ([ccc8a94](https://github.com/monsagri/eon-next-v2/commit/ccc8a94928a6f93dfa532e486bd9348a415182f5))


### Bug Fixes

* **frontend:** improve diagnostics and version/schedule states ([954dc8a](https://github.com/monsagri/eon-next-v2/commit/954dc8af2476efec2737555318c5b1c6e73fad2e))
* **websocket:** cover ev/backfill commands and stabilize ordering ([0df57a2](https://github.com/monsagri/eon-next-v2/commit/0df57a27de895b2671cd15329ad398694e90422f))

## [1.6.0](https://github.com/monsagri/eon-next-v2/compare/v1.5.4...v1.6.0) (2026-02-27)


### Features

* **frontend:** add consumption charts and new Lovelace cards ([#31](https://github.com/monsagri/eon-next-v2/issues/31)) ([4d898f0](https://github.com/monsagri/eon-next-v2/commit/4d898f06622804d5e98f442aa442befe5e9ee7bf))


### Bug Fixes

* correct GraphQL query shapes for gas tariffs and remove defunct consumptionDataByMpxn ([#33](https://github.com/monsagri/eon-next-v2/issues/33)) ([4a6fc6a](https://github.com/monsagri/eon-next-v2/commit/4a6fc6affb74f494981f108308c73e3d8e91ac3c))

## [1.5.4](https://github.com/monsagri/eon-next-v2/compare/v1.5.3...v1.5.4) (2026-02-27)


### Bug Fixes

* enable dashboard panel and cards by default on fresh install ([#29](https://github.com/monsagri/eon-next-v2/issues/29)) ([d9c5a0e](https://github.com/monsagri/eon-next-v2/commit/d9c5a0ee4c4f4e9c32597da28c2571f8bc0ac902))
* resolve post-fork entities always showing unknown values ([b08301b](https://github.com/monsagri/eon-next-v2/commit/b08301bff001051f94228a11ae64a6892c832e8c))
* widen cost fallback gate and add test coverage ([7ac4563](https://github.com/monsagri/eon-next-v2/commit/7ac45635cbb9f1ac8aadee4d079190baa53e622d))

## [1.5.3](https://github.com/monsagri/eon-next-v2/compare/v1.5.2...v1.5.3) (2026-02-26)


### Bug Fixes

* drop invalid state_class from CurrentUnitRateSensor ([249e3c3](https://github.com/monsagri/eon-next-v2/commit/249e3c32e38ab26daf4f96ff931565a3c5ecf6ad))
* revert manual CHANGELOG entry - release-please generates it ([dd1ed3c](https://github.com/monsagri/eon-next-v2/commit/dd1ed3c4285c67c08309045bbaf0a0961492b163))

## [1.5.2](https://github.com/monsagri/eon-next-v2/compare/v1.5.1...v1.5.2) (2026-02-26)


### Bug Fixes

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

- External statistics import via `async_add_external_statistics` for the Energy Dashboard - consumption is now attributed to the correct time period even when data arrives late
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
