from __future__ import annotations

import pytest

from src.data.ohlcv import Candle
from src.signals.labels import BarrierConfig, label_at, triple_barrier_labels

STEP = 3_600_000


def _c(o: float, h: float, low: float, close: float, i: int) -> Candle:
    return Candle(open_time=i * STEP, open=o, high=h, low=low, close=close, volume=1.0, closed=True)


def _flat(price: float, n: int) -> list[Candle]:
    return [_c(price, price, price, price, i) for i in range(n)]


def test_upper_barrier_labels_up() -> None:
    candles = _flat(100.0, 5)
    # A future bar spikes above the upper barrier.
    candles += [_c(100, 130, 99, 128, 5), _c(128, 128, 128, 128, 6)]
    cfg = BarrierConfig(horizon=3, unit="pct", pct=0.05, upper_mult=2.0, lower_mult=2.0)
    assert label_at(candles, 4, cfg) == 1


def test_lower_barrier_labels_down() -> None:
    candles = _flat(100.0, 5)
    candles += [_c(100, 101, 70, 72, 5), _c(72, 72, 72, 72, 6)]
    cfg = BarrierConfig(horizon=3, unit="pct", pct=0.05)
    assert label_at(candles, 4, cfg) == -1


def test_timeout_labels_zero() -> None:
    candles = _flat(100.0, 12)  # never moves
    cfg = BarrierConfig(horizon=5, unit="pct", pct=0.05)
    assert label_at(candles, 0, cfg) == 0


def test_insufficient_future_is_none() -> None:
    candles = _flat(100.0, 6)
    cfg = BarrierConfig(horizon=5, unit="pct", pct=0.05)
    labels = triple_barrier_labels(candles, cfg)
    assert labels[-1] is None  # no full horizon ahead
    assert labels[0] == 0


def test_uptrend_mostly_up() -> None:
    rising = [_c(100 * 1.01**i, 100 * 1.01**i * 1.005, 100 * 1.01**i * 0.997, 100 * 1.01**i, i) for i in range(60)]
    labels = [l for l in triple_barrier_labels(rising, BarrierConfig(horizon=8, unit="pct", pct=0.01)) if l is not None]
    assert sum(1 for l in labels if l == 1) > sum(1 for l in labels if l == -1)


def test_invalid_config() -> None:
    with pytest.raises(ValueError):
        BarrierConfig(horizon=0)
