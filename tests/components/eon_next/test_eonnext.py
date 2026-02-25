"""Unit tests for Eon Next API normalization helpers."""

from __future__ import annotations

import datetime
import errno
from types import SimpleNamespace
from typing import Any
from unittest.mock import AsyncMock

import aiohttp
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


@pytest.mark.asyncio
async def test_graphql_post_retries_over_ipv4_after_connector_error() -> None:
    """GraphQL calls retry over IPv4 once after connector-level network errors."""
    api = EonNext()
    api._get_session = AsyncMock(return_value=object())  # type: ignore[method-assign]
    api._graphql_post_with_session = AsyncMock(  # type: ignore[method-assign]
        side_effect=aiohttp.ClientConnectorError(
            SimpleNamespace(host="api.eonnext-kraken.energy", port=443, ssl=True),
            OSError(errno.ENETUNREACH, "Network unreachable"),
        ),
    )
    api._graphql_post_with_ipv4_fallback = AsyncMock(  # type: ignore[method-assign]
        return_value={"data": {"ok": True}},
    )

    result = await api._graphql_post(
        "refreshToken",
        "mutation refreshToken { __typename }",
        authenticated=False,
    )

    assert result == {"data": {"ok": True}}
    api._graphql_post_with_ipv4_fallback.assert_awaited_once()


@pytest.mark.asyncio
async def test_graphql_post_raises_api_error_when_ipv4_retry_fails() -> None:
    """A failed IPv4 retry should still surface as EonNextApiError."""
    api = EonNext()
    api._get_session = AsyncMock(return_value=object())  # type: ignore[method-assign]
    api._graphql_post_with_session = AsyncMock(  # type: ignore[method-assign]
        side_effect=aiohttp.ClientConnectorError(
            SimpleNamespace(host="api.eonnext-kraken.energy", port=443, ssl=True),
            OSError(errno.ENETUNREACH, "Network unreachable"),
        ),
    )
    api._graphql_post_with_ipv4_fallback = AsyncMock(  # type: ignore[method-assign]
        side_effect=aiohttp.ClientConnectionError("ipv4 failed"),
    )

    with pytest.raises(EonNextApiError, match="ipv4 failed"):
        await api._graphql_post(
            "refreshToken",
            "mutation refreshToken { __typename }",
            authenticated=False,
        )


@pytest.mark.asyncio
async def test_async_close_does_not_close_injected_session() -> None:
    """Externally managed sessions should not be closed by the API client."""

    class _SharedSession:
        def __init__(self) -> None:
            self.closed = False
            self.close_calls = 0

        async def close(self) -> None:
            self.close_calls += 1
            self.closed = True

    shared_session: Any = _SharedSession()
    api = EonNext(session=shared_session)

    await api.async_close()

    assert shared_session.close_calls == 0
