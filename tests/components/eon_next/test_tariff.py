"""Unit tests for tariff agreement fetching and sensor entities."""

from __future__ import annotations

import datetime
from typing import Any
from unittest.mock import AsyncMock

import pytest

from custom_components.eon_next.eonnext import EonNext

# Dynamic reference dates so tests remain valid regardless of when they run.
_TODAY = datetime.date.today().isoformat()
_LAST_YEAR = (datetime.date.today() - datetime.timedelta(days=365)).isoformat()
_TWO_YEARS_AGO = (datetime.date.today() - datetime.timedelta(days=730)).isoformat()
_NEXT_YEAR = (datetime.date.today() + datetime.timedelta(days=365)).isoformat()
_TWO_YEARS_AHEAD = (datetime.date.today() + datetime.timedelta(days=730)).isoformat()


class TestFindActiveAgreement:
    """Tests for EonNext._find_active_agreement static method."""

    def test_returns_none_for_empty_list(self) -> None:
        assert EonNext._find_active_agreement([], _TODAY) is None

    def test_returns_none_for_non_list(self) -> None:
        assert EonNext._find_active_agreement("bad", _TODAY) is None  # type: ignore[arg-type]

    def test_selects_active_standard_tariff(self) -> None:
        agreements = [
            {
                "id": "old",
                "validFrom": _TWO_YEARS_AGO,
                "validTo": _LAST_YEAR,
                "tariff": {
                    "__typename": "StandardTariff",
                    "displayName": "Old Tariff",
                    "tariffCode": "OLD-01",
                    "unitRate": "24.50",
                    "standingCharge": "46.36",
                },
            },
            {
                "id": "current",
                "validFrom": _LAST_YEAR,
                "validTo": _NEXT_YEAR,
                "tariff": {
                    "__typename": "StandardTariff",
                    "displayName": "Next Flex",
                    "fullName": "Next Flex v1",
                    "tariffCode": "E-1R-NEXT-FLEX-01",
                    "unitRate": "22.36",
                    "standingCharge": "53.35",
                },
            },
        ]
        result = EonNext._find_active_agreement(agreements, _TODAY)

        assert result is not None
        assert result["tariff_name"] == "Next Flex"
        assert result["tariff_code"] == "E-1R-NEXT-FLEX-01"
        assert result["tariff_type"] == "StandardTariff"
        assert result["unit_rate"] == "22.36"
        assert result["standing_charge"] == "53.35"
        assert result["valid_from"] == _LAST_YEAR
        assert result["valid_to"] == _NEXT_YEAR

    def test_skips_future_agreement(self) -> None:
        agreements = [
            {
                "id": "future",
                "validFrom": _NEXT_YEAR,
                "validTo": _TWO_YEARS_AHEAD,
                "tariff": {
                    "__typename": "StandardTariff",
                    "displayName": "Future Tariff",
                    "tariffCode": "FUTURE-01",
                    "unitRate": "20.00",
                    "standingCharge": "50.00",
                },
            },
        ]
        assert EonNext._find_active_agreement(agreements, _TODAY) is None

    def test_skips_expired_agreement(self) -> None:
        agreements = [
            {
                "id": "expired",
                "validFrom": _TWO_YEARS_AGO,
                "validTo": _LAST_YEAR,
                "tariff": {
                    "__typename": "StandardTariff",
                    "displayName": "Expired Tariff",
                    "tariffCode": "EXP-01",
                    "unitRate": "30.00",
                    "standingCharge": "45.00",
                },
            },
        ]
        assert EonNext._find_active_agreement(agreements, _TODAY) is None

    def test_open_ended_agreement(self) -> None:
        """Agreement with empty validTo should be considered active."""
        agreements = [
            {
                "id": "open",
                "validFrom": _LAST_YEAR,
                "validTo": "",
                "tariff": {
                    "__typename": "StandardTariff",
                    "displayName": "Open Ended",
                    "tariffCode": "OPEN-01",
                    "unitRate": "25.00",
                    "standingCharge": "50.00",
                },
            },
        ]
        result = EonNext._find_active_agreement(agreements, _TODAY)
        assert result is not None
        assert result["tariff_name"] == "Open Ended"

    def test_null_valid_to_agreement(self) -> None:
        """Agreement with null validTo should be considered active."""
        agreements = [
            {
                "id": "null-end",
                "validFrom": _LAST_YEAR,
                "validTo": None,
                "tariff": {
                    "__typename": "StandardTariff",
                    "displayName": "No End Date",
                    "tariffCode": "NULL-01",
                    "unitRate": "21.00",
                    "standingCharge": "48.00",
                },
            },
        ]
        result = EonNext._find_active_agreement(agreements, _TODAY)
        assert result is not None
        assert result["tariff_name"] == "No End Date"

    def test_half_hourly_tariff_averages_unit_rates(self) -> None:
        """HalfHourlyTariff should average the unitRates list."""
        agreements = [
            {
                "id": "hh",
                "validFrom": _LAST_YEAR,
                "validTo": _NEXT_YEAR,
                "tariff": {
                    "__typename": "HalfHourlyTariff",
                    "displayName": "Next Solar Max",
                    "tariffCode": "E-1R-SOLAR-01",
                    "unitRates": [
                        {"value": "10.0"},
                        {"value": "20.0"},
                        {"value": "30.0"},
                    ],
                    "standingCharge": "55.00",
                },
            },
        ]
        result = EonNext._find_active_agreement(agreements, _TODAY)
        assert result is not None
        assert result["tariff_name"] == "Next Solar Max"
        assert result["unit_rate"] == pytest.approx(20.0)

    def test_uses_fullname_when_displayname_absent(self) -> None:
        agreements = [
            {
                "id": "no-display",
                "validFrom": _LAST_YEAR,
                "validTo": _NEXT_YEAR,
                "tariff": {
                    "__typename": "StandardTariff",
                    "fullName": "Full Name Only",
                    "tariffCode": "FN-01",
                    "unitRate": "22.00",
                    "standingCharge": "50.00",
                },
            },
        ]
        result = EonNext._find_active_agreement(agreements, _TODAY)
        assert result is not None
        assert result["tariff_name"] == "Full Name Only"

    def test_skips_agreement_with_missing_valid_from(self) -> None:
        """Agreement without validFrom should be skipped (unknown validity)."""
        agreements = [
            {
                "id": "no-start",
                "validTo": _NEXT_YEAR,
                "tariff": {
                    "__typename": "StandardTariff",
                    "displayName": "No Start",
                    "tariffCode": "NS-01",
                    "unitRate": "22.00",
                    "standingCharge": "50.00",
                },
            },
        ]
        assert EonNext._find_active_agreement(agreements, _TODAY) is None

    def test_skips_agreement_with_null_valid_from(self) -> None:
        """Agreement with null validFrom should be skipped."""
        agreements = [
            {
                "id": "null-start",
                "validFrom": None,
                "validTo": _NEXT_YEAR,
                "tariff": {
                    "__typename": "StandardTariff",
                    "displayName": "Null Start",
                    "tariffCode": "NS-02",
                    "unitRate": "22.00",
                    "standingCharge": "50.00",
                },
            },
        ]
        assert EonNext._find_active_agreement(agreements, _TODAY) is None

    def test_skips_non_dict_agreements(self) -> None:
        agreements: list[Any] = ["bad", None, 123]
        assert EonNext._find_active_agreement(agreements, _TODAY) is None

    def test_skips_agreement_with_non_dict_tariff(self) -> None:
        agreements = [
            {
                "id": "bad-tariff",
                "validFrom": _LAST_YEAR,
                "validTo": _NEXT_YEAR,
                "tariff": "not-a-dict",
            },
        ]
        assert EonNext._find_active_agreement(agreements, _TODAY) is None


@pytest.mark.asyncio
async def test_async_get_tariff_data_maps_by_supply_point() -> None:
    """Tariff data should be keyed by MPAN/MPRN."""
    api = EonNext()
    api._graphql_post = AsyncMock(  # type: ignore[method-assign]
        return_value={
            "data": {
                "properties": [
                    {
                        "electricityMeterPoints": [
                            {
                                "mpan": "1234567890",
                                "agreements": [
                                    {
                                        "id": "elec",
                                        "validFrom": _LAST_YEAR,
                                        "validTo": "",
                                        "tariff": {
                                            "__typename": "StandardTariff",
                                            "displayName": "Next Flex",
                                            "tariffCode": "ELEC-01",
                                            "unitRate": "24.50",
                                            "standingCharge": "53.35",
                                        },
                                    },
                                ],
                            }
                        ],
                        "gasMeterPoints": [
                            {
                                "mprn": "9876543210",
                                "agreements": [
                                    {
                                        "id": "gas",
                                        "validFrom": _LAST_YEAR,
                                        "validTo": "",
                                        "tariff": {
                                            "__typename": "GasTariffType",
                                            "displayName": "Next Flex Gas",
                                            "tariffCode": "GAS-01",
                                            "unitRate": "6.20",
                                            "standingCharge": "31.41",
                                        },
                                    },
                                ],
                            }
                        ],
                    }
                ]
            }
        }
    )

    result = await api.async_get_tariff_data("A-123")

    assert result is not None
    assert "1234567890" in result
    assert result["1234567890"]["tariff_name"] == "Next Flex"
    assert result["1234567890"]["unit_rate"] == "24.50"
    assert "9876543210" in result
    assert result["9876543210"]["tariff_name"] == "Next Flex Gas"
    assert result["9876543210"]["unit_rate"] == "6.20"


@pytest.mark.asyncio
async def test_async_get_tariff_data_returns_none_for_empty_account() -> None:
    api = EonNext()
    result = await api.async_get_tariff_data("")
    assert result is None


@pytest.mark.asyncio
async def test_async_get_tariff_data_returns_none_when_no_properties() -> None:
    api = EonNext()
    api._graphql_post = AsyncMock(  # type: ignore[method-assign]
        return_value={"data": {"other": []}}
    )
    result = await api.async_get_tariff_data("A-123")
    assert result is None


@pytest.mark.asyncio
async def test_async_get_tariff_data_returns_none_when_no_active_agreements() -> None:
    api = EonNext()
    api._graphql_post = AsyncMock(  # type: ignore[method-assign]
        return_value={
            "data": {
                "properties": [
                    {
                        "electricityMeterPoints": [
                            {
                                "mpan": "1234567890",
                                "agreements": [
                                    {
                                        "id": "expired",
                                        "validFrom": _TWO_YEARS_AGO,
                                        "validTo": _LAST_YEAR,
                                        "tariff": {
                                            "__typename": "StandardTariff",
                                            "displayName": "Old",
                                            "tariffCode": "OLD-01",
                                            "unitRate": "30.00",
                                            "standingCharge": "50.00",
                                        },
                                    },
                                ],
                            }
                        ],
                        "gasMeterPoints": [],
                    }
                ]
            }
        }
    )
    result = await api.async_get_tariff_data("A-123")
    assert result is None
