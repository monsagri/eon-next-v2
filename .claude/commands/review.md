Perform a thorough code review of all staged and unstaged changes in this branch before they are pushed. This review enforces the project conventions defined in `AGENTS.md` and `docs/ai/`.

## Review Scope

Review every changed file by running `git diff HEAD` (unstaged) and `git diff --cached` (staged). If the branch has commits not yet on `main`, also review `git diff origin/main...HEAD`.

## Automated Checks

Run the following and report any failures:

```bash
python -m compileall custom_components/eon_next
basedpyright -p pyrightconfig.json 2>&1 | grep -v reportMissingImports | grep -v reportInvalidTypeForm | grep -v reportCallIssue | grep -v reportGeneralTypeIssues
python3 .github/scripts/check_release_metadata.py
```

Note: `reportMissingImports` and similar errors are pre-existing environment issues (HA not installed locally) — filter them out and only flag NEW type errors introduced by the changes.

## Home Assistant Integration Conventions

Check every changed file against these HA-specific rules:

### Entity and Sensor Rules
- New sensors MUST have a stable `unique_id` that will not change across refactors.
- `unique_id` format: `{serial_or_device_id}__{snake_case_sensor_name}`.
- `state_class` MUST be correct per HA semantics:
  - `MEASUREMENT` for point-in-time values (rates, daily charges, costs).
  - `TOTAL` with `last_reset` for cumulative values that reset periodically.
  - `TOTAL_INCREASING` for monotonically increasing counters.
- `device_class` and `native_unit_of_measurement` MUST match HA expectations (e.g. `SensorDeviceClass.MONETARY` with `GBP/kWh` for rates).
- Sensor entities MUST read from coordinator data keys, never make direct API calls in properties.
- New sensors MUST be registered in `async_setup_entry` in `sensor.py`.

### Coordinator Rules
- Data keys for meters: meter serial number.
- Data keys for EV devices: `ev::{device_id}`.
- Auth failures (`EonNextAuthError`) MUST be re-raised, never swallowed.
- Transient API failures MUST preserve previous coordinator data and log at `debug` level.
- New data fetches MUST follow the existing pattern: dedicated `_fetch_*` method with try/except, auth re-raise, and debug logging.

### Config and Auth Rules
- `entry.runtime_data` is the ONLY source of active API/coordinator state.
- Auth failures MUST raise `ConfigEntryAuthFailed` to trigger HA re-auth flow.
- NEVER log credentials, JWT tokens, refresh tokens, or raw auth payloads.

### API Client Rules (eonnext.py)
- GraphQL queries MUST be defined as module-level constants.
- New API methods MUST follow the pattern: validate input, call `_graphql_post`, check response with `_json_contains_key_chain`, return parsed data or `None`.
- Monetary values from the API are in pence — convert to pounds (divide by 100) before exposing to sensors.

## HACS and Metadata Conventions

- `manifest.json` version MUST match the latest `## [X.Y.Z]` header in `CHANGELOG.md`.
- `.release-please-manifest.json` `.` MUST match `manifest.json` version.
- `hacs.json` MUST remain valid JSON with correct `homeassistant` floor version.
- `manifest.json` MUST list `"integration_type": "hub"` and include `"config_flow": true`.

## Documentation Completeness

For user-visible changes, verify:
- `README.md` lists the new sensor/feature in "What This Integration Provides".
- `CHANGELOG.md` has an entry under `## [Unreleased]` describing the change.
- `planning/current_state.md` is updated if new sensors or capabilities were added.

## Code Quality

- All new public functions MUST have type annotations.
- Files MUST include `from __future__ import annotations`.
- No `__pycache__/` or `.pyc` files committed.
- Commit messages MUST follow Conventional Commits format (`feat:`, `fix:`, `chore:`, etc.).

### Test Date Hygiene (BLOCKING)

**No hardcoded calendar dates in test files.** This is a blocking issue — tests with literal dates like `"2026-02-25"` or `datetime(2026, 1, 10)` will silently break when those dates pass.

Scan every test file for:
- ISO date strings: patterns like `"20XX-XX-XX"` or `"XXXX-XX-XX"` in assertions, fixtures, or mock data.
- `datetime(YYYY, ...)` literals used as reference times (including monkeypatched `dt_util.now`).

Required pattern — use dynamic references:
```python
import datetime
_TODAY = datetime.date.today()
_YESTERDAY = (_TODAY - datetime.timedelta(days=1)).isoformat()
```
Or for datetime-aware tests:
```python
from datetime import datetime, timedelta, timezone
_REF_DT = datetime.now(tz=timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
_REF_DATE_ISO = _REF_DT.date().isoformat()
```

Exceptions: Dates that represent **historical facts** (e.g. a fixed API schema version date) may be hardcoded with a comment explaining why.

## Security

- No credentials, tokens, or secrets in code or logs.
- No command injection, XSS, or OWASP top 10 vulnerabilities.
- API error messages MUST sanitize sensitive values before logging.

## Output Format

Produce a structured review with these sections:

1. **Automated Check Results** — pass/fail for each command.
2. **Issues Found** — numbered list of problems, each with file path, line number, severity (blocking/warning), and specific fix needed.
3. **Conventions Verified** — brief confirmation of each checked convention category.
4. **Summary** — overall pass/fail verdict and whether the changes are safe to push.

If there are blocking issues, do NOT push. List the fixes needed and offer to apply them.
