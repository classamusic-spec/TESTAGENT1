"""Dependency-free logistic model with JSON persistence (no torch/GPU)."""

from __future__ import annotations

import json
import math
from dataclasses import dataclass
from pathlib import Path
from typing import Sequence


def _sigmoid(z: float) -> float:
    if z >= 0:
        return 1.0 / (1.0 + math.exp(-z))
    e = math.exp(z)
    return e / (1.0 + e)


@dataclass(frozen=True)
class LogisticModel:
    feature_keys: list[str]
    weights: list[float]
    bias: float
    means: list[float]
    stds: list[float]

    def predict_proba(self, features: dict[str, float]) -> float:
        z = self.bias
        for k, w, mean, std in zip(self.feature_keys, self.weights, self.means, self.stds):
            z += w * ((features.get(k, mean) - mean) / std)
        return _sigmoid(z)

    def to_dict(self) -> dict:
        return {
            "feature_keys": self.feature_keys,
            "weights": self.weights,
            "bias": self.bias,
            "means": self.means,
            "stds": self.stds,
        }

    def save(self, path: str | Path) -> None:
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        Path(path).write_text(json.dumps(self.to_dict(), indent=2))

    @classmethod
    def from_dict(cls, d: dict) -> "LogisticModel":
        return cls(d["feature_keys"], d["weights"], d["bias"], d["means"], d["stds"])

    @classmethod
    def load(cls, path: str | Path) -> "LogisticModel | None":
        p = Path(path)
        if not p.exists():
            return None
        return cls.from_dict(json.loads(p.read_text()))


def fit_logistic(
    rows: Sequence[Sequence[float]],
    targets: Sequence[int],
    feature_keys: Sequence[str],
    *,
    epochs: int = 400,
    lr: float = 0.2,
    l2: float = 1e-3,
) -> LogisticModel:
    if not rows:
        raise ValueError("no training rows")
    n, d = len(rows), len(feature_keys)
    means = [sum(r[j] for r in rows) / n for j in range(d)]
    stds = []
    for j in range(d):
        var = sum((r[j] - means[j]) ** 2 for r in rows) / n
        stds.append(math.sqrt(var) or 1.0)
    norm = [[(r[j] - means[j]) / stds[j] for j in range(d)] for r in rows]

    weights = [0.0] * d
    bias = 0.0
    for _ in range(epochs):
        gw = [0.0] * d
        gb = 0.0
        for x, y in zip(norm, targets):
            pred = _sigmoid(bias + sum(weights[j] * x[j] for j in range(d)))
            err = pred - y
            gb += err
            for j in range(d):
                gw[j] += err * x[j]
        bias -= lr * gb / n
        for j in range(d):
            weights[j] -= lr * (gw[j] / n + l2 * weights[j])
    return LogisticModel(list(feature_keys), weights, bias, means, stds)
