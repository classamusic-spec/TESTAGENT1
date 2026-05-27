from __future__ import annotations

import math

from src.data.ohlcv import Candle
from src.model.forecaster import build_dataset, fit_logistic, make_forecast_fn

STEP = 3_600_000


def _candles(closes: list[float]) -> list[Candle]:
    out = []
    for i, c in enumerate(closes):
        prev = closes[i - 1] if i > 0 else c
        out.append(
            Candle(open_time=i * STEP, open=prev, high=max(c, prev) * 1.002, low=min(c, prev) * 0.998, close=c, volume=1.0, closed=True)
        )
    return out


def test_logistic_learns_separable_pattern() -> None:
    # Feature 0 perfectly separates the classes.
    keys = ["a", "b"]
    rows = [[2.0, 0.1], [2.5, -0.2], [3.0, 0.0], [-2.0, 0.1], [-2.5, -0.1], [-3.0, 0.2]]
    ys = [1, 1, 1, 0, 0, 0]
    model = fit_logistic(rows, ys, keys, epochs=600, lr=0.5)
    assert model.predict_proba({"a": 3.0, "b": 0.0}) > 0.7
    assert model.predict_proba({"a": -3.0, "b": 0.0}) < 0.3


def test_predict_proba_in_range() -> None:
    model = fit_logistic([[1.0], [-1.0]], [1, 0], ["x"], epochs=100)
    for v in (-10.0, 0.0, 10.0):
        p = model.predict_proba({"x": v})
        assert 0.0 <= p <= 1.0


def test_build_dataset_shapes() -> None:
    candles = _candles([100 + i for i in range(80)])
    X, y, keys = build_dataset(candles, warmup=24)
    assert len(X) == len(y) > 0
    assert all(len(row) == len(keys) for row in X)
    assert set(y) <= {0, 1}


def test_make_forecast_fn_trains_and_predicts() -> None:
    # Uptrend -> "up" barrier label dominates -> model should lean bullish.
    candles = _candles([100 * 1.01**i for i in range(120)])
    X, y, keys = build_dataset(candles, warmup=24)
    model = fit_logistic(X, y, keys, epochs=300)
    fn = make_forecast_fn(model)
    p = fn(candles[:90])
    assert 0.0 <= p <= 1.0
    assert not math.isnan(p)
