"""Unit tests for Eon Next options flow."""

from __future__ import annotations

from unittest.mock import patch

from pytest_homeassistant_custom_component.common import MockConfigEntry

from homeassistant.core import HomeAssistant
from homeassistant.helpers import recorder as recorder_helper
from homeassistant.setup import async_setup_component

from custom_components.eon_next.const import (
    CONF_BACKFILL_CHUNK_DAYS,
    CONF_BACKFILL_DELAY_SECONDS,
    CONF_BACKFILL_ENABLED,
    CONF_BACKFILL_LOOKBACK_DAYS,
    CONF_BACKFILL_REBUILD_STATISTICS,
    CONF_BACKFILL_REQUESTS_PER_RUN,
    CONF_BACKFILL_RUN_INTERVAL_MINUTES,
    CONF_SHOW_CARD,
    CONF_SHOW_PANEL,
    DEFAULT_BACKFILL_CHUNK_DAYS,
    DEFAULT_BACKFILL_DELAY_SECONDS,
    DEFAULT_BACKFILL_ENABLED,
    DEFAULT_BACKFILL_LOOKBACK_DAYS,
    DEFAULT_BACKFILL_REBUILD_STATISTICS,
    DEFAULT_BACKFILL_REQUESTS_PER_RUN,
    DEFAULT_BACKFILL_RUN_INTERVAL_MINUTES,
    DEFAULT_SHOW_CARD,
    DEFAULT_SHOW_PANEL,
    DOMAIN,
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


async def test_options_flow_uses_defaults(
    hass: HomeAssistant, enable_custom_integrations: None
) -> None:
    """Options form should include conservative backfill defaults."""
    del enable_custom_integrations
    await _ensure_recorder(hass)
    entry = MockConfigEntry(domain=DOMAIN, options={})
    entry.add_to_hass(hass)

    result = await hass.config_entries.options.async_init(entry.entry_id)

    assert result["type"] == "form"
    schema = result["data_schema"]
    defaults = {
        marker.schema: (
            marker.default() if callable(marker.default) else marker.default
        )
        for marker in schema.schema
        if hasattr(marker, "default")
    }
    assert defaults[CONF_SHOW_CARD] == DEFAULT_SHOW_CARD
    assert defaults[CONF_SHOW_PANEL] == DEFAULT_SHOW_PANEL
    assert defaults[CONF_BACKFILL_ENABLED] == DEFAULT_BACKFILL_ENABLED
    assert defaults[CONF_BACKFILL_REBUILD_STATISTICS] == DEFAULT_BACKFILL_REBUILD_STATISTICS
    assert defaults[CONF_BACKFILL_LOOKBACK_DAYS] == DEFAULT_BACKFILL_LOOKBACK_DAYS
    assert defaults[CONF_BACKFILL_CHUNK_DAYS] == DEFAULT_BACKFILL_CHUNK_DAYS
    assert defaults[CONF_BACKFILL_REQUESTS_PER_RUN] == DEFAULT_BACKFILL_REQUESTS_PER_RUN
    assert (
        defaults[CONF_BACKFILL_RUN_INTERVAL_MINUTES]
        == DEFAULT_BACKFILL_RUN_INTERVAL_MINUTES
    )
    assert defaults[CONF_BACKFILL_DELAY_SECONDS] == DEFAULT_BACKFILL_DELAY_SECONDS
