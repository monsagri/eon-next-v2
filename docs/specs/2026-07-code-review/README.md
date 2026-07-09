# Full Code Review - July 2026 (Handoff Specs)

Point-in-time review of the whole integration (Python + frontend) at version 1.9.0,
branch `claude/fresh-repo-init-2odndw`. Each spec in this folder is a self-contained
handoff document for one theme: context, findings with `file:line` references,
severity, failure scenario, and a suggested fix. No code was changed as part of the
review.

## Verification legend

- **[verified]** - confirmed by directly reading the cited code during the review.
- **[reported]** - found by a subsystem reviewer and consistent with surrounding
  code, but not independently re-verified line-by-line. Re-check before fixing.
- **(uncertain)** - the finder itself flagged residual doubt; verify the premise first.

## Severity definitions

- **Critical** - active data corruption, runtime instability, or user-visible breakage
  under normal operation.
- **High** - wrong results or degraded behavior for a meaningful class of users
  (notably time-of-use tariff customers), or latent data loss.
- **Medium** - correctness/UX defects with bounded impact, resource waste.
- **Low** - hygiene, dead code, latent traps, minor inconsistencies.

## Spec index

| Spec | Theme | Critical | High | Medium | Low |
|---|---|---|---|---|---|
| [01-entry-lifecycle-and-auth](01-entry-lifecycle-and-auth.md) | Setup, reload, token lifecycle, re-auth | 1 | 2 | 3 | 3 |
| [02-statistics-and-backfill](02-statistics-and-backfill.md) | Energy Dashboard statistics, historical backfill | 3 | 2 | 3 | 0 |
| [03-sensor-semantics](03-sensor-semantics.md) | State classes, unique IDs, entity behavior | 1 | 0 | 4 | 3 |
| [04-tariff-and-tou-costing](04-tariff-and-tou-costing.md) | Time-of-use rates, off-peak detection | 0 | 2 | 4 | 2 |
| [05-cost-tracker-and-services](05-cost-tracker-and-services.md) | Cost trackers, service layer | 0 | 1 | 4 | 4 |
| [06-frontend-and-websocket](06-frontend-and-websocket.md) | Panel, cards, WS API | 0 | 0 | 3 | 4 |
| [07-hygiene-tests-docs](07-hygiene-tests-docs.md) | Dead code, test gaps, doc drift | 0 | 1 | 1 | 5 |

## Suggested order of attack

1. **Reload loop** (spec 01, finding 1.1) - small fix, biggest runtime-stability win.
2. **Statistics integrity** (spec 02, findings 2.1–2.3) plus making
   `async_get_consumption` raise on errors instead of returning `None` - one API-client
   change unlocks backfill retry and correct auth propagation.
3. **State-class corrections** (spec 03, finding 3.1) - small diff, stops active
   statistics pollution. User-visible statistics change: needs changelog + migration
   callout per `docs/ai/conventions.md`.
4. **Wire `_find_current_window()` into costing paths** (spec 04) - fixes all three
   TOU-costing errors with plumbing that already exists in `tariff_helpers.py`.
5. **Backfill scheduling rework** (spec 02, finding 2.4) - larger design change; live
   imports should never pause.

## Cross-cutting themes

- **TOU tariffs are systematically mispriced** in three independent places (current
  unit rate sensor, cost trackers, previous-day cost) even though
  `tariff_helpers._find_current_window()` implements the correct lookup. See spec 04.
- **"Error" and "no data" are conflated** by the API client (`None` for both), which
  cascades into backfill holes (spec 02) and silent auth swallowing (spec 01).
- **Local dates formatted with a UTC `Z` suffix** appear in at least three call sites
  (backfill chunking, websocket history, coordinator "yesterday" math) - every one is
  an hour off during BST, which is half the year for the entire UK user base.
- **Recorder write amplification**: unchanged schedules and rate lists are re-written
  to the recorder every 30-minute refresh (event entity, EV schedule attributes), and
  cost trackers write storage on every tracked-entity state change.
