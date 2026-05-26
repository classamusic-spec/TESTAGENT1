"""Deterministic market-regime classifier for checkpoint selection.

Explicitly allowed by project policy: a regime classifier may *select* between
multiple human-approved, paper-validated checkpoints. It never trains a model,
rewrites trading logic, or changes risk limits — it only reads recent price
action and returns a label that maps to a pre-approved checkpoint version.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from typing import Mapping, Sequence

from src.data.ohlcv import Candle
from src.signals.sizing import realized_vol


class Regime(str, Enum):
    TREND_UP = "trend_up"
    TREND_DOWN = "trend_down"
    RANGE = "range"
    HIGH_VOL = "high_vol"


@dataclass(frozen=True)
class RegimeConfig:
    lookback: int = 48
    trend_threshold: float = 0.03  # |drift| over the window to count as a trend
    high_vol_threshold: float = 0.03  # per-bar realized vol above this => turbulent

    def __post_init__(self) -> None:
        if self.lookback < 2:
            raise ValueError("lookback must be >= 2")
        if self.trend_threshold < 0 or self.high_vol_threshold <= 0:
            raise ValueError("thresholds must be non-negative / positive")


def classify_regime(candles: Sequence[Candle], config: RegimeConfig | None = None) -> Regime:
    cfg = config or RegimeConfig()
    closes = [c.close for c in candles]
    if len(closes) < 2:
        return Regime.RANGE

    if realized_vol(candles, cfg.lookback) >= cfg.high_vol_threshold:
        return Regime.HIGH_VOL

    ref = closes[-(cfg.lookback + 1)] if len(closes) > cfg.lookback else closes[0]
    drift = closes[-1] / ref - 1.0
    if drift >= cfg.trend_threshold:
        return Regime.TREND_UP
    if drift <= -cfg.trend_threshold:
        return Regime.TREND_DOWN
    return Regime.RANGE


def select_checkpoint(regime: Regime, mapping: Mapping[Regime, str], default: str) -> str:
    """Pick a checkpoint version for the regime, falling back to `default`."""
    return mapping.get(regime, default)
