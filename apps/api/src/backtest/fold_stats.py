"""Per-fold backtest breakdown and aggregate stability stats.

A single aggregate Sharpe hides whether an edge is consistent or driven by one
lucky fold. Running each walk-forward fold in isolation exposes the spread.
"""

from __future__ import annotations

import statistics
from dataclasses import dataclass
from typing import Sequence

from src.backtest.costs import CostModel
from src.backtest.engine import BacktestResult, ForecastFn, run_backtest
from src.backtest.folds import Fold
from src.data.ohlcv import Candle
from src.signals.policy import SignalConfig
from src.signals.sizing import SizingConfig


@dataclass(frozen=True)
class FoldResult:
    fold: Fold
    result: BacktestResult


@dataclass(frozen=True)
class FoldSummary:
    n_folds: int
    mean_sharpe: float
    std_sharpe: float
    mean_return: float
    profitable_fold_fraction: float


def run_backtest_by_fold(
    candles: Sequence[Candle],
    folds: list[Fold],
    forecast_fn: ForecastFn,
    cost_model: CostModel,
    signal_config: SignalConfig | None = None,
    sizing_config: SizingConfig | None = None,
) -> list[FoldResult]:
    """Score each fold in isolation (equity resets to 1.0 per fold)."""
    return [
        FoldResult(
            fold=fold,
            result=run_backtest(
                candles, [fold], forecast_fn, cost_model, signal_config, sizing_config
            ),
        )
        for fold in folds
    ]


def summarize_folds(fold_results: Sequence[FoldResult]) -> FoldSummary:
    if not fold_results:
        raise ValueError("no folds to summarize")
    sharpes = [fr.result.sharpe for fr in fold_results]
    returns = [fr.result.total_return for fr in fold_results]
    profitable = sum(1 for r in returns if r > 0)
    return FoldSummary(
        n_folds=len(fold_results),
        mean_sharpe=statistics.fmean(sharpes),
        std_sharpe=statistics.pstdev(sharpes) if len(sharpes) > 1 else 0.0,
        mean_return=statistics.fmean(returns),
        profitable_fold_fraction=profitable / len(fold_results),
    )
