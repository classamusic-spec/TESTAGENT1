from __future__ import annotations

import httpx
import pytest
from eth_abi import decode, encode
from eth_utils import function_signature_to_4byte_selector

from src.dex.aggregator import OneInchAggregator
from src.dex.chains import assert_testnet
from src.dex.models import SwapTransaction
from src.dex.swapper import DexSwapper
from src.dex.tokens import Token, get_token, resolve_pair
from src.dex.uniswap import UniswapV3Aggregator

ROUTER = "0x2626664c2603336E57B271c5C0b26F421741e481"
QUOTER = "0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a"


# --- chain guard (the safety core) ------------------------------------------


def test_assert_testnet_allows_base_sepolia() -> None:
    assert assert_testnet(84532).name == "Base Sepolia"
    assert assert_testnet(11155111).is_testnet


def test_assert_testnet_refuses_mainnet() -> None:
    for mainnet in (1, 8453, 137, 42161):
        with pytest.raises(ValueError):
            assert_testnet(mainnet)


# --- tokens -----------------------------------------------------------------


def test_resolve_pair_maps_eth_to_weth() -> None:
    base, quote = resolve_pair(84532, "ETH/USDC")
    assert base.symbol == "WETH" and base.decimals == 18
    assert quote.symbol == "USDC" and quote.decimals == 6


def test_unsupported_token_raises() -> None:
    with pytest.raises(ValueError):
        get_token(84532, "PEPE")


# --- Uniswap v3 (testnet) ---------------------------------------------------


def _fake_quote_returning(amount_out: int):
    encoded = "0x" + encode(["uint256", "uint160", "uint32", "uint256"], [amount_out, 0, 0, 0]).hex()
    return lambda to, data: encoded


def test_uniswap_quote_decodes_amount_out() -> None:
    agg = UniswapV3Aggregator(ROUTER, QUOTER, eth_call=_fake_quote_returning(1_234_000))
    weth = get_token(84532, "WETH")
    usdc = get_token(84532, "USDC")
    quote = agg.quote(84532, weth, usdc, amount_in=10**18)
    assert quote.amount_out == 1_234_000


def test_uniswap_build_swap_encodes_exact_input_single_with_slippage() -> None:
    agg = UniswapV3Aggregator(ROUTER, QUOTER, eth_call=_fake_quote_returning(1_000_000), fee=3000)
    weth = get_token(84532, "WETH")
    usdc = get_token(84532, "USDC")
    recipient = "0x1111111111111111111111111111111111111111"

    tx = agg.build_swap(84532, weth, usdc, amount_in=10**18, recipient=recipient, slippage_bps=100)

    assert tx.to == ROUTER
    # 1% slippage off a 1_000_000 quote -> 990_000 floor.
    assert tx.min_amount_out == 990_000

    selector = function_signature_to_4byte_selector(
        "exactInputSingle((address,address,uint24,address,uint256,uint256,uint160))"
    )
    raw = bytes.fromhex(tx.data[2:])
    assert raw[:4] == selector
    (params,) = decode(["(address,address,uint24,address,uint256,uint256,uint160)"], raw[4:])
    token_in, token_out, fee, rcpt, amount_in, min_out, sqrt = params
    assert token_in.lower() == weth.address.lower()
    assert token_out.lower() == usdc.address.lower()
    assert fee == 3000
    assert rcpt.lower() == recipient.lower()
    assert amount_in == 10**18
    assert min_out == 990_000


# --- 1inch (mainnet adapter) ------------------------------------------------


def test_oneinch_refuses_testnet() -> None:
    agg = OneInchAggregator("key", client=httpx.Client())
    weth = Token("WETH", "0xaaa", 18)
    usdc = Token("USDC", "0xbbb", 6)
    with pytest.raises(ValueError):
        agg.quote(84532, weth, usdc, 1000)


def test_oneinch_build_swap_parses_tx_and_applies_slippage() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200,
            json={
                "dstAmount": "1000000",
                "tx": {"to": "0xrouter", "data": "0xdeadbeef", "value": "0"},
            },
        )

    client = httpx.Client(transport=httpx.MockTransport(handler))
    agg = OneInchAggregator("key", client=client)
    weth = Token("WETH", "0xaaa", 18)
    usdc = Token("USDC", "0xbbb", 6)
    tx = agg.build_swap(1, weth, usdc, 10**18, "0xme", slippage_bps=100)
    assert tx.to == "0xrouter"
    assert tx.min_amount_out == 990_000


# --- swapper ----------------------------------------------------------------


class _FakeAggregator:
    def __init__(self) -> None:
        self.calls: list[tuple] = []

    def quote(self, chain_id, token_in, token_out, amount_in):  # pragma: no cover - unused
        raise NotImplementedError

    def build_swap(self, chain_id, token_in, token_out, amount_in, recipient, slippage_bps):
        self.calls.append((token_in.symbol, token_out.symbol, amount_in))
        return SwapTransaction(
            chain_id=chain_id, to="0xrouter", data="0x", value=0,
            amount_in=amount_in, min_amount_out=amount_in,
        )


def test_swapper_refuses_mainnet_at_construction() -> None:
    with pytest.raises(ValueError):
        DexSwapper(1, _FakeAggregator())


def test_swapper_buy_spends_quote_token() -> None:
    agg = _FakeAggregator()
    swapper = DexSwapper(84532, agg)
    swapper.build("ETH/USDC", "buy", amount_in=500_000_000, recipient="0xme")
    # Buying ETH means swapping USDC (quote) -> WETH (base).
    assert agg.calls == [("USDC", "WETH", 500_000_000)]


def test_swapper_sell_spends_base_token() -> None:
    agg = _FakeAggregator()
    swapper = DexSwapper(84532, agg)
    swapper.build("ETH/USDC", "sell", amount_in=10**18, recipient="0xme")
    assert agg.calls == [("WETH", "USDC", 10**18)]


def test_swapper_execute_requires_sender() -> None:
    with pytest.raises(RuntimeError):
        DexSwapper(84532, _FakeAggregator()).execute("ETH/USDC", "buy", 1, "0xme")


def test_swapper_execute_broadcasts_via_sender() -> None:
    sent: dict = {}

    class FakeSender:
        def send(self, tx: SwapTransaction) -> str:
            sent["tx"] = tx
            return "0xhash"

    swapper = DexSwapper(84532, _FakeAggregator(), sender=FakeSender())
    assert swapper.execute("ETH/USDC", "buy", 1000, "0xme") == "0xhash"
    assert sent["tx"].to == "0xrouter"
