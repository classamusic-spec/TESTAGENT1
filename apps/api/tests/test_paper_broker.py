from __future__ import annotations

import pytest

from src.backtest.costs import CostModel
from src.execution.models import Portfolio
from src.execution.paper_broker import PaperBroker

PAIR = "ETH/USDC"
NO_COST = CostModel(fee_bps=0, slippage_bps=0)


def _portfolio(cash: float = 10_000.0) -> Portfolio:
    return Portfolio(cash=cash)


def test_open_long_spends_cash_and_sets_position() -> None:
    broker = PaperBroker(NO_COST)
    pf = _portfolio()
    fill = broker.rebalance(pf, PAIR, target_notional=1000.0, mark_price=100.0, ts=1)
    assert fill is not None and fill.side == "buy"
    assert pf.position(PAIR).quantity == pytest.approx(10.0)
    assert pf.position(PAIR).avg_price == pytest.approx(100.0)
    assert pf.cash == pytest.approx(9_000.0)
    assert pf.equity({PAIR: 100.0}) == pytest.approx(10_000.0)


def test_no_trade_when_already_at_target() -> None:
    broker = PaperBroker(NO_COST)
    pf = _portfolio()
    broker.rebalance(pf, PAIR, 1000.0, 100.0, ts=1)
    assert broker.rebalance(pf, PAIR, 1000.0, 100.0, ts=2) is None


def test_partial_close_realizes_pnl() -> None:
    broker = PaperBroker(NO_COST)
    pf = _portfolio()
    broker.rebalance(pf, PAIR, 1000.0, 100.0, ts=1)  # 10 units @ 100
    # Price rose to 120; cut exposure in half (target 600 notional at 120 -> 5 units).
    fill = broker.rebalance(pf, PAIR, 600.0, 120.0, ts=2)
    assert fill is not None and fill.side == "sell"
    assert pf.position(PAIR).quantity == pytest.approx(5.0)
    # Closed 5 units bought at 100, sold at 120 -> +100 realized.
    assert pf.realized_pnl == pytest.approx(100.0)


def test_full_close_flattens_position() -> None:
    broker = PaperBroker(NO_COST)
    pf = _portfolio()
    broker.rebalance(pf, PAIR, 1000.0, 100.0, ts=1)
    broker.rebalance(pf, PAIR, 0.0, 110.0, ts=2)
    assert pf.position(PAIR).quantity == pytest.approx(0.0)
    assert pf.position(PAIR).avg_price == pytest.approx(0.0)
    assert pf.realized_pnl == pytest.approx(100.0)  # 10 units * (110-100)


def test_flip_long_to_short_realizes_then_reopens() -> None:
    broker = PaperBroker(NO_COST)
    pf = _portfolio()
    broker.rebalance(pf, PAIR, 1000.0, 100.0, ts=1)  # +10 units
    fill = broker.rebalance(pf, PAIR, -500.0, 100.0, ts=2)  # target short 5 units
    assert fill is not None
    pos = pf.position(PAIR)
    assert pos.quantity == pytest.approx(-5.0)
    assert pos.avg_price == pytest.approx(100.0)  # new short opened at fill price


def test_slippage_and_fees_are_charged() -> None:
    broker = PaperBroker(CostModel(fee_bps=10, slippage_bps=5))
    pf = _portfolio()
    fill = broker.rebalance(pf, PAIR, 1000.0, 100.0, ts=1)
    assert fill is not None
    assert fill.price > 100.0  # buyer pays slippage
    assert fill.fee == pytest.approx(1000.0 * 10 / 10_000)  # 1.0
    # Cash out = units*fill_price + fee, strictly more than the 1000 notional.
    assert pf.cash < 9_000.0


def test_rejects_non_positive_price() -> None:
    with pytest.raises(ValueError):
        PaperBroker().rebalance(_portfolio(), PAIR, 100.0, 0.0, ts=1)
