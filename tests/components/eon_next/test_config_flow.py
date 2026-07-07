"""Config-flow tests: first login, duplicate abort, and re-auth.

These cover the most security-sensitive paths (initial login and re-auth),
which previously had no test coverage (spec 07, finding 7.1).
"""

from __future__ import annotations

from collections.abc import Generator
import logging
from typing import Any
from unittest.mock import patch

import pytest
from pytest_homeassistant_custom_component.common import MockConfigEntry

from homeassistant.config_entries import SOURCE_REAUTH, SOURCE_USER
from homeassistant.core import HomeAssistant
from homeassistant.data_entry_flow import FlowResultType
from homeassistant.helpers import recorder as recorder_helper
from homeassistant.setup import async_setup_component

from custom_components.eon_next.const import (
    CONF_EMAIL,
    CONF_PASSWORD,
    CONF_REFRESH_TOKEN,
    DOMAIN,
)
from custom_components.eon_next.eonnext import EonNextApiError


@pytest.fixture(autouse=True)
def _quiet_sqlalchemy_engine_logs() -> Generator[None, None, None]:
    """Keep recorder-backed flow tests from flooding output with SQL logs."""
    logger = logging.getLogger("sqlalchemy.engine")
    previous_level = logger.level
    logger.setLevel(logging.WARNING)
    try:
        yield
    finally:
        logger.setLevel(previous_level)


class _FakeFlowApi:
    """Stand-in for EonNext used inside the config flow's credential check."""

    def __init__(
        self,
        *,
        success: bool = True,
        token: str = "new-refresh-token",
        raises: Exception | None = None,
    ) -> None:
        self._success = success
        self._raises = raises
        self.auth: dict[str, Any] = {"refresh": {"token": token}}
        self.closed = False

    async def login_with_username_and_password(
        self, email: str, password: str, initialise: bool = False
    ) -> bool:
        del email, password, initialise
        if self._raises is not None:
            raise self._raises
        return self._success

    async def async_close(self) -> None:
        self.closed = True


def _patch_api(fake: _FakeFlowApi):
    return patch(
        "custom_components.eon_next.config_flow.EonNext", return_value=fake
    )


async def _ensure_recorder(hass: HomeAssistant) -> None:
    """The eon_next integration depends on recorder; a flow init loads it."""
    if "recorder" in hass.config.components:
        return
    recorder_helper.async_initialize_recorder(hass)
    with patch("homeassistant.components.recorder.ALLOW_IN_MEMORY_DB", True):
        assert await async_setup_component(
            hass,
            "recorder",
            {"recorder": {"db_url": "sqlite://", "commit_interval": 0}},
        )
    await hass.async_block_till_done()
    await hass.data[recorder_helper.DATA_RECORDER].db_connected


@pytest.mark.asyncio
async def test_user_flow_creates_entry(
    hass: HomeAssistant, enable_custom_integrations: None
) -> None:
    """A successful login creates an entry with a lowercased email + token."""
    del enable_custom_integrations
    await _ensure_recorder(hass)
    with _patch_api(_FakeFlowApi(token="rt-1")):
        result = await hass.config_entries.flow.async_init(
            DOMAIN, context={"source": SOURCE_USER}
        )
        assert result["type"] == FlowResultType.FORM

        result = await hass.config_entries.flow.async_configure(
            result["flow_id"],
            {CONF_EMAIL: "User@Example.com", CONF_PASSWORD: "secret"},
        )

    assert result["type"] == FlowResultType.CREATE_ENTRY
    assert result["data"][CONF_EMAIL] == "user@example.com"
    assert result["data"][CONF_PASSWORD] == "secret"
    assert result["data"][CONF_REFRESH_TOKEN] == "rt-1"


@pytest.mark.asyncio
async def test_user_flow_invalid_auth(
    hass: HomeAssistant, enable_custom_integrations: None
) -> None:
    """Bad credentials keep the form open with an invalid_auth error."""
    del enable_custom_integrations
    await _ensure_recorder(hass)
    with _patch_api(_FakeFlowApi(success=False)):
        result = await hass.config_entries.flow.async_init(
            DOMAIN, context={"source": SOURCE_USER}
        )
        result = await hass.config_entries.flow.async_configure(
            result["flow_id"],
            {CONF_EMAIL: "user@example.com", CONF_PASSWORD: "wrong"},
        )

    assert result["type"] == FlowResultType.FORM
    assert result["errors"] == {"base": "invalid_auth"}


@pytest.mark.asyncio
async def test_user_flow_cannot_connect(
    hass: HomeAssistant, enable_custom_integrations: None
) -> None:
    """A transport error surfaces as cannot_connect, not a crash."""
    del enable_custom_integrations
    await _ensure_recorder(hass)
    with _patch_api(_FakeFlowApi(raises=EonNextApiError("boom"))):
        result = await hass.config_entries.flow.async_init(
            DOMAIN, context={"source": SOURCE_USER}
        )
        result = await hass.config_entries.flow.async_configure(
            result["flow_id"],
            {CONF_EMAIL: "user@example.com", CONF_PASSWORD: "secret"},
        )

    assert result["type"] == FlowResultType.FORM
    assert result["errors"] == {"base": "cannot_connect"}


@pytest.mark.asyncio
async def test_user_flow_duplicate_aborts(
    hass: HomeAssistant, enable_custom_integrations: None
) -> None:
    """Re-adding an already-configured email aborts on the unique_id."""
    del enable_custom_integrations
    await _ensure_recorder(hass)
    existing = MockConfigEntry(
        domain=DOMAIN,
        unique_id="user@example.com",
        data={CONF_EMAIL: "user@example.com", CONF_PASSWORD: "x"},
    )
    existing.add_to_hass(hass)

    with _patch_api(_FakeFlowApi()):
        result = await hass.config_entries.flow.async_init(
            DOMAIN, context={"source": SOURCE_USER}
        )
        result = await hass.config_entries.flow.async_configure(
            result["flow_id"],
            {CONF_EMAIL: "user@example.com", CONF_PASSWORD: "secret"},
        )

    assert result["type"] == FlowResultType.ABORT
    assert result["reason"] == "already_configured"


@pytest.mark.asyncio
async def test_reauth_updates_entry(
    hass: HomeAssistant,
    enable_custom_integrations: None,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """A successful re-auth updates the entry's password and refresh token."""
    del enable_custom_integrations
    await _ensure_recorder(hass)
    entry = MockConfigEntry(
        domain=DOMAIN,
        unique_id="user@example.com",
        data={
            CONF_EMAIL: "user@example.com",
            CONF_PASSWORD: "old",
            CONF_REFRESH_TOKEN: "old-rt",
        },
    )
    entry.add_to_hass(hass)

    # Don't actually reload (which would run full setup) during the test.
    monkeypatch.setattr(
        hass.config_entries, "async_schedule_reload", lambda *a, **k: None, raising=False
    )

    with _patch_api(_FakeFlowApi(token="fresh-rt")):
        result = await hass.config_entries.flow.async_init(
            DOMAIN,
            context={"source": SOURCE_REAUTH, "entry_id": entry.entry_id},
            data=entry.data,
        )
        assert result["type"] == FlowResultType.FORM
        assert result["step_id"] == "reauth_confirm"

        result = await hass.config_entries.flow.async_configure(
            result["flow_id"],
            {CONF_EMAIL: "user@example.com", CONF_PASSWORD: "newpass"},
        )

    assert result["type"] == FlowResultType.ABORT
    assert result["reason"] == "reauth_successful"
    assert entry.data[CONF_PASSWORD] == "newpass"
    assert entry.data[CONF_REFRESH_TOKEN] == "fresh-rt"
