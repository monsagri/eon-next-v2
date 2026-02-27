"""Tests for WebSocket handlers, panel registration, and card resource management."""

from __future__ import annotations

import dataclasses
from collections.abc import Generator
from dataclasses import dataclass, field
import logging
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from pytest_homeassistant_custom_component.common import MockConfigEntry

import custom_components.eon_next as integration
from custom_components.eon_next.backfill import EonNextBackfillManager
from custom_components.eon_next.const import (
    CONF_EMAIL,
    CONF_PASSWORD,
    CONF_REFRESH_TOKEN,
    CONF_SHOW_CARD,
    CONF_SHOW_PANEL,
    DOMAIN,
    INTEGRATION_VERSION,
)
from custom_components.eon_next.coordinator import EonNextCoordinator
from custom_components.eon_next.schemas import VersionResponse
from homeassistant.core import HomeAssistant
from homeassistant.helpers import recorder as recorder_helper
from homeassistant.setup import async_setup_component


@pytest.fixture(autouse=True)
def _quiet_sqlalchemy_engine_logs() -> Generator[None, None, None]:
    """Keep recorder-backed tests from flooding output with SQL logs."""
    logger = logging.getLogger("sqlalchemy.engine")
    previous_level = logger.level
    logger.setLevel(logging.WARNING)
    try:
        yield
    finally:
        logger.setLevel(previous_level)


# ── Fakes ──────────────────────────────────────────────────────────


@dataclass(slots=True)
class FakeMeter:
    serial: str = "electric-meter-1"
    type: str = "electricity"
    supply_point_id: str = "mpxn-1"
    meter_id: str = "meter-id-1"
    latest_reading: float | None = None
    latest_reading_date: str | None = None

    async def _update(self) -> None:
        return None


@dataclass(slots=True)
class FakeAccount:
    meters: list[FakeMeter] = field(default_factory=list)
    ev_chargers: list[Any] = field(default_factory=list)


class FakeApi:
    def __init__(self) -> None:
        self.refresh_login_calls: list[str] = []
        self.password_login_calls: list[tuple[str, str]] = []
        self.closed = False
        self.username = ""
        self.password = ""
        self.accounts = [FakeAccount(meters=[FakeMeter()])]
        self._token_callback = None

    def set_token_update_callback(self, callback: Any) -> None:
        self._token_callback = callback

    async def login_with_refresh_token(self, token: str) -> bool:
        self.refresh_login_calls.append(token)
        return True

    async def login_with_username_and_password(self, u: str, p: str) -> bool:
        self.password_login_calls.append((u, p))
        return True

    async def async_close(self) -> None:
        self.closed = True


# ── Helpers ────────────────────────────────────────────────────────


async def _fake_first_refresh(self: EonNextCoordinator) -> None:
    self.async_set_updated_data({})


async def _fake_backfill_run(self: EonNextBackfillManager) -> None:
    return None


def _mock_entry(*, options: dict[str, Any] | None = None) -> MockConfigEntry:
    return MockConfigEntry(
        domain=DOMAIN,
        title="Eon Next",
        data={
            CONF_EMAIL: "user@example.com",
            CONF_PASSWORD: "secret",
            CONF_REFRESH_TOKEN: "refresh-token",
        },
        options=options or {},
    )


def _patch_integration(monkeypatch: pytest.MonkeyPatch, fake_api: FakeApi) -> None:
    monkeypatch.setattr(integration, "EonNext", lambda: fake_api)
    monkeypatch.setattr(
        EonNextCoordinator,
        "async_config_entry_first_refresh",
        _fake_first_refresh,
    )
    monkeypatch.setattr(EonNextBackfillManager, "_async_run", _fake_backfill_run)


async def _ensure_recorder(hass: HomeAssistant) -> None:
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


async def _setup_entry(
    hass: HomeAssistant, entry: MockConfigEntry
) -> None:
    await _ensure_recorder(hass)
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()


# ── Integration setup tests ───────────────────────────────────────


class TestIntegrationSetup:
    """Tests for integration-wide setup behavior."""

    @pytest.mark.asyncio
    async def test_async_setup_registers_websocket_once(
        self,
        hass: HomeAssistant,
        monkeypatch: pytest.MonkeyPatch,
    ) -> None:
        """WebSocket commands should only be registered once per Home Assistant."""
        mock_setup_websocket = MagicMock()
        monkeypatch.setattr(
            "custom_components.eon_next.websocket.async_setup_websocket",
            mock_setup_websocket,
        )
        monkeypatch.setattr(integration.os.path, "isfile", lambda _: False)

        assert await integration.async_setup(hass, {})
        assert await integration.async_setup(hass, {})

        mock_setup_websocket.assert_called_once_with(hass)


# ── WebSocket handler tests ───────────────────────────────────────


class TestWsVersion:
    """Tests for the eon_next/version WebSocket handler."""

    @pytest.mark.asyncio
    async def test_ws_version_returns_integration_version(
        self,
        hass: HomeAssistant,
        enable_custom_integrations: None,
        monkeypatch: pytest.MonkeyPatch,
    ) -> None:
        del enable_custom_integrations
        fake_api = FakeApi()
        _patch_integration(monkeypatch, fake_api)
        entry = _mock_entry()

        await _setup_entry(hass, entry)

        from custom_components.eon_next.websocket import ws_version

        mock_connection = MagicMock()
        ws_version(hass, mock_connection, {"id": 1, "type": "eon_next/version"})

        mock_connection.send_result.assert_called_once_with(
            1,
            dataclasses.asdict(VersionResponse(version=INTEGRATION_VERSION)),
        )


class TestWsDashboardSummary:
    """Tests for the eon_next/dashboard_summary WebSocket handler."""

    @pytest.mark.asyncio
    async def test_ws_dashboard_summary_returns_meters(
        self,
        hass: HomeAssistant,
        enable_custom_integrations: None,
        monkeypatch: pytest.MonkeyPatch,
    ) -> None:
        del enable_custom_integrations
        fake_api = FakeApi()
        _patch_integration(monkeypatch, fake_api)
        entry = _mock_entry()

        await _setup_entry(hass, entry)

        # Set coordinator data with a meter
        coordinator = entry.runtime_data.coordinator
        coordinator.async_set_updated_data(
            {
                "meter-1": {
                    "type": "electricity",
                    "serial": "E123",
                    "latest_reading": 1234.5,
                    "latest_reading_date": "2026-02-25",
                    "daily_consumption": 10.5,
                    "standing_charge": 0.25,
                    "previous_day_cost": 2.50,
                    "unit_rate": 0.24,
                    "tariff_name": "Standard",
                },
            }
        )

        from custom_components.eon_next.websocket import ws_dashboard_summary

        mock_connection = MagicMock()
        ws_dashboard_summary(
            hass, mock_connection, {"id": 2, "type": "eon_next/dashboard_summary"}
        )
        await hass.async_block_till_done()

        mock_connection.send_result.assert_called_once()
        result = mock_connection.send_result.call_args[0][1]
        assert len(result["meters"]) == 1
        assert result["meters"][0]["serial"] == "E123"
        assert result["meters"][0]["type"] == "electricity"
        assert result["ev_chargers"] == []

    @pytest.mark.asyncio
    async def test_ws_dashboard_summary_empty_when_no_data(
        self,
        hass: HomeAssistant,
        enable_custom_integrations: None,
        monkeypatch: pytest.MonkeyPatch,
    ) -> None:
        del enable_custom_integrations
        fake_api = FakeApi()
        _patch_integration(monkeypatch, fake_api)
        entry = _mock_entry()

        await _setup_entry(hass, entry)

        from custom_components.eon_next.websocket import ws_dashboard_summary

        mock_connection = MagicMock()
        ws_dashboard_summary(
            hass, mock_connection, {"id": 3, "type": "eon_next/dashboard_summary"}
        )
        await hass.async_block_till_done()

        result = mock_connection.send_result.call_args[0][1]
        assert result["meters"] == []
        assert result["ev_chargers"] == []


# ── Panel registration tests ─────────────────────────────────────


class TestPanelRegistration:
    """Tests for sidebar panel register/unregister."""

    @pytest.mark.asyncio
    async def test_panel_registered_when_show_panel_enabled(
        self,
        hass: HomeAssistant,
        enable_custom_integrations: None,
        monkeypatch: pytest.MonkeyPatch,
    ) -> None:
        del enable_custom_integrations
        fake_api = FakeApi()
        _patch_integration(monkeypatch, fake_api)

        mock_register = AsyncMock()
        monkeypatch.setattr(
            "custom_components.eon_next.panel.async_register_panel",
            mock_register,
        )
        mock_unregister = AsyncMock()
        monkeypatch.setattr(
            "custom_components.eon_next.panel.async_unregister_panel",
            mock_unregister,
        )

        entry = _mock_entry(options={CONF_SHOW_PANEL: True})
        await _setup_entry(hass, entry)

        mock_register.assert_called()

    @pytest.mark.asyncio
    async def test_panel_not_registered_when_show_panel_disabled(
        self,
        hass: HomeAssistant,
        enable_custom_integrations: None,
        monkeypatch: pytest.MonkeyPatch,
    ) -> None:
        del enable_custom_integrations
        fake_api = FakeApi()
        _patch_integration(monkeypatch, fake_api)

        mock_register = AsyncMock()
        monkeypatch.setattr(
            "custom_components.eon_next.panel.async_register_panel",
            mock_register,
        )
        mock_unregister = AsyncMock()
        monkeypatch.setattr(
            "custom_components.eon_next.panel.async_unregister_panel",
            mock_unregister,
        )

        entry = _mock_entry(options={CONF_SHOW_PANEL: False})
        await _setup_entry(hass, entry)

        mock_register.assert_not_called()
        # Unregister should be called since no entry wants it
        mock_unregister.assert_called()

    @pytest.mark.asyncio
    async def test_panel_unregistered_on_last_entry_unload(
        self,
        hass: HomeAssistant,
        enable_custom_integrations: None,
        monkeypatch: pytest.MonkeyPatch,
    ) -> None:
        del enable_custom_integrations
        fake_api = FakeApi()
        _patch_integration(monkeypatch, fake_api)

        mock_register = AsyncMock()
        monkeypatch.setattr(
            "custom_components.eon_next.panel.async_register_panel",
            mock_register,
        )
        mock_unregister = AsyncMock()
        monkeypatch.setattr(
            "custom_components.eon_next.panel.async_unregister_panel",
            mock_unregister,
        )

        entry = _mock_entry(options={CONF_SHOW_PANEL: True})
        await _setup_entry(hass, entry)
        mock_register.reset_mock()
        mock_unregister.reset_mock()

        assert await hass.config_entries.async_unload(entry.entry_id)
        await hass.async_block_till_done()

        # After unloading the only entry, the panel should be removed
        mock_unregister.assert_called()


# ── Card resource tests ──────────────────────────────────────────


class TestCardResource:
    """Tests for Lovelace card resource management."""

    @pytest.mark.asyncio
    async def test_card_resource_created_when_show_card_enabled(
        self,
        hass: HomeAssistant,
        enable_custom_integrations: None,
        monkeypatch: pytest.MonkeyPatch,
    ) -> None:
        del enable_custom_integrations
        fake_api = FakeApi()
        _patch_integration(monkeypatch, fake_api)

        mock_ensure = AsyncMock()
        monkeypatch.setattr(integration, "_async_ensure_card_resource", mock_ensure)
        mock_remove = AsyncMock()
        monkeypatch.setattr(integration, "_async_remove_card_resource", mock_remove)

        entry = _mock_entry(options={CONF_SHOW_CARD: True, CONF_SHOW_PANEL: False})
        await _setup_entry(hass, entry)

        mock_ensure.assert_called()

    @pytest.mark.asyncio
    async def test_card_resource_removed_when_show_card_disabled(
        self,
        hass: HomeAssistant,
        enable_custom_integrations: None,
        monkeypatch: pytest.MonkeyPatch,
    ) -> None:
        del enable_custom_integrations
        fake_api = FakeApi()
        _patch_integration(monkeypatch, fake_api)

        mock_ensure = AsyncMock()
        monkeypatch.setattr(integration, "_async_ensure_card_resource", mock_ensure)
        mock_remove = AsyncMock()
        monkeypatch.setattr(integration, "_async_remove_card_resource", mock_remove)

        entry = _mock_entry(options={CONF_SHOW_CARD: False, CONF_SHOW_PANEL: False})
        await _setup_entry(hass, entry)

        mock_ensure.assert_not_called()
        mock_remove.assert_called()

    @pytest.mark.asyncio
    async def test_lovelace_attribute_error_handled_gracefully(
        self,
        hass: HomeAssistant,
    ) -> None:
        """_async_ensure_card_resource tolerates missing Lovelace internals."""
        # Simulate lovelace data with broken .mode attribute
        hass.data["lovelace"] = MagicMock(spec=[])  # no mode attr
        # Should not raise
        await integration._async_ensure_card_resource(hass)
        await integration._async_remove_card_resource(hass)


# ── Reconcile frontend (multi-entry) tests ────────────────────────


class TestDefaultFrontendEnabled:
    """Tests that panel and cards are enabled by default on fresh install."""

    @pytest.mark.asyncio
    async def test_panel_and_card_enabled_with_default_options(
        self,
        hass: HomeAssistant,
        enable_custom_integrations: None,
        monkeypatch: pytest.MonkeyPatch,
    ) -> None:
        """Fresh install (no options) should enable both panel and card."""
        del enable_custom_integrations
        fake_api = FakeApi()
        _patch_integration(monkeypatch, fake_api)

        mock_register = AsyncMock()
        monkeypatch.setattr(
            "custom_components.eon_next.panel.async_register_panel",
            mock_register,
        )
        mock_unregister = AsyncMock()
        monkeypatch.setattr(
            "custom_components.eon_next.panel.async_unregister_panel",
            mock_unregister,
        )
        mock_ensure = AsyncMock()
        monkeypatch.setattr(integration, "_async_ensure_card_resource", mock_ensure)
        mock_remove = AsyncMock()
        monkeypatch.setattr(integration, "_async_remove_card_resource", mock_remove)

        # Fresh install: no options set at all
        entry = _mock_entry()
        await _setup_entry(hass, entry)

        mock_register.assert_called()
        mock_ensure.assert_called()
        mock_unregister.assert_not_called()
        mock_remove.assert_not_called()


class TestReconcileFrontend:
    """Tests for global panel/card reconciliation logic."""

    @pytest.mark.asyncio
    async def test_panel_stays_when_other_entry_still_wants_it(
        self,
        hass: HomeAssistant,
        enable_custom_integrations: None,
        monkeypatch: pytest.MonkeyPatch,
    ) -> None:
        """Unloading entry A should keep the panel if entry B still has it enabled."""
        del enable_custom_integrations
        fake_api_a = FakeApi()
        fake_api_b = FakeApi()

        # Setup entry A
        _patch_integration(monkeypatch, fake_api_a)
        entry_a = _mock_entry(options={CONF_SHOW_PANEL: True})
        await _setup_entry(hass, entry_a)

        # Setup entry B
        _patch_integration(monkeypatch, fake_api_b)
        entry_b = MockConfigEntry(
            domain=DOMAIN,
            title="Eon Next B",
            data={
                CONF_EMAIL: "b@example.com",
                CONF_PASSWORD: "secret",
                CONF_REFRESH_TOKEN: "refresh-b",
            },
            options={CONF_SHOW_PANEL: True},
        )
        await _setup_entry(hass, entry_b)

        mock_unregister = AsyncMock()
        monkeypatch.setattr(
            "custom_components.eon_next.panel.async_unregister_panel",
            mock_unregister,
        )
        mock_register = AsyncMock()
        monkeypatch.setattr(
            "custom_components.eon_next.panel.async_register_panel",
            mock_register,
        )

        # Unload entry A — entry B still wants the panel
        assert await hass.config_entries.async_unload(entry_a.entry_id)
        await hass.async_block_till_done()

        # Panel should NOT be unregistered
        mock_unregister.assert_not_called()
        mock_register.assert_called()
