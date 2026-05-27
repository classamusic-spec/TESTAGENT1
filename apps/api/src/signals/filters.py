"""Composable signal filters (freqtrade/Jesse-style vetoes).

A clean entry rule (the Kronos p_up threshold) is gated by a chain of boolean
filters; if any vetoes, the signal collapses to flat. Filters are deterministic
functions of closed candles only — they remove low-quality setups, they never
size or place trades, and they never change risk limits (invariant 3).
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Callable, Sequence

from src.data.ohlcv import Candle
from src.signals.features import compute_features
from src.signals.policy import SignalSide
from src.signals.regime import Regime, classify_regime

# A filter returns (passes, veto_reason). veto_reason is None when it passes.
SignalFilter = Callable[[Sequence[Candle]], tuple[bool, str | None]]


@dataclass(frozen=True)
class FilterConfig:
    min_atr_pct: float = 0.002  # skip dead/illiquid tape
    max_atr_pct: float = 0.08  # skip chaotic, news-driven volatility
    min_adx: float = 15.0  # require some trend strength
    block_high_vol_regime: bool = True


def volatility_filter(config: FilterConfig) -> SignalFilter:
    def f(candles: Sequence[Candle]) -> tuple[bool, str | None]:
        atr = compute_features(candles)["atr_pct"]
        if atr < config.min_atr_pct:
            return False, "volatility too low"
        if atr > config.max_atr_pct:
            return False, "volatility too high"
        return True, None

    return f


def trend_filter(config: FilterConfig) -> SignalFilter:
    def f(candles: Sequence[Candle]) -> tuple[bool, str | None]:
        adx = compute_features(candles)["adx"]
        return (True, None) if adx >= config.min_adx else (False, "weak trend")

    return f


def regime_filter(config: FilterConfig) -> SignalFilter:
    def f(candles: Sequence[Candle]) -> tuple[bool, str | None]:
        if config.block_high_vol_regime and classify_regime(candles) == Regime.HIGH_VOL:
            return False, "high-volatility regime"
        return True, None

    return f


def default_filters(config: FilterConfig | None = None) -> list[SignalFilter]:
    cfg = config or FilterConfig()
    return [volatility_filter(cfg), trend_filter(cfg), regime_filter(cfg)]


def apply_filters(
    side: SignalSide, candles: Sequence[Candle], filters: list[SignalFilter]
) -> tuple[SignalSide, list[str]]:
    """Gate a signal through the filter chain. A veto collapses it to flat."""
    if side == "flat":
        return "flat", []
    vetoes: list[str] = []
    for f in filters:
        passes, reason = f(candles)
        if not passes and reason is not None:
            vetoes.append(reason)
    return ("flat", vetoes) if vetoes else (side, [])
