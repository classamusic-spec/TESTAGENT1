"""Walk-forward backtest engine."""

from __future__ import annotations

import statistics
from dataclasses import dataclass
from typing import Callable, Sequence

from src.backtest.costs import CostModel
from src.backtest.folds import Fold, collect_test_indices
from src.data.ohlcv import Candle
from src.signals.policy import SignalConfig, derive_signal, position_for
from src.signals.sizing import SizingConfig, position_fraction

# Given the closed candles available up to and including a decision bar, return
# the forecast's directional probability (p_up) for the next bar.
ForecastFn = Callable[[Sequence[Candle]], float]


@dataclass(frozen=True)
class BacktestResult:
    n_bars: int
    n_trades: int
    total_costs: float
    final_equity: float
    total_return: float
    gross_return: float
    sharpe: float
    max_drawdown: float
    win_rate: float
    equity_curve: list[float]


def _max_drawdown(curve: Sequence[float]) -> float:
    peak = curve[0]
    worst = 0.0
    for value in curve:
        peak = max(peak, value)
        worst = max(worst, (peak - value) / peak)
    return worst


def _sharpe(returns: Sequence[float]) -> float:
    if len(returns) < 2:
        return 0.0
    sigma = statistics.stdev(returns)
    if sigma == 0:
        return 0.0
    return statistics.fmean(returns) / sigma


def run_backtest(
    candles: Sequence[Candle],
    folds: list[Fold],
    forecast_fn: ForecastFn,
    cost_model: CostModel,
    signal_config: SignalConfig | None = None,
    sizing_config: SizingConfig | None = None,
) -> BacktestResult:
    """Run a walk-forward backtest.

    At each test bar t the forecaster sees only candles[: t + 1] (no look-ahead,
    invariants 1 and 8). The position is held from t to t+1 and the realized
    return is booked; costs are charged whenever the position changes.

    With `sizing_config`, the position is sized continuously by confidence and
    volatility (Kelly-capped, vol-targeted) within the signal's direction;
    otherwise it is a discrete +1 / -1 / 0.
    """
    config = signal_config or SignalConfig()
    decision_points = [t for t in collect_test_indices(folds) if t + 1 < len(candles)]

    equity = 1.0
    gross_equity = 1.0
    equity_curve = [1.0]
    net_returns: list[float] = []
    n_trades = 0
    total_costs = 0.0
    wins = 0

    prev_position = 0.0
    for t in decision_points:
        context = candles[: t + 1]  # closed candles up to and including bar t
        p_up = forecast_fn(context)
        side = derive_signal(p_up, config)
        if sizing_config is None:
            position = position_for(side)
        elif side == "flat":
            position = 0.0  # honor the threshold's flat band before sizing
        else:
            position = position_fraction(p_up, context, sizing_config)

        cost = 0.0
        if position != prev_position:
            cost = cost_model.cost(position - prev_position)
            total_costs += cost
            n_trades += 1

        bar_return = candles[t + 1].close / candles[t].close - 1.0
        pnl = position * bar_return

        gross_equity *= 1.0 + pnl
        before = equity
        equity *= (1.0 - cost) * (1.0 + pnl)
        net_return = equity / before - 1.0
        net_returns.append(net_return)
        equity_curve.append(equity)
        if net_return > 0:
            wins += 1

        prev_position = position

    n_bars = len(net_returns)
    return BacktestResult(
        n_bars=n_bars,
        n_trades=n_trades,
        total_costs=total_costs,
        final_equity=equity,
        total_return=equity - 1.0,
        gross_return=gross_equity - 1.0,
        sharpe=_sharpe(net_returns),
        max_drawdown=_max_drawdown(equity_curve),
        win_rate=(wins / n_bars) if n_bars else 0.0,
        equity_curve=equity_curve,
    )
