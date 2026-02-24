# Claude Adapter Instructions

This file is a thin adapter. Use repository guidance from:

1. `AGENTS.md` (canonical root guidance)
2. `docs/ai/context.md`
3. `docs/ai/conventions.md`
4. `docs/ai/workflows.md`
5. `docs/ai/checklist.md`

## Claude-Specific Notes

- Prefer minimal, focused patches.
- Keep edits consistent with Home Assistant integration patterns already used in this repository.
- Treat release metadata sync as non-negotiable: `manifest.json` version, top `CHANGELOG.md` version, and `.release-please-manifest.json` version (when present) must stay aligned.
- If guidance conflicts with runtime/system instructions, follow runtime/system instructions first.
