"""Reusable paper-trading comparison harness.

Runs a walk-forward backtest (realistic costs/slippage) over sample candles and
compares configurations — the momentum stub vs. the in-repo trained logistic
forecaster, with/without the pipeline (factors + filters + cost gate) and
Kelly/vol sizing. Prints honest metrics; the validation tooling decides whether
any edge is real (it usually isn't on near-random sample data — that's the point).

Run from apps/api:  python -m scripts.paper_test
"""

from __future__ import annotations

import math
import random

from loguru import logger

from src.backtest.costs import CostModel
from src.backtest.engine import run_backtest
from src.backtest.folds import make_walk_forward_folds
from src.backtest.metrics import calmar_ratio, monte_carlo_drawdown, sortino_ratio
from src.backtest.validation import returns_from_curve, validate_equity_curve
from src.data.ohlcv import Candle
from src.model.forecaster import build_dataset, fit_logistic, make_forecast_fn
from src.signals.factors import FactorConfig
from src.signals.filters import default_filters
from src.signals.sizing import SizingConfig

logger.remove()  # quiet the per-step trade logs

STEP = 3_600_000
COST = CostModel(fee_bps=10, slippage_bps=5)


def make_candles(n: int, seed: int = 7, start: float = 3000.0) -> list[Candle]:
    rng = random.Random(seed)
    out: list[Candle] = []
    price = start
    for i in range(n):
        drift = math.sin(i / 60) * 0.0008 + (rng.random() - 0.49) * 0.012
        o = price
        c = o * (1 + drift)
        wick = o * 0.006 * rng.random()
        out.append(
            Candle(
                open_time=i * STEP, open=o, high=max(o, c) + wick, low=min(o, c) - wick, close=c, volume=1.0 + rng.random(), closed=True
            )
        )
        price = c
    return out


def momentum_forecast(context):  # type: ignore[no-untyped-def]
    if len(context) < 7:
        return 0.5
    r = context[-1].close / context[-7].close - 1.0
    return 1.0 / (1.0 + math.exp(-25.0 * r))


def report(name: str, candles, folds, forecast_fn, **kw) -> None:  # type: ignore[no-untyped-def]
    res = run_backtest(candles, folds, forecast_fn, COST, **kw)
    rets = returns_from_curve(res.equity_curve)
    rep = validate_equity_curve(res.equity_curve, n_resamples=300, seed=1)
    mc = monte_carlo_drawdown(rets, n_paths=400, seed=3) if rets else None
    print(f"\n=== {name} ===")
    print(f"  net {res.total_return * 100:+.2f}%  gross {res.gross_return * 100:+.2f}%  costs {res.total_costs * 100:.2f}%  trades {res.n_trades}  win {res.win_rate * 100:.1f}%")
    print(f"  sharpe {res.sharpe:.3f}  sortino {sortino_ratio(rets):.3f}  maxDD {res.max_drawdown * 100:.2f}%  calmar {calmar_ratio(res.total_return, res.max_drawdown):.2f}")
    if mc:
        print(f"  MC drawdown: median {mc.median * 100:.2f}%  p95 {mc.p95 * 100:.2f}%  worst {mc.worst * 100:.2f}%")
    print(f"  robust? {rep.robust}  (perm p={rep.permutation_pvalue:.3f}, return CI [{rep.total_return_ci.lower * 100:+.2f}%, {rep.total_return_ci.upper * 100:+.2f}%])")


def main() -> None:
    candles = make_candles(600)
    train_size, test_size = 150, 60
    folds = make_walk_forward_folds(len(candles), train_size=train_size, test_size=test_size)
    print(f"Candles: {len(candles)} hourly bars (~{len(candles) / 24:.0f} days). Walk-forward folds: {len(folds)}")

    # Train the logistic forecaster on the initial in-sample window only (every
    # decision point is after it, so there is no look-ahead leakage).
    X, y, keys = build_dataset(candles[:train_size])
    model = fit_logistic(X, y, keys, epochs=400)
    model_fn = make_forecast_fn(model)

    report("Momentum stub — baseline", candles, folds, momentum_forecast)
    report("Momentum stub — pipeline + cost gate + sizing", candles, folds, momentum_forecast,
           factor_config=FactorConfig(), filters=default_filters(), sizing_config=SizingConfig(), cost_filter=True, cost_margin=1.5)
    report("Trained model — baseline", candles, folds, model_fn)
    report("Trained model — pipeline + cost gate + sizing", candles, folds, model_fn,
           factor_config=FactorConfig(), filters=default_filters(), sizing_config=SizingConfig(), cost_filter=True, cost_margin=1.5)


if __name__ == "__main__":
    main()
