"""Forecaster protocol and shared time helpers."""

from __future__ import annotations

from typing import Protocol

from src.contracts import Candle, Forecast

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


class Forecaster(Protocol):
    """A forecasting backend. `name` is reported as the forecast modelVersion."""

    name: str

    def forecast(
        self,
        pair: str,
        interval: str,
        candles: list[Candle],
        horizon: int,
    ) -> Forecast: ...
