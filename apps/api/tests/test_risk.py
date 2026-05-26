from __future__ import annotations

import dataclasses

import pytest

from src.risk.manager import RiskLimits, RiskManager


def test_invalid_limits_raise() -> None:
    with pytest.raises(ValueError):
        RiskLimits(max_position_size=0, max_drawdown=0.2)
    with pytest.raises(ValueError):
        RiskLimits(max_position_size=500, max_drawdown=0)
    with pytest.raises(ValueError):
        RiskLimits(max_position_size=500, max_drawdown=1.5)


def test_clamps_to_max_position_size() -> None:
    mgr = RiskManager(RiskLimits(max_position_size=500, max_drawdown=0.2))
    assert mgr.evaluate(2000.0, equity=1000, peak_equity=1000).approved_notional == 500.0
    assert mgr.evaluate(-2000.0, equity=1000, peak_equity=1000).approved_notional == -500.0
    assert mgr.evaluate(300.0, equity=1000, peak_equity=1000).approved_notional == 300.0


def test_halts_when_trading_disabled() -> None:
    mgr = RiskManager(RiskLimits(max_position_size=500, max_drawdown=0.2, trading_enabled=False))
    decision = mgr.evaluate(300.0, equity=1000, peak_equity=1000)
    assert decision.halted
    assert decision.approved_notional == 0.0


def test_halts_on_drawdown_breach() -> None:
    mgr = RiskManager(RiskLimits(max_position_size=500, max_drawdown=0.15))
    # 20% drawdown from peak exceeds the 15% limit.
    decision = mgr.evaluate(300.0, equity=800, peak_equity=1000)
    assert decision.halted
    assert decision.approved_notional == 0.0
    assert "drawdown" in (decision.reason or "")


def test_limits_are_immutable_invariant_3() -> None:
    limits = RiskLimits(max_position_size=500, max_drawdown=0.2)
    with pytest.raises(dataclasses.FrozenInstanceError):
        limits.max_position_size = 5000  # type: ignore[misc]
    # The manager exposes no setter to widen limits.
    assert not hasattr(RiskManager(limits), "set_limits")
