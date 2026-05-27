"""Walk-forward backtest for a cross-sectional market-neutral rotation.

At each rebalance bar we score every asset on closed candles only (no look-ahead,
invariant 1), rank them, allocate long/short via the allocator, and hold those
weights until the next rebalance. Turnover is charged the configured cost on
every rebalance (invariant 9) — the whole point is that infrequent rebalancing
keeps cost low enough that a cross-sectional edge can survive.
"""

from __future__ import annotations

import statistics
from dataclasses import dataclass
from typing import Mapping, Sequence

from src.backtest.costs import CostModel
from src.backtest.engine import ForecastFn
from src.data.ohlcv import Candle
from src.signals.cross_sectional import CrossSectionalConfig, rank_and_allocate


@dataclass(frozen=True)
class CrossSectionalResult:
    total_return: float
    gross_return: float
    total_costs: float
    sharpe: float
    max_drawdown: float
    n_rebalances: int
    n_bars: int
    equity_curve: list[float]


def _max_drawdown(curve: Sequence[float]) -> float:
    peak = curve[0]
    worst = 0.0
    for v in curve:
        peak = max(peak, v)
        worst = max(worst, (peak - v) / peak)
    return worst


def run_cross_sectional(
    assets: Mapping[str, Sequence[Candle]],
    forecast_fn: ForecastFn,
    cost_model: CostModel,
    config: CrossSectionalConfig | None = None,
    *,
    rebalance_every: int = 6,
    start: int = 100,
) -> CrossSectionalResult:
    cfg = config or CrossSectionalConfig()
    if not assets:
        raise ValueError("no assets provided")
    names = list(assets)
    n = min(len(assets[a]) for a in names)
    if start >= n - 1:
        raise ValueError("not enough overlapping history for the warmup")

    equity = 1.0
    gross_equity = 1.0
    curve = [1.0]
    net_returns: list[float] = []
    total_costs = 0.0
    n_rebalances = 0
    weights: dict[str, float] = {a: 0.0 for a in names}

    for t in range(start, n - 1):
        cost = 0.0
        if (t - start) % rebalance_every == 0:
            scores = {a: forecast_fn(assets[a][: t + 1]) for a in names}
            target = rank_and_allocate(scores, cfg)
            turnover = sum(abs(target[a] - weights.get(a, 0.0)) for a in names)
            cost = cost_model.cost(turnover)
            total_costs += cost
            n_rebalances += 1
            weights = target

        bar = 0.0
        for a in names:
            w = weights[a]
            if w != 0.0:
                bar += w * (assets[a][t + 1].close / assets[a][t].close - 1.0)

        gross_equity *= 1.0 + bar
        before = equity
        equity *= (1.0 - cost) * (1.0 + bar)
        net_returns.append(equity / before - 1.0)
        curve.append(equity)

    sigma = statistics.stdev(net_returns) if len(net_returns) > 1 else 0.0
    sharpe = (statistics.fmean(net_returns) / sigma) if sigma > 0 else 0.0
    return CrossSectionalResult(
        total_return=equity - 1.0,
        gross_return=gross_equity - 1.0,
        total_costs=total_costs,
        sharpe=sharpe,
        max_drawdown=_max_drawdown(curve),
        n_rebalances=n_rebalances,
        n_bars=len(net_returns),
        equity_curve=curve,
    )
