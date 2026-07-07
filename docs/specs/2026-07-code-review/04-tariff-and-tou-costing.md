# Spec 04 — Tariff Logic and Time-of-Use Costing

Scope: `tariff_helpers.py`, `tariff_patterns.py`, and every place a rate is applied
to consumption.

**Theme:** TOU customers (the integration's headline audience — Next Drive etc.) get
systematically wrong costs in three independent places, even though
`tariff_helpers._find_current_window()` already implements the correct
current-window lookup. One wiring effort fixes all three.

## High

### 4.1 "Current Unit Rate" reports the schedule *mean*, not the current rate [reported]

- Where: `custom_components/eon_next/sensor.py:349-352` (reads `unit_rate`),
  `eonnext.py:639-661` (`tariff_unit_rate` = `sum/len` over all `unitRates`
  schedule values), fallback chain in `coordinator.py` (the daily-costs endpoint is a
  defunct stub returning `None`, so the mean is what always wins for TOU).
- Failure scenario: the sensor is documented "for use with the HA Energy Dashboard"
  as the current-price entity; dashboard cost calculations are wrong in every
  half-hour where the actual price differs from the mean — i.e. essentially always on
  a TOU tariff.
- Fix: when `tariff_is_tou` and a schedule with time windows exists, resolve
  `_find_current_window(schedule, now)` and expose that value; keep the mean only as
  a last-resort fallback.

### 4.2 Previous-day cost priced at the flat/average rate [reported]

- Where: `custom_components/eon_next/coordinator.py:237-244`.
- Problem: yesterday's consumption total is multiplied by the single (average) unit
  rate; on TOU tariffs (where overnight usage dominates by design) this materially
  overstates cost.
- Fix: when `tariff_rates_schedule` is present, cost each half-hourly entry against
  its matching window and sum.

## Medium

### 4.3 Cost trackers always use the flat rate [reported]

- Where: `custom_components/eon_next/cost_tracker.py:317-323` (`_current_rate`).
- Problem: ignores `tariff_is_tou`/`tariff_rates_schedule` that the coordinator
  already carries. An overnight EV-charging tracker — the flagship use case — is
  costed at the day rate. Fix alongside 4.1 (same lookup). See also spec 05 for the
  tracker's other defects.

### 4.4 "Off-peak = minimum rate in schedule" breaks on dynamic tariffs [reported]

- Where: `custom_components/eon_next/tariff_helpers.py:311-321` (definition), same
  flag at `:194, :272, :430`.
- Problem: off-peak is defined as current rate `==` the minimum across the whole
  returned schedule, with float equality. On genuinely dynamic half-hourly tariffs
  (many distinct prices) the binary sensor is almost never on; one anomalously low
  slot anywhere in the window redefines "off-peak" for everything else.
- Fix: for two-level tariffs compare against distinct rate tiers with a tolerance;
  for dynamic tariffs consider percentile-based or pattern-window-based definition,
  and document the semantics.

### 4.5 Pattern fallback assumes exactly two price levels [reported]

- Where: `tariff_helpers.py:197-217, 275-293`.
- Problem: previous/next-rate fallback returns `min`/`max` of distinct schedule
  values with no validity window; on a three-rate tariff the middle rate can never be
  reported and `is_off_peak` is silently wrong.

### 4.6 Tariff pattern matching is an unanchored substring [reported]

- Where: `custom_components/eon_next/tariff_patterns.py:43-55`.
- Problem: case-insensitive substring match of `product_prefix` against the tariff
  code — any future code *containing* "NEXT-DRIVE" (e.g. a V2 with different hours)
  silently inherits the 00:00–07:00 window with no log.
- Fix: anchor the match to the product segment of the code and log which pattern
  matched at debug level.

## Low

### 4.7 Naive schedule datetimes assumed UTC [reported] (uncertain)

- Where: `tariff_helpers.py:37-40` (`_parse_dt`).
- Problem: offset-less `validFrom`/`validTo` strings are assumed UTC; if Kraken emits
  local-time strings, every rate window (off-peak detection, previous/next rate,
  `build_day_rates`) is 1 h wrong during BST. Verify with a real payload; if naive
  strings ever occur, interpret them as Europe/London.

### 4.8 DST fold/gap handling in transition math [reported]

- Where: `tariff_helpers.py:120-128` (`_next_transition_dt` uses
  `replace()`/`combine()` on wall-clock times).
- Problem: a boundary landing in the spring-forward gap serializes with a wrong
  offset. Latent for current UK patterns (boundaries at 00/07/13/16, UK DST changes
  at 01:00) but a trap for future patterns.

### 4.9 Agreement selection compares datetime strings to a bare date [reported]

- Where: `custom_components/eon_next/eonnext.py:575, 620-628`.
- Problem: `validFrom`/`validTo` ISO datetimes compared lexically against
  `"YYYY-MM-DD"`; an agreement starting today is skipped for its entire first day
  (`"...T00:00:00+00:00" > "..."`), so tariff sensors go unknown/stale on switchover
  day. Timezone ignored. Fix: parse to aware datetimes and compare properly.

Also related: the export-meter heuristic `mpan[:2] == "00"` (`eonnext.py:822-824`)
is unreachable — the API returns the 13-digit MPAN core which never starts "00" — so
export detection silently depends only on register names. [reported]
