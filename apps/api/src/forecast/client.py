"""HTTP client for the apps/ml forecast service."""

from __future__ import annotations

from typing import Any, Sequence

import httpx

from src.data.ohlcv import Candle


class MlForecastClient:
    def __init__(self, base_url: str, client: httpx.Client | None = None) -> None:
        self._client = client or httpx.Client(base_url=base_url, timeout=30.0)

    def forecast(
        self,
        pair: str,
        interval: str,
        candles: Sequence[Candle],
        horizon: int = 12,
    ) -> dict[str, Any]:
        payload = {
            "interval": interval,
            "horizon": horizon,
            "candles": [candle.model_dump(by_alias=True) for candle in candles],
        }
        response = self._client.post(f"/forecast/{pair}", json=payload)
        response.raise_for_status()
        return response.json()
