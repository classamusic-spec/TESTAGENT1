"""Triple-barrier labeling for training the forecaster (Lopez de Prado).

For each decision bar we set an upper barrier (take-profit), a lower barrier
(stop), and a vertical barrier (max horizon). The label is which barrier the
price touches first: +1 up, -1 down, 0 timeout. Aligning the label with the
barriers the executor actually uses (ATR/% stops) trains the model on the
outcome it is graded on.

Labels are forward-looking by construction — they are TRAINING TARGETS only and
must never be fed back in as features (that would be look-ahead, invariant 1).
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal, Sequence

from src.data.ohlcv import Candle
from src.risk.atr import average_true_range

BarrierUnit = Literal["atr", "pct"]


@dataclass(frozen=True)
class BarrierConfig:
    horizon: int = 12  # vertical barrier: max bars to first touch
    upper_mult: float = 2.0  # take-profit distance in `unit`s
    lower_mult: float = 2.0  # stop distance in `unit`s
    unit: BarrierUnit = "atr"
    atr_lookback: int = 14
    pct: float = 0.02  # base distance when unit == "pct"

    def __post_init__(self) -> None:
        if self.horizon < 1:
            raise ValueError("horizon must be >= 1")
        if self.upper_mult <= 0 or self.lower_mult <= 0:
            raise ValueError("barrier multipliers must be > 0")
        if self.unit == "pct" and not 0.0 < self.pct < 1.0:
            raise ValueError("pct must be in (0, 1)")


def _unit_distance(candles: Sequence[Candle], i: int, config: BarrierConfig) -> float:
    if config.unit == "atr":
        return average_true_range(candles[: i + 1], config.atr_lookback)
    return candles[i].close * config.pct


def label_at(candles: Sequence[Candle], i: int, config: BarrierConfig) -> int | None:
    """Label for entry at bar i, or None if the full horizon isn't available.

    +1 upper hit first, -1 lower hit first, 0 vertical-barrier timeout. If both
    barriers are touched in the same bar the outcome is ambiguous -> 0.
    """
    full_window = i + config.horizon < len(candles)
    entry = candles[i].close
    dist = _unit_distance(candles, i, config)
    if dist <= 0:
        return 0 if full_window else None
    upper = entry + config.upper_mult * dist
    lower = entry - config.lower_mult * dist
    end = min(i + config.horizon, len(candles) - 1)
    for j in range(i + 1, end + 1):
        hit_up = candles[j].high >= upper
        hit_dn = candles[j].low <= lower
        if hit_up and hit_dn:
            return 0  # ambiguous intrabar path
        if hit_up:
            return 1
        if hit_dn:
            return -1
    # No barrier touched: a timeout only if the full horizon has elapsed,
    # otherwise we lack the future bars to confirm the label.
    return 0 if full_window else None


def triple_barrier_labels(candles: Sequence[Candle], config: BarrierConfig | None = None) -> list[int | None]:
    cfg = config or BarrierConfig()
    return [label_at(candles, i, cfg) for i in range(len(candles))]
