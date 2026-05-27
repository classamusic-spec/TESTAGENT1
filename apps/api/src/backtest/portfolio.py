"""Multi-asset portfolio backtest.

Running the strategy across several assets and combining the per-bar returns
diversifies idiosyncratic risk: the portfolio's volatility (and drawdown) is
typically lower than the average single asset, lifting risk-adjusted return.
Each asset is backtested independently with the same walk-forward + cost model;
returns are combined at equal (or supplied) weights, rebalanced each bar.
"""

from __future__ import annotations

import statistics
from dataclasses import dataclass
from typing import Mapping, Sequence

from src.backtest.engine import BacktestResult


@dataclass(frozen=True)
class PortfolioResult:
    total_return: float
    sharpe: float
    max_drawdown: float
    n_bars: int
    equity_curve: list[float]
    per_asset_return: dict[str, float]


def _returns(curve: Sequence[float]) -> list[float]:
    return [curve[i] / curve[i - 1] - 1.0 for i in range(1, len(curve))]


def combine_portfolio(
    results: Mapping[str, BacktestResult], weights: Mapping[str, float] | None = None
) -> PortfolioResult:
    """Combine per-asset backtests into an equal- (or weighted-) weight portfolio."""
    if not results:
        raise ValueError("no asset results to combine")
    names = list(results)
    w = {n: (weights[n] if weights else 1.0 / len(names)) for n in names}
    total_w = sum(w.values()) or 1.0

    per_asset_returns = {n: _returns(results[n].equity_curve) for n in names}
    horizon = min(len(r) for r in per_asset_returns.values())
    if horizon == 0:
        raise ValueError("assets have no overlapping return history")

    equity = 1.0
    curve = [1.0]
    port_returns: list[float] = []
    for t in range(horizon):
        bar = sum(w[n] / total_w * per_asset_returns[n][t] for n in names)
        equity *= 1.0 + bar
        curve.append(equity)
        port_returns.append(bar)

    peak = 1.0
    max_dd = 0.0
    for v in curve:
        peak = max(peak, v)
        max_dd = max(max_dd, (peak - v) / peak)
    sigma = statistics.stdev(port_returns) if len(port_returns) > 1 else 0.0
    sharpe = (statistics.fmean(port_returns) / sigma) if sigma > 0 else 0.0

    return PortfolioResult(
        total_return=equity - 1.0,
        sharpe=sharpe,
        max_drawdown=max_dd,
        n_bars=horizon,
        equity_curve=curve,
        per_asset_return={n: results[n].total_return for n in names},
    )
