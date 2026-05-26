"""Risk limits and the manager that enforces them (invariant 3)."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class RiskLimits:
    max_position_size: float  # max absolute notional per position (quote)
    max_drawdown: float  # halt threshold as a fraction in (0, 1]
    trading_enabled: bool = True

    def __post_init__(self) -> None:
        if self.max_position_size <= 0:
            raise ValueError("max_position_size must be > 0")
        if not 0.0 < self.max_drawdown <= 1.0:
            raise ValueError("max_drawdown must be in (0, 1]")


@dataclass(frozen=True)
class RiskDecision:
    approved_notional: float
    halted: bool
    reason: str | None = None


class RiskManager:
    """Enforces human-set limits. It can only clamp or halt, never widen limits."""

    def __init__(self, limits: RiskLimits) -> None:
        self._limits = limits

    @property
    def limits(self) -> RiskLimits:
        return self._limits

    def evaluate(
        self, desired_notional: float, equity: float, peak_equity: float
    ) -> RiskDecision:
        if not self._limits.trading_enabled:
            return RiskDecision(0.0, halted=True, reason="trading disabled")

        drawdown = (peak_equity - equity) / peak_equity if peak_equity > 0 else 0.0
        if drawdown >= self._limits.max_drawdown:
            return RiskDecision(
                0.0, halted=True, reason=f"max drawdown breached ({drawdown:.1%})"
            )

        cap = self._limits.max_position_size
        approved = max(-cap, min(cap, desired_notional))
        return RiskDecision(approved, halted=False, reason=None)
