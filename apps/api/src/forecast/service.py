"""Forecast orchestration."""

from __future__ import annotations

from typing import Any

from loguru import logger

from src.data.ohlcv import OhlcvSource, ingest_closed_candles
from src.forecast.client import MlForecastClient
from src.universe import assert_tradeable


def generate_forecast(
    source: OhlcvSource,
    client: MlForecastClient,
    pair: str,
    interval: str,
    now_ms: int,
    limit: int = 200,
    horizon: int = 12,
) -> dict[str, Any]:
    """Ingest closed candles (invariant 1) and request a forecast from apps/ml.

    The pair must be in the tradeable universe (top 20); off-universe pairs are
    rejected before any data is fetched.
    """
    assert_tradeable(pair)
    candles = ingest_closed_candles(source, pair, interval, now_ms, limit)
    if not candles:
        raise ValueError("no closed candles available to forecast from")
    logger.info("Forecasting {} {} from {} closed candles", pair, interval, len(candles))
    return client.forecast(pair, interval, candles, horizon)
