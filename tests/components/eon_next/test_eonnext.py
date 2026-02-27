"""Unit tests for Eon Next API client."""

from __future__ import annotations

from unittest.mock import AsyncMock

import pytest

from custom_components.eon_next.eonnext import EonNext, EonNextApiError


@pytest.mark.asyncio
async def test_consumption_data_by_mpxn_returns_none() -> None:
    """GraphQL consumptionDataByMpxn was removed; stub returns None."""
    api = EonNext()
    result = await api.async_get_consumption_data_by_mpxn("1234567890", days=7)
    assert result is None


@pytest.mark.asyncio
async def test_daily_costs_returns_none() -> None:
    """GraphQL consumptionDataByMpxn was removed; daily costs stub returns None."""
    api = EonNext()
    result = await api.async_get_daily_costs("mpxn-1")
    assert result is None


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


