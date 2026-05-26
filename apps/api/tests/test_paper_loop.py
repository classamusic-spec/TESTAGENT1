from __future__ import annotations

import pytest

from src.backtest.costs import CostModel
from src.execution.loop import PaperSession
from src.execution.models import Portfolio
from src.execution.paper_broker import PaperBroker
from src.risk.manager import RiskLimits, RiskManager
from src.signals.policy import SignalConfig

PAIR = "ETH/USDC"


def _session(*, max_dd: float = 0.5, enabled: bool = True, cash: float = 10_000.0) -> PaperSession:
    return PaperSession(
        portfolio=Portfolio(cash=cash),
        risk=RiskManager(RiskLimits(max_position_size=1000, max_drawdown=max_dd, trading_enabled=enabled)),
        broker=PaperBroker(CostModel(fee_bps=0, slippage_bps=0)),
        signal_config=SignalConfig(),
    )


def test_flat_signal_never_trades() -> None:
    session = _session()
    for ts in range(5):
        result = session.step(PAIR, mark_price=100.0, p_up=0.5, ts=ts)
        assert result.signal == "flat"
        assert result.fill is None
    assert session.portfolio.position(PAIR).quantity == 0.0


def test_bullish_forecast_opens_long_and_tracks_price() -> None:
    session = _session()
    open_step = session.step(PAIR, mark_price=100.0, p_up=0.8, ts=1)
    assert open_step.signal == "long"
    assert open_step.target_notional == 1000.0
    assert session.portfolio.position(PAIR).quantity == pytest.approx(10.0)

    # Price rises 10%. The strategy targets a constant $1000 notional, so it
    # trims the position back toward target — and equity reflects the gain.
    hold_step = session.step(PAIR, mark_price=110.0, p_up=0.8, ts=2)
    assert hold_step.fill is not None and hold_step.fill.side == "sell"
    pos_notional = session.portfolio.position(PAIR).quantity * 110.0
    assert pos_notional == pytest.approx(1000.0)
    assert hold_step.equity > 10_000.0


def test_drawdown_breach_halts_and_forces_flat() -> None:
    # Fully invested: $1000 cash, $1000 max position, so price moves hit equity hard.
    session = _session(max_dd=0.1, cash=1000.0)
    session.step(PAIR, mark_price=100.0, p_up=0.8, ts=1)  # long 10 units, cash -> 0
    # Price crashes 20% -> 20% portfolio drawdown, beyond the 10% limit.
    crash = session.step(PAIR, mark_price=80.0, p_up=0.8, ts=2)
    assert crash.halted
    assert crash.target_notional == 0.0
    # Position is flattened by the forced rebalance to zero.
    assert session.portfolio.position(PAIR).quantity == pytest.approx(0.0)


def test_disabled_trading_keeps_everything_flat() -> None:
    session = _session(enabled=False)
    result = session.step(PAIR, mark_price=100.0, p_up=0.9, ts=1)
    assert result.halted
    assert result.fill is None
    assert session.portfolio.position(PAIR).quantity == 0.0


def test_session_requires_paper_broker() -> None:
    class LiveBroker:
        mode = "live"

    with pytest.raises(ValueError):
        PaperSession(
            portfolio=Portfolio(cash=1000.0),
            risk=RiskManager(RiskLimits(max_position_size=100, max_drawdown=0.2)),
            broker=LiveBroker(),  # type: ignore[arg-type]
        )
