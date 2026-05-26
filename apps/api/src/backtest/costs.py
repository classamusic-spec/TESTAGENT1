"""Transaction cost model (invariant 9)."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class CostModel:
    """Fees and slippage charged on traded notional, in basis points.

    `cost(turnover)` returns the fractional cost for a given turnover, where
    turnover is the absolute change in position as a fraction of capital
    (e.g. flat->long = 1.0, long->short = 2.0).
    """

    fee_bps: float = 10.0
    slippage_bps: float = 5.0

    def __post_init__(self) -> None:
        if self.fee_bps < 0 or self.slippage_bps < 0:
            raise ValueError("costs must be non-negative")

    @property
    def total_bps(self) -> float:
        return self.fee_bps + self.slippage_bps

    def cost(self, turnover: float) -> float:
        return abs(turnover) * self.total_bps / 10_000.0
