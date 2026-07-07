# Spec 02 — Energy Dashboard Statistics and Historical Backfill

Scope: `statistics.py`, `backfill.py`, coordinator statistics-import paths.

The project guardrail (`AGENTS.md`) requires external statistics imports to avoid
duplicate or regressive imports — cumulative sums must stay monotonic and hours must
never be imported twice. Several paths currently violate this.

## Critical

### 2.1 Transient recorder error corrupts cumulative sums [verified]

- Where: `custom_components/eon_next/statistics.py:140-147` (`_get_last_stat`
  swallows all exceptions → `(None, 0.0)`), `statistics.py:204-220` (import loop).
- Problem: on any recorder exception (busy DB, migration), the import proceeds with
  **no skip guard** (`last_start=None`) and a **zero sum base** (`last_sum=0.0`).
- Failure scenario: one failed lookup during a 30-min poll re-imports the last ~48 h
  of hours with sums restarting at 0; `async_add_external_statistics` overwrites the
  existing rows with regressed sums — large negative spike in the Energy Dashboard
  that requires manual statistics repair.
- Fix: let `_get_last_stat` re-raise (or return a sentinel) and **skip the import
  cycle entirely** when the last-stat lookup fails. Never import with a guessed base.

### 2.2 Backfill advances past failed chunks — permanent holes [verified]

- Where: `custom_components/eon_next/backfill.py:451-473`; root cause in
  `eonnext.py:481-489` (`async_get_consumption` returns `None` for non-200 and
  `aiohttp.ClientError` alike).
- Problem: `None` (error) is indistinguishable from "no data for this period";
  `next_start` advances and `done` can be set regardless (lines 469-471).
- Failure scenario: one HTTP 500 or network blip during a 3650-day backfill leaves a
  permanent, never-retried hole in history; the state machine reports success.
- Fix: make `async_get_consumption` raise `EonNextApiError` on transport/HTTP errors
  (reserving `None`/empty for genuine no-data). Backfill then retries the same chunk
  next cycle with backoff. This same change surfaces auth errors properly
  (spec 01, finding 1.6).

### 2.3 Today's consumption double-counted across granularities [verified premise]

- Where: `custom_components/eon_next/backfill.py:447,470` (final chunk includes
  *today*; `done = end_date >= today`), `statistics.py:209` (only `> last_start`
  guards), and `coordinator.py:432-452` (daily-fallback list imported as-is).
- Problem A (backfill): the last chunk imports today's **partial** consumption as one
  daily bucket at local midnight; backfill completes, coordinator imports re-enable,
  and the next half-hourly import adds today's hours (all `> last_start`) **on top**.
- Problem B (coordinator daily fallback): on a fresh install where half-hourly is
  temporarily unavailable, today's partial day is imported as a midnight daily
  bucket; when half-hourly recovers, the same consumption is imported additively.
- Failure scenario: the day backfill finishes (or any half-hourly outage day),
  today's usage is counted twice in the Energy Dashboard.
- Fix: backfill must end at **yesterday**; exclude daily-granularity data from the
  statistics import entirely (the coordinator should own "today" exclusively via
  half-hourly data). Note the inverse waste: when half-hourly worked earlier the same
  day, daily-fallback totals are always skipped by the guard anyway.

## High

### 2.4 Live statistics are suspended for the entire backfill (~450 days at defaults) [reported]

- Where: `custom_components/eon_next/backfill.py:232-241` (import guard disables
  coordinator statistics while backfill incomplete), `backfill.py:420-473` (one chunk
  = 1 day per meter per cycle; the per-run request budget is never spent twice on the
  same meter), defaults in `const.py:32-36` (chunk 1 day, cycle 180 min, lookback
  3650 days).
- Failure scenario: enabling backfill with default lookback suspends **live** Energy
  Dashboard statistics for roughly 450 days; worse with multiple meters.
- Fix (design change): import backfill chunks with sums computed relative to the
  statistics window being written (fetch surrounding rows via
  `statistics_during_period` and rewrite subsequent sums, as core's energy import
  services do). That removes the global newest-row skip guard and
  `set_statistics_import_enabled` entirely, and lets `requests_per_run` spend
  multiple chunks per meter per cycle. Also fixes 2.5.

### 2.5 Disable→re-enable mid-backfill silently loses the remaining range [reported]

- Where: `custom_components/eon_next/backfill.py:487-492` + `statistics.py:209`.
- Problem: disabling backfill re-enables coordinator imports, which set the newest
  statistic to ~now; on re-enable, every remaining historical day is `<= last_start`
  and silently skipped while `next_start` advances to done.
- Failure scenario: user toggles backfill off for a week and back on — the entire
  un-backfilled middle range is permanently lost; state machine reports "completed".

## Medium

### 2.6 Changing `lookback_days` wipes progress and (with rebuild) clears all history [reported]

- Where: `custom_components/eon_next/backfill.py:336-343`, clear at
  `backfill.py:391-396`.
- Failure scenario: user shrinks lookback 3650 → 365 to "finish faster": all
  per-meter progress resets, `rebuild_done=False`, and with rebuild enabled (default)
  **all** existing statistics are cleared — including history older than the new
  window. Fix: only reset progress when the window *extends*; never clear statistics
  outside the affected range without explicit opt-in.

### 2.7 Local dates with `Z` suffix shift chunks during BST [reported]

- Where: `custom_components/eon_next/backfill.py:448-449`
  (`f"{start_date}T00:00:00Z"`).
- Problem: chunk boundaries are local dates labeled UTC, so during BST the window is
  shifted 1 h relative to local days and `period_to` includes the start of an extra
  local day. With `page_size=day_count` and newest-first ordering (uncertain), the
  oldest day of a chunk can be truncated while `next_start` still advances past it —
  silent gap. Fix: build boundaries with `dt_util.start_of_local_day()` and convert
  to UTC properly; size `page_size` with headroom.

### 2.8 `asyncio.Event.set` handed to recorder as `on_done` [reported] (uncertain)

- Where: `custom_components/eon_next/backfill.py:391-396`.
- Problem: recorder invokes `on_done` on the recorder thread; `asyncio.Event` is not
  thread-safe, so the waiter may not wake promptly and the clear appears to time out
  after 120 s despite completing. Fix: wrap with
  `hass.loop.call_soon_threadsafe(event.set)`.

### 2.9 Possible gas unit mismatch for SMETS1 meters [reported] (uncertain)

- Where: `custom_components/eon_next/statistics.py:52-84` (imports values as kWh
  unconditionally) vs `eonnext.py:955-962` (readings arrive in m³).
- Problem: if Kraken returns half-hourly gas consumption in m³ for SMETS1 meters,
  statistics undercount by ~11x. Verify against a real SMETS1 account payload before
  fixing.

## Related coordinator findings

- `coordinator.py:246, 552, 590, 626` — "yesterday" computed as
  `(dt_util.now() - timedelta(days=1)).date()`: lands two days back between 00:00 and
  01:00 on the day after spring-forward. [reported]
- `coordinator.py:624-632` — `_yesterday_midnight_iso` reuses today's UTC offset via
  `.replace()`; wrong offset on DST transition days. [reported]
- `coordinator.py:290-299` — on transient consumption failure only `previous_day_*`
  fields are retained; `daily_consumption`/`consumption` flip to `None`, so the
  today-consumption sensor goes unknown — inconsistent with the retention convention
  used for tariff/cost fields. [reported]
- `coordinator.py:414-420, 127-129` — `page_size=96` can truncate the 50-slot
  clocks-back day late in the evening; the hardcoded `>= 44` completeness threshold
  mislabels that day. [reported]
- `coordinator.py:53-63` — `last_updated` stamped `utcnow()` even when the balance
  fetch failed and a stale balance is re-published. [reported]
