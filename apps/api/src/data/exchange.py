"""ccxt exchange factory.

WARNING: per the CLAUDE.md permission boundary, no code path may hit a
non-testnet exchange API during development. This factory exists for production
use; tests and dev use injected fakes and must not call a real exchange.
"""

from __future__ import annotations

from src.data.ohlcv import OhlcvSource


def create_exchange(name: str = "binance") -> OhlcvSource:
    import ccxt

    exchange_cls = getattr(ccxt, name, None)
    if exchange_cls is None:
        raise ValueError(f"unknown ccxt exchange: {name}")
    return exchange_cls({"enableRateLimit": True})
