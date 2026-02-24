# AI Conventions: Coding and Architecture

## Python and Typing

- Target Python `3.13`.
- Use type annotations for public and integration-facing functions.
- Prefer explicit return types and concrete container types.
- Follow existing style patterns:
  - `from __future__ import annotations`
  - `dataclass(slots=True)` for runtime models where appropriate
- Run `basedpyright` before completion.

## Home Assistant Integration Patterns

- Use config entry runtime data (`entry.runtime_data`) as the source of active API/coordinator state.
- Coordinator entities should read from coordinator data keys; avoid direct API calls in entity properties.
- Auth failures that require user action should raise `ConfigEntryAuthFailed`.
- Recoverable API issues should degrade gracefully and preserve prior coordinator data where appropriate.
- **Before implementing any feature or bug fix**, verify your approach against the Home Assistant developer documentation (https://developers.home-assistant.io/). HA enforces specific semantics and conventions that compile/type checks will not catch — validating against the docs first avoids subtle runtime issues.

## Data Key and Entity Stability

- Keep coordinator data-key conventions stable:
  - Meter data keys: meter serial.
  - EV data keys: `ev::<device_id>`.
- Keep entity `unique_id` values stable across refactors.
- Avoid renaming entities/unique IDs without a clear migration strategy and release-note callout.

## Sensor Semantics

- Keep unit, device class, state class, and timestamp parsing aligned with Home Assistant sensor expectations.
- **State class selection rules** (these are enforced by HA's long-term statistics and Energy Dashboard):
  - `MEASUREMENT`: Point-in-time or snapshot values that do not accumulate (e.g. current rate, daily standing charge, previous day cost, temperature).
  - `TOTAL`: Cumulative values that grow over time and reset periodically — must pair with `last_reset` (e.g. daily consumption that resets at midnight).
  - `TOTAL_INCREASING`: Monotonically increasing counters that never reset (e.g. lifetime meter readings).
  - Do **not** use `TOTAL` for values that represent a fixed fee or a discrete period snapshot; use `MEASUREMENT`.
- Any state class changes must include:
  - Code updates.
  - Documentation updates.
  - Changelog entry with migration impact.

## Logging and Security

- Never log credentials, access tokens, refresh tokens, or raw auth payloads.
- Log API failures with enough context to debug (`operation`, `meter/serial`, status category), but sanitize sensitive values.
- Prefer `debug` level for transient fallback-path noise.

## File and Commit Hygiene

- Do not commit generated cache artifacts such as `__pycache__/` or `.pyc`.
- Keep changes focused; avoid unrelated refactors in behavior-changing PRs.
- Follow Conventional Commits for commit messages and PR titles.

## Documentation Hygiene

- If behavior changes, update docs in the same change:
  - `README.md` for user-facing behavior.
  - `DEVELOPMENT.md` for maintainer workflow impacts.
  - `CHANGELOG.md` for release-visible behavior.
- Treat `README.md` + `CHANGELOG.md` updates as required (not optional) for user-visible behavior changes.
- Treat `AGENTS.md` + `docs/ai/*` as canonical AI guidance; tool adapters should stay thin.
