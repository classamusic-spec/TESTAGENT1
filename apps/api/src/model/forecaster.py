"""A dependency-free logistic forecaster trained on features -> up/not-up.

Deterministic gradient-descent logistic regression with feature standardization.
Predicts p_up (probability the next move resolves to the upper barrier). Designed
to be trained walk-forward and consumed by the same decision pipeline as the
Kronos stub, so it can be validated with our backtest / calibration tooling.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Callable, Sequence

from src.data.ohlcv import Candle
from src.signals.features import FeatureConfig, compute_features
from src.signals.labels import BarrierConfig, triple_barrier_labels


def _sigmoid(z: float) -> float:
    if z >= 0:
        return 1.0 / (1.0 + math.exp(-z))
    e = math.exp(z)
    return e / (1.0 + e)


@dataclass(frozen=True)
class LogisticForecaster:
    feature_keys: list[str]
    weights: list[float]
    bias: float
    means: list[float]
    stds: list[float]

    def predict_proba(self, features: dict[str, float]) -> float:
        z = self.bias
        for k, w, mean, std in zip(self.feature_keys, self.weights, self.means, self.stds):
            x = (features.get(k, mean) - mean) / std
            z += w * x
        return _sigmoid(z)


def fit_logistic(
    rows: Sequence[Sequence[float]],
    targets: Sequence[int],
    feature_keys: Sequence[str],
    *,
    epochs: int = 400,
    lr: float = 0.2,
    l2: float = 1e-3,
) -> LogisticForecaster:
    """Train a standardized logistic regression by full-batch gradient descent."""
    if not rows:
        raise ValueError("no training rows")
    n, d = len(rows), len(feature_keys)
    # Standardize features (guard zero-variance columns).
    means = [sum(r[j] for r in rows) / n for j in range(d)]
    stds = []
    for j in range(d):
        var = sum((r[j] - means[j]) ** 2 for r in rows) / n
        stds.append(math.sqrt(var) or 1.0)
    norm = [[(r[j] - means[j]) / stds[j] for j in range(d)] for r in rows]

    weights = [0.0] * d
    bias = 0.0
    for _ in range(epochs):
        grad_w = [0.0] * d
        grad_b = 0.0
        for x, y in zip(norm, targets):
            pred = _sigmoid(bias + sum(weights[j] * x[j] for j in range(d)))
            err = pred - y
            grad_b += err
            for j in range(d):
                grad_w[j] += err * x[j]
        bias -= lr * grad_b / n
        for j in range(d):
            weights[j] -= lr * (grad_w[j] / n + l2 * weights[j])

    return LogisticForecaster(list(feature_keys), weights, bias, means, stds)


def build_dataset(
    candles: Sequence[Candle],
    feature_config: FeatureConfig | None = None,
    barrier_config: BarrierConfig | None = None,
    warmup: int = 24,
) -> tuple[list[list[float]], list[int], list[str]]:
    """(X, y, feature_keys) where y = 1 if the bar's barrier label resolved up."""
    fcfg = feature_config or FeatureConfig()
    labels = triple_barrier_labels(candles, barrier_config or BarrierConfig())
    rows: list[list[float]] = []
    ys: list[int] = []
    keys: list[str] = []
    for i in range(warmup, len(candles)):
        label = labels[i]
        if label is None:
            continue
        feats = compute_features(candles[: i + 1], fcfg)
        if not keys:
            keys = list(feats.keys())
        rows.append([feats[k] for k in keys])
        ys.append(1 if label == 1 else 0)
    return rows, ys, keys


def make_forecast_fn(
    model: LogisticForecaster, feature_config: FeatureConfig | None = None
) -> Callable[[Sequence[Candle]], float]:
    """A forecast_fn (closed candles -> p_up) backed by the trained model."""
    fcfg = feature_config or FeatureConfig()
    return lambda context: model.predict_proba(compute_features(context, fcfg))
