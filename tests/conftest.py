"""Test configuration for local custom component imports."""

from __future__ import annotations

import sys
from dataclasses import dataclass
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock

# ── Mock hass_frontend ────────────────────────────────────────────────
# The HA "frontend" component does ``import hass_frontend`` which is a
# compiled JS package only present in full HA installs, not in
# pytest-homeassistant-custom-component environments.  A MagicMock with
# a ``where()`` returning a path prevents ModuleNotFoundError during
# component setup while keeping tests lightweight.
_mock_frontend = MagicMock()
_mock_frontend.where.return_value = "/dev/null"
sys.modules.setdefault("hass_frontend", _mock_frontend)

# ── Polyfill StaticPathConfig for HA < 2024.7 ────────────────────────
# ``StaticPathConfig`` and ``async_register_static_paths`` were added in
# HA 2024.7.  The test env ships 2024.3; patch the http module so that
# production imports resolve without shims in the integration code.
from homeassistant.components import http as _ha_http  # noqa: E402

if not hasattr(_ha_http, "StaticPathConfig"):

    @dataclass(slots=True)
    class StaticPathConfig:  # type: ignore[no-redef]
        """Minimal stand-in for homeassistant.components.http.StaticPathConfig."""

        url_path: str
        path: str
        cache_headers: bool = True

    _ha_http.StaticPathConfig = StaticPathConfig  # type: ignore[attr-defined]

    # Also patch async_register_static_paths onto the HTTP server class
    # so ``hass.http.async_register_static_paths([...])`` works.
    _orig_cls = _ha_http.HomeAssistantHTTP
    if not hasattr(_orig_cls, "async_register_static_paths"):

        async def _async_register_static_paths(
            self: _ha_http.HomeAssistantHTTP,  # type: ignore[arg-type]
            configs: list[StaticPathConfig],
        ) -> None:
            for cfg in configs:
                self.register_static_path(cfg.url_path, cfg.path, cfg.cache_headers)

        _orig_cls.async_register_static_paths = _async_register_static_paths  # type: ignore[attr-defined]

# ── Make ConfigEntry subscriptable for HA < 2024.4 ───────────────────
# Newer HA makes ``ConfigEntry`` generic so integrations can write
# ``ConfigEntry[MyRuntimeData]``.  On 2024.3 the class is not
# subscriptable; add ``__class_getitem__`` so the alias resolves.
from homeassistant.config_entries import ConfigEntry as _CE  # noqa: E402

if not hasattr(_CE, "__class_getitem__"):
    _CE.__class_getitem__ = classmethod(lambda cls, item: cls)  # type: ignore[attr-defined]

# ── Polyfill recorder.get_instance for HA < 2024.4 ───────────────────
# ``get_instance`` was added to ``homeassistant.helpers.recorder`` in a
# later HA release.  Inject it so module-level imports in backfill.py
# and statistics.py resolve.
from homeassistant.helpers import recorder as _ha_recorder  # noqa: E402

if not hasattr(_ha_recorder, "get_instance"):

    def _get_instance(hass):  # type: ignore[no-untyped-def]
        """Return the recorder instance from hass.data."""
        return hass.data.get("recorder")

    _ha_recorder.get_instance = _get_instance  # type: ignore[attr-defined]

# ``DATA_RECORDER`` key was added in a later release; older versions
# store the recorder instance under the string ``"recorder"``.
if not hasattr(_ha_recorder, "DATA_RECORDER"):
    _ha_recorder.DATA_RECORDER = "recorder"  # type: ignore[attr-defined]

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))
