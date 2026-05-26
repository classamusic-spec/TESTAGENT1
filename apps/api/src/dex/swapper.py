"""DexSwapper: resolve a pair + side into a slippage-protected swap transaction.

Construction calls `assert_testnet`, so a swapper can never be built for mainnet
during development. Broadcasting requires an injected TxSender; building the
transaction does not.
"""

from __future__ import annotations

from typing import Literal, Protocol

from src.dex.aggregator import DexAggregator
from src.dex.chains import assert_testnet
from src.dex.models import SwapTransaction
from src.dex.tokens import resolve_pair

Side = Literal["buy", "sell"]


class TxSender(Protocol):
    def send(self, tx: SwapTransaction) -> str: ...  # returns the tx hash


class DexSwapper:
    def __init__(
        self,
        chain_id: int,
        aggregator: DexAggregator,
        sender: TxSender | None = None,
    ) -> None:
        self.chain = assert_testnet(chain_id)  # refuses mainnet at construction
        self.aggregator = aggregator
        self.sender = sender

    def build(
        self,
        pair: str,
        side: Side,
        amount_in: int,
        recipient: str,
        slippage_bps: int = 50,
    ) -> SwapTransaction:
        base, quote = resolve_pair(self.chain.chain_id, pair)
        # Buying the base spends quote (e.g. USDC -> WETH); selling does the reverse.
        token_in, token_out = (quote, base) if side == "buy" else (base, quote)
        return self.aggregator.build_swap(
            self.chain.chain_id, token_in, token_out, amount_in, recipient, slippage_bps
        )

    def execute(
        self,
        pair: str,
        side: Side,
        amount_in: int,
        recipient: str,
        slippage_bps: int = 50,
    ) -> str:
        if self.sender is None:
            raise RuntimeError("DexSwapper has no TxSender; cannot broadcast")
        tx = self.build(pair, side, amount_in, recipient, slippage_bps)
        return self.sender.send(tx)
