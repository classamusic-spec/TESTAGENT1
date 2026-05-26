"""Tradeable universe: the top-20 assets the bot is allowed to trade.

This mirrors TRADEABLE_ASSETS in packages/shared (the canonical source). Keeping
them in sync is intentional; a test asserts the count and quote currency. Per
invariant 3, this scope of trading authority changes only through git and human
review — never at runtime.
"""

from __future__ import annotations

QUOTE_CURRENCY = "USDC"

# (symbol, name) for the top-20 assets, quoted in USDC.
TRADEABLE_ASSETS: tuple[tuple[str, str], ...] = (
    ("BTC", "Bitcoin"),
    ("ETH", "Ethereum"),
    ("BNB", "BNB"),
    ("SOL", "Solana"),
    ("XRP", "XRP"),
    ("ADA", "Cardano"),
    ("DOGE", "Dogecoin"),
    ("TRX", "TRON"),
    ("AVAX", "Avalanche"),
    ("LINK", "Chainlink"),
    ("DOT", "Polkadot"),
    ("MATIC", "Polygon"),
    ("TON", "Toncoin"),
    ("SHIB", "Shiba Inu"),
    ("LTC", "Litecoin"),
    ("BCH", "Bitcoin Cash"),
    ("NEAR", "NEAR Protocol"),
    ("UNI", "Uniswap"),
    ("APT", "Aptos"),
    ("ATOM", "Cosmos"),
)

TRADEABLE_PAIRS: frozenset[str] = frozenset(f"{symbol}/{QUOTE_CURRENCY}" for symbol, _ in TRADEABLE_ASSETS)


def is_tradeable(pair: str) -> bool:
    return pair in TRADEABLE_PAIRS


def assert_tradeable(pair: str) -> None:
    """Guard trade/forecast entry points against off-universe pairs."""
    if not is_tradeable(pair):
        raise ValueError(f"pair {pair!r} is not in the tradeable universe (top 20)")
