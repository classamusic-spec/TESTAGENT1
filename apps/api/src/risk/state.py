"""Trading state machine (NautilusTrader pattern).

A single source of truth for what the bot is allowed to do right now:
- ACTIVE   — may open, increase, reduce, and close.
- REDUCING — close-only: no new or larger positions (used on drawdown breach or a
             tripped protection), but exits/stops still run.
- HALTED   — kill switch / trading disabled: flatten and do nothing else.

This only ever restricts activity; it never widens limits (invariant 3).
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum


class TradingState(str, Enum):
    ACTIVE = "active"
    REDUCING = "reducing"
    HALTED = "halted"


@dataclass(frozen=True)
class StateContext:
    kill_switch: bool = False
    trading_enabled: bool = True
    drawdown: float = 0.0  # current drawdown fraction from peak
    max_drawdown: float = 1.0  # human-set halt threshold
    protection_locked: bool = False  # any tripped protection (cooldown/guard/etc.)


def resolve_trading_state(ctx: StateContext) -> TradingState:
    if ctx.kill_switch or not ctx.trading_enabled:
        return TradingState.HALTED
    if ctx.drawdown >= ctx.max_drawdown or ctx.protection_locked:
        return TradingState.REDUCING
    return TradingState.ACTIVE


def allows_new_entry(state: TradingState) -> bool:
    """True only when the bot may open or increase a position."""
    return state == TradingState.ACTIVE


def allows_reduce(state: TradingState) -> bool:
    """True when the bot may reduce/close (everything except a hard halt flatten)."""
    return state in (TradingState.ACTIVE, TradingState.REDUCING)
