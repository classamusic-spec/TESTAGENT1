from __future__ import annotations

import pytest

from src.backtest.costs import CostModel
from src.execution.loop import PaperSession
from src.execution.models import Portfolio
from src.execution.paper_broker import PaperBroker
from src.ops.alerts import alerts
from src.ops.control import control
from src.risk.manager import RiskLimits, RiskManager

PAIR = "ETH/USDC"


@pytest.fixture(autouse=True)
def _reset_ops():
    control.resume()
    alerts.clear()
    yield
    control.resume()
    alerts.clear()


def _session() -> PaperSession:
    return PaperSession(
        portfolio=Portfolio(cash=10_000.0),
        risk=RiskManager(RiskLimits(max_position_size=1000, max_drawdown=0.5)),
        broker=PaperBroker(CostModel(fee_bps=0, slippage_bps=0)),
    )


def test_kill_switch_flattens_and_blocks_opening() -> None:
    session = _session()
    session.step(PAIR, mark_price=100.0, p_up=0.9, ts=1)  # long
    assert session.portfolio.position(PAIR).quantity > 0

    control.halt("test stop")
    result = session.step(PAIR, mark_price=100.0, p_up=0.9, ts=2)
    assert result.halted
    assert result.target_notional == 0.0
    assert session.portfolio.position(PAIR).quantity == pytest.approx(0.0)  # flattened


def test_kill_switch_keeps_positions_closed_while_halted() -> None:
    session = _session()
    control.halt()
    result = session.step(PAIR, mark_price=100.0, p_up=0.95, ts=1)
    assert result.target_notional == 0.0
    assert session.portfolio.position(PAIR).quantity == pytest.approx(0.0)


def test_drawdown_halt_emits_alert() -> None:
    session = PaperSession(
        portfolio=Portfolio(cash=1000.0),
        risk=RiskManager(RiskLimits(max_position_size=1000, max_drawdown=0.1)),
        broker=PaperBroker(CostModel(fee_bps=0, slippage_bps=0)),
    )
    session.step(PAIR, mark_price=100.0, p_up=0.9, ts=1)  # fully invested long
    session.step(PAIR, mark_price=80.0, p_up=0.9, ts=2)  # 20% drawdown -> halt
    kinds = [a.kind for a in alerts.recent()]
    assert "drawdown_halt" in kinds


def test_alert_sink_records_recent() -> None:
    alerts.emit("test", "hello", severity="info")
    recent = alerts.recent()
    assert recent[0].kind == "test"
    assert recent[0].message == "hello"
