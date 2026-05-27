from __future__ import annotations

from src.risk.state import (
    StateContext,
    TradingState,
    allows_new_entry,
    allows_reduce,
    resolve_trading_state,
)


def test_active_when_clear() -> None:
    assert resolve_trading_state(StateContext(drawdown=0.02, max_drawdown=0.15)) == TradingState.ACTIVE


def test_kill_switch_halts() -> None:
    assert resolve_trading_state(StateContext(kill_switch=True)) == TradingState.HALTED
    assert resolve_trading_state(StateContext(trading_enabled=False)) == TradingState.HALTED


def test_drawdown_breach_reduces() -> None:
    s = resolve_trading_state(StateContext(drawdown=0.16, max_drawdown=0.15))
    assert s == TradingState.REDUCING


def test_protection_lock_reduces() -> None:
    assert resolve_trading_state(StateContext(protection_locked=True)) == TradingState.REDUCING


def test_halt_takes_priority_over_reduce() -> None:
    # Kill switch wins even if a drawdown/protection condition also holds.
    ctx = StateContext(kill_switch=True, drawdown=0.5, max_drawdown=0.1, protection_locked=True)
    assert resolve_trading_state(ctx) == TradingState.HALTED


def test_permissions() -> None:
    assert allows_new_entry(TradingState.ACTIVE) is True
    assert allows_new_entry(TradingState.REDUCING) is False
    assert allows_new_entry(TradingState.HALTED) is False
    assert allows_reduce(TradingState.REDUCING) is True
    assert allows_reduce(TradingState.HALTED) is False
