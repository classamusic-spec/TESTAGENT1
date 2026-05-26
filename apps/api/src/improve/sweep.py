"""Walk-forward threshold sweep.

Searches over signal thresholds only (never risk limits, invariant 3) and scores
each candidate with the walk-forward backtest engine (invariant 8) including
costs (invariant 9). A production deployment can swap the grid search for an
Optuna sampler behind the same interface.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Sequence

from src.backtest.costs import CostModel
from src.backtest.engine import BacktestResult, ForecastFn, run_backtest
from src.backtest.folds import make_walk_forward_folds
from src.data.ohlcv import Candle
from src.signals.policy import SignalConfig


@dataclass(frozen=True)
class SweepResult:
    results: list[tuple[SignalConfig, BacktestResult]]
    best_config: SignalConfig
    best_result: BacktestResult


def default_grid() -> list[SignalConfig]:
    """A small symmetric grid of long/short thresholds (signal params only)."""
    longs = (0.52, 0.55, 0.58, 0.62)
    configs: list[SignalConfig] = []
    for long_threshold in longs:
        configs.append(SignalConfig(long_threshold=long_threshold, short_threshold=1 - long_threshold))
    return configs


def _objective(result: BacktestResult) -> tuple[float, float]:
    # Maximize Sharpe, tie-break on net total return.
    return (result.sharpe, result.total_return)


def sweep_thresholds(
    candles: Sequence[Candle],
    forecast_fn: ForecastFn,
    cost_model: CostModel,
    *,
    train_size: int,
    test_size: int,
    configs: list[SignalConfig] | None = None,
) -> SweepResult:
    grid = configs if configs is not None else default_grid()
    folds = make_walk_forward_folds(len(candles), train_size, test_size)

    results: list[tuple[SignalConfig, BacktestResult]] = []
    for config in grid:
        result = run_backtest(candles, folds, forecast_fn, cost_model, signal_config=config)
        results.append((config, result))

    best_config, best_result = max(results, key=lambda pair: _objective(pair[1]))
    return SweepResult(results=results, best_config=best_config, best_result=best_result)
