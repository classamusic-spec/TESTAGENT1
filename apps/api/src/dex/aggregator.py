"""DEX aggregator interface and the 1inch implementation (mainnet-class chains).

1inch does not serve testnets, so this adapter is for the eventual mainnet phase
(Phase 10). The testnet path uses UniswapV3Aggregator. Both satisfy the same
DexAggregator protocol so the swapper is agnostic.
"""

from __future__ import annotations

from typing import Protocol

import httpx

from src.dex.models import SwapQuote, SwapTransaction
from src.dex.tokens import Token


class DexAggregator(Protocol):
    def quote(self, chain_id: int, token_in: Token, token_out: Token, amount_in: int) -> SwapQuote: ...

    def build_swap(
        self,
        chain_id: int,
        token_in: Token,
        token_out: Token,
        amount_in: int,
        recipient: str,
        slippage_bps: int,
    ) -> SwapTransaction: ...


class OneInchAggregator:
    """1inch Aggregation Protocol v6. Mainnet-class chains only (not testnets)."""

    BASE_URL = "https://api.1inch.dev/swap/v6.0"
    SUPPORTED_CHAINS = frozenset({1, 8453, 137, 42161, 10, 56})

    def __init__(self, api_key: str, client: httpx.Client | None = None) -> None:
        self._api_key = api_key
        self._client = client or httpx.Client(timeout=20.0)

    def _headers(self) -> dict[str, str]:
        return {"Authorization": f"Bearer {self._api_key}"}

    def _check_chain(self, chain_id: int) -> None:
        if chain_id not in self.SUPPORTED_CHAINS:
            raise ValueError(f"1inch does not support chain {chain_id}")

    def quote(self, chain_id: int, token_in: Token, token_out: Token, amount_in: int) -> SwapQuote:
        self._check_chain(chain_id)
        resp = self._client.get(
            f"{self.BASE_URL}/{chain_id}/quote",
            params={"src": token_in.address, "dst": token_out.address, "amount": str(amount_in)},
            headers=self._headers(),
        )
        resp.raise_for_status()
        data = resp.json()
        return SwapQuote(
            chain_id=chain_id,
            token_in=token_in.address,
            token_out=token_out.address,
            amount_in=amount_in,
            amount_out=int(data["dstAmount"]),
        )

    def build_swap(
        self,
        chain_id: int,
        token_in: Token,
        token_out: Token,
        amount_in: int,
        recipient: str,
        slippage_bps: int,
    ) -> SwapTransaction:
        self._check_chain(chain_id)
        resp = self._client.get(
            f"{self.BASE_URL}/{chain_id}/swap",
            params={
                "src": token_in.address,
                "dst": token_out.address,
                "amount": str(amount_in),
                "from": recipient,
                "origin": recipient,
                "slippage": slippage_bps / 100.0,  # 1inch expects percent
            },
            headers=self._headers(),
        )
        resp.raise_for_status()
        data = resp.json()
        tx = data["tx"]
        out = int(data["dstAmount"])
        return SwapTransaction(
            chain_id=chain_id,
            to=tx["to"],
            data=tx["data"],
            value=int(tx.get("value", 0)),
            amount_in=amount_in,
            min_amount_out=out * (10_000 - slippage_bps) // 10_000,
        )
