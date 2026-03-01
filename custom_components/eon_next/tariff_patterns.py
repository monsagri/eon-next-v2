"""Known tariff rate structure registry for off-peak detection fallback."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import time


@dataclass(slots=True)
class TariffRateWindow:
    """A named rate period within a tariff."""

    name: str  # "off_peak", "peak", "super_off_peak"
    start_time: time  # Local time start (inclusive)
    end_time: time  # Local time end (exclusive)


@dataclass(slots=True)
class TariffPattern:
    """Known rate structure for a tariff product."""

    product_prefix: str  # e.g. "NEXT-DRIVE"
    windows: list[TariffRateWindow]


KNOWN_TARIFF_PATTERNS: list[TariffPattern] = [
    TariffPattern(
        product_prefix="NEXT-DRIVE",
        windows=[
            TariffRateWindow("off_peak", time(0, 0), time(7, 0)),
        ],
    ),
    TariffPattern(
        product_prefix="NEXT-PUMPED",
        windows=[
            TariffRateWindow("off_peak", time(0, 0), time(7, 0)),
            TariffRateWindow("off_peak", time(13, 0), time(16, 0)),
        ],
    ),
]


def get_tariff_pattern(tariff_code: str | None) -> TariffPattern | None:
    """Match a tariff code to a known pattern, or None for unknown/flat-rate.

    Performs a case-insensitive substring match of each pattern's
    ``product_prefix`` against the supplied tariff code.
    """
    if not tariff_code:
        return None
    code_upper = tariff_code.upper()
    for pattern in KNOWN_TARIFF_PATTERNS:
        if pattern.product_prefix.upper() in code_upper:
            return pattern
    return None
