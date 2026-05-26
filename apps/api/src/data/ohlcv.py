"""OHLCV ingestion and closed-candle enforcement (invariant 1)."""

from __future__ import annotations

from typing import Protocol, Sequence

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel

_INTERVAL_MS: dict[str, int] = {
    "1m": 60_000,
    "5m": 300_000,
    "15m": 900_000,
    "1h": 3_600_000,
    "4h": 14_400_000,
    "1d": 86_400_000,
}


def interval_to_ms(interval: str) -> int:
    try:
        return _INTERVAL_MS[interval]
    except KeyError as exc:
        raise ValueError(f"unsupported interval: {interval}") from exc


class Candle(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    open_time: int
    open: float
    high: float
    low: float
    close: float
    volume: float
    closed: bool


class OhlcvSource(Protocol):
    """Anything that returns ccxt-style OHLCV rows: [ts_ms, open, high, low, close, volume]."""

    def fetch_ohlcv(
        self, symbol: str, timeframe: str, limit: int
    ) -> Sequence[Sequence[float]]: ...


def rows_to_candles(
    rows: Sequence[Sequence[float]], interval: str, now_ms: int
) -> list[Candle]:
    """Convert raw OHLCV rows to candles, flagging each as closed or in-progress.

    A candle is closed once its full interval has elapsed: open_time + interval
    <= now. The exchange typically returns the in-progress candle as the last
    row, so this is where we mark it.
    """
    step = interval_to_ms(interval)
    candles: list[Candle] = []
    for row in rows:
        open_time = int(row[0])
        candles.append(
            Candle(
                open_time=open_time,
                open=float(row[1]),
                high=float(row[2]),
                low=float(row[3]),
                close=float(row[4]),
                volume=float(row[5]),
                closed=(open_time + step) <= now_ms,
            )
        )
    return candles


def closed_only(candles: Sequence[Candle]) -> list[Candle]:
    """Drop any in-progress candle. The forecast pipeline must call this."""
    return [candle for candle in candles if candle.closed]


def ingest_closed_candles(
    source: OhlcvSource,
    pair: str,
    interval: str,
    now_ms: int,
    limit: int = 200,
) -> list[Candle]:
    rows = source.fetch_ohlcv(pair, interval, limit)
    return closed_only(rows_to_candles(rows, interval, now_ms))
