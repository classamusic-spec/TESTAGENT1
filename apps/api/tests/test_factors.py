from __future__ import annotations

from src.data.ohlcv import Candle
from src.signals.factors import FactorConfig, combined_pup, momentum, zscore

STEP = 3_600_000


def _candles(closes: list[float]) -> list[Candle]:
    return [
        Candle(open_time=i * STEP, open=c, high=c, low=c, close=c, volume=1.0, closed=True)
        for i, c in enumerate(closes)
    ]


def test_momentum_and_zscore() -> None:
    closes = [100.0, 101.0, 102.0, 103.0, 104.0]
    assert momentum(closes, 4) > 0
    assert zscore(closes, 5) > 0  # last value above the window mean


def test_momentum_raises_pup() -> None:
    up = _candles([100 + i for i in range(20)])
    cfg = FactorConfig(kronos_weight=0.0, momentum_weight=1.0, reversion_weight=0.0)
    assert combined_pup(up, kronos_pup=0.5, config=cfg) > 0.5


def test_overbought_zscore_lowers_pup() -> None:
    # Flat then a sharp spike -> high z-score -> mean-reversion pulls p_up down.
    spike = _candles([100.0] * 15 + [130.0])
    cfg = FactorConfig(kronos_weight=0.0, momentum_weight=0.0, reversion_weight=1.0)
    assert combined_pup(spike, kronos_pup=0.5, config=cfg) < 0.5


def test_kronos_weight_dominates_when_others_zero() -> None:
    flat = _candles([100.0] * 20)
    cfg = FactorConfig(kronos_weight=1.0, momentum_weight=0.0, reversion_weight=0.0)
    assert combined_pup(flat, kronos_pup=0.9, config=cfg) > 0.7
    assert combined_pup(flat, kronos_pup=0.1, config=cfg) < 0.3


def test_result_always_a_probability() -> None:
    candles = _candles([100 + (i % 5) for i in range(30)])
    for kp in (0.0, 0.5, 1.0):
        p = combined_pup(candles, kronos_pup=kp)
        assert 0.0 <= p <= 1.0
