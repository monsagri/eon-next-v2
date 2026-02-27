"""Unit tests for Eon Next API normalization helpers."""

from __future__ import annotations

import datetime
from typing import Any
from unittest.mock import AsyncMock

import pytest

from custom_components.eon_next.eonnext import EonNext, EonNextApiError

# Dynamic reference dates so tests remain valid regardless of when they run.
_TODAY = datetime.date.today()
_YESTERDAY = (_TODAY - datetime.timedelta(days=1)).isoformat()
_TWO_DAYS_AGO = (_TODAY - datetime.timedelta(days=2)).isoformat()


def test_normalize_graphql_consumption_items() -> None:
    """GraphQL consumption items are normalized into interval/consumption pairs."""
    items = [
        {
            "period": _TWO_DAYS_AGO,
            "data": {"costs": [{"consumption": "1.25"}, {"consumption": 0.75}]},
        },
        {
            "period": _YESTERDAY,
            "data": {"costs": [{"consumption": None}, {"consumption": "bad"}]},
        },
        "ignore",
    ]

    assert EonNext._normalize_graphql_consumption_items(items) == [
        {"interval_start": _TWO_DAYS_AGO, "consumption": 2.0}
    ]


@pytest.mark.asyncio
async def test_async_get_consumption_data_by_mpxn_delegates_to_range() -> None:
    """The days-based method delegates to range-based fetch with expected dates."""
    api = EonNext()
    api.async_get_consumption_data_by_mpxn_range = AsyncMock(  # type: ignore[method-assign]
        return_value=[{"interval_start": _YESTERDAY, "consumption": 1.0}]
    )

    result = await api.async_get_consumption_data_by_mpxn("1234567890", days=7)

    assert result == [{"interval_start": _YESTERDAY, "consumption": 1.0}]
    api.async_get_consumption_data_by_mpxn_range.assert_awaited_once()
    args = api.async_get_consumption_data_by_mpxn_range.await_args.args
    assert args[0] == "1234567890"
    assert isinstance(args[1], datetime.date)
    assert isinstance(args[2], datetime.date)
    assert (args[2] - args[1]).days == 6


# --- async_get_daily_costs unit rate tests ---


def _make_daily_cost_graphql_response(
    costs: list[dict[str, Any]],
    standing_charge_inc_vat: float | None = 30.0,
    total_charge_inc_vat: float | None = 150.0,
    period: str | None = None,
) -> dict[str, Any]:
    """Build a mock GraphQL response for consumptionDataByMpxn."""
    if period is None:
        period = _YESTERDAY
    return {
        "data": {
            "consumptionDataByMpxn": {
                "items": [
                    {
                        "period": period,
                        "data": {
                            "costs": costs,
                            "standingChargeIncVat": standing_charge_inc_vat,
                            "totalChargeIncVat": total_charge_inc_vat,
                        },
                    }
                ]
            }
        }
    }


@pytest.mark.asyncio
async def test_daily_costs_returns_unit_rate() -> None:
    """Unit rate is derived from costIncVat / consumption, converted pence -> pounds."""
    api = EonNext()
    # Two cost entries: total cost 100p over 4 kWh = 25p/kWh = 0.25 £/kWh
    api._graphql_post = AsyncMock(  # type: ignore[method-assign]
        return_value=_make_daily_cost_graphql_response(
            costs=[
                {"costIncVat": 60.0, "consumption": 2.0},
                {"costIncVat": 40.0, "consumption": 2.0},
            ],
            total_charge_inc_vat=130.0,
            standing_charge_inc_vat=30.0,
        )
    )

    result = await api.async_get_daily_costs("mpxn-1")

    assert result is not None
    assert result["unit_rate"] == 0.25


@pytest.mark.asyncio
async def test_daily_costs_unit_rate_none_when_zero_consumption() -> None:
    """Unit rate should be None when total consumption is zero."""
    api = EonNext()
    api._graphql_post = AsyncMock(  # type: ignore[method-assign]
        return_value=_make_daily_cost_graphql_response(
            costs=[{"costIncVat": 10.0, "consumption": 0.0}],
        )
    )

    result = await api.async_get_daily_costs("mpxn-1")

    assert result is not None
    assert result["unit_rate"] is None


@pytest.mark.asyncio
async def test_daily_costs_unit_rate_none_when_no_cost_entries() -> None:
    """Unit rate should be None when costs array is empty."""
    api = EonNext()
    api._graphql_post = AsyncMock(  # type: ignore[method-assign]
        return_value=_make_daily_cost_graphql_response(costs=[])
    )

    result = await api.async_get_daily_costs("mpxn-1")

    assert result is not None
    assert result["unit_rate"] is None


@pytest.mark.asyncio
async def test_refresh_token_login_propagates_api_error_and_preserves_auth() -> None:
    """EonNextApiError during refresh login should propagate without resetting auth."""
    api = EonNext()
    # Seed auth state with a valid-looking refresh token.
    api.auth = {
        "issued": 1000000000,
        "token": {"token": "old-jwt", "expires": 0},
        "refresh": {"token": "saved-refresh", "expires": 9999999999},
    }
    api._graphql_post = AsyncMock(  # type: ignore[method-assign]
        side_effect=EonNextApiError("connection timeout"),
    )

    with pytest.raises(EonNextApiError, match="connection timeout"):
        await api.login_with_refresh_token("saved-refresh")

    # Auth state must NOT have been reset — the refresh token is preserved
    # so it can be retried once connectivity recovers.
    assert api.auth["refresh"]["token"] == "saved-refresh"
    assert api.auth["issued"] == 1000000000


@pytest.mark.asyncio
async def test_password_login_propagates_api_error_and_preserves_auth() -> None:
    """EonNextApiError during password login should propagate without resetting auth."""
    api = EonNext()
    api.auth = {
        "issued": 1000000000,
        "token": {"token": "old-jwt", "expires": 0},
        "refresh": {"token": "saved-refresh", "expires": 9999999999},
    }
    api._graphql_post = AsyncMock(  # type: ignore[method-assign]
        side_effect=EonNextApiError("server unavailable"),
    )

    with pytest.raises(EonNextApiError, match="server unavailable"):
        await api.login_with_username_and_password("a@b.com", "pw", initialise=False)

    # Auth state must NOT have been reset.
    assert api.auth["refresh"]["token"] == "saved-refresh"
    assert api.auth["issued"] == 1000000000


@pytest.mark.asyncio
async def test_daily_costs_unit_rate_skips_invalid_entries() -> None:
    """Invalid cost entries are skipped; rate computed from valid ones only."""
    api = EonNext()
    api._graphql_post = AsyncMock(  # type: ignore[method-assign]
        return_value=_make_daily_cost_graphql_response(
            costs=[
                {"costIncVat": "bad", "consumption": 1.0},
                {"costIncVat": None, "consumption": 1.0},
                {"costIncVat": 50.0, "consumption": 2.0},
            ],
        )
    )

    result = await api.async_get_daily_costs("mpxn-1")

    assert result is not None
    # 50p / 2 kWh = 25p/kWh = 0.25 £/kWh
    assert result["unit_rate"] == 0.25


# --- multi-item daily costs tests ---

_THREE_DAYS_AGO = (_TODAY - datetime.timedelta(days=3)).isoformat()


@pytest.mark.asyncio
async def test_daily_costs_picks_most_recent_usable_item() -> None:
    """When multiple items are returned, pick the most recent with cost data."""
    api = EonNext()
    api._graphql_post = AsyncMock(  # type: ignore[method-assign]
        return_value={
            "data": {
                "consumptionDataByMpxn": {
                    "items": [
                        # Oldest — has cost data
                        {
                            "period": _THREE_DAYS_AGO,
                            "data": {
                                "costs": [{"costIncVat": 40.0, "consumption": 2.0}],
                                "standingChargeIncVat": 25.0,
                                "totalChargeIncVat": 65.0,
                            },
                        },
                        # Middle — missing cost fields entirely
                        {
                            "period": _TWO_DAYS_AGO,
                            "data": {
                                "costs": [],
                                "standingChargeIncVat": None,
                                "totalChargeIncVat": None,
                            },
                        },
                        # Most recent — has cost data, should be selected
                        {
                            "period": _YESTERDAY,
                            "data": {
                                "costs": [{"costIncVat": 80.0, "consumption": 4.0}],
                                "standingChargeIncVat": 30.0,
                                "totalChargeIncVat": 110.0,
                            },
                        },
                    ]
                }
            }
        }
    )

    result = await api.async_get_daily_costs("mpxn-1")

    assert result is not None
    assert result["period"] == _YESTERDAY
    assert result["standing_charge"] == 0.30
    assert result["total_cost"] == 1.10
    # 80p / 4 kWh = 20p/kWh = 0.20 £/kWh
    assert result["unit_rate"] == 0.20


@pytest.mark.asyncio
async def test_daily_costs_skips_to_older_when_recent_has_no_data() -> None:
    """When the most recent item has no usable data, fall back to older."""
    api = EonNext()
    api._graphql_post = AsyncMock(  # type: ignore[method-assign]
        return_value={
            "data": {
                "consumptionDataByMpxn": {
                    "items": [
                        # Older — has valid cost data
                        {
                            "period": _TWO_DAYS_AGO,
                            "data": {
                                "costs": [{"costIncVat": 60.0, "consumption": 3.0}],
                                "standingChargeIncVat": 28.0,
                                "totalChargeIncVat": 88.0,
                            },
                        },
                        # Most recent — data field is null
                        {
                            "period": _YESTERDAY,
                            "data": None,
                        },
                    ]
                }
            }
        }
    )

    result = await api.async_get_daily_costs("mpxn-1")

    assert result is not None
    assert result["period"] == _TWO_DAYS_AGO
    assert result["standing_charge"] == 0.28


@pytest.mark.asyncio
async def test_daily_costs_returns_none_when_all_items_empty() -> None:
    """When all items lack cost data, return None."""
    api = EonNext()
    api._graphql_post = AsyncMock(  # type: ignore[method-assign]
        return_value={
            "data": {
                "consumptionDataByMpxn": {
                    "items": [
                        {"period": _TWO_DAYS_AGO, "data": None},
                        {
                            "period": _YESTERDAY,
                            "data": {
                                "costs": [],
                                "standingChargeIncVat": None,
                                "totalChargeIncVat": None,
                            },
                        },
                    ]
                }
            }
        }
    )

    result = await api.async_get_daily_costs("mpxn-1")

    assert result is None
