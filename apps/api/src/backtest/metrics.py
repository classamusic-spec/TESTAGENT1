"""Risk-adjusted performance metrics + Monte-Carlo drawdown analysis.

These complement the Deflated Sharpe / permutation tests in validation.py. The
Monte-Carlo trade-shuffle deliberately measures DRAWDOWN path risk: reordering
the same set of per-bar returns leaves the final return unchanged (multiplication
commutes) but produces very different equity paths, so it exposes how unlucky the
drawdown could have been with the same edge.
"""

from __future__ import annotations

import math
import random
import statistics
from dataclasses import dataclass
from typing import Sequence


def sortino_ratio(returns: Sequence[float], target: float = 0.0) -> float:
    if len(returns) < 2:
        return 0.0
    downside = [min(0.0, r - target) for r in returns]
    dd = math.sqrt(sum(d * d for d in downside) / len(returns))
    return 0.0 if dd == 0 else (statistics.fmean(returns) - target) / dd


def calmar_ratio(total_return: float, max_drawdown: float) -> float:
    """Return per unit of max drawdown (both as fractions). Higher is better."""
    return 0.0 if max_drawdown <= 0 else total_return / max_drawdown


def system_quality_number(returns: Sequence[float]) -> float:
    """Van Tharp SQN on per-bar returns: sqrt(n) * mean / stdev."""
    if len(returns) < 2:
        return 0.0
    sd = statistics.stdev(returns)
    return 0.0 if sd == 0 else math.sqrt(len(returns)) * statistics.fmean(returns) / sd


def expectancy(returns: Sequence[float]) -> float:
    """Average return per sample (per-bar expectancy)."""
    return statistics.fmean(returns) if returns else 0.0


@dataclass(frozen=True)
class DrawdownDistribution:
    median: float
    p95: float
    worst: float


def _max_drawdown_of(returns: Sequence[float]) -> float:
    equity = 1.0
    peak = 1.0
    worst = 0.0
    for r in returns:
        equity *= 1.0 + r
        peak = max(peak, equity)
        if peak > 0:
            worst = max(worst, (peak - equity) / peak)
    return worst


def monte_carlo_drawdown(
    returns: Sequence[float], n_paths: int = 1000, seed: int = 0
) -> DrawdownDistribution:
    """Distribution of max drawdown across random orderings of the same returns."""
    if not returns:
        raise ValueError("no returns to simulate")
    rng = random.Random(seed)
    arr = list(returns)
    dds: list[float] = []
    for _ in range(n_paths):
        rng.shuffle(arr)
        dds.append(_max_drawdown_of(arr))
    dds.sort()

    def pick(q: float) -> float:
        return dds[min(len(dds) - 1, int(q * len(dds)))]

    return DrawdownDistribution(median=pick(0.5), p95=pick(0.95), worst=dds[-1])
