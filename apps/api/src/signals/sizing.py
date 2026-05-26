"""Confidence- and volatility-aware position sizing (Kelly-capped, vol-targeted).

Sizing only ever scales the human-set position cap DOWN: `position_fraction`
returns a value in [-max_fraction, max_fraction] with max_fraction <= 1, so the
absolute notional an executor derives (fraction * RiskLimits.max_position_size)
can never exceed the human-set cap (invariant 3). It cannot widen limits or
trading authority; it only chooses how much of the allowed size to use.
"""

from __future__ import annotations

import statistics
from dataclasses import dataclass
from typing import Sequence

from src.data.ohlcv import Candle


@dataclass(frozen=True)
class SizingConfig:
    target_vol: float = 0.02  # desired per-bar return volatility of the position
    kelly_fraction: float = 0.5  # fraction of full Kelly (half-Kelly by default)
    max_fraction: float = 1.0  # hard cap as a fraction of the human-set max size
    vol_lookback: int = 24
    min_vol: float = 1e-4  # floor so a quiet window can't imply explosive leverage

    def __post_init__(self) -> None:
        if not 0.0 < self.kelly_fraction <= 1.0:
            raise ValueError("kelly_fraction must be in (0, 1]")
        if not 0.0 < self.max_fraction <= 1.0:
            raise ValueError("max_fraction must be in (0, 1]")
        if self.target_vol <= 0.0 or self.min_vol <= 0.0:
            raise ValueError("target_vol and min_vol must be > 0")
        if self.vol_lookback < 2:
            raise ValueError("vol_lookback must be >= 2")


def realized_vol(candles: Sequence[Candle], lookback: int) -> float:
    """Standard deviation of the last `lookback` close-to-close returns."""
    closes = [c.close for c in candles]
    if len(closes) < 3:
        return 0.0
    window = closes[-(lookback + 1) :]
    returns = [window[i] / window[i - 1] - 1.0 for i in range(1, len(window))]
    if len(returns) < 2:
        return 0.0
    return statistics.pstdev(returns)


def kelly_fraction_signed(p_up: float) -> float:
    """Full-Kelly fraction for a symmetric binary bet: f* = 2p - 1, in [-1, 1].

    Positive => long, negative => short, zero at p_up = 0.5 (no edge, no bet).
    """
    if not 0.0 <= p_up <= 1.0:
        raise ValueError(f"p_up must be in [0, 1], got {p_up}")
    return 2.0 * p_up - 1.0


def position_fraction(
    p_up: float, candles: Sequence[Candle], config: SizingConfig | None = None
) -> float:
    """Signed position as a fraction of the human-set max size, in [-max, max].

    Combines a Kelly-capped confidence term (bigger edge -> bigger size) with a
    volatility-targeting overlay (quieter market -> scale up, turbulent -> scale
    down), then clamps to the hard cap.
    """
    cfg = config or SizingConfig()
    kelly = kelly_fraction_signed(p_up) * cfg.kelly_fraction
    vol = max(cfg.min_vol, realized_vol(candles, cfg.vol_lookback))
    vol_scale = cfg.target_vol / vol
    raw = kelly * vol_scale
    return max(-cfg.max_fraction, min(cfg.max_fraction, raw))
