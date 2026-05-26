"""Simulated (paper) broker.

Rebalances a position toward a target notional, modeling slippage on the fill
price and fees on traded notional (invariant 9). It never touches real funds —
this is paper mode only (invariant 2).
"""

from __future__ import annotations

from src.backtest.costs import CostModel
from src.execution.models import Fill, Portfolio, Position

_EPSILON = 1e-9


def _apply_fill(pos: Position, traded_qty: float, fill_price: float) -> float:
    """Apply a signed traded quantity to a position; return realized PnL."""
    old_qty = pos.quantity
    new_qty = old_qty + traded_qty
    realized = 0.0

    opening_or_adding = old_qty == 0.0 or (old_qty > 0) == (traded_qty > 0)
    if opening_or_adding:
        total_units = abs(old_qty) + abs(traded_qty)
        pos.avg_price = (
            (abs(old_qty) * pos.avg_price + abs(traded_qty) * fill_price) / total_units
            if total_units > 0
            else 0.0
        )
        pos.quantity = new_qty
        return realized

    # Reducing or flipping: realize PnL on the closed portion.
    closing = min(abs(traded_qty), abs(old_qty))
    direction = 1.0 if old_qty > 0 else -1.0
    realized = closing * (fill_price - pos.avg_price) * direction

    pos.quantity = new_qty
    if abs(traded_qty) <= abs(old_qty):
        if abs(new_qty) < _EPSILON:
            pos.quantity = 0.0
            pos.avg_price = 0.0
    else:
        # Flipped past flat: the remainder opens a new position at the fill price.
        pos.avg_price = fill_price
    return realized


class PaperBroker:
    mode = "paper"

    def __init__(self, cost_model: CostModel | None = None) -> None:
        self.cost_model = cost_model or CostModel()

    def rebalance(
        self,
        portfolio: Portfolio,
        pair: str,
        target_notional: float,
        mark_price: float,
        ts: int,
    ) -> Fill | None:
        """Trade toward `target_notional` (signed quote exposure) at `mark_price`."""
        if mark_price <= 0:
            raise ValueError("mark_price must be positive")

        pos = portfolio.position(pair)
        current_notional = pos.quantity * mark_price
        delta_notional = target_notional - current_notional
        if abs(delta_notional) < _EPSILON:
            return None

        side = "buy" if delta_notional > 0 else "sell"
        slip = self.cost_model.slippage_bps / 10_000.0
        fill_price = mark_price * (1 + slip) if side == "buy" else mark_price * (1 - slip)
        fee = abs(delta_notional) * self.cost_model.fee_bps / 10_000.0

        traded_qty = delta_notional / mark_price  # signed base units
        realized = _apply_fill(pos, traded_qty, fill_price)

        portfolio.cash += -(traded_qty * fill_price) - fee
        portfolio.realized_pnl += realized

        return Fill(
            ts=ts,
            pair=pair,
            side=side,
            quantity=abs(traded_qty),
            price=fill_price,
            fee=fee,
            notional=delta_notional,
            realized_pnl=realized,
        )
