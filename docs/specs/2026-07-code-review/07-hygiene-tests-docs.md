# Spec 07 — Code Hygiene, Test Coverage, and Doc Drift

Scope: dead code, test gaps, and places where the docs no longer match the code.

## High

### 7.1 No test coverage for config-flow login or re-auth [verified]

- Evidence: 35 test functions total for ~5,500 lines of integration code; zero
  matches for `reauth` or `ConfigEntryAuthFailed` anywhere under
  `tests/components/eon_next/` (checked by grep). There is a `test_options_flow.py`
  but no `test_config_flow.py`.
- Why it matters: the initial login, reauth, and auth-error mapping paths are the
  most security-sensitive code in the integration and currently carry known bugs
  (spec 01: 1.1, 1.3, 1.4). None of them can regress visibly today.
- Fix: add config-flow tests (first login, duplicate abort, reauth success, reauth
  with mismatched account, auth-vs-transient error mapping in `async_setup_entry`),
  using `pytest-homeassistant-custom-component` which is already a test dependency.
  Also missing: any test for the error-handling branches called out across these
  specs (backfill failure paths, statistics guard failure, 401 retry once added).

## Medium

### 7.2 Dead API stubs and dead coordinator branch obscure the real flow [reported]

- Where: `custom_components/eon_next/eonnext.py:491-526`
  (`async_get_consumption_data_by_mpxn_range` — zero callers;
  `async_get_consumption_data_by_mpxn` — test-only; `async_get_daily_costs` —
  permanent `return None` stub), `coordinator.py:149-154, 389-401` (`_fetch_daily_costs`
  still called every cycle; the `cost_data` branch can never execute).
- Why it matters: the documented third consumption fallback (GraphQL
  `consumptionDataByMpxn`) is de facto gone; the dead branch hides where costs
  actually come from (`coordinator.py:209-248`). Delete the stubs and branch, or
  implement them; update the convention docs either way (see 7.4).

## Low

### 7.3 GraphQL queries half-in, half-out of the module-constant convention [reported]

- Where: inline query strings at `eonnext.py:324, 365, 397, 707, 900, 936` vs the
  three existing module-level constants. The repo's own convention
  (`docs/ai/conventions.md` via the review checklist) says module-level constants.

### 7.4 Doc drift from code [verified]

- `AGENTS.md:20` says "Primary platform: `sensor`" and `docs/ai/context.md:53` says
  `PLATFORMS = ["sensor"]` — actual is `["sensor", "binary_sensor", "event"]`
  (`const.py:29`). The thin adapters (`.cursor/rules/00-project.mdc`,
  `.github/copilot-instructions.md`) mirror the stale text.
- The consumption fallback chain documented as REST half-hourly → REST daily →
  GraphQL is now effectively two-level (see 7.2).
- `schemas.py:73` documents `days` 1–30; the WS schema allows 1–365
  (`websocket.py:41`).

### 7.5 Assorted small items [reported]

- `eonnext.py:822-824` — unreachable export-meter MPAN heuristic (details in
  spec 04).
- `services.py:166-174` — `async_unregister_services` is never called.
- `sensor.py:672` — unused `RestoreEntity` mixin on `CostTrackerSensor` (spec 03,
  3.8).
- `binary_sensor.py:60-79` — triple recomputation of `is_off_peak` per state write
  (spec 03, 3.7).

## Positive observations (for the record)

- No credential/token leakage found in any log path (one raw-payload log worth
  sanitizing: spec 01, 1.9).
- Token refresh correctly serialized; sessions time-out properly; runtime-data
  pattern used consistently; pence→pounds conversion applied correctly at the
  boundaries checked.
- Release metadata lockstep (manifest / CHANGELOG / release-please manifest) is
  intact and CI-enforced.
- Frontend codegen (`api.generated.ts`) is fully in sync with `schemas.py`.
