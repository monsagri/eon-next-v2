# Spec 05 - Cost Trackers and Service Layer

Scope: `cost_tracker.py`, `services.py`, `services.yaml`.

Reference model: HA core's `utility_meter` (delayed saves, midnight timer via
`async_track_time_change`) is the pattern most of this spec converges on.

## High

### 5.1 Storage write on every tracked-entity state change [reported]

- Where: `custom_components/eon_next/cost_tracker.py:272` (`_save` →
  `Store.async_save`), handler wiring at `:368-385`.
- Failure scenario: tracking a mains power sensor that updates every 1–10 s produces
  a disk write per update - I/O storm and flash/SD wear on typical HA installs.
- Fix: `Store.async_delay_save` (10–30 s); flush once in `async_shutdown`.

## Medium

### 5.2 Midnight rollover only runs inside the state handler [reported]

- Where: `cost_tracker.py:329-340` with `:237-247`.
- Two failures: (a) an entity that stops updating keeps yesterday's cost and a stale
  `last_reset` indefinitely; (b) rollover clears `last_energy_value`, so the first
  delta after midnight is discarded - for hourly-updating energy sensors that's up to
  an hour of consumption silently dropped every day.
- Fix: one `async_track_time_change(hour=0, minute=0)` in the manager performing
  rollovers deterministically; on rollover, split (not discard) the spanning delta.

### 5.3 Pausing a tracker defers cost instead of excluding it [reported]

- Where: `cost_tracker.py:242-244, 290-303`.
- Problem: a disabled tracker's handler returns early without advancing
  `last_energy_value`; on re-enable the first delta spans the whole paused period.
- Failure scenario: pause for a week, re-enable → the week's consumption is billed in
  one lump at the current rate. Fix: keep advancing the baseline while disabled.

### 5.4 `target:` selectors declared but rejected by the schemas [reported]

- Where: `services.py:149-152, 157-162` vs `services.yaml:40-43, 48-51`.
- Problem: `reset_cost_tracker`/`update_cost_tracker` declare `target:` in
  services.yaml, but the strict `vol.Schema` only accepts `entity_id`; HA merges
  target fields into `call.data`, so picking a device/area/label in the UI fails with
  "extra keys not allowed @ data['device_id']".
- Fix: accept and resolve target selectors (or drop `target:` from services.yaml).

### 5.5 No validation at tracker creation [reported]

- Where: `services.py:66-104` (`add_cost_tracker`).
- Problem: explicit `entry_id` never validated against `meter_serial`;
  `tracked_entity_id` never checked for existence or power/energy device class.
- Failure scenario: a typo'd serial or wrong entity creates a tracker that silently
  never accrues cost (rate lookup fails at debug level only).
- Fix: validate at add time and raise `ServiceValidationError`.

## Low

### 5.6 No removal lifecycle for trackers [reported]

- Where: `cost_tracker.py` (whole file), `services.py`.
- Problem: no `remove_cost_tracker` service and no `async_remove_tracker`; trackers
  and their registry entities are permanent unless the user hand-edits
  `.storage/eon_next_<entry>_cost_trackers`. Orphans accumulate forever.
- Fix: add removal (unsubscribe, delete from storage, `er.async_remove`) + service.

### 5.7 Reset/update silently no-op on wrong entity_ids [reported]

- Where: `services.py:106-129`. Non-tracker entity_ids or unloaded entries are
  skipped with a success response. Raise `ServiceValidationError` instead.

### 5.8 W↔kW unit flip between consecutive updates mis-scales one interval [reported]

- Where: `cost_tracker.py:254, 305-313` - `_delta_kwh` pairs `new_state`'s unit with
  `old_state`'s value in the power branch; a unit change between updates makes that
  interval's energy off by 1000x.

### 5.9 Untracked task per state event races shutdown [reported] (uncertain)

- Where: `cost_tracker.py:229-235` - the listener wraps the async handler in an
  untracked `hass.async_create_task`; an event arriving during unload can run
  `_save()` after `async_shutdown()` persisted final state. Also amplifies 5.1 (one
  task + full store write per event). Fix: `entry.async_create_task` /
  track-and-cancel, or a synchronous queue.

Also: `services.py:166-174` `async_unregister_services` is dead code - nothing calls
it, so services stay registered (and silently no-op) after all entries unload.
[reported]

## Non-finding (checked, OK)

- No storage corruption from concurrent service calls: `Store` serializes writes
  internally and `_trackers` mutations are synchronous before the first await.
