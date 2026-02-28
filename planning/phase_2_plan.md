# Phase 2: Tariff Richness & Cost Intelligence

Date: 2026-02-28
Status: Draft
Scope: Phase 2A (tariff-aware sensors) and Phase 2B (cost intelligence), plus architectural prerequisites

## Motivation

Phase 1 delivered core monitoring: meter readings, daily consumption, standing charges, previous-day cost, current unit rate/tariff, EV schedules, and a frontend dashboard. Users can see what they used and what it cost.

Phase 2 enables users to **act** on their data. Previous/next rate sensors and off-peak indicators unlock automations ("run the dishwasher when the cheap rate starts"). Day rate event entities give visibility into the full rate schedule. Export support covers solar customers. Cost trackers let users cost individual devices against their tariff. These are the features that make an energy integration genuinely useful beyond passive monitoring.

This plan is informed by a gap analysis against the BottlecapDave Octopus Energy integration, which sets the community benchmark for UK energy integrations in Home Assistant.

---

## Architectural Prerequisites

These changes should land before or alongside the Phase 2A entity work. They provide the foundation for all new features without disrupting existing functionality.

### A1. New Entity Platforms

**Current state:** Only the `sensor` platform is registered (`const.py:PLATFORMS = ["sensor"]`).

**Required:** Add `binary_sensor` and `event` platforms.

**Implementation:**

1. Update `PLATFORMS` in `const.py`:
   ```python
   PLATFORMS = ["sensor", "binary_sensor", "event"]
   ```

2. Create `binary_sensor.py` with `async_setup_entry` following the same pattern as `sensor.py` — read meters from `config_entry.runtime_data`, instantiate entity classes, call `async_add_entities`.

3. Create `event.py` with `async_setup_entry` for event entities. HA event entities use `EventEntity` from `homeassistant.components.event` and fire events via `self._trigger_event(event_type, event_attributes)`.

4. Both files use `EonNextSensorBase`-style coordinator entity pattern (extend `CoordinatorEntity` + platform entity class).

**Risk:** None — adding platforms is additive. Existing sensor entities are unaffected.

### A2. Tariff Data Enrichment in Coordinator

**Current state:** The coordinator fetches one active agreement per meter point via `_fetch_tariff_data()` → `_find_active_agreement()`. It extracts a single `unit_rate` (or averages `unitRates` for `HalfHourlyTariff`). The tariff's `__typename` is stored as `tariff_type`.

**Required:** Preserve the full rate schedule for time-of-use tariffs so downstream entities can determine previous/next rates and off-peak windows.

**Implementation:**

1. Extend `_find_active_agreement()` to also return:
   - `unit_rates_schedule`: The raw `unitRates` list from `HalfHourlyTariff` responses (list of `{value, validFrom, validTo}` dicts), or `None` for flat-rate tariffs.
   - `tariff_is_tou`: Boolean flag — `True` when `__typename` is `HalfHourlyTariff` or when `unitRates` contains more than one distinct rate value.

2. Flow the new fields through the coordinator's `meter_data` dict alongside existing `tariff_*` keys:
   ```python
   meter_data["tariff_rates_schedule"] = tariff.get("unit_rates_schedule")
   meter_data["tariff_is_tou"] = tariff.get("tariff_is_tou", False)
   ```

3. Retain the existing `tariff_unit_rate` as the single representative rate (flat rate or averaged rate for ToU) so current sensors are unaffected.

**API investigation needed:** The current `getAccountAgreements` query requests `unitRates { value }` for `HalfHourlyTariff` but does **not** request `validFrom`/`validTo` per rate band. We need to test whether the Kraken schema exposes time windows on each rate entry. If it does, modify the query to:
```graphql
... on HalfHourlyTariff {
  unitRates {
    value
    validFrom
    validTo
  }
  standingCharge
}
```

If per-rate time windows are **not** available in the schema, we can still derive off-peak status from known tariff patterns (see A3).

### A3. Tariff Pattern Registry

**Purpose:** Map known E.ON Next tariff codes to their rate structures so that off-peak detection works even when the API doesn't expose per-rate time windows.

**Implementation:**

1. Create `tariff_patterns.py` with a registry of known tariff structures:
   ```python
   @dataclass(slots=True)
   class TariffRateWindow:
       """A named rate period within a tariff."""
       name: str           # "off_peak", "peak", "super_off_peak"
       start_time: time     # Local time start (inclusive)
       end_time: time       # Local time end (exclusive)

   @dataclass(slots=True)
   class TariffPattern:
       """Known rate structure for a tariff product."""
       product_prefix: str  # e.g. "E-1R-NEXT-DRIVE"
       windows: list[TariffRateWindow]

   KNOWN_TARIFF_PATTERNS: list[TariffPattern] = [
       TariffPattern(
           product_prefix="NEXT-DRIVE",
           windows=[
               TariffRateWindow("off_peak", time(0, 0), time(7, 0)),
           ],
       ),
       TariffPattern(
           product_prefix="NEXT-PUMPED",
           windows=[
               TariffRateWindow("off_peak", time(0, 0), time(7, 0)),
               TariffRateWindow("off_peak", time(13, 0), time(16, 0)),
           ],
       ),
       # Add more as discovered
   ]
   ```

2. Provide a lookup function:
   ```python
   def get_tariff_pattern(tariff_code: str | None) -> TariffPattern | None:
       """Match a tariff code to a known pattern, or None for flat-rate."""
   ```

3. This registry is a best-effort supplement. When the API provides per-rate time windows (via A2), use those instead. The registry is the fallback for tariffs where the API only returns rate values without time metadata.

**Maintenance:** New tariff patterns are added as users report them. The registry should be documented in the README so users on unknown ToU tariffs can request additions.

### A4. Export Meter Detection

**Current state:** The `_load_meters()` method discovers all electricity and gas meter points. It does not distinguish import meters from export meters.

**Required:** Detect export meters so export-specific entities can be capability-gated.

**Implementation:**

1. Check the MPAN structure. UK export MPANs are identifiable by their profile class (the first two digits of the MPAN core): import meters use profile classes 01-08, while export uses class 00. Alternatively, check whether the account has a tariff with `__typename` containing "Export" or a tariff code matching known export patterns (e.g. `E-1R-NEXT-EXPORT-*`).

2. Add an `is_export` boolean to `ElectricityMeter`:
   ```python
   class ElectricityMeter(EnergyMeter):
       def __init__(self, ..., is_export: bool = False):
           ...
           self.is_export = is_export
   ```

3. Set `is_export` during `_load_meters()` based on tariff code matching or MPAN analysis.

4. Entity setup checks `meter.is_export` to decide which entity classes to instantiate.

**Risk:** Low. If export detection has false negatives, users simply don't see export entities (safe default). False positives would create entities that show no data, which is annoying but not harmful. We can refine detection logic as we gather real-world data from export customers.

### A5. Account Balance from Existing Query

**Current state:** The `headerGetLoggedInUser` query already requests the `balance` field on each account. The value is parsed during `__get_account_numbers()` but discarded.

**Implementation:**

1. Store balance on `EnergyAccount`:
   ```python
   class EnergyAccount:
       def __init__(self, api, account_number, balance=None):
           ...
           self.balance = balance
   ```

2. Pass balance through during account init in `__get_account_numbers()` / `__init_accounts()`.

3. The coordinator can expose it as a simple account-level key in the data dict.

**Effort:** Minimal — the data is already fetched.

---

## Phase 2A: Tariff Richness

### 2A.1 Previous Rate Sensor

**Entity:** `sensor.eon_next_{serial}__previous_unit_rate`
**Device class:** `MONETARY` (no `state_class` — not a measurement)
**Unit:** `GBP/kWh`

**Behavior:**
- For **flat-rate tariffs**: Always shows the same value as the current rate (rate doesn't change).
- For **ToU tariffs with API rate schedule** (A2): Shows the most recent rate that differs from the current rate, reading backwards from now through the rate schedule.
- For **ToU tariffs with known patterns** (A3 fallback): Determines the previous rate window based on current time and the tariff pattern, then uses the unit rate value for that window.
- Shows `unknown` if no tariff data is available.

**Attributes:**
- `valid_from`: Start time of the previous rate period
- `valid_to`: End time of the previous rate period
- `tariff_code`: Current tariff code

**Unique ID:** `{serial}__previous_unit_rate`

### 2A.2 Next Rate Sensor

**Entity:** `sensor.eon_next_{serial}__next_unit_rate`
**Device class:** `MONETARY` (no `state_class`)
**Unit:** `GBP/kWh`

**Behavior:**
- For **flat-rate tariffs**: Same value as current rate.
- For **ToU tariffs with API rate schedule**: Shows the next rate that differs from the current rate, reading forward from now.
- For **ToU tariffs with known patterns**: Determines the next rate window, uses the unit rate value.
- Shows `unknown` if no tariff data is available.

**Attributes:**
- `valid_from`: Start time of the next rate period
- `valid_to`: End time of the next rate period
- `tariff_code`: Current tariff code

**Unique ID:** `{serial}__next_unit_rate`

### 2A.3 Off-Peak Binary Sensor

**Entity:** `binary_sensor.eon_next_{serial}__off_peak`
**Device class:** None (generic on/off)
**Icon:** `mdi:clock-fast` (on) / `mdi:clock-outline` (off)

**Behavior:**
- `on` when the current time falls within an off-peak rate window.
- `off` during peak/standard rate periods.
- `unavailable` for flat-rate tariffs that have no off-peak concept.

**Rate window determination (priority order):**
1. API-provided rate schedule with time windows and rate values (compare current rate to lowest rate — if current equals lowest, off-peak is true).
2. Tariff pattern registry match (check current time against known windows).
3. If neither source provides data, entity is `unavailable`.

**Attributes:**
- `current_rate_name`: "off_peak", "peak", "standard", or "super_off_peak" where determinable
- `next_transition`: ISO timestamp of when the off-peak state will next change
- `tariff_code`: Current tariff code

**Unique ID:** `{serial}__off_peak`

**Why a binary sensor:** This is the simplest primitive for automations. Users write `state: 'on'` triggers without needing to understand rate structures. BottlecapDave uses this exact pattern and it's one of their most-used entities.

### 2A.4 Current Day Rates Event Entity

**Entity:** `event.eon_next_{serial}__current_day_rates`

**Behavior:**
- Fires a `rates_updated` event each coordinator refresh with today's rate schedule.
- For flat-rate tariffs: Single entry covering the full day.
- For ToU tariffs: Multiple entries, each with `start`, `end`, `rate`, `is_off_peak`.

**Event data:**
```python
{
    "rates": [
        {
            "start": "2026-02-28T00:00:00+00:00",
            "end": "2026-02-28T07:00:00+00:00",
            "rate": 0.075,       # GBP/kWh
            "is_off_peak": True,
        },
        {
            "start": "2026-02-28T07:00:00+00:00",
            "end": "2026-03-01T00:00:00+00:00",
            "rate": 0.2451,
            "is_off_peak": False,
        },
    ],
    "tariff_code": "E-1R-NEXT-DRIVE-...",
}
```

**Attributes (persistent, not just on event fire):**
- `rates`: The full rates list (always available, not just at event fire time)
- `tariff_code`: Current tariff code

**Unique ID:** `{serial}__current_day_rates`

**Why an event entity:** This follows HA best practices for data that represents a schedule/list rather than a scalar value. BottlecapDave's `current_day_rates` event entity is the canonical reference. The `rates` attribute also makes the data available to template sensors and cards without requiring users to catch events.

### 2A.5 Export Rate Sensor (Capability-Gated)

**Entity:** `sensor.eon_next_{serial}__export_unit_rate`
**Device class:** `MONETARY` (no `state_class`)
**Unit:** `GBP/kWh`

**Condition:** Only created when `meter.is_export` is `True` (see A4).

**Behavior:**
- Shows the current export rate from the tariff agreement.
- Functionally identical to `CurrentUnitRateSensor` but scoped to export meters.

**Attributes:**
- `tariff_code`, `tariff_name`, `valid_from`, `valid_to`

**Unique ID:** `{serial}__export_unit_rate`

### 2A.6 Export Daily Consumption Sensor (Capability-Gated)

**Entity:** `sensor.eon_next_{serial}__export_daily_consumption`
**Device class:** `ENERGY`
**State class:** `TOTAL`
**Unit:** `kWh`

**Condition:** Only created when `meter.is_export` is `True`.

**Behavior:**
- Shows today's total export in kWh, aggregated from the same REST consumption endpoint used for import meters but pointed at the export MPAN.

**Unique ID:** `{serial}__export_daily_consumption`

**Note:** Export consumption and export earnings sensors share the same data path as import sensors — the only difference is the MPAN used. No new API calls are needed.

### 2A Implementation Order

1. **A2** (tariff data enrichment) — extends the GraphQL query and coordinator data flow
2. **A3** (tariff pattern registry) — provides fallback for rate window detection
3. **A1** (new platforms) — registers `binary_sensor` and `event` in HA
4. **2A.1 + 2A.2** (previous/next rate sensors) — new `sensor` entities using enriched tariff data
5. **2A.3** (off-peak binary sensor) — first `binary_sensor` entity
6. **2A.4** (day rates event) — first `event` entity
7. **A4** (export detection) — prerequisite for export entities
8. **2A.5 + 2A.6** (export entities) — capability-gated sensor entities

---

## Phase 2B: Cost Intelligence

### 2B.1 Cost Tracker Entities

**Concept:** Let users attach any HA power/energy sensor (e.g., a smart plug measuring a washing machine) to a cost tracker that automatically costs its consumption against the user's current tariff rate. This is BottlecapDave's most popular "beyond basics" feature.

**Entity:** `sensor.eon_next_{name}__cost_tracker` (user-defined name)
**Device class:** `MONETARY`
**State class:** `TOTAL`
**Unit:** `GBP`

**Setup:** Via a new config flow step or via a service call. The user provides:
- A friendly name for the tracker (e.g., "Washing Machine")
- The `entity_id` of a power sensor (W) or energy sensor (kWh) to track
- Which meter's tariff to use for costing (dropdown of discovered meters)

**Behavior:**
- Listens to state changes on the tracked sensor.
- For **power sensors (W):** Integrates power over time to estimate consumption, then multiplies by the current unit rate.
- For **energy sensors (kWh):** Uses the delta between readings, multiplied by the current unit rate.
- Accumulates cost over each day. Resets at midnight (local time), recording the daily total.
- Standing charge is **not** included — this tracks marginal cost of individual device usage.

**Attributes:**
- `tracked_entity`: The entity being tracked
- `meter_serial`: Which meter's tariff is applied
- `today_consumption_kwh`: Total kWh tracked today
- `today_cost`: Total cost today (same as state)
- `last_reset`: Midnight timestamp

**Services:**

- `eon_next.reset_cost_tracker`
  - **Target:** Cost tracker entity
  - **Purpose:** Reset the accumulator to zero before the automatic midnight reset
  - **Use case:** "I want to track just this laundry cycle"

- `eon_next.update_cost_tracker`
  - **Target:** Cost tracker entity
  - **Parameters:** `enabled` (bool)
  - **Purpose:** Temporarily pause/resume tracking

**Storage:** Cost tracker configuration is stored via HA's `Store` helper so it persists across restarts. Each tracker is a dict:
```python
{
    "id": "washing_machine",
    "name": "Washing Machine",
    "tracked_entity_id": "sensor.washing_machine_energy",
    "meter_serial": "21L1234567",
    "enabled": True,
}
```

**Implementation notes:**
- Cost trackers run on HA event bus state change listeners, not the coordinator poll cycle. This gives them real-time costing.
- Rate lookup reads from the coordinator's latest `tariff_unit_rate` for the associated meter.
- For ToU tariffs, the rate used at each state change reflects the current active rate, so cost tracking is rate-period-aware automatically.

### 2B.2 Account Balance Sensor

**Entity:** `sensor.eon_next_{account_number}__account_balance`
**Device class:** `MONETARY`
**State class:** `MEASUREMENT`

Wait — `MEASUREMENT` + `MONETARY` is forbidden by HA. Use no `state_class` instead.

**Device class:** `MONETARY`
**State class:** None
**Unit:** `GBP`

**Behavior:**
- Shows the current account balance in pounds.
- Positive = credit, negative = debit.
- Updated each coordinator refresh (balance comes from `headerGetLoggedInUser`, already fetched at init — but we need to re-fetch periodically).

**Implementation:**
- Currently `headerGetLoggedInUser` is only called at integration startup. To keep balance fresh, call it on each coordinator refresh cycle (or on a slower cadence, e.g., every 4 hours).
- Since the query is lightweight and already authenticated, adding it to the coordinator cycle has minimal cost.

**Unique ID:** `{account_number}__account_balance`

**Attributes:**
- `account_number`
- `last_updated`: Timestamp of last successful balance fetch

### 2B.3 Previous Day Consumption Sensor (Explicit)

**Entity:** `sensor.eon_next_{serial}__previous_day_consumption`
**Device class:** `ENERGY`
**State class:** `TOTAL`
**Unit:** `kWh`

**Behavior:**
- Shows yesterday's total consumption in kWh.
- Derived from the same consumption data already fetched by the coordinator (96 half-hourly slots cover two days). The `_aggregate_yesterday_consumption()` method already exists in the coordinator but is currently only used internally for cost calculation.
- Value updates once per coordinator refresh. Yesterday's value stabilizes after ~02:00 when all 48 half-hourly entries have arrived.

**Attributes:**
- `entry_count`: Number of half-hourly entries that contributed to the total (max 48)
- `data_complete`: `True` when `entry_count >= 44` (the same threshold used for cost calculation)
- `last_reset`: Yesterday's midnight ISO timestamp

**Unique ID:** `{serial}__previous_day_consumption`

**Why separate from daily consumption:** The existing `DailyConsumptionSensor` shows **today's** rolling total. Users frequently want yesterday's final number for dashboards, notifications, and comparisons. Making it explicit avoids template sensor workarounds.

### 2B Implementation Order

1. **A5** (account balance storage) — small prerequisite
2. **2B.3** (previous day consumption) — trivial, uses existing coordinator method
3. **2B.2** (account balance sensor) — uses A5, requires minor coordinator change
4. **2B.1** (cost tracker entities + services) — largest feature, depends on working tariff rate data

---

## Entity Summary

### Phase 2A Entities

| Entity | Platform | Condition | Unique ID Pattern |
|---|---|---|---|
| Previous Unit Rate | `sensor` | All meters | `{serial}__previous_unit_rate` |
| Next Unit Rate | `sensor` | All meters | `{serial}__next_unit_rate` |
| Off Peak | `binary_sensor` | ToU tariffs only | `{serial}__off_peak` |
| Current Day Rates | `event` | All meters | `{serial}__current_day_rates` |
| Export Unit Rate | `sensor` | Export meters only | `{serial}__export_unit_rate` |
| Export Daily Consumption | `sensor` | Export meters only | `{serial}__export_daily_consumption` |

### Phase 2B Entities

| Entity | Platform | Condition | Unique ID Pattern |
|---|---|---|---|
| Previous Day Consumption | `sensor` | All meters | `{serial}__previous_day_consumption` |
| Account Balance | `sensor` | All accounts | `{account_number}__account_balance` |
| Cost Tracker | `sensor` | User-created | `cost_tracker__{id}` |

### New Services (Phase 2B)

| Service | Purpose |
|---|---|
| `eon_next.reset_cost_tracker` | Reset a cost tracker's accumulator to zero |
| `eon_next.update_cost_tracker` | Enable/disable a cost tracker |

---

## API Changes Required

### GraphQL Query Modification (A2)

Extend the `HalfHourlyTariff` fragment in `GET_ACCOUNT_AGREEMENTS_QUERY` to request time windows per rate band:

```graphql
... on HalfHourlyTariff {
  unitRates {
    value
    validFrom
    validTo
  }
  standingCharge
}
```

**Validation needed:** Confirm that `validFrom`/`validTo` are available on `unitRates` entries in the E.ON Next Kraken instance. If not, the tariff pattern registry (A3) handles rate window detection.

### Balance Refresh (2B.2)

Add a periodic `headerGetLoggedInUser` call to the coordinator cycle (or a secondary coordinator with a longer interval, e.g., 4 hours).

### No New Endpoints Required

All other features use data already fetched by existing API calls. Export meters use the same REST consumption endpoint with a different MPAN. Cost trackers use HA event bus data, not API calls.

---

## File Changes Summary

### New Files

| File | Purpose |
|---|---|
| `binary_sensor.py` | Off-peak binary sensor entity |
| `event.py` | Day rates event entity |
| `tariff_patterns.py` | Known tariff structure registry |
| `services.py` | Cost tracker service handlers |
| `services.yaml` | Service definitions for HA |
| `cost_tracker.py` | Cost tracker state management and storage |

### Modified Files

| File | Changes |
|---|---|
| `const.py` | Add `PLATFORMS` entries, new constants |
| `eonnext.py` | Extend `GET_ACCOUNT_AGREEMENTS_QUERY` for rate time windows; add `is_export` to `ElectricityMeter`; store balance on `EnergyAccount` |
| `coordinator.py` | Flow enriched tariff data (rate schedule, ToU flag); add previous day consumption to meter data dict; add periodic balance refresh |
| `sensor.py` | Add `PreviousUnitRateSensor`, `NextUnitRateSensor`, `ExportUnitRateSensor`, `ExportDailyConsumptionSensor`, `PreviousDayConsumptionSensor`, `AccountBalanceSensor`, cost tracker sensor entities |
| `models.py` | Potentially extend `EonNextRuntimeData` if cost tracker storage is needed |
| `__init__.py` | Register services, set up cost tracker storage |
| `manifest.json` | Version bump (managed by release-please) |

---

## Testing Strategy

### Manual Validation Required

- Confirm `unitRates { value validFrom validTo }` works in GraphQL against E.ON Next Kraken
- Test with at least one flat-rate account and one ToU account
- Verify export MPAN detection with a real export customer (or mock data)
- Verify cost tracker accuracy over a 24-hour period against known consumption

### Automated Tests to Add

- Unit tests for `tariff_patterns.py` — pattern matching, edge cases (midnight crossover, DST transitions)
- Unit tests for previous/next rate calculation logic
- Unit tests for off-peak determination from both API schedule and pattern registry
- Unit tests for cost tracker accumulation and reset logic
- Unit tests for export meter detection from MPAN structure

### Edge Cases to Cover

- DST transition: off-peak windows that span the clock change
- Tariff changeover: agreement `validTo` expires mid-day, new agreement starts
- Missing data: no tariff data available (sensors show `unknown`, not crash)
- Flat-rate tariffs: previous/next rate show same value, off-peak is `unavailable`
- Half-hourly tariffs with averaged rates: rate schedule has many entries
- Export meter with no consumption data yet (new install)

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| `unitRates` doesn't expose `validFrom`/`validTo` | Cannot determine rate windows from API alone | Tariff pattern registry (A3) provides fallback |
| Export MPAN detection has false positives | Entities created for non-export meters | Safe default: entities show `unknown` data, user can disable |
| Cost tracker state loss on restart | Users lose today's accumulated cost | Use HA `Store` for persistence; accept small gap during restart |
| Unknown ToU tariff not in pattern registry | Off-peak sensor shows `unavailable` | Document how users can report tariffs; entity degrades gracefully |
| Balance query adds load to coordinator cycle | Slightly longer refresh time | Run balance on a slower cadence (every 4h) or separate coordinator |

---

## Success Criteria

- Users on flat-rate tariffs see previous/next rate sensors with stable values and off-peak as `unavailable` (no false signals)
- Users on Next Drive / Next Smart Saver / Next Pumped see working off-peak binary sensor that enables reliable automations
- Users with export meters see export rate and export consumption sensors
- Cost tracker users can track at least one device's daily electricity cost with <5% error vs manual calculation
- Account balance sensor shows correct value matching the E.ON Next app
- No regressions in existing sensor behavior, frontend, or Energy Dashboard statistics
