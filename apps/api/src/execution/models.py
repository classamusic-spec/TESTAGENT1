"""Portfolio and fill models for paper trading."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Mapping


@dataclass
class Position:
    pair: str
    quantity: float = 0.0  # signed base units (negative = short)
    avg_price: float = 0.0  # average entry price of the open position


@dataclass(frozen=True)
class Fill:
    ts: int
    pair: str
    side: str  # "buy" | "sell"
    quantity: float  # absolute base units traded
    price: float  # fill price including slippage
    fee: float  # quote currency paid in fees
    notional: float  # signed quote delta at mark (positive = increased exposure to long)
    realized_pnl: float  # quote PnL realized by this fill (from closing exposure)


@dataclass
class Portfolio:
    cash: float  # quote currency (USDC)
    positions: dict[str, Position] = field(default_factory=dict)
    realized_pnl: float = 0.0

    def position(self, pair: str) -> Position:
        return self.positions.setdefault(pair, Position(pair=pair))

    def equity(self, prices: Mapping[str, float]) -> float:
        """Total mark-to-market value: cash + value of all open positions."""
        value = self.cash
        for pair, pos in self.positions.items():
            if pos.quantity != 0.0:
                value += pos.quantity * prices[pair]
        return value
