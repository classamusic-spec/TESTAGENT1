from __future__ import annotations

import pytest

from src.data.ohlcv import Candle
from src.signals.sizing import (
    SizingConfig,
    kelly_fraction_signed,
    position_fraction,
    realized_vol,
)

STEP = 3_600_000


def _candles(closes: list[float]) -> list[Candle]:
    return [
        Candle(open_time=i * STEP, open=c, high=c, low=c, close=c, volume=1.0, closed=True)
        for i, c in enumerate(closes)
    ]


def test_kelly_signed_centered_at_half() -> None:
    assert kelly_fraction_signed(0.5) == 0.0
    assert kelly_fraction_signed(1.0) == 1.0
    assert kelly_fraction_signed(0.0) == -1.0


def test_realized_vol_zero_for_flat_series() -> None:
    assert realized_vol(_candles([100.0] * 30), 24) == 0.0


def test_no_edge_means_no_position() -> None:
    candles = _candles([100.0 + (i % 3) for i in range(40)])
    assert position_fraction(0.5, candles) == pytest.approx(0.0)


def test_higher_confidence_means_larger_size() -> None:
    candles = _candles([100.0 + (i % 3) for i in range(40)])
    cfg = SizingConfig(target_vol=0.01, kelly_fraction=1.0)
    low = position_fraction(0.6, candles, cfg)
    high = position_fraction(0.8, candles, cfg)
    assert 0 < low < high


def test_higher_vol_means_smaller_size() -> None:
    calm = _candles([100.0 + 0.1 * (i % 2) for i in range(40)])
    wild = _candles([100.0 * (1.05 if i % 2 else 0.95) for i in range(40)])
    cfg = SizingConfig(target_vol=0.01, kelly_fraction=1.0)
    assert position_fraction(0.8, calm, cfg) > position_fraction(0.8, wild, cfg)


def test_half_kelly_smaller_than_full() -> None:
    candles = _candles([100.0 + (i % 3) for i in range(40)])
    half = position_fraction(0.7, candles, SizingConfig(kelly_fraction=0.5, target_vol=0.005))
    full = position_fraction(0.7, candles, SizingConfig(kelly_fraction=1.0, target_vol=0.005))
    assert half < full


def test_always_within_cap() -> None:
    candles = _candles([100.0 + (i % 3) for i in range(40)])
    cfg = SizingConfig(target_vol=10.0, max_fraction=0.5)  # huge target would blow up uncapped
    for p in (0.0, 0.2, 0.5, 0.8, 1.0):
        f = position_fraction(p, candles, cfg)
        assert -0.5 <= f <= 0.5


def test_invalid_config_rejected() -> None:
    with pytest.raises(ValueError):
        SizingConfig(kelly_fraction=0.0)
    with pytest.raises(ValueError):
        SizingConfig(max_fraction=1.5)
