from __future__ import annotations

import math

import pytest

from src.backtest.costs import CostModel
from src.backtest.deflated_sharpe import (
    deflated_sharpe_ratio,
    expected_max_sharpe,
    probabilistic_sharpe_ratio,
)
from src.backtest.folds import make_walk_forward_folds
from src.backtest.fold_stats import run_backtest_by_fold, summarize_folds
from src.backtest.sensitivity import cost_sensitivity_curve
from src.data.ohlcv import Candle
from src.signals.sizing import SizingConfig

STEP = 3_600_000


def _candles(closes: list[float]) -> list[Candle]:
    return [
        Candle(open_time=i * STEP, open=c, high=c, low=c, close=c, volume=1.0, closed=True)
        for i, c in enumerate(closes)
    ]


def _trending() -> list[Candle]:
    # A persistent uptrend a momentum forecaster can profit from.
    return _candles([100.0 * (1.01 ** i) for i in range(80)])


def _momentum_forecast(context):
    if len(context) < 2:
        return 0.5
    return 0.8 if context[-1].close >= context[-2].close else 0.2


# --- Probabilistic / Deflated Sharpe ---------------------------------------


def test_psr_increases_with_sharpe_and_n() -> None:
    assert probabilistic_sharpe_ratio(0.3, 100) > probabilistic_sharpe_ratio(0.1, 100)
    assert probabilistic_sharpe_ratio(0.2, 500) > probabilistic_sharpe_ratio(0.2, 50)


def test_expected_max_sharpe_zero_when_no_dispersion() -> None:
    assert expected_max_sharpe([0.2, 0.2, 0.2]) == 0.0
    assert expected_max_sharpe([0.2]) == 0.0


def test_expected_max_grows_with_trials() -> None:
    few = expected_max_sharpe([0.0, 0.1, 0.2, 0.3])
    many = expected_max_sharpe([i * 0.02 for i in range(50)])
    assert many > few > 0


def test_deflation_lowers_confidence_vs_naive_psr() -> None:
    trials = [0.05, 0.1, 0.15, 0.2, 0.4]  # 0.4 is the lucky winner
    naive = probabilistic_sharpe_ratio(0.4, 200)
    deflated = deflated_sharpe_ratio(0.4, trials, 200)
    assert deflated < naive
    assert 0.0 <= deflated <= 1.0


# --- Per-fold stats ---------------------------------------------------------


def test_per_fold_breakdown_and_summary() -> None:
    candles = _trending()
    folds = make_walk_forward_folds(len(candles), train_size=20, test_size=10)
    per_fold = run_backtest_by_fold(candles, folds, _momentum_forecast, CostModel(0, 0))
    assert len(per_fold) == len(folds)

    summary = summarize_folds(per_fold)
    assert summary.n_folds == len(folds)
    assert summary.profitable_fold_fraction > 0.5  # momentum should win most folds in an uptrend
    assert summary.std_sharpe >= 0.0


# --- Cost sensitivity -------------------------------------------------------


def test_cost_sensitivity_monotonic_decay() -> None:
    candles = _trending()
    folds = make_walk_forward_folds(len(candles), train_size=20, test_size=10)
    curve = cost_sensitivity_curve(
        candles, folds, _momentum_forecast, CostModel(fee_bps=10, slippage_bps=5),
        multipliers=(0.0, 1.0, 2.0, 4.0),
    )
    assert [p.multiplier for p in curve] == [0.0, 1.0, 2.0, 4.0]
    # Higher costs never improve net return.
    returns = [p.total_return for p in curve]
    assert all(returns[i] >= returns[i + 1] - 1e-9 for i in range(len(returns) - 1))
    assert curve[0].total_bps == 0.0


def test_sizing_changes_backtest_outcome() -> None:
    # Noisy uptrend so realized vol > 0 and vol-targeting yields a fractional size
    # (a steady trend has ~0 vol, which would saturate the cap and match discrete).
    candles = _candles([100.0 * (1.01 ** i) * (1.0 + 0.02 * (-1) ** i) for i in range(80)])
    folds = make_walk_forward_folds(len(candles), train_size=20, test_size=10)
    sized = run_backtest_by_fold(
        candles, folds, _momentum_forecast, CostModel(0, 0),
        sizing_config=SizingConfig(target_vol=0.005, kelly_fraction=0.5),
    )
    assert len(sized) == len(folds)
    # Sized positions are fractional, so per-bar returns differ from the discrete run.
    discrete = run_backtest_by_fold(candles, folds, _momentum_forecast, CostModel(0, 0))
    assert not math.isclose(sized[0].result.final_equity, discrete[0].result.final_equity)
