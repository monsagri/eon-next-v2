"""Known tariff rate structure registry for off-peak detection fallback."""

from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import time

_LOGGER = logging.getLogger(__name__)


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


def _segments_contain(haystack: list[str], needle: list[str]) -> bool:
    """Return True when *needle* appears as a run of consecutive segments."""
    length = len(needle)
    if length == 0:
        return False
    for i in range(len(haystack) - length + 1):
        if haystack[i : i + length] == needle:
            return True
    return False


def get_tariff_pattern(tariff_code: str | None) -> TariffPattern | None:
    """Match a tariff code to a known pattern, or None for unknown/flat-rate.

    Tariff codes are hyphen-delimited (e.g. ``E-1R-NEXT-DRIVE-...``).  The
    product prefix is matched against whole code segments rather than as a
    free substring, so an unrelated code that merely contains the prefix text
    (``NEXTDRIVER``) is not misclassified.  A future variant that shares the
    exact product segments (``NEXT-DRIVE-V2``) still matches; the debug log
    records which pattern was applied so unexpected inheritance is visible.
    """
    if not tariff_code:
        return None
    code_segments = tariff_code.upper().split("-")
    for pattern in KNOWN_TARIFF_PATTERNS:
        prefix_segments = pattern.product_prefix.upper().split("-")
        if _segments_contain(code_segments, prefix_segments):
            _LOGGER.debug(
                "Tariff code %s matched known pattern %s",
                tariff_code,
                pattern.product_prefix,
            )
            return pattern
    return None
