# Agent Guidance

This repository uses `AGENTS.md` as the canonical instruction source for coding agents (Codex, Claude, Cursor, Copilot Chat, and similar tools).

## Scope and Precedence

1. Runtime system/developer/user instructions (from the tool you are running in).
2. This file.
3. Files under `docs/ai/`.
4. Other project docs.

If instructions conflict and precedence does not resolve it, ask the user before making risky changes.

## Project Snapshot

- Project type: Home Assistant custom integration (HACS-distributed).
- Integration domain: `eon_next`.
- Code location: `custom_components/eon_next/`.
- Primary platform: `sensor`.
- Polling model: `DataUpdateCoordinator` (default 30 minutes).
- Supported Home Assistant version floor: see `hacs.json`.

## Source Documents

- `docs/ai/context.md`: Home Assistant + HACS + repository context.
- `docs/ai/conventions.md`: coding and architecture conventions.
- `docs/ai/workflows.md`: development, validation, and release workflows.
- `docs/ai/checklist.md`: pre-PR completion checklist.
- `planning/README.md`: index of planning references.
- `planning/current_state.md`: currently implemented capabilities snapshot.
- `planning/eon_next_capabilities.md`: API capability map and constraints.
- `planning/feature_ideas.md`: future capability ideas and backlog options.

## Non-Negotiable Guardrails

- Keep entity unique IDs stable unless there is an explicit migration plan and release note.
- Do not log credentials, JWT tokens, or refresh tokens.
- Keep authentication failures mapped to `ConfigEntryAuthFailed` so HA can trigger re-auth.
- Preserve consumption fallback behavior unless intentionally changing it:
  - REST half-hourly -> REST daily -> GraphQL `consumptionDataByMpxn`.
- Preserve runtime data pattern (`entry.runtime_data`) for config entries.
- Keep `manifest.json`, `hacs.json`, and `CHANGELOG.md` in sync for versioned release changes.
- For user-visible behavior changes, update both `README.md` and `CHANGELOG.md` in the same change before marking work complete.

## Validation Baseline

Run before claiming completion on code changes:

```bash
python -m compileall custom_components/eon_next
basedpyright -p pyrightconfig.json
```

Also ensure CI-relevant constraints still hold:

- Conventional Commits for commits and PR titles.
- HACS metadata remains valid.
- Hassfest metadata checks remain valid.

## Tool-Specific Adapters

The following files are adapters that should mirror this guidance instead of creating separate rule sets:

- `CLAUDE.md`
- `.cursor/rules/00-project.mdc`
- `.github/copilot-instructions.md`
