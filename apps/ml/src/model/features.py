"""Causal feature engineering for the in-repo trained forecaster.

Self-contained (no cross-package imports). Every feature uses only the candles
up to and including the decision bar (invariant 1). Mirrors the feature design
in apps/api so train/serve stay consistent.
"""

from __future__ import annotations

import statistics

from src.contracts import Candle

RETURN_WINDOWS = (1, 3, 6, 12)
VOL_WINDOW = 24
RSI_WINDOW = 14
FEATURE_KEYS: list[str] = [f"ret_{w}" for w in RETURN_WINDOWS] + ["vol", "rsi"]


def _rsi(closes: list[float], window: int) -> float:
    if len(closes) <= window:
        return 50.0
    gains, losses = 0.0, 0.0
    for k in range(len(closes) - window, len(closes)):
        change = closes[k] - closes[k - 1]
        if change >= 0:
            gains += change
        else:
            losses -= change
    if losses == 0:
        return 100.0
    rs = (gains / window) / (losses / window)
    return 100.0 - 100.0 / (1.0 + rs)


def _realized_vol(closes: list[float], window: int) -> float:
    w = closes[-(window + 1) :]
    if len(w) < 3:
        return 0.0
    rets = [w[i] / w[i - 1] - 1.0 for i in range(1, len(w))]
    return statistics.pstdev(rets) if len(rets) > 1 else 0.0


def compute_features(candles: list[Candle]) -> dict[str, float]:
    closes = [c.close for c in candles]
    last = closes[-1] if closes else 0.0
    feats: dict[str, float] = {}
    for w in RETURN_WINDOWS:
        ref = closes[-(w + 1)] if len(closes) > w else (closes[0] if closes else last)
        feats[f"ret_{w}"] = (last / ref - 1.0) if ref else 0.0
    feats["vol"] = _realized_vol(closes, VOL_WINDOW)
    feats["rsi"] = _rsi(closes, RSI_WINDOW)
    return feats
