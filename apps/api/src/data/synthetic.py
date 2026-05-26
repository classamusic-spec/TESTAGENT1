"""Deterministic synthetic OHLCV source for development.

Implements the same OhlcvSource protocol as the live ccxt exchange, but produces
reproducible candles so the full data pipeline runs WITHOUT hitting a non-testnet
exchange (the permission boundary). In production, swap in the ccxt source
(src/data/exchange.create_exchange). The last row is the in-progress candle, so
the closed-candle filter (invariant 1) is exercised exactly as with a real feed.
"""

from __future__ import annotations

import math
import time

_HOUR_MS = 3_600_000

_BASE_PRICE: dict[str, float] = {
    "BTC": 64000.0,
    "ETH": 3200.0,
    "SOL": 145.0,
    "BNB": 580.0,
    "XRP": 0.52,
}


def _seed(text: str) -> int:
    h = 2166136261
    for ch in text:
        h = ((h ^ ord(ch)) * 16777619) & 0xFFFFFFFF
    return h


class SyntheticOhlcvSource:
    def fetch_ohlcv(self, symbol: str, timeframe: str, limit: int) -> list[list[float]]:
        base = _BASE_PRICE.get(symbol.split("/")[0], 100.0)
        rng = _seed(symbol)
        now_ms = int(time.time() * 1000)
        last_open = (now_ms // _HOUR_MS) * _HOUR_MS  # current (in-progress) hour
        first_open = last_open - (limit - 1) * _HOUR_MS

        rows: list[list[float]] = []
        price = base
        drift = 0.0
        for i in range(limit):
            rng = (1103515245 * rng + 12345) & 0x7FFFFFFF
            noise = (rng / 0x7FFFFFFF) - 0.5
            drift = 0.82 * drift + 0.18 * noise * 0.01
            ret = drift + noise * 0.012 + 0.004 * math.sin(i * 0.5)
            open_price = price
            close = open_price * (1 + ret)
            high = max(open_price, close) * 1.003
            low = min(open_price, close) * 0.997
            rows.append([first_open + i * _HOUR_MS, open_price, high, low, close, 50.0 + (rng % 200)])
            price = close
        return rows
