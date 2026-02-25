#!/usr/bin/env python3
"""Generate ``frontend/src/api.generated.ts`` from Python schema dataclasses.

Run from the repository root::

    python scripts/generate_ts_api.py

The generated file contains TypeScript interfaces, WS command constants, and
typed API wrapper functions — all derived from the dataclasses defined in
``custom_components/eon_next/schemas.py``.
"""

from __future__ import annotations

import dataclasses
import sys
import textwrap
import types
from pathlib import Path
from typing import Union, get_args, get_origin, get_type_hints

# ---------------------------------------------------------------------------
# Import schemas.py directly (avoids triggering the eon_next package
# __init__.py which requires homeassistant at import time).
# ---------------------------------------------------------------------------

REPO_ROOT = Path(__file__).resolve().parent.parent
OUTPUT_PATH = REPO_ROOT / "frontend" / "src" / "api.generated.ts"

_SCHEMAS_PATH = REPO_ROOT / "custom_components" / "eon_next" / "schemas.py"


def _load_schemas():
    """Import schemas.py as a standalone module (no package __init__)."""
    import importlib.util

    spec = importlib.util.spec_from_file_location("schemas", _SCHEMAS_PATH)
    mod = importlib.util.module_from_spec(spec)
    sys.modules["schemas"] = mod
    spec.loader.exec_module(mod)
    return mod


_schemas = _load_schemas()
WS_COMMANDS = _schemas.WS_COMMANDS

# ---------------------------------------------------------------------------
# Python → TypeScript type mapping
# ---------------------------------------------------------------------------


def _py_type_to_ts(py_type: type) -> str:
    """Convert a Python type annotation to a TypeScript type string."""
    origin = get_origin(py_type)
    args = get_args(py_type)

    # X | None  (types.UnionType on 3.10+, or typing.Union)
    if origin is Union or origin is types.UnionType:
        non_none = [a for a in args if a is not type(None)]
        if len(non_none) == 1 and type(None) in args:
            return f"{_py_type_to_ts(non_none[0])} | null"
        return " | ".join(_py_type_to_ts(a) for a in args)

    # list[X]
    if origin is list:
        inner = _py_type_to_ts(args[0])
        return f"{inner}[]"

    # Primitives
    if py_type is str:
        return "string"
    if py_type in (int, float):
        return "number"
    if py_type is bool:
        return "boolean"

    # Nested dataclass
    if dataclasses.is_dataclass(py_type):
        return py_type.__name__

    return "unknown"


# ---------------------------------------------------------------------------
# Code generation helpers
# ---------------------------------------------------------------------------


def _collect_dataclasses(root_classes: list[type]) -> list[type]:
    """Collect all dataclasses reachable from *root_classes*, in dependency order."""
    seen: set[type] = set()
    ordered: list[type] = []

    def _walk(cls: type) -> None:
        if cls in seen:
            return
        seen.add(cls)
        # Resolve type hints (evaluates stringified annotations)
        hints = get_type_hints(cls)
        for field_type in hints.values():
            for inner in _extract_dataclass_refs(field_type):
                _walk(inner)
        ordered.append(cls)

    for cls in root_classes:
        _walk(cls)
    return ordered


def _extract_dataclass_refs(py_type: type) -> list[type]:
    """Return any dataclass types referenced by *py_type*."""
    refs: list[type] = []
    origin = get_origin(py_type)
    args = get_args(py_type)

    if dataclasses.is_dataclass(py_type):
        refs.append(py_type)
    if origin is Union or origin is types.UnionType or origin is list:
        for arg in args:
            refs.extend(_extract_dataclass_refs(arg))
    return refs


def _generate_interface(cls: type) -> str:
    """Generate a TypeScript interface for a dataclass."""
    hints = get_type_hints(cls)
    lines = [f"export interface {cls.__name__} {{"]
    for field in dataclasses.fields(cls):
        ts_type = _py_type_to_ts(hints[field.name])
        lines.append(f"  {field.name}: {ts_type};")
    lines.append("}")
    return "\n".join(lines)


def _command_const_name(cmd: str) -> str:
    """Derive a TypeScript constant name from a WS command string.

    ``eon_next/version`` → ``WS_VERSION``
    ``eon_next/dashboard_summary`` → ``WS_DASHBOARD_SUMMARY``
    """
    suffix = cmd.split("/", 1)[1] if "/" in cmd else cmd
    return f"WS_{suffix.upper()}"


def _api_fn_name(cmd: str) -> str:
    """Derive a camelCase function name from a WS command string.

    ``eon_next/version`` → ``getVersion``
    ``eon_next/dashboard_summary`` → ``getDashboardSummary``
    """
    suffix = cmd.split("/", 1)[1] if "/" in cmd else cmd
    parts = suffix.split("_")
    return "get" + "".join(p.capitalize() for p in parts)


# ---------------------------------------------------------------------------
# Main generation
# ---------------------------------------------------------------------------


def generate() -> str:
    """Return the full contents of the generated TypeScript file."""
    response_classes = list(WS_COMMANDS.values())
    all_classes = _collect_dataclasses(response_classes)

    sections: list[str] = []

    # Header
    sections.append(
        textwrap.dedent("""\
        // ---------------------------------------------------------------
        // THIS FILE IS AUTO-GENERATED — DO NOT EDIT BY HAND
        //
        // Source of truth: custom_components/eon_next/schemas.py
        // Regenerate:      python scripts/generate_ts_api.py
        // ---------------------------------------------------------------

        import type { HomeAssistant } from "./types";
        """)
    )

    # Interfaces
    sections.append("// --- Response interfaces ---\n")
    for cls in all_classes:
        sections.append(_generate_interface(cls))
        sections.append("")

    # Command constants
    sections.append("// --- WebSocket command constants ---\n")
    for cmd in WS_COMMANDS:
        const = _command_const_name(cmd)
        sections.append(f'export const {const} = "{cmd}" as const;')
    sections.append("")

    # API functions
    sections.append("// --- Typed API functions ---\n")
    for cmd, cls in WS_COMMANDS.items():
        const = _command_const_name(cmd)
        fn = _api_fn_name(cmd)
        sections.append(
            f"export async function {fn}(hass: HomeAssistant): "
            f"Promise<{cls.__name__}> {{"
        )
        sections.append(f"  return hass.callWS<{cls.__name__}>({{ type: {const} }});")
        sections.append("}")
        sections.append("")

    return "\n".join(sections)


def main() -> None:
    content = generate()
    OUTPUT_PATH.write_text(content)

    # Run Prettier on the generated file so it matches project style
    import shutil
    import subprocess

    npx = shutil.which("npx")
    if npx:
        subprocess.run(
            [npx, "prettier", "--write", str(OUTPUT_PATH)],
            cwd=REPO_ROOT / "frontend",
            check=False,
            capture_output=True,
        )

    print(f"Generated {OUTPUT_PATH.relative_to(REPO_ROOT)}")


if __name__ == "__main__":
    main()
