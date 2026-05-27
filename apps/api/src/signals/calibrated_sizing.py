"""Calibration-gated position sizing.

Scales the Kelly/vol-targeted size by how *reliable* the model has been at the
predicted confidence. If a probability bin is well-calibrated (predicted ≈
realized) we trust it fully; if it's miscalibrated we shrink the position toward
flat. This ties size to measured reliability — it only ever reduces exposure, so
it cannot widen risk limits (invariant 3).
"""

from __future__ import annotations

from typing import Sequence

from src.data.ohlcv import Candle
from src.improve.calibration import CalibrationReport
from src.signals.sizing import SizingConfig, position_fraction


def reliability_factor(p_up: float, report: CalibrationReport, floor: float = 0.2) -> float:
    """A multiplier in [floor, 1] from the calibration error of p_up's bin.

    factor = 1 - |predicted - empirical| in the matching bin (clamped to floor).
    Bins with too few samples get the floor (we don't trust thin evidence).
    """
    for b in report.bins:
        if b.lower <= p_up < b.upper or (p_up >= 1.0 and b.upper >= 1.0):
            if b.count < 10:
                return floor
            gap = abs(b.predicted_mean - b.empirical_rate)
            return max(floor, 1.0 - gap)
    return floor  # no bin observed this confidence yet


def calibrated_position_fraction(
    p_up: float,
    candles: Sequence[Candle],
    report: CalibrationReport,
    config: SizingConfig | None = None,
    floor: float = 0.2,
) -> float:
    """Vol/Kelly sizing scaled by the model's calibration reliability at p_up."""
    base = position_fraction(p_up, candles, config)
    return base * reliability_factor(p_up, report, floor)
