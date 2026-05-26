from __future__ import annotations

import pytest

from src.risk.stops import PositionTracker, StopConfig, stop_triggered


def test_invalid_pct_rejected() -> None:
    with pytest.raises(ValueError):
        StopConfig(stop_loss_pct=0.0)
    with pytest.raises(ValueError):
        StopConfig(take_profit_pct=1.5)


def test_long_stop_loss_triggers() -> None:
    tracker = PositionTracker(side=1, entry_price=100.0, best_price=100.0)
    cfg = StopConfig(stop_loss_pct=0.05)
    assert stop_triggered(tracker, 96.0, cfg) is None  # -4%, within stop
    assert stop_triggered(tracker, 95.0, cfg) == "stop_loss"  # -5%, hit


def test_short_stop_loss_triggers() -> None:
    tracker = PositionTracker(side=-1, entry_price=100.0, best_price=100.0)
    cfg = StopConfig(stop_loss_pct=0.05)
    assert stop_triggered(tracker, 104.0, cfg) is None
    assert stop_triggered(tracker, 105.0, cfg) == "stop_loss"  # price up 5% hurts a short


def test_take_profit_triggers() -> None:
    long = PositionTracker(side=1, entry_price=100.0, best_price=120.0)
    short = PositionTracker(side=-1, entry_price=100.0, best_price=80.0)
    cfg = StopConfig(take_profit_pct=0.10)
    assert stop_triggered(long, 112.0, cfg) == "take_profit"
    assert stop_triggered(short, 88.0, cfg) == "take_profit"
    assert stop_triggered(long, 108.0, cfg) is None


def test_trailing_stop_uses_best_price() -> None:
    tracker = PositionTracker(side=1, entry_price=100.0, best_price=100.0)
    cfg = StopConfig(stop_loss_pct=0.05, trailing=True)
    # Run up to 120, trailing stop now sits at 114.
    tracker.update(120.0)
    assert stop_triggered(tracker, 115.0, cfg) is None
    assert stop_triggered(tracker, 114.0, cfg) == "stop_loss"
    # A non-trailing stop from entry (100) would not have fired at 114.
    assert stop_triggered(tracker, 114.0, StopConfig(stop_loss_pct=0.05)) is None


def test_no_config_no_trigger() -> None:
    tracker = PositionTracker(side=1, entry_price=100.0, best_price=100.0)
    assert stop_triggered(tracker, 1.0, StopConfig()) is None
