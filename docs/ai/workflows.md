# AI Workflows: Build, Validate, Release

## Local Environment

Recommended setup:

```bash
python3.13 -m venv .venv
source .venv/bin/activate
pip install -U pip setuptools wheel
pip install homeassistant basedpyright
npm install
```

## Change Workflow

1. Read impacted modules before editing (`__init__.py`, `coordinator.py`, `sensor.py`, `eonnext.py`, `config_flow.py`).
2. Make the smallest coherent code change.
3. For user-visible behavior changes, update both `README.md` and `CHANGELOG.md` in the same change.
4. Run local validation commands.
5. Confirm CI assumptions remain valid.

## Local Validation Commands

Minimum required (Python):

```bash
python -m compileall custom_components/eon_next
basedpyright -p pyrightconfig.json
python3 .github/scripts/check_release_metadata.py
```

Frontend (run from `frontend/`):

```bash
npm run lint
npm run format:check
npm run typecheck
npm run build
```

Commit/PR convention sanity:

```bash
npm run commitlint:last
```

## Home Assistant Functional Checks (Manual)

When behavior changes, validate in a HA test instance:

- Initial config flow login.
- Re-auth flow after credential invalidation.
- Meter reading updates.
- Consumption fallback behavior.
- EV entities when SmartFlex-capable devices are present.

## Release Workflow (HACS-Compatible)

1. Merge Conventional Commit PRs into `main`.
2. `release-please.yml` updates/creates a draft release PR.
3. Review release PR contents (`CHANGELOG.md` + `manifest.json` version bump).
4. Mark the release PR ready, approve, and merge it to trigger release publication.

Notes:

- SemVer bump level is computed from commit types (`feat` -> minor, `fix` -> patch, breaking change -> major).
- Release/tag publication is triggered by merging the release PR, not by every merge to `main`.
- HACS release discovery relies on tags/releases, not repository state alone.

## CI Expectations

- `validate.yml`: HACS integration validation action.
- `hassfest.yml`: Home Assistant hassfest checks.
- `commit-conventions.yml`: commit message and PR title conventional checks.
- `metadata-consistency.yml`: manifest/changelog/release-manifest version lockstep validation.
- `release-please.yml`: release PR orchestration and release publication.
- `frontend.yml`: frontend lint, format, typecheck, and build (triggers on `frontend/` changes).

Agents should not bypass these workflows; local success is necessary but not sufficient.
