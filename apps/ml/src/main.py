"""Kronos forecast service entrypoint.

Exposes `/forecast/{pair}` returning a probabilistic OHLCV forecast. The caller
(apps/api) is responsible for ingestion; this service validates that only closed
candles are submitted (invariant 1) and runs the configured forecaster.
"""

from __future__ import annotations

from fastapi import FastAPI, HTTPException, status
from loguru import logger

from src.contracts import Forecast, ForecastRequest
from src.model import get_forecaster

app = FastAPI(title="Kronos ML Service", version="0.1.0")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "kronos-ml"}


@app.post("/forecast/{pair:path}", response_model=Forecast)
def forecast(pair: str, request: ForecastRequest) -> Forecast:
    if not request.candles:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "no candles provided")

    # Invariant 1: forecasts only use closed candles. Reject any in-progress
    # candle here as defense in depth, even though the pipeline filters them.
    if any(not candle.closed for candle in request.candles):
        logger.error("Rejected forecast request for {} containing an unclosed candle", pair)
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            "forecasts use closed candles only (invariant 1)",
        )

    forecaster = get_forecaster()
    result = forecaster.forecast(pair, request.interval, request.candles, request.horizon)
    logger.info(
        "Forecast for {} ({}) via {}: p_up={:.3f}",
        pair,
        request.interval,
        result.model_version,
        result.p_up,
    )
    return result
