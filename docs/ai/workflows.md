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

Minimum required:

```bash
python -m compileall custom_components/eon_next
basedpyright -p pyrightconfig.json
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

1. Update `custom_components/eon_next/manifest.json` version.
2. Verify `hacs.json` metadata remains valid for HACS.
3. Update `CHANGELOG.md`.
4. Merge to `main`.
5. Tag release semver (`vX.Y.Z`) and publish GitHub release.

HACS release discovery relies on tags/releases, not repository state alone.

## CI Expectations

- `validate.yml`: HACS integration validation action.
- `hassfest.yml`: Home Assistant hassfest checks.
- `commit-conventions.yml`: commit message and PR title conventional checks.

Agents should not bypass these workflows; local success is necessary but not sufficient.
