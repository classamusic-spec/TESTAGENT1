from __future__ import annotations

from src.data.ohlcv import Candle
from src.signals.regime import Regime, RegimeConfig, classify_regime, select_checkpoint

STEP = 3_600_000


def _candles(closes: list[float]) -> list[Candle]:
    return [
        Candle(open_time=i * STEP, open=c, high=c, low=c, close=c, volume=1.0, closed=True)
        for i, c in enumerate(closes)
    ]


def test_uptrend_classified() -> None:
    up = _candles([100.0 * (1.002 ** i) for i in range(60)])
    assert classify_regime(up) == Regime.TREND_UP


def test_downtrend_classified() -> None:
    down = _candles([100.0 * (0.998 ** i) for i in range(60)])
    assert classify_regime(down) == Regime.TREND_DOWN


def test_flat_is_range() -> None:
    flat = _candles([100.0 + 0.05 * (i % 2) for i in range(60)])
    assert classify_regime(flat) == Regime.RANGE


def test_choppy_is_high_vol() -> None:
    wild = _candles([100.0 * (1.06 if i % 2 else 0.94) for i in range(60)])
    assert classify_regime(wild) == Regime.HIGH_VOL


def test_select_checkpoint_maps_and_falls_back() -> None:
    mapping = {Regime.TREND_UP: "v-trend", Regime.HIGH_VOL: "v-defensive"}
    assert select_checkpoint(Regime.TREND_UP, mapping, default="v-base") == "v-trend"
    assert select_checkpoint(Regime.RANGE, mapping, default="v-base") == "v-base"
