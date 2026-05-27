"""Declarative, causal feature engineering for the forecaster.

Every feature is computed from closed candles up to and including the decision
bar only (invariant 1) — no future information. The same generator is intended
for both offline training and online inference, guaranteeing train/serve parity
(the most common source of silent look-ahead leakage).
"""

from __future__ import annotations

import statistics
from dataclasses import dataclass
from typing import Sequence

from src.data.ohlcv import Candle
from src.risk.atr import average_true_range
from src.signals.sizing import realized_vol


@dataclass(frozen=True)
class FeatureConfig:
    return_windows: tuple[int, ...] = (1, 3, 6, 12)
    vol_window: int = 24
    rsi_window: int = 14
    atr_window: int = 14
    bb_window: int = 20
    adx_window: int = 14


def _rsi(closes: Sequence[float], window: int) -> float:
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


def _bb_width(closes: Sequence[float], window: int) -> float:
    w = closes[-window:]
    if len(w) < 2:
        return 0.0
    mean = statistics.fmean(w)
    if mean == 0:
        return 0.0
    return (2.0 * statistics.pstdev(w)) / mean  # bandwidth as a fraction of price


def _adx(candles: Sequence[Candle], window: int) -> float:
    """Simplified ADX (SMA-smoothed) — trend-strength feature in [0, 100]."""
    if len(candles) <= window + 1:
        return 0.0
    plus_dm: list[float] = []
    minus_dm: list[float] = []
    trs: list[float] = []
    for k in range(len(candles) - window, len(candles)):
        up = candles[k].high - candles[k - 1].high
        down = candles[k - 1].low - candles[k].low
        plus_dm.append(up if (up > down and up > 0) else 0.0)
        minus_dm.append(down if (down > up and down > 0) else 0.0)
        tr = max(
            candles[k].high - candles[k].low,
            abs(candles[k].high - candles[k - 1].close),
            abs(candles[k].low - candles[k - 1].close),
        )
        trs.append(tr)
    atr = sum(trs) / len(trs)
    if atr == 0:
        return 0.0
    plus_di = 100.0 * (sum(plus_dm) / len(plus_dm)) / atr
    minus_di = 100.0 * (sum(minus_dm) / len(minus_dm)) / atr
    denom = plus_di + minus_di
    return 0.0 if denom == 0 else 100.0 * abs(plus_di - minus_di) / denom


def compute_features(candles: Sequence[Candle], config: FeatureConfig | None = None) -> dict[str, float]:
    """Causal feature vector for the most recent (last) closed candle."""
    cfg = config or FeatureConfig()
    closes = [c.close for c in candles]
    last = closes[-1] if closes else 0.0

    feats: dict[str, float] = {}
    for w in cfg.return_windows:
        ref = closes[-(w + 1)] if len(closes) > w else (closes[0] if closes else last)
        feats[f"ret_{w}"] = (last / ref - 1.0) if ref else 0.0
    feats["vol"] = realized_vol(candles, cfg.vol_window)
    feats["rsi"] = _rsi(closes, cfg.rsi_window)
    feats["atr_pct"] = (average_true_range(candles, cfg.atr_window) / last) if last else 0.0
    feats["bb_width"] = _bb_width(closes, cfg.bb_window)
    feats["adx"] = _adx(candles, cfg.adx_window)
    return feats


def feature_matrix(candles: Sequence[Candle], config: FeatureConfig | None = None, warmup: int = 24) -> list[dict[str, float]]:
    """Per-bar causal features (each row uses only candles[: i + 1])."""
    return [compute_features(candles[: i + 1], config) for i in range(warmup, len(candles))]
