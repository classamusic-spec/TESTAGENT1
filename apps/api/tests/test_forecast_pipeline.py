from __future__ import annotations

import json
from typing import Sequence

import httpx
import pytest

from src.data.ohlcv import Candle, interval_to_ms
from src.forecast.client import MlForecastClient
from src.forecast.service import generate_forecast

STEP = interval_to_ms("1h")


def _candle(i: int, *, closed: bool) -> Candle:
    return Candle(
        open_time=i * STEP,
        open=100.0,
        high=101.0,
        low=99.0,
        close=100.0 + i,
        volume=10.0,
        closed=closed,
    )


def test_client_posts_camelcase_payload_and_returns_forecast() -> None:
    captured: dict = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured["url"] = str(request.url)
        captured["body"] = json.loads(request.content)
        return httpx.Response(200, json={"pair": "ETH/USDC", "pUp": 0.6, "steps": []})

    transport = httpx.MockTransport(handler)
    client = MlForecastClient("http://ml", client=httpx.Client(transport=transport, base_url="http://ml"))

    result = client.forecast("ETH/USDC", "1h", [_candle(0, closed=True)], horizon=4)

    assert result["pUp"] == 0.6
    assert captured["url"] == "http://ml/forecast/ETH/USDC"
    assert captured["body"]["horizon"] == 4
    assert captured["body"]["candles"][0]["openTime"] == 0
    assert captured["body"]["candles"][0]["closed"] is True


class _RecordingClient(MlForecastClient):
    def __init__(self) -> None:  # noqa: D401 - test double, skip real init
        self.sent: list[Candle] = []

    def forecast(self, pair, interval, candles, horizon=12):  # type: ignore[override]
        self.sent = list(candles)
        return {"pair": pair, "steps": []}


class _Exchange:
    def __init__(self, rows: Sequence[Sequence[float]]) -> None:
        self.rows = rows

    def fetch_ohlcv(self, symbol: str, timeframe: str, limit: int):
        return self.rows


def test_generate_forecast_only_sends_closed_candles() -> None:
    # 4 candles, last one in progress at now.
    rows = [[i * STEP, 100.0, 101.0, 99.0, 100.0 + i, 10.0] for i in range(4)]
    now_ms = 3 * STEP + 1  # candle 3 (open=3*STEP) is in progress
    client = _RecordingClient()

    generate_forecast(_Exchange(rows), client, "ETH/USDC", "1h", now_ms=now_ms)

    assert len(client.sent) == 3
    assert all(c.closed for c in client.sent)


def test_generate_forecast_raises_without_closed_candles() -> None:
    rows = [[0, 100.0, 101.0, 99.0, 100.0, 10.0]]
    now_ms = 0  # the only candle is still in progress
    with pytest.raises(ValueError):
        generate_forecast(_Exchange(rows), _RecordingClient(), "ETH/USDC", "1h", now_ms=now_ms)


def test_generate_forecast_rejects_off_universe_pair() -> None:
    rows = [[i * STEP, 100.0, 101.0, 99.0, 100.0 + i, 10.0] for i in range(4)]
    with pytest.raises(ValueError, match="tradeable universe"):
        generate_forecast(_Exchange(rows), _RecordingClient(), "PEPE/USDC", "1h", now_ms=10 * STEP)
