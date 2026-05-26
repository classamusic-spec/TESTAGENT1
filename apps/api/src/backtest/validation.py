"""Statistical validation for backtests.

A single backtest number is easy to fool yourself with. These tools quantify how
much to trust it: a bootstrap confidence interval on returns, and a sign-flip
permutation test that asks whether the edge is distinguishable from chance.
Inspired by the validation rigor in research backtesting workspaces.
"""

from __future__ import annotations

import random
import statistics
from dataclasses import dataclass
from typing import Sequence


def returns_from_curve(equity_curve: Sequence[float]) -> list[float]:
    return [equity_curve[i] / equity_curve[i - 1] - 1.0 for i in range(1, len(equity_curve))]


@dataclass(frozen=True)
class BootstrapCI:
    mean: float
    lower: float
    upper: float


def bootstrap_total_return_ci(
    returns: Sequence[float],
    n_resamples: int = 1000,
    confidence: float = 0.95,
    seed: int = 0,
) -> BootstrapCI:
    """Resample per-bar returns with replacement to bound the total return."""
    if not returns:
        raise ValueError("no returns to bootstrap")
    rng = random.Random(seed)
    n = len(returns)
    totals: list[float] = []
    for _ in range(n_resamples):
        equity = 1.0
        for _ in range(n):
            equity *= 1.0 + returns[rng.randrange(n)]
        totals.append(equity - 1.0)
    totals.sort()
    lo_idx = int((1 - confidence) / 2 * n_resamples)
    hi_idx = min(n_resamples - 1, int((1 + confidence) / 2 * n_resamples))
    return BootstrapCI(mean=statistics.fmean(totals), lower=totals[lo_idx], upper=totals[hi_idx])


def permutation_pvalue(returns: Sequence[float], n_permutations: int = 1000, seed: int = 0) -> float:
    """Sign-flip permutation test.

    Null hypothesis: the per-bar returns have no directional edge (each could
    equally have come from the opposite position). Returns the fraction of random
    sign-flips whose mean return is at least the observed mean — a low p-value
    means the edge is unlikely to be chance.
    """
    if not returns:
        raise ValueError("no returns to test")
    observed = statistics.fmean(returns)
    rng = random.Random(seed)
    at_least = 0
    for _ in range(n_permutations):
        flipped = statistics.fmean([r if rng.random() < 0.5 else -r for r in returns])
        if flipped >= observed:
            at_least += 1
    return at_least / n_permutations


@dataclass(frozen=True)
class ValidationReport:
    total_return_ci: BootstrapCI
    permutation_pvalue: float
    robust: bool  # CI lower bound > 0 and p-value < 0.05


def validate_equity_curve(
    equity_curve: Sequence[float],
    n_resamples: int = 1000,
    seed: int = 0,
) -> ValidationReport:
    returns = returns_from_curve(equity_curve)
    ci = bootstrap_total_return_ci(returns, n_resamples=n_resamples, seed=seed)
    p = permutation_pvalue(returns, n_permutations=n_resamples, seed=seed)
    return ValidationReport(total_return_ci=ci, permutation_pvalue=p, robust=ci.lower > 0 and p < 0.05)
