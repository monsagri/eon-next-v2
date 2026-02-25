#!/usr/bin/env python3
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MANIFEST_PATH = ROOT / "custom_components" / "eon_next" / "manifest.json"
CONST_PATH = ROOT / "custom_components" / "eon_next" / "const.py"
CHANGELOG_PATH = ROOT / "CHANGELOG.md"
RELEASE_PLEASE_MANIFEST_PATH = ROOT / ".release-please-manifest.json"


def fail(message: str) -> None:
    print(f"ERROR: {message}")
    sys.exit(1)


if not MANIFEST_PATH.exists():
    fail(f"Missing {MANIFEST_PATH}")
if not CONST_PATH.exists():
    fail(f"Missing {CONST_PATH}")
if not CHANGELOG_PATH.exists():
    fail(f"Missing {CHANGELOG_PATH}")

manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
manifest_version = manifest.get("version")
if not isinstance(manifest_version, str) or not re.fullmatch(r"\d+\.\d+\.\d+", manifest_version):
    fail(
        "custom_components/eon_next/manifest.json version must be a SemVer string like X.Y.Z"
    )

const_text = CONST_PATH.read_text(encoding="utf-8")
const_match = re.search(r'^INTEGRATION_VERSION\s*=\s*["\'](\d+\.\d+\.\d+)["\']', const_text, flags=re.MULTILINE)
if not const_match:
    fail("const.py must contain INTEGRATION_VERSION = \"X.Y.Z\"")
const_version = const_match.group(1)
if const_version != manifest_version:
    fail(
        "Version drift detected: const.py INTEGRATION_VERSION "
        f"({const_version}) must match manifest.json version "
        f"({manifest_version})"
    )

changelog_text = CHANGELOG_PATH.read_text(encoding="utf-8")
release_matches = re.findall(r"^## \[(\d+\.\d+\.\d+)\]", changelog_text, flags=re.MULTILINE)
if not release_matches:
    fail("CHANGELOG.md must include at least one release heading like: ## [X.Y.Z]")

latest_changelog_version = release_matches[0]
if manifest_version != latest_changelog_version:
    fail(
        "Version drift detected: manifest.json version "
        f"({manifest_version}) must match latest CHANGELOG.md release "
        f"({latest_changelog_version})"
    )

if RELEASE_PLEASE_MANIFEST_PATH.exists():
    rp_manifest = json.loads(RELEASE_PLEASE_MANIFEST_PATH.read_text(encoding="utf-8"))
    rp_version = rp_manifest.get(".")
    if rp_version != manifest_version:
        fail(
            "Version drift detected: .release-please-manifest.json '.' version "
            f"({rp_version}) must match manifest.json version ({manifest_version})"
        )

print("OK: release metadata versions are consistent")
print(f"manifest.json version: {manifest_version}")
print(f"const.py INTEGRATION_VERSION: {const_version}")
print(f"CHANGELOG latest version: {latest_changelog_version}")
if RELEASE_PLEASE_MANIFEST_PATH.exists():
    print(f".release-please-manifest.json version: {manifest_version}")
