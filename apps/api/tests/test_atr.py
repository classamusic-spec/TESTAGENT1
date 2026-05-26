from __future__ import annotations

import pytest

from src.data.ohlcv import Candle
from src.risk.atr import atr_stop_price, average_true_range

STEP = 3_600_000


def _candle(o: float, h: float, low: float, c: float, i: int) -> Candle:
    return Candle(open_time=i * STEP, open=o, high=h, low=low, close=c, volume=1.0, closed=True)


def test_atr_zero_for_flat_market() -> None:
    flat = [_candle(100, 100, 100, 100, i) for i in range(20)]
    assert average_true_range(flat, 14) == 0.0


def test_atr_equals_constant_range() -> None:
    # Each bar spans exactly 4 (high-low) with no gaps -> ATR == 4.
    candles = [_candle(100, 102, 98, 100, i) for i in range(20)]
    assert average_true_range(candles, 14) == pytest.approx(4.0)


def test_atr_accounts_for_gaps() -> None:
    calm = [_candle(100, 101, 99, 100, i) for i in range(10)]
    gapped = calm + [_candle(120, 121, 119, 120, 10)]  # gap up from 100 -> ~120
    assert average_true_range(gapped, 14) > average_true_range(calm, 14)


def test_atr_stop_price_sides() -> None:
    # Long stop sits below the reference; short stop above.
    assert atr_stop_price(side=1, reference=100.0, atr=4.0, mult=2.0) == pytest.approx(92.0)
    assert atr_stop_price(side=-1, reference=100.0, atr=4.0, mult=2.0) == pytest.approx(108.0)


def test_invalid_lookback() -> None:
    with pytest.raises(ValueError):
        average_true_range([], 0)
