"""Uniswap v3 (SwapRouter02) adapter for testnet swaps.

`build_swap` encodes `exactInputSingle` calldata deterministically (pure, no
network). `quote` reads QuoterV2 via an injected eth_call so it stays testable
without an RPC. Router/quoter addresses are configurable and MUST be verified
against the official Uniswap deployment for the target chain before any real run.
"""

from __future__ import annotations

from typing import Callable

from eth_abi import decode, encode
from eth_utils import function_signature_to_4byte_selector

from src.dex.models import SwapQuote, SwapTransaction
from src.dex.tokens import Token

# Hex string -> hex string. (to_address, calldata_hex) -> abi-encoded return hex.
EthCall = Callable[[str, str], str]

_EXACT_INPUT_SINGLE_SIG = "exactInputSingle((address,address,uint24,address,uint256,uint256,uint160))"
_QUOTE_SIG = "quoteExactInputSingle((address,address,uint256,uint24,uint160))"


def _encode(signature: str, abi_type: str, value: tuple) -> str:
    selector = function_signature_to_4byte_selector(signature)
    return "0x" + (selector + encode([abi_type], [value])).hex()


class UniswapV3Aggregator:
    def __init__(
        self,
        router: str,
        quoter: str,
        eth_call: EthCall,
        fee: int = 3000,
    ) -> None:
        self.router = router
        self.quoter = quoter
        self.fee = fee
        self._eth_call = eth_call

    def quote(self, chain_id: int, token_in: Token, token_out: Token, amount_in: int) -> SwapQuote:
        calldata = _encode(
            _QUOTE_SIG,
            "(address,address,uint256,uint24,uint160)",
            (token_in.address, token_out.address, amount_in, self.fee, 0),
        )
        result = self._eth_call(self.quoter, calldata)
        amount_out = decode(["uint256", "uint160", "uint32", "uint256"], bytes.fromhex(result[2:]))[0]
        return SwapQuote(
            chain_id=chain_id,
            token_in=token_in.address,
            token_out=token_out.address,
            amount_in=amount_in,
            amount_out=int(amount_out),
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
        quote = self.quote(chain_id, token_in, token_out, amount_in)
        min_out = quote.amount_out * (10_000 - slippage_bps) // 10_000

        data = _encode(
            _EXACT_INPUT_SINGLE_SIG,
            "(address,address,uint24,address,uint256,uint256,uint160)",
            (token_in.address, token_out.address, self.fee, recipient, amount_in, min_out, 0),
        )
        return SwapTransaction(
            chain_id=chain_id,
            to=self.router,
            data=data,
            value=0,
            amount_in=amount_in,
            min_amount_out=min_out,
        )
