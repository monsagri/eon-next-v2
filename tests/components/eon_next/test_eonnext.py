"""Unit tests for Eon Next API client."""

from __future__ import annotations

from typing import Any
from unittest.mock import AsyncMock

import pytest

from datetime import datetime, timedelta, timezone

from custom_components.eon_next.eonnext import (
    EnergyAccount,
    EonNext,
    EonNextApiError,
    EonNextAuthError,
    METER_TYPE_ELECTRIC,
)

_PAST_ISO = (datetime.now(tz=timezone.utc) - timedelta(days=1)).isoformat()
_FUTURE_ISO = (datetime.now(tz=timezone.utc) + timedelta(days=1)).isoformat()


def _seed_valid_auth(api: EonNext) -> int:
    """Give the client a token that reads as valid locally. Returns 'now'."""
    now = api._KrakenClient__current_timestamp()  # type: ignore[attr-defined]
    api.auth = {
        "issued": now,
        "token": {"token": "jwt", "expires": now + 3600},
        "refresh": {"token": "refresh", "expires": now + 7200},
    }
    return now


class _FakeResponse:
    """Minimal async-context-manager stand-in for an aiohttp response."""

    def __init__(self, status: int, json_data: Any = None) -> None:
        self.status = status
        self._json = json_data if json_data is not None else {}

    async def __aenter__(self) -> "_FakeResponse":
        return self

    async def __aexit__(self, *_exc: Any) -> None:
        return None

    async def json(self, *_args: Any, **_kwargs: Any) -> Any:
        return self._json

    async def text(self) -> str:
        return ""


class _FakeSession:
    """Returns queued responses for get()/post(); records auth headers used."""

    def __init__(self, responses: list[_FakeResponse]) -> None:
        self._responses = list(responses)
        self.headers_seen: list[dict[str, str]] = []

    def get(self, _url: str, params=None, headers=None) -> _FakeResponse:
        self.headers_seen.append(headers or {})
        return self._responses.pop(0)

    def post(self, _url: str, json=None, headers=None) -> _FakeResponse:
        self.headers_seen.append(headers or {})
        return self._responses.pop(0)


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

    # Auth state must NOT have been reset - the refresh token is preserved
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


# --- 1.2: token expiry margin + 401 refresh-and-retry ---


def test_auth_token_margin_treats_soon_expiring_token_as_invalid() -> None:
    """A token expiring inside the safety margin is proactively refreshed."""
    api = EonNext()
    now = api._KrakenClient__current_timestamp()  # type: ignore[attr-defined]

    api.auth = {
        "issued": now,
        "token": {"token": "jwt", "expires": now + 30},  # < 60s margin
        "refresh": {"token": "r", "expires": now + 7200},
    }
    assert api._KrakenClient__auth_token_is_valid() is False  # type: ignore[attr-defined]

    api.auth["token"]["expires"] = now + 120  # > 60s margin
    assert api._KrakenClient__auth_token_is_valid() is True  # type: ignore[attr-defined]


@pytest.mark.asyncio
async def test_force_token_refresh_obtains_new_token() -> None:
    """_force_token_refresh drops the cached token and refreshes once."""
    api = EonNext()
    now = _seed_valid_auth(api)

    async def _fake_post(*_args: Any, **_kwargs: Any) -> dict:
        return {
            "data": {
                "obtainKrakenToken": {
                    "token": "new-jwt",
                    "refreshToken": "new-refresh",
                    "refreshExpiresIn": 7200,
                    "payload": {"iat": now, "exp": now + 3600},
                }
            }
        }

    api._graphql_post = AsyncMock(side_effect=_fake_post)  # type: ignore[method-assign]

    assert await api._force_token_refresh() is True
    assert api.auth["token"]["token"] == "new-jwt"
    assert api.auth["refresh"]["token"] == "new-refresh"


@pytest.mark.asyncio
async def test_consumption_retries_once_on_401_then_succeeds() -> None:
    """A single 401 triggers one refresh-and-retry rather than a re-auth."""
    api = EonNext()
    _seed_valid_auth(api)
    api._force_token_refresh = AsyncMock(return_value=True)  # type: ignore[method-assign]

    session = _FakeSession([
        _FakeResponse(401),
        _FakeResponse(200, {"results": [{"consumption": 1}]}),
    ])
    api._get_session = AsyncMock(return_value=session)  # type: ignore[method-assign]

    result = await api.async_get_consumption(
        METER_TYPE_ELECTRIC, "sp-1", "m1", group_by="day", page_size=1
    )

    assert result == {"results": [{"consumption": 1}]}
    api._force_token_refresh.assert_awaited_once()
    assert len(session.headers_seen) == 2


@pytest.mark.asyncio
async def test_consumption_raises_auth_after_second_401() -> None:
    """A persistent 401 (after one retry) escalates to EonNextAuthError."""
    api = EonNext()
    _seed_valid_auth(api)
    api._force_token_refresh = AsyncMock(return_value=True)  # type: ignore[method-assign]

    session = _FakeSession([_FakeResponse(401), _FakeResponse(401)])
    api._get_session = AsyncMock(return_value=session)  # type: ignore[method-assign]

    with pytest.raises(EonNextAuthError):
        await api.async_get_consumption(
            METER_TYPE_ELECTRIC, "sp-1", "m1", group_by="day", page_size=1
        )
    api._force_token_refresh.assert_awaited_once()


@pytest.mark.asyncio
async def test_graphql_retries_once_on_401_then_succeeds() -> None:
    """GraphQL authenticated calls also get one refresh-and-retry on 401."""
    api = EonNext()
    _seed_valid_auth(api)
    api._force_token_refresh = AsyncMock(return_value=True)  # type: ignore[method-assign]

    session = _FakeSession([
        _FakeResponse(401),
        _FakeResponse(200, {"data": {"ok": True}}),
    ])
    api._get_session = AsyncMock(return_value=session)  # type: ignore[method-assign]

    result = await api._graphql_post("op", "query {}", {})

    assert result == {"data": {"ok": True}}
    api._force_token_refresh.assert_awaited_once()
    assert len(session.headers_seen) == 2


# --- #53: filter out inactive (replaced) meters ---


class TestMeterIsInactive:
    def test_no_active_to_is_kept(self) -> None:
        assert EnergyAccount._meter_is_inactive({"serialNumber": "S"}) is False
        assert EnergyAccount._meter_is_inactive({"activeTo": None}) is False

    def test_past_active_to_is_inactive(self) -> None:
        assert EnergyAccount._meter_is_inactive({"activeTo": _PAST_ISO}) is True

    def test_future_active_to_is_active(self) -> None:
        assert EnergyAccount._meter_is_inactive({"activeTo": _FUTURE_ISO}) is False

    def test_unparseable_active_to_is_kept(self) -> None:
        # Don't hide a meter on bad data.
        assert EnergyAccount._meter_is_inactive({"activeTo": "garbage"}) is False

    def test_zulu_suffix_is_parsed(self) -> None:
        zulu = _PAST_ISO.replace("+00:00", "Z")
        assert EnergyAccount._meter_is_inactive({"activeTo": zulu}) is True


@pytest.mark.asyncio
async def test_load_meters_skips_inactive() -> None:
    """_load_meters drops meters whose activeTo is in the past."""
    api = EonNext()
    account = EnergyAccount(api, "ACC-1")
    result = {
        "data": {
            "properties": [
                {
                    "electricityMeterPoints": [
                        {
                            "mpan": "1200000000000",
                            "meters": [
                                {"id": "e1", "serialNumber": "ACTIVE-E", "activeTo": None},
                                {"id": "e2", "serialNumber": "OLD-E", "activeTo": _PAST_ISO},
                            ],
                        }
                    ],
                    "gasMeterPoints": [
                        {
                            "mprn": "9100000000",
                            "meters": [
                                {"id": "g1", "serialNumber": "ACTIVE-G", "activeTo": _FUTURE_ISO},
                                {"id": "g2", "serialNumber": "OLD-G", "activeTo": _PAST_ISO},
                            ],
                        }
                    ],
                }
            ]
        }
    }
    api._graphql_post = AsyncMock(return_value=result)  # type: ignore[method-assign]

    await account._load_meters()

    serials = {meter.serial for meter in account.meters}
    assert serials == {"ACTIVE-E", "ACTIVE-G"}


