"""Unit tests for Eon Next options flow."""

from __future__ import annotations

from types import SimpleNamespace

from custom_components.eon_next.config_flow import EonNextOptionsFlow
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
)


async def test_options_flow_uses_defaults() -> None:
    """Options form should include conservative backfill defaults."""
    flow = EonNextOptionsFlow(SimpleNamespace(options={}))

    result = await flow.async_step_init()

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
