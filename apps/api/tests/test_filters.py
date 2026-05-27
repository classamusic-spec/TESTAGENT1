from __future__ import annotations

from src.data.ohlcv import Candle
from src.signals.filters import (
    FilterConfig,
    apply_filters,
    default_filters,
    trend_filter,
    volatility_filter,
)

STEP = 3_600_000


def _candles(rows: list[tuple[float, float, float]]) -> list[Candle]:
    # rows: (high, low, close)
    return [
        Candle(open_time=i * STEP, open=c, high=h, low=l, close=c, volume=1.0, closed=True)
        for i, (h, l, c) in enumerate(rows)
    ]


def _trend(n: int) -> list[Candle]:
    return _candles([(100 * 1.01**i * 1.002, 100 * 1.01**i * 0.999, 100 * 1.01**i) for i in range(n)])


def _flat(n: int) -> list[Candle]:
    return _candles([(100.0, 100.0, 100.0) for _ in range(n)])


def test_flat_signal_passes_through() -> None:
    side, vetoes = apply_filters("flat", _trend(40), default_filters())
    assert side == "flat" and vetoes == []


def test_dead_market_vetoes_on_volatility() -> None:
    f = volatility_filter(FilterConfig(min_atr_pct=0.002))
    passes, reason = f(_flat(40))
    assert passes is False and reason == "volatility too low"


def test_trend_filter_passes_in_trend_vetoes_in_chop() -> None:
    cfg = FilterConfig(min_adx=15.0)
    assert trend_filter(cfg)(_trend(40))[0] is True
    assert trend_filter(cfg)(_flat(40))[0] is False


def test_apply_filters_collapses_to_flat_on_veto() -> None:
    side, vetoes = apply_filters("long", _flat(40), default_filters())
    assert side == "flat" and len(vetoes) >= 1


def test_apply_filters_keeps_good_signal() -> None:
    # A clean trend with moderate volatility should survive the chain.
    cfg = FilterConfig(min_atr_pct=0.0, max_atr_pct=1.0, min_adx=5.0, block_high_vol_regime=False)
    side, vetoes = apply_filters("long", _trend(40), default_filters(cfg))
    assert side == "long" and vetoes == []
