"""Probabilistic and Deflated Sharpe Ratio (Bailey & Lopez de Prado, 2014).

A grid/Optuna sweep that tries many configurations and keeps the best will find
a high Sharpe by chance alone — the more trials, the higher the expected maximum
under the null. The Deflated Sharpe Ratio corrects for this multiple-testing
inflation: it is the probability that the selected strategy's true Sharpe exceeds
the *expected best Sharpe of a family of luckless trials*. Low DSR => the winner
may be an overfit artifact.

Sharpe ratios here are in the same (per-bar, non-annualized) units the backtest
engine produces; all that matters for the correction is internal consistency.
"""

from __future__ import annotations

import math
import statistics
from statistics import NormalDist
from typing import Sequence

EULER_MASCHERONI = 0.5772156649015329
_NORM = NormalDist()


def probabilistic_sharpe_ratio(
    sharpe: float,
    n_obs: int,
    benchmark_sr: float = 0.0,
    skew: float = 0.0,
    kurtosis: float = 3.0,
) -> float:
    """P(true Sharpe > benchmark_sr) given the observed Sharpe over n_obs bars.

    Adjusts for non-normal returns via skew and (non-excess) kurtosis.
    """
    if n_obs < 2:
        return float("nan")
    denominator = math.sqrt(max(1e-12, 1.0 - skew * sharpe + (kurtosis - 1.0) / 4.0 * sharpe**2))
    z = (sharpe - benchmark_sr) * math.sqrt(n_obs - 1) / denominator
    return _NORM.cdf(z)


def expected_max_sharpe(trial_sharpes: Sequence[float]) -> float:
    """Expected maximum Sharpe across N independent luckless trials.

    Uses the variance of the trials' Sharpes as the dispersion of the null —
    more trials and/or more dispersion raise the bar the winner must clear.
    """
    n = len(trial_sharpes)
    if n < 2:
        return 0.0
    sigma = math.sqrt(statistics.pvariance(trial_sharpes))
    if sigma == 0.0:
        return 0.0
    a = _NORM.inv_cdf(1.0 - 1.0 / n)
    b = _NORM.inv_cdf(1.0 - 1.0 / (n * math.e))
    return sigma * ((1.0 - EULER_MASCHERONI) * a + EULER_MASCHERONI * b)


def deflated_sharpe_ratio(
    best_sharpe: float,
    trial_sharpes: Sequence[float],
    n_obs: int,
    skew: float = 0.0,
    kurtosis: float = 3.0,
) -> float:
    """PSR of the best trial benchmarked against the expected max of the family."""
    sr_star = expected_max_sharpe(trial_sharpes)
    return probabilistic_sharpe_ratio(
        best_sharpe, n_obs, benchmark_sr=sr_star, skew=skew, kurtosis=kurtosis
    )
