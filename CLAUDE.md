# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Canonical Guidance

`AGENTS.md` is the canonical instruction source; this file is a thin adapter. Consult, in order:

1. `AGENTS.md` (root guidance, guardrails, validation baseline)
2. `docs/ai/context.md` (HA/HACS/repository context)
3. `docs/ai/conventions.md` (coding and architecture conventions)
4. `docs/ai/workflows.md` (build, validate, release workflows)
5. `docs/ai/checklist.md` (pre-PR checklist)
6. `frontend/AGENTS.md` (frontend-specific conventions)

If guidance conflicts with runtime/system instructions, follow runtime/system instructions first.

## What This Is

A Home Assistant custom integration (HACS-distributed) for E.ON Next energy accounts. Integration domain: `eon_next`, in `custom_components/eon_next/`. Python 3.13, plus a Lit + TypeScript frontend in `frontend/` built with Rollup.

## Commands

Python validation (required before claiming completion):

```bash
python -m compileall custom_components/eon_next
basedpyright -p pyrightconfig.json          # typeCheckingMode: basic
python3 .github/scripts/check_release_metadata.py
```

Tests (pytest with `pytest-homeassistant-custom-component`; `asyncio_mode = auto`):

```bash
pip install -r requirements_test.txt
pytest                                       # all tests (testpaths = tests)
pytest tests/components/eon_next/test_coordinator.py            # one file
pytest tests/components/eon_next/test_coordinator.py -k name    # one test
```

Frontend (run from `frontend/`; required for any `frontend/` change):

```bash
npm run lint
npm run format:check
npm run typecheck
npm run build          # outputs committed bundles to custom_components/eon_next/frontend/
npm run codegen        # regenerate api.generated.ts from Python types (do not hand-edit)
```

Commit sanity: `npm run commitlint:last` (Conventional Commits enforced via Husky and on PR titles, since squash merges use the PR title).

## Architecture

Runtime flow: `__init__.py` sets up the config entry, stores runtime state on `entry.runtime_data` (`models.py`), and forwards to platforms (`sensor`, `binary_sensor`, `event`). `EonNextCoordinator` (`coordinator.py`) polls every 30 minutes; entities read from coordinator data keys — never call the API from entity properties.

- `eonnext.py` — API client: email/password auth, refresh-token persistence in config entry data, GraphQL + REST calls. Auth failures requiring user action must raise `ConfigEntryAuthFailed` (triggers HA re-auth).
- Consumption fetching has a deliberate fallback chain (do not change casually): REST half-hourly → REST daily. (The GraphQL `consumptionDataByMpxn` fallback was removed from the Kraken API.) Fallbacks are expected behavior, not exceptional logic.
- Coordinator data keys: meter serial for meters, `ev::<device_id>` for EV devices.
- `statistics.py` / `backfill.py` — external statistics import for the Energy Dashboard; avoid duplicate or regressive imports.
- `cost_tracker.py` / `services.py` — cost tracker entities with persistent storage, managed via `eon_next.*` services.
- `panel.py` + `websocket.py` — register the sidebar panel and the WebSocket API consumed by the frontend. `frontend/src/api.generated.ts` is generated from the Python types (`npm run codegen`).
- Frontend builds two committed bundles (`entrypoint.js` sidebar panel, `cards.js` Lovelace cards) so HACS installs need no build step.

## Non-Negotiable Guardrails

- Keep entity `unique_id` values stable; renames need an explicit migration plan and release note.
- Never log credentials, JWT/refresh tokens, or raw auth payloads.
- Release metadata lockstep: `custom_components/eon_next/manifest.json` version == top `CHANGELOG.md` version == `.release-please-manifest.json` version. CI enforces this (`metadata-consistency.yml`).
- User-visible behavior changes must update `README.md` and `CHANGELOG.md` in the same change.
- Sensor state-class rules matter for Energy Dashboard/long-term statistics — see `docs/ai/conventions.md` (e.g. `MEASUREMENT` cannot pair with `device_class=MONETARY`; `TOTAL` requires `last_reset`).
- Releases go through release-please: SemVer is computed from Conventional Commit types; merging the release PR publishes the tag/release HACS discovers.

## Claude-Specific Notes

- Prefer minimal, focused patches consistent with existing HA integration patterns.
- **Before pushing changes**, run `/review` (`.claude/commands/review.md`) for a full code review against HA/HACS conventions. Do not push if the review reports blocking issues.
- Before implementing HA-facing features/fixes, verify the approach against https://developers.home-assistant.io/ — HA enforces semantics that compile/type checks won't catch.
