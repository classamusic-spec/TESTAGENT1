"""Aggregate multiple probability "heads" into one signal score.

When several calibrated forecasts exist (e.g. Kronos p_up at different horizons,
or per-label heads), blending them reduces single-head variance before
thresholding. Deterministic and stateless — pairs with calibration tracking.
"""

from __future__ import annotations

import math
from typing import Sequence


def aggregate_probabilities(probs: Sequence[float], weights: Sequence[float] | None = None) -> float:
    """Weighted average of probabilities, clamped to [0, 1]."""
    if not probs:
        raise ValueError("no probabilities to aggregate")
    if weights is None:
        return min(1.0, max(0.0, sum(probs) / len(probs)))
    if len(weights) != len(probs):
        raise ValueError("weights and probs must be the same length")
    total = sum(weights)
    if total <= 0:
        raise ValueError("weights must sum to a positive value")
    blended = sum(p * w for p, w in zip(probs, weights)) / total
    return min(1.0, max(0.0, blended))


def temperature_scale(prob: float, temperature: float) -> float:
    """Sharpen (T<1) or soften (T>1) a probability via logit/temperature.

    A calibration knob: T=1 is a no-op, T>1 pulls toward 0.5 (less confident),
    0<T<1 pushes toward 0/1 (more confident).
    """
    if temperature <= 0:
        raise ValueError("temperature must be > 0")
    p = min(1 - 1e-9, max(1e-9, prob))
    logit = math.log(p / (1 - p))
    return 1.0 / (1.0 + math.exp(-logit / temperature))
