"""Live data + forecast endpoints.

Wires the real path end to end: ingest closed candles (invariant 1) from the
configured source, persist them, request a forecast from apps/ml, persist it, and
return the shared contract. Dependencies are injected so the source and ML client
can be swapped (synthetic + fake in tests, ccxt + real ML in prod).
"""

from __future__ import annotations

import time
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session

from src.config import settings
from src.data.ohlcv import OhlcvSource, ingest_closed_candles
from src.data.synthetic import SyntheticOhlcvSource
from src.db.repositories import CandleRepository, ForecastRepository
from src.db.session import get_session
from src.forecast.client import MlForecastClient
from src.forecast.service import generate_forecast
from src.universe import assert_tradeable

router = APIRouter(tags=["forecast"])


def get_source() -> OhlcvSource:
    # Dev uses the synthetic source so no non-testnet exchange is hit. Production
    # swaps in src.data.exchange.create_exchange via configuration.
    return SyntheticOhlcvSource()


def get_forecast_client() -> MlForecastClient:
    return MlForecastClient(settings.ml_service_url)


SourceDep = Annotated[OhlcvSource, Depends(get_source)]
ClientDep = Annotated[MlForecastClient, Depends(get_forecast_client)]
SessionDep = Annotated[Session, Depends(get_session)]


def _require_tradeable(pair: str) -> None:
    try:
        assert_tradeable(pair)
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc)) from exc


@router.get("/candles/{pair:path}")
def candles(
    pair: str,
    source: SourceDep,
    session: SessionDep,
    interval: str = Query("1h"),
    limit: int = Query(120, ge=2, le=1000),
) -> list[dict[str, Any]]:
    _require_tradeable(pair)
    closed = ingest_closed_candles(source, pair, interval, int(time.time() * 1000), limit)
    CandleRepository(session).upsert_many(pair, interval, closed)
    return [c.model_dump(by_alias=True) for c in closed]


@router.get("/forecast/{pair:path}")
def forecast(
    pair: str,
    source: SourceDep,
    client: ClientDep,
    session: SessionDep,
    interval: str = Query("1h"),
    horizon: int = Query(12, ge=1, le=48),
) -> dict[str, Any]:
    _require_tradeable(pair)
    now_ms = int(time.time() * 1000)
    try:
        result = generate_forecast(source, client, pair, interval, now_ms, horizon=horizon)
    except ValueError as exc:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, str(exc)) from exc
    ForecastRepository(session).save(result)
    return result
