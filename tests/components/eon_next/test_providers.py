"""Tests for the provider-descriptor seam (Phase 1 of multi-provider work)."""

from __future__ import annotations

from datetime import time

import pytest

from custom_components.eon_next.const import (
    API_BASE_URL,
    GAS_CALORIC_VALUE,
    GAS_VOLUME_CORRECTION,
)
from custom_components.eon_next.eonnext import EonNext, KrakenClient
from custom_components.eon_next.providers import (
    DEFAULT_PROVIDER_ID,
    EON_NEXT,
    OCTOPUS,
    PROVIDERS,
    ProviderDescriptor,
    get_provider,
)
from custom_components.eon_next.tariff_patterns import (
    TariffPattern,
    TariffRateWindow,
    get_tariff_pattern,
)


def test_eon_next_descriptor_matches_legacy_constants() -> None:
    """The E.ON descriptor carries the values that used to be bare constants."""
    assert EON_NEXT.id == "eon_next"
    assert EON_NEXT.display_name == "E.ON Next"
    assert EON_NEXT.platform == "kraken"
    assert EON_NEXT.base_url == API_BASE_URL
    assert EON_NEXT.currency == "GBP"
    assert EON_NEXT.minor_unit_scale == 100
    assert EON_NEXT.gas_calorific_value == GAS_CALORIC_VALUE
    assert EON_NEXT.gas_volume_correction == GAS_VOLUME_CORRECTION


def test_get_provider_defaults_to_eon_next() -> None:
    assert get_provider() is EON_NEXT
    assert get_provider(None) is EON_NEXT
    assert get_provider(DEFAULT_PROVIDER_ID) is EON_NEXT
    assert PROVIDERS[DEFAULT_PROVIDER_ID] is EON_NEXT


def test_get_provider_rejects_unknown_id() -> None:
    with pytest.raises(ValueError, match="Unknown energy provider"):
        get_provider("british_gas")


def test_octopus_provider_is_registered() -> None:
    """Octopus is a second Kraken tenant: different base URL, same UK market."""
    octopus = get_provider("octopus")
    assert octopus is OCTOPUS
    assert octopus.display_name == "Octopus Energy"
    assert octopus.base_url == "https://api.octopus.energy/v1"
    assert octopus.platform == "kraken"
    # UK market defaults are shared with E.ON.
    assert octopus.currency == "GBP"
    assert octopus.gas_calorific_value == EON_NEXT.gas_calorific_value
    # But it carries its own tariff patterns, not E.ON's.
    assert octopus.tariff_patterns is not EON_NEXT.tariff_patterns


def test_octopus_tariff_patterns_match_octopus_products() -> None:
    """Octopus Go / Intelligent codes resolve against Octopus's patterns."""
    patterns = get_provider("octopus").tariff_patterns
    assert get_tariff_pattern("E-1R-GO-VAR-22-10-14-A", patterns) is not None
    assert get_tariff_pattern("E-1R-INTELLI-VAR-22-10-14-A", patterns) is not None
    # E.ON's products do not match Octopus's set.
    assert get_tariff_pattern("E-1R-NEXT-DRIVE-A", patterns) is None


def test_eonnext_shim_is_a_kraken_client_pinned_to_eon() -> None:
    """EonNext() keeps working and resolves to the E.ON descriptor."""
    api = EonNext()
    assert isinstance(api, KrakenClient)
    assert api.provider is EON_NEXT


def test_kraken_client_uses_the_given_provider_base_url() -> None:
    """A different descriptor changes the base URL the client would call."""
    other = ProviderDescriptor(
        id="example",
        display_name="Example Energy",
        base_url="https://api.example-kraken.energy/v1",
    )
    api = KrakenClient(other)
    assert api.provider is other
    assert api.provider.base_url == "https://api.example-kraken.energy/v1"


def test_get_tariff_pattern_defaults_to_eon_patterns() -> None:
    """Existing (unparameterised) calls still resolve E.ON products."""
    assert get_tariff_pattern("E-1R-NEXT-DRIVE-JAN-2024-A-C") is not None
    assert get_tariff_pattern("E-1R-SOME-FLAT-TARIFF-A") is None


def test_get_tariff_pattern_honours_supplied_patterns() -> None:
    """A provider can supply its own pattern set."""
    custom = [
        TariffPattern(
            product_prefix="GO",
            windows=[TariffRateWindow("off_peak", time(0, 30), time(5, 30))],
        )
    ]
    matched = get_tariff_pattern("E-1R-GO-2024-A-C", patterns=custom)
    assert matched is not None
    assert matched.product_prefix == "GO"
    # E.ON's own product is not in the supplied set, so it no longer matches.
    assert get_tariff_pattern("E-1R-NEXT-DRIVE-A", patterns=custom) is None
