from __future__ import annotations

import pytest

from src.universe import (
    QUOTE_CURRENCY,
    TRADEABLE_ASSETS,
    TRADEABLE_PAIRS,
    assert_tradeable,
    is_tradeable,
)


def test_universe_is_exactly_top_20_unique_usdc_pairs() -> None:
    assert len(TRADEABLE_ASSETS) == 20
    symbols = [symbol for symbol, _ in TRADEABLE_ASSETS]
    assert len(set(symbols)) == 20  # no duplicates
    assert len(TRADEABLE_PAIRS) == 20
    assert all(pair.endswith(f"/{QUOTE_CURRENCY}") for pair in TRADEABLE_PAIRS)


def test_is_tradeable() -> None:
    assert is_tradeable("BTC/USDC")
    assert is_tradeable("ETH/USDC")
    assert not is_tradeable("PEPE/USDC")
    assert not is_tradeable("ETH/USDT")


def test_assert_tradeable_rejects_off_universe() -> None:
    assert_tradeable("SOL/USDC")  # no raise
    with pytest.raises(ValueError):
        assert_tradeable("FOO/USDC")
