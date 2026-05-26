"""The weekly self-improvement cycle.

Runs entirely on historical data and walk-forward backtests — it does not depend
on paper-trade results. It produces a validated candidate and a promotion
decision; it never deploys. Fine-tuning the Kronos checkpoint itself is the GPU
side (apps/ml) and plugs in via `forecast_fn`.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Sequence

from loguru import logger

from src.backtest.costs import CostModel
from src.backtest.engine import ForecastFn
from src.data.ohlcv import Candle
from src.improve.calibration import CalibrationReport, calibration_report, collect_predictions
from src.improve.gate import PromotionDecision, evaluate_promotion
from src.improve.registry import Checkpoint, ModelRegistry
from src.improve.sweep import SweepResult, sweep_thresholds
from src.signals.policy import SignalConfig


@dataclass(frozen=True)
class ImprovementReport:
    candidate_version: str
    best_config: SignalConfig
    backtest_sharpe: float
    calibration: CalibrationReport
    decision: PromotionDecision
    reason: str


def run_improvement_cycle(
    *,
    version: str,
    candles: Sequence[Candle],
    forecast_fn: ForecastFn,
    registry: ModelRegistry,
    cost_model: CostModel | None = None,
    train_size: int = 100,
    test_size: int = 50,
) -> ImprovementReport:
    costs = cost_model or CostModel()

    sweep: SweepResult = sweep_thresholds(
        candles, forecast_fn, costs, train_size=train_size, test_size=test_size
    )
    predictions = collect_predictions(candles, forecast_fn, start=train_size)
    calibration = calibration_report(predictions)

    candidate = Checkpoint(version=version, backtest_sharpe=sweep.best_result.sharpe)
    registry.register(candidate)

    # Candidate has 0 paper days at creation, so the gate will HOLD for paper
    # validation (invariant 7). Nothing is deployed here (invariant 6).
    decision, reason = evaluate_promotion(candidate, registry.current_live())

    logger.info(
        "improvement cycle {}: best_sharpe={:.3f} ece={:.3f} decision={}",
        version,
        sweep.best_result.sharpe,
        calibration.expected_calibration_error,
        decision.value,
    )

    return ImprovementReport(
        candidate_version=version,
        best_config=sweep.best_config,
        backtest_sharpe=sweep.best_result.sharpe,
        calibration=calibration,
        decision=decision,
        reason=reason,
    )
