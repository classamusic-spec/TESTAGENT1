"""Factor features blended with the Kronos forecast.

A transparent, deterministic blend (logistic of a weighted sum) of the model's
p_up with classic factors: momentum and a mean-reversion z-score. This is NOT an
LLM and NOT an RL learner (both forbidden in the decision path); it is a fixed,
human-set linear combination whose weights change only through git review.
"""

from __future__ import annotations

import math
import statistics
from dataclasses import dataclass
from typing import Sequence

from src.data.ohlcv import Candle


@dataclass(frozen=True)
class FactorConfig:
    kronos_weight: float = 1.0
    momentum_weight: float = 0.4
    reversion_weight: float = 0.3
    lookback: int = 12


def momentum(closes: Sequence[float], lookback: int) -> float:
    if len(closes) <= lookback:
        return 0.0
    return closes[-1] / closes[-1 - lookback] - 1.0


def zscore(closes: Sequence[float], lookback: int) -> float:
    window = closes[-lookback:]
    if len(window) < 2:
        return 0.0
    mean = statistics.fmean(window)
    sigma = statistics.pstdev(window)
    if sigma == 0:
        return 0.0
    return (window[-1] - mean) / sigma


def combined_pup(candles: Sequence[Candle], kronos_pup: float, config: FactorConfig | None = None) -> float:
    """Blend the Kronos p_up with momentum (trend-following) and mean-reversion.

    Momentum raises p_up with positive recent return; a high z-score (overbought)
    lowers it. The result is squashed back to a probability in [0, 1].
    """
    cfg = config or FactorConfig()
    closes = [c.close for c in candles]

    kronos_tilt = (kronos_pup - 0.5) * 4.0  # center at 0; scale to logit range
    mom = math.tanh(momentum(closes, cfg.lookback) * 25.0)
    rev = math.tanh(zscore(closes, cfg.lookback))

    score = (
        cfg.kronos_weight * kronos_tilt
        + cfg.momentum_weight * mom
        - cfg.reversion_weight * rev
    )
    return 1.0 / (1.0 + math.exp(-score))
