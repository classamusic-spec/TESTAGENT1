"""DEX swap data models."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class SwapQuote:
    chain_id: int
    token_in: str
    token_out: str
    amount_in: int  # smallest units of token_in
    amount_out: int  # expected smallest units of token_out


@dataclass(frozen=True)
class SwapTransaction:
    chain_id: int
    to: str  # router / aggregator contract
    data: str  # 0x-prefixed calldata
    value: int  # native value to send (wei)
    amount_in: int
    min_amount_out: int  # slippage-protected floor
