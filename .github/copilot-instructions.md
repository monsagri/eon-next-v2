# GitHub Copilot Instructions

Follow repository guidance in this order:

1. `AGENTS.md`
2. `docs/ai/context.md`
3. `docs/ai/conventions.md`
4. `docs/ai/workflows.md`
5. `docs/ai/checklist.md`

Key constraints:

- Preserve Home Assistant integration contracts and entity stability.
- Avoid credential/token leakage in logs or code.
- Keep release metadata strictly aligned: `manifest.json` version must match latest `CHANGELOG.md` version and `.release-please-manifest.json` when present.
- Use Conventional Commit format for commits and PR titles.
- Before pushing, run a code review against the checklist in `docs/ai/checklist.md` and the conventions in `.claude/commands/review.md`.
