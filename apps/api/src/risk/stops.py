"""Stop-loss / take-profit exit rules for open positions.

The bot manages its own exits with these deterministic rules. They are exit-only
controls (they can force a position flat, never enlarge it) and operate purely on
price vs. the position's entry / best-seen price — no performance-based mutation
of risk limits (invariant 3), no learned/LLM logic in the decision path.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class StopConfig:
    stop_loss_pct: float | None = None  # adverse move from reference that forces exit
    take_profit_pct: float | None = None  # favorable move from entry that books profit
    trailing: bool = False  # if True, the stop trails the best favorable price

    def __post_init__(self) -> None:
        for pct in (self.stop_loss_pct, self.take_profit_pct):
            if pct is not None and not 0.0 < pct <= 1.0:
                raise ValueError("stop/take-profit percentages must be in (0, 1]")


@dataclass
class PositionTracker:
    """Tracks the entry and most-favorable price of one open position."""

    side: int  # +1 long, -1 short
    entry_price: float
    best_price: float  # highest price for a long, lowest for a short

    def update(self, price: float) -> None:
        if self.side > 0:
            self.best_price = max(self.best_price, price)
        else:
            self.best_price = min(self.best_price, price)


def stop_triggered(tracker: PositionTracker, price: float, config: StopConfig) -> str | None:
    """Return "stop_loss" / "take_profit" if `price` breaches a level, else None."""
    if config.stop_loss_pct is not None:
        # A trailing stop measures the adverse move from the best price seen.
        reference = tracker.best_price if config.trailing else tracker.entry_price
        if tracker.side > 0 and price <= reference * (1.0 - config.stop_loss_pct):
            return "stop_loss"
        if tracker.side < 0 and price >= reference * (1.0 + config.stop_loss_pct):
            return "stop_loss"

    if config.take_profit_pct is not None:
        if tracker.side > 0 and price >= tracker.entry_price * (1.0 + config.take_profit_pct):
            return "take_profit"
        if tracker.side < 0 and price <= tracker.entry_price * (1.0 - config.take_profit_pct):
            return "take_profit"

    return None
