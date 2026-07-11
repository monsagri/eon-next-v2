# Spec 03 - Sensor Semantics and Entity Behavior

Scope: `sensor.py`, `binary_sensor.py`, `event.py`.

HA enforces device-class/state-class combinations via `DEVICE_CLASS_STATE_CLASSES`
and raises repair issues for violations; wrong state classes also corrupt long-term
statistics. The project's own rules are in `docs/ai/conventions.md`.

## Critical

### 3.1 Invalid state-class / device-class combinations on six entity types [verified]

All verified by direct read. Fixing these changes recorded statistics behavior -
per `docs/ai/conventions.md` this requires code + docs + changelog with migration
impact in the same change.

| Entity | Where | Today | Problem | Correct |
|---|---|---|---|---|
| Current/Previous/Next/Export Unit Rate | `sensor.py:343-344, 517-518, 566-567, 615-616` | `MONETARY` + `GBP/kWh` | MONETARY requires an ISO 4217 currency unit; HA raises a repair issue per entity per meter | `device_class=None`, keep unit |
| Previous Day Consumption | `sensor.py:317-319` | `ENERGY` + `MEASUREMENT` | HA allows only TOTAL/TOTAL_INCREASING with ENERGY | `state_class=None` (period snapshot), or TOTAL + the yesterday-midnight `last_reset` the coordinator already computes (`coordinator.py:130-132`) but the sensor never exposes |
| Previous Day Cost | `sensor.py:291-293` | `MONETARY` + `TOTAL`, no `last_reset` | rolling snapshot recorded as deltas → meaningless drifting cumulative cost | `state_class=None` |
| Standing Charge | `sensor.py:273-275` | `MONETARY` + `TOTAL`, no `last_reset` | fixed daily fee; price changes / source flips (`coordinator.py:217-223`) recorded as spurious statistics deltas - explicitly forbidden by the conventions doc | `state_class=None` |

## Medium

### 3.2 Backfill status sensor unique_id collides across config entries [reported]

- Where: `custom_components/eon_next/sensor.py:132` - hard-coded
  `"eon_next__historical_backfill_status"`.
- Failure scenario: a second E.ON account entry fails to register its status sensor
  ("does not generate unique IDs"). Fix: include `entry_id` in the unique_id
  (needs an entity-registry migration for existing installs, or accept the rename
  with a release note per the unique-id guardrail).

### 3.3 Rate/off-peak entities lag boundaries by up to 30 minutes [reported]

- Where: `sensor.py:524-534, 573-583` (previous/next rate recomputed only on
  coordinator update), `binary_sensor.py` (same), coordinator interval
  `coordinator.py:33-38`.
- Problem: no `async_track_point_in_time` listener at the next rate boundary.
- Failure scenario: at a 07:00 off-peak→peak transition the Off Peak binary sensor
  and rate sensors are wrong for up to 30 min - breaking exactly the
  "switch loads at the boundary" automations the README advertises.
- Fix: `tariff_helpers` already computes `next_transition`; schedule a point-in-time
  callback there to trigger `async_write_ha_state` on the affected entities.

### 3.4 Recorder write amplification from schedule attributes and events [reported]

- Where: `sensor.py:434-436` (full EV schedule list in `extra_state_attributes`,
  re-written every 30-min refresh even when unchanged), `event.py:67-78`
  (`rates_updated` fires every refresh with no change detection - ~48 identical
  events/day/meter), `event.py:85-89` (full day's rate list duplicated into state
  attributes on top of the event data).
- Fix: fire the event only when `build_day_rates()` output or `tariff_code` changes
  (plus midnight rollover); drop the `rates` duplication from attributes; trim or
  document recorder exclusion for the EV `schedule` attribute. Cuts recorder writes
  ~48x/meter/day.

### 3.5 Export meters get duplicate entity pairs [reported]

- Where: `custom_components/eon_next/sensor.py:63, 74`.
- Problem: export meters get both `DailyConsumptionSensor` **and**
  `ExportDailyConsumptionSensor` (and both unit-rate variants) reading the same
  coordinator keys - duplicate entities with identical values.
- Fix: skip the generic sensors for export meters (unique_id stability caveat: the
  generic ones may already exist in registries; prefer disabling by default or
  documenting).

## Low

### 3.6 Latest meter readings use TOTAL instead of TOTAL_INCREASING [reported]

- Where: `sensor.py:190-193, 207-211, 225-229`.
- Problem: register readings are monotonic counters; with `TOTAL`, a glitched lower
  API reading is recorded as a legitimate negative delta instead of being treated as
  a reset. Related data-quality issue: readings take `registers[0]` blindly (wrong /
  unstable for Economy 7 two-register meters; `IndexError` on empty list, currently
  masked by the coordinator's broad except) and `round()` to whole units, discarding
  real decimals - `eonnext.py:914, 950`. Gas kWh conversion additionally uses a
  hardcoded calorific value of 38 and whole-kWh rounding (`eonnext.py:962`,
  `const.py:39`).

### 3.7 Off-peak binary sensor recomputes per property [reported]

- Where: `binary_sensor.py:60-79` - `available`, `is_on`, and `icon` each call
  `is_off_peak(data)` independently (full schedule scan three times per state write;
  values can disagree across a window boundary within one write). Fix: compute once
  in `_handle_coordinator_update`.

### 3.8 CostTrackerSensor's RestoreEntity mixin is dead [reported] (uncertain)

- Where: `sensor.py:672, 693-703` - inherits `RestoreEntity` but never calls
  `async_get_last_state`; restoration relies entirely on the manager's `Store`.
  Either drop the mixin or use it as a fallback when the store lags a crash.
