# Spec 06 — Frontend Panel, Cards, and WebSocket API

Scope: `websocket.py`, `panel.py`, `frontend/src/`.

## Medium

### 6.1 Panel and cards never refresh after mount [reported]

- Where: `frontend/src/controllers/ws-data-controller.ts:30-58`.
- Problem: fetch-once with no polling, no hass-reconnect resubscription, no request
  versioning. Two failures: (a) a wall-mounted dashboard shows data from mount time
  forever (week-old "today" consumption); (b) a slow in-flight fetch resolving after
  a manual `refresh()` overwrites the newer result with stale data.
- Fix: periodic refresh (align with the 30-min coordinator cadence), refetch on
  `hass` reconnect, and drop out-of-order responses (request id/abort).
- Related polish: `refresh()` sets `loading=true` while keeping `data`, and the panel
  (`panel.ts:38`) renders the full skeleton whenever `loading` — any refresh blanks
  the UI instead of stale-while-revalidate (`ws-data-controller.ts:37-48`). The
  summary card's `_sparklineFetched` flag is never reset, so sparklines fetch exactly
  once per element lifetime (`summary-card.ts:35, 45-49`). [low]

### 6.2 Local dates with `Z` suffix in consumption history [reported]

- Where: `custom_components/eon_next/websocket.py:301-303` (`_entries_from_rest`).
- Problem: `period_from`/`period_to` built from **local** dates suffixed
  `T00:00:00Z`. During BST the requested window is offset 1 h from local day
  boundaries — daily buckets shift consumption across days / include partial days.
  Same class of bug as backfill (spec 02, 2.7); fix both with a shared helper.

### 6.3 Panel registration TOCTOU across concurrent entries [reported] (uncertain)

- Where: `custom_components/eon_next/panel.py:24-51` + `__init__.py:258`.
- Problem: two entries setting up concurrently can both pass the
  `DOMAIN in hass.data["frontend_panels"]` check, then both reach
  `async_register_panel` after the intervening awaits — the second raises
  `ValueError("Overwriting panel eon_next")` and fails that entry's setup.
- Fix: guard with an `asyncio.Lock`/hass.data flag set before the first await.
  Related [low]: registration keys off the internal `hass.data["frontend_panels"]`
  dict rather than a public API — brittle across HA versions (`panel.py:24, 70`).

## Low

### 6.4 Client-side "today's cost" uses the flat rate [reported]

- Where: `frontend/src/cards/summary-card.ts:157-159` — computed as
  `daily_consumption * unit_rate + standing_charge`; wrong for TOU tariffs and
  inconsistent with the backend's `previous_day_cost` methodology on the adjacent
  row. Prefer serving a backend-computed value (see spec 04).

### 6.5 No admin gating on WS commands — confirm intentional [reported]

- Where: `websocket.py` (all five commands; no `@websocket_api.require_admin`).
- Any authenticated user, including restricted ones, can enumerate meter serials,
  tariffs, account consumption, and trigger upstream REST calls (up to 365 days per
  `consumption_history` call). Consistent with the panel's `require_admin=False`,
  but should be an explicit, documented decision.

### 6.6 Schema/docstring drift on `days` [reported]

- Where: `websocket.py:41` (allows 1–365) vs `schemas.py:73` (documents 1–30, and is
  the codegen source of truth). Align one to the other.

### 6.7 Needless async wrapper [reported]

- Where: `websocket.py:74` — `ws_dashboard_summary` is
  `@websocket_api.async_response` with no awaits; a plain `@callback` avoids a task
  spawn per call.

## Non-findings (checked, OK)

- **Codegen is in sync**: `frontend/src/api.generated.ts` matches `schemas.py`
  field-for-field (all 9 dataclasses, 3 zero-arg commands); hand-written wrappers in
  `api.ts` match the voluptuous schemas. Only 6.6's docstring drift.
- WS input validation and exception handling are otherwise fine — HA's WS layer
  converts handler exceptions to `unknown_error` rather than killing the connection.
- Static-path/reload handling is correct: the `hass.data` guard prevents the aiohttp
  double-register `RuntimeError`, and unload reconciles via
  `_async_reconcile_frontend(exclude_entry_id=...)`.
