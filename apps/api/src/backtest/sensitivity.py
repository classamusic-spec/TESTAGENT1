"""Transaction-cost sensitivity curves.

A strategy that only works at unrealistically low costs is fragile. Re-running
the backtest across a range of cost multipliers shows how quickly the edge
decays as fees and slippage rise (invariant 9).
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Sequence

from src.backtest.costs import CostModel
from src.backtest.engine import ForecastFn, run_backtest
from src.backtest.folds import Fold
from src.data.ohlcv import Candle
from src.signals.policy import SignalConfig
from src.signals.sizing import SizingConfig


@dataclass(frozen=True)
class CostSensitivityPoint:
    multiplier: float
    total_bps: float
    total_return: float
    sharpe: float
    n_trades: int


def cost_sensitivity_curve(
    candles: Sequence[Candle],
    folds: list[Fold],
    forecast_fn: ForecastFn,
    base_cost: CostModel,
    multipliers: Sequence[float] = (0.0, 0.5, 1.0, 1.5, 2.0, 3.0),
    signal_config: SignalConfig | None = None,
    sizing_config: SizingConfig | None = None,
) -> list[CostSensitivityPoint]:
    """Total return / Sharpe as fees and slippage are scaled by each multiplier."""
    curve: list[CostSensitivityPoint] = []
    for m in multipliers:
        if m < 0:
            raise ValueError("cost multipliers must be non-negative")
        cost = CostModel(fee_bps=base_cost.fee_bps * m, slippage_bps=base_cost.slippage_bps * m)
        result = run_backtest(candles, folds, forecast_fn, cost, signal_config, sizing_config)
        curve.append(
            CostSensitivityPoint(
                multiplier=m,
                total_bps=cost.total_bps,
                total_return=result.total_return,
                sharpe=result.sharpe,
                n_trades=result.n_trades,
            )
        )
    return curve
