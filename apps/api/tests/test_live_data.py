from __future__ import annotations

import time

import pytest
from fastapi.testclient import TestClient

from src.data.ohlcv import ingest_closed_candles
from src.data.synthetic import SyntheticOhlcvSource
from src.db.session import init_db, make_engine
from src.forecast.router import get_forecast_client


# --- synthetic source (dev-safe, no exchange) -------------------------------


def test_synthetic_is_deterministic_and_marks_last_in_progress() -> None:
    src = SyntheticOhlcvSource()
    a = src.fetch_ohlcv("ETH/USDC", "1h", 20)
    b = src.fetch_ohlcv("ETH/USDC", "1h", 20)
    assert [r[4] for r in a] == [r[4] for r in b]  # deterministic closes
    assert len(a) == 20

    closed = ingest_closed_candles(src, "ETH/USDC", "1h", int(time.time() * 1000), limit=20)
    # The final (current-hour) candle is in progress and must be dropped.
    assert len(closed) == 19
    assert all(c.closed for c in closed)


# --- live endpoints (real path, synthetic source + fake ML) -----------------


class FakeMlClient:
    def forecast(self, pair, interval, candles, horizon=12):
        last = candles[-1]
        return {
            "pair": pair,
            "interval": interval,
            "modelVersion": "stub-0.1",
            "generatedAt": int(time.time() * 1000),
            "basedOnCandleTime": last.open_time,
            "pUp": 0.6,
            "steps": [
                {"openTime": last.open_time + 3_600_000, "close": last.close, "lower": last.close * 0.99, "upper": last.close * 1.01}
            ],
        }


@pytest.fixture
def client(tmp_path, monkeypatch):
    from src.db import session as db_session

    engine = make_engine(f"sqlite:///{tmp_path}/api.db")
    monkeypatch.setattr(db_session, "engine", engine)
    init_db(engine)

    from src.main import app

    app.dependency_overrides[get_forecast_client] = lambda: FakeMlClient()
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


def test_candles_endpoint_returns_closed_candles(client: TestClient) -> None:
    res = client.get("/candles/ETH/USDC", params={"interval": "1h", "limit": 30})
    assert res.status_code == 200
    body = res.json()
    assert len(body) == 29  # in-progress candle dropped (invariant 1)
    assert all(c["closed"] for c in body)
    assert "openTime" in body[0]


def test_forecast_endpoint_returns_and_persists(client: TestClient) -> None:
    res = client.get("/forecast/ETH/USDC", params={"interval": "1h"})
    assert res.status_code == 200
    body = res.json()
    assert body["pair"] == "ETH/USDC"
    assert 0 <= body["pUp"] <= 1
    assert body["steps"]

    # Persisted: fetch latest from the DB via the repository.
    from sqlmodel import Session

    from src.db import session as db_session
    from src.db.repositories import ForecastRepository

    with Session(db_session.engine) as s:
        assert ForecastRepository(s).latest("ETH/USDC") is not None


def test_off_universe_pair_rejected(client: TestClient) -> None:
    assert client.get("/candles/PEPE/USDC").status_code == 400
    assert client.get("/forecast/PEPE/USDC").status_code == 400
