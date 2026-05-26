from __future__ import annotations

from typing import Sequence

import pytest

from src.data.ohlcv import (
    Candle,
    ingest_closed_candles,
    interval_to_ms,
    rows_to_candles,
)

STEP = interval_to_ms("1h")


class FakeExchange:
    """Returns a fixed set of OHLCV rows; the last one is still in progress."""

    def __init__(self, rows: Sequence[Sequence[float]]) -> None:
        self.rows = rows
        self.calls: list[tuple[str, str, int]] = []

    def fetch_ohlcv(self, symbol: str, timeframe: str, limit: int):
        self.calls.append((symbol, timeframe, limit))
        return self.rows


def _rows(n: int) -> list[list[float]]:
    return [[i * STEP, 100.0 + i, 101.0 + i, 99.0 + i, 100.5 + i, 10.0] for i in range(n)]


def test_interval_to_ms() -> None:
    assert interval_to_ms("1m") == 60_000
    assert interval_to_ms("1d") == 86_400_000
    with pytest.raises(ValueError):
        interval_to_ms("2h")


def test_last_candle_marked_in_progress() -> None:
    # now sits just inside the 6th candle, so candles 0..4 are closed, 5 is not.
    now_ms = 5 * STEP + 1
    candles = rows_to_candles(_rows(6), "1h", now_ms)
    assert [c.closed for c in candles] == [True, True, True, True, True, False]


def test_closed_only_drops_in_progress_candle() -> None:
    now_ms = 5 * STEP + 1
    candles = ingest_closed_candles(FakeExchange(_rows(6)), "ETH/USDC", "1h", now_ms)
    assert len(candles) == 5
    assert all(c.closed for c in candles)
    assert candles[-1].open_time == 4 * STEP  # the in-progress candle is gone


def test_ingest_forwards_symbol_and_limit() -> None:
    exchange = FakeExchange(_rows(3))
    ingest_closed_candles(exchange, "BTC/USDC", "1h", now_ms=10 * STEP, limit=50)
    assert exchange.calls == [("BTC/USDC", "1h", 50)]


def test_candle_serializes_camelcase() -> None:
    candle = Candle(
        open_time=1,
        open=1.0,
        high=2.0,
        low=0.5,
        close=1.5,
        volume=3.0,
        closed=True,
    )
    assert "openTime" in candle.model_dump(by_alias=True)
