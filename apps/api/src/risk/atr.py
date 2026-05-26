"""Average True Range (ATR) and volatility-scaled stop levels.

ATR adapts the stop distance to recent volatility: wide stops in turbulent
markets, tight stops in calm ones. Like all stop logic this is deterministic and
human-parameterized (the multiplier is config, not learned).
"""

from __future__ import annotations

from typing import Sequence

from src.data.ohlcv import Candle


def average_true_range(candles: Sequence[Candle], lookback: int = 14) -> float:
    """Mean true range over the last `lookback` bars.

    True range = max(high-low, |high-prev_close|, |low-prev_close|).
    """
    if lookback < 1:
        raise ValueError("lookback must be >= 1")
    if len(candles) < 2:
        return 0.0
    true_ranges: list[float] = []
    for i in range(1, len(candles)):
        high, low, prev_close = candles[i].high, candles[i].low, candles[i - 1].close
        true_ranges.append(max(high - low, abs(high - prev_close), abs(low - prev_close)))
    window = true_ranges[-lookback:]
    return sum(window) / len(window) if window else 0.0


def atr_stop_price(side: int, reference: float, atr: float, mult: float) -> float:
    """Stop price `mult` ATRs away from `reference` (entry or trailing high/low)."""
    distance = mult * atr
    return reference - distance if side > 0 else reference + distance
