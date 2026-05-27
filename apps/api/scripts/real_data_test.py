"""Run the $5,000 paper-trading comparison on REAL Binance OHLCV.

Reads cached historical candles (downloaded once from cryptodatadownload.com — a
static CSV, not a live exchange API) and runs the same walk-forward comparison as
scripts.paper_test: momentum stub vs. the trained logistic forecaster, with the
full pipeline (factors + filters + cost gate) and Kelly/vol sizing.

Usage (from apps/api):  python -m scripts.real_data_test ETHUSDT 2000
"""

from __future__ import annotations

import csv
import sys

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

logger.remove()
COST = CostModel(fee_bps=10, slippage_bps=5)
DEPOSIT = 5000.0


def load_candles(symbol: str, limit: int) -> list[Candle]:
    """Load the most recent `limit` hourly candles from the cached CSV."""
    path = f"data_cache/{symbol}_1h.csv"
    rows: list[Candle] = []
    with open(path, newline="") as f:
        reader = csv.reader(f)
        next(reader, None)  # site URL line
        next(reader, None)  # column header
        for r in reader:
            # unix, date, symbol, open, high, low, close, vol_base, vol_quote, trades
            try:
                rows.append(
                    Candle(
                        open_time=int(float(r[0])),
                        open=float(r[3]),
                        high=float(r[4]),
                        low=float(r[5]),
                        close=float(r[6]),
                        volume=float(r[7]),
                        closed=True,
                    )
                )
            except (ValueError, IndexError):
                continue
    rows.sort(key=lambda c: c.open_time)  # CSV is newest-first
    return rows[-limit:]


def report(name: str, candles, folds, forecast_fn, **kw) -> None:  # type: ignore[no-untyped-def]
    res = run_backtest(candles, folds, forecast_fn, COST, **kw)
    rets = returns_from_curve(res.equity_curve)
    rep = validate_equity_curve(res.equity_curve, n_resamples=300, seed=1)
    mc = monte_carlo_drawdown(rets, n_paths=300, seed=3) if rets else None
    bal = DEPOSIT * (1 + res.total_return)
    profit = bal - DEPOSIT
    days = res.n_bars / 24 if res.n_bars else 1
    daily = ((bal / DEPOSIT) ** (1 / days) - 1) * 100 if days else 0.0
    print(f"\n=== {name} ===")
    print(f"  balance ${bal:,.2f}  profit {profit:+,.2f} ({res.total_return * 100:+.2f}%)  avg/day {daily:+.3f}%")
    print(f"  trades {res.n_trades}  win {res.win_rate * 100:.1f}%  sharpe {res.sharpe:.3f}  sortino {sortino_ratio(rets):.3f}")
    print(f"  maxDD {res.max_drawdown * 100:.2f}%  calmar {calmar_ratio(res.total_return, res.max_drawdown):.2f}", end="")
    if mc:
        print(f"  MC-DD p95 {mc.p95 * 100:.2f}%")
    print(f"  robust? {rep.robust}  (perm p={rep.permutation_pvalue:.3f}, CI [{rep.total_return_ci.lower * 100:+.2f}%, {rep.total_return_ci.upper * 100:+.2f}%])")


def main() -> None:
    symbol = sys.argv[1] if len(sys.argv) > 1 else "ETHUSDT"
    limit = int(sys.argv[2]) if len(sys.argv) > 2 else 2000
    candles = load_candles(symbol, limit)
    train_size, test_size = limit // 4, limit // 8
    folds = make_walk_forward_folds(len(candles), train_size=train_size, test_size=test_size)
    span_days = len(candles) / 24
    print(f"REAL DATA: {symbol} — {len(candles)} hourly bars (~{span_days:.0f} days), {len(folds)} walk-forward folds")
    print(f"Deposit ${DEPOSIT:,.0f} · fees {COST.fee_bps}bps + slippage {COST.slippage_bps}bps")

    X, y, keys = build_dataset(candles[:train_size])
    model = fit_logistic(X, y, keys, epochs=400)
    model_fn = make_forecast_fn(model)

    def momentum(ctx):  # type: ignore[no-untyped-def]
        import math

        if len(ctx) < 7:
            return 0.5
        return 1.0 / (1.0 + math.exp(-25.0 * (ctx[-1].close / ctx[-7].close - 1.0)))

    report("Momentum stub — baseline", candles, folds, momentum)
    report("Trained model — baseline", candles, folds, model_fn)
    report("Trained model — full pipeline + cost gate + sizing", candles, folds, model_fn,
           factor_config=FactorConfig(), filters=default_filters(), sizing_config=SizingConfig(), cost_filter=True, cost_margin=1.5)


if __name__ == "__main__":
    main()
