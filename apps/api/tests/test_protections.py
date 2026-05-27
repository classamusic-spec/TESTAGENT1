from __future__ import annotations

import pytest

from src.risk.protections import ProtectionConfig, ProtectionState, evaluate_protections


def _state(**over) -> ProtectionState:
    base = dict(bar_index=100, equity=1000.0, peak_equity=1000.0, day_start_equity=1000.0)
    base.update(over)
    return ProtectionState(**base)


def test_unlocked_by_default() -> None:
    assert evaluate_protections(ProtectionConfig(), _state()).locked is False


def test_cooldown_blocks_then_clears() -> None:
    cfg = ProtectionConfig(cooldown_bars=5)
    assert evaluate_protections(cfg, _state(bar_index=102, last_exit_bar=100)).locked is True
    assert evaluate_protections(cfg, _state(bar_index=105, last_exit_bar=100)).locked is False


def test_max_drawdown_lock() -> None:
    cfg = ProtectionConfig(max_drawdown=0.1)
    assert evaluate_protections(cfg, _state(equity=950, peak_equity=1000)).locked is False
    locked = evaluate_protections(cfg, _state(equity=890, peak_equity=1000))
    assert locked.locked and "drawdown" in locked.reason


def test_stoploss_guard_window() -> None:
    cfg = ProtectionConfig(stoploss_guard_count=3, stoploss_guard_window=24)
    # Three stops inside the 24-bar window -> locked.
    assert evaluate_protections(cfg, _state(bar_index=100, recent_stop_bars=[80, 90, 99])).locked is True
    # Old stops outside the window -> not locked.
    assert evaluate_protections(cfg, _state(bar_index=100, recent_stop_bars=[10, 20, 30])).locked is False


def test_daily_loss_limit() -> None:
    cfg = ProtectionConfig(daily_loss_limit=0.05)
    locked = evaluate_protections(cfg, _state(equity=940, day_start_equity=1000))
    assert locked.locked and "daily loss" in locked.reason


def test_invalid_config() -> None:
    with pytest.raises(ValueError):
        ProtectionConfig(max_drawdown=1.5)
