"""Tests for WebSocket handlers, panel registration, and card resource management."""

from __future__ import annotations

import dataclasses
import datetime
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
    CONF_BACKFILL_ENABLED,
    CONF_EMAIL,
    CONF_PASSWORD,
    CONF_REFRESH_TOKEN,
    CONF_SHOW_CARD,
    CONF_SHOW_PANEL,
    DOMAIN,
    INTEGRATION_VERSION,
)
from custom_components.eon_next.coordinator import EonNextCoordinator
from custom_components.eon_next.schemas import (
    ConsumptionHistoryResponse,
    EvScheduleResponse,
    EvScheduleSlot,
    VersionResponse,
)
from homeassistant.core import HomeAssistant
from homeassistant.helpers import recorder as recorder_helper
from homeassistant.setup import async_setup_component
from homeassistant.util import dt as dt_util

# Dynamic date references so tests never go stale.
_TODAY = dt_util.now().date()
_YESTERDAY = _TODAY - datetime.timedelta(days=1)
_YESTERDAY_ISO = _YESTERDAY.isoformat()


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
        self._consumption_result: dict[str, Any] | None = None

    def set_token_update_callback(self, callback: Any) -> None:
        self._token_callback = callback

    async def login_with_refresh_token(self, token: str) -> bool:
        self.refresh_login_calls.append(token)
        return True

    async def login_with_username_and_password(self, u: str, p: str) -> bool:
        self.password_login_calls.append((u, p))
        return True

    async def async_get_consumption(self, *args: Any, **kwargs: Any) -> dict | None:
        return self._consumption_result

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


def _electricity_meter_data() -> dict[str, dict[str, Any]]:
    """Return coordinator data for a single electricity meter with dynamic dates."""
    return {
        "meter-1": {
            "type": "electricity",
            "serial": "E123",
            "supply_point_id": "mpxn-e123",
            "latest_reading": 1234.5,
            "latest_reading_date": _YESTERDAY_ISO,
            "daily_consumption": 10.5,
            "standing_charge": 0.25,
            "previous_day_cost": 2.50,
            "unit_rate": 0.24,
            "tariff_name": "Standard",
        },
    }


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
        coordinator.async_set_updated_data(_electricity_meter_data())

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


class TestWsConsumptionHistory:
    """Tests for the eon_next/consumption_history WebSocket handler."""

    @pytest.mark.asyncio
    async def test_returns_empty_when_meter_not_found(
        self,
        hass: HomeAssistant,
        enable_custom_integrations: None,
        monkeypatch: pytest.MonkeyPatch,
    ) -> None:
        """Unknown meter serial should return empty entries, not an error."""
        del enable_custom_integrations
        fake_api = FakeApi()
        _patch_integration(monkeypatch, fake_api)
        entry = _mock_entry()

        await _setup_entry(hass, entry)

        from custom_components.eon_next.websocket import ws_consumption_history

        mock_connection = MagicMock()
        ws_consumption_history(
            hass,
            mock_connection,
            {
                "id": 10,
                "type": "eon_next/consumption_history",
                "meter_serial": "UNKNOWN-SERIAL",
                "days": 7,
            },
        )
        await hass.async_block_till_done()

        mock_connection.send_result.assert_called_once()
        result = mock_connection.send_result.call_args[0][1]
        assert result == dataclasses.asdict(
            ConsumptionHistoryResponse(entries=[])
        )

    @pytest.mark.asyncio
    async def test_returns_empty_when_no_statistics(
        self,
        hass: HomeAssistant,
        enable_custom_integrations: None,
        monkeypatch: pytest.MonkeyPatch,
    ) -> None:
        """Known meter with no recorder statistics should return empty entries."""
        del enable_custom_integrations
        fake_api = FakeApi()
        _patch_integration(monkeypatch, fake_api)
        entry = _mock_entry()

        await _setup_entry(hass, entry)

        # Set coordinator data so the meter is found
        coordinator = entry.runtime_data.coordinator
        coordinator.async_set_updated_data(_electricity_meter_data())

        # Mock the recorder to return no statistics (avoids executor-pool
        # timing issues that cause async_block_till_done to return early).
        monkeypatch.setattr(
            "homeassistant.helpers.recorder.get_instance",
            MagicMock(
                return_value=MagicMock(
                    async_add_executor_job=AsyncMock(return_value={})
                )
            ),
        )

        from custom_components.eon_next.websocket import ws_consumption_history

        mock_connection = MagicMock()
        ws_consumption_history(
            hass,
            mock_connection,
            {
                "id": 11,
                "type": "eon_next/consumption_history",
                "meter_serial": "E123",
                "days": 7,
            },
        )
        await hass.async_block_till_done()

        mock_connection.send_result.assert_called_once()
        result = mock_connection.send_result.call_args[0][1]
        # No statistics and no REST fallback data -> no entries
        assert result["entries"] == []

    @pytest.mark.asyncio
    async def test_handles_recorder_exception_gracefully(
        self,
        hass: HomeAssistant,
        enable_custom_integrations: None,
        monkeypatch: pytest.MonkeyPatch,
    ) -> None:
        """Recorder failure should return empty entries, not crash."""
        del enable_custom_integrations
        fake_api = FakeApi()
        _patch_integration(monkeypatch, fake_api)
        entry = _mock_entry()

        await _setup_entry(hass, entry)

        coordinator = entry.runtime_data.coordinator
        coordinator.async_set_updated_data(_electricity_meter_data())

        # Make the recorder blow up.  ``get_instance`` is imported locally
        # inside the handler, so we patch it at its source module.
        monkeypatch.setattr(
            "homeassistant.helpers.recorder.get_instance",
            MagicMock(
                return_value=MagicMock(
                    async_add_executor_job=AsyncMock(
                        side_effect=RuntimeError("DB gone")
                    )
                )
            ),
        )

        from custom_components.eon_next.websocket import ws_consumption_history

        mock_connection = MagicMock()
        ws_consumption_history(
            hass,
            mock_connection,
            {
                "id": 12,
                "type": "eon_next/consumption_history",
                "meter_serial": "E123",
                "days": 7,
            },
        )
        await hass.async_block_till_done()

        mock_connection.send_result.assert_called_once()
        result = mock_connection.send_result.call_args[0][1]
        # Recorder failure and no REST fallback data -> no entries
        assert result["entries"] == []

    @pytest.mark.asyncio
    async def test_falls_back_to_rest_when_statistics_empty(
        self,
        hass: HomeAssistant,
        enable_custom_integrations: None,
        monkeypatch: pytest.MonkeyPatch,
    ) -> None:
        """REST endpoint should be used when recorder statistics return nothing."""
        del enable_custom_integrations
        fake_api = FakeApi()
        # Pre-configure the REST fallback to return a single day entry.
        fake_api._consumption_result = {
            "results": [
                {
                    "interval_start": f"{_YESTERDAY_ISO}T00:00:00Z",
                    "consumption": 5.5,
                }
            ]
        }
        _patch_integration(monkeypatch, fake_api)
        entry = _mock_entry()

        await _setup_entry(hass, entry)

        coordinator = entry.runtime_data.coordinator
        coordinator.async_set_updated_data(_electricity_meter_data())

        # Mock recorder to return empty so REST fallback kicks in.
        monkeypatch.setattr(
            "homeassistant.helpers.recorder.get_instance",
            MagicMock(
                return_value=MagicMock(
                    async_add_executor_job=AsyncMock(return_value={})
                )
            ),
        )

        from custom_components.eon_next.websocket import ws_consumption_history

        mock_connection = MagicMock()
        ws_consumption_history(
            hass,
            mock_connection,
            {
                "id": 13,
                "type": "eon_next/consumption_history",
                "meter_serial": "E123",
                "days": 7,
            },
        )
        await hass.async_block_till_done()

        mock_connection.send_result.assert_called_once()
        result = mock_connection.send_result.call_args[0][1]
        # REST returned 1 entry; gap-filling adds zeros for remaining 6 days
        assert len(result["entries"]) == 7
        rest_entry = next(e for e in result["entries"] if e["consumption"] == 5.5)
        assert rest_entry["date"] == _YESTERDAY_ISO
        zero_entries = [e for e in result["entries"] if e["consumption"] == 0.0]
        assert len(zero_entries) == 6

    @pytest.mark.asyncio
    async def test_returns_entries_from_recorder_statistics(
        self,
        hass: HomeAssistant,
        enable_custom_integrations: None,
        monkeypatch: pytest.MonkeyPatch,
    ) -> None:
        """Recorder statistics should be converted to dated entries and trimmed."""
        del enable_custom_integrations
        fake_api = FakeApi()
        _patch_integration(monkeypatch, fake_api)
        entry = _mock_entry()

        await _setup_entry(hass, entry)

        coordinator = entry.runtime_data.coordinator
        coordinator.async_set_updated_data(_electricity_meter_data())

        # Build dynamic timestamps relative to today so the test never goes stale.
        # Use midday (12:00) UTC so that dt_util.as_local() never shifts
        # the date across a day boundary regardless of the HA timezone.
        _today = dt_util.now().date()
        _two_days_ago = _today - datetime.timedelta(days=2)
        _yesterday = _today - datetime.timedelta(days=1)

        ts_two_days = datetime.datetime(
            _two_days_ago.year, _two_days_ago.month, _two_days_ago.day,
            12, 0, 0, tzinfo=datetime.timezone.utc,
        ).timestamp()
        ts_yesterday = datetime.datetime(
            _yesterday.year, _yesterday.month, _yesterday.day,
            12, 0, 0, tzinfo=datetime.timezone.utc,
        ).timestamp()

        stat_id = "eon_next:electricity_e123_consumption"
        mock_stats = {
            stat_id: [
                {"start": ts_two_days, "change": 8.123},
                {"start": ts_yesterday, "change": 0.0},
            ]
        }

        monkeypatch.setattr(
            "homeassistant.helpers.recorder.get_instance",
            MagicMock(
                return_value=MagicMock(
                    async_add_executor_job=AsyncMock(return_value=mock_stats)
                )
            ),
        )

        from custom_components.eon_next.websocket import ws_consumption_history

        mock_connection = MagicMock()
        ws_consumption_history(
            hass,
            mock_connection,
            {
                "id": 14,
                "type": "eon_next/consumption_history",
                "meter_serial": "E123",
                "days": 3,
            },
        )
        await hass.async_block_till_done()

        mock_connection.send_result.assert_called_once()
        result = mock_connection.send_result.call_args[0][1]
        entries = result["entries"]

        # 2 stat entries + 1 gap-filled today = 3 entries (days=3)
        assert len(entries) == 3
        assert entries[0]["date"] == _two_days_ago.isoformat()
        assert entries[0]["consumption"] == 8.123
        assert entries[1]["date"] == _yesterday.isoformat()
        assert entries[1]["consumption"] == 0.0
        assert entries[2]["date"] == _today.isoformat()
        assert entries[2]["consumption"] == 0.0


class TestWsEvSchedule:
    """Tests for the eon_next/ev_schedule WebSocket handler."""

    @pytest.mark.asyncio
    async def test_ws_ev_schedule_returns_slots_for_known_device(
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

        now = dt_util.now()
        slot_start = now.isoformat()
        slot_end = (now + datetime.timedelta(hours=2)).isoformat()

        coordinator = entry.runtime_data.coordinator
        coordinator.async_set_updated_data(
            {
                "ev::device-1": {
                    "type": "ev_charger",
                    "device_id": "device-1",
                    "serial": "EV-001",
                    "schedule": [{"start": slot_start, "end": slot_end}],
                }
            }
        )

        from custom_components.eon_next.websocket import ws_ev_schedule

        mock_connection = MagicMock()
        ws_ev_schedule(
            hass,
            mock_connection,
            {"id": 20, "type": "eon_next/ev_schedule", "device_id": "device-1"},
        )

        mock_connection.send_result.assert_called_once_with(
            20,
            dataclasses.asdict(
                EvScheduleResponse(
                    device_id="device-1",
                    serial="EV-001",
                    status="scheduled",
                    slots=[EvScheduleSlot(start=slot_start, end=slot_end)],
                )
            ),
        )

    @pytest.mark.asyncio
    async def test_ws_ev_schedule_returns_unknown_for_missing_device(
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

        from custom_components.eon_next.websocket import ws_ev_schedule

        mock_connection = MagicMock()
        ws_ev_schedule(
            hass,
            mock_connection,
            {"id": 21, "type": "eon_next/ev_schedule", "device_id": "missing-device"},
        )

        mock_connection.send_result.assert_called_once_with(
            21,
            dataclasses.asdict(
                EvScheduleResponse(
                    device_id="missing-device",
                    serial=None,
                    status="unknown",
                    slots=[],
                )
            ),
        )


class TestWsBackfillStatus:
    """Tests for the eon_next/backfill_status WebSocket handler."""

    @pytest.mark.asyncio
    async def test_ws_backfill_status_reports_disabled_state(
        self,
        hass: HomeAssistant,
        enable_custom_integrations: None,
        monkeypatch: pytest.MonkeyPatch,
    ) -> None:
        del enable_custom_integrations
        fake_api = FakeApi()
        _patch_integration(monkeypatch, fake_api)
        entry = _mock_entry(options={CONF_BACKFILL_ENABLED: False})

        await _setup_entry(hass, entry)

        from custom_components.eon_next.websocket import ws_backfill_status

        mock_connection = MagicMock()
        ws_backfill_status(hass, mock_connection, {"id": 30, "type": "eon_next/backfill_status"})

        mock_connection.send_result.assert_called_once()
        result = mock_connection.send_result.call_args[0][1]

        assert result["state"] == "disabled"
        assert result["enabled"] is False
        assert result["total_meters"] == 1

    @pytest.mark.asyncio
    async def test_ws_backfill_status_sorts_meter_progress_by_serial(
        self,
        hass: HomeAssistant,
        enable_custom_integrations: None,
        monkeypatch: pytest.MonkeyPatch,
    ) -> None:
        del enable_custom_integrations
        fake_api = FakeApi()
        fake_api.accounts = [
            FakeAccount(
                meters=[FakeMeter(serial="METER-B"), FakeMeter(serial="METER-A")]
            )
        ]
        _patch_integration(monkeypatch, fake_api)
        entry = _mock_entry(options={CONF_BACKFILL_ENABLED: True})

        await _setup_entry(hass, entry)

        from custom_components.eon_next.websocket import ws_backfill_status

        mock_connection = MagicMock()
        ws_backfill_status(
            hass, mock_connection, {"id": 31, "type": "eon_next/backfill_status"}
        )

        mock_connection.send_result.assert_called_once()
        result = mock_connection.send_result.call_args[0][1]

        assert result["enabled"] is True
        assert result["state"] == "initializing"
        assert [meter["serial"] for meter in result["meters"]] == [
            "METER-A",
            "METER-B",
        ]


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
