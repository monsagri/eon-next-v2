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

## Release Process (HACS-Compatible)

1. Update integration version in `custom_components/eon_next/manifest.json`.
2. Ensure `hacs.json` and manifest metadata are still correct.
3. Merge to `main`.
4. Create and push an annotated semantic tag:

```bash
git tag -a vX.Y.Z -m "Eon Next X.Y.Z"
git push origin vX.Y.Z
```

5. Create a GitHub Release for that tag with release notes.

HACS discovers new versions from GitHub releases/tags, so pushing the tag is required.
