# Development Guide

This document is for maintainers and contributors working on the integration.

## Local Setup

Recommended Python version: `3.13`.

```bash
python3.13 -m venv .venv
source .venv/bin/activate
pip install -U pip setuptools wheel
pip install homeassistant basedpyright
```

Install commit tooling:

```bash
npm install
```

## Project Checks

Run a basic syntax and typing pass before opening a PR:

```bash
python -m compileall custom_components/eon_next
basedpyright -p pyrightconfig.json
```

## Home Assistant Development Validation

- Install in a Home Assistant test instance via `custom_components`.
- Confirm config flow works for:
  - First-time login.
  - Re-auth (changed credentials).
- Confirm entity updates for:
  - Meter readings.
  - Daily consumption fallback path.
  - EV smart charging entities (if available on account).

## Commit Conventions

This repository enforces Conventional Commits for semantic versioning.

- Local commits are linted by a Husky `commit-msg` hook using `commitlint`.
- Pull request titles are linted in CI and must also follow Conventional Commit format.
  - This is required because squash merges use the PR title as the final commit subject.
- Commitlint is configured with `defaultIgnores: false` so merge commit messages are linted too.

Examples:

- `feat(sensor): add smart charge status entity`
- `fix(api): handle missing consumption payload`
- `chore(release): 1.2.0`

Allowed types:

- `build`, `chore`, `ci`, `docs`, `feat`, `fix`, `perf`, `refactor`, `revert`, `style`, `test`

## Release Process (HACS-Compatible)

1. Update integration version in `custom_components/eon_next/manifest.json`.
2. Ensure `hacs.json` and manifest metadata are still correct.
3. Merge to `main`.
4. Choose the semantic version increment:
   - `MAJOR`: breaking changes
   - `MINOR`: new backwards-compatible functionality
   - `PATCH`: backwards-compatible bug fixes
5. Create and push an annotated semantic tag:

```bash
git tag -a vX.Y.Z -m "Eon Next X.Y.Z"
git push origin vX.Y.Z
```

6. Create a GitHub Release for that tag with release notes.

HACS discovers new versions from GitHub releases/tags, so pushing the tag is required.
