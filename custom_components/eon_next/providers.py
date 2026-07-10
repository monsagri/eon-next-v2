"""Energy-provider descriptors.

This integration is a client for the **Kraken** platform, which powers E.ON
Next, Octopus Energy and many other suppliers behind an *identical* GraphQL +
REST API. A :class:`ProviderDescriptor` captures the handful of values that
actually differ between those suppliers - primarily the API base URL and
branding - so the client and its supporting logic can stay provider-neutral.

Only E.ON Next is registered today; the descriptor + registry are the seam a
future provider is added through (a base URL, branding and, where the API
schedule omits them, off-peak tariff patterns). See
``planning/provider_generalization.md`` for the wider design.
"""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass, field
from datetime import time

from .const import API_BASE_URL, GAS_CALORIC_VALUE, GAS_VOLUME_CORRECTION
from .tariff_patterns import KNOWN_TARIFF_PATTERNS, TariffPattern, TariffRateWindow


@dataclass(frozen=True, slots=True)
class ProviderDescriptor:
    """Declarative description of a single energy provider.

    Defaults describe a UK Kraken supplier (the market E.ON Next operates in);
    a non-UK or non-Kraken provider overrides the fields that differ.
    """

    id: str
    display_name: str
    base_url: str
    platform: str = "kraken"
    # Currency the API reports values in, and the scale from its minor unit to
    # the major unit (UK Kraken returns pence; 100 pence = GBP 1).
    currency: str = "GBP"
    minor_unit_scale: int = 100
    # Inputs for the gas volume (m3) -> energy (kWh) conversion.
    gas_calorific_value: float = GAS_CALORIC_VALUE
    gas_volume_correction: float = GAS_VOLUME_CORRECTION
    # Supply-point identifier field names on the Kraken meter-point objects.
    electricity_supply_point_field: str = "mpan"
    gas_supply_point_field: str = "mprn"
    # Product-code patterns used to recover off-peak windows when the API
    # tariff schedule omits them (see ``tariff_patterns.py``).
    tariff_patterns: Sequence[TariffPattern] = field(
        default_factory=lambda: tuple(KNOWN_TARIFF_PATTERNS)
    )


EON_NEXT = ProviderDescriptor(
    id="eon_next",
    display_name="E.ON Next",
    base_url=API_BASE_URL,
)


# Off-peak windows for Octopus's fixed-window smart tariffs, used only as a
# fallback when the API tariff schedule omits time windows. Dynamic tariffs
# (Agile, Flux) and the multi-rate Cosy tariff carry full half-hourly schedules
# from the API, so they need no pattern here.
_OCTOPUS_TARIFF_PATTERNS: tuple[TariffPattern, ...] = (
    # Octopus Go: cheap 00:30-05:30.
    TariffPattern(
        product_prefix="GO",
        windows=[TariffRateWindow("off_peak", time(0, 30), time(5, 30))],
    ),
    # Intelligent Octopus Go: cheap 23:30-05:30 (wraps midnight).
    TariffPattern(
        product_prefix="INTELLI",
        windows=[TariffRateWindow("off_peak", time(23, 30), time(5, 30))],
    ),
)


OCTOPUS = ProviderDescriptor(
    id="octopus",
    display_name="Octopus Energy",
    base_url="https://api.octopus.energy/v1",
    tariff_patterns=_OCTOPUS_TARIFF_PATTERNS,
)


PROVIDERS: dict[str, ProviderDescriptor] = {
    EON_NEXT.id: EON_NEXT,
    OCTOPUS.id: OCTOPUS,
}

DEFAULT_PROVIDER_ID = EON_NEXT.id


def get_provider(provider_id: str | None = None) -> ProviderDescriptor:
    """Return the descriptor for *provider_id*, defaulting to E.ON Next.

    Raises ``ValueError`` for an unknown, non-empty id.
    """
    if not provider_id:
        return PROVIDERS[DEFAULT_PROVIDER_ID]
    try:
        return PROVIDERS[provider_id]
    except KeyError:
        raise ValueError(f"Unknown energy provider: {provider_id!r}") from None
