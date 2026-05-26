from __future__ import annotations

import math

from fastapi.testclient import TestClient

from src.contracts import Candle
from src.main import app
from src.model.base import interval_to_ms
from src.model.stub import StubForecaster

client = TestClient(app)

INTERVAL = "1h"
STEP = interval_to_ms(INTERVAL)


def _candles(n: int, *, last_closed: bool = True, start: float = 100.0) -> list[Candle]:
    candles: list[Candle] = []
    price = start
    for i in range(n):
        # Deterministic noisy uptrend: positive mean return, non-zero variance.
        price *= 1.0 + 0.012 + 0.006 * math.sin(i * 1.3)
        candles.append(
            Candle(
                open_time=i * STEP,
                open=price,
                high=price * 1.005,
                low=price * 0.995,
                close=price,
                volume=10.0,
                closed=True if i < n - 1 else last_closed,
            )
        )
    return candles


def _payload(candles: list[Candle], horizon: int = 6) -> dict:
    return {
        "interval": INTERVAL,
        "horizon": horizon,
        "candles": [c.model_dump(by_alias=True) for c in candles],
    }


def test_interval_to_ms_rejects_unknown() -> None:
    assert interval_to_ms("1h") == 3_600_000
    try:
        interval_to_ms("3s")
    except ValueError:
        pass
    else:  # pragma: no cover
        raise AssertionError("expected ValueError")


def test_stub_is_deterministic_and_well_shaped() -> None:
    candles = _candles(40)
    forecaster = StubForecaster()
    a = forecaster.forecast("ETH/USDC", INTERVAL, candles, horizon=6)
    b = forecaster.forecast("ETH/USDC", INTERVAL, candles, horizon=6)

    assert [s.close for s in a.steps] == [s.close for s in b.steps]
    assert len(a.steps) == 6
    assert a.based_on_candle_time == candles[-1].open_time
    # Uptrend -> p_up above 0.5; bounds widen with the horizon.
    assert a.p_up > 0.5
    assert all(s.lower <= s.close <= s.upper for s in a.steps)
    assert (a.steps[-1].upper - a.steps[-1].lower) > (a.steps[0].upper - a.steps[0].lower)


def test_endpoint_returns_forecast() -> None:
    response = client.post("/forecast/ETH/USDC", json=_payload(_candles(30)))
    assert response.status_code == 200
    body = response.json()
    assert body["pair"] == "ETH/USDC"
    assert body["modelVersion"] == "stub-0.1"
    assert len(body["steps"]) == 6
    assert "pUp" in body


def test_endpoint_rejects_unclosed_candle() -> None:
    response = client.post(
        "/forecast/ETH/USDC", json=_payload(_candles(30, last_closed=False))
    )
    assert response.status_code == 422
    assert "closed candles only" in response.json()["detail"]


def test_endpoint_rejects_empty_candles() -> None:
    response = client.post("/forecast/ETH/USDC", json=_payload([]))
    assert response.status_code == 422
