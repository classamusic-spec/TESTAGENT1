from __future__ import annotations

import pytest

from src.backtest.costs import CostModel
from src.execution.loop import PaperSession
from src.execution.models import Portfolio
from src.execution.paper_broker import PaperBroker
from src.ops.alerts import alerts
from src.ops.control import control
from src.ops.notify import NotificationPrefs, notifier
from src.risk.manager import RiskLimits, RiskManager

PAIR = "ETH/USDC"


@pytest.fixture(autouse=True)
def _reset_ops():
    control.resume()
    alerts.clear()
    notifier.prefs = NotificationPrefs()
    notifier.sent.clear()
    yield
    control.resume()
    alerts.clear()
    notifier.prefs = NotificationPrefs()
    notifier.sent.clear()


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


def test_notifier_silent_when_no_channels_enabled() -> None:
    alerts.emit("drawdown_halt", "halt", severity="critical")
    assert notifier.sent == []


def test_notifier_delivers_to_enabled_channels() -> None:
    notifier.prefs.email = "owner@example.com"
    notifier.prefs.email_enabled = True
    notifier.prefs.push_enabled = True
    alerts.emit("drawdown_halt", "20% drawdown", severity="critical")
    channels = {n.channel for n in notifier.sent}
    assert channels == {"email", "push"}
    assert notifier.sent[0].target == "owner@example.com"


def test_notifier_respects_event_opt_out() -> None:
    notifier.prefs.push_enabled = True
    notifier.prefs.events["trade_fill"] = False
    alerts.emit("trade_fill", "bought ETH", severity="info")
    assert notifier.sent == []


def test_notifier_unknown_kind_defaults_to_delivered() -> None:
    notifier.prefs.push_enabled = True
    alerts.emit("brand_new_kind", "hi", severity="info")
    assert len(notifier.sent) == 1
