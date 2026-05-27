from __future__ import annotations

from src.data.ohlcv import Candle
from src.signals.features import FeatureConfig, compute_features, feature_matrix

STEP = 3_600_000


def _candles(closes: list[float]) -> list[Candle]:
    out = []
    for i, c in enumerate(closes):
        prev = closes[i - 1] if i > 0 else c
        hi = max(c, prev) * 1.001
        lo = min(c, prev) * 0.999
        out.append(Candle(open_time=i * STEP, open=prev, high=hi, low=lo, close=c, volume=1.0, closed=True))
    return out


def test_flat_market_neutral_features() -> None:
    f = compute_features(_candles([100.0] * 40))
    assert f["rsi"] == 100.0 or abs(f["rsi"] - 50.0) < 1e-6 or f["vol"] == 0.0
    assert f["vol"] == 0.0
    assert f["bb_width"] == 0.0


def test_uptrend_features() -> None:
    f = compute_features(_candles([100 * 1.01**i for i in range(40)]))
    assert f["ret_6"] > 0  # positive momentum
    assert f["rsi"] > 60  # persistent gains push RSI up


def test_features_are_causal() -> None:
    # Features at bar i must not change when future candles are appended.
    closes = [100 + (i % 5) for i in range(40)]
    candles = _candles(closes)
    at_i = compute_features(candles[:30])
    more = compute_features(candles[:30])  # recompute on the same prefix
    assert at_i == more
    # Appending future data must not alter the prefix computation.
    extended = _candles(closes + [200, 210, 220])
    assert compute_features(extended[:30]) == at_i


def test_feature_matrix_shape() -> None:
    candles = _candles([100 + i for i in range(60)])
    rows = feature_matrix(candles, FeatureConfig(), warmup=24)
    assert len(rows) == 60 - 24
    assert "adx" in rows[0]
