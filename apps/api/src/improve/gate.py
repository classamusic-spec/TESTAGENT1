"""Promotion gate and auto-rollback (invariants 6 & 7).

Promotion to live is never automatic: a candidate must beat the current live
checkpoint on walk-forward backtest AND complete >=14 days of paper validation,
after which it is merely PROMOTE_ELIGIBLE — the actual switch happens through git
and human review (invariant 6). Rollback, the safe direction, is automatic.
"""

from __future__ import annotations

from enum import Enum

from src.improve.registry import Checkpoint

MIN_PAPER_DAYS = 14  # invariant 7


class PromotionDecision(str, Enum):
    PROMOTE_ELIGIBLE = "promote_eligible"  # passed all gates; awaiting human approval
    HOLD = "hold"  # still validating
    REJECT = "reject"  # does not improve on the incumbent


def evaluate_promotion(
    candidate: Checkpoint,
    incumbent: Checkpoint | None,
    min_paper_days: int = MIN_PAPER_DAYS,
) -> tuple[PromotionDecision, str]:
    if incumbent is not None and candidate.backtest_sharpe <= incumbent.backtest_sharpe:
        return PromotionDecision.REJECT, "does not beat current live on walk-forward backtest"

    if candidate.paper_days < min_paper_days:
        return (
            PromotionDecision.HOLD,
            f"needs {min_paper_days}d paper validation (has {candidate.paper_days}d)",
        )

    if (
        incumbent is not None
        and candidate.paper_sharpe is not None
        and incumbent.paper_sharpe is not None
        and candidate.paper_sharpe < incumbent.paper_sharpe
    ):
        return PromotionDecision.REJECT, "underperforms current live in paper validation"

    return (
        PromotionDecision.PROMOTE_ELIGIBLE,
        "passed backtest + paper validation; awaiting human approval (invariant 6)",
    )


def should_rollback(live_sharpe: float, paper_baseline_sharpe: float, tolerance: float = 0.0) -> bool:
    """Auto-rollback if live performance drops below the paper baseline (invariant 7)."""
    return live_sharpe < paper_baseline_sharpe - tolerance
