"""Test configuration for local custom component imports."""

from __future__ import annotations

import sys
from pathlib import Path
from unittest.mock import MagicMock

# Mock hass_frontend before any HA code tries to import it.
# The HA "frontend" component does ``import hass_frontend`` which is a
# compiled JS package only present in full HA installs, not in
# pytest-homeassistant-custom-component environments.  A MagicMock with
# a ``where()`` returning a path prevents ModuleNotFoundError during
# component setup while keeping tests lightweight.
_mock_frontend = MagicMock()
_mock_frontend.where.return_value = "/dev/null"
sys.modules.setdefault("hass_frontend", _mock_frontend)

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))
