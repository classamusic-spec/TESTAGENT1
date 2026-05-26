from __future__ import annotations

import math
from typing import Sequence

import pytest

from src.backtest.costs import CostModel
from src.data.ohlcv import Candle
from src.improve.calibration import calibration_report, collect_predictions
from src.improve.cycle import run_improvement_cycle
from src.improve.gate import (
    MIN_PAPER_DAYS,
    PromotionDecision,
    evaluate_promotion,
    should_rollback,
)
from src.improve.registry import Checkpoint, CheckpointStatus, ModelRegistry
from src.improve.sweep import default_grid, sweep_thresholds
from src.signals.policy import SignalConfig

STEP = 3_600_000


def _candles(closes: Sequence[float]) -> list[Candle]:
    return [
        Candle(open_time=i * STEP, open=c, high=c, low=c, close=c, volume=1.0, closed=True)
        for i, c in enumerate(closes)
    ]


def _trending(n: int = 200) -> list[Candle]:
    closes = [100.0]
    for i in range(1, n):
        closes.append(closes[-1] * (1 + 0.004 + 0.01 * math.sin(i * 0.7)))
    return _candles(closes)


def _momentum(context: Sequence[Candle]) -> float:
    if len(context) < 6:
        return 0.5
    r = context[-1].close / context[-6].close - 1
    return 1 / (1 + math.exp(-30 * r))


# --- sweep (improves off historical data, signal thresholds only) -----------


def test_sweep_only_searches_signal_thresholds_not_risk_limits() -> None:
    result = sweep_thresholds(
        _trending(), _momentum, CostModel(), train_size=80, test_size=40
    )
    # Every searched candidate is a SignalConfig (thresholds), never a risk limit.
    assert all(isinstance(cfg, SignalConfig) for cfg, _ in result.results)
    assert result.results, "sweep produced no results"


def test_sweep_picks_the_highest_sharpe_config() -> None:
    result = sweep_thresholds(
        _trending(), _momentum, CostModel(), train_size=80, test_size=40
    )
    best_sharpe = max(r.sharpe for _, r in result.results)
    assert result.best_result.sharpe == best_sharpe
    assert result.best_config in default_grid()


# --- calibration ------------------------------------------------------------


def test_calibration_low_error_when_well_calibrated() -> None:
    # Outcomes match probabilities: p=0.0 never up, p=1.0 always up.
    preds = [(0.0, False)] * 50 + [(1.0, True)] * 50
    report = calibration_report(preds, n_bins=10)
    assert report.expected_calibration_error < 0.01
    assert report.brier_score < 0.01
    assert report.n == 100


def test_calibration_high_error_when_miscalibrated() -> None:
    # Confidently wrong: predicts up with high prob but it never happens.
    preds = [(0.9, False)] * 100
    report = calibration_report(preds, n_bins=10)
    assert report.expected_calibration_error > 0.5


def test_collect_predictions_uses_only_past() -> None:
    candles = _candles([100 + i for i in range(20)])
    preds = collect_predictions(candles, _momentum, start=6)
    assert len(preds) == len(candles) - 1 - 6
    assert all(0.0 <= p <= 1.0 for p, _ in preds)


# --- promotion gate (invariants 6 & 7) --------------------------------------


def test_gate_holds_candidate_without_14_day_paper_validation() -> None:
    candidate = Checkpoint("v2", backtest_sharpe=2.0, paper_days=3)
    incumbent = Checkpoint("v1", backtest_sharpe=1.0)
    decision, reason = evaluate_promotion(candidate, incumbent)
    assert decision is PromotionDecision.HOLD
    assert "paper validation" in reason


def test_gate_rejects_candidate_not_beating_incumbent() -> None:
    candidate = Checkpoint("v2", backtest_sharpe=0.5, paper_days=30)
    incumbent = Checkpoint("v1", backtest_sharpe=1.0)
    decision, _ = evaluate_promotion(candidate, incumbent)
    assert decision is PromotionDecision.REJECT


def test_gate_eligible_only_after_backtest_and_paper_validation() -> None:
    candidate = Checkpoint("v2", backtest_sharpe=2.0, paper_days=MIN_PAPER_DAYS, paper_sharpe=1.5)
    incumbent = Checkpoint("v1", backtest_sharpe=1.0, paper_sharpe=1.2)
    decision, reason = evaluate_promotion(candidate, incumbent)
    assert decision is PromotionDecision.PROMOTE_ELIGIBLE
    assert "human approval" in reason


def test_auto_rollback_when_live_drops_below_paper_baseline() -> None:
    assert should_rollback(live_sharpe=0.4, paper_baseline_sharpe=1.0) is True
    assert should_rollback(live_sharpe=1.1, paper_baseline_sharpe=1.0) is False


def test_registry_set_live_demotes_previous() -> None:
    reg = ModelRegistry()
    reg.register(Checkpoint("v1", backtest_sharpe=1.0))
    reg.register(Checkpoint("v2", backtest_sharpe=2.0))
    reg.set_live("v1")
    reg.set_live("v2")
    assert reg.current_live().version == "v2"
    assert reg.checkpoints["v1"].status is CheckpointStatus.ROLLED_BACK


# --- full cycle -------------------------------------------------------------


def test_cycle_produces_candidate_but_never_auto_promotes() -> None:
    reg = ModelRegistry()
    # Incumbent is weak, so the candidate clears the backtest gate but is then
    # held for the 14-day paper validation — proving it is never auto-promoted.
    reg.register(Checkpoint("v1", backtest_sharpe=-10.0))
    reg.set_live("v1")

    report = run_improvement_cycle(
        version="v2",
        candles=_trending(),
        forecast_fn=_momentum,
        registry=reg,
        train_size=80,
        test_size=40,
    )

    assert report.candidate_version == "v2"
    assert isinstance(report.best_config, SignalConfig)
    assert report.calibration.n > 0
    # New candidate has 0 paper days, so it is held — never auto-promoted to live.
    assert report.decision is PromotionDecision.HOLD
    assert reg.current_live().version == "v1"
    assert reg.checkpoints["v2"].status is CheckpointStatus.CANDIDATE


def test_cycle_requires_enough_data() -> None:
    reg = ModelRegistry()
    with pytest.raises(ValueError):
        run_improvement_cycle(
            version="v2",
            candles=_candles([100, 101, 102]),
            forecast_fn=_momentum,
            registry=reg,
            train_size=80,
            test_size=40,
        )
