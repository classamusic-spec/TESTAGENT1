"""Composable, human-configured trading circuit breakers.

Inspired by freqtrade's protections. Each guard can only *lock* trading (gate
new entries) for a reason; none of them change position-size or drawdown limits
based on performance (invariant 3), and there is no learned/LLM logic. They are
deterministic functions of recent equity and exit history.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Sequence


@dataclass(frozen=True)
class ProtectionConfig:
    cooldown_bars: int = 0  # block new entries for N bars after any exit
    max_drawdown: float | None = None  # lock once drawdown from peak exceeds this fraction
    stoploss_guard_count: int | None = None  # lock after this many stop-losses in the window
    stoploss_guard_window: int = 24
    daily_loss_limit: float | None = None  # lock entries for the day past this loss fraction

    def __post_init__(self) -> None:
        if self.cooldown_bars < 0 or self.stoploss_guard_window < 1:
            raise ValueError("cooldown_bars must be >= 0 and window >= 1")
        for frac in (self.max_drawdown, self.daily_loss_limit):
            if frac is not None and not 0.0 < frac <= 1.0:
                raise ValueError("drawdown / daily-loss limits must be in (0, 1]")


@dataclass(frozen=True)
class ProtectionState:
    bar_index: int
    equity: float
    peak_equity: float
    day_start_equity: float
    last_exit_bar: int | None = None
    recent_stop_bars: Sequence[int] = ()


@dataclass(frozen=True)
class LockDecision:
    locked: bool
    reason: str | None = None


def evaluate_protections(config: ProtectionConfig, state: ProtectionState) -> LockDecision:
    """Return the first triggered guard's lock, else an unlocked decision."""
    if (
        config.cooldown_bars > 0
        and state.last_exit_bar is not None
        and state.bar_index < state.last_exit_bar + config.cooldown_bars
    ):
        return LockDecision(True, "cooldown")

    if config.max_drawdown is not None and state.peak_equity > 0:
        drawdown = (state.peak_equity - state.equity) / state.peak_equity
        if drawdown >= config.max_drawdown:
            return LockDecision(True, f"max drawdown ({drawdown:.1%})")

    if config.stoploss_guard_count is not None:
        window_start = state.bar_index - config.stoploss_guard_window
        recent = sum(1 for b in state.recent_stop_bars if b >= window_start)
        if recent >= config.stoploss_guard_count:
            return LockDecision(True, f"stoploss guard ({recent} stops)")

    if config.daily_loss_limit is not None and state.day_start_equity > 0:
        loss = (state.day_start_equity - state.equity) / state.day_start_equity
        if loss >= config.daily_loss_limit:
            return LockDecision(True, f"daily loss limit ({loss:.1%})")

    return LockDecision(False, None)
