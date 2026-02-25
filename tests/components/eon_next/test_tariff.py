"""Unit tests for tariff agreement fetching and sensor entities."""

from __future__ import annotations

from typing import Any
from unittest.mock import AsyncMock

import pytest

from custom_components.eon_next.eonnext import EonNext


class TestFindActiveAgreement:
    """Tests for EonNext._find_active_agreement static method."""

    def test_returns_none_for_empty_list(self) -> None:
        assert EonNext._find_active_agreement([], "2026-02-25") is None

    def test_returns_none_for_non_list(self) -> None:
        assert EonNext._find_active_agreement("bad", "2026-02-25") is None  # type: ignore[arg-type]

    def test_selects_active_standard_tariff(self) -> None:
        agreements = [
            {
                "id": "old",
                "validFrom": "2024-01-01",
                "validTo": "2024-12-31",
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
                "validFrom": "2025-01-01",
                "validTo": "2027-01-01",
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
        result = EonNext._find_active_agreement(agreements, "2026-02-25")

        assert result is not None
        assert result["tariff_name"] == "Next Flex"
        assert result["tariff_code"] == "E-1R-NEXT-FLEX-01"
        assert result["tariff_type"] == "StandardTariff"
        assert result["unit_rate"] == "22.36"
        assert result["standing_charge"] == "53.35"
        assert result["valid_from"] == "2025-01-01"
        assert result["valid_to"] == "2027-01-01"

    def test_skips_future_agreement(self) -> None:
        agreements = [
            {
                "id": "future",
                "validFrom": "2027-01-01",
                "validTo": "2028-01-01",
                "tariff": {
                    "__typename": "StandardTariff",
                    "displayName": "Future Tariff",
                    "tariffCode": "FUTURE-01",
                    "unitRate": "20.00",
                    "standingCharge": "50.00",
                },
            },
        ]
        assert EonNext._find_active_agreement(agreements, "2026-02-25") is None

    def test_skips_expired_agreement(self) -> None:
        agreements = [
            {
                "id": "expired",
                "validFrom": "2023-01-01",
                "validTo": "2024-01-01",
                "tariff": {
                    "__typename": "StandardTariff",
                    "displayName": "Expired Tariff",
                    "tariffCode": "EXP-01",
                    "unitRate": "30.00",
                    "standingCharge": "45.00",
                },
            },
        ]
        assert EonNext._find_active_agreement(agreements, "2026-02-25") is None

    def test_open_ended_agreement(self) -> None:
        """Agreement with empty validTo should be considered active."""
        agreements = [
            {
                "id": "open",
                "validFrom": "2025-01-01",
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
        result = EonNext._find_active_agreement(agreements, "2026-02-25")
        assert result is not None
        assert result["tariff_name"] == "Open Ended"

    def test_null_valid_to_agreement(self) -> None:
        """Agreement with null validTo should be considered active."""
        agreements = [
            {
                "id": "null-end",
                "validFrom": "2025-01-01",
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
        result = EonNext._find_active_agreement(agreements, "2026-02-25")
        assert result is not None
        assert result["tariff_name"] == "No End Date"

    def test_half_hourly_tariff_averages_unit_rates(self) -> None:
        """HalfHourlyTariff should average the unitRates list."""
        agreements = [
            {
                "id": "hh",
                "validFrom": "2025-01-01",
                "validTo": "2027-01-01",
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
        result = EonNext._find_active_agreement(agreements, "2026-02-25")
        assert result is not None
        assert result["tariff_name"] == "Next Solar Max"
        assert result["unit_rate"] == pytest.approx(20.0)

    def test_uses_fullname_when_displayname_absent(self) -> None:
        agreements = [
            {
                "id": "no-display",
                "validFrom": "2025-01-01",
                "validTo": "2027-01-01",
                "tariff": {
                    "__typename": "StandardTariff",
                    "fullName": "Full Name Only",
                    "tariffCode": "FN-01",
                    "unitRate": "22.00",
                    "standingCharge": "50.00",
                },
            },
        ]
        result = EonNext._find_active_agreement(agreements, "2026-02-25")
        assert result is not None
        assert result["tariff_name"] == "Full Name Only"

    def test_skips_non_dict_agreements(self) -> None:
        agreements: list[Any] = ["bad", None, 123]
        assert EonNext._find_active_agreement(agreements, "2026-02-25") is None

    def test_skips_agreement_with_non_dict_tariff(self) -> None:
        agreements = [
            {
                "id": "bad-tariff",
                "validFrom": "2025-01-01",
                "validTo": "2027-01-01",
                "tariff": "not-a-dict",
            },
        ]
        assert EonNext._find_active_agreement(agreements, "2026-02-25") is None


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
                                        "validFrom": "2025-01-01",
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
                                        "validFrom": "2025-01-01",
                                        "validTo": "",
                                        "tariff": {
                                            "__typename": "StandardTariff",
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
                                        "validFrom": "2020-01-01",
                                        "validTo": "2021-01-01",
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
