"""Integration-style tests for config entry setup and sensor wiring."""

from __future__ import annotations

from collections.abc import Generator
from dataclasses import dataclass, field
import datetime
import logging
from typing import Any
from unittest.mock import AsyncMock, patch

import pytest
from pytest_homeassistant_custom_component.common import MockConfigEntry

import custom_components.eon_next as integration
from custom_components.eon_next.backfill import EonNextBackfillManager
from custom_components.eon_next.const import (
    CONF_BACKFILL_ENABLED,
    CONF_EMAIL,
    CONF_PASSWORD,
    CONF_REFRESH_TOKEN,
    DOMAIN,
)
from custom_components.eon_next.coordinator import EonNextCoordinator
from custom_components.eon_next.eonnext import EonNextApiError
from homeassistant.core import HomeAssistant
from homeassistant.config_entries import ConfigEntryState
from homeassistant.helpers import recorder as recorder_helper
from homeassistant.helpers import entity_registry as er
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


@dataclass(slots=True)
class FakeMeter:
    """Minimal meter object used by integration setup tests."""

    serial: str = "electric-meter-1"
    type: str = "electricity"
    supply_point_id: str = "mpxn-1"
    meter_id: str = "meter-id-1"
    latest_reading: float | None = None
    latest_reading_date: str | None = None

    async def _update(self) -> None:
        """Mirror async meter update API."""
        return None


@dataclass(slots=True)
class FakeAccount:
    """Minimal account shape expected by sensor setup."""

    meters: list[FakeMeter] = field(default_factory=list)
    ev_chargers: list[Any] = field(default_factory=list)


class FakeApi:
    """Minimal API client shape consumed by async_setup_entry."""

    def __init__(
        self,
        *,
        refresh_login_result: bool,
        password_login_result: bool = True,
    ) -> None:
        self.refresh_login_result = refresh_login_result
        self.password_login_result = password_login_result
        self.refresh_login_calls: list[str] = []
        self.password_login_calls: list[tuple[str, str]] = []
        self.closed = False
        self.username = ""
        self.password = ""
        self.accounts = [FakeAccount(meters=[FakeMeter()])]
        self._token_callback = None

    def set_token_update_callback(self, callback) -> None:
        """Capture callback registration from integration setup."""
        self._token_callback = callback

    async def login_with_refresh_token(self, token: str) -> bool:
        """Record refresh-token login usage."""
        self.refresh_login_calls.append(token)
        return self.refresh_login_result

    async def login_with_username_and_password(
        self,
        username: str,
        password: str,
    ) -> bool:
        """Record username/password login fallback usage."""
        self.password_login_calls.append((username, password))
        return self.password_login_result

    async def async_close(self) -> None:
        """Track API close on unload."""
        self.closed = True


async def _fake_first_refresh(self: EonNextCoordinator) -> None:
    """Avoid network update during setup while marking coordinator healthy."""
    self.async_set_updated_data({})


async def _fake_backfill_run(self: EonNextBackfillManager) -> None:
    """Disable long-running backfill loop during tests."""
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


async def _setup_entry(hass: HomeAssistant, entry: MockConfigEntry) -> None:
    await _ensure_recorder(hass)
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()


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


def _status_entity_id(hass: HomeAssistant, entry: MockConfigEntry) -> str:
    registry = er.async_get(hass)
    for registry_entry in er.async_entries_for_config_entry(registry, entry.entry_id):
        if registry_entry.unique_id == "eon_next__historical_backfill_status":
            return registry_entry.entity_id
    raise AssertionError("Missing historical backfill status entity")


def _cost_tracker_entity_id(
    hass: HomeAssistant,
    entry: MockConfigEntry,
    tracker_id: str,
) -> str:
    registry = er.async_get(hass)
    expected_unique_id = f"cost_tracker__{tracker_id}"
    for registry_entry in er.async_entries_for_config_entry(registry, entry.entry_id):
        if registry_entry.unique_id == expected_unique_id:
            return registry_entry.entity_id
    raise AssertionError(f"Missing cost tracker entity for {tracker_id}")


def _patch_integration(
    monkeypatch: pytest.MonkeyPatch,
    fake_api: FakeApi,
) -> None:
    monkeypatch.setattr(integration, "EonNext", lambda: fake_api)
    monkeypatch.setattr(
        EonNextCoordinator,
        "async_config_entry_first_refresh",
        _fake_first_refresh,
    )
    monkeypatch.setattr(EonNextBackfillManager, "_async_run", _fake_backfill_run)


@pytest.mark.asyncio
async def test_setup_uses_refresh_token_and_creates_status_sensor(
    hass: HomeAssistant,
    enable_custom_integrations: None,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Setup should use refresh token first and register status sensor."""
    del enable_custom_integrations
    fake_api = FakeApi(refresh_login_result=True)
    _patch_integration(monkeypatch, fake_api)
    entry = _mock_entry()

    await _setup_entry(hass, entry)

    assert fake_api.refresh_login_calls == ["refresh-token"]
    assert fake_api.password_login_calls == []
    assert entry.runtime_data.api is fake_api

    state = hass.states.get(_status_entity_id(hass, entry))
    assert state is not None
    assert state.state == "disabled"
    assert state.attributes["total_meters"] == 1
    assert state.attributes["pending_meters"] == 1


@pytest.mark.asyncio
async def test_setup_falls_back_to_username_password_when_refresh_fails(
    hass: HomeAssistant,
    enable_custom_integrations: None,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Setup should fall back to username/password when refresh token is invalid."""
    del enable_custom_integrations
    fake_api = FakeApi(refresh_login_result=False)
    _patch_integration(monkeypatch, fake_api)
    entry = _mock_entry()

    await _setup_entry(hass, entry)

    assert fake_api.refresh_login_calls == ["refresh-token"]
    assert fake_api.password_login_calls == [("user@example.com", "secret")]


@pytest.mark.asyncio
async def test_status_sensor_updates_when_backfill_state_changes(
    hass: HomeAssistant,
    enable_custom_integrations: None,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Status sensor should update when manager notifies listeners."""
    del enable_custom_integrations
    fake_api = FakeApi(refresh_login_result=True)
    _patch_integration(monkeypatch, fake_api)
    entry = _mock_entry(options={CONF_BACKFILL_ENABLED: True})

    await _setup_entry(hass, entry)
    entity_id = _status_entity_id(hass, entry)

    state = hass.states.get(entity_id)
    assert state is not None
    assert state.state == "initializing"

    manager = entry.runtime_data.backfill
    manager._store.async_save = AsyncMock()  # noqa: SLF001 - mock store to avoid I/O
    manager._state = {  # noqa: SLF001 - set desired test state
        "initialized": True,
        "rebuild_done": True,
        "lookback_days": 3650,
        "meters": {
            "electric-meter-1": {
                "next_start": datetime.date.today().isoformat(),
                "done": True,
            }
        },
    }
    await manager._save_state()  # noqa: SLF001 - exercises save + notify codepath
    await hass.async_block_till_done()

    updated = hass.states.get(entity_id)
    assert updated is not None
    assert updated.state == "completed"
    assert updated.attributes["completed_meters"] == 1
    assert updated.attributes["pending_meters"] == 0


@pytest.mark.asyncio
async def test_unload_entry_closes_api_client(
    hass: HomeAssistant,
    enable_custom_integrations: None,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Unload should close API client and remove entities."""
    del enable_custom_integrations
    fake_api = FakeApi(refresh_login_result=True)
    _patch_integration(monkeypatch, fake_api)
    entry = _mock_entry()

    await _setup_entry(hass, entry)

    assert await hass.config_entries.async_unload(entry.entry_id)
    await hass.async_block_till_done()

    assert fake_api.closed is True
    assert entry.state is ConfigEntryState.NOT_LOADED


@pytest.mark.asyncio
async def test_add_cost_tracker_service_creates_tracker_entity(
    hass: HomeAssistant,
    enable_custom_integrations: None,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Adding a cost tracker via service should create a new sensor entity."""
    del enable_custom_integrations
    fake_api = FakeApi(refresh_login_result=True)
    _patch_integration(monkeypatch, fake_api)
    entry = _mock_entry()

    await _setup_entry(hass, entry)
    entry.runtime_data.cost_trackers._store.async_save = AsyncMock()  # noqa: SLF001

    await hass.services.async_call(
        DOMAIN,
        "add_cost_tracker",
        {
            "name": "Washing Machine",
            "tracked_entity_id": "sensor.washer_energy",
            "meter_serial": "electric-meter-1",
            "enabled": True,
        },
        blocking=True,
    )
    await hass.async_block_till_done()

    tracker_entity = _cost_tracker_entity_id(hass, entry, "washing_machine")
    state = hass.states.get(tracker_entity)
    assert state is not None
    assert state.state == "0.0"
    assert state.attributes["tracked_entity"] == "sensor.washer_energy"
    assert state.attributes["meter_serial"] == "electric-meter-1"
    assert state.attributes["enabled"] is True


@pytest.mark.asyncio
async def test_reset_and_update_cost_tracker_services(
    hass: HomeAssistant,
    enable_custom_integrations: None,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Reset/update services should mutate tracker manager state."""
    del enable_custom_integrations
    fake_api = FakeApi(refresh_login_result=True)
    _patch_integration(monkeypatch, fake_api)
    entry = _mock_entry()

    await _setup_entry(hass, entry)
    entry.runtime_data.cost_trackers._store.async_save = AsyncMock()  # noqa: SLF001

    await hass.services.async_call(
        DOMAIN,
        "add_cost_tracker",
        {
            "name": "Dryer",
            "tracked_entity_id": "sensor.dryer_energy",
            "meter_serial": "electric-meter-1",
        },
        blocking=True,
    )
    await hass.async_block_till_done()

    manager = entry.runtime_data.cost_trackers
    tracker_id = "dryer"
    tracker_entity = _cost_tracker_entity_id(hass, entry, tracker_id)

    tracker_state = manager.get_state(tracker_id)
    assert tracker_state is not None
    tracker_state.today_cost = 2.5
    tracker_state.today_consumption_kwh = 7.25

    await hass.services.async_call(
        DOMAIN,
        "reset_cost_tracker",
        {"entity_id": tracker_entity},
        blocking=True,
    )
    await hass.async_block_till_done()
    assert tracker_state.today_cost == 0.0
    assert tracker_state.today_consumption_kwh == 0.0

    await hass.services.async_call(
        DOMAIN,
        "update_cost_tracker",
        {"entity_id": tracker_entity, "enabled": False},
        blocking=True,
    )
    await hass.async_block_till_done()
    tracker_config = manager.get_config(tracker_id)
    assert tracker_config is not None
    assert tracker_config.enabled is False


class FakeApiWithApiError(FakeApi):
    """FakeApi variant that raises EonNextApiError on login calls."""

    def __init__(
        self,
        *,
        refresh_raises: bool = False,
        password_raises: bool = False,
    ) -> None:
        super().__init__(refresh_login_result=False)
        self._refresh_raises = refresh_raises
        self._password_raises = password_raises

    async def login_with_refresh_token(self, token: str) -> bool:
        self.refresh_login_calls.append(token)
        if self._refresh_raises:
            raise EonNextApiError("API unreachable")
        return self.refresh_login_result

    async def login_with_username_and_password(
        self,
        username: str,
        password: str,
    ) -> bool:
        self.password_login_calls.append((username, password))
        if self._password_raises:
            raise EonNextApiError("API unreachable")
        return self.password_login_result


@pytest.mark.asyncio
async def test_setup_raises_config_entry_not_ready_on_refresh_api_error(
    hass: HomeAssistant,
    enable_custom_integrations: None,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """EonNextApiError during refresh-token login should result in ConfigEntryNotReady."""
    del enable_custom_integrations
    fake_api = FakeApiWithApiError(refresh_raises=True)
    _patch_integration(monkeypatch, fake_api)
    entry = _mock_entry()

    await _ensure_recorder(hass)
    entry.add_to_hass(hass)
    await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()

    assert entry.state is ConfigEntryState.SETUP_RETRY
    assert fake_api.closed is True
    assert fake_api.refresh_login_calls == ["refresh-token"]
    # Password fallback should NOT have been attempted.
    assert fake_api.password_login_calls == []


@pytest.mark.asyncio
async def test_setup_raises_config_entry_not_ready_on_password_api_error(
    hass: HomeAssistant,
    enable_custom_integrations: None,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """EonNextApiError during password login should result in ConfigEntryNotReady."""
    del enable_custom_integrations
    fake_api = FakeApiWithApiError(refresh_raises=False, password_raises=True)
    _patch_integration(monkeypatch, fake_api)
    entry = _mock_entry()

    await _ensure_recorder(hass)
    entry.add_to_hass(hass)
    await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()

    assert entry.state is ConfigEntryState.SETUP_RETRY
    assert fake_api.closed is True
    # Refresh token login returned False, so password fallback was attempted.
    assert fake_api.refresh_login_calls == ["refresh-token"]
    assert fake_api.password_login_calls == [("user@example.com", "secret")]
