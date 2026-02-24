"""Unit tests for Eon Next API normalization helpers."""

from __future__ import annotations

from datetime import date
from unittest.mock import AsyncMock

import pytest

from custom_components.eon_next.eonnext import EonNext


def test_normalize_graphql_consumption_items() -> None:
    """GraphQL consumption items are normalized into interval/consumption pairs."""
    items = [
        {
            "period": "2026-02-20",
            "data": {"costs": [{"consumption": "1.25"}, {"consumption": 0.75}]},
        },
        {
            "period": "2026-02-21",
            "data": {"costs": [{"consumption": None}, {"consumption": "bad"}]},
        },
        "ignore",
    ]

    assert EonNext._normalize_graphql_consumption_items(items) == [
        {"interval_start": "2026-02-20", "consumption": 2.0}
    ]


@pytest.mark.asyncio
async def test_async_get_consumption_data_by_mpxn_delegates_to_range() -> None:
    """The days-based method delegates to range-based fetch with expected dates."""
    api = EonNext()
    api.async_get_consumption_data_by_mpxn_range = AsyncMock(  # type: ignore[method-assign]
        return_value=[{"interval_start": "2026-02-24", "consumption": 1.0}]
    )

    result = await api.async_get_consumption_data_by_mpxn("1234567890", days=7)

    assert result == [{"interval_start": "2026-02-24", "consumption": 1.0}]
    api.async_get_consumption_data_by_mpxn_range.assert_awaited_once()
    args = api.async_get_consumption_data_by_mpxn_range.await_args.args
    assert args[0] == "1234567890"
    assert isinstance(args[1], date)
    assert isinstance(args[2], date)
    assert (args[2] - args[1]).days == 6
