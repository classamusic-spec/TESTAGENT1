"""Train the 'feature' forecaster and persist weights (GPU-free).

Builds (features, label) pairs from candles — label = 1 if price is higher
`horizon` bars later — fits the logistic model, and writes weights JSON for the
FeatureForecaster to serve. On a GPU host this is where the real Kronos fine-tune
would live; here it trains the in-repo logistic stand-in.

Usage (from apps/ml):  python -m scripts.train
"""

from __future__ import annotations

import math
import random

from src.config import settings
from src.contracts import Candle
from src.model.features import FEATURE_KEYS, compute_features
from src.model.logistic import fit_logistic

STEP = 3_600_000


def synthetic_candles(n: int, seed: int = 11) -> list[Candle]:
    rng = random.Random(seed)
    out: list[Candle] = []
    price = 3000.0
    for i in range(n):
        drift = math.sin(i / 60) * 0.001 + (rng.random() - 0.49) * 0.012
        o = price
        c = o * (1 + drift)
        wick = o * 0.005 * rng.random()
        out.append(Candle(openTime=i * STEP, open=o, high=max(o, c) + wick, low=min(o, c) - wick, close=c, volume=1.0, closed=True))
        price = c
    return out


def build_dataset(candles: list[Candle], horizon: int, warmup: int = 24):
    rows, ys = [], []
    for i in range(warmup, len(candles) - horizon):
        feats = compute_features(candles[: i + 1])
        rows.append([feats[k] for k in FEATURE_KEYS])
        ys.append(1 if candles[i + horizon].close > candles[i].close else 0)
    return rows, ys


def main() -> None:
    candles = synthetic_candles(2000)
    rows, ys = build_dataset(candles, horizon=settings.forecast_horizon)
    model = fit_logistic(rows, ys, FEATURE_KEYS, epochs=400)
    model.save(settings.model_weights_path)
    pos = sum(ys) / len(ys)
    print(f"Trained on {len(rows)} samples (up-rate {pos:.1%}) -> {settings.model_weights_path}")
    print("weights:", {k: round(w, 3) for k, w in zip(model.feature_keys, model.weights)})


if __name__ == "__main__":
    main()
