#!/usr/bin/env python3
"""Pre-commit / CI check for common hassfest violations.

Validates:
  1. manifest.json keys are sorted: domain, name, then alphabetical.
  2. __init__.py defines CONFIG_SCHEMA when async_setup or setup exists.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MANIFEST_PATH = ROOT / "custom_components" / "eon_next" / "manifest.json"
INIT_PATH = ROOT / "custom_components" / "eon_next" / "__init__.py"

errors: list[str] = []


def _check_manifest_key_order() -> None:
    """Ensure manifest keys follow hassfest ordering: domain, name, then alpha."""
    if not MANIFEST_PATH.exists():
        errors.append(f"Missing {MANIFEST_PATH.relative_to(ROOT)}")
        return

    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    keys = list(manifest.keys())

    if len(keys) < 2 or keys[0] != "domain" or keys[1] != "name":
        errors.append(
            "manifest.json: first two keys must be 'domain' and 'name' (in that order)"
        )
        return

    rest = keys[2:]
    if rest != sorted(rest):
        errors.append(
            "manifest.json: keys after 'domain' and 'name' must be in alphabetical order. "
            f"Current: {rest}. Expected: {sorted(rest)}"
        )


def _check_config_schema() -> None:
    """Ensure CONFIG_SCHEMA is defined when async_setup/setup exists."""
    if not INIT_PATH.exists():
        errors.append(f"Missing {INIT_PATH.relative_to(ROOT)}")
        return

    text = INIT_PATH.read_text(encoding="utf-8")

    has_setup = bool(
        re.search(r"^(async\s+)?def\s+(async_)?setup\s*\(", text, re.MULTILINE)
    )
    has_config_schema = bool(
        re.search(r"^CONFIG_SCHEMA\s*=", text, re.MULTILINE)
    )

    if has_setup and not has_config_schema:
        errors.append(
            "__init__.py: defines async_setup/setup but missing CONFIG_SCHEMA. "
            "Add CONFIG_SCHEMA = cv.config_entry_only_config_schema(DOMAIN) "
            "(or another appropriate schema helper)."
        )


_check_manifest_key_order()
_check_config_schema()

if errors:
    for err in errors:
        print(f"ERROR: {err}", file=sys.stderr)
    sys.exit(1)

print("OK: hassfest compliance checks passed")
