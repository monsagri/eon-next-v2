# Dependabot Consolidation — Handoff

> Working note for a full-environment agent/maintainer. **Delete this file before merging** — it is not intended for `main`.

Branch: `claude/dependabot-consolidate-prs-6imssw` — consolidates all 14 open Dependabot PRs into one branch.

## What was done & verified in the cloud env

The cloud env had Node 22 / npm 10 but only **Python 3.11** and **no `basedpyright`**, and the Home Assistant test stack cannot be installed on 3.11. Everything Node-side was fully verified; the Python-side static/type/test gates were deferred to CI (see below).

| Area | Change | Verified here |
|------|--------|---------------|
| GitHub Actions | checkout v4→v7, setup-python v5→v6, setup-node v4→v6, semantic-pull-request v5→v6 | edits applied; YAML sanity |
| pip (test-only) | `pytest-homeassistant-custom-component` `>=0.13.313`→`>=0.13.316` | `python -m compileall custom_components/eon_next` ✅ (py3.11) |
| root npm (dev) | `@commitlint/cli` & `config-conventional` 20→21, `lint-staged` 16→17 | `npm install` clean; commitlint/lint-staged git hooks run on commit ✅ |
| frontend npm (dev) | eslint 9→10, typescript 5→6, eslint-plugin-wc 2→3, `@rollup/plugin-terser` 0.4→1.0, globals 15→17, + non-major group (typescript-eslint, eslint-plugin-lit, prettier, rollup, rollup-plugin-lit-css, date-fns, lit) | `format:check` ✅ `lint` ✅ `typecheck` ✅ `build` ✅ `build:check` ✅ |

### Upgrade-driven source changes (not just version bumps)
- **eslint-plugin-wc 3.x**: `wc/guard-super-call` no longer flags guarded lifecycle `super.*()` calls. Removed three now-dead `// eslint-disable-next-line wc/guard-super-call` directives in `bar-chart.ts`, `consumption-view.ts`, `pie-chart.ts` (they became "unused directive" warnings).
- **prettier 3.9.x**: changed ternary-in-template-literal formatting → reformatted 12 `frontend/src` files. Because these ternaries live inside Lit `html\`\`` templates, the whitespace change alters bundle output, so the committed bundles (`entrypoint.js`, `cards.js`) were rebuilt.

## ⚠️ Needs a full env / CI (could not run here)

Run these on **Python 3.13** with the test stack installed (`pip install -r requirements_test.txt`):

```bash
python -m compileall custom_components/eon_next   # passed on 3.11; re-confirm on 3.13
basedpyright -p pyrightconfig.json                # NOT run here — no basedpyright
pytest -q                                         # NOT run here — HA stack needs py3.13
```

These are exercised by `.github/workflows/tests.yml` on any PR. The dependency delta touching Python is **only** the test-dep floor bump, so risk is low, but `pytest`/`basedpyright` are the authoritative gates.

## Note on prettier 3.9.x non-idempotency (watch item)

Prettier 3.9.4 needed **multiple `--write` passes** to reach a fixed point on deeply nested ternary-in-template files when converting *from* the old style. The committed tree is at a stable fixed point (`format:check` passes, and the `lint-staged` pre-commit `prettier --write` is a no-op on it). But the repo's `npm run format` does a single pass — if a large reformat is ever needed again, run it until `format:check` is clean rather than assuming one pass suffices.

## Suggested PR

Single squash PR titled e.g. `build(deps): consolidate Dependabot updates (actions, frontend toolchain, test deps)`. Conventional-commit `build(deps...)` types let release-please classify it; no CHANGELOG/README entry is required (no user-visible runtime behavior change). The 14 original Dependabot PRs can be closed once this merges.
