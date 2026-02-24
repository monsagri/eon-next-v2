# Changelog

All notable changes to this project will be documented in this file.

This project is a fork of [madmachinations/eon-next-v2](https://github.com/madmachinations/eon-next-v2), maintained by [@monsagri](https://github.com/monsagri).

## [Unreleased]

Patch-only changes (backward-compatible bug fixes), intended for the next `1.1.x` release.

### Fixed

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
